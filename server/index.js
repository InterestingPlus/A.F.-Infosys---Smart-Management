import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import inquiryRoutes from "./routes/inquiryRoutes.js";
import qrcode from "qrcode-terminal";
import * as baileys from "@whiskeysockets/baileys";
import { google } from "googleapis";
import path from "path";
import { fileURLToPath } from "url";
import job from "./cron.js";

dotenv.config();

const app = express();

job.start();

// Middleware
app.use(cors());
app.use(express.json());

// DB Connection
connectDB();

// Fix __dirname for ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Google Sheets Configuration ---
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = "AC MAST";

// --- Google Sheets Authentication (Service Account JSON from Environment Variable) ---
let googleAuthClient;

try {
  if (!process.env.GOOGLE_CREDENTIALS_JSON) {
    throw new Error("GOOGLE_CREDENTIALS_JSON environment variable is not set.");
  }
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);

  googleAuthClient = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
} catch (error) {
  console.error(
    "❌ Critical Error: Google Sheets authentication failed.",
    error.message
  );
  console.error(
    "Please ensure GOOGLE_CREDENTIALS_JSON is correctly set and contains valid JSON."
  );
  process.exit(1); // Exit if authentication fails
}

const sheets = google.sheets({ version: "v4", auth: googleAuthClient });

// WhatsApp Bot State
let socket;
let isConnected = false;

// Routes
app.get("/", (req, res) => {
  res.send("A.F. Infosys Smart Management CRM, Server is Running!");
});

app.use("/api/auth", authRoutes);
app.use("/api/leads", inquiryRoutes);

// --- Google Sheets Helper Functions ---

/**
 * Fetches data from a specific row in a Google Sheet.
 * @param {string} sheetId The ID of the spreadsheet.
 * @param {number} recordId The 0-indexed row number to fetch (converted to 1-indexed for Google Sheets).
 * @returns {Promise<Array<any>>} An array representing the row's cell values.
 */
async function fetchDataFromSheet(sheetId, recordId) {
  const range = `${SHEET_NAME}!A${recordId + 1}:AZ${recordId + 1}`;

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: range,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      // If the row exists but is empty, it returns an empty array for values.
      // If the range is beyond the data, rows will be undefined.
      console.warn(
        `No data found for recordId: ${recordId} in range: ${range}`
      );
      return []; // Return an empty array if no data is found for the row
    }
    return rows[0].map((cell) =>
      cell !== undefined && cell !== null ? cell : ""
    );
  } catch (error) {
    console.error(
      `Error fetching data from sheet (recordId: ${recordId}, range: ${range}):`,
      error.message
    );
    throw error;
  }
}

/**
 * Updates a specific range of cells in a Google Sheet.
 * @param {string} range A1 notation (e.g., 'Sheet1!A1', 'Sheet1!C5:D10')
 * @param {Array<Array<any>>} values An array of arrays, where each inner array is a row of values.
 */
async function updateSheetCells(range, values) {
  try {
    const currentData = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: range,
    });

    const existingValues = currentData.data.values || [];

    const finalValues = values.map((row, rowIndex) => {
      const existingRow = existingValues[rowIndex] || [];
      const updatedRow = [...row];

      if (
        (row[18] === "" || row[18] === undefined || row[18] === null) &&
        existingRow[18] !== undefined
      ) {
        updatedRow[18] = existingRow[18];
      }
      return updatedRow;
    });

    const request = {
      spreadsheetId: SPREADSHEET_ID,
      range: range,
      valueInputOption: "USER_ENTERED",
      resource: {
        values: finalValues,
      },
    };

    console.log("📝 Final Values (with index 18 handled):", finalValues);

    const response = await sheets.spreadsheets.values.update(request);
    console.log(`✅ Updated ${response.data.updatedCells} cells.`);
    return response.data;
  } catch (err) {
    console.error("❌ Error updating Google Sheet cells:", err.message);
    throw err;
  }
}

/**
 * Appends new rows to the end of a Google Sheet.
 * @param {Array<Array<any>>} values An array of arrays, where each inner array is a row of values.
 */
