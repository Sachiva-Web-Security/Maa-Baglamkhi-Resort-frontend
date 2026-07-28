/**
 * printKOT.js — Frontend KOT printing utility.
 *
 * Strategy (client-side):
 *   1. Backend auto-prints via pdf-to-printer on kitchen PC (HP "kitchen" printer)
 *   2. Frontend fallback: opens a print-ready window so the user can print
 *      from their browser if the backend print fails.
 *
 * The backend already handles KOT auto-print via KitchenPrintService.
 * This file exists as a frontend fallback / manual re-print helper.
 */

const getBackendBaseURL = () => {
  try {
    const mod = require("../../api");
    const fn = mod?.getBackendBaseURL || mod?.default?.getBackendBaseURL;
    return typeof fn === "function" ? fn() : "";
  } catch {
    return "";
  }
};

/**
 * Open a print-ready window for the given order data.
 * Call this as a fallback when backend print might not reach the client.
 */
export const printKOT = ({ table, waiter, entityType, items, prepTimeMinutes, paperWidthMm = 80 }) => {
  // If your printer uses a 58mm roll instead of 80mm, either pass
  // paperWidthMm: 58 when calling printKOT(...), or change the default above.
  const pageWidth = `${paperWidthMm}mm`;
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const rows = Array.isArray(items) ? items : [];
  const itemsHtml = rows
    .map(
      (item, idx) => `
      <tr>
        <td style="padding:6px 4px;border-bottom:1px dashed #000;font-size:13px;font-weight:bold;color:#000;text-align:center;">${idx + 1}</td>
        <td style="padding:6px 4px;border-bottom:1px dashed #000;font-size:13px;font-weight:bold;color:#000;">${escapeHtml(String(item.name || item.itemName || "Item"))}</td>
        <td style="padding:6px 4px;border-bottom:1px dashed #000;font-size:13px;font-weight:bold;color:#000;text-align:center;">${Number(item.qty || item.quantity || 1)}</td>
        <td style="padding:6px 4px;border-bottom:1px dashed #000;font-size:13px;font-weight:bold;color:#000;text-align:right;">Rs. ${Number(item.rate || item.price || 0).toFixed(2)}</td>
      </tr>
    `,
    )
    .join("");

  const printWindow = window.open("", "KOTPrint", "width=420,height=700");

  if (!printWindow) {
    alert("Please allow popups for this site to print KOT.");
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>KOT - ${escapeHtml(String(entityType || "Table"))} ${escapeHtml(String(table || ""))}</title>
        <style>
          /*
           * IMPORTANT: this receipt is for a narrow thermal printer (58-80mm).
           * Every text element uses pure black (#000) and large bold fonts so
           * nothing is faint or hard to read on either dark or light paper.
           */
          @page {
            size: ${pageWidth} auto;
            margin: 0;
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          html, body {
            width: ${pageWidth};
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            color: #000;
            background: #fff;
            padding: 3mm;
            font-size: 14px;
            font-weight: bold;
            line-height: 1.5;
          }
          h1 {
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            color: #000;
            margin-bottom: 3px;
            letter-spacing: 1px;
            text-transform: uppercase;
          }
          .sub {
            font-size: 11px;
            font-weight: bold;
            text-align: center;
            color: #000;
            margin-bottom: 6px;
          }
          .row {
            display: flex;
            justify-content: space-between;
            font-size: 13px;
            font-weight: bold;
            color: #000;
            margin-top: 4px;
            padding: 0 2px;
          }
          .row span:first-child {
            font-weight: bold;
          }
          .divider {
            border-top: 2px solid #000;
            margin: 6px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 4px;
          }
          th {
            text-align: left;
            font-size: 13px;
            font-weight: bold;
            padding: 4px 2px;
            border-bottom: 2px solid #000;
            color: #000;
          }
          td {
            padding: 5px 2px;
            border-bottom: 1px dashed #000;
            font-size: 13px;
            font-weight: bold;
            color: #000;
            word-break: break-word;
          }
          th:last-child, td:last-child {
            text-align: right;
          }
          th:nth-child(3), td:nth-child(3) {
            text-align: center;
          }
          th:nth-child(2), td:nth-child(2) {
            width: 50%;
          }
          .footer {
            margin-top: 10px;
            text-align: center;
            font-size: 11px;
            color: #000;
          }
          .badge {
            display: inline-block;
            background: #000;
            color: #fff;
            padding: 3px 8px;
            font-size: 11px;
            font-weight: bold;
            margin-top: 6px;
            letter-spacing: 1px;
          }
          @media print {
            html, body { width: ${pageWidth}; }
            body { padding: 2mm; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div style="text-align:center;">
          <h1>KITCHEN ORDER TICKET</h1>
          <div class="sub">Auto-printed from Restaurant POS</div>
        </div>

        <div class="divider"></div>

        <div class="row"><span>${escapeHtml(String(entityType || "Table"))}:</span><span>${escapeHtml(String(table || ""))}</span></div>
        <div class="row"><span>Waiter:</span><span>${escapeHtml(String(waiter || ""))}</span></div>
        <div class="row"><span>Date:</span><span>${dateStr}</span></div>
        <div class="row"><span>Time:</span><span>${timeStr}</span></div>
        <div class="row"><span>ETA:</span><span>${Number(prepTimeMinutes || 0)} min</span></div>

        <div class="divider"></div>

        <table>
          <thead>
            <tr>
              <th style="width:6%;text-align:center;color:#000;">#</th>
              <th style="width:54%;color:#000;">Item</th>
              <th style="width:15%;text-align:center;color:#000;">Qty</th>
              <th style="width:25%;text-align:right;color:#000;">Rate</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>

        <div class="divider"></div>

        <div class="footer">
          <div>Printed at ${timeStr}</div>
          <div class="badge">-- KITCHEN COPY --</div>
          <div style="margin-top: 8px; font-size: 11px; color: #000; font-weight: bold;">
            Printed from: ${escapeHtml(window.location.origin || "Hotel POS")}
          </div>
        </div>

        <script>
          (function() {
            function doPrint() {
              try { window.focus(); } catch (e) {}
              try { window.print(); } catch (e) {}
              setTimeout(function() {
                try { window.close(); } catch (e) {}
              }, 600);
            }
            if (document.readyState === "complete") {
              setTimeout(doPrint, 300);
            } else {
              window.addEventListener("load", function() { setTimeout(doPrint, 300); });
            }
          })();
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

const escapeHtml = (value) => {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};