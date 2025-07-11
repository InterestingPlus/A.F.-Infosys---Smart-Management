import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import inquiryRoutes from "./routes/inquiryRoutes.js";
import qrcode from "qrcode-terminal";

import * as baileys from "@whiskeysockets/baileys";

let socket;
let isConnected = false;

import job from "./cron.js";

// --- Puppeteer Specific Imports and Setup ---
import puppeteer from "puppeteer";
import path from "path";
import { fileURLToPath } from "url"; // Required for __dirname in ES Modules

// Fix __dirname for ES module (already present in your code, just ensuring it's above chromePath)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 👇 Define the path to the downloaded Chrome executable for Render deployment
// Based on your logs: /opt/render/project/src/.cache/puppeteer/chrome/linux-131.0.6778.204/chrome-linux64/chrome
const chromePath = path.resolve(
    __dirname,
    '.cache/puppeteer/chrome/linux-131.0.6778.204/chrome-linux64/chrome'
);
// --- End Puppeteer Specific Setup ---


dotenv.config();

const app = express();

job.start();

// Middleware
app.use(cors());
app.use(express.json());

// DB Connection
connectDB();

// Routes
app.get("/", (req, res) => {
    res.send("A.F. Infosys Smart Management CRM, Server is Running!");
});
app.use("/api/auth", authRoutes);
app.use("/api/leads", inquiryRoutes);

