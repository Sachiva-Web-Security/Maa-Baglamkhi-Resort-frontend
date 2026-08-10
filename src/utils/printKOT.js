/**
 * printKOT.js — Frontend KOT printing utility.
 *
 * Strategy:
 *   1. Shows an in-page overlay (no popup blocking) so the user always sees
 *      the KOT immediately after placing the order, with a manual Print /
 *      Close button.
 *   2. Actual printing is done through a hidden <iframe> that contains ONLY
 *      the KOT receipt as a standalone HTML document, and we call
 *      iframe.contentWindow.print() on that.
 *
 * IMPORTANT — why the iframe (not window.print() on the main page):
 * A previous version printed by hiding the whole page with
 * `@media print { body * { visibility: hidden } ... }` and only showing the
 * overlay. That CSS trick is unreliable across browsers/print-preview
 * renderers — the rest of the React app (fixed/absolute positioned
 * elements, portals, etc.) can still interfere, and in production this
 * showed up as a completely BLANK print preview with no KOT data visible
 * at all.
 *
 * Printing a dedicated hidden iframe avoids this entirely: the iframe's
 * document contains nothing but the receipt, so there's nothing else to
 * hide and nothing else that can leak into the print preview. This also
 * avoids the popup-blocker problems of `window.open()`, since no new
 * window/tab is created — the iframe lives inside the current page.
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

const escapeHtml = (value) => {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

/**
 * Build the KOT receipt markup (used both for the on-screen overlay and
 * inside the print iframe).
 */
const buildKOTHtml = ({ table, waiter, entityType, items, prepTimeMinutes, kotNo, orderNo, dateStr, timeStr }) => {
  const rows = Array.isArray(items) ? items : [];
  const now = dateStr ? null : new Date();
  const effectiveDateStr = dateStr || now.toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
  const effectiveTimeStr = timeStr || now.toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });

  const itemsHtml = rows
    .map((item, idx) => {
      const name = escapeHtml(String(item.name || item.itemName || "Item"));
      const qty = Number(item.qty || item.quantity || 1);
      return `<tr>
        <td style="padding:3px 2px;border-bottom:1px dashed #999;font-size:12px;font-weight:bold;text-align:center;">${idx + 1}</td>
        <td style="padding:3px 2px;border-bottom:1px dashed #999;font-size:12px;font-weight:bold;">${name}</td>
        <td style="padding:3px 2px;border-bottom:1px dashed #999;font-size:12px;font-weight:bold;text-align:center;">${qty}</td>
      </tr>`;
    })
    .join("");

  const tableLabel = escapeHtml(String(table || ""));
  const waiterLabel = escapeHtml(String(waiter || ""));
  const dateLabel = escapeHtml(effectiveDateStr);
  const timeLabel = escapeHtml(effectiveTimeStr);
  const eta = Number(prepTimeMinutes || 0);

  return `<div class="kot-receipt">
    <div class="kot-title-row">KITCHEN ORDER TICKET</div>
    <div class="kot-sub-row">Auto-printed from Restaurant POS</div>
    <div class="kot-line"></div>
    <table class="kot-info">
      <tr><td class="kot-lbl">Table:</td><td class="kot-val">${tableLabel}</td></tr>
      <tr><td class="kot-lbl">Waiter:</td><td class="kot-val">${waiterLabel}</td></tr>
      <tr><td class="kot-lbl">Date:</td><td class="kot-val">${dateLabel}</td></tr>
      <tr><td class="kot-lbl">Time:</td><td class="kot-val">${timeLabel}</td></tr>
      <tr><td class="kot-lbl">ETA:</td><td class="kot-val">${eta} min</td></tr>
    </table>
    <div class="kot-line"></div>
    <table class="kot-items">
      <thead>
        <tr>
          <th style="text-align:center;width:10%;">#</th>
          <th style="width:70%;">Item</th>
          <th style="text-align:center;width:20%;">Qty</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <div class="kot-dots"></div>
    <div class="kot-footer-row">Printed at ${timeLabel}</div>
    <div class="kot-source">Printed from: ${escapeHtml(window.location.origin || "Hotel POS")}</div>
  </div>`;
};

