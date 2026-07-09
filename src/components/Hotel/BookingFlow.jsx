
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import {
  FaPlus,
  FaEye,
  FaEdit,
  FaTrash,
  FaSearch,
  FaFilter,
  FaDownload,
  FaCheckCircle,
  FaTimes,
  FaExclamationTriangle,
  FaPrint,
  FaEnvelope,
  FaCommentDots,
  FaListUl,
  FaUserPlus,
  FaCogs,
  FaSignInAlt,
  FaSignOutAlt,
  FaBan,
  FaMoneyBillWave,
  FaUndo,
  FaChevronLeft,
  FaChevronRight,
  FaBook,
  FaHistory,
  FaFileUpload,
  FaFileAlt,
  FaUsers,
  FaUserFriends,
  FaChartBar,
  FaChartLine,
  FaIdCard,
} from "react-icons/fa";

import API, { getBackendBaseURL } from "../../api";
import { todayISO } from "../Dashboard/stayoverUtils";
import { setStoredBookingId, setStoredBookingCode } from "./bookingSession";
import FolioView from "./FolioView";
import GroupBooking from "./GroupBooking";
import OccupancyForecast from "./OccupancyForecast";
import GuestProfile from "./GuestProfile";
/* ─────────────────────────── shared style tokens ─────────────────────────── */

const fieldCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100";

const labelCls = "mb-1.5 block text-[13px] font-bold text-slate-700";

const panelCls =
  "rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]";

const sectionTitleCls =
  "mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-[15px] font-extrabold text-slate-900";

