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

const CustomerInvoicePage = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const printRef = useRef(null);
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const itemRows = useMemo(() => (Array.isArray(invoice?.items) ? invoice.items : []), [invoice?.items]);

  const handlePrint = () => window.print();

  const handleDownloadPdf = () => {
    if (!invoice) return;

    const doc = new jsPDF();
    let y = 18;

    doc.setFontSize(18);
    doc.text("Customer Invoice", 14, y);
    y += 10;

    doc.setFontSize(11);
    [
      `Invoice No: ${invoice.invoiceNo || "-"}`,
      `Customer: ${invoice.customerName || "-"}`,
      `Room: ${invoice.roomNumber || "-"}`,
      `Check-In: ${formatDate(invoice.checkIn)}`,
      `Check-Out: ${formatDate(invoice.checkOut)}`,
      `Date: ${formatDate(invoice.date)}`,
    ].forEach((line) => {
      doc.text(line, 14, y);
      y += 7;
    });

    y += 3;
    doc.text("Items", 14, y);
    y += 8;

    itemRows.forEach((item, index) => {
      const text = `${index + 1}. ${item.name} | ${item.quantity} x ${Number(item.price || 0).toFixed(2)} = ${Number(item.total || 0).toFixed(2)}`;
      doc.text(text.slice(0, 180), 14, y);
      y += 7;
      if (y > 270) {
        doc.addPage();
        y = 18;
      }
    });

    y += 6;
    [
      `Subtotal: ${Number(invoice.subtotal || 0).toFixed(2)}`,
      `GST (5%): ${Number(invoice.tax || 0).toFixed(2)}`,
      `Discount: ${Number(invoice.discount || 0).toFixed(2)}`,
      `Total Amount: ${Number(invoice.totalAmount || 0).toFixed(2)}`,
      `Payment Status: ${invoice.paymentStatus || "Pending"}`,
    ].forEach((line) => {
      doc.text(line, 14, y);
      y += 7;
    });

    doc.save(`${invoice.invoiceNo || `invoice-${customerId}`}.pdf`);
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
    <div className="min-h-screen bg-[linear-gradient(135deg,#f8fbff_0%,#f7fffb_52%,#fff8ef_100%)] p-4 sm:p-6">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #invoice-print, #invoice-print * { visibility: visible; }
          #invoice-print { position: absolute; left: 0; top: 0; width: 100%; }
          .invoice-no-print { display: none !important; }
        }
      `}</style>
      <div className="mx-auto max-w-6xl space-y-5">
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

        <section id="invoice-print" ref={printRef} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Invoice Summary</div>
              <div className="text-3xl font-black text-slate-900">{invoice?.customerName || "Guest"}</div>
              <div className="text-sm text-slate-600">Invoice No: {invoice?.invoiceNo || "--"}</div>
              <div className="text-sm text-slate-600">Room No: {invoice?.roomNumber || "--"}</div>
              <div className="text-sm text-slate-600">Date: {formatDate(invoice?.date)}</div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Check-In</div>
                <div className="mt-2 text-lg font-black text-slate-900">{formatDate(invoice?.checkIn)}</div>
              </div>
              <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Check-Out</div>
                <div className="mt-2 text-lg font-black text-slate-900">{formatDate(invoice?.checkOut)}</div>
              </div>
              <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Payment Status</div>
                <div className="mt-2 text-lg font-black text-slate-900">{invoice?.paymentStatus || "Pending"}</div>
              </div>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto rounded-[22px] border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {itemRows.map((item, index) => (
                  <tr key={`${item.name}-${index}`} className="border-t border-slate-200">
                    <td className="px-4 py-4 font-semibold text-slate-900">{item.name}</td>
                    <td className="px-4 py-4 text-slate-600">{item.category}</td>
                    <td className="px-4 py-4 text-slate-600">{formatCurrency(item.price)}</td>
                    <td className="px-4 py-4 text-slate-600">{item.quantity}</td>
                    <td className="px-4 py-4 font-bold text-slate-900">{formatCurrency(item.total)}</td>
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

          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Guest Contact</div>
              <div className="mt-3 space-y-1 text-sm text-slate-700">
                <div>Name: {invoice?.customerName || "--"}</div>
                <div>Phone: {invoice?.phone || "--"}</div>
                <div>Booking ID: {invoice?.bookingId || "--"}</div>
              </div>
            </div>

            <div className="rounded-[22px] border border-slate-200 bg-slate-950 p-5 text-white">
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
                    <span className="text-base font-semibold">Final Total</span>
                    <span className="text-2xl font-black">{formatCurrency(invoice?.totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default CustomerInvoicePage;
