import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API from "../../api";
import { restaurantService } from "../../services/restaurantService";
import {
  expandBookings,
  getRoomBookingForDate,
  getRoomBookingReference,
  mergeBookingsWithRooms,
  normalizeRooms,
  todayISO,
} from "../Dashboard/stayoverUtils";

const ACTIVE_INVOICE_KEY = "restaurant-active-invoice";
const SAVED_INVOICE_KEY = "restaurant-saved-invoice";
const PAYMENT_CARD_PAGE_SIZE = 8;
const normalizeInvoiceStatus = (value) => String(value || "").trim().toLowerCase();
const isPaidInvoice = (value) => normalizeInvoiceStatus(value) === "paid";
const getReusableBill = (bill) => (bill && !isPaidInvoice(bill.invoiceStatus) ? bill : null);
const formatVisitId = (tokenCode, tokenId) => tokenCode || (tokenId ? `VIS-${String(tokenId).padStart(6, "0")}` : "--");
const isIgnorablePostPaymentError = (error) => {
  const status = Number(error?.response?.status || 0);
  const message = String(error?.response?.data?.message || error?.message || "").toLowerCase();

  return (
    status === 404 &&
    (message.includes("no pending order found") ||
      message.includes("bill already paid") ||
      message.includes("not found"))
  );
};

