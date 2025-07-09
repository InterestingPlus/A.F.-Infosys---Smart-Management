document.addEventListener("DOMContentLoaded", function () {
  /**
   * Maps HTML element IDs to their corresponding column index in the Google Sheet.
   * This is the central configuration for populating the receipt.
   * Update the index numbers here if your Google Sheet columns change.
   */
  const headerMap = {
    // Top Section
    name: 1,
    valuationYear: 2,
    owner_name: 3,
    address: 4,
    description: 15,
    milkat_number: 5,
    old_milkat_number: 6,
    // Assuming taluka and district might be the same as village or fetched from elsewhere.
    // If they are in the sheet, add them here. For now, let's assume they are static or derived.
    // receipt_number and receipt_date would likely be generated or come from another source.
    // Let's assume they are in the sheet for this example.
    receipt_number: 31, // Placeholder
    receipt_date: 32, // Using resolutionDate as receipt_date

    // Current Year Taxes
    houseTax: 19,
    saPaTax: 20,
    specialWaterTax: 21,
    lightTax: 22,
    cleaningTax: 23,
    talukaTax: 24,

    // Previous Year Taxes (assuming these are in subsequent columns)
    houseTaxPrevYear: 25,
    saPaTaxPrevYear: 26,
    specialWaterTaxPrevYear: 27,
    lightTaxPrevYear: 28,
    cleaningTaxPrevYear: 29,
    talukaTaxPrevYear: 30,
  };

  // Configuration for static data (can also be fetched)
  const STATIC_DATA = {
    village: "MEGHARAJ",
    taluka: "MEGHARAJ",
    district: "ARAVALLI",
  };

  function printReceipt() {
    window.print();
  }

  function downloadPDF() {
    const element = document.getElementById("pdf-content");
    const opt = {
      margin: [0.05, 0.05, 0.05, 0.05],
      filename: "Receipt_Report.pdf",
      image: { type: "jpeg", quality: 1.0 },

      html2canvas: {
        scale: 2, // Adjust for quality vs size
        useCORS: true,
      },
      jsPDF: {
        unit: "px",
        format: [750, 2500], // 750px width (3 inch), 10000px height placeholder
        orientation: "portrait",
      },
      pagebreak: { mode: ["avoid-all"] },
    };
    html2pdf().set(opt).from(element).save();
  }

  async function fetchDataFromSheet(sheetId, recordId) {
    // In Google Sheets, header is row 1, data starts from row 2.
    // So, we fetch row `recordId + 1`.
    const range = `A${recordId + 3}:AZ${recordId + 3}`;
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&range=${range}`;

    console.log(`Fetching from URL: ${url}`);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Network response was not ok: ${res.statusText}`);
    }
    const text = await res.text();
    const json = JSON.parse(text.substring(47).slice(0, -2));

    if (!json.table.rows || json.table.rows.length === 0) {
      throw new Error(`Record with ID '${recordId}' not found.`);
    }

    const record = json.table.rows[0].c.map((cell) => (cell ? cell.v : ""));
    console.log("Fetched Record:", record);
    return record;
  }

  function safeNumber(val) {
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
  }

  function numberToGujaratiWords(num) {
    if (num === 0) return "શૂન્ય રૂપિયા પૂરાં";

    const gujWords1to99 = [
      "",
      "એક",
      "બે",
      "ત્રણ",
      "ચાર",
      "પાંચ",
      "છ",
      "સાત",
      "આઠ",
      "નવ",
      "દસ",
      "અગિયાર",
      "બાર",
      "તેર",
      "ચૌદ",
      "પંદર",
      "સોળ",
      "સત્તર",
      "અઢાર",
      "ઓગણીસ",
      "વીસ",
      "એકવીસ",
      "બાવીસ",
      "ત્રેવીસ",
      "ચોવીસ",
      "પચ્ચીસ",
      "છવ્વીસ",
      "સત્તાવીસ",
      "અઠ્ઠાવીસ",
      "ઓગણત્રીસ",
      "ત્રીસ",
      "એકત્રીસ",
      "બત્રીસ",
      "તેંત્રીસ",
      "ચોત્રીસ",
      "પાંત્રીસ",
      "છત્રીસ",
      "સાડત્રીસ",
      "આડત્રીસ",
      "ઓગણચાલીસ",
      "ચાલીસ",
      "એકતાલીસ",
      "બેતાલીસ",
      "તેતાલીસ",
      "ચુંમ્માલીસ",
      "પિસ્તાલીસ",
      "છેંતાલીસ",
      "સુડતાલીસ",
      "અડતાલીસ",
      "ઓગણપચાસ",
      "પચાસ",
      "એકાવન",
      "બાવન",
      "ત્રેપન",
      "ચોપન",
      "પંચાવન",
      "છપ્પન",
      "સત્તાવન",
      "અઠાવન",
      "ઓગણસાઠ",
      "સાઠ",
      "એકસઠ",
      "બાસઠ",
      "ત્રેસઠ",
      "ચોસઠ",
      "પાંસઠ",
      "છાસઠ",
      "સડસઠ",
      "અડસઠ",
      "ઓગણસિત્તેર",
      "સિત્તેર",
      "એકોતેર",
      "બોંતેર",
      "તોંતેર",
      "ચુંમોતેર",
      "પંચોતેર",
      "છોંતેર",
      "સીતોતેર",
      "ઇઠોતેર",
      "ઓગણએંસી",
      "એંસી",
      "એક્યાસી",
      "બ્યાસી",
      "ત્યાસી",
      "ચોરાસી",
      "પંચાસી",
      "છયાસી",
      "સત્યાસી",
      "અઠયાસી",
      "નેવ્યાસી",
      "નેવું",
      "એકાણું",
      "બાણું",
      "ત્રાણું",
      "ચોરાણું",
      "પંચાણું",
      "છન્નું",
      "સતાણું",
      "અઠાણું",
      "નવ્વાણું",
    ];

    function toWords(n) {
      if (n < 100) return gujWords1to99[n];
      if (n < 1000) {
        const hundredPart = Math.floor(n / 100);
        const rest = n % 100;
        return (
          gujWords1to99[hundredPart] +
          " સો" +
          (rest !== 0 ? " " + gujWords1to99[rest] : "")
        );
      }
      if (n < 100000) {
        const thousandPart = Math.floor(n / 1000);
        const rest = n % 1000;
        return (
          toWords(thousandPart) +
          " હજાર" +
          (rest !== 0 ? " " + toWords(rest) : "")
        );
      }
      if (n < 10000000) {
        const lakhPart = Math.floor(n / 100000);
        const rest = n % 100000;
        return (
          toWords(lakhPart) + " લાખ" + (rest !== 0 ? " " + toWords(rest) : "")
        );
      }
      const crorePart = Math.floor(n / 10000000);
      const rest = n % 10000000;
      return (
        toWords(crorePart) + " કરોડ" + (rest !== 0 ? " " + toWords(rest) : "")
      );
    }

    return toWords(Math.floor(num)) + " રૂપિયા પૂરાં";
  }

  // Add this new function to your script
  function generateQRCode(totalAmount, milkatId) {
    // --- !! IMPORTANT: FILL IN YOUR DETAILS HERE !! ---
    const payeeUpiId = "kiritporiya25-1@oksbi"; // UPI ID

    const payeeName = "Meghraj Gram Panchayat"; // <--- REPLACE WITH YOUR NAME

    // Clear any existing QR code
    document.getElementById("qrcode").innerHTML = "";

    if (totalAmount <= 0) {
      document.getElementById("qrcode-container").innerHTML =
        "<p>No payment due.</p>";
      return;
    }

    const transactionNote = `Property Tax for Milkat ID ${milkatId}`;

    // URL encode the name and note to handle spaces and special characters
    const encodedPayeeName = encodeURIComponent(payeeName);
    const encodedTransactionNote = encodeURIComponent(transactionNote);

    // Construct the full UPI payment link
    const upiLink = `upi://pay?pa=${payeeUpiId}&pn=${encodedPayeeName}&am=${totalAmount.toFixed(
      2
    )}&cu=INR&tn=${encodedTransactionNote}`;

    console.log("Generated UPI Link:", upiLink);

    // Update the amount text under the QR code
    document.getElementById("qr-amount").textContent = `₹${totalAmount.toFixed(
      2
    )}`;

    // Generate the QR Code
    new QRCode(document.getElementById("qrcode"), {
      text: upiLink,
      width: 300,
      height: 300,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M, // Medium correction level is good for UPI
    });
  }

  function populateReceipt(record) {
    // --- 1. Populate direct fields from headerMap ---
    for (const id in headerMap) {
      const element = document.getElementById(id);
      const columnIndex = headerMap[id];
      if (element && record[columnIndex] !== undefined) {
        element.textContent = record[columnIndex];

        if (id.includes("receipt_number")) {
          if (record[columnIndex]) {
            document.getElementById("payment_type").textContent = "રોકડ";
          }
        }

        if (id.includes("address")) {
          element.textContent = `${record[columnIndex]} (${record[14]})`;
        }

        // if (id.includes("receipt_date")) {
        //   console.log("Date found", record[columnIndex]);
        //   if (!record[columnIndex]) return;

        //   const dateParts = record[columnIndex]
        //     .replace("Date(", "")
        //     .replace(")", "")
        //     .split(",")
        //     .map(Number);

        //   const year = dateParts[0];
        //   const month = String(dateParts[1] + 1).padStart(2, "0"); // 0-based → 1-based
        //   const day = String(dateParts[2]).padStart(2, "0");

        //   let formattedDate = `${day}/${month}/${year}`;

        //   if (!formattedDate) {
        //     formattedDate = record[columnIndex];
        //   }

        //   element.textContent = formattedDate;
        // }
      }
    }

    // --- Populate static/repeated fields ---
    document
      .querySelectorAll(".village-name")
      .forEach((el) => (el.textContent = STATIC_DATA.village));
    document.getElementById("taluka").textContent = STATIC_DATA.taluka;
    document.getElementById("district").textContent = STATIC_DATA.district;

    // --- 2. Perform Calculations ---
    const taxFields = [
      "houseTax",
      "saPaTax",
      "specialWaterTax",
      "cleaningTax",
      "sewerTax",
      "lightTax",
      "advance",
      "noticeFee",
      "otherTax",
      "talukaTax",
      "businessTax",
      "buildingTax",
      "educationTax",
      "landTax",
    ];

    let currentTotal = 0;
    let previousTotal = 0;

    taxFields.forEach((field) => {
      const currentVal = safeNumber(
        document.getElementById(field)?.textContent || "0"
      );
      const prevVal = safeNumber(
        document.getElementById(`${field}PrevYear`)?.textContent || "0"
      );
      const total = currentVal + prevVal;

      currentTotal += currentVal;
      previousTotal += prevVal;

      // --- 3. Update Calculated UI Fields (row totals) ---
      const totalElement = document.getElementById(`${field}Total`);
      if (totalElement) {
        totalElement.textContent = total.toFixed(2);
      }
    });

    const grandTotal = currentTotal + previousTotal;

    // --- 4. Update Grand Totals and Amount in Words ---
    document.getElementById("CurrentTotal").textContent =
      currentTotal.toFixed(2);
    document.getElementById("PreviousTotal").textContent =
      previousTotal.toFixed(2);
    document.getElementById("Total").textContent = grandTotal.toFixed(2);
    document.getElementById("totalInWords").textContent =
      numberToGujaratiWords(grandTotal);

    const milkatId = record[headerMap.milkat_number]; // Get the milkat ID from the record
    generateQRCode(grandTotal, milkatId);
  }

  // Attach event listeners to buttons
  document.getElementById("print-btn").addEventListener("click", printReceipt);
  document
    .getElementById("download-btn")
    .addEventListener("click", downloadPDF);

  // --- Main execution block that runs on page load ---
  (async function () {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const m_id = urlParams.get("m_id");

      if (!m_id) {
        alert("Please provide a record ID in the URL!");
        document.body.innerHTML = `<h1 style="text-align:center; margin-top: 50px;">No Record ID provided.</h1><p style="text-align:center;">Please add <strong>?m_id=YOUR_RECORD_ID</strong> to the end of the URL.</p>`;
        return;
      }

      const recordIdAsNumber = parseInt(m_id, 10);
      if (isNaN(recordIdAsNumber)) {
        throw new Error("Invalid Record ID. It must be a number.");
      }

      // Your Google Sheet ID
      const sheetId = "1_bs5IQ0kDT_xVLwJdihe17yuyY_UfJRKCtwoGvO7T5Y";
      const record = await fetchDataFromSheet(sheetId, recordIdAsNumber);

      populateReceipt(record);
    } catch (error) {
      console.error("Failed to generate receipt:", error);
      alert(`Error: ${error.message}`);
      document.getElementById(
        "pdf-content"
      ).innerHTML = `<h2 style="color: red; text-align: center;">Failed to load receipt data. with id : ${m_id}</h2><p style="text-align: center;">${error.message}</p>`;
    }
  })();
});