const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[linear-gradient(180deg,#39a6eb_0%,#2a8fd4_100%)] px-5 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(14,165,233,0.28)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60";

const ghostBtn =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50";

const dangerBtn =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-5 py-2.5 text-sm font-bold text-rose-700 transition hover:bg-rose-100";

const softBtn = (active) =>
  `inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition ${
    active
      ? "border-sky-300 bg-sky-50 text-sky-700"
      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
  }`;

/* ─────────────────────────── helpers ─────────────────────────── */

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const uid = () => Math.random().toString(36).slice(2, 9);

const DOCUMENT_TYPE_LABELS = {
  checkin_form: "Check-in Form",
  guest_photo: "Guest Photo",
  signature: "Signature",
  id_proof: "ID Proof",
};

const buildUploadUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${getBackendBaseURL()}${raw.startsWith("/") ? raw : `/${raw}`}`;
};

const STATUS_STYLES = {
  confirmed: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  "checked-in": "bg-sky-50 text-sky-700 ring-1 ring-sky-100",
  "checked-out": "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  pending: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
  cancelled: "bg-rose-50 text-rose-700 ring-1 ring-rose-100",
};

const statusStyle = (status) => {
  const key = String(status || "").toLowerCase().trim();
  return STATUS_STYLES[key] || "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
};

/* ─────────────────────────── top flow bar (image-1 style) ─────────────────────────── */

const FLOW_STEPS = [
  {
    view: "form",
    num: 1,
    icon: FaUserPlus,
    title: "New Booking",
    desc: "Fill all booking details and create a new reservation",
  },
  {
    view: "confirmed",
    num: 2,
    icon: FaCheckCircle,
    title: "Booking Confirmed",
    desc: "Booking is confirmed and reference number generated",
  },
  {
    view: "list",
    num: 3,
    icon: FaListUl,
    title: "All Bookings",
    desc: "View all bookings in a list with status and details",
  },
  {
    view: "details",
    num: 4,
    icon: FaEye,
    title: "Booking Details",
    desc: "View full details of any specific booking",
  },
  {
    view: "manage",
    num: 5,
    icon: FaCogs,
    title: "Manage Booking",
    desc: "Edit, Cancel, Check-in / Check-out or Update payment",
  },
  {
    view: "group-booking",
    num: 6,
    icon: FaUsers,
    title: "Group Booking",
    desc: "Create and manage bookings for groups, events, or corporate guests",
  },
  {
    view: "guest-booking",
    num: 7,
    icon: FaUserFriends,
    title: "Guest Booking",
    desc: "Manage guest profiles, reservations, arrivals, departures, and stay history",
  },
  {
    view: "occupancy-forecast",
    num: 8,
    icon: FaChartLine,
    title: "Occupancy Forecast",
    desc: "Analyze occupancy trends, room availability, and future booking forecasts",
  },
];

const FlowBar = ({ view, onJump }) => (
  <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
    <div className="flex flex-wrap items-center justify-between gap-3 sm:flex-nowrap sm:gap-2">
      {FLOW_STEPS.map((step, idx) => {
        const Icon = step.icon;
        const isActive = step.view === view;
        return (
          <React.Fragment key={step.view}>
            <button
              type="button"
              onClick={() => onJump(step.view)}
              className="group flex min-w-[110px] flex-1 flex-col items-center gap-2 rounded-xl px-2 py-1 text-center transition hover:bg-slate-50"
              title={step.desc}
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-full text-[15px] transition ${
                  isActive
                    ? "bg-sky-500 text-white shadow-[0_8px_18px_rgba(14,165,233,0.35)]"
                    : "bg-sky-50 text-sky-600 group-hover:bg-sky-100"
                }`}
              >
                <Icon />
              </span>
              <span className={`text-[13px] font-bold ${isActive ? "text-sky-700" : "text-slate-700"}`}>
                {step.num}. {step.title}
              </span>
            </button>
            {idx < FLOW_STEPS.length - 1 && (
              <div className="hidden h-px flex-1 bg-slate-200 sm:block" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  </div>
);

/* ─────────────────────────── initial form shape ─────────────────────────── */

const emptyForm = () => ({
  bookingId: null,
  bookingCode: "",
  firstName: "",
  lastName: "",
  guestEmail: "",
  mobile: "",
  checkIn: "",
  checkOut: "",
  arrival: "12:00",
  departure: "12:00",
  bookingType: "Walk-In",
  referralBy: "",
  company: "",
  reference: "",
  roomCategory: "",
  noOfRooms: 1,
  guestCapacity: "",
  roomMobile: "",
  owner: "",
  address: "",
  rooms: [],
  comingFrom: "",
  goingTo: "",
  purposeOfVisit: "",
  pickupFrom: "",
  pickup: false,
  packageDetails: "",
  remarks: "",
  amount: "",
  paymentMode: "",
  paymentStatus: "",
  paidBy: "",
  paymentNote: "",
});

const rowTotal = (row) => {
  const base = Number(row.price || 0) * Number(row.quantity || 0);
  return base + (base * Number(row.gst || 0)) / 100;
};

/* ─────────────────────────── toast / notice ─────────────────────────── */

const Toast = ({ toast, onClose }) => {
  if (!toast.open) return null;
  const tone = toast.type === "success" ? "from-emerald-500 to-teal-500" : "from-rose-500 to-red-500";
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.28)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-start gap-4 bg-gradient-to-r ${tone} px-6 py-5 text-white`}>
          <div className="rounded-2xl bg-white/15 p-2.5">
            {toast.type === "success" ? <FaCheckCircle /> : <FaExclamationTriangle />}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-black leading-tight">{toast.title}</h3>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-white/85 hover:bg-white/10">
            <FaTimes />
          </button>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm leading-6 text-slate-600">{toast.message}</p>
          <div className="mt-5 flex justify-end">
            <button onClick={onClose} className={primaryBtn}>
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────── main component ─────────────────────────── */

const FeatureModal = ({ title, subtitle, size = "max-w-6xl", onClose, children }) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[950] flex items-center justify-center bg-slate-950/70 px-3 py-4 backdrop-blur-sm sm:px-6"
      onClick={onClose}
    >
      <div
        className={`relative max-h-[92vh] w-full ${size} overflow-y-auto rounded-[28px] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.35)]`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
          <div>
            <h3 className="text-lg font-black text-slate-900">{title}</h3>
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            aria-label="Close modal"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
          >
            <FaTimes />
          </button>
        </div>
        <div className="p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
};

const documentTypeOptions = [
  { value: "checkin_form", label: "Check-in Form" },
  { value: "guest_photo", label: "Guest Photo" },
  { value: "signature", label: "Signature" },
  { value: "id_proof", label: "ID Proof" },
];

const DocumentUploadModal = ({ booking, onClose }) => {
  const bookingId = booking?.bookingId;
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ documentType: "id_proof", notes: "", termsAccepted: true });
  const [file, setFile] = useState(null);

  const loadDocuments = async () => {
    if (!bookingId) return;
    setLoading(true);
    try {
      const res = await API.get(`/hotel/guest-documents/${bookingId}`);
      setDocuments(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const handleUpload = async () => {
    if (!file || !bookingId) return;
    const data = new FormData();
    data.append("document", file);
    data.append("documentType", form.documentType);
    data.append("notes", form.notes);
    data.append("termsAccepted", form.termsAccepted ? "true" : "false");
    data.append("uploadedBy", localStorage.getItem("name") || "Front Desk");

    setUploading(true);
    try {
      await API.post(`/hotel/guest-documents/${bookingId}`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFile(null);
      setForm((prev) => ({ ...prev, notes: "" }));
      await loadDocuments();
    } catch (err) {
      alert(err.response?.data?.message || "Document upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId) => {
    if (!window.confirm("Delete this document?")) return;
    await API.delete(`/hotel/guest-documents/${bookingId}/${documentId}`);
    await loadDocuments();
  };

  return (
    <FeatureModal
      title="Document Upload"
      subtitle={`${booking?.guest_name || "Guest"} - ${booking?.bookingCode || `BK-${bookingId}`}`}
      size="max-w-5xl"
      onClose={onClose}
    >
      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
          <div className={sectionTitleCls}>Upload Guest Document</div>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Document Type</label>
              <select
                className={fieldCls}
                value={form.documentType}
                onChange={(event) => setForm((prev) => ({ ...prev, documentType: event.target.value }))}
              >
                {documentTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Image / PDF</label>
              <input
                type="file"
                accept="image/*,.pdf,application/pdf"
                className={fieldCls}
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
            </div>
            <div>
              <label className={labelCls}>Notes</label>
              <textarea
                rows={3}
                className={fieldCls}
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                placeholder="Aadhaar, passport, signed check-in form..."
              />
            </div>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <input
                type="checkbox"
                checked={form.termsAccepted}
                onChange={(event) => setForm((prev) => ({ ...prev, termsAccepted: event.target.checked }))}
              />
              Guest consent / terms accepted
            </label>
            <button type="button" onClick={handleUpload} disabled={!file || uploading} className={primaryBtn}>
              <FaFileUpload className="text-xs" /> {uploading ? "Uploading..." : "Upload Document"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className={sectionTitleCls}>Uploaded Documents</div>
          {loading ? (
            <div className="py-10 text-center text-slate-400">Loading documents...</div>
          ) : documents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-slate-400">
              No documents uploaded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => {
                const url = buildUploadUrl(doc.file_url);
                const label = documentTypeOptions.find((item) => item.value === doc.document_type)?.label || doc.document_type;
                return (
                  <div key={doc.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                    <div>
                      <div className="font-black text-slate-900">{label}</div>
                      <div className="mt-1 text-sm text-slate-500">{doc.notes || "No notes"} - {formatDate(doc.uploaded_at)}</div>
                    </div>
                    <div className="flex gap-2">
                      <a href={url} target="_blank" rel="noreferrer" className={ghostBtn}>
                        <FaEye className="text-xs" /> View
                      </a>
                      <button type="button" onClick={() => handleDelete(doc.id)} className={dangerBtn}>
                        <FaTrash className="text-xs" /> Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </FeatureModal>
  );
};

const InvoiceModal = ({ booking, onClose }) => {
  const bookingId = booking?.bookingId;
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadInvoice = async () => {
    if (!bookingId) return;
    setLoading(true);
    try {
      const existing = await API.get(`/invoice/by-booking/${bookingId}`);
      if (existing.data?.id) {
        setInvoice(existing.data);
      } else {
        const generated = await API.get(`/invoice/${bookingId}`);
        setInvoice(generated.data || null);
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Invoice load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const items = Array.isArray(invoice?.items) ? invoice.items : [];
  const invoiceNo = invoice?.invoiceNo || invoice?.invoice_no || `INV-${bookingId}`;
  const guestName = invoice?.customerName || invoice?.customer_name || booking?.guest_name || "Guest";
  const invoiceTotal = invoice?.totalAmount || invoice?.final_total || booking?.totalAmount;

  const buildLines = () => [
    ["Invoice No", invoiceNo],
    ["Guest", guestName],
    ["Phone", invoice?.phone || booking?.mobile || "-"],
    ["Rooms", invoice?.roomNumber || invoice?.room_no || booking?.rooms || "-"],
    ["Stay", `${formatDate(invoice?.checkIn || invoice?.check_in || booking?.check_in)} to ${formatDate(invoice?.checkOut || invoice?.check_out || booking?.check_out)}`],
    ["Subtotal", formatCurrency(invoice?.subtotal)],
    ["GST", formatCurrency(invoice?.tax || invoice?.gst)],
    ["Discount", formatCurrency(invoice?.discount)],
    ["Total", formatCurrency(invoiceTotal)],
    ["Payment Status", invoice?.paymentStatus || invoice?.payment_status || "Pending"],
  ];

  const handlePrint = () => {
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    const rows = items.map((item) => `
      <tr>
        <td>${item.name || item.description || "Item"}</td>
        <td>${item.quantity || 1}</td>
        <td>${formatCurrency(item.price)}</td>
        <td>${formatCurrency(item.total)}</td>
      </tr>
    `).join("");
    win.document.write(`
      <html><head><title>${invoiceNo}</title>
      <style>body{font-family:Arial;padding:28px;color:#0f172a}h1{margin:0 0 8px}table{width:100%;border-collapse:collapse;margin-top:18px}td,th{border:1px solid #e2e8f0;padding:10px;text-align:left}.total{font-size:22px;font-weight:800;text-align:right}</style>
      </head><body>
      <h1>Maa Baglamukhi Resort</h1><div>${invoiceNo}</div>
      ${buildLines().map(([k, v]) => `<p><b>${k}:</b> ${v}</p>`).join("")}
      <table><thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="total">Total: ${formatCurrency(invoiceTotal)}</p>
      </body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  const handleDownloadPdf = () => {
    const doc = new jsPDF();
    let y = 18;
    doc.setFontSize(16);
    doc.text("Maa Baglamukhi Resort", 14, y);
    y += 8;
    doc.setFontSize(11);
    buildLines().forEach(([key, value]) => {
      doc.text(`${key}: ${value}`, 14, y);
      y += 7;
    });
    y += 4;
    doc.setFontSize(12);
    doc.text("Items", 14, y);
    y += 7;
    doc.setFontSize(10);
    (items.length ? items : [{ name: "Booking charges", quantity: 1, price: booking?.totalAmount, total: booking?.totalAmount }]).forEach((item) => {
      doc.text(String(item.name || item.description || "Item").slice(0, 52), 14, y);
      doc.text(String(item.quantity || 1), 130, y);
      doc.text(String(formatCurrency(item.total)), 150, y);
      y += 7;
      if (y > 280) {
        doc.addPage();
        y = 18;
      }
    });
    doc.save(`${invoiceNo}.pdf`);
  };

  return (
    <FeatureModal
      title="Invoice"
      subtitle={`${guestName} - ${booking?.bookingCode || `BK-${bookingId}`}`}
      size="max-w-5xl"
      onClose={onClose}
    >
      {loading ? (
        <div className="py-16 text-center text-slate-400">Preparing invoice...</div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={loadInvoice} className={ghostBtn}>Regenerate</button>
            <button type="button" onClick={handlePrint} className={ghostBtn}><FaPrint className="text-xs" /> Print</button>
            <button type="button" onClick={handleDownloadPdf} className={primaryBtn}><FaDownload className="text-xs" /> PDF</button>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <div className="text-[11px] font-bold uppercase text-slate-400">Invoice No</div>
                <div className="text-2xl font-black text-slate-900">{invoiceNo}</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-bold uppercase text-slate-400">Total</div>
                <div className="text-3xl font-black text-emerald-600">{formatCurrency(invoiceTotal)}</div>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {buildLines().slice(1, 6).map(([key, value]) => (
                <div key={key} className="rounded-xl bg-slate-50 p-3">
                  <div className="text-[11px] font-bold uppercase text-slate-400">{key}</div>
                  <div className="font-bold text-slate-800">{value}</div>
                </div>
              ))}
            </div>
            <div className="mt-5 overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-400">
                  <tr><th className="px-4 py-3">Item</th><th className="px-4 py-3">Qty</th><th className="px-4 py-3">Rate</th><th className="px-4 py-3 text-right">Total</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(items.length ? items : [{ name: "Booking charges", quantity: 1, price: booking?.totalAmount, total: booking?.totalAmount }]).map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 font-semibold text-slate-800">{item.name || item.description || "Item"}</td>
                      <td className="px-4 py-3">{item.quantity || 1}</td>
                      <td className="px-4 py-3">{formatCurrency(item.price)}</td>
                      <td className="px-4 py-3 text-right font-black">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </FeatureModal>
  );
};

const BookingFlow = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const today = todayISO();

  // "view" controls which screen of the flow we're on — this is the ONLY thing
  // that changes when the user moves between steps. No route change happens.
  const [view, setView] = useState(() =>
    location.pathname.includes("guest") ? "form" : "list",
  );
  const [isEdit, setIsEdit] = useState(false);

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const [formData, setFormData] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [categorySetup, setCategorySetup] = useState([]);

  const [selectedBooking, setSelectedBooking] = useState(null); // row from list
  const [bookingDetail, setBookingDetail] = useState(null); // full detail payload
  const [detailLoading, setDetailLoading] = useState(false);

  const [toast, setToast] = useState({ open: false, type: "success", title: "", message: "" });
  const [cancelModal, setCancelModal] = useState({ open: false, reason: "", submitting: false });
  const [collectModal, setCollectModal] = useState({ open: false, amount: "", mode: "Cash", submitting: false });
  const [manageStatus, setManageStatus] = useState("");

  const showToast = (type, title, message) => setToast({ open: true, type, title, message });
  const closeToast = () => setToast((t) => ({ ...t, open: false }));

  /* ---------- data loading ---------- */

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await API.get("/hotel/all-bookings");
      setBookings(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load bookings:", err);
      showToast("error", "Could not load bookings", "Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    API.get("/hotel/rooms/setup")
      .then((res) => setCategorySetup(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error("Failed to load room categories:", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- derived ---------- */

  const filteredBookings = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return bookings;
    return bookings.filter((b) =>
      [b.guest_name, b.bookingCode, b.bookingId, b.mobile, b.rooms]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [bookings, search]);

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / pageSize));
  const pagedBookings = filteredBookings.slice((page - 1) * pageSize, page * pageSize);

  const grandTotal = useMemo(
    () => formData.rooms.reduce((sum, row) => sum + rowTotal(row), 0),
    [formData.rooms],
  );


// this is a folio page 
const [showFolio, setShowFolio] = useState(false);
const [showGroupBooking, setShowGroupBooking] = useState(false);
const [showOccupancyForecast, setShowOccupancyForecast] = useState(false);
const [showGuestProfile, setShowGuestProfile] = useState(false);

const [selectedBookingId, setSelectedBookingId] = useState(null);























  const guestFullName = `${formData.firstName} ${formData.lastName}`.trim();

  const stayNights = useMemo(() => {
    if (!formData.checkIn || !formData.checkOut) return 0;
    const inD = new Date(formData.checkIn);
    const outD = new Date(formData.checkOut);
    const diff = Math.round((outD - inD) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }, [formData.checkIn, formData.checkOut]);

  /* ---------- navigation between the 5 "screens" (all local state) ---------- */

  const goToList = () => {
    setView("list");
    fetchBookings();
  };

  const openNewBooking = () => {
    setFormData(emptyForm());
    setIsEdit(false);
    setSelectedBooking(null);
    setView("form");
  };

  const openEditBooking = async (booking) => {
    try {
      setSelectedBooking(booking);
      setStoredBookingId(booking.bookingId);
      const res = await API.get(`/hotel/full-booking/${booking.bookingId}`);
      const data = res.data || {};
      const nameParts = String(data.guest_name || data.guestName || "").trim().split(" ");
      setFormData({
        ...emptyForm(),
        bookingId: booking.bookingId,
        bookingCode: data.booking_code || data.bookingCode || booking.bookingCode || "",
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
        guestEmail: data.guest_email || data.guestEmail || "",
        mobile: data.mobile || "",
        checkIn: (data.check_in || data.checkIn || "").slice(0, 10),
        checkOut: (data.check_out || data.checkOut || "").slice(0, 10),
        company: data.company_name || data.companyName || "",
        rooms: (Array.isArray(data.rooms) ? data.rooms : []).map((r) => ({
          id: uid(),
          roomNo: r.room_number || r.roomNumber || r.roomNo || "",
          price: r.tariff || r.price || 0,
          gst: r.gst || r.gstPercent || 0,
          quantity: r.quantity || 1,
        })),
      });
      setIsEdit(true);
      setView("form");
    } catch (err) {
      console.error(err);
      showToast("error", "Could not load booking", "We couldn't fetch this booking's details for editing.");
    }
  };

  const openDetails = async (booking) => {
    setSelectedBooking(booking);
    setView("details");
    setDetailLoading(true);
    try {
      const res = await API.get(`/hotel/full-booking/${booking.bookingId}`);
      setBookingDetail(res.data || null);
    } catch (err) {
      console.error(err);
      setBookingDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const openManage = (booking) => {
    setSelectedBooking(booking);
    setManageStatus(booking.booking_status || "");
    setView("manage");
  };
const handleJumpStep = (stepView) => {

  if (stepView === "form") {
    openNewBooking();
    return;
  }

  if (stepView === "list") {
    goToList();
    return;
  }

  if (stepView === "confirmed") {
    if (!formData.bookingId) {
      showToast(
        "error",
        "No booking found",
        "Please create a booking first."
      );
      return;
    }

    setView("confirmed");
    return;
  }

  //----------------------------
  // POPUP SCREENS
  //----------------------------

  if (stepView === "group-booking") {
    setShowGroupBooking(true);
    return;
  }

  if (stepView === "guest-booking") {
    setShowGuestProfile(true);
    return;
  }

  if (stepView === "occupancy-forecast") {
    setShowOccupancyForecast(true);
    return;
  }

  //----------------------------
  // Booking Detail
  //----------------------------

  if (stepView === "details") {

    if (!selectedBooking) {
      showToast(
        "error",
        "Select a booking first",
        "Please select any booking."
      );
      return;
    }

    openDetails(selectedBooking);
    return;
  }

  //----------------------------
  // Manage
  //----------------------------

  if (stepView === "manage") {

    if (!selectedBooking) {
      showToast(
        "error",
        "Select a booking first",
        "Please select any booking."
      );
      return;
    }

    openManage(selectedBooking);
  }

};

  /* ---------- form field handlers ---------- */

  const setField = (name, value) => setFormData((prev) => ({ ...prev, [name]: value }));

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setField(name, type === "checkbox" ? checked : value);
  };

  const addRoomRow = () => {
    const cat = categorySetup.find((c) => String(c.id) === String(formData.roomCategory));
    setFormData((prev) => ({
      ...prev,
      rooms: [
        ...prev.rooms,
        {
          id: uid(),
          roomNo: "",
          price: cat ? Number(cat.defaultPrice || 0) : 0,
          gst: 0,
          quantity: Number(prev.noOfRooms) || 1,
        },
      ],
    }));
  };

  const updateRoomRow = (id, field, value) => {
    setFormData((prev) => ({
      ...prev,
      rooms: prev.rooms.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    }));
  };

  const removeRoomRow = (id) => {
    setFormData((prev) => ({ ...prev, rooms: prev.rooms.filter((r) => r.id !== id) }));
  };

  /* ---------- save booking (creates OR updates, all from this one page) ---------- */

  const validateForm = () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      showToast("error", "Guest name required", "Please enter the guest's first and last name.");
      return false;
    }
    const email = formData.guestEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast("error", "Valid email required", "Please enter a valid guest email address.");
      return false;
    }
    if (!formData.checkIn || !formData.checkOut) {
      showToast("error", "Stay dates required", "Please select both check-in and check-out dates.");
      return false;
    }
    if (formData.checkOut < formData.checkIn) {
      showToast("error", "Invalid dates", "Check-out date cannot be before check-in date.");
      return false;
    }
    return true;
  };

  const handleSaveBooking = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      let bookingId = formData.bookingId;
      let bookingCode = formData.bookingCode;

      if (!isEdit) {
        // 1) Guest + stay
        const guestRes = await API.post("/hotel/guest", {
          agentBooking: false,
          bookingPoint: "",
          mobile: formData.mobile,
          guestName: guestFullName,
          guestEmail: formData.guestEmail,
          checkIn: formData.checkIn,
          checkOut: formData.checkOut,
          arrival: formData.arrival,
          departure: formData.departure,
          bookingStatus: "Confirmed",
        });
        bookingId = guestRes.data.bookingId;
        bookingCode = guestRes.data.bookingCode || "";
        setStoredBookingId(bookingId);
        setStoredBookingCode(bookingCode);

        // 2) Booking type / source / address
        await API.post(`/hotel/other-booking/${bookingId}`, {
          bookingType: formData.bookingType,
          bookingSource: formData.bookingType,
          bookingReference: formData.reference,
          address: formData.address,
          country: "",
          state: "",
          city: "",
          pincode: "",
        });

        // 3) Reference / notes
        await API.post(`/hotel/reference/${bookingId}`, {
          guestType: "",
          guestNotes: formData.remarks,
          internalNotes: formData.purposeOfVisit,
        });

        // 4) Company
        await API.post(`/hotel/company/${bookingId}`, {
          companyName: formData.company || "Direct Booking",
          gst: "",
        });

        // 5) Room & tariff rows
        for (const row of formData.rooms) {
          await API.post(`/hotel/room-tariff/${bookingId}`, {
            roomNumber: row.roomNo,
            date: new Date().toISOString().slice(0, 19).replace("T", " "),
            quantity: row.quantity,
            tariff: row.price,
            gstPercent: row.gst,
            total: rowTotal(row),
          });
        }

        // 6) Pax / occupancy
        await API.post(`/hotel/pax/${bookingId}`, {
          guestCapacity: formData.guestCapacity,
          owner: formData.owner,
          rooms: formData.rooms,
        });

        // 7) Advance payment (only if an amount was entered)
        if (Number(formData.amount) > 0) {
          await API.post(`/hotel/advance/${bookingId}`, {
            amount: Number(formData.amount),
            discount: 0,
            paymentMode: formData.paymentMode || "Cash",
            notes: formData.paymentNote,
          });
        }
      } else {
        // Edit mode: one consolidated update call
        await API.put(`/hotel/full-booking/${bookingId}`, {
          guest_name: guestFullName,
          mobile: formData.mobile,
          company_name: formData.company,
          checkIn: formData.checkIn,
          checkOut: formData.checkOut,
          rooms: formData.rooms.map((r) => ({
            roomNumber: r.roomNo,
            tariff: r.price,
            gst: r.gst,
            quantity: r.quantity,
            total: rowTotal(r),
          })),
        });
      }

      setFormData((prev) => ({ ...prev, bookingId, bookingCode }));
      setSelectedBooking((prev) => ({ ...(prev || {}), bookingId, bookingCode, guest_name: guestFullName }));
      showToast(
        "success",
        isEdit ? "Booking Updated" : "Booking Confirmed",
        isEdit ? "The booking has been updated successfully." : "Your booking has been created successfully.",
      );
      await fetchBookings();
      setView("confirmed");
    } catch (err) {
      console.error(err);
      showToast(
        "error",
        "Save Failed",
        err.response?.data?.message || "We could not save this booking. Please check the required fields and try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  /* ---------- manage-booking actions ---------- */

  const handleLifecycle = async (action) => {
    if (!selectedBooking?.bookingId) return;
    try {
      await API.put(`/hotel/${action}/${selectedBooking.bookingId}`);
      showToast(
        "success",
        action === "check-out" ? "Checked Out" : "Checked In",
        action === "check-out" ? "Guest has been checked out successfully." : "Guest has been checked in successfully.",
      );
      await fetchBookings();
      openManage({ ...selectedBooking, booking_status: action === "check-out" ? "Checked-Out" : "Checked-In" });
    } catch (err) {
      console.error(err);
      showToast("error", "Action Failed", "We could not update this booking's status. Please try again.");
    }
  };

  const handleConfirmCancel = async () => {
    if (!selectedBooking?.bookingId) return;
    const reason = cancelModal.reason.trim();
    if (!reason) {
      showToast("error", "Reason required", "Please enter a cancellation reason.");
      return;
    }
    try {
      setCancelModal((c) => ({ ...c, submitting: true }));
      await API.put(`/hotel/cancel/${selectedBooking.bookingId}`, { reason });
      setCancelModal({ open: false, reason: "", submitting: false });
      showToast("success", "Booking Cancelled", `Booking #${selectedBooking.bookingCode || selectedBooking.bookingId} has been cancelled.`);
      await fetchBookings();
      goToList();
    } catch (err) {
      console.error(err);
      setCancelModal((c) => ({ ...c, submitting: false }));
      showToast("error", "Cancellation Failed", err.response?.data?.message || "Could not cancel this booking.");
    }
  };

  const handleCollectPayment = async () => {
    if (!selectedBooking?.bookingId) return;
    const amount = Number(collectModal.amount);
    if (!amount || amount <= 0) {
      showToast("error", "Enter a valid amount", "Payment amount must be greater than zero.");
      return;
    }
    try {
      setCollectModal((c) => ({ ...c, submitting: true }));
      await API.post(`/hotel/advance/${selectedBooking.bookingId}`, {
        amount,
        discount: 0,
        paymentMode: collectModal.mode,
      });
      setCollectModal({ open: false, amount: "", mode: "Cash", submitting: false });
      showToast("success", "Payment Collected", `${formatCurrency(amount)} recorded against this booking.`);
      await fetchBookings();
    } catch (err) {
      console.error(err);
      setCollectModal((c) => ({ ...c, submitting: false }));
      showToast("error", "Payment Failed", err.response?.data?.message || "Could not record this payment.");
    }
  };

  const handleRefund = async () => {
    if (!selectedBooking?.bookingId) return;
    const amount = window.prompt("Enter refund amount");
    if (!amount || Number.isNaN(Number(amount))) return;
    try {
      await API.post(`/hotel/refund/${selectedBooking.bookingId}`, { amount });
      showToast("success", "Refund Processed", `${formatCurrency(amount)} has been refunded.`);
      await fetchBookings();
    } catch (err) {
      console.error(err);
      showToast("error", "Refund Failed", "Could not process this refund.");
    }
  };

  // Folio / Night-Audit and Payment History are still separate, standalone
  // pages in your app (not part of this consolidated flow), so opening them
  // is a normal route navigation — same as your old AllBooking.jsx did.
 const handleOpenFolio = (booking) => {
    if (!booking?.bookingId) return;

    setStoredBookingId(booking.bookingId);
    setStoredBookingCode(booking.bookingCode || "");
    setSelectedBookingId(booking.bookingId);
    setShowFolio(true);
  };

  const handleCloseFolio = () => {
    setShowFolio(false);
    setSelectedBookingId(null);
  };

  const handleOpenPaymentHistory = (booking) => {
    if (!booking?.bookingId) return;
    setStoredBookingId(booking.bookingId);
    navigate("/hotel/payment-history", { state: { bookingId: booking.bookingId } });
  };

  const handleNotify = async (channel) => {
    if (!selectedBooking?.bookingId) return;
    try {
      await API.post(`/hotel/notify/${selectedBooking.bookingId}`, { channel });
      showToast(
        "success",
        channel === "email" ? "Email Sent" : "SMS Sent",
        `Booking details were sent to the guest via ${channel === "email" ? "email" : "SMS"}.`,
      );
    } catch (err) {
      console.error(err);
      showToast("error", "Notification Failed", "This needs a /hotel/notify endpoint on your backend — please add it, or hook this button to your existing notification service.");
    }
  };

  const handleExportCSV = () => {
    const headers = ["Booking No", "Guest Name", "Check-In", "Check-Out", "Rooms", "Amount", "Status", "Booking Type"];
    const rows = filteredBookings.map((b) => [
      b.bookingCode || b.bookingId,
      b.guest_name || "",
      formatDate(b.check_in),
      formatDate(b.check_out),
      b.rooms || "",
      b.totalAmount || 0,
      b.booking_status || "",
      b.bookingType || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bookings.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ─────────────────────────── render: All Bookings (list) ─────────────────────────── */

  const renderList = () => (
    <div className={panelCls}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900">All Bookings</h2>
          <p className="text-sm text-slate-500">View and manage all your hotel reservations</p>
        </div>
        <button type="button" onClick={openNewBooking} className={primaryBtn}>
          <FaPlus className="text-xs" /> New Booking
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <FaSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by booking no, guest name, email or phone..."
            className={`${fieldCls} pl-10`}
          />
        </div>
        <button type="button" className={ghostBtn}>
          <FaFilter className="text-xs" /> Filter
        </button>
        <button type="button" onClick={handleExportCSV} className={ghostBtn}>
          <FaDownload className="text-xs" /> Export
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-slate-50 text-[12px] font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Booking No</th>
              <th className="px-4 py-3">Guest Name</th>
              <th className="px-4 py-3">Check-In</th>
              <th className="px-4 py-3">Check-Out</th>
              <th className="px-4 py-3">Rooms</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Booking Type</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                  Loading bookings...
                </td>
              </tr>
            ) : pagedBookings.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                  No bookings found.
                </td>
              </tr>
            ) : (
              pagedBookings.map((b) => (
                <tr key={b.bookingId} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-bold text-slate-800">{b.bookingCode || `BK-${b.bookingId}`}</td>
                  <td className="px-4 py-3 text-slate-700">{b.guest_name || "Walk-in Guest"}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(b.check_in)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(b.check_out)}</td>
                  <td className="px-4 py-3 text-slate-600">{b.rooms || "-"}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{formatCurrency(b.totalAmount)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-[12px] font-bold ${statusStyle(b.booking_status)}`}>
                      {b.booking_status || "Pending"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{b.bookingType || "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button title="View details" onClick={() => openDetails(b)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50">
                        <FaEye className="text-xs" />
                      </button>
                      <button title="Edit booking" onClick={() => openEditBooking(b)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50">
                        <FaEdit className="text-xs" />
                      </button>
                      <button title="Guest folio" onClick={() => handleOpenFolio(b)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50">
                        <FaBook className="text-xs" />
                      </button>
                      <button title="Manage booking" onClick={() => openManage(b)} className="rounded-lg border border-rose-200 p-2 text-rose-600 hover:bg-rose-50">
                        <FaTrash className="text-xs" />
                      </button>
                      <button
    title="Group Booking"
    onClick={() => handleOpenGroupBooking(b)}
>
    <FaUsers />
</button>
<button
    title="Guest Profile"
    onClick={() => handleOpenGuestProfile(b)}
>
    <FaIdCard />
</button>

                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
        <span>
          Showing {pagedBookings.length ? (page - 1) * pageSize + 1 : 0}
          {" "}to {(page - 1) * pageSize + pagedBookings.length} of {filteredBookings.length} entries
        </span>
        <div className="flex items-center gap-1.5">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-slate-200 p-2 text-slate-500 disabled:opacity-40"
          >
            <FaChevronLeft className="text-xs" />
          </button>
          {Array.from({ length: totalPages }).slice(0, 5).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`h-8 w-8 rounded-lg text-sm font-bold ${
                page === i + 1 ? "bg-sky-500 text-white" : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-lg border border-slate-200 p-2 text-slate-500 disabled:opacity-40"
          >
            <FaChevronRight className="text-xs" />
          </button>
        </div>
      </div>
    </div>
  );

  /* ─────────────────────────── render: New / Edit Booking (single page, no tab-navigation) ─────────────────────────── */

  const renderForm = () => (
    <div className={panelCls}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-xl font-black text-slate-900">{isEdit ? "Edit Booking" : "New Booking"}</h2>
          <p className="text-sm text-slate-500">
            {isEdit ? "Update the booking details below." : "Fill all details below to create a new booking — everything happens on this one page."}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={goToList} className={ghostBtn}>
            Cancel
          </button>
          <button type="button" onClick={handleSaveBooking} disabled={saving} className={primaryBtn}>
            {saving ? "Saving..." : "Save Booking"}
          </button>
        </div>
      </div>

      {/* section anchors — purely visual / scroll cues, all sections are already on screen below */}
      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { id: "sec-guest", label: "Guest Information" },
          { id: "sec-booking", label: "Booking Details" },
          { id: "sec-room", label: "Room & Tariff" },
          { id: "sec-other", label: "Other Details" },
          { id: "sec-payment", label: "Payment Details" },
        ].map((s) => (
          <a key={s.id} href={`#${s.id}`} className={softBtn(false)}>
            {s.label}
          </a>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* column 1: guest + stay */}
        <div className="space-y-5">
          <div id="sec-guest" className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5">
            <div className={sectionTitleCls}>Guest Information</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>First Name</label>
                <input name="firstName" value={formData.firstName} onChange={handleChange} className={fieldCls} placeholder="Enter first name" />
              </div>
              <div>
                <label className={labelCls}>Last Name</label>
                <input name="lastName" value={formData.lastName} onChange={handleChange} className={fieldCls} placeholder="Enter last name" />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Email Address</label>
                <input type="email" name="guestEmail" value={formData.guestEmail} onChange={handleChange} className={fieldCls} placeholder="Enter guest email" />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Phone Number</label>
                <input name="mobile" value={formData.mobile} onChange={handleChange} className={fieldCls} placeholder="Enter phone number" />
              </div>
            </div>

            <div className="mt-5 border-t border-slate-200 pt-5">
              <div className="mb-3 text-[13px] font-bold text-slate-900">Stay Details</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Check-In</label>
                  <input type="date" name="checkIn" min={today} value={formData.checkIn} onChange={handleChange} className={fieldCls} />
                </div>
                <div>
                  <label className={labelCls}>Check-Out</label>
                  <input type="date" name="checkOut" min={formData.checkIn || today} value={formData.checkOut} onChange={handleChange} className={fieldCls} />
                </div>
                <div>
                  <label className={labelCls}>Expected Arrival</label>
                  <input type="time" name="arrival" value={formData.arrival} onChange={handleChange} className={fieldCls} />
                </div>
                <div>
                  <label className={labelCls}>Expected Departure</label>
                  <input type="time" name="departure" value={formData.departure} onChange={handleChange} className={fieldCls} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* column 2: booking info + room & tariff */}
        <div className="space-y-5">
          <div id="sec-booking" className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5">
            <div className={sectionTitleCls}>Booking Information</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Booking No</label>
                <input disabled value={formData.bookingCode || "Auto-generated on save"} className={`${fieldCls} bg-slate-100 text-slate-500`} />
              </div>
              <div>
                <label className={labelCls}>Booking Date</label>
                <input disabled value={formatDate(today)} className={`${fieldCls} bg-slate-100 text-slate-500`} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Booking Type</label>
                <div className="flex gap-4 pt-1">
                  {["Walk-In", "VIA", "Online"].map((t) => (
                    <label key={t} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <input
                        type="radio"
                        name="bookingType"
                        checked={formData.bookingType === t}
                        onChange={() => setField("bookingType", t)}
                      />
                      {t}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Referral By</label>
                <input name="referralBy" value={formData.referralBy} onChange={handleChange} className={fieldCls} placeholder="Enter referral name" />
              </div>
              <div>
                <label className={labelCls}>Company</label>
                <input name="company" value={formData.company} onChange={handleChange} className={fieldCls} placeholder="Enter company name" />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Reference</label>
                <input name="reference" value={formData.reference} onChange={handleChange} className={fieldCls} placeholder="Enter reference details" />
              </div>
            </div>
          </div>

          <div id="sec-room" className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5">
            <div className={sectionTitleCls}>Room &amp; Tariff Details</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Room Category</label>
                <select name="roomCategory" value={formData.roomCategory} onChange={handleChange} className={fieldCls}>
                  <option value="">Select Category</option>
                  {categorySetup.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>No. Of Rooms</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    name="noOfRooms"
                    value={formData.noOfRooms}
                    onChange={handleChange}
                    className={fieldCls}
                  />
                  <button type="button" onClick={addRoomRow} className="shrink-0 rounded-xl bg-sky-500 px-3 text-sm font-bold text-white hover:bg-sky-600">
                    + Add
                  </button>
                </div>
              </div>
              <div>
                <label className={labelCls}>Guest Capacity</label>
                <input name="guestCapacity" value={formData.guestCapacity} onChange={handleChange} className={fieldCls} placeholder="Adults + Children" />
              </div>
              <div>
                <label className={labelCls}>Mobile Number</label>
                <input name="roomMobile" value={formData.roomMobile} onChange={handleChange} className={fieldCls} placeholder="Primary mobile number" />
              </div>
              <div>
                <label className={labelCls}>Owner</label>
                <input name="owner" value={formData.owner} onChange={handleChange} className={fieldCls} placeholder="Enter owner name" />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Address</label>
                <textarea name="address" value={formData.address} onChange={handleChange} rows={2} className={fieldCls} placeholder="Enter address" />
              </div>
            </div>

            {formData.rooms.length > 0 && (
              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[380px] text-left text-xs">
                  <thead className="bg-slate-100 font-bold uppercase text-slate-500">
                    <tr>
                      <th className="px-2.5 py-2">Room No</th>
                      <th className="px-2.5 py-2">Price</th>
                      <th className="px-2.5 py-2">GST %</th>
                      <th className="px-2.5 py-2">Qty</th>
                      <th className="px-2.5 py-2">Total</th>
                      <th className="px-2.5 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {formData.rooms.map((row) => (
                      <tr key={row.id}>
                        <td className="px-2.5 py-1.5">
                          <input
                            value={row.roomNo}
                            onChange={(e) => updateRoomRow(row.id, "roomNo", e.target.value)}
                            className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                            placeholder="e.g. 101"
                          />
                        </td>
                        <td className="px-2.5 py-1.5">
                          <input
                            type="number"
                            value={row.price}
                            onChange={(e) => updateRoomRow(row.id, "price", e.target.value)}
                            className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                          />
                        </td>
                        <td className="px-2.5 py-1.5">
                          <input
                            type="number"
                            value={row.gst}
                            onChange={(e) => updateRoomRow(row.id, "gst", e.target.value)}
                            className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                          />
                        </td>
                        <td className="px-2.5 py-1.5">
                          <input
                            type="number"
                            min={1}
                            value={row.quantity}
                            onChange={(e) => updateRoomRow(row.id, "quantity", e.target.value)}
                            className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                          />
                        </td>
                        <td className="px-2.5 py-1.5 font-semibold text-slate-700">{formatCurrency(rowTotal(row))}</td>
                        <td className="px-2.5 py-1.5">
                          <button onClick={() => removeRoomRow(row.id)} className="text-rose-500 hover:text-rose-700">
                            <FaTimes className="text-xs" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* column 3: other details + payment */}
        <div className="space-y-5">
          <div id="sec-other" className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5">
            <div className={sectionTitleCls}>Other Details</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Coming From</label>
                <input name="comingFrom" value={formData.comingFrom} onChange={handleChange} className={fieldCls} placeholder="Please enter coming from" />
              </div>
              <div>
                <label className={labelCls}>Going To</label>
                <input name="goingTo" value={formData.goingTo} onChange={handleChange} className={fieldCls} placeholder="Please enter going to" />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Purpose of Visit</label>
                <input name="purposeOfVisit" value={formData.purposeOfVisit} onChange={handleChange} className={fieldCls} placeholder="Please enter purpose of visit" />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Pickup From</label>
                <div className="flex items-center gap-2">
                  <input name="pickupFrom" value={formData.pickupFrom} onChange={handleChange} className={fieldCls} placeholder="Enter pickup point" />
                  <label className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-slate-600">
                    <input type="checkbox" name="pickup" checked={formData.pickup} onChange={handleChange} /> Pickup?
                  </label>
                </div>
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Package Details</label>
                <input name="packageDetails" value={formData.packageDetails} onChange={handleChange} className={fieldCls} placeholder="Enter package details" />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Remarks</label>
                <textarea name="remarks" value={formData.remarks} onChange={handleChange} rows={2} className={fieldCls} placeholder="Enter any remarks..." />
              </div>
            </div>
          </div>

          <div id="sec-payment" className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5">
            <div className={sectionTitleCls}>Advance Payment Details</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Amount (₹)</label>
                <input type="number" name="amount" value={formData.amount} onChange={handleChange} className={fieldCls} placeholder="0.00" />
              </div>
              <div>
                <label className={labelCls}>Payment Mode</label>
                <select name="paymentMode" value={formData.paymentMode} onChange={handleChange} className={fieldCls}>
                  <option value="">Select Mode</option>
                  <option>Cash</option>
                  <option>Card</option>
                  <option>UPI</option>
                  <option>Bank Transfer</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Payment Status</label>
                <select name="paymentStatus" value={formData.paymentStatus} onChange={handleChange} className={fieldCls}>
                  <option value="">Select Status</option>
                  <option>Paid</option>
                  <option>Partial</option>
                  <option>Pending</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Paid By</label>
                <input name="paidBy" value={formData.paidBy} onChange={handleChange} className={fieldCls} placeholder="Enter paid by name" />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Payment Note</label>
                <textarea name="paymentNote" value={formData.paymentNote} onChange={handleChange} rows={2} className={fieldCls} placeholder="Enter payment note (optional)" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* booking summary footer */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
        <div className="flex flex-wrap gap-8 text-sm">
          <div>
            <div className="text-[11px] font-bold uppercase text-slate-400">Guest Name</div>
            <div className="font-bold text-slate-800">{guestFullName || "-"}</div>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase text-slate-400">Stay Duration</div>
            <div className="font-bold text-slate-800">{stayNights} Night{stayNights === 1 ? "" : "s"}</div>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase text-slate-400">Check-In</div>
            <div className="font-bold text-slate-800">{formData.checkIn ? formatDate(formData.checkIn) : "-"}</div>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase text-slate-400">Check-Out</div>
            <div className="font-bold text-slate-800">{formData.checkOut ? formatDate(formData.checkOut) : "-"}</div>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase text-slate-400">Total Rooms</div>
            <div className="font-bold text-slate-800">{formData.rooms.length || "-"}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] font-bold uppercase text-slate-400">Total Amount</div>
          <div className="text-2xl font-black text-emerald-600">{formatCurrency(grandTotal)}</div>
        </div>
      </div>
    </div>
  );

  /* ─────────────────────────── render: Booking Confirmed ─────────────────────────── */

  const renderConfirmed = () => (
    <div className={`${panelCls} mx-auto max-w-xl text-center`}>
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-3xl text-white shadow-[0_14px_30px_rgba(16,185,129,0.35)]">
        <FaCheckCircle />
      </div>
      <h2 className="mt-4 text-2xl font-black text-slate-900">Booking Confirmed!</h2>
      <p className="mt-1 text-sm text-slate-500">Your booking has been confirmed successfully.</p>

      <div className="mx-auto mt-5 max-w-xs rounded-2xl bg-emerald-50 px-4 py-3">
        <div className="text-[11px] font-bold uppercase text-emerald-600">Booking Reference</div>
        <div className="text-xl font-black text-emerald-700">{formData.bookingCode || formData.bookingId}</div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 text-left text-sm">
        <div>
          <div className="text-[11px] font-bold uppercase text-slate-400">Guest Name</div>
          <div className="font-bold text-slate-800">{guestFullName}</div>
        </div>
        <div>
          <div className="text-[11px] font-bold uppercase text-slate-400">Rooms</div>
          <div className="font-bold text-slate-800">{formData.rooms.length}</div>
        </div>
        <div>
          <div className="text-[11px] font-bold uppercase text-slate-400">Check-In</div>
          <div className="font-bold text-slate-800">{formatDate(formData.checkIn)}</div>
        </div>
        <div>
          <div className="text-[11px] font-bold uppercase text-slate-400">Check-Out</div>
          <div className="font-bold text-slate-800">{formatDate(formData.checkOut)}</div>
        </div>
        <div className="col-span-2">
          <div className="text-[11px] font-bold uppercase text-slate-400">Total Amount</div>
          <div className="text-lg font-black text-slate-900">{formatCurrency(grandTotal)}</div>
        </div>
      </div>

      <div className="mt-7 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => window.print()} className={ghostBtn}>
          <FaPrint className="text-xs" /> Print Receipt
        </button>
        <button type="button" onClick={() => handleNotify("email")} className={ghostBtn}>
          <FaEnvelope className="text-xs" /> Send Email
        </button>
        <button type="button" onClick={goToList} className={primaryBtn}>
          View All Bookings
        </button>
      </div>
    </div>
  );

  /* ─────────────────────────── render: Booking Details ─────────────────────────── */

  const renderDetails = () => {
    const d = bookingDetail || {};
    const b = selectedBooking || {};
    return (
      <div className={panelCls}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="text-[11px] font-bold uppercase text-slate-400">Booking Reference</div>
            <h2 className="text-xl font-black text-slate-900">{d.booking_code || b.bookingCode || `BK-${b.bookingId}`}</h2>
          </div>
          <div className="flex gap-2">
            <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${statusStyle(d.booking_status || b.booking_status)}`}>
              {d.booking_status || b.booking_status || "Pending"}
            </span>
            <button onClick={() => window.print()} className={ghostBtn}>
              <FaPrint className="text-xs" /> Print
            </button>
            <button onClick={() => openEditBooking(b)} className={primaryBtn}>
              <FaEdit className="text-xs" /> Edit
            </button>
          </div>
        </div>

        {detailLoading ? (
          <div className="py-10 text-center text-slate-400">Loading booking details...</div>
        ) : (
          <div className="grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div className={sectionTitleCls}>Guest Information</div>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">Name</dt><dd className="font-bold text-slate-800">{d.guest_name || b.guest_name || "-"}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Email</dt><dd className="font-bold text-slate-800">{d.guest_email || "-"}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Mobile</dt><dd className="font-bold text-slate-800">{d.mobile || b.mobile || "-"}</dd></div>
              </dl>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div className={sectionTitleCls}>Stay Information</div>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">Check-In</dt><dd className="font-bold text-slate-800">{formatDate(d.check_in || b.check_in)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Check-Out</dt><dd className="font-bold text-slate-800">{formatDate(d.check_out || b.check_out)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Rooms</dt><dd className="font-bold text-slate-800">{b.rooms || (d.rooms || []).length || "-"}</dd></div>
              </dl>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div className={sectionTitleCls}>Payment Information</div>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">Total</dt><dd className="font-bold text-slate-800">{formatCurrency(b.totalAmount)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Paid</dt><dd className="font-bold text-emerald-600">{formatCurrency(b.paidAmount)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Balance</dt><dd className="font-bold text-rose-600">{formatCurrency(b.remainingAmount)}</dd></div>
              </dl>
            </div>

            {Array.isArray(d.rooms) && d.rooms.length > 0 && (
              <div className="md:col-span-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <div className={sectionTitleCls}>Room &amp; Tariff Information</div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px] text-left text-sm">
                    <thead className="text-[11px] font-bold uppercase text-slate-400">
                      <tr>
                        <th className="py-1.5 pr-4">Room No</th>
                        <th className="py-1.5 pr-4">Tariff</th>
                        <th className="py-1.5 pr-4">GST %</th>
                        <th className="py-1.5 pr-4">Qty</th>
                        <th className="py-1.5">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {d.rooms.map((r, i) => (
                        <tr key={i}>
                          <td className="py-1.5 pr-4 font-semibold text-slate-800">{r.room_number || r.roomNumber || r.roomNo}</td>
                          <td className="py-1.5 pr-4">{formatCurrency(r.tariff || r.price)}</td>
                          <td className="py-1.5 pr-4">{r.gst || r.gstPercent || 0}%</td>
                          <td className="py-1.5 pr-4">{r.quantity || 1}</td>
                          <td className="py-1.5 font-semibold">{formatCurrency(r.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-5">
          <button onClick={goToList} className={ghostBtn}>Back to All Bookings</button>
          <button onClick={() => openManage(b)} className={primaryBtn}>Manage This Booking</button>
        </div>
      </div>
    );
  };

  /* ─────────────────────────── render: Manage Booking ─────────────────────────── */

  const renderManage = () => {
    const b = selectedBooking || {};
    return (
      <div className={panelCls}>
        <div className="mb-5 border-b border-slate-100 pb-4">
          <div className="text-[11px] font-bold uppercase text-slate-400">Managing Booking</div>
          <h2 className="text-xl font-black text-slate-900">{b.bookingCode || `BK-${b.bookingId}`}</h2>
          <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold ${statusStyle(b.booking_status)}`}>
            {b.booking_status || "Pending"}
          </span>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
            <div className={sectionTitleCls}>Update Status</div>
            <div className="flex gap-2">
              <select value={manageStatus} onChange={(e) => setManageStatus(e.target.value)} className={fieldCls}>
                <option value="">Select New Status</option>
                <option value="Checked-In">Checked-In</option>
                <option value="Checked-Out">Checked-Out</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  if (manageStatus === "Checked-In") handleLifecycle("check-in");
                  else if (manageStatus === "Checked-Out") handleLifecycle("check-out");
                  else if (manageStatus === "Cancelled") setCancelModal({ open: true, reason: "", submitting: false });
                  else showToast("error", "Select a status", "Please choose a status to update to.");
                }}
                className={primaryBtn}
              >
                Update
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button onClick={() => openEditBooking(b)} className={ghostBtn}><FaEdit className="text-xs" /> Edit Booking</button>
              <button onClick={() => handleLifecycle("check-in")} className={ghostBtn}><FaSignInAlt className="text-xs" /> Check-In</button>
              <button onClick={() => handleLifecycle("check-out")} className={ghostBtn}><FaSignOutAlt className="text-xs" /> Check-Out</button>
              <button onClick={() => setCancelModal({ open: true, reason: "", submitting: false })} className={dangerBtn}><FaBan className="text-xs" /> Cancel Booking</button>
            </div>

            <div className="mt-5 border-t border-slate-200 pt-5">
              <div className={sectionTitleCls}>Folio &amp; History</div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => handleOpenFolio(b)} className={ghostBtn}>
                  <FaBook className="text-xs" /> Guest Folio
                </button>
                <button onClick={() => handleOpenPaymentHistory(b)} className={ghostBtn}>
                  <FaHistory className="text-xs" /> Payment History
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
              <div className={sectionTitleCls}>Payment Actions</div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setCollectModal({ open: true, amount: "", mode: "Cash", submitting: false })} className={ghostBtn}>
                  <FaMoneyBillWave className="text-xs" /> Collect Payment
                </button>
                <button onClick={handleRefund} className={ghostBtn}>
                  <FaUndo className="text-xs" /> Refund Payment
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
              <div className={sectionTitleCls}>Send Notification</div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => handleNotify("email")} className={ghostBtn}>
                  <FaEnvelope className="text-xs" /> Send Email to Guest
                </button>
                <button onClick={() => handleNotify("sms")} className={ghostBtn}>
                  <FaCommentDots className="text-xs" /> Send SMS to Guest
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end border-t border-slate-100 pt-5">
          <button onClick={goToList} className={ghostBtn}>Back to All Bookings</button>
        </div>
      </div>
    );
  };

  /* ─────────────────────────── page shell ─────────────────────────── */
const handleFlowNavigation = (page) => {
  setView(page);

  switch (page) {
    case "form":
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
      break;

    case "list":
      goToList();
      break;

    case "details":
      if (selectedBooking) {
        setView("details");
      }
      break;

    case "manage":
      if (selectedBooking) {
        setView("manage");
      }
      break;

    default:
      setView(page);
  }
};
 return (
  <div
    className="min-h-screen ..."
    style={{ fontFamily: '"Segoe UI", "Helvetica Neue", Arial, sans-serif' }}
  >
    <FlowBar
      view={view}
      onJump={handleFlowNavigation}
    />

    {view === "form" && renderForm()}
    {view === "list" && renderList()}
    {view === "details" && renderDetails()}
    {view === "manage" && renderManage()}

    {/* Feature Modals */}

    {showGroupBooking && (
      <FeatureModal
        title="Group Booking"
        subtitle="Manage group reservations"
        size="max-w-7xl"
        onClose={() => setShowGroupBooking(false)}
      >
        <GroupBooking />
      </FeatureModal>
    )}

    {showGuestProfile && (
      <FeatureModal
        title="Guest Profile"
        subtitle="Guest booking history and details"
        size="max-w-7xl"
        onClose={() => setShowGuestProfile(false)}
      >
        <GuestProfile />
      </FeatureModal>
    )}

    {showOccupancyForecast && (
      <FeatureModal
        title="Occupancy Forecast"
        subtitle="Room occupancy analytics"
        size="max-w-7xl"
        onClose={() => setShowOccupancyForecast(false)}
      >
        <OccupancyForecast />
      </FeatureModal>
    )}

    {showFolio && (
      <FeatureModal
        title="Guest Folio"
        subtitle="Charges & Payments"
        size="max-w-7xl"
        onClose={() => setShowFolio(false)}
      >
        <FolioView bookingId={selectedBookingId} />
      </FeatureModal>
    )}

  

    


      <Toast toast={toast} onClose={closeToast} />

      {showFolio && selectedBookingId && (
        <FolioView
          bookingId={selectedBookingId}
          isModal
          onClose={handleCloseFolio}
        />
      )}

      {/* cancel booking modal */}
      {cancelModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm" onClick={() => setCancelModal({ open: false, reason: "", submitting: false })}>
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-black text-slate-900">Cancel this booking?</h3>
            <p className="mt-1 text-sm text-slate-500">This will release the assigned room(s). This action cannot be undone.</p>
            <label className="mt-4 block">
              <span className="mb-1.5 block text-[13px] font-bold text-slate-700">Cancellation Reason</span>
              <textarea
                value={cancelModal.reason}
                onChange={(e) => setCancelModal((c) => ({ ...c, reason: e.target.value }))}
                rows={3}
                className={fieldCls}
                placeholder="Guest changed mind, wrong date, pricing issue..."
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setCancelModal({ open: false, reason: "", submitting: false })} className={ghostBtn}>Close</button>
              <button onClick={handleConfirmCancel} disabled={cancelModal.submitting} className={dangerBtn}>
                {cancelModal.submitting ? "Cancelling..." : "Confirm Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* collect payment modal */}
      {collectModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm" onClick={() => setCollectModal({ open: false, amount: "", mode: "Cash", submitting: false })}>
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-black text-slate-900">Collect Payment</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className={labelCls}>Amount (₹)</label>
                <input
                  type="number"
                  value={collectModal.amount}
                  onChange={(e) => setCollectModal((c) => ({ ...c, amount: e.target.value }))}
                  className={fieldCls}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className={labelCls}>Payment Mode</label>
                <select value={collectModal.mode} onChange={(e) => setCollectModal((c) => ({ ...c, mode: e.target.value }))} className={fieldCls}>
                  <option>Cash</option>
                  <option>Card</option>
                  <option>UPI</option>
                  <option>Bank Transfer</option>
                </select>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setCollectModal({ open: false, amount: "", mode: "Cash", submitting: false })} className={ghostBtn}>Close</button>
              <button onClick={handleCollectPayment} disabled={collectModal.submitting} className={primaryBtn}>
                {collectModal.submitting ? "Saving..." : "Collect"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingFlow;