/** Shared receipt CSS (used by both the on-page overlay and the print iframe). */
const RECEIPT_CSS = `
  .kot-receipt {
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    font-weight: bold;
    color: #000;
    background: #fff;
    line-height: 1.45;
  }
  .kot-title-row {
    text-align: center;
    font-size: 15px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 2px;
  }
  .kot-sub-row {
    text-align: center;
    font-size: 9px;
    color: #333;
    margin-bottom: 4px;
  }
  .kot-line {
    border-top: 1.5px solid #000;
    margin: 4px 0;
  }
  .kot-info {
    width: 100%;
    border-collapse: collapse;
    margin: 2px 0;
  }
  .kot-info tr td {
    padding: 1px 0;
    font-size: 12px;
    font-weight: bold;
    vertical-align: top;
  }
  .kot-lbl { width: 35%; padding-right: 4px; }
  .kot-val { width: 65%; }
  .kot-items {
    width: 100%;
    border-collapse: collapse;
    margin-top: 2px;
  }
  .kot-items thead tr th {
    text-align: left;
    font-size: 11px;
    font-weight: bold;
    padding: 2px 2px;
    border-bottom: 1px solid #000;
  }
  .kot-items thead tr th:nth-child(3) { text-align: center; }
  .kot-items tbody tr td {
    padding: 3px 2px;
    border-bottom: 1px dashed #999;
    font-size: 11px;
    font-weight: bold;
    word-break: break-word;
    vertical-align: top;
  }
  .kot-items tbody tr td:nth-child(2) { width: 70%; }
  .kot-items tbody tr td:nth-child(3) { text-align: center; width: 20%; }
  .kot-dots { border-top: 1px dashed #999; margin: 4px 0; }
  .kot-footer-row { text-align: center; font-size: 10px; margin-top: 4px; }
  .kot-source {
    text-align: center;
    font-size: 8px;
    color: #555;
    margin-top: 4px;
    word-break: break-all;
  }
`;

/**
 * Build a fully standalone HTML document (own <html>/<head>/<body>) that
 * contains nothing but the receipt. This is what gets loaded into the
 * hidden print iframe, so the print dialog's preview only ever shows the
 * receipt — never a blank page.
 */
