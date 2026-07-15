import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { jsPDF } from "jspdf";

import API from "../api";

const RESORT_NAME = "Maa Baglamukhi Resort";
const RESORT_TAGLINE = "Your Stay, Our Blessing";
const RESORT_ADDRESS = "Main Highway Road, Baglamukhi, Rajasthan";
const RESORT_PHONE = "+91-9876543210";
const RESORT_EMAIL = "info@maabaglamukhiresort.com";
const RESORT_GSTIN = "08AABCM1234A1Z5";
const RESORT_STATE = "Rajasthan (08)";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatPlainINR = (value) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const toNumber = (value) => Number(value) || 0;

const calculateNights = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 1;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 1;
};

// Hotel invoice uses 5% GST (split as 2.5% SGST + 2.5% CGST)
const HOTEL_GST_RATE = 0.05;

const CustomerInvoicePage = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const printRef = useRef(null);

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentSettings, setPaymentSettings] = useState([]);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState("UPI");
  const [selectedPaymentSettingId, setSelectedPaymentSettingId] = useState("");
  const [paymentReferenceNo, setPaymentReferenceNo] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [settlingPayment, setSettlingPayment] = useState(false);
  const [printTimestamp, setPrintTimestamp] = useState(() => new Date());

  useEffect(() => {
    let ignore = false;
    const loadInvoice = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await API.get(`/invoice/${customerId}`);
        if (!ignore) {
          setInvoice(response.data || null);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.response?.data?.error || "Invoice load nahi ho paya.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    loadInvoice();
    return () => {
      ignore = true;
    };
  }, [customerId]);

  useEffect(() => {
    let ignore = false;
    const loadPaymentSettings = async () => {
      try {
        const response = await API.get("/accounts/payment-settings");
        if (!ignore) {
          setPaymentSettings(Array.isArray(response.data) ? response.data : []);
        }
      } catch {
        if (!ignore) setPaymentSettings([]);
      }
    };
    loadPaymentSettings();
    return () => {
      ignore = true;
    };
  }, []);

  const itemRows = useMemo(
    () => (Array.isArray(invoice?.items) ? invoice.items : []),
    [invoice?.items],
  );
  const numberOfNights = useMemo(
    () => calculateNights(invoice?.checkIn, invoice?.checkOut),
    [invoice?.checkIn, invoice?.checkOut],
  );

  // Tax split — derive from invoice.tax if present, else compute from total
  const taxAmount = useMemo(() => toNumber(invoice?.tax), [invoice?.tax]);
  const sgstAmount = useMemo(() => taxAmount / 2, [taxAmount]);
  const cgstAmount = useMemo(() => taxAmount / 2, [taxAmount]);

  const paymentStatusLabel = String(invoice?.paymentStatus || "Pending").trim();

  const invoiceNoDisplay = invoice?.invoiceNo || `INV-${customerId}`;

  const activePaymentSettings = useMemo(
    () => (paymentSettings || []).filter((row) => Number(row.is_active) === 1),
    [paymentSettings],
  );
  const paymentModeOptions = ["Cash", "UPI", "Card", "Bank Transfer", "Cheque"];
  const filteredPaymentSettings = useMemo(
    () =>
      activePaymentSettings.filter((row) => {
        if (selectedPaymentMode === "Cash") return false;
        return String(row.payment_mode || "").toLowerCase() ===
          String(selectedPaymentMode || "").toLowerCase();
      }),
    [activePaymentSettings, selectedPaymentMode],
  );
  const selectedPaymentSetting = useMemo(
    () =>
      filteredPaymentSettings.find(
        (row) => String(row.id) === String(selectedPaymentSettingId),
      ) || filteredPaymentSettings[0] || null,
    [filteredPaymentSettings, selectedPaymentSettingId],
  );

  useEffect(() => {
    if (selectedPaymentMode === "Cash") {
      setSelectedPaymentSettingId("");
      return;
    }
    setSelectedPaymentSettingId(
      filteredPaymentSettings[0] ? String(filteredPaymentSettings[0].id) : "",
    );
  }, [selectedPaymentMode, filteredPaymentSettings]);

  const reloadInvoice = async () => {
    try {
      const response = await API.get(`/invoice/${customerId}`);
      setInvoice(response.data || {});
    } catch (err) {
      console.error("Failed to reload invoice:", err);
    }
  };

  const handlePrint = () => {
    setPrintTimestamp(new Date());
    window.setTimeout(() => window.print(), 60);
  };

  // ── PDF download — A5 half-page hotel invoice ────────────────────────────
  const handleDownloadPdf = () => {
    if (!invoice) return;

    const doc = new jsPDF({ unit: "mm", format: "a5", orientation: "portrait" });
    const pageWidth = doc.internal.pageSize.getWidth(); // 148mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
    const margin = 8;
    const contentWidth = pageWidth - margin * 2;
    const rightEdge = pageWidth - margin;
    let y = margin;

    const ensureSpace = (heightNeeded = 8) => {
      if (y + heightNeeded <= pageHeight - margin) return;
      doc.addPage();
      y = margin;
    };

    // ── Resort header ────────────────────────────────────────────
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 22, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(RESORT_NAME, pageWidth / 2, 8, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(RESORT_TAGLINE, pageWidth / 2, 12, { align: "center" });
    doc.setFontSize(7);
    doc.text(
      `${RESORT_ADDRESS}  |  ${RESORT_PHONE}`,
      pageWidth / 2,
      16,
      { align: "center" },
    );
    doc.text(
      `Email: ${RESORT_EMAIL}  |  GSTIN: ${RESORT_GSTIN}  |  State: ${RESORT_STATE}`,
      pageWidth / 2,
      20,
      { align: "center" },
    );

    y = 26;
    doc.setTextColor(15, 23, 42);

    // ── Tax Invoice title bar ─────────────────────────────────────
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("TAX INVOICE", margin + 2, y + 4.8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(`#${invoiceNoDisplay}`, pageWidth / 2, y + 4.8, { align: "center" });
    doc.text(`Date: ${formatDate(invoice.date)}`, rightEdge - 2, y + 4.8, { align: "right" });
    y += 9;

    // ── Bill To + Stay Details ────────────────────────────────────
    const cardHeight = 22;
    const leftCardWidth = contentWidth * 0.55;
    const rightCardWidth = contentWidth * 0.42;
    const gap = contentWidth - leftCardWidth - rightCardWidth;

    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, leftCardWidth, cardHeight, 1.5, 1.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("BILL TO", margin + 2, y + 4);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.text(invoice.customerName || "Guest", margin + 2, y + 9);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Phone: ${invoice.phone || "--"}`, margin + 2, y + 13);
    doc.text(`Booking ID: ${invoice.bookingId || "--"}`, margin + 2, y + 17);
    doc.text(`Guests: ${invoice.guestCount || numberOfNights}`, margin + 2, y + 20.5);

    const rightCardX = margin + leftCardWidth + gap;
    doc.roundedRect(rightCardX, y, rightCardWidth, cardHeight, 1.5, 1.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("STAY DETAILS", rightCardX + 2, y + 4);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Room: ${invoice.roomNumber || "--"}`, rightCardX + 2, y + 9);
    doc.text(`Check-In: ${formatDate(invoice.checkIn)}`, rightCardX + 2, y + 13);
    doc.text(`Check-Out: ${formatDate(invoice.checkOut)}`, rightCardX + 2, y + 17);
    doc.text(`Nights: ${numberOfNights}`, rightCardX + 2, y + 20.5);
    y += cardHeight + 3;

    // ── Items table ───────────────────────────────────────────────
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, y, contentWidth, 6, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    const colX = {
      sl: margin + 1.5,
      desc: margin + 8,
      hsn: margin + 70,
      qty: margin + 90,
      rate: margin + 105,
      amt: rightEdge - 1.5,
    };
    doc.text("#", colX.sl, y + 4);
    doc.text("Description", colX.desc, y + 4);
    doc.text("HSN", colX.hsn, y + 4);
    doc.text("Qty", colX.qty, y + 4);
    doc.text("Rate", colX.rate, y + 4);
    doc.text("Amount", colX.amt, y + 4, { align: "right" });
    y += 6;

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    if (!itemRows.length) {
      doc.setFont("helvetica", "italic");
      doc.text("No items.", margin + 2, y + 5);
      y += 8;
    } else {
      itemRows.forEach((item, index) => {
        const nameLines = doc.splitTextToSize(
          String(item.name || "Charge"),
          colX.hsn - colX.desc - 2,
        );
        const rowHeight = Math.max(6, nameLines.length * 3.6 + 1.5);
        ensureSpace(rowHeight + 1);
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, y, rightEdge, y);
        doc.text(String(index + 1), colX.sl, y + 4);
        doc.text(nameLines, colX.desc, y + 4);
        doc.text(String(item.hsn || "9963"), colX.hsn, y + 4);
        doc.text(String(item.quantity || 1), colX.qty, y + 4);
        doc.text(formatPlainINR(item.price), colX.rate, y + 4);
        doc.text(formatPlainINR(item.total), colX.amt, y + 4, { align: "right" });
        y += rowHeight;
      });
    }
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.3);
    doc.line(margin, y, rightEdge, y);
    y += 3;

    // ── Totals box ────────────────────────────────────────────────
    ensureSpace(40);
    const totalsBoxWidth = 70;
    const totalsBoxX = rightEdge - totalsBoxWidth;

    // Left side: bank/payment summary
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Payment Status: ${paymentStatusLabel}`, margin, y + 3);
    doc.text(`Payment Mode: ${invoice.paymentMode || invoice.paymentMethod || "Front Desk"}`, margin, y + 8);
    if (invoice.paymentReference) {
      doc.text(`Reference: ${invoice.paymentReference}`, margin, y + 13);
    }

    // Right side: totals
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(totalsBoxX, y, totalsBoxWidth, 32, 1.5, 1.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const tx = totalsBoxX + 3;
    const tv = rightEdge - 3;

    doc.text("Subtotal", tx, y + 5);
    doc.text(formatPlainINR(invoice.subtotal), tv, y + 5, { align: "right" });

    doc.text(`SGST @ 2.5%`, tx, y + 10);
    doc.text(formatPlainINR(sgstAmount), tv, y + 10, { align: "right" });

    doc.text(`CGST @ 2.5%`, tx, y + 15);
    doc.text(formatPlainINR(cgstAmount), tv, y + 15, { align: "right" });

    if (toNumber(invoice.discount) > 0) {
      doc.text("Discount", tx, y + 20);
      doc.text(`- ${formatPlainINR(invoice.discount)}`, tv, y + 20, { align: "right" });
    }

    doc.setDrawColor(15, 23, 42);
    doc.line(tx, y + 23, tv, y + 23);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("GRAND TOTAL", tx, y + 28);
    doc.text(formatPlainINR(invoice.totalAmount), tv, y + 28, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("(in INR, inclusive of taxes)", tv, y + 31, { align: "right" });

    y += 38;

    // ── Bank Details ──────────────────────────────────────────────
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Bank Details (for refund/credit):", margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(
      "A/C: 1234567890  |  IFSC: SBIN0001234  |  Bank: SBI  |  Branch: Baglamukhi",
      margin,
      y + 4,
    );
    y += 9;

    // ── Footer / Signature ────────────────────────────────────────
    ensureSpace(15);
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, y, rightEdge, y);
    y += 4;

    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      "This is a computer generated invoice and does not require a physical signature.",
      margin,
      y,
    );
    doc.text(`Generated: ${formatDate(printTimestamp)}`, rightEdge, y, { align: "right" });
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text("Thank you for staying with us.", margin, y + 2);
    doc.text(`For ${RESORT_NAME}`, rightEdge, y + 2, { align: "right" });
    y += 6;
    doc.setDrawColor(15, 23, 42);
    doc.line(rightEdge - 35, y, rightEdge, y);
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("Authorized Signatory", rightEdge, y + 3, { align: "right" });

    doc.save(`${invoiceNoDisplay}.pdf`);
  };

  const handleSettleInvoice = async () => {
    if (!invoice?.id) return;
    if (selectedPaymentMode !== "Cash" && !selectedPaymentSetting?.id) {
      return window.alert("Please select an active payment setup for this mode.");
    }
    if (selectedPaymentMode !== "Cash" && !paymentReferenceNo.trim()) {
      return window.alert("Please enter the payment reference number.");
    }
    try {
      setSettlingPayment(true);
      await API.post("/accounts/settle-pending-bill", {
        sourceType: "invoice",
        sourceId: invoice.id,
        paymentMode: selectedPaymentMode,
        paymentSettingId: selectedPaymentSetting?.id || null,
        referenceNo: paymentReferenceNo.trim(),
        notes: paymentNotes.trim(),
      });
      await reloadInvoice();
      setPaymentReferenceNo("");
      setPaymentNotes("");
    } catch (err) {
      window.alert(err.response?.data?.message || "Payment could not be saved.");
    } finally {
      setSettlingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-sm text-slate-500">Invoice loading...</div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-6 text-sm text-rose-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[linear-gradient(135deg,#f8fbff_0%,#f7fffb_52%,#fff8ef_100%)] p-4 sm:p-6">
      <style>{`
        @page {
          size: A5 portrait;
          margin: 6mm;
        }

        .hotel-invoice-sheet {
          width: 148mm;
          min-height: 200mm;
          margin: 0 auto;
          padding: 6mm;
          background: #ffffff;
          color: #0f172a;
          font-family: 'Helvetica', 'Arial', sans-serif;
          box-sizing: border-box;
        }

        .hotel-invoice-header {
          background: linear-gradient(135deg, #0f172a 0%, #1d4ed8 50%, #0f766e 100%);
          color: #fff;
          padding: 10px 12px;
          border-radius: 8px;
        }

        .hotel-invoice-meta {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 8px;
          margin-top: 8px;
        }

        .hotel-invoice-meta-card {
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 6px 8px;
          background: #f8fafc;
        }

        .hotel-items-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
          font-size: 10px;
        }

        .hotel-items-table thead th {
          background: #0f172a;
          color: #ffffff;
          padding: 4px 4px;
          font-weight: 700;
          text-align: left;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .hotel-items-table tbody td {
          padding: 4px 4px;
          border-bottom: 1px solid #e2e8f0;
          vertical-align: top;
        }

        .hotel-items-table .text-right {
          text-align: right;
        }

        .hotel-totals-row {
          display: grid;
          grid-template-columns: 1fr 70mm;
          gap: 8px;
          margin-top: 8px;
        }

        .hotel-totals-box {
          background: #0f172a;
          color: #ffffff;
          padding: 8px 10px;
          border-radius: 6px;
        }

        .hotel-totals-box .totals-row {
          display: flex;
          justify-content: space-between;
          padding: 2px 0;
          font-size: 10px;
        }

        .hotel-totals-box .grand-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 6px;
          margin-top: 4px;
          border-top: 1px solid rgba(255, 255, 255, 0.2);
          font-size: 13px;
          font-weight: 800;
        }

        .invoice-no-print { /* helper for hiding controls when printing */ }

        @media print {
          html, body {
            background: #ffffff !important;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body * { visibility: hidden; }
          .hotel-invoice-sheet, .hotel-invoice-sheet * {
            visibility: visible;
          }
          .hotel-invoice-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 148mm;
            margin: 0;
            padding: 6mm;
            box-shadow: none;
            border-radius: 0;
          }
          .invoice-no-print { display: none !important; }
        }
      `}</style>

      <div className="mx-auto w-full max-w-205 space-y-5">
        {/* ── Action bar (NOT printed) ─────────────────────────────── */}
        <section className="invoice-no-print rounded-[28px] border border-white/70 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_45%,#0f766e_100%)] px-6 py-6 text-white shadow-[0_22px_60px_rgba(15,23,42,0.2)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-200">
                Hotel Tax Invoice
              </p>
              <h1 className="mt-2 text-2xl font-black sm:text-3xl">
                A5 printable invoice with GST split
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-5 text-slate-100/85">
                Resort header + GSTIN + Bill To + items with HSN + SGST/CGST split + Grand Total.
                Half-page A5 print hoga — ek sheet pe neat fit.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-slate-900"
              >
                Print (A5)
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="rounded-full bg-amber-400 px-5 py-2.5 text-sm font-bold text-slate-900"
              >
                Download PDF
              </button>
            </div>
          </div>
        </section>

        {/* ── Printable invoice sheet ────────────────────────────────── */}
        <section ref={printRef} className="hotel-invoice-sheet">
          {/* Header */}
          <div className="hotel-invoice-header">
            <div className="text-center">
              <h2 className="text-xl font-black tracking-wide">{RESORT_NAME}</h2>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.3em] text-cyan-100">
                {RESORT_TAGLINE}
              </p>
              <p className="mt-1 text-[9px] leading-tight">
                {RESORT_ADDRESS} &nbsp;|&nbsp; {RESORT_PHONE}
              </p>
              <p className="text-[9px] leading-tight">
                Email: {RESORT_EMAIL} &nbsp;|&nbsp; GSTIN: {RESORT_GSTIN} &nbsp;|&nbsp; State: {RESORT_STATE}
              </p>
            </div>
          </div>

          {/* Tax invoice bar */}
          <div className="mt-2 flex items-center justify-between rounded-md bg-slate-100 px-3 py-1.5 text-[10px]">
            <span className="font-bold uppercase tracking-wider">Tax Invoice</span>
            <span className="font-semibold">#{invoiceNoDisplay}</span>
            <span>Date: {formatDate(invoice?.date)}</span>
          </div>

          {/* Bill To + Stay Details */}
          <div className="hotel-invoice-meta">
            <div className="hotel-invoice-meta-card">
              <div className="text-[8px] font-bold uppercase tracking-widest text-slate-500">
                Bill To
              </div>
              <div className="mt-1 text-[13px] font-black leading-tight">
                {invoice?.customerName || "Guest"}
              </div>
              <div className="mt-1 text-[10px] text-slate-700">
                Phone: {invoice?.phone || "--"}
              </div>
              <div className="text-[10px] text-slate-700">
                Booking ID: {invoice?.bookingId || "--"}
              </div>
              <div className="text-[10px] text-slate-700">
                Email: {invoice?.guestEmail || invoice?.email || "--"}
              </div>
            </div>

            <div className="hotel-invoice-meta-card">
              <div className="text-[8px] font-bold uppercase tracking-widest text-slate-500">
                Stay Details
              </div>
              <div className="mt-1 text-[10px] text-slate-700">
                Room: <span className="font-bold text-slate-900">{invoice?.roomNumber || "--"}</span>
              </div>
              <div className="text-[10px] text-slate-700">
                Check-In: {formatDate(invoice?.checkIn)}
              </div>
              <div className="text-[10px] text-slate-700">
                Check-Out: {formatDate(invoice?.checkOut)}
              </div>
              <div className="text-[10px] text-slate-700">
                Nights: <span className="font-bold text-slate-900">{numberOfNights}</span>
              </div>
            </div>
          </div>

          {/* Items table */}
          <table className="hotel-items-table">
            <thead>
              <tr>
                <th style={{ width: "6%" }}>#</th>
                <th style={{ width: "44%" }}>Description</th>
                <th style={{ width: "10%" }}>HSN</th>
                <th style={{ width: "8%" }}>Qty</th>
                <th style={{ width: "16%" }} className="text-right">Rate</th>
                <th style={{ width: "16%" }} className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {itemRows.length ? (
                itemRows.map((item, index) => (
                  <tr key={`${item.name}-${index}`}>
                    <td>{index + 1}</td>
                    <td>
                      <div className="font-semibold">{item.name}</div>
                      {item.category ? (
                        <div className="text-[8px] uppercase text-slate-500">
                          {item.category}
                        </div>
                      ) : null}
                    </td>
                    <td>{item.hsn || "9963"}</td>
                    <td>{item.quantity || 1}</td>
                    <td className="text-right">{formatCurrency(item.price)}</td>
                    <td className="text-right font-bold">{formatCurrency(item.total)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-3 text-center text-slate-500">
                    No items.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Totals + payment summary */}
          <div className="hotel-totals-row">
            <div className="text-[10px] text-slate-700">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
                <div className="text-[8px] font-bold uppercase tracking-widest text-slate-500">
                  Payment Summary
                </div>
                <div className="mt-1">
                  Status: <span className="font-bold">{paymentStatusLabel}</span>
                </div>
                <div>
                  Mode: {invoice?.paymentMode || invoice?.paymentMethod || "Front Desk"}
                </div>
                {invoice?.paymentReference ? (
                  <div>Reference: {invoice.paymentReference}</div>
                ) : null}
                <div className="mt-1 text-[9px] italic text-slate-500">
                  Invoice issued under section 31 of CGST Act, 2017.
                </div>
              </div>
            </div>

            <div className="hotel-totals-box">
              <div className="totals-row">
                <span>Subtotal</span>
                <span>{formatCurrency(invoice?.subtotal)}</span>
              </div>
              <div className="totals-row">
                <span>SGST @ 2.5%</span>
                <span>{formatCurrency(sgstAmount)}</span>
              </div>
              <div className="totals-row">
                <span>CGST @ 2.5%</span>
                <span>{formatCurrency(cgstAmount)}</span>
              </div>
              {toNumber(invoice?.discount) > 0 ? (
                <div className="totals-row">
                  <span>Discount</span>
                  <span>- {formatCurrency(invoice?.discount)}</span>
                </div>
              ) : null}
              <div className="grand-total">
                <span>GRAND TOTAL</span>
                <span>{formatCurrency(invoice?.totalAmount)}</span>
              </div>
              <div className="mt-1 text-right text-[8px] text-white/60">
                (inclusive of all taxes)
              </div>
            </div>
          </div>

          {/* Bank details */}
          <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[9px]">
            <div className="font-bold uppercase tracking-wider text-slate-700">
              Bank Details (for refund / credit)
            </div>
            <div className="mt-0.5 text-slate-600">
              A/C: 1234567890 &nbsp;|&nbsp; IFSC: SBIN0001234 &nbsp;|&nbsp;
              Bank: SBI &nbsp;|&nbsp; Branch: Baglamukhi
            </div>
          </div>

          {/* Footer + signature */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <div className="text-[9px] italic text-slate-500">
                This is a computer generated invoice and does not require a physical signature.
              </div>
              <div className="mt-1 text-[10px] font-semibold">
                Thank you for staying with {RESORT_NAME}.
              </div>
              <div className="text-[9px] text-slate-500">
                Generated on {formatDate(printTimestamp)}
              </div>
            </div>
            <div className="text-right">
              <div className="border-t border-slate-900 pt-1 text-[10px] font-bold">
                For {RESORT_NAME}
              </div>
              <div className="text-[8px] text-slate-500">Authorized Signatory</div>
            </div>
          </div>
        </section>

        {/* ── Pending payment block (NOT printed) ──────────────────────── */}
        {String(invoice?.paymentStatus || "Pending").toLowerCase() !== "paid" ? (
          <div className="invoice-no-print mt-6 rounded-[24px] border border-cyan-100 bg-cyan-50/70 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-[15px] font-semibold uppercase tracking-[0.18em] text-cyan-700">
                  Pending Payment Settlement
                </div>
                <h3 className="mt-2 text-2xl font-black text-slate-900">
                  Complete payment from the invoice page
                </h3>
                <p className="mt-2 max-w-3xl text-xl text-slate-600">
                  Choose the payment mode, show the saved scanner if required, collect the
                  payment reference, and mark this invoice as paid.
                </p>
              </div>
              <div className="rounded-[20px] border border-cyan-200 bg-white px-4 py-3 text-xl text-cyan-800">
                Invoice amount: <span className="font-bold">{formatCurrency(invoice?.totalAmount)}</span>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.1fr]">
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1 block text-xl font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Payment Mode
                  </span>
                  <select
                    value={selectedPaymentMode}
                    onChange={(event) => setSelectedPaymentMode(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xl text-slate-900 outline-none"
                  >
                    {paymentModeOptions.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedPaymentMode !== "Cash" ? (
                  <>
                    <label className="block">
                      <span className="mb-1 block text-xl font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Payment Setup
                      </span>
                      <select
                        value={selectedPaymentSettingId}
                        onChange={(event) => setSelectedPaymentSettingId(event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xl text-slate-900 outline-none"
                      >
                        <option value="">Select setup</option>
                        {filteredPaymentSettings.map((row) => (
                          <option key={row.id} value={row.id}>
                            {row.department} - {row.provider_name || row.upi_id || row.bank_name || row.payment_mode}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-xl font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Reference / UTR
                      </span>
                      <input
                        value={paymentReferenceNo}
                        onChange={(event) => setPaymentReferenceNo(event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xl text-slate-900 outline-none"
                        placeholder="Enter transaction reference"
                      />
                    </label>
                  </>
                ) : (
                  <div className="rounded-[20px] border border-emerald-100 bg-emerald-50 px-4 py-3 text-xl text-emerald-800">
                    Cash selected. This will mark the invoice as paid without creating a bank
                    reconciliation row.
                  </div>
                )}

                <label className="block">
                  <span className="mb-1 block text-xl font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Notes
                  </span>
                  <textarea
                    value={paymentNotes}
                    onChange={(event) => setPaymentNotes(event.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xl text-slate-900 outline-none"
                    placeholder="Optional payment note"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleSettleInvoice}
                  disabled={settlingPayment}
                  className="rounded-xl bg-gradient-to-r from-cyan-600 to-teal-500 px-4 py-3 text-xl font-semibold text-white disabled:opacity-60"
                >
                  {settlingPayment ? "Saving payment..." : `Confirm ${selectedPaymentMode} Payment`}
                </button>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                <div className="text-[15px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Payment Setup Preview
                </div>
                {selectedPaymentMode !== "Cash" && selectedPaymentSetting ? (
                  <div className="mt-4 grid gap-4 md:grid-cols-[180px_1fr] md:items-start">
                    <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-3">
                      {selectedPaymentSetting.qr_image_url ? (
                        <img
                          src={selectedPaymentSetting.qr_image_url}
                          alt={`${selectedPaymentMode} QR`}
                          className="mx-auto h-40 w-40 rounded-xl object-contain"
                        />
                      ) : (
                        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 text-xl text-slate-500">
                          No scanner image
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 text-xl text-slate-700">
                      <div><span className="font-semibold text-slate-900">Provider:</span> {selectedPaymentSetting.provider_name || "-"}</div>
                      <div><span className="font-semibold text-slate-900">UPI ID:</span> {selectedPaymentSetting.upi_id || "-"}</div>
                      <div><span className="font-semibold text-slate-900">Account Holder:</span> {selectedPaymentSetting.account_holder_name || "-"}</div>
                      <div><span className="font-semibold text-slate-900">Bank:</span> {selectedPaymentSetting.bank_name || "-"}</div>
                      <div><span className="font-semibold text-slate-900">Department:</span> {selectedPaymentSetting.department || "-"}</div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 text-xl text-slate-500">
                    {selectedPaymentMode === "Cash"
                      ? "No scanner required for cash payment."
                      : "No active setup available for this payment mode."}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default CustomerInvoicePage;
