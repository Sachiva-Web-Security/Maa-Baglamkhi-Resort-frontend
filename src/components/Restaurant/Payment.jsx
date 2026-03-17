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
    body { font-family: monospace; width:300px; margin:auto; }
    .center { text-align:center; }
    hr { border-top:1px dashed black; }
    table { width:100%; font-size:12px; }
    td { padding:3px 0; }
    .right { text-align:right; }
    </style>
    </head>
    <body>
    <div class="center">
      <h3>MAA BAGLAMUKHI RESORT</h3>
      <div>HOTEL & RESTAURANT</div>
    </div>
    <hr/>
    <div>Date : ${invoice.date}</div>
    <div>Table : ${invoice.table}</div>
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
      });

      await API.post("/restaurant/bill", {
        table: invoice.table,
        subtotal: Number(invoice.subtotal || 0),
        gst: Number(invoice.gst || 0),
        total: Number(invoice.total || 0),
        paymentMethod,
      });

      await API.put(`/restaurant/order/${invoice.table}/pay`);
      await API.put(`/token/close/${invoice.table}`);

      const savedInvoices = JSON.parse(localStorage.getItem("invoices") || "[]");
      savedInvoices.push({ ...invoice, paymentMethod, status: "Paid" });
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
      <div className="bg-white p-6 rounded-xl shadow-lg w-96">
        <h2 className="text-2xl font-bold mb-4 text-center">Payment</h2>

        <div className="text-center mb-4">
          <p className="text-lg font-semibold">Table {invoice.table}</p>
          <p className="text-3xl font-bold text-green-600">Rs. {invoice.total}</p>
        </div>

        <label className="block text-sm font-medium mb-2">Payment Method</label>
        <select
          value={paymentMethod}
          onChange={(event) => setPaymentMethod(event.target.value)}
          className="w-full border p-2 rounded mb-4"
        >
          <option value="Cash">Cash</option>
          <option value="Card">Card</option>
          <option value="UPI">UPI</option>
        </select>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate("/restaurant")}
            className="w-full bg-gray-300 px-4 py-2 rounded"
          >
            Cancel
          </button>

          <button
            onClick={handlePayment}
            disabled={submitting}
            className="w-full bg-green-600 text-white px-4 py-2 rounded disabled:opacity-60"
          >
            {submitting ? "Processing..." : "Pay Now"}
          </button>

          <button
            onClick={handlePrint}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded"
          >
            Print Bill
          </button>
        </div>
      </div>
    </div>
  );
};

export default Payment;