const buildPrintDocument = (kotInnerHtml, entityType, table) => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>KOT - ${escapeHtml(String(entityType || "Table"))} ${escapeHtml(String(table || ""))}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      @page { size: 80mm auto; margin: 0; }
      html, body { width: 80mm; background: #fff; }
      body { padding: 3mm; }
      ${RECEIPT_CSS}
    </style>
  </head>
  <body>${kotInnerHtml}</body>
</html>`;

/**
 * Print via a hidden iframe containing only the receipt document.
 * Safe to call repeatedly (reuses the same iframe).
 */
const printViaIframe = (kotInnerHtml, entityType, table) => {
  const iframeId = "kot-print-iframe";
  let iframe = document.getElementById(iframeId);
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = iframeId;
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(buildPrintDocument(kotInnerHtml, entityType, table));
  doc.close();

  const doPrint = () => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch {
      // ignore
    }
  };

  // Print once the iframe document has actually loaded; also fall back to
  // a short timeout in case `load` already fired before we attached it.
  iframe.onload = () => setTimeout(doPrint, 100);
  setTimeout(doPrint, 400);
};

/**
 * Show the KOT in a fullscreen overlay inside the current page (for visual
 * confirmation) and print it via the hidden iframe. A "Reprint" button is
 * always visible so the user can re-print on demand. The overlay closes
 * when the user clicks X or presses Escape.
 */
export const printKOT = (options = {}) => {
  const {
    table = "",
    waiter = "",
    entityType = "Table",
    items = [],
    prepTimeMinutes = 20,
    kotNo,
    orderNo,
    dateStr,
    timeStr,
  } = options;

  const overlayId = "kot-print-overlay";

  const existing = document.getElementById(overlayId);
  if (existing) existing.remove();

  const html = buildKOTHtml({ table, waiter, entityType, items, prepTimeMinutes, kotNo, orderNo, dateStr, timeStr });

  const overlay = document.createElement("div");
  overlay.id = overlayId;
  overlay.innerHTML = `
    <div class="kot-backdrop" id="kot-backdrop"></div>
    <div class="kot-sheet">
      <div class="kot-toolbar">
        <span class="kot-toolbar-title">Kitchen Order Ticket</span>
        <div class="kot-toolbar-actions">
          <button class="kot-btn kot-btn-print" id="kot-btn-print" title="Print (Ctrl+P)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 20 9"/><path d="M6 5H2v14h4"/><path d="M22 9h-4"/><path d="M6 19h4"/><path d="M18 13v7"/><path d="M6 13v7"/><path d="M18 5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v4h16V5z"/></svg>
            Print
          </button>
          <button class="kot-btn kot-btn-close" id="kot-btn-close" title="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
      <div class="kot-body">
        <div class="kot-receipt-wrap">
          ${html}
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  if (!document.getElementById("kot-print-styles")) {
    const styleEl = document.createElement("style");
    styleEl.id = "kot-print-styles";
    styleEl.textContent = `
      #${overlayId} {
        position: fixed;
        inset: 0;
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Courier New', Courier, monospace;
      }
      .kot-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(15, 23, 42, 0.75);
        backdrop-filter: blur(4px);
      }
      .kot-sheet {
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        max-height: 94vh;
        width: 380px;
        background: #fff;
        border-radius: 14px;
        box-shadow: 0 25px 60px rgba(0,0,0,0.45);
        overflow: hidden;
      }
      .kot-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 16px;
        background: #1e293b;
        color: #fff;
        gap: 12px;
      }
      .kot-toolbar-title {
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 0.03em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .kot-toolbar-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
      .kot-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 14px;
        border: none;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.15s;
        font-family: system-ui, -apple-system, sans-serif;
      }
      .kot-btn-print { background: #fff; color: #1e293b; }
      .kot-btn-print:hover { background: #e2e8f0; transform: translateY(-1px); }
      .kot-btn-close { background: rgba(255,255,255,0.12); color: #fff; padding: 6px 8px; }
      .kot-btn-close:hover { background: rgba(255,255,255,0.25); }
      .kot-body {
        overflow-y: auto;
        padding: 0;
        background: #f1f5f9;
        display: flex;
        justify-content: center;
      }
      .kot-receipt-wrap {
        width: 80mm;
        min-width: 80mm;
        max-width: 80mm;
        background: #fff;
        padding: 4mm 3mm;
        margin: 8mm 0;
        box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      }
      ${RECEIPT_CSS}
    `;
    document.head.appendChild(styleEl);
  }

  const closeBtn = overlay.querySelector("#kot-btn-close");
  const printBtn = overlay.querySelector("#kot-btn-print");
  const backdrop = overlay.querySelector("#kot-backdrop");

  const closeOverlay = () => {
    overlay.remove();
  };

  const triggerPrint = () => printViaIframe(html, entityType, table);

  closeBtn.addEventListener("click", closeOverlay);
  printBtn.addEventListener("click", triggerPrint);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) closeOverlay();
  });

  const onKey = (e) => {
    if (e.key === "Escape") {
      closeOverlay();
      document.removeEventListener("keydown", onKey);
    }
  };
  document.addEventListener("keydown", onKey);

  // Auto-print shortly after showing the overlay.
  setTimeout(triggerPrint, 600);

  return { close: closeOverlay };
};