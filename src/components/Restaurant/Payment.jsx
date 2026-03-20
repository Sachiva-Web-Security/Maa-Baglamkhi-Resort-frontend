import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API from "../../api";
import { restaurantService } from "../../services/restaurantService";

const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("Cash");

  const invoice = location.state || null;

  const entityType =
    invoice?.entityType ||
    location.state?.entityType ||
    location.state?.type ||
    "Table";

  const [selectedItemIndex, setSelectedItemIndex] = useState(0);

  const selectedItem = useMemo(() => {
    if (!invoice?.items?.length) return null;
    return invoice.items[selectedItemIndex] || invoice.items[0];
  }, [invoice, selectedItemIndex]);

  if (!invoice) {
    return <div className="min-h-screen bg-slate-100 p-6">No Invoice Data</div>;
  }

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

      const billResponse = await API.post("/restaurant/bill", {
        table: invoice.table,
        subtotal: Number(invoice.subtotal || 0),
        gst: Number(invoice.gst || 0),
        total: Number(invoice.total || 0),
        paymentMethod,
        entityType,
      });

      await restaurantService.createConsumptionSale({
        referenceNo: `BILL-${billResponse.data?.id || invoice.tokenId || invoice.table}-${invoice.date || Date.now()}`,
        referenceType: "restaurant-bill",
        sourceBillId: billResponse.data?.id || null,
        entityType,
        entityRef: invoice.table,
        outlet: invoice.outlet || "Main Kitchen",
        branch: invoice.branch || "Main Branch",
        subtotal: Number(invoice.subtotal || 0),
        tax: Number(invoice.gst || 0),
        total: Number(invoice.total || 0),
        createdBy: "system",
        items: (invoice.items || []).map((item) => ({
          menuItemId: item.menuItemId || item.menu_item_id || null,
          name: item.name,
          category: item.category || "Other",
          quantity: Number(item.qty || 0),
          price: Number(item.rate || 0),
        })),
      });

      await API.put(`/restaurant/order/${invoice.table}/pay`);
      await API.put(`/token/close/${invoice.table}`);

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
    <div className="min-h-screen bg-[linear-gradient(180deg,#1a243a_0%,#24324b_100%)] p-4 sm:p-6">
      <div className="mx-auto max-w-[1380px] space-y-6">
        <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_50%,#0f766e_100%)] px-6 py-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.25)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200">Restaurant Payment</p>
              <h1 className="mt-2 text-3xl font-black">Row-wise bill review and payment card</h1>
              <p className="mt-2 text-sm text-white/80">
                {entityType} {invoice.table} | Total {formatCurrency(invoice.total)}
              </p>
            </div>
            <div className="rounded-[22px] border border-white/15 bg-white/10 px-5 py-4 backdrop-blur">
              <div className="text-xs uppercase tracking-[0.18em] text-cyan-100/80">Token</div>
              <div className="mt-2 text-2xl font-black">{invoice.tokenId || "--"}</div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-[26px] border border-slate-200/70 bg-white/95 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.1)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">Order Rows</p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">All items row-wise</h2>
              </div>
              {invoice.date ? (
                <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600">
                  {invoice.date.substring(0, 10)}
                </div>
              ) : null}
            </div>

            <div className="mt-5 overflow-hidden rounded-[22px] border border-slate-200">
              <div className="grid grid-cols-[64px_minmax(0,1.4fr)_100px_110px_120px] bg-slate-100 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-600">
                <div>No.</div>
                <div>Item</div>
                <div className="text-center">Qty</div>
                <div className="text-center">Rate</div>
                <div className="text-center">Amount</div>
              </div>

              <div className="max-h-[620px] overflow-auto">
                {invoice.items?.map((item, index) => {
                  const isActive = selectedItemIndex === index;
                  return (
                    <button
                      key={`${item.id || item.name}-${index}`}
                      type="button"
                      onClick={() => setSelectedItemIndex(index)}
                      className={`grid w-full grid-cols-[64px_minmax(0,1.4fr)_100px_110px_120px] items-center gap-2 border-t border-slate-100 px-4 py-4 text-left transition ${
                        isActive
                          ? "bg-[linear-gradient(90deg,#eff6ff_0%,#ffffff_100%)]"
                          : "bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className={`text-sm font-black ${isActive ? "text-blue-700" : "text-slate-600"}`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-900">{item.name}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          Click to open payment card
                        </div>
                      </div>
                      <div className="text-center font-semibold text-slate-700">{item.qty}</div>
                      <div className="text-center font-semibold text-slate-700">{formatCurrency(item.rate)}</div>
                      <div className="text-center font-bold text-slate-900">
                        {formatCurrency(Number(item.qty || 0) * Number(item.rate || 0))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[28px] border border-slate-200/70 bg-white/95 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.1)]">
              <div className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                <span>Secure Payment</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">Restaurant POS</span>
              </div>

              <div className="mt-4 text-center">
                <div className="text-2xl font-black text-slate-900">Payment</div>
                <div className="mt-2 text-sm font-semibold text-slate-500">{entityType}</div>
                <div className="text-lg font-bold text-slate-900">{invoice.table}</div>
                <div className="mt-3 text-4xl font-black text-emerald-600">{formatCurrency(invoice.total)}</div>
                <div className="mt-1 text-xs text-slate-500">
                  Subtotal {formatCurrency(invoice.subtotal)} | Tax {formatCurrency(invoice.gst)}
                </div>
              </div>

              <div className="mt-5 rounded-[22px] border border-slate-200 bg-[linear-gradient(135deg,#f8fbff_0%,#ffffff_100%)] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">Selected Row Card</div>
                {selectedItem ? (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-[18px] bg-white px-4 py-4 shadow-sm">
                      <div className="text-lg font-black text-slate-900">{selectedItem.name}</div>
                      <div className="mt-2 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-[16px] bg-slate-50 px-3 py-3">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Qty</div>
                          <div className="mt-1 text-sm font-black text-slate-900">{selectedItem.qty}</div>
                        </div>
                        <div className="rounded-[16px] bg-slate-50 px-3 py-3">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Rate</div>
                          <div className="mt-1 text-sm font-black text-slate-900">{formatCurrency(selectedItem.rate)}</div>
                        </div>
                        <div className="rounded-[16px] bg-slate-50 px-3 py-3">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Amount</div>
                          <div className="mt-1 text-sm font-black text-slate-900">
                            {formatCurrency(Number(selectedItem.qty || 0) * Number(selectedItem.rate || 0))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[18px] bg-white px-4 py-4 shadow-sm">
                      <div className="space-y-2 text-sm text-slate-700">
                        <div className="flex justify-between">
                          <span>Subtotal</span>
                          <span>{formatCurrency(invoice.subtotal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tax</span>
                          <span>{formatCurrency(invoice.gst)}</span>
                        </div>
                        <div className="flex justify-between text-base font-black text-slate-900">
                          <span>Total</span>
                          <span>{formatCurrency(invoice.total)}</span>
                        </div>
                        {invoice.tokenId ? (
                          <div className="text-xs text-slate-500">Token ID: {invoice.tokenId}</div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-[18px] bg-white px-4 py-5 text-sm text-slate-500 shadow-sm">
                    Koi row select nahi hai.
                  </div>
                )}
              </div>

              <div className="mt-5 rounded-[22px] border border-slate-200 bg-white p-4">
                <div className="text-sm font-semibold text-slate-700">Payment Method</div>
                <select
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="UPI">UPI</option>
                </select>
              </div>

              <div className="mt-5 flex flex-col gap-3">
                <button
                  onClick={() => navigate("/restaurant")}
                  className="w-full rounded-xl bg-slate-200 px-4 py-3 font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePayment}
                  disabled={submitting}
                  className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-3 font-semibold text-white shadow-lg disabled:opacity-60"
                >
                  {submitting ? "Processing..." : "Pay Now"}
                </button>
                <button
                  onClick={handlePrint}
                  className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-3 font-semibold text-white shadow-lg"
                >
                  Print Bill
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Payment;