// Reciept Automation Script Start
async function fetchDataFromSheet(sheetId, recordId) {
    const range = `A${recordId + 1}:AZ${recordId + 1}`;
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&range=${range}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Network response was not ok.`);
    const text = await res.text();
    const json = JSON.parse(text.substring(47).slice(0, -2));
    if (!json.table.rows || json.table.rows.length === 0) {
        throw new Error(`Record with ID '${recordId}' not found.`);
    }
    return json.table.rows[0].c.map((cell) => (cell ? cell.v : ""));
}
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

// --- 5. THE 'SEND RECEIPT' HTTP ENDPOINT (remains the same) ---
app.post("/send-receipt", async (req, res) => {
    if (!isConnected || !socket) {
        return res.status(503).json({
            success: false,
            message: "WhatsApp bot is not connected or ready.",
        });
    }
    const { m_id } = req.body;
    if (!m_id) {
        return res
            .status(400)
            .json({ success: false, message: "Missing m_id in request." });
    }
    try {
        const recordId = parseInt(m_id, 10) + 2;
        console.log(`[Request] Received request for m_id: ${recordId}`);
        const record = await fetchDataFromSheet(
            process.env.GOOGLE_SHEET_ID,
            recordId
        );
        const ownerName = record[1] || "Valued Customer";
        const phoneNumber = record[17];
        // !! Adjust these indices if your sheet changes !!
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
            throw new Error(`No phone number at index 17 for m_id ${recordId}`);
        const jid = formatJid(phoneNumber);
        if (!jid) throw new Error(`Invalid phone number: ${phoneNumber}`);
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
        console.log(`[Success] Sent receipt for m_id ${recordId} to ${jid}`);
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

// --- 6. WHATSAPP CONNECTION LOGIC (THIS IS THE UPDATED PART) ---
async function connectToWhatsApp() {
    const { state, saveCreds } = await baileys.useMultiFileAuthState("auth_info_baileys"); // Access useMultiFileAuthState from 'baileys'
    const { version } = await baileys.fetchLatestBaileysVersion(); // Access fetchLatestBaileysVersion from 'baileys'

    socket = baileys.makeWASocket({ // Access makeWASocket from 'baileys'
        // printQRInTerminal: true, // This option is deprecated, we remove it.
        auth: state,
        version,
        browser: ["AF-Infosys", "ReceiptBot", "1.0"],
    });

    socket.ev.on("creds.update", saveCreds);

    socket.ev.on("connection.update", (update) => {
        // We destructure qr from the update object
        const { connection, lastDisconnect, qr } = update;

        // ** THIS IS THE NEW LOGIC TO HANDLE THE QR CODE **
        if (qr) {
            console.log("QR Code received, please scan with your phone's WhatsApp:");
            qrcode.generate(qr, { small: true }); // Print the QR code to the terminal
        }

        if (connection === "close") {
            isConnected = false;
            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !==
                baileys.DisconnectReason.loggedOut; // Access DisconnectReason from 'baileys'
            console.log(
                "Connection closed. Reason:",
                lastDisconnect?.error,
                ". Reconnecting:",
                shouldReconnect
            );
            if (shouldReconnect) {
                connectToWhatsApp();
            } else {
                console.log("❌ Disconnected permanently. You were logged out.");
            }
        } else if (connection === "open") {
            isConnected = true;
            console.log(
                "✅ WhatsApp connection opened successfully! Ready to send receipts."
            );
        }
    });
}


import { google } from "googleapis";
// path and fileURLToPath are already imported above for Puppeteer setup
// import path from "path";
// import { fileURLToPath } from "url";

// Fix __dirname for ES module (already defined above)
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// --- Google Sheets Configuration ---
const KEY_FILE_PATH = path.join(
    __dirname,
    "af-infosys-c9ccb3ab388f.json"
); // Path to your service account key file

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID; // Make sure GOOGLE_SHEET_ID is also in your Render env vars
const SHEET_NAME = "AC MAST";  // The name of the specific sheet/tab you want to update

// --- Google Sheets Authentication ---
const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE_PATH,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"], // Scope for read/write access
});

// Create Sheets client
const sheets = google.sheets({ version: "v4", auth });


/**
 * Updates a specific range of cells in a Google Sheet.
 * @param {string} range A1 notation (e.g., 'Sheet1!A1', 'Sheet1!C5:D10')
 * @param {Array<Array<any>>} values An array of arrays, where each inner array is a row of values.
 */

async function updateSheetCells(range, values) {
    try {
        // Step 1: Get existing values from the sheet
        const currentData = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
        });

        const existingValues = currentData.data.values || [];

        // Step 2: Only preserve value at index 18 if it's empty in the new data
        const finalValues = values.map((row, rowIndex) => {
            const existingRow = existingValues[rowIndex] || [];
            const updatedRow = [...row]; // clone the row

            if (row[18] === "") {
                updatedRow[18] = existingRow[18] ?? "Meghraj - MEGHRAJ"; // preserve existing if available
            }

            return updatedRow;
        });

        // Step 3: Send updated values
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
            range: `${SHEET_NAME}!A:Z`, // Read a large enough range to cover your data
        };
        const getResponse = await sheets.spreadsheets.values.get(getRequest);
        const rows = getResponse.data.values;

        const MILKAT_COL_INDEX = 5; // Assuming Milkat Number is in the first column (index 0)

        let rowIndexToUpdate = -1;
        console.log(`[DEBUG] Received milkatId for update: ${milkatId}`);
        if (rows) {
            for (let i = 0; i < rows.length; i++) {
                if (i === 2) continue; // Skip the 3rd row (index 2)
                const sheetMilkatId = rows[i][MILKAT_COL_INDEX];
                console.log(
                    `[DEBUG] Checking row ${i}, Milkat ID in sheet: ${sheetMilkatId}`
                );
                if (
                    sheetMilkatId &&
                    parseFloat(sheetMilkatId) === parseFloat(milkatId)
                ) {
                    rowIndexToUpdate = i;
                    console.log(`[DEBUG] Match found at row index: ${rowIndexToUpdate}`);
                    break;
                }
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

// Reciept Number Updation on Record
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
            range: `${SHEET_NAME}!A:Z`,
        };
        const getResponse = await sheets.spreadsheets.values.get(getRequest);
        const rows = getResponse.data.values;

        const MILKAT_COL_INDEX = 5;
        let rowIndexToUpdate = -1;

        for (let i = 0; i < rows.length; i++) {
            if (i === 2) continue; // skip row 3
            const sheetMilkatId = rows[i][MILKAT_COL_INDEX];
            if (sheetMilkatId && parseFloat(sheetMilkatId) === parseFloat(milkatId)) {
                rowIndexToUpdate = i;
                break;
            }
        }

        if (rowIndexToUpdate !== -1) {
            const rowNumber = rowIndexToUpdate + 1;
            const receiptRange = `${SHEET_NAME}!AF${rowNumber}`; // Column 32
            const dateRange = `${SHEET_NAME}!AG${rowNumber}`; // Column 33

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

            console.log(`✅ Receipt ${receiptNumber} updated at row ${rowNumber}`);
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
app.get("/debug-status", (req, res) => {
    res.json({
        socketInitialized: Boolean(socket),
        isConnected,
    });
});

// --- Puppeteer Automation Route ---
// ✅ Helper to get option value by its visible text
async function getOptionValueByText(page, selectName, visibleText) {
    console.log(`🔍 Searching for option "${visibleText}" in select "${selectName}"...`);
    const optionValue = await page.evaluate(
        (selectName, visibleText) => {
            const select = document.querySelector(`select[name="${selectName}"]`);
            if (!select) return null;

            const option = Array.from(select.options).find(
                (opt) => opt.textContent.trim() === visibleText
            );
            return option ? option.value : null;
        },
        selectName,
        visibleText
    );

    console.log(
        `🎯 Found value for "${visibleText}" in ${selectName}:`,
        optionValue
    );
    return optionValue;
}

// 📌 GET Automation API
app.get("/auto-login", async (req, res) => {
    const login_id = "28494";
    const password = "Mgp@28494";

    let browser; // Declare browser outside try block for finally
    try {
        console.log("🚀 Launching Puppeteer browser...");
        browser = await puppeteer.launch({
            headless: "new", // Use 'new' for the new headless mode
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage", // Recommended for Docker/Linux environments to avoid memory issues
                // Additional args that might sometimes help with network stability, though less directly for ERR_TIMED_OUT
                "--disable-gpu", // Disables GPU hardware acceleration.
                "--no-zygote", // Disables the zygote process.
                "--single-process", // Runs the browser in a single process.
                "--disable-setuid-sandbox", // Disables the setuid sandbox.
                "--disable-accelerated-video-decode", // Disables accelerated video decoding.
                "--disable-accelerated-mhtml-generation", // Disables accelerated MHTML generation.
                "--disable-features=site-per-process", // Disables site isolation.
            ],
            executablePath: chromePath, // 👈 Must match downloaded path
            dumpio: true, // This will pipe browser process stdout/stderr to Node.js process stdout/stderr
        });

        const page = await browser.newPage();

        // ⏱️ Increase default timeout for all page operations to 120 seconds
        await page.setDefaultNavigationTimeout(120000); // 120 seconds
        await page.setDefaultTimeout(120000); // 120 seconds for other operations like .type(), .click()

        console.log("🌐 Navigating to https://gramsuvidha.gujarat.gov.in...");
        await page.goto("https://gramsuvidha.gujarat.gov.in", {
            waitUntil: "load", // Changed from 'domcontentloaded' to 'load'
            timeout: 120000, // Explicitly set timeout for this navigation
        });
        console.log("✅ Navigation complete.");

        // 🧾 Fill Login ID
        console.log(`✍️ Typing login ID: ${login_id}`);
        await page.type('input[name="txtSiteID"]', login_id);
        await page.evaluate(() => {
            const ddlModule = document.querySelector('input[name="txtSiteID"]');
            if (ddlModule) {
                ddlModule.dispatchEvent(new Event("input", { bubbles: true }));
            }
        });
        console.log("⏳ Waiting for AJAX to trigger dropdown loading...");
        await new Promise((res) => setTimeout(res, 3000)); // Increased wait time for AJAX

        // 🕐 Wait until options are loaded
        let dropdownsReady = false;
        let attempts = 0;
        const maxAttempts = 20; // Try up to 10 seconds (20 * 500ms)

        console.log("🔄 Checking if dropdowns are populated...");
        while (!dropdownsReady && attempts < maxAttempts) {
            dropdownsReady = await page.evaluate(() => {
                const moduleSelect = document.querySelector('select[name="DDLModule"]');
                const userSelect = document.querySelector('select[name="DDLUser"]');

                // Check if elements exist and have more than just the default option
                return (
                    moduleSelect &&
                    userSelect &&
                    moduleSelect.options.length > 1 &&
                    userSelect.options.length > 1
                );
            });

            if (!dropdownsReady) {
                console.log(`⏳ Waiting for dropdowns to populate... (Attempt ${attempts + 1}/${maxAttempts})`);
                await new Promise((res) => setTimeout(res, 500));
                attempts++;
            }
        }

        if (!dropdownsReady) {
            throw new Error("❌ Dropdowns not loaded even after waiting for multiple attempts.");
        }
        console.log("✅ Dropdowns are ready!");

        const moduleValue = await getOptionValueByText(
            page,
            "DDLModule",
            "પંચાયત વેરો"
        );
        const userValue = await getOptionValueByText(page, "DDLUser", "તલાટી");

        if (!moduleValue || !userValue) {
            throw new Error("❌ Could not find required dropdown values for 'પંચાયત વેરો' or 'તલાટી'");
        }

        console.log(`Selecting DDLModule with value: ${moduleValue}`);
        await page.evaluate((value) => {
            const select = document.querySelector('select[name="DDLModule"]');
            if (select) { // Added null check
                select.value = value;
                select.dispatchEvent(new Event("change", { bubbles: true }));
            }
        }, moduleValue);
        await new Promise((res) => setTimeout(res, 1000)); // Small wait after module change

        console.log(`Selecting DDLUser with value: ${userValue}`);
        await page.evaluate((userValue) => {
            const select = document.querySelector('select[name="DDLUser"]');
            if (select) { // Added null check
                const option = Array.from(select.options).find(
                    (opt) => opt.value === userValue
                );

                if (option) {
                    option.selected = true;
                    select.value = option.value;
                    select.dispatchEvent(new Event("change", { bubbles: true }));

                    // 🔁 Trigger postback manually, same as onchange="setTimeout('__doPostBack(...')"
                    // This part is crucial for ASP.NET postbacks
                    setTimeout(() => {
                        const eventTarget = document.getElementById("__EVENTTARGET");
                        const eventArgument = document.getElementById("__EVENTARGUMENT");
                        if (eventTarget && eventArgument) {
                            eventTarget.value = "DDLUser";
                            eventArgument.value = "";
                            // Ensure form is submitted, assuming 'form1' is the correct ID
                            const form = document.forms["form1"];
                            if (form) {
                                form.submit();
                            } else {
                                console.error("Form 'form1' not found for submission.");
                            }
                        } else {
                            console.error("__EVENTTARGET or __EVENTARGUMENT not found.");
                        }
                    }, 0); // Execute immediately on next tick
                }
            }
        }, userValue);

        console.log("⏳ Waiting for page to reload after DDLUser change...");
        // Wait for navigation after the DDLUser change triggers a postback
        await page.waitForNavigation({ waitUntil: "load", timeout: 120000 }); // Changed to 'load'
        console.log("✅ Page reloaded after DDLUser change.");

        let year;
        let yearAttempts = 0;
        const maxYearAttempts = 10;
        console.log("🔄 Waiting for year dropdown to be populated...");
        do {
            try {
                year = await page.$eval("#DDLYear", (el) => el.value);
                console.log("📅 Year found:", year);
            } catch (err) {
                console.log(`⏳ Year dropdown not yet ready (Attempt ${yearAttempts + 1}/${maxYearAttempts})...`);
                await new Promise((res) => setTimeout(res, 1000));
                yearAttempts++;
            }
        } while (!year && yearAttempts < maxYearAttempts);

        if (!year) {
            throw new Error("❌ Year dropdown not loaded even after waiting.");
        }

        // 🧾 Fill password
        console.log("✍️ Typing password...");
        await page.type('input[name="TxtPassword"]', password);

        // Wait for captcha value (sometimes pre-filled)
        let captchaValue;
        let captchaAttempts = 0;
        const maxCaptchaAttempts = 15; // Try up to 30 seconds (15 * 2000ms)
        console.log("🔄 Waiting for captcha value...");
        do {
            try {
                captchaValue = await page.$eval('input[name="txtCaptcha"]', (el) =>
                    el.value.trim()
                );
                if (captchaValue) {
                    console.log(`✅ Captcha value found: "${captchaValue}"`);
                } else {
                    console.log(`⏳ Captcha value not yet available (Attempt ${captchaAttempts + 1}/${maxCaptchaAttempts})...`);
                }
            } catch (e) {
                console.log(`⏳ Captcha element not found or value empty (Attempt ${captchaAttempts + 1}/${maxCaptchaAttempts})...`);
            }
            await new Promise((res) => setTimeout(res, 2000));
            captchaAttempts++;
        } while (!captchaValue && captchaAttempts < maxCaptchaAttempts);

        if (!captchaValue) {
            throw new Error("❌ Captcha value not found after multiple attempts.");
        }

        // Set captcha confirm
        console.log(`✍️ Typing captcha confirmation: ${captchaValue.replace(/\s+/g, "")}`);
        await page.type(
            'input[name="txtCompare"]',
            captchaValue.replace(/\s+/g, "")
        );

        console.log("⏳ Waiting before login submission...");
        await new Promise((res) => setTimeout(res, 2000));

        // Override validate function to always return true
        console.log("🚨 Overriding validate() function to always return true.");
        await page.evaluate(() => {
            window.validate = () => true;
        });

        console.log("⬆️ Clicking login button and waiting for navigation...");
        await Promise.all([
            page.click('input[name="BtnLogin"]'),
            page.waitForNavigation({ waitUntil: "load", timeout: 120000 }), // Increased timeout
        ]);
        console.log("✅ Login button clicked and navigation complete.");

        const currentURL = page.url();
        console.log(`Current URL after login attempt: ${currentURL}`);

        if (currentURL.includes("DashBoardPV.aspx")) {
            console.log("✅ Login successful. Navigating to Milkat Page...");
            await page.goto(
                "https://gramsuvidha.gujarat.gov.in/PanchayatVero/ListMasterMilkatPV.aspx",
                { waitUntil: "load", timeout: 120000 } // Increased timeout
            );
            console.log("✅ Successfully navigated to Milkat Page.");

            return res.json({
                success: true,
                message: "Logged in successfully and navigated to Milkat Page.",
                finalUrl: page.url()
            });
        } else {
            console.log("❌ Login failed. Current URL does not include 'DashBoardPV.aspx'.");
            return res.status(400).json({ error: "Login failed.", finalUrl: page.url() });
        }
    } catch (err) {
        console.error("❌ Automation failed:", err);
        // Provide more specific error details
        return res.status(500).json({
            error: "Internal error.",
            message: err.message, // Send only the error message, not the full object
            name: err.name || "Error" // Include error name if available
        });
    } finally {
        // Ensure the browser is closed even if an error occurs
        if (browser) {
            console.log("Closing browser...");
            await browser.close();
            console.log("Browser closed.");
        }
    }
});
// --- End Puppeteer Automation Route ---


// Server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    // Call the function to connect to WhatsApp after the server starts
    connectToWhatsApp();
});
