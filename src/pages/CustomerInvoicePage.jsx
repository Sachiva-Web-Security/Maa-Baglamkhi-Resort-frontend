import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { jsPDF } from "jspdf";

import API from "../api";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatPdfCurrency = (value) =>
  `INR ${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)}`;

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

const RESORT_NAME = "Maa Baglamukhi Resort";
const RESORT_RECEIPT_TITLE = "Guest Invoice Receipt";
const RESORT_RECEIPT_SUBTITLE =
  "Reception and accounts copy for hotel stay, room service, restaurant charges and settlement summary.";

const toNumber = (value) => Number(value) || 0;

const getPaymentStatusLabel = (value) => {
  const status = String(value || "Pending").trim();
  if (!status) return "Pending";
  return status;
};

const calculateNights = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return "--";
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "--";
  const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : "--";
};

const formatThermalDate = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatThermalTime = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatThermalAmount = (value) => (Number(value) || 0).toFixed(2);

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
        if (!ignore) {
          setLoading(false);
        }
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
        if (!ignore) {
          setPaymentSettings([]);
        }
      }
    };

    loadPaymentSettings();
    return () => {
      ignore = true;
    };
  }, []);

  const itemRows = useMemo(() => (Array.isArray(invoice?.items) ? invoice.items : []), [invoice?.items]);
  const paymentStatusLabel = useMemo(
    () => getPaymentStatusLabel(invoice?.paymentStatus),
    [invoice?.paymentStatus],
  );
  const numberOfNights = useMemo(
    () => calculateNights(invoice?.checkIn, invoice?.checkOut),
    [invoice?.checkIn, invoice?.checkOut],
  );
  const thermalTaxSplit = useMemo(() => toNumber(invoice?.tax) / 2, [invoice?.tax]);
  const invoiceMeta = useMemo(
    () => [
      { label: "Invoice No", value: invoice?.invoiceNo || `INV-${customerId}` },
      { label: "Invoice Date", value: formatDate(invoice?.date) },
      { label: "Booking ID", value: invoice?.bookingId || "--" },
      { label: "Payment Status", value: paymentStatusLabel },
    ],
    [customerId, invoice?.bookingId, invoice?.date, invoice?.invoiceNo, paymentStatusLabel],
  );
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
    const response = await API.get(`/invoice/${customerId}`);
    setInvoice(response.data || null);
  };

  const handlePrint = () => {
    setPrintTimestamp(new Date());
    window.setTimeout(() => window.print(), 60);
  };

  const handleDownloadPdf = () => {
    if (!invoice) return;

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;
    const contentWidth = pageWidth - margin * 2;
    const rightEdge = pageWidth - margin;
    let y = margin;

    const ensureSpace = (heightNeeded = 12) => {
      if (y + heightNeeded <= pageHeight - margin) return;
      doc.addPage();
      y = margin;
    };

    doc.setFillColor(15, 23, 42);
    doc.roundedRect(margin, y, contentWidth, 24, 4, 4, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(RESORT_NAME, margin + 6, y + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(RESORT_RECEIPT_TITLE, margin + 6, y + 15);
    doc.text(`Invoice No: ${invoice.invoiceNo || `INV-${customerId}`}`, rightEdge - 2, y + 8, {
      align: "right",
    });
    doc.text(`Date: ${formatDate(invoice.date)}`, rightEdge - 2, y + 15, { align: "right" });
    y += 32;

    doc.setTextColor(15, 23, 42);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, 92, 32, 4, 4);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Bill To", margin + 5, y + 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Guest: ${invoice.customerName || "Guest"}`, margin + 5, y + 14);
    doc.text(`Phone: ${invoice.phone || "--"}`, margin + 5, y + 20);
    doc.text(`Room No: ${invoice.roomNumber || "--"}`, margin + 5, y + 26);

    doc.roundedRect(margin + 98, y, contentWidth - 98, 32, 4, 4);
    doc.setFont("helvetica", "bold");
    doc.text("Stay Details", margin + 103, y + 7);
    doc.setFont("helvetica", "normal");
    doc.text(`Check-In: ${formatDate(invoice.checkIn)}`, margin + 103, y + 14);
    doc.text(`Check-Out: ${formatDate(invoice.checkOut)}`, margin + 103, y + 20);
    doc.text(`Nights: ${numberOfNights}`, margin + 103, y + 26);
    y += 40;

    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, contentWidth, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("ITEM", margin + 4, y + 6.5);
    doc.text("CATEGORY", margin + 88, y + 6.5);
    doc.text("QTY", margin + 132, y + 6.5);
    doc.text("PRICE", margin + 150, y + 6.5);
    doc.text("TOTAL", rightEdge - 4, y + 6.5, { align: "right" });
    y += 10;

    if (!itemRows.length) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("No invoice items available.", margin + 4, y + 8);
      y += 14;
    } else {
      itemRows.forEach((item, index) => {
        const lines = doc.splitTextToSize(
          `${index + 1}. ${item.name || "Item"}`,
          78,
        );
        const rowHeight = Math.max(10, lines.length * 5 + 2);
        ensureSpace(rowHeight + 2);
        doc.line(margin, y, rightEdge, y);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.text(lines, margin + 4, y + 6);
        doc.text(String(item.category || "Hotel"), margin + 88, y + 6);
        doc.text(String(item.quantity || 1), margin + 132, y + 6);
        doc.text(formatPdfCurrency(toNumber(item.price)), margin + 150, y + 6);
        doc.text(formatPdfCurrency(toNumber(item.total)), rightEdge - 4, y + 6, { align: "right" });
        y += rowHeight;
      });
      doc.line(margin, y, rightEdge, y);
      y += 8;
    }

    ensureSpace(48);
    const totalsBoxX = pageWidth - margin - 74;
    doc.roundedRect(totalsBoxX, y, 74, 34, 4, 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Subtotal", totalsBoxX + 5, y + 8);
    doc.text(formatPdfCurrency(toNumber(invoice.subtotal)), totalsBoxX + 69, y + 8, { align: "right" });
    doc.text("GST", totalsBoxX + 5, y + 15);
    doc.text(formatPdfCurrency(toNumber(invoice.tax)), totalsBoxX + 69, y + 15, { align: "right" });
    doc.text("Discount", totalsBoxX + 5, y + 22);
    doc.text(formatPdfCurrency(toNumber(invoice.discount)), totalsBoxX + 69, y + 22, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text("Grand Total", totalsBoxX + 5, y + 30);
    doc.text(formatPdfCurrency(toNumber(invoice.totalAmount)), totalsBoxX + 69, y + 30, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Payment Summary", margin, y + 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Status: ${paymentStatusLabel}`, margin, y + 15);
    doc.text(`Booking ID: ${invoice.bookingId || "--"}`, margin, y + 22);
    doc.text(`Generated by: ${RESORT_NAME}`, margin, y + 29);
    y += 42;

    ensureSpace(20);
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, y, rightEdge, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text("Thank you for staying with Maa Baglamukhi Resort.", margin, y + 7);
    doc.text("Authorized Signature", rightEdge, y + 7, { align: "right" });

    doc.save(`${invoice.invoiceNo || `invoice-${customerId}`}.pdf`);
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
    return <div className="p-6 text-sm text-slate-500">Invoice loading...</div>;
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
        .invoice-thermal-print {
          display: none;
        }

        @media print {
          @page { size: A4; margin: 10mm; }
          html, body {
            background: #ffffff !important;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body * { visibility: hidden; }
          .invoice-thermal-print,
          .invoice-thermal-print * {
            visibility: visible;
          }
          .invoice-thermal-print {
            display: block !important;
            position: absolute;
            left: 50%;
            top: 0;
            width: 80mm;
            transform: translateX(-50%);
            padding: 0;
            margin: 0;
            border: 0;
            box-shadow: none;
            background: #ffffff !important;
            font-family: "Courier New", Courier, monospace;
            color: #111827 !important;
          }
          .invoice-screen-print {
            display: none !important;
          }
          .invoice-thermal-card {
            border: 1px solid #d1d5db;
            padding: 10px 12px;
            background: #ffffff;
            box-shadow: none;
          }
          .thermal-divider {
            border-top: 1px dashed #94a3b8;
            margin: 8px 0;
          }
          .invoice-no-print { display: none !important; }
          .print-break-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
      <div className="w-full space-y-5">
        <section className="rounded-[28px] border border-white/70 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_45%,#0f766e_100%)] px-6 py-7 text-white shadow-[0_22px_60px_rgba(15,23,42,0.2)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">Reception + Accounts Invoice</p>
              <h1 className="mt-3 text-3xl font-black sm:text-4xl">Combined hotel and restaurant invoice</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-100/85">
                Customer, room, hotel charges, food orders, GST, discount aur final amount ek printable invoice me.
              </p>
            </div>

            <div className="invoice-no-print flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-900"
              >
                Print
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="rounded-full bg-amber-400 px-5 py-3 text-sm font-bold text-slate-900"
              >
                Download PDF
              </button>
            </div>
          </div>
        </section>

        <section id="invoice-print" ref={printRef} className="bg-transparent">
          <div className="invoice-screen-print receipt-shell rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-6">
            <div className="receipt-accent rounded-[26px] bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_46%,#0f766e_100%)] px-5 py-5 text-white">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.34em] text-cyan-100/85">
                    {RESORT_NAME}
                  </div>
                  <h2 className="mt-3 text-3xl font-black sm:text-[2.2rem]">
                    {RESORT_RECEIPT_TITLE}
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-100/85">
                    {RESORT_RECEIPT_SUBTITLE}
                  </p>
                </div>

                <div className="min-w-[250px] rounded-[22px] border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-white/70">
                    Receipt Status
                  </div>
                  <div className="mt-2 text-2xl font-black">{paymentStatusLabel}</div>
                  <div className="mt-3 text-sm text-white/80">
                    Invoice No: {invoice?.invoiceNo || `INV-${customerId}`}
                  </div>
                  <div className="mt-1 text-sm text-white/80">
                    Date: {formatDate(invoice?.date)}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] print-break-avoid">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Bill To
                </div>
                <div className="mt-3 text-3xl font-black text-slate-900">
                  {invoice?.customerName || "Guest"}
                </div>
                <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                  <div>Phone: {invoice?.phone || "--"}</div>
                  <div>Booking ID: {invoice?.bookingId || "--"}</div>
                  <div>Room No: {invoice?.roomNumber || "--"}</div>
                  <div>Receipt Type: Original Copy</div>
                </div>
              </div>

              <div className="grid gap-3">
                {invoiceMeta.map((entry) => (
                  <div key={entry.label} className="rounded-[20px] border border-slate-200 bg-white p-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                      {entry.label}
                    </div>
                    <div className="mt-2 text-lg font-black text-slate-900">{entry.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 print-break-avoid">
              <div className="rounded-[20px] border border-slate-200 bg-white p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Check-In</div>
                <div className="mt-2 text-lg font-black text-slate-900">{formatDate(invoice?.checkIn)}</div>
              </div>
              <div className="rounded-[20px] border border-slate-200 bg-white p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Check-Out</div>
                <div className="mt-2 text-lg font-black text-slate-900">{formatDate(invoice?.checkOut)}</div>
              </div>
              <div className="rounded-[20px] border border-slate-200 bg-white p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Nights</div>
                <div className="mt-2 text-lg font-black text-slate-900">{numberOfNights}</div>
              </div>
              <div className="rounded-[20px] border border-slate-200 bg-white p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Payment Mode</div>
                <div className="mt-2 text-lg font-black text-slate-900">
                  {invoice?.paymentMode || invoice?.paymentMethod || "Front Desk"}
                </div>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto rounded-[24px] border border-slate-200 print-break-avoid">
              <table className="invoice-print-table min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Item Description</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Qty</th>
                    <th className="px-4 py-3">Rate</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {itemRows.map((item, index) => (
                    <tr key={`${item.name}-${index}`} className="border-t border-slate-200">
                      <td className="px-4 py-4 font-semibold text-slate-900">{item.name}</td>
                      <td className="px-4 py-4 text-slate-600">{item.category || "Hotel"}</td>
                      <td className="px-4 py-4 text-slate-600">{item.quantity || 1}</td>
                      <td className="px-4 py-4 text-slate-600">{formatCurrency(item.price)}</td>
                      <td className="px-4 py-4 text-right font-bold text-slate-900">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                  {!itemRows.length ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        Invoice items available nahi hain.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] print-break-avoid">
              <div className="space-y-4">
                <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Guest Contact
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-slate-700">
                    <div>Name: {invoice?.customerName || "--"}</div>
                    <div>Phone: {invoice?.phone || "--"}</div>
                    <div>Booking ID: {invoice?.bookingId || "--"}</div>
                    <div>Room Number: {invoice?.roomNumber || "--"}</div>
                  </div>
                </div>

                <div className="rounded-[22px] border border-slate-200 bg-white p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Receipt Notes
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    This is a system-generated invoice receipt issued by {RESORT_NAME}. Please
                    verify guest details, stay dates, and amount summary before final handover.
                  </p>
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-950 p-5 text-white">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-white/70">Subtotal</span>
                    <span className="font-bold">{formatCurrency(invoice?.subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-white/70">GST (5%)</span>
                    <span className="font-bold">{formatCurrency(invoice?.tax)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-white/70">Discount</span>
                    <span className="font-bold">{formatCurrency(invoice?.discount)}</span>
                  </div>
                  <div className="border-t border-white/10 pt-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-base font-semibold">Grand Total</span>
                      <span className="text-2xl font-black">{formatCurrency(invoice?.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 print-break-avoid">
              <div className="rounded-[20px] border border-dashed border-slate-300 bg-slate-50 px-4 py-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Thank You Note
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Thank you for staying with {RESORT_NAME}. We appreciate your visit and look
                  forward to welcoming you again.
                </p>
              </div>

              <div className="rounded-[20px] border border-dashed border-slate-300 bg-white px-4 py-5 text-right">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Authorized Signatory
                </div>
                <div className="mt-10 text-sm font-semibold text-slate-700">For {RESORT_NAME}</div>
              </div>
            </div>
          </div>

          <div className="invoice-thermal-print">
            <div className="invoice-thermal-card">
              <div className="text-center">
                <div className="text-[18px] font-bold uppercase leading-tight">{RESORT_NAME}</div>
                <div className="mt-1 text-[11px]">Hotel Guest Receipt</div>
                <div className="text-[11px]">Reception Copy</div>
              </div>

              <div className="thermal-divider" />

              <div className="space-y-1 text-[11px] leading-4">
                <div className="flex items-start justify-between gap-3">
                  <span>Invoice No</span>
                  <span>{invoice?.invoiceNo || `INV-${customerId}`}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span>Date</span>
                  <span>{formatThermalDate(printTimestamp)}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span>Time</span>
                  <span>{formatThermalTime(printTimestamp)}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span>Guest</span>
                  <span className="max-w-[150px] text-right">{invoice?.customerName || "Guest"}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span>Phone</span>
                  <span>{invoice?.phone || "--"}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span>Room</span>
                  <span>{invoice?.roomNumber || "--"}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span>Booking ID</span>
                  <span>{invoice?.bookingId || "--"}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span>Check-In</span>
                  <span>{formatThermalDate(invoice?.checkIn)}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span>Check-Out</span>
                  <span>{formatThermalDate(invoice?.checkOut)}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span>Status</span>
                  <span>{paymentStatusLabel}</span>
                </div>
              </div>

              <div className="thermal-divider" />

              <table className="w-full text-[11px] leading-4">
                <thead>
                  <tr className="border-b border-dashed border-slate-400">
                    <th className="pb-1 text-left font-bold">Item</th>
                    <th className="pb-1 text-center font-bold">Qty</th>
                    <th className="pb-1 text-right font-bold">Rate</th>
                    <th className="pb-1 text-right font-bold">Amt</th>
                  </tr>
                </thead>
                <tbody>
                  {itemRows.length ? (
                    itemRows.map((item, index) => (
                      <tr key={`thermal-${item.name}-${index}`} className="align-top">
                        <td className="py-1 pr-2">
                          <div>{item.name}</div>
                          <div className="text-[10px] text-slate-500">{item.category || "Hotel"}</div>
                        </td>
                        <td className="py-1 text-center">{item.quantity || 1}</td>
                        <td className="py-1 text-right">{formatThermalAmount(item.price)}</td>
                        <td className="py-1 text-right">{formatThermalAmount(item.total)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-2 text-center text-slate-500">
                        No items
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="thermal-divider" />

              <div className="space-y-1 text-[11px] leading-4">
                <div className="flex items-center justify-between gap-3">
                  <span>Subtotal</span>
                  <span>{formatThermalAmount(invoice?.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>SGST</span>
                  <span>{formatThermalAmount(thermalTaxSplit)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>CGST</span>
                  <span>{formatThermalAmount(thermalTaxSplit)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Discount</span>
                  <span>{formatThermalAmount(invoice?.discount)}</span>
                </div>
              </div>

              <div className="thermal-divider" />

              <div className="flex items-center justify-between gap-3 text-[13px] font-bold leading-5">
                <span>NET AMOUNT</span>
                <span>{formatThermalAmount(invoice?.totalAmount)}</span>
              </div>

              <div className="thermal-divider" />

              <div className="space-y-1 text-center text-[10px] leading-4 text-slate-600">
                <div>Thank you for staying with us.</div>
                <div>Please visit again.</div>
                <div>Powered by {RESORT_NAME}</div>
              </div>
            </div>
          </div>

          {String(invoice?.paymentStatus || "Pending").toLowerCase() !== "paid" ? (
            <div className="invoice-no-print mt-6 rounded-[24px] border border-cyan-100 bg-cyan-50/70 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-700">
                    Pending Payment Settlement
                  </div>
                  <h3 className="mt-2 text-2xl font-black text-slate-900">
                    Complete payment from the invoice page
                  </h3>
                  <p className="mt-2 max-w-3xl text-sm text-slate-600">
                    Choose the payment mode, show the saved scanner if required, collect the
                    payment reference, and mark this invoice as paid.
                  </p>
                </div>
                <div className="rounded-[20px] border border-cyan-200 bg-white px-4 py-3 text-sm text-cyan-800">
                  Invoice amount: <span className="font-bold">{formatCurrency(invoice?.totalAmount)}</span>
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.1fr]">
                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Payment Mode
                    </span>
                    <select
                      value={selectedPaymentMode}
                      onChange={(event) => setSelectedPaymentMode(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
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
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Payment Setup
                        </span>
                        <select
                          value={selectedPaymentSettingId}
                          onChange={(event) => setSelectedPaymentSettingId(event.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
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
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Reference / UTR
                        </span>
                        <input
                          value={paymentReferenceNo}
                          onChange={(event) => setPaymentReferenceNo(event.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
                          placeholder="Enter transaction reference"
                        />
                      </label>
                    </>
                  ) : (
                    <div className="rounded-[20px] border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                      Cash selected. This will mark the invoice as paid without creating a bank
                      reconciliation row.
                    </div>
                  )}

                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Notes
                    </span>
                    <textarea
                      value={paymentNotes}
                      onChange={(event) => setPaymentNotes(event.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
                      placeholder="Optional payment note"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleSettleInvoice}
                    disabled={settlingPayment}
                    className="rounded-xl bg-gradient-to-r from-cyan-600 to-teal-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {settlingPayment ? "Saving payment..." : `Confirm ${selectedPaymentMode} Payment`}
                  </button>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
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
                          <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 text-xs text-slate-500">
                            No scanner image
                          </div>
                        )}
                      </div>
                      <div className="space-y-2 text-sm text-slate-700">
                        <div><span className="font-semibold text-slate-900">Provider:</span> {selectedPaymentSetting.provider_name || "-"}</div>
                        <div><span className="font-semibold text-slate-900">UPI ID:</span> {selectedPaymentSetting.upi_id || "-"}</div>
                        <div><span className="font-semibold text-slate-900">Account Holder:</span> {selectedPaymentSetting.account_holder_name || "-"}</div>
                        <div><span className="font-semibold text-slate-900">Bank:</span> {selectedPaymentSetting.bank_name || "-"}</div>
                        <div><span className="font-semibold text-slate-900">Department:</span> {selectedPaymentSetting.department || "-"}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 text-sm text-slate-500">
                      {selectedPaymentMode === "Cash"
                        ? "No scanner required for cash payment."
                        : "No active setup available for this payment mode."}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
};

export default CustomerInvoicePage;
