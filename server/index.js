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
import job from "./cron.js"; // Assuming this is for your cron job setup

dotenv.config();

const app = express();

job.start();

// Middleware
app.use(cors());
app.use(express.json());

// DB Connection
connectDB();

// Fix __dirname for ES module
const __filename = fileURLToURL(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Google Sheets Configuration ---
const KEY_FILE_PATH = path.join(__dirname, "af-infosys-c9ccb3ab388f.json"); // Path to your service account key file
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID; // Make sure GOOGLE_SHEET_ID is in your .env or Render env vars
const SHEET_NAME = "AC MAST"; // The name of the specific sheet/tab you want to update

// --- Google Sheets Authentication (Service Account) ---
const auth = new google.auth.GoogleAuth({
  keyFile: KEY_FILE_PATH,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"], // Scope for read/write access
});

// Create Sheets client
const sheets = google.sheets({ version: "v4", auth });

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
  const range = `${SHEET_NAME}!A${recordId + 1}:AZ${recordId + 1}`; // Assuming recordId is 0-indexed for your logic, adjust to 1-indexed for sheets.

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: range,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      throw new Error(`Record with ID '${recordId}' not found or sheet is empty.`);
    }
    // Return the first (and only) row's data, mapping null/undefined to empty string for consistency
    return rows[0].map((cell) => (cell !== undefined && cell !== null ? cell : ""));
  } catch (error) {
    console.error(`Error fetching data from sheet (recordId: ${recordId}):`, error.message);
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
    // Step 1: Get existing values from the sheet to preserve specific cells if needed
    const currentData = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: range,
    });

    const existingValues = currentData.data.values || [];

    // Step 2: Only preserve value at index 18 if it's empty in the new data
    const finalValues = values.map((row, rowIndex) => {
      const existingRow = existingValues[rowIndex] || [];
      const updatedRow = [...row]; // clone the row

      // If the new data for column 18 (index 18) is empty,
      // and there's an existing value, preserve the existing one.
      if ((row[18] === "" || row[18] === undefined || row[18] === null) && existingRow[18] !== undefined) {
        updatedRow[18] = existingRow[18];
      }
      return updatedRow;
    });

    // Step 3: Send updated values
    const request = {
      spreadsheetId: SPREADSHEET_ID,
      range: range,
      valueInputOption: "USER_ENTERED", // This preserves formatting and data types
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
      range: `${SHEET_NAME}!A1`, // Range can be just the sheet name for appending
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
      message: "WhatsApp bot is not connected or ready. Please wait or check logs.",
    });
  }

  const { m_id } = req.body;
  if (!m_id) {
    return res.status(400).json({ success: false, message: "Missing m_id in request." });
  }

  try {
    const recordId = parseInt(m_id, 10); // Assuming m_id is 0-indexed from your client if you add 2 later.
    // If m_id from the client is already 1-indexed (e.g., row number from sheet), then just use recordId directly.
    // Based on your original code `parseInt(m_id, 10) + 2`, it seems your `m_id` is 0-indexed relative to some data structure,
    // and you want to fetch the corresponding row in Google Sheets, skipping header rows.
    // Let's assume `recordId` here should correspond directly to the row number in `fetchDataFromSheet`'s `A${recordId + 1}`.
    // If m_id is the actual row number (1-indexed) in the sheet, then use `const sheetRowNumber = parseInt(m_id, 10);`
    // and pass `sheetRowNumber - 1` to `fetchDataFromSheet` if it expects 0-indexed.
    // For consistency with original code, let's keep `recordId + 2` for `fetchDataFromSheet` internally.
    const rowToFetch = recordId + 2; // Assuming m_id is an index that needs to be offset by 2 for the sheet row number

    console.log(`[Request] Received request for m_id: ${m_id}, fetching sheet row: ${rowToFetch}`);

    const record = await fetchDataFromSheet(process.env.GOOGLE_SHEET_ID, rowToFetch -1); // fetchDataFromSheet expects 0-indexed row number.

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
      throw new Error(`No phone number at index 17 for m_id ${m_id} (sheet row ${rowToFetch})`);

    const jid = formatJid(phoneNumber);
    if (!jid) throw new Error(`Invalid phone number format: ${phoneNumber}`);

    const receiptUrl = `https://afinfosys.netlify.app/reciept_format.html?m_id=${m_id}`; // Ensure this URL is correct and accessible

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
    res.status(200).json({ success: true, message: `Receipt sent to ${phoneNumber}` });
  } catch (error) {
    console.error(`[Failed] Could not send receipt for m_id ${m_id}:`, error.message);
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
      range: `${SHEET_NAME}!A:AZ`, // Read a large enough range to cover your data
    };

    const getResponse = await sheets.spreadsheets.values.get(getRequest);
    const rows = getResponse.data.values || []; // Ensure rows is an array, even if empty

    const MILKAT_COL_INDEX = 5; // Assuming Milkat Number is in the 6th column (index 5, 0-indexed)

    let rowIndexToUpdate = -1;

    console.log(`[DEBUG] Received milkatId for update: ${milkatId}`);

    for (let i = 0; i < rows.length; i++) {
      if (i === 2) continue; // Skip the 3rd row (index 2) as per your original logic

      const sheetMilkatId = rows[i][MILKAT_COL_INDEX];

      console.log(
        `[DEBUG] Checking row ${i}, Milkat ID in sheet: ${sheetMilkatId}`
      );

      // Robust comparison: convert both to string and then compare, or handle parseFloat carefully.
      // Assuming milkatId can be a number or string, and in sheet it might be stored as string or number.
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
      const rowNumber = rowIndexToUpdate + 1; // Google Sheets is 1-indexed
      const rangeToUpdate = `${SHEET_NAME}!A${rowNumber}`; // Update the entire row starting from column A

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
      // If not found, append as a new row
      await appendSheetRows([rowData]);
      console.log(`Milkat ${milkatId} record not found, appended as new row.`);
      res.status(200).json({
        success: true,
        message: `Record for Milkat ID ${milkatId} appended.`,
      });
    }
  } catch (error) {
    console.error("[Failed] Could not update/append data to sheet:", error.message);
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
      range: `${SHEET_NAME}!A:AZ`, // Read a wide enough range
    };

    const getResponse = await sheets.spreadsheets.values.get(getRequest);
    const rows = getResponse.data.values || [];

    const MILKAT_COL_INDEX = 5; // Assuming Milkat Number is in column 6 (index 5)

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
      const rowNumber = rowIndexToUpdate + 1; // Google Sheets is 1-indexed
      const receiptRange = `${SHEET_NAME}!AF${rowNumber}`; // Column AF (32nd column, index 31)
      const dateRange = `${SHEET_NAME}!AG${rowNumber}`; // Column AG (33rd column, index 32)

      const today = new Date();
      const formattedDate = `${today.getDate().toString().padStart(2, "0")}/${(
        today.getMonth() + 1
      ).toString().padStart(2, "0")}/${today.getFullYear()}`;

      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          valueInputOption: "RAW", // Use RAW to insert values as-is
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

      console.log(`✅ Receipt ${receiptNumber} and date updated at row ${rowNumber}`);
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
    googleSheetId: SPREADSHEET_ID ? "Configured" : "Not Configured",
    keyFilePath: KEY_FILE_PATH,
    keyFileExists: require("fs").existsSync(KEY_FILE_PATH), // Check if file exists for debugging
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
        lastDisconnect?.error?.output?.statusCode !== baileys.DisconnectReason.loggedOut;

      console.log(
        "Connection closed. Reason:",
        lastDisconnect?.error,
        ". Reconnecting:",
        shouldReconnect
      );

      if (shouldReconnect) {
        connectToWhatsApp();
      } else {
        console.log("❌ Disconnected permanently. You were logged out from WhatsApp.");
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
  connectToWhatsApp(); // Call the function to connect to WhatsApp after the server starts
});