async function appendSheetRows(values) {
  try {
    const request = {
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1`,
      valueInputOption: "USER_ENTERED",
      resource: {
        values: values,
      },
    };

    const response = await sheets.spreadsheets.values.append(request);
    console.log(`Appended ${response.data.updates.updatedCells} cells.`);
    return response.data;
  } catch (err) {
    console.error("Error appending to Google Sheet:", err.message);
    throw err;
  }
}

// --- WhatsApp Helper Functions ---

function formatJid(phone) {
  if (typeof phone !== "string") phone = String(phone);
  const cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.length === 10) return `91${cleaned}@s.whatsapp.net`;
  if (cleaned.length > 10) return `${cleaned}@s.whatsapp.net`;
  return null;
}

function safeNumber(val) {
  const num = parseFloat(val);
  return isNaN(num) ? 0 : num;
}

// --- API Endpoints ---

// Send Receipt Endpoint
app.post("/send-receipt", async (req, res) => {
  if (!isConnected || !socket) {
    return res.status(503).json({
      success: false,
      message:
        "WhatsApp bot is not connected or ready. Please wait or check logs.",
    });
  }

  const { m_id } = req.body;
  if (!m_id) {
    return res
      .status(400)
      .json({ success: false, message: "Missing m_id in request." });
  }

  try {
    const recordId = parseInt(m_id, 10);
    const rowToFetch = recordId + 2; // Adjust for header rows and 1-indexing for sheets

    console.log(
      `[Request] Received request for m_id: ${m_id}, fetching sheet row: ${rowToFetch}`
    );

    const record = await fetchDataFromSheet(
      process.env.GOOGLE_SHEET_ID,
      rowToFetch - 1
    ); // fetchDataFromSheet expects 0-indexed row number.

    if (record.length === 0) {
      throw new Error(
        `No data found for m_id ${m_id} (sheet row ${rowToFetch}).`
      );
    }

    const ownerName = record[1] || "Valued Customer";
    const phoneNumber = record[17]; // !! Adjust these indices if your sheet changes !!
    const totalAmount = (
      safeNumber(record[19]) +
      safeNumber(record[20]) +
      safeNumber(record[21]) +
      safeNumber(record[22]) +
      safeNumber(record[23]) +
      safeNumber(record[24]) +
      safeNumber(record[25]) +
      safeNumber(record[26]) +
      safeNumber(record[27]) +
      safeNumber(record[28]) +
      safeNumber(record[29]) +
      safeNumber(record[30])
    ).toFixed(2);

    if (!phoneNumber)
      throw new Error(
        `No phone number at index 17 for m_id ${m_id} (sheet row ${rowToFetch})`
      );

    const jid = formatJid(phoneNumber);
    if (!jid) throw new Error(`Invalid phone number format: ${phoneNumber}`);

    const receiptUrl = `https://afinfosys.netlify.app/reciept_format.html?m_id=${m_id}`;

    const messageText = `નમસ્તે ${ownerName},\n\nતમારી ગ્રામ પંચાયતની રસીદ તૈયાર છે. કુલ રકમ ₹${totalAmount} છે.\n\nનીચે આપેલા બટન પર ક્લિક કરીને તમારી રસીદ જુઓ અને ચુકવણી કરો.\n${receiptUrl}\n\nઆભાર,\nગ્રામ પંચાયત`;

    const buttonMessage = {
      text: messageText,
      footer: "Meghraj Gram Panchayat",
      templateButtons: [
        {
          index: 1,
          urlButton: {
            displayText: "રસીદ જુઓ / View Receipt",
            url: receiptUrl,
          },
        },
      ],
    };

    await socket.sendMessage(jid, buttonMessage);
    console.log(`[Success] Sent receipt for m_id ${m_id} to ${jid}`);
    res
      .status(200)
      .json({ success: true, message: `Receipt sent to ${phoneNumber}` });
  } catch (error) {
    console.error(
      `[Failed] Could not send receipt for m_id ${m_id}:`,
      error.message
    );
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update Sheet Record Endpoint
app.post("/update-sheet-record", async (req, res) => {
  const { milkatId, rowData } = req.body;

  if (!milkatId || !rowData) {
    return res.status(400).json({
      success: false,
      message: "Missing milkatId or rowData in request.",
    });
  }

  try {
    const getRequest = {
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:AZ`,
    };

    const getResponse = await sheets.spreadsheets.values.get(getRequest);
    const rows = getResponse.data.values || [];

    const MILKAT_COL_INDEX = 5;

    let rowIndexToUpdate = -1;

    console.log(`[DEBUG] Received milkatId for update: ${milkatId}`);

    for (let i = 0; i < rows.length; i++) {
      if (i === 2) continue; // Skip the 3rd row (index 2) as per your original logic

      const sheetMilkatId = rows[i][MILKAT_COL_INDEX];

      console.log(
        `[DEBUG] Checking row ${i}, Milkat ID in sheet: ${sheetMilkatId}`
      );

      if (
        sheetMilkatId !== undefined &&
        sheetMilkatId !== null &&
        String(sheetMilkatId).trim() === String(milkatId).trim()
      ) {
        rowIndexToUpdate = i;
        console.log(`[DEBUG] Match found at row index: ${rowIndexToUpdate}`);
        break;
      }
    }

    if (rowIndexToUpdate !== -1) {
      const rowNumber = rowIndexToUpdate + 1;
      const rangeToUpdate = `${SHEET_NAME}!A${rowNumber}`;

      console.log(
        `[DEBUG] Updating sheet at row number: ${rowNumber}, range: ${rangeToUpdate}`
      );

      await updateSheetCells(rangeToUpdate, [rowData]);

      console.log(`Milkat ${milkatId} record updated at row ${rowNumber}`);
      res.status(200).json({
        success: true,
        message: `Record for Milkat ID ${milkatId} updated.`,
      });
    } else {
      await appendSheetRows([rowData]);
      console.log(`Milkat ${milkatId} record not found, appended as new row.`);
      res.status(200).json({
        success: true,
        message: `Record for Milkat ID ${milkatId} appended.`,
      });
    }
  } catch (error) {
    console.error(
      "[Failed] Could not update/append data to sheet:",
      error.message
    );
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update Receipt Number and Date Endpoint
app.post("/update-receipt", async (req, res) => {
  const { milkatId, receiptNumber } = req.body;

  if (!milkatId || !receiptNumber) {
    return res.status(400).json({
      success: false,
      message: "Missing milkatId or receiptNumber in request.",
    });
  }

  try {
    const getRequest = {
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:AZ`,
    };

    const getResponse = await sheets.spreadsheets.values.get(getRequest);
    const rows = getResponse.data.values || [];

    const MILKAT_COL_INDEX = 5;

    let rowIndexToUpdate = -1;

    for (let i = 0; i < rows.length; i++) {
      if (i === 2) continue; // Skip row 3 (index 2)

      const sheetMilkatId = rows[i][MILKAT_COL_INDEX];

      if (
        sheetMilkatId !== undefined &&
        sheetMilkatId !== null &&
        String(sheetMilkatId).trim() === String(milkatId).trim()
      ) {
        rowIndexToUpdate = i;
        break;
      }
    }

    if (rowIndexToUpdate !== -1) {
      const rowNumber = rowIndexToUpdate + 1;
      const receiptRange = `${SHEET_NAME}!AF${rowNumber}`;
      const dateRange = `${SHEET_NAME}!AG${rowNumber}`;

      const today = new Date();
      const formattedDate = `${today.getDate().toString().padStart(2, "0")}/${(
        today.getMonth() + 1
      )
        .toString()
        .padStart(2, "0")}/${today.getFullYear()}`;

      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          valueInputOption: "RAW",
          data: [
            {
              range: receiptRange,
              values: [[receiptNumber]],
            },
            {
              range: dateRange,
              values: [[formattedDate]],
            },
          ],
        },
      });

      console.log(
        `✅ Receipt ${receiptNumber} and date updated at row ${rowNumber}`
      );
      res.status(200).json({
        success: true,
        message: `Receipt and date updated at row ${rowNumber}.`,
      });
    } else {
      res.status(404).json({
        success: false,
        message: `Milkat ID ${milkatId} not found in sheet.`,
      });
    }
  } catch (error) {
    console.error("❌ Error updating receipt and date:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Debug Status Endpoint
app.get("/debug-status", (req, res) => {
  res.json({
    socketInitialized: Boolean(socket),
    isConnected,
    googleSheetId: SPREADSheet_ID ? "Configured" : "Not Configured",
    googleCredentialsConfigured: Boolean(process.env.GOOGLE_CREDENTIALS_JSON),
    // You can add more checks here, e.g., if JSON parsing successful
    // isGoogleAuthClientInitialized: Boolean(googleAuthClient),
  });
});

// --- WhatsApp Connection Logic ---
async function connectToWhatsApp() {
  const { state, saveCreds } = await baileys.useMultiFileAuthState(
    "auth_info_baileys"
  );
  const { version } = await baileys.fetchLatestBaileysVersion();

  socket = baileys.makeWASocket({
    auth: state,
    version,
    browser: ["AF-Infosys", "ReceiptBot", "1.0"],
  });

  socket.ev.on("creds.update", saveCreds);

  socket.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("QR Code received, please scan with your phone's WhatsApp:");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "close") {
      isConnected = false;
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        baileys.DisconnectReason.loggedOut;

      console.log(
        "Connection closed. Reason:",
        lastDisconnect?.error,
        ". Reconnecting:",
        shouldReconnect
      );

      if (shouldReconnect) {
        connectToWhatsApp();
      } else {
        console.log(
          "❌ Disconnected permanently. You were logged out from WhatsApp."
        );
      }
    } else if (connection === "open") {
      isConnected = true;
      console.log(
        "✅ WhatsApp connection opened successfully! Ready to send receipts."
      );
    }
  });
}

// Server Start
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  connectToWhatsApp();
});