const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
const formatDate = (value) => {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatReceiptDateOnly = (value) => {
  if (!value) return "--/--/----";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--/--/----";
  return parsed.toLocaleDateString("en-GB");
};

const formatReceiptTimeOnly = (value) => {
  if (!value) return "--:--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--:--";
  return parsed.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const formatReceiptAmount = (value) => Number(value || 0).toFixed(2);

const escapeReceiptHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildReceiptInvoiceNo = (invoice) => {
  const billId = Number(invoice?.billId || 0);
  if (billId > 0) return String(billId).padStart(4, "0");
  const tokenId = Number(invoice?.tokenId || 0);
  if (tokenId > 0) return `TMP-${String(tokenId).padStart(4, "0")}`;
  return "----";
};

const buildReceiptHtml = ({
  invoice,
  entityType,
  customerName,
  phone,
  paymentMethod,
  cardDetails,
  personCount,
  discountAmount,
  perPersonAmount,
  computedTotal,
}) => {
  const printedAt = invoice?.paidAt || invoice?.printedAt || invoice?.date || new Date().toISOString();
  const sgstAmount = Number(invoice?.gst || 0) / 2;
  const cgstAmount = Number(invoice?.gst || 0) / 2;
  const grandTotal = Number(computedTotal || 0);
  const netTotal = Math.round(grandTotal);
  const roundUp = Number((netTotal - grandTotal).toFixed(2));
  const userName = localStorage.getItem("name") || localStorage.getItem("username") || "POS User";
  const entityLabel = String(entityType || invoice?.entityType || "Table").toLowerCase() === "room" ? "Room No" : "Table No";
  const kotNos = invoice?.tokenId ? String(invoice.tokenId) : formatVisitId(invoice?.tokenCode, invoice?.tokenId);
  const itemRows = (Array.isArray(invoice?.items) ? invoice.items : [])
    .map((item) => {
      const qty = Number(item?.qty || 0);
      const rate = Number(item?.rate || 0);
      return `
        <tr>
          <td class="item-name">${escapeReceiptHtml(item?.name || "Menu Item")}</td>
          <td class="center">${formatReceiptAmount(qty)}</td>
          <td class="right">${formatReceiptAmount(rate)}</td>
          <td class="right">${formatReceiptAmount(qty * rate)}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <html>
      <head>
        <title>Restaurant Invoice</title>
        <style>
          @page { size: 80mm auto; margin: 6mm; }
          * { box-sizing: border-box; }
          body {
            margin: 0 auto;
            width: 72mm;
            color: #111827;
            font-family: "Courier New", monospace;
            font-size: 11px;
            line-height: 1.35;
          }
          .center { text-align: center; }
          .right { text-align: right; }
          .separator {
            border-top: 1px dashed #6b7280;
            margin: 7px 0;
          }
          .brand {
            padding-top: 4px;
          }
          .brand h1 {
            margin: 0;
            font-size: 18px;
            letter-spacing: 0.04em;
          }
          .muted {
            color: #4b5563;
          }
          .title {
            font-size: 17px;
            font-weight: 700;
            letter-spacing: 0.06em;
          }
          .meta-row,
          .summary-row {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            margin: 2px 0;
          }
          .meta-row span:first-child,
          .summary-row span:first-child {
            flex: 1 1 auto;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            padding: 3px 0;
            vertical-align: top;
          }
          th {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            border-bottom: 1px dashed #9ca3af;
          }
          .item-name {
            width: 48%;
            padding-right: 6px;
          }
          .center { text-align: center; }
          .right { text-align: right; }
          .totals {
            margin-top: 4px;
          }
          .grand {
            font-weight: 700;
            font-size: 13px;
          }
          .net {
            font-weight: 700;
            font-size: 17px;
          }
          .footer {
            margin-top: 8px;
          }
          .footer-note {
            font-size: 10px;
            color: #374151;
          }
        </style>
      </head>
      <body>
        <div class="brand center">
          <h1>MAA BAGLAMUKHI RESORT</h1>
          <div class="muted">Restaurant & POS Billing</div>
          <div class="muted">Thermal receipt invoice</div>
        </div>

        <div class="separator"></div>
        <div class="center title">DUPLICATE INVOICE</div>
        <div class="separator"></div>

        <div class="meta-row">
          <span>Invoice No: ${escapeReceiptHtml(buildReceiptInvoiceNo(invoice))}</span>
          <span>Date: ${escapeReceiptHtml(formatReceiptDateOnly(printedAt))}</span>
        </div>
        <div class="meta-row">
          <span>${escapeReceiptHtml(entityLabel)}: ${escapeReceiptHtml(invoice?.table || "--")}</span>
          <span>Time: ${escapeReceiptHtml(formatReceiptTimeOnly(printedAt))}</span>
        </div>
        <div class="meta-row">
          <span>Captain: ${escapeReceiptHtml(invoice?.waiterName || "Reception")}</span>
          <span>KOT Nos: ${escapeReceiptHtml(kotNos || "--")}</span>
        </div>
        <div class="meta-row">
          <span>Customer: ${escapeReceiptHtml(customerName || invoice?.customerName || "Walk-in Customer")}</span>
          <span>Phone: ${escapeReceiptHtml(phone || invoice?.phone || "--")}</span>
        </div>

        <div class="separator"></div>

        <table>
          <thead>
            <tr>
              <th class="item-name">Item Name</th>
              <th class="center">Qty</th>
              <th class="right">Rate</th>
              <th class="right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows || `<tr><td colspan="4" class="center muted">No items found</td></tr>`}
          </tbody>
        </table>

        <div class="separator"></div>

        <div class="totals">
          <div class="summary-row"><span>Food Total</span><span>${formatReceiptAmount(invoice?.subtotal)}</span></div>
          <div class="summary-row"><span>SGST @ 2.50%</span><span>${formatReceiptAmount(sgstAmount)}</span></div>
          <div class="summary-row"><span>CGST @ 2.50%</span><span>${formatReceiptAmount(cgstAmount)}</span></div>
          ${
            Number(discountAmount || 0) > 0
              ? `<div class="summary-row"><span>Discount</span><span>- ${formatReceiptAmount(discountAmount)}</span></div>`
              : ""
          }
          <div class="summary-row grand"><span>Grand Total</span><span>${formatReceiptAmount(grandTotal)}</span></div>
          <div class="summary-row"><span>Round Up</span><span>${formatReceiptAmount(roundUp)}</span></div>
          <div class="summary-row net"><span>Net Total</span><span>${formatReceiptAmount(netTotal)}</span></div>
        </div>

        <div class="separator"></div>

        <div class="meta-row">
          <span>User: ${escapeReceiptHtml(userName)}</span>
          <span>Payment: ${escapeReceiptHtml(paymentMethod || "Cash")}</span>
        </div>
        <div class="meta-row">
          <span>Guests: ${escapeReceiptHtml(personCount)}</span>
          <span>Per Person: ${formatReceiptAmount(perPersonAmount)}</span>
        </div>
        ${
          paymentMethod === "Card"
            ? `
              <div class="meta-row">
                <span>Card: ${escapeReceiptHtml(cardDetails?.cardType || "--")}</span>
                <span>Last4: ${escapeReceiptHtml(cardDetails?.cardLast4 || "--")}</span>
              </div>
              <div class="meta-row">
                <span>Txn Ref: ${escapeReceiptHtml(cardDetails?.transactionRef || "--")}</span>
                <span>Holder: ${escapeReceiptHtml(cardDetails?.cardHolderName || "--")}</span>
              </div>
            `
            : ""
        }

        <div class="footer center">
          <div class="footer-note">Thank you. Visit again.</div>
          <div class="footer-note">Powered by Maa Baglamukhi Resort POS</div>
        </div>
      </body>
    </html>
  `;
};

const readStoredInvoice = () => {
  const sources = [ACTIVE_INVOICE_KEY, SAVED_INVOICE_KEY];
  for (const key of sources) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed?.table && Array.isArray(parsed?.items) && !isPaidInvoice(parsed?.invoiceStatus)) {
        return parsed;
      }
    } catch {}
  }
  return null;
};

const clearPersistedInvoice = () => {
  localStorage.removeItem(ACTIVE_INVOICE_KEY);
  localStorage.removeItem(SAVED_INVOICE_KEY);
};

const persistInvoice = (invoice) => {
  if (!invoice) return;
  if (isPaidInvoice(invoice.invoiceStatus)) {
    clearPersistedInvoice();
    return;
  }
  localStorage.setItem(ACTIVE_INVOICE_KEY, JSON.stringify(invoice));
  localStorage.setItem(SAVED_INVOICE_KEY, JSON.stringify(invoice));
};

const sanitizeGeneratedInvoice = (invoice, billResponse) => ({
  ...invoice,
  billId: billResponse?.id || billResponse?.bill?.id || invoice?.billId || null,
  invoiceStatus: billResponse?.bill?.invoiceStatus || "Generated",
  paymentMethod: billResponse?.bill?.paymentMethod || invoice?.paymentMethod || null,
});

const sanitizeCustomerName = (value) =>
  String(value || "")
    .replace(/[^A-Za-z\s]/g, "")
    .replace(/\s{2,}/g, " ")
    .slice(0, 60);

const sanitizePhoneNumber = (value) => String(value || "").replace(/\D/g, "").slice(0, 10);

const getCustomerFieldErrors = ({ customerName, phone }) => {
  const trimmedName = String(customerName || "").trim();
  const normalizedPhone = sanitizePhoneNumber(phone);
  const errors = {};

  if (!trimmedName) {
    errors.customerName = "Customer name required.";
  } else if (!/^[A-Za-z]+(?:\s+[A-Za-z]+)*$/.test(trimmedName)) {
    errors.customerName = "Name me sirf letters aur spaces allow hain.";
  }

  if (!normalizedPhone) {
    errors.phone = "Phone number required.";
  } else if (!/^\d{10}$/.test(normalizedPhone)) {
    errors.phone = "Phone number exactly 10 digits hona chahiye.";
  }

  return errors;
};

const createInvoiceKey = (invoice) => {
  if (!invoice) return "invoice:unknown";
  if (invoice.billId) return `bill:${invoice.billId}`;
  return `${String(invoice.entityType || "Table").toLowerCase()}:${invoice.table || "unknown"}`;
};

const createSessionKey = (entityType, table, tokenId) =>
  tokenId
    ? `${String(entityType || "Table").toLowerCase()}:token:${Number(tokenId)}`
    : `${String(entityType || "Table").toLowerCase()}:table:${String(table || "unknown").trim()}`;

const createBoardCardKey = (invoice) =>
  createSessionKey(invoice?.entityType, invoice?.table, invoice?.tokenId);

const toBillInvoice = (bill) => ({
  table: bill.tableNumber,
  tokenId: bill.tokenId || null,
  tokenCode: bill.tokenCode || null,
  waiterName: bill.waiter_name || "Waiter",
  items: [],
  subtotal: Number(bill.subtotal || 0),
  gst: Number(bill.gst || 0),
  total: Number(bill.total || 0),
  discountAmount: Number(bill.discountAmount || 0),
  date: bill.created_at || new Date().toISOString(),
  entityType: bill.entityType || "Table",
  billId: bill.id,
  invoiceStatus: bill.invoiceStatus || "Generated",
  customerName: bill.customerName || "",
  phone: bill.phone || "",
  paymentMethod: bill.paymentMethod || "Cash",
  personCount: Math.max(1, Number(bill.split_count || 1)),
  splitCount: Math.max(1, Number(bill.split_count || 1)),
});

const mapTokenItemsToInvoiceItems = (items) =>
  (Array.isArray(items) ? items : []).map((item) => ({
    id: item.id,
    name: item.item_name || item.name || "Menu Item",
    qty: Number(item.qty || item.quantity || 0),
    rate: Number(item.rate || item.price || 0),
  }));

const getCustomerDisplay = (invoice) => ({
  name: String(invoice?.customerName || "").trim() || "Walk-in Customer",
  phone: String(invoice?.phone || "").trim() || "--",
});

const loadPaymentBoard = async () => {
  const [tables, bills, roomRows, bookingRows] = await Promise.all([
    restaurantService.getTables().catch(() => []),
    API.get("/restaurant/bills").then((response) => response.data).catch(() => []),
    API.get("/housekeeping").then((response) => response.data).catch(() => []),
    API.get("/hotel/all-bookings").then((response) => response.data).catch(() => []),
  ]);
  const normalizedBills = Array.isArray(bills) ? [...bills] : [];
  normalizedBills.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));

  const latestBillByTable = new Map();
  normalizedBills.forEach((bill) => {
    const key = createBoardCardKey({
      entityType: bill.entityType || "Table",
      table: bill.tableNumber,
      tokenId: bill.tokenId || null,
    });
    if (!latestBillByTable.has(key)) {
      latestBillByTable.set(key, bill);
    }
  });

  const liveInvoices = await Promise.all(
    (Array.isArray(tables) ? tables : []).map(async (table) => {
      try {
        const tableName = String(table.number || table.name || "").trim();
        if (!tableName) return null;

        const tokenRes = await API.get(`/token/table/${tableName}`);
        const tokenId = tokenRes.data?.id || null;
        if (!tokenId) return null;

        const itemsRes = await API.get(`/token/items/${tokenId}`);
        const tokenItems = Array.isArray(itemsRes.data) ? itemsRes.data : [];
        if (!tokenItems.length) return null;

        const subtotal = tokenItems.reduce(
          (sum, item) => sum + Number(item.qty || 0) * Number(item.rate || 0),
          0,
        );
        const gst = subtotal * 0.05;

        const relatedBill = getReusableBill(
          latestBillByTable.get(
          createBoardCardKey({
            entityType: "Table",
            table: tableName,
          }),
          ),
        );

        return {
          table: tableName,
          tokenId,
          tokenCode: tokenRes.data?.token_code || tokenRes.data?.tokenCode || null,
          waiterName: tokenRes.data?.waiter || "Waiter",
          items: tokenItems.map((item) => ({
            id: item.id,
            name: item.item_name,
            qty: Number(item.qty || 0),
            rate: Number(item.rate || 0),
          })),
          subtotal,
          gst,
          total: subtotal + gst,
          discountAmount: Number(relatedBill?.discountAmount || 0),
          date: new Date().toISOString(),
          entityType: "Table",
          billId: relatedBill?.id || null,
          invoiceStatus: relatedBill?.invoiceStatus || null,
          customerName: relatedBill?.customerName || "",
          phone: relatedBill?.phone || "",
          paymentMethod: relatedBill?.paymentMethod || "Cash",
          personCount: Math.max(1, Number(relatedBill?.split_count || 1)),
          splitCount: Math.max(1, Number(relatedBill?.split_count || 1)),
        };
      } catch {
        return null;
      }
    }),
  );

  const normalizedRooms = normalizeRooms(roomRows);
  const mergedBookings = mergeBookingsWithRooms(expandBookings(bookingRows), normalizedRooms);
  const roomToday = todayISO();

  const liveRoomInvoices = await Promise.all(
    normalizedRooms.map(async (room) => {
      try {
        const roomRef = String(room.roomNo || room.roomNumber || "").trim();
        if (!roomRef) return null;

        const activeBooking =
          getRoomBookingForDate(roomRef, roomToday, mergedBookings, false) ||
          getRoomBookingReference(roomRef, roomToday, mergedBookings);
        const roomStatus = String(room.status || room.hotelStatus || "").toLowerCase();
        if (!activeBooking || roomStatus !== "occupied") return null;

        const tokenRes = await API.get(`/token/table/${roomRef}`);
        const tokenId = tokenRes.data?.id || null;
        if (!tokenId) return null;

        const itemsRes = await API.get(`/token/items/${tokenId}`);
        const tokenItems = Array.isArray(itemsRes.data) ? itemsRes.data : [];
        if (!tokenItems.length) return null;

        const subtotal = tokenItems.reduce(
          (sum, item) => sum + Number(item.qty || 0) * Number(item.rate || 0),
          0,
        );
        const gst = subtotal * 0.05;

        const relatedBill = getReusableBill(
          latestBillByTable.get(
          createBoardCardKey({
            entityType: "Room",
            table: roomRef,
          }),
          ),
        );

        return {
          table: roomRef,
          tokenId,
          tokenCode: tokenRes.data?.token_code || tokenRes.data?.tokenCode || null,
          waiterName: "Room Service",
          items: tokenItems.map((item) => ({
            id: item.id,
            name: item.item_name,
            qty: Number(item.qty || 0),
            rate: Number(item.rate || 0),
          })),
          subtotal,
          gst,
          total: subtotal + gst,
          discountAmount: Number(relatedBill?.discountAmount || 0),
          date: new Date().toISOString(),
          entityType: "Room",
          billId: relatedBill?.id || null,
          invoiceStatus: relatedBill?.invoiceStatus || null,
          customerName: relatedBill?.customerName || room.guest || activeBooking?.guestName || "",
          phone: relatedBill?.phone || activeBooking?.mobile || "",
          paymentMethod: relatedBill?.paymentMethod || "Cash",
          personCount: Math.max(1, Number(relatedBill?.split_count || 1)),
          splitCount: Math.max(1, Number(relatedBill?.split_count || 1)),
          bookingId: activeBooking?.bookingId || null,
          bookingCode: activeBooking?.bookingCode || "",
        };
      } catch {
        return null;
      }
    }),
  );

  const boardMap = new Map();
  liveInvoices.filter(Boolean).forEach((invoice) => {
    boardMap.set(createBoardCardKey(invoice), { ...invoice, sourceType: "live" });
  });
  liveRoomInvoices.filter(Boolean).forEach((invoice) => {
    boardMap.set(createBoardCardKey(invoice), { ...invoice, sourceType: "live" });
  });

  normalizedBills.forEach((bill) => {
    const invoice = { ...toBillInvoice(bill), sourceType: "bill" };
    const cardKey = createBoardCardKey(invoice);
    if (!boardMap.has(cardKey)) {
      boardMap.set(cardKey, invoice);
    }
  });

  return Array.from(boardMap.values()).sort((a, b) => {
    const aTime = new Date(a.date || 0).getTime();
    const bTime = new Date(b.date || 0).getTime();
    return bTime - aTime;
  });
};

