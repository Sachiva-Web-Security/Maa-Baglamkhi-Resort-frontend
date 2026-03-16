import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

const Payment = () => {

  const navigate = useNavigate();
  const location = useLocation();

  // 🔹 invoice read from navigation OR localStorage
  const invoice =
    location.state ||
    JSON.parse(localStorage.getItem("currentInvoice"));

  if (!invoice) {
    return <div>No Invoice Data</div>;
  }

  // 🔹 PRINT FUNCTION
  const handlePrint = () => {

    const rows = invoice.items.map((item) => `
      <tr>
        <td>${item.name}</td>
        <td style="text-align:center">${item.qty}</td>
        <td style="text-align:right">${item.rate}</td>
        <td style="text-align:right">${(item.qty * item.rate).toFixed(2)}</td>
      </tr>
    `).join("");

    const printHTML = `
    <html>
    <head>
    <title>Invoice</title>

    <style>

    body{
      font-family: monospace;
      width:300px;
      margin:auto;
    }

    .center{
      text-align:center;
    }

    hr{
      border-top:1px dashed black;
    }

    table{
      width:100%;
      font-size:12px;
    }

    td{
      padding:3px 0;
    }

    .right{
      text-align:right;
    }

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
    <td><b>TOTAL</b></td>
    <td class="right"><b>₹${invoice.total.toFixed(2)}</b></td>
    </tr>

    </table>

    <hr/>

    <div class="center">
    THANK YOU FOR VISIT
    </div>

    </body>
    </html>
    `;

    const win = window.open("", "", "width=400,height=600");

    win.document.write(printHTML);

    win.document.close();

    win.print();
  };

  // 🔹 PAYMENT FUNCTION
  const handlePayment = () => {

    const savedInvoices =
      JSON.parse(localStorage.getItem("invoices")) || [];

    savedInvoices.push(invoice);

    localStorage.setItem(
      "invoices",
      JSON.stringify(savedInvoices)
    );

    // 🔹 remove temporary invoice
    localStorage.removeItem("currentInvoice");

    alert("Payment Successful!");

    handlePrint();

    navigate("/restaurant");
  };

  return (

    <div className="flex justify-center items-center min-h-screen bg-gray-100">

      <div className="bg-white p-6 rounded-xl shadow-lg w-96">

        <h2 className="text-2xl font-bold mb-4 text-center">
          Payment
        </h2>

        <div className="text-center mb-4">

          <p className="text-lg font-semibold">
            Table {invoice.table}
          </p>

          <p className="text-3xl font-bold text-green-600">
            ₹{invoice.total}
          </p>

        </div>

        <div className="flex flex-col gap-3">

          <button
            onClick={() => navigate("/restaurant")}
            className="w-full bg-gray-300 px-4 py-2 rounded"
          >
            Cancel
          </button>

          <button
            onClick={handlePayment}
            className="w-full bg-green-600 text-white px-4 py-2 rounded"
          >
            Pay Now
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