/**
 * SugarSisters Blend Traceability — Google Apps Script
 *
 * Receives batch submissions from the PWA via HTTP POST.
 * Writes one row per ingredient to a "Batch Log" sheet.
 * Emails you a summary of every batch.
 *
 * SETUP
 * 1. Open your Traceability Google Sheet.
 * 2. Extensions → Apps Script. Delete default code, paste this in.
 * 3. Edit EMAIL_TO below.
 * 4. Save → Deploy → New deployment → Type: Web app
 *    Execute as: Me      Who has access: Anyone
 * 5. Copy the Web app URL into the PWA settings.
 */

const EMAIL_TO     = "your-email@example.com";   // <— set this
const SHEET_NAME   = "Batch Log";
const ALERT_THRESHOLD = 0.025;                    // 2.5% — flag in subject line

function doPost(e) {
  try {
    const batch = JSON.parse(e.postData.contents);
    appendBatchToSheet(batch);
    sendEmail(batch);
    return ContentService.createTextOutput(
      JSON.stringify({ ok: true, batchNo: batch.batchNo })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: err.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function appendBatchToSheet(batch) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      "BatchNo","Date","Operator","Blend","BagSize","BagsExpected","BagsActual",
      "BestBefore","Ingredient","Target(g)","Actual(g)","Variance(g)","Variance%",
      "Lot","TotalIn(g)","TotalOut(g)","BatchStatus","Notes"
    ]);
  }
  const rows = batch.ingredients.map(ing => [
    batch.batchNo,
    new Date(batch.date),
    batch.operator,
    batch.recipeName,
    batch.bagSize,
    batch.bagsExpected,
    batch.bagsActual,
    batch.bestBefore,
    ing.name,
    ing.target,
    ing.actual,
    ing.actual - ing.target,
    (((ing.actual - ing.target) / ing.target) * 100).toFixed(2) + "%",
    ing.lot,
    batch.totalIn,
    batch.totalOut,
    batch.status,
    batch.notes || ""
  ]);
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

function sendEmail(batch) {
  const flag = Math.abs(batch.variancePct) > ALERT_THRESHOLD ? "⚠️ CHECK — " : "✅ ";
  const subject = `${flag}Batch ${batch.batchNo} — ${batch.recipeName} — ${batch.status}`;

  const ingRows = batch.ingredients.map(i =>
    `<tr>
       <td style="padding:6px 10px;border-bottom:1px solid #eee">${i.name}</td>
       <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${i.target.toLocaleString()} g</td>
       <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${i.actual.toLocaleString()} g</td>
       <td style="padding:6px 10px;border-bottom:1px solid #eee">${i.lot}</td>
     </tr>`
  ).join("");

  const statusColor = batch.status === "OK" ? "#16a34a" : (batch.status === "REVIEW" ? "#f59e0b" : "#dc2626");

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif;max-width:560px;color:#1e293b">
      <div style="background:#0a2540;color:white;padding:16px 20px;border-radius:10px 10px 0 0">
        <div style="font-weight:700;font-size:18px">Batch ${batch.batchNo}</div>
        <div style="opacity:0.8;font-size:13px">${batch.recipeName}</div>
      </div>
      <div style="background:white;padding:18px 20px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 10px 10px">
        <table style="width:100%;font-size:14px;margin-bottom:14px">
          <tr><td style="color:#475569;padding:4px 0">Operator</td><td style="text-align:right;font-weight:600">${batch.operator}</td></tr>
          <tr><td style="color:#475569;padding:4px 0">Date</td><td style="text-align:right;font-weight:600">${new Date(batch.date).toLocaleString("en-IE")}</td></tr>
          <tr><td style="color:#475569;padding:4px 0">Bags produced</td><td style="text-align:right;font-weight:600">${batch.bagsActual} of ${batch.bagsExpected} expected</td></tr>
          <tr><td style="color:#475569;padding:4px 0">Best before</td><td style="text-align:right;font-weight:600">${batch.bestBefore}</td></tr>
        </table>

        <table style="width:100%;font-size:13px;border-collapse:collapse;margin-bottom:14px">
          <tr style="background:#f1f5f9">
            <th style="text-align:left;padding:8px 10px">Ingredient</th>
            <th style="text-align:right;padding:8px 10px">Target</th>
            <th style="text-align:right;padding:8px 10px">Actual</th>
            <th style="text-align:left;padding:8px 10px">Lot</th>
          </tr>
          ${ingRows}
        </table>

        <div style="background:#f8fafc;padding:12px;border-radius:8px;font-size:14px">
          <div>Total in: <b>${batch.totalIn.toLocaleString()} g</b></div>
          <div>Total out: <b>${batch.totalOut.toLocaleString()} g</b></div>
          <div>Variance: <b>${(batch.variancePct * 100).toFixed(2)}%</b></div>
          <div style="margin-top:8px;color:${statusColor};font-weight:700">Status: ${batch.status}</div>
        </div>

        ${batch.notes ? `<div style="margin-top:12px;font-size:13px;color:#475569"><b>Notes:</b> ${batch.notes}</div>` : ""}
      </div>
    </div>`;

  MailApp.sendEmail({
    to: EMAIL_TO,
    subject: subject,
    htmlBody: html,
  });
}

/** Test function — run from the Apps Script editor to confirm setup. */
function testSend() {
  const fakeBatch = {
    batchNo: "TEST-001",
    date: new Date().toISOString(),
    operator: "Test Operator",
    recipeName: "Frozen Ice 400g",
    bagSize: 400, bagsExpected: 36, bagsActual: 36,
    bestBefore: "2027-05-07",
    ingredients: [
      { name: "Icing Sugar", target: 13600, actual: 13605, lot: "LOT-IS-001" },
      { name: "Dried Egg White Powder", target: 924, actual: 924, lot: "LOT-DE-001" },
    ],
    totalIn: 14529, totalOut: 14400, variance: 129, variancePct: 0.009, status: "OK",
    notes: "Test batch from Apps Script."
  };
  appendBatchToSheet(fakeBatch);
  sendEmail(fakeBatch);
}