const Payment = ({
  invoice: externalInvoice = null,
  onClose = null,
  onSuccess = null,
  asModal = false,
  showCardList = !asModal,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const routeInvoice = location.state || null;

  const [submitting, setSubmitting] = useState(false);
  const [selectedItemIndex] = useState(0);
  const [invoice, setInvoice] = useState(() => externalInvoice || routeInvoice || readStoredInvoice());
  const [invoiceCards, setInvoiceCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [invoiceCardPage, setInvoiceCardPage] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [cardDetails, setCardDetails] = useState({
    cardHolderName: "",
    cardLast4: "",
    cardType: "Credit Card",
    transactionRef: "",
  });
  const [splitCount, setSplitCount] = useState(1);
  const [generatedBill, setGeneratedBill] = useState(null);
  const [isAutoSavingBill, setIsAutoSavingBill] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    const nextInvoice = externalInvoice || routeInvoice || readStoredInvoice();
    setInvoice(nextInvoice || null);
  }, [externalInvoice, routeInvoice]);

  useEffect(() => {
    if (asModal || !showCardList) return undefined;

    let active = true;
    const refreshCards = async () => {
      try {
        setLoadingCards(true);
        const rows = await loadPaymentBoard();
        if (!active) return;
        setInvoiceCards(rows);
        setInvoice((current) => {
          if (current) {
            const matched = rows.find((row) => createBoardCardKey(row) === createBoardCardKey(current));
            return matched || current;
          }
          return rows[0] || readStoredInvoice() || null;
        });
      } catch {
        if (active) setInvoiceCards([]);
      } finally {
        if (active) setLoadingCards(false);
      }
    };

    refreshCards();
    window.addEventListener("tokenUpdated", refreshCards);
    return () => {
      active = false;
      window.removeEventListener("tokenUpdated", refreshCards);
    };
  }, [asModal, showCardList]);

  useEffect(() => {
    if (!invoice) return;
    setCustomerName(invoice.customerName || "");
    setPhone(invoice.phone || "");
    setPaymentMethod(invoice.paymentMethod || "Cash");
    setDiscountAmount(Number(invoice.discountAmount || 0));
    setSplitCount(Math.max(1, Number(invoice.splitCount || invoice.personCount || 1)));
    setCardDetails({
      cardHolderName: invoice.cardDetails?.cardHolderName || "",
      cardLast4: invoice.cardDetails?.cardLast4 || "",
      cardType: invoice.cardDetails?.cardType || "Credit Card",
      transactionRef: invoice.cardDetails?.transactionRef || "",
    });
    setGeneratedBill(
      invoice.billId
        ? {
            id: invoice.billId,
            invoiceStatus: invoice.invoiceStatus || "Generated",
          }
        : null,
    );
    persistInvoice(invoice);
    setFieldErrors(getCustomerFieldErrors({
      customerName: invoice.customerName || "",
      phone: invoice.phone || "",
    }));
  }, [invoice]);

  const totalInvoiceCardPages = Math.max(
    1,
    Math.ceil(invoiceCards.length / PAYMENT_CARD_PAGE_SIZE),
  );
  const paginatedInvoiceCards = invoiceCards.slice(
    (invoiceCardPage - 1) * PAYMENT_CARD_PAGE_SIZE,
    invoiceCardPage * PAYMENT_CARD_PAGE_SIZE,
  );

  useEffect(() => {
    setInvoiceCardPage(1);
  }, [invoiceCards]);

  useEffect(() => {
    if (invoiceCardPage > totalInvoiceCardPages) {
      setInvoiceCardPage(totalInvoiceCardPages);
    }
  }, [invoiceCardPage, totalInvoiceCardPages]);

  useEffect(() => {
    if (!invoice?.tokenId || Array.isArray(invoice?.items) && invoice.items.length) return undefined;

    let active = true;
    const hydrateInvoiceItems = async () => {
      try {
        const response = await API.get(`/token/items/${invoice.tokenId}`);
        if (!active) return;
        const nextItems = mapTokenItemsToInvoiceItems(response.data);
        if (!nextItems.length) return;

        setInvoice((current) => {
          if (!current || Number(current.tokenId || 0) !== Number(invoice.tokenId || 0)) {
            return current;
          }
          const nextInvoice = { ...current, items: nextItems };
          persistInvoice(nextInvoice);
          return nextInvoice;
        });

        if (!asModal) {
          setInvoiceCards((current) =>
            current.map((card) =>
              createBoardCardKey(card) === createBoardCardKey(invoice)
                ? { ...card, items: nextItems }
                : card,
            ),
          );
        }
      } catch {
        // Keep the screen usable even if token items can no longer be read.
      }
    };

    hydrateInvoiceItems();
    return () => {
      active = false;
    };
  }, [asModal, invoice]);

  useEffect(() => {
    if (!invoice || invoice.billId || !invoice.tokenId || isAutoSavingBill) return;

    let active = true;
    const autoSaveInvoiceBill = async () => {
      try {
        setIsAutoSavingBill(true);
        const response = await restaurantService.createBill({
          billId: null,
          table: invoice.table,
          tokenId: invoice.tokenId,
          waiterName: invoice.waiterName || null,
          customerName: invoice.customerName || "",
          phone: invoice.phone || "",
          subtotal: Number(invoice.subtotal || 0),
          gst: Number(invoice.gst || 0),
          total: Number(invoice.total || 0),
          discountAmount: Number(invoice.discountAmount || 0),
          splitCount: Number(invoice.splitCount || invoice.personCount || 1),
          paymentMethod: null,
          entityType: invoice.entityType || "Table",
          invoiceStatus: "Generated",
        });
        if (!active) return;
        const nextInvoice = sanitizeGeneratedInvoice(invoice, response);
        setGeneratedBill({
          id: nextInvoice.billId,
          invoiceStatus: nextInvoice.invoiceStatus || "Generated",
        });
        setInvoice((current) => (current ? { ...current, ...nextInvoice } : current));
        window.dispatchEvent(new Event("tokenUpdated"));
      } catch {
        // Keep the screen usable even if autosave fails; pay flow can still create a paid bill.
      } finally {
        if (active) setIsAutoSavingBill(false);
      }
    };

    autoSaveInvoiceBill();
    return () => {
      active = false;
    };
  }, [invoice, isAutoSavingBill]);

  const entityType = invoice?.entityType || invoice?.type || "Table";

  const selectedItem = useMemo(() => {
    if (!invoice?.items?.length) return null;
    return invoice.items[selectedItemIndex] || invoice.items[0];
  }, [invoice, selectedItemIndex]);

  const splitPreview = useMemo(() => {
    const count = Math.max(1, Number(splitCount || 1));
    const evenSubtotal = Number(invoice?.subtotal || 0) / count;
    const evenTax = Number(invoice?.gst || 0) / count;
    const evenTotal = Math.max(0, Number(invoice?.subtotal || 0) + Number(invoice?.gst || 0) - Number(discountAmount || 0)) / count;

    return Array.from({ length: count }, (_, index) => ({
      splitLabel: `Split ${index + 1}`,
      splitNo: index + 1,
      splitCount: count,
      subtotal: evenSubtotal,
      gst: evenTax,
      total: evenTotal,
    }));
  }, [discountAmount, invoice, splitCount]);

  const computedTotal = useMemo(
    () => Math.max(0, Number(invoice?.subtotal || 0) + Number(invoice?.gst || 0) - Number(discountAmount || 0)),
    [discountAmount, invoice],
  );

  const personCount = useMemo(
    () => Math.max(1, Number(splitCount || invoice?.splitCount || invoice?.personCount || 1)),
    [invoice, splitCount],
  );

  const perPersonAmount = useMemo(
    () => computedTotal / personCount,
    [computedTotal, personCount],
  );

  const isCurrentBillPaid = isPaidInvoice(
    generatedBill?.invoiceStatus || invoice?.invoiceStatus,
  );

  const saveInvoiceState = (patch = {}) => {
    setInvoice((current) => {
      if (!current) return current;
      const next = { ...current, ...patch };
      persistInvoice(next);
      return next;
    });
    if (!asModal) {
      setInvoiceCards((current) =>
        current.map((card) =>
          invoice && createBoardCardKey(card) === createBoardCardKey(invoice) ? { ...card, ...patch } : card,
        ),
      );
    }
  };

  const handleCustomerNameChange = (value) => {
    const sanitizedValue = sanitizeCustomerName(value);
    setCustomerName(sanitizedValue);
    setFieldErrors(getCustomerFieldErrors({ customerName: sanitizedValue, phone }));
    saveInvoiceState({ customerName: sanitizedValue });
  };

  const handlePhoneChange = (value) => {
    const sanitizedValue = sanitizePhoneNumber(value);
    setPhone(sanitizedValue);
    setFieldErrors(getCustomerFieldErrors({ customerName, phone: sanitizedValue }));
    saveInvoiceState({ phone: sanitizedValue });
  };

  const handleDiscountChange = (value) => {
    const normalized = Math.max(0, Number(value || 0));
    setDiscountAmount(normalized);
    saveInvoiceState({
      discountAmount: normalized,
      total: Math.max(0, Number(invoice?.subtotal || 0) + Number(invoice?.gst || 0) - normalized),
      personCount,
      splitCount: personCount,
    });
  };

  const handleSplitCountChange = (value) => {
    const normalized = Math.max(1, Number(value || 1));
    setSplitCount(normalized);
    saveInvoiceState({ personCount: normalized, splitCount: normalized });
  };

  const handlePaymentMethodChange = (value) => {
    setPaymentMethod(value);
    saveInvoiceState({ paymentMethod: value });
  };

  const updateCardDetails = (patch) => {
    setCardDetails((current) => {
      const next = { ...current, ...patch };
      saveInvoiceState({ cardDetails: next });
      return next;
    });
  };

  const handleClose = () => {
    if (typeof onClose === "function") {
      onClose();
      return;
    }
    navigate("/restaurant");
  };

  const buildBillPayload = () => ({
    billId: generatedBill?.id || invoice?.billId || null,
    table: invoice?.table,
    tokenId: invoice?.tokenId || null,
    waiterName: invoice?.waiterName || null,
    customerName: customerName || invoice?.customerName || "",
    phone: phone || invoice?.phone || "",
    cardDetails: paymentMethod === "Card" ? cardDetails : null,
    subtotal: Number(invoice?.subtotal || 0),
    gst: Number(invoice?.gst || 0),
    total: computedTotal,
    discountAmount: Number(discountAmount || 0),
    splitCount: personCount,
    paymentMethod,
    entityType,
  });

  const validatePaymentDetails = () => {
    const nextFieldErrors = getCustomerFieldErrors({ customerName, phone });
    if (Object.keys(nextFieldErrors).length) {
      setFieldErrors(nextFieldErrors);
      return false;
    }

    if (paymentMethod !== "Card") return true;

    if (!String(cardDetails.cardHolderName || "").trim()) {
      alert("Card holder name required.");
      return false;
    }

    if (!/^\d{4}$/.test(String(cardDetails.cardLast4 || "").trim())) {
      alert("Card last 4 digits required.");
      return false;
    }

    if (!String(cardDetails.transactionRef || "").trim()) {
      alert("Card transaction reference required.");
      return false;
    }

    return true;
  };

  const handlePrint = (overrideInvoice = null) => {
    const invoiceToPrint = overrideInvoice || invoice;
    if (!invoiceToPrint) return;

    const printHTML = buildReceiptHtml({
      invoice: invoiceToPrint,
      entityType,
      customerName,
      phone,
      paymentMethod,
      cardDetails,
      personCount,
      discountAmount,
      perPersonAmount,
      computedTotal,
    });

    const win = window.open("", "", "width=420,height=760");
    if (!win) return;
    win.document.write(printHTML);
    win.document.close();
    win.focus();
    window.setTimeout(() => {
      win.print();
    }, 180);
  };

  const handlePayment = async () => {
    if (!invoice) return;
    if (!validatePaymentDetails()) return;

    try {
      setSubmitting(true);
      const paymentResponse = await restaurantService.payBill(buildBillPayload());
      const paidBill = {
        id: paymentResponse.billId || generatedBill?.id || invoice.billId || null,
        invoiceStatus: "Paid",
      };
      setGeneratedBill(paidBill);
      saveInvoiceState({
        customerName,
        phone,
        paymentMethod,
        discountAmount,
        personCount,
        splitCount: personCount,
        cardDetails: paymentMethod === "Card" ? cardDetails : null,
        billId: paidBill.id,
        invoiceStatus: "Paid",
        total: computedTotal,
      });

      if (typeof restaurantService.createConsumptionSale === "function") {
        await restaurantService.createConsumptionSale({
          referenceNo: `BILL-${paymentResponse.billId || invoice.tokenId || invoice.table}-${invoice.date || Date.now()}`,
          referenceType: "restaurant-bill",
          sourceBillId: paymentResponse.billId || null,
          entityType,
          entityRef: invoice.table,
          outlet: invoice.outlet || "Main Kitchen",
          branch: invoice.branch || "Main Branch",
          subtotal: Number(invoice.subtotal || 0),
          tax: Number(invoice.gst || 0),
          total: computedTotal,
          createdBy: "system",
          items: (invoice.items || []).map((item) => ({
            menuItemId: item.menuItemId || item.menu_item_id || null,
            name: item.name,
            category: item.category || "Other",
            quantity: Number(item.qty || 0),
            price: Number(item.rate || 0),
          })),
        });
      }

      const cleanupResults = await Promise.allSettled([
        API.put(`/restaurant/order/${invoice.table}/pay`),
        API.put(`/token/close/${invoice.table}`),
      ]);

      cleanupResults.forEach((result) => {
        if (result.status !== "rejected") return;
        if (isIgnorablePostPaymentError(result.reason)) return;
        console.warn("Post-payment cleanup failed", result.reason);
      });

      window.dispatchEvent(new Event("tokenUpdated"));
      if (typeof onSuccess === "function") onSuccess({ type: "paid", billId: paidBill.id });

      alert("Payment Successful!");
      handlePrint({
        ...invoice,
        customerName,
        phone,
        paymentMethod,
        discountAmount,
        billId: paidBill.id,
        invoiceStatus: "Paid",
        total: computedTotal,
        printedAt: new Date().toISOString(),
        paidAt: new Date().toISOString(),
      });
      if (asModal) {
        handleClose();
      }
    } catch (error) {
      alert(error.response?.data?.message || "Payment backend se save nahi ho paaya.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateBill = async () => {
    return undefined;
  };

  const handleCreateSplitBill = async () => {
    if (!invoice) return;

    try {
      setSubmitting(true);
      await Promise.all(
        splitPreview.map((split) =>
          restaurantService.createSplitBill({
            billId: generatedBill?.id || invoice.billId || null,
            tableNumber: invoice.table,
            entityType,
            splitLabel: split.splitLabel,
            splitNo: split.splitNo,
            splitCount: split.splitCount,
            subtotal: split.subtotal,
            gst: split.gst,
            total: split.total,
            paymentMethod,
            items: invoice.items || [],
          }),
        ),
      );
      alert("Split bill saved successfully.");
    } catch (error) {
      alert(error.response?.data?.message || "Split bill save nahi ho paaya.");
    } finally {
      setSubmitting(false);
    }
  };

  if (asModal && !invoice) {
    return (
      <div className={asModal ? "p-4" : "min-h-screen bg-slate-100 p-6"}>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
          No Invoice Data
        </div>
      </div>
    );
  }

  const shellClassName = asModal
    ? "w-full"
    : "min-h-screen bg-[linear-gradient(180deg,#1a243a_0%,#24324b_100%)] p-4 sm:p-6";

  const invoiceHeading = invoice
    ? `${entityType} ${invoice.table} | Visit ID ${formatVisitId(invoice.tokenCode, invoice.tokenId)} | Total ${formatCurrency(invoice.total)}`
    : "Select a payment card to continue.";
  const hasCustomerValidationErrors = Boolean(fieldErrors.customerName || fieldErrors.phone);

  return (
    <div className={shellClassName}>
      <div className={`${asModal ? "w-full max-w-[460px]" : "w-full space-y-6"}`}>
        {!asModal ? (
          <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_50%,#0f766e_100%)] px-6 py-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.25)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-200">Restaurant Payment</p>
                <h1 className="mt-2 text-4xl font-black">Row-wise bill review and payment card</h1>
                <p className="mt-2 text-lg text-white/80">{invoiceHeading}</p>
              </div>
              <div className="rounded-[22px] border border-white/15 bg-white/10 px-5 py-4 backdrop-blur">
                <div className="text-sm uppercase tracking-[0.18em] text-cyan-100/80">Token</div>
                <div className="mt-2 text-3xl font-black">{formatVisitId(invoice?.tokenCode, invoice?.tokenId)}</div>
              </div>
            </div>
          </section>
        ) : null}

        <section className={asModal || !showCardList ? "flex justify-center" : "grid gap-4 xl:grid-cols-[minmax(560px,0.98fr)_minmax(420px,0.88fr)] 2xl:grid-cols-[minmax(640px,1fr)_minmax(460px,0.84fr)]"}>
          {!asModal && showCardList ? (
            <div className="rounded-[24px] border border-slate-200/70 bg-white/95 p-4 shadow-[0_14px_36px_rgba(15,23,42,0.09)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-500">Payment Cards</p>
                  <h3 className="mt-1.5 text-2xl font-black text-slate-900">All restaurant payments in one page</h3>
                </div>
                <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
                  {invoiceCards.length} Cards
                </div>
              </div>

              {loadingCards ? (
                <div className="mt-6 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-8 text-base font-semibold text-slate-500">
                  Payment cards loading...
                </div>
              ) : invoiceCards.length ? (
                <div className="mt-4 overflow-hidden rounded-[20px] border border-slate-200">
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white text-left text-base">
                      <thead className="bg-slate-50 text-sm uppercase tracking-[0.16em] text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Table</th>
                          <th className="px-4 py-3">Customer</th>
                          <th className="px-4 py-3">Visit ID</th>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Total</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedInvoiceCards.map((card) => {
                          const active =
                            invoice &&
                            createBoardCardKey(card) === createBoardCardKey(invoice);
                          const isPaid = String(card.invoiceStatus || "").toLowerCase() === "paid";
                          const status = isPaid ? "Paid" : "Pending";
                          const customer = getCustomerDisplay(card);

                          return (
                            <tr
                              key={createBoardCardKey(card)}
                              className={`border-t border-slate-200 ${
                                active ? "bg-cyan-50" : "bg-white"
                              }`}
                            >
                              <td className="px-4 py-4 font-bold text-slate-900">
                                {String(card.entityType || "Table").toLowerCase() === "room"
                                  ? "Room"
                                  : "Table"}{" "}
                                {card.table}
                              </td>
                              <td className="px-4 py-4">
                                <div className="font-semibold text-slate-900">{customer.name}</div>
                                <div className="mt-1 text-sm text-slate-500">{customer.phone}</div>
                              </td>
                              <td className="px-4 py-4 text-slate-600">
                                {formatVisitId(card.tokenCode, card.tokenId)}
                              </td>
                              <td className="px-4 py-4 text-slate-600">
                                {formatDate(card.date)}
                              </td>
                              <td className="px-4 py-4 font-bold text-emerald-600">
                                {formatCurrency(card.total)}
                              </td>
                              <td className="px-4 py-4">
                                <span className={`rounded-full px-3 py-1.5 text-sm font-bold ${isPaid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                                  {status}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => setInvoice(card)}
                                  className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                                    active
                                      ? "bg-cyan-600 text-white"
                                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                  }`}
                                >
                                  {active ? "Selected" : "Open"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {invoiceCards.length > PAYMENT_CARD_PAGE_SIZE ? (
                    <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-base text-slate-500">
                        Showing{" "}
                        <span className="font-semibold text-slate-900">
                          {(invoiceCardPage - 1) * PAYMENT_CARD_PAGE_SIZE + 1}
                        </span>{" "}
                        to{" "}
                        <span className="font-semibold text-slate-900">
                          {Math.min(invoiceCardPage * PAYMENT_CARD_PAGE_SIZE, invoiceCards.length)}
                        </span>{" "}
                        of <span className="font-semibold text-slate-900">{invoiceCards.length}</span> payments
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setInvoiceCardPage((current) => Math.max(1, current - 1))}
                          disabled={invoiceCardPage === 1}
                          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Previous
                        </button>

                        {Array.from({ length: totalInvoiceCardPages }, (_, index) => index + 1).map((pageNumber) => (
                          <button
                            key={pageNumber}
                            type="button"
                            onClick={() => setInvoiceCardPage(pageNumber)}
                            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                              pageNumber === invoiceCardPage
                                ? "bg-slate-900 text-white"
                                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {pageNumber}
                          </button>
                        ))}

                        <button
                          type="button"
                          onClick={() => setInvoiceCardPage((current) => Math.min(totalInvoiceCardPages, current + 1))}
                          disabled={invoiceCardPage === totalInvoiceCardPages}
                          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-6 rounded-[20px] border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-base text-slate-500">
               “No payment card found yet. Create an invoice and the card will appear here.”
                </div>
              )}
            </div>
          ) : null}

          <div className={`w-full ${asModal ? "max-w-[420px]" : ""}`}>
            {!invoice ? (
              <div className="w-full max-w-[420px] rounded-[28px] border border-slate-200/70 bg-white/95 p-6 text-base text-slate-500 shadow-[0_18px_50px_rgba(15,23,42,0.1)]">
                “Select a payment card. The full payment form for the selected invoice will open here.”
              </div>
            ) : (
            <div className="rounded-[24px] border border-slate-200/70 bg-white/95 p-4 shadow-[0_14px_36px_rgba(15,23,42,0.09)]">
              <div className="flex items-center justify-between gap-3 text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
                <span>{asModal ? "Invoice Popup" : "Secure Payment"}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">Restaurant POS</span>
              </div>

            <div className="mt-3 text-center">
                <div className="text-2xl font-black text-slate-900">Payment</div>
                <div className="mt-1 text-base font-semibold text-slate-500">{entityType}</div>
                <div className="text-xl font-bold text-slate-900">{invoice.table}</div>
                <div className="mt-2 text-4xl font-black text-emerald-600">{formatCurrency(computedTotal)}</div>
                <div className="mt-1 text-sm text-slate-500">
                  Subtotal {formatCurrency(invoice.subtotal)} | Tax {formatCurrency(invoice.gst)}
                </div>
                <div className="mt-1.5 text-sm font-semibold text-slate-600">
                  {personCount} Person{personCount > 1 ? "s" : ""} | Per Person {formatCurrency(perPersonAmount)}
                </div>
              </div>

              <div className="mt-4 rounded-[20px] border border-slate-200 bg-[linear-gradient(135deg,#f8fbff_0%,#ffffff_100%)] p-3.5">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">Selected Row Card</div>
                {selectedItem ? (
                  <div className="mt-3 space-y-3">
                    <div className="rounded-[16px] bg-white px-3.5 py-3.5 shadow-sm">
                      <div className="text-xl font-black text-slate-900">{selectedItem.name}</div>
                      <div className="mt-2 grid gap-2 sm:grid-cols-3">
                        <div className="rounded-[14px] bg-slate-50 px-3 py-2.5">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Qty</div>
                          <div className="mt-1 text-base font-black text-slate-900">{selectedItem.qty}</div>
                        </div>
                        <div className="rounded-[14px] bg-slate-50 px-3 py-2.5">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Rate</div>
                          <div className="mt-1 text-base font-black text-slate-900">{formatCurrency(selectedItem.rate)}</div>
                        </div>
                        <div className="rounded-[14px] bg-slate-50 px-3 py-2.5">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Amount</div>
                          <div className="mt-1 text-base font-black text-slate-900">
                            {formatCurrency(Number(selectedItem.qty || 0) * Number(selectedItem.rate || 0))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[16px] bg-white px-3.5 py-3.5 shadow-sm">
                      <div className="space-y-2 text-base text-slate-700">
                        <div className="flex justify-between">
                          <span>Subtotal</span>
                          <span>{formatCurrency(invoice.subtotal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tax</span>
                          <span>{formatCurrency(invoice.gst)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Discount</span>
                          <span>{formatCurrency(discountAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Per Person</span>
                          <span>{formatCurrency(perPersonAmount)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-black text-slate-900">
                          <span>Total</span>
                          <span>{formatCurrency(computedTotal)}</span>
                        </div>
                        {invoice.tokenId ? (
                          <div className="text-sm text-slate-500">Visit ID: {formatVisitId(invoice.tokenCode, invoice.tokenId)}</div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-[18px] bg-white px-4 py-5 text-base text-slate-500 shadow-sm">
                    Koi row select nahi hai.
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-[20px] border border-slate-200 bg-white p-3.5">
                <div className="text-lg font-semibold text-slate-700">Customer Details</div>
                <div className="mt-3 space-y-2.5">
                  <input
                    type="text"
                    value={customerName}
                    onChange={(event) => handleCustomerNameChange(event.target.value)}
                    placeholder="Customer Name"
                    className={`w-full rounded-xl border px-3 py-3 text-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                      fieldErrors.customerName
                        ? "border-rose-400 bg-rose-50 focus:ring-rose-400"
                        : "border-slate-200 focus:ring-blue-500"
                    }`}
                  />
                  {fieldErrors.customerName ? (
                    <div className="text-base font-semibold text-rose-600">{fieldErrors.customerName}</div>
                  ) : null}
                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) => handlePhoneChange(event.target.value)}
                    placeholder="Phone Number"
                    inputMode="numeric"
                    maxLength="10"
                    className={`w-full rounded-xl border px-3 py-3 text-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                      fieldErrors.phone
                        ? "border-rose-400 bg-rose-50 focus:ring-rose-400"
                        : "border-slate-200 focus:ring-blue-500"
                    }`}
                  />
                  {fieldErrors.phone ? (
                    <div className="text-base font-semibold text-rose-600">{fieldErrors.phone}</div>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 rounded-[20px] border border-slate-200 bg-white p-3.5">
                <div className="text-lg font-semibold text-slate-700">Payment Method</div>
                <select
                  value={paymentMethod}
                  onChange={(event) => handlePaymentMethodChange(event.target.value)}
                  className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-3 text-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="UPI">UPI</option>
                </select>
              </div>

              <div className="mt-4 rounded-[20px] border border-slate-200 bg-white p-3.5">
                <div className="text-lg font-semibold text-slate-700">Discount</div>
                <div className="mt-3 grid gap-3">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discountAmount}
                    onChange={(event) => handleDiscountChange(event.target.value)}
                    placeholder="Enter discount amount"
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="rounded-xl bg-amber-50 px-3 py-2.5 text-base font-semibold text-amber-800">
                    Discount {formatCurrency(discountAmount)} | Final Total {formatCurrency(computedTotal)}
                  </div>
                </div>
              </div>

              {paymentMethod === "Card" ? (
                <div className="mt-4 rounded-[20px] border border-slate-200 bg-white p-3.5">
                  <div className="text-lg font-semibold text-slate-700">Card Details</div>
                  <div className="mt-3 grid gap-3">
                    <input
                      type="text"
                      value={cardDetails.cardHolderName}
                      onChange={(event) => updateCardDetails({ cardHolderName: event.target.value })}
                      placeholder="Card Holder Name"
                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <select
                        value={cardDetails.cardType}
                        onChange={(event) => updateCardDetails({ cardType: event.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-3 py-3 text-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Credit Card">Credit Card</option>
                        <option value="Debit Card">Debit Card</option>
                        <option value="RuPay Card">RuPay Card</option>
                      </select>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength="4"
                        value={cardDetails.cardLast4}
                        onChange={(event) => updateCardDetails({ cardLast4: event.target.value.replace(/\D/g, "").slice(0, 4) })}
                        placeholder="Last 4 Digits"
                        className="w-full rounded-xl border border-slate-200 px-3 py-3 text-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <input
                      type="text"
                      value={cardDetails.transactionRef}
                      onChange={(event) => updateCardDetails({ transactionRef: event.target.value })}
                      placeholder="Transaction / Approval Ref"
                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ) : null}

              <div className="mt-4 rounded-[20px] border border-slate-200 bg-white p-3.5">
                <div className="text-lg font-semibold text-slate-700">Person-wise Bill</div>
                <div className="mt-3 flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={splitCount}
                    onChange={(event) => handleSplitCountChange(event.target.value)}
                    className="w-24 rounded-xl border border-slate-200 px-3 py-3 text-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleCreateSplitBill}
                    disabled={submitting}
                    className="rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-600 px-4 py-3 text-base font-semibold text-white shadow-lg disabled:opacity-60"
                  >
                    Save Split Bill
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  {splitPreview.map((split) => (
                    <div key={split.splitNo} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3 text-base text-slate-700">
                      <span>Person {split.splitNo}</span>
                      <span className="font-bold text-slate-900">{formatCurrency(split.total)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2.5">
                {generatedBill?.id ? (
                  <div
                    className={`rounded-xl px-4 py-3 text-base font-semibold ${
                      isCurrentBillPaid
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border border-amber-200 bg-amber-50 text-amber-800"
                    }`}
                  >
                    Bill #{generatedBill.id} {isCurrentBillPaid ? "payment already done" : "pending"}.
                  </div>
                ) : null}
                <button
                  onClick={handleClose}
                    className="w-full rounded-xl bg-slate-200 px-4 py-3 text-lg font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePayment}
                  disabled={submitting || hasCustomerValidationErrors || isCurrentBillPaid}
                   className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-3 text-lg font-semibold text-white shadow-lg disabled:opacity-60"
                >
                  {submitting
                    ? "Processing..."
                    : isCurrentBillPaid
                      ? "Payment Already Done"
                      : generatedBill?.id
                        ? "Pay Now"
                        : "Pay Now & Save Bill"}
                </button>
                <button
                  onClick={handlePrint}
                   className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-3 text-lg font-semibold text-white shadow-lg"
                >
                  Print Bill
                </button>
              </div>
            </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Payment;
