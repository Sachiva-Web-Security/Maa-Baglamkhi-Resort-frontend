import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API from "../../api";

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("Cash");

  const invoice =
    location.state || JSON.parse(localStorage.getItem("currentInvoice") || "null");

  if (!invoice) {
    return <div>No Invoice Data</div>;
  }

  // Resolve whether this invoice belongs to a Table or Room
  const entityType =
    invoice.entityType ||
    location.state?.entityType ||
    location.state?.type ||
    (invoice.table && localStorage.getItem(`entityType:${invoice.table}`)) ||
    "Table";

  const handlePrint = () => {
    const rows = invoice.items
      .map(
        (item) => `
      <tr>
        <td>${item.name}</td>
        <td style="text-align:center">${item.qty}</td>
        <td style="text-align:right">${item.rate}</td>
        <td style="text-align:right">${(item.qty * item.rate).toFixed(2)}</td>
      </tr>
    `,
      )
      .join("");

    const printHTML = `
    <html>
    <head>
    <title>Invoice</title>
    <style>
    body { font-family: 'Segoe UI', sans-serif; width:320px; margin:auto; color:#0f172a; }
    .center { text-align:center; }
    hr { border-top:1px dashed #cbd5e1; }
    table { width:100%; font-size:13px; }
    td { padding:4px 0; }
    .right { text-align:right; }
    .pill { display:inline-block; padding:4px 10px; border-radius:999px; font-size:11px; background:#eef2ff; color:#4338ca; }
    </style>
    </head>
    <body>
    <div class="center">
      <h3>MAA BAGLAMUKHI RESORT</h3>
      <div>HOTEL & RESTAURANT</div>
    </div>
    <hr/>
    <div>Date : ${invoice.date}</div>
    <div>${entityType} : ${invoice.table}</div>
    <div class="pill" style="margin-top:4px;">Payment Method: ${paymentMethod}</div>
    <hr/>
    <table>
      <tr>
        <td><b>ITEM</b></td>
        <td align="center"><b>QTY</b></td>
        <td align="right"><b>RATE</b></td>
        <td align="right"><b>AMT</b></td>
      </tr>
      ${rows}
    </table>
    <hr/>
    <table>
      <tr>
        <td>Sub Total</td>
        <td class="right">${Number(invoice.subtotal || 0).toFixed(2)}</td>
      </tr>
      <tr>
        <td>GST</td>
        <td class="right">${Number(invoice.gst || 0).toFixed(2)}</td>
      </tr>
      <tr>
        <td><b>TOTAL</b></td>
        <td class="right"><b>${Number(invoice.total || 0).toFixed(2)}</b></td>
      </tr>
    </table>
    <hr/>
    <div class="center">THANK YOU FOR VISIT</div>
    </body>
    </html>
    `;

    const win = window.open("", "", "width=400,height=600");
    win.document.write(printHTML);
    win.document.close();
    win.print();
  };

  const handlePayment = async () => {
    try {
      setSubmitting(true);

      await API.post("/payment", {
        table: invoice.table,
        total: Number(invoice.total || 0),
        method: paymentMethod,
        entityType,
      });

      await API.post("/restaurant/bill", {
        table: invoice.table,
        subtotal: Number(invoice.subtotal || 0),
        gst: Number(invoice.gst || 0),
        total: Number(invoice.total || 0),
        paymentMethod,
        entityType,
      });

      await API.put(`/restaurant/order/${invoice.table}/pay`);
      await API.put(`/token/close/${invoice.table}`);

      const savedInvoices = JSON.parse(localStorage.getItem("invoices") || "[]");
      savedInvoices.push({ ...invoice, entityType, paymentMethod, status: "Paid" });
      localStorage.setItem("invoices", JSON.stringify(savedInvoices));
      localStorage.removeItem("currentInvoice");

      window.dispatchEvent(new Event("tokenUpdated"));

      alert("Payment Successful!");
      handlePrint();
      navigate("/restaurant");
    } catch (error) {
      alert(error.response?.data?.message || "Payment backend se save nahi ho paaya.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="w-full max-w-lg">
        <div className="rounded-3xl bg-gradient-to-b from-white via-slate-50 to-white shadow-[0_20px_60px_rgba(15,23,42,0.16)] border border-slate-100 overflow-hidden">
          <div className="p-6 md:p-8">
            <div className="flex items-center justify-between mb-2 text-xs uppercase tracking-[0.2em] text-slate-400">
              <span>Secure Payment</span>
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700">Restaurant POS</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 text-center">Payment</h2>

            <div className="text-center my-4 space-y-1">
              <p className="text-sm text-slate-500 font-semibold">{entityType}</p>
              <p className="text-lg font-bold text-slate-900">{invoice.table}</p>
              <p className="text-4xl font-extrabold text-emerald-600">₹ {Number(invoice.total || 0).toLocaleString("en-IN")}</p>
              <p className="text-xs text-slate-500">Subtotal ₹{Number(invoice.subtotal || 0).toLocaleString("en-IN")} • Tax ₹{Number(invoice.gst || 0).toLocaleString("en-IN")}</p>
            </div>

            {/* Order details */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-inner p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-slate-700">Order Details</div>
                {invoice.date && (
                  <div className="text-xs text-slate-500">Date: {invoice.date.substring(0, 10)}</div>
                )}
              </div>
              <div className="max-h-48 overflow-auto pr-1">
                <table className="w-full text-sm text-slate-700">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr>
                      <th className="text-left pb-2">Item</th>
                      <th className="text-center pb-2">Qty</th>
                      <th className="text-right pb-2">Rate</th>
                      <th className="text-right pb-2">Amt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoice.items?.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2">{item.name}</td>
                        <td className="py-2 text-center">{item.qty}</td>
                        <td className="py-2 text-right">₹{Number(item.rate || 0).toLocaleString("en-IN")}</td>
                        <td className="py-2 text-right">
                          ₹{Number(item.qty * item.rate || 0).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 space-y-1 text-sm text-slate-700">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{Number(invoice.subtotal || 0).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>₹{Number(invoice.gst || 0).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-base font-semibold text-slate-900">
                  <span>Total</span>
                  <span>₹{Number(invoice.total || 0).toLocaleString("en-IN")}</span>
                </div>
                {invoice.tokenId && (
                  <div className="text-xs text-slate-500">Token ID: {invoice.tokenId}</div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-inner p-4 mb-4">
              <div className="text-sm font-medium text-slate-700 mb-2">Payment Method</div>
              <select
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="UPI">UPI</option>
              </select>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate("/restaurant")}
                className="w-full bg-slate-200 text-slate-700 px-4 py-3 rounded-xl font-semibold hover:bg-slate-300 transition"
              >
                Cancel
              </button>

              <button
                onClick={handlePayment}
                disabled={submitting}
                className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white px-4 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition disabled:opacity-60"
              >
                {submitting ? "Processing..." : "Pay Now"}
              </button>

              <button
                onClick={handlePrint}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition"
              >
                Print Bill
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;
