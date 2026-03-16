import React, { useState, useMemo, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect } from "react";

const EditToken = () => {

  const { table } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const printRef = useRef();

  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem(`token-${table}`);
    if (saved) return JSON.parse(saved);
    return location.state?.items || [];
  });

  useEffect(() => {
    if (location.state?.items) {
      setItems(location.state.items);
    }
  }, [location.state]);

  useEffect(() => {
    localStorage.setItem(`token-${table}`, JSON.stringify(items));
  }, [items, table]);

  const deleteItem = (id) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const handleChange = (id, field, value) => {

    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );

  };

  // SUMMARY CALCULATION

  const subtotal = useMemo(() => {
    return items.reduce(
      (sum, item) => sum + Number(item.qty) * Number(item.rate),
      0
    );
  }, [items]);

  const tax = subtotal * 0.05;
  const total = subtotal + tax;

  // PRINT FUNCTION

  const handlePrint = () => {

    const date = new Date().toLocaleString();

    const rows = items.map((item) => `
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
    .center{ text-align:center; }
    hr{ border-top:1px dashed black; }
    table{ width:100%; font-size:12px; }
    td{ padding:3px 0; }
    .right{ text-align:right; }
    </style>

    </head>

    <body>

    <div class="center">
    <h3>MAA BAGLAMUKHI RESORT</h3>
    <div>HOTEL & RESTAURANT</div>
    <div>BANDRA EAST, MUMBAI</div>
    </div>

    <hr/>

    <div>Invoice No : BM5242504003</div>
    <div>Date : ${date}</div>
    <div>Table : ${table}</div>

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
    <td class="right">₹${subtotal.toFixed(2)}</td>
    </tr>

    <tr>
    <td>CGST 2.5%</td>
    <td class="right">₹${(subtotal*0.025).toFixed(2)}</td>
    </tr>

    <tr>
    <td>SGST 2.5%</td>
    <td class="right">₹${(subtotal*0.025).toFixed(2)}</td>
    </tr>

    <tr>
    <td><b>TOTAL</b></td>
    <td class="right"><b>₹${total.toFixed(2)}</b></td>
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

  // UPDATE FUNCTION

  const handleUpdate = () => {

    if(items.length === 0){
      alert("No items to update");
      return;
    }

    console.log("Updated Items:", items);

    alert("Token Updated Successfully");

  };

  // CREATE INVOICE

  const handleInvoice = () => {

    const invoiceData = {
      table,
      items,
      total,

      // ✅ FIXED DATE FORMAT
      date: new Date().toISOString(),

      id: Date.now()
    };

    // ✅ payment refresh safe
    localStorage.setItem(
      "currentInvoice",
      JSON.stringify(invoiceData)
    );

    navigate("/restaurant/payment", {
      state: invoiceData
    });

  };

  return (

    <div className="bg-gray-100 min-h-screen p-6">

      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 mb-3">
        Home &gt; Restaurant Tokens
      </div>

      {/* Header */}
      <div className="bg-blue-700 text-white px-4 py-2 rounded-t">
        Edit Token
      </div>

      <div className="bg-white border p-5" ref={printRef}>

        {/* Token Details */}
        <div className="bg-gray-100 p-4 rounded mb-4 grid grid-cols-3 text-sm">

          <div>
            <strong>Token Code:</strong> BM5242501189
          </div>

          <div>
           <strong>Token Reference:</strong> Table / Table-{table}
          </div>

          <div>
            <strong>Waiter:</strong> Souvick
          </div>

        </div>

        {/* Buttons */}
        <div className="flex gap-2 mb-4">

          <button
            onClick={() =>
              navigate(`/restaurant/menu/${table}`, {
                state: { existingItems: items }
              })
            }
            className="bg-red-500 text-white px-4 py-2 rounded text-sm"
          >
            Menu Card
          </button>

        </div>

        {/* Table Header */}
        <div className="grid grid-cols-6 font-semibold text-sm border-b pb-2">

          <div>Item</div>
          <div>Quantity</div>
          <div>Rate</div>
          <div>Amount</div>
          <div>Notes</div>
          <div></div>

        </div>

        {/* Item Rows */}

        {items.map((item) => (

          <div
            key={item.id}
            className="grid grid-cols-6 items-center py-2 border-b text-sm gap-2"
          >

            <input
              value={item.name}
              className="border p-1 rounded"
              onChange={(e) =>
                handleChange(item.id, "name", e.target.value)
              }
            />

            <input
              type="number"
              value={item.qty}
              className="border p-1 w-16 rounded"
              onChange={(e) =>
                handleChange(item.id, "qty", e.target.value)
              }
            />

            <input
              type="number"
              value={item.rate}
              className="border p-1 w-20 rounded"
              onChange={(e) =>
                handleChange(item.id, "rate", e.target.value)
              }
            />

            <div>
              ₹ {Number(item.qty) * Number(item.rate)}
            </div>

            <input
              type="text"
              placeholder="Notes"
              className="border p-1 rounded"
            />

            <button
              onClick={() => deleteItem(item.id)}
              className="bg-red-500 text-white px-2 py-1 rounded"
            >
              🗑
            </button>

          </div>

        ))}

        {/* SUMMARY */}

        <div className="mt-6 border-t pt-4">

          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>₹ {subtotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span>Tax (5%)</span>
            <span>₹ {tax.toFixed(2)}</span>
          </div>

          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>₹ {total.toFixed(2)}</span>
          </div>

        </div>

      </div>

      {/* Bottom Buttons */}

      <div className="flex gap-3 mt-6">

        <button
          onClick={handlePrint}
          className="bg-yellow-500 text-white px-4 py-2 rounded"
        >
          Print Token
        </button>

        <button
          onClick={handleUpdate}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Update
        </button>

        <button
          onClick={handleInvoice}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Create Invoice
        </button>

        <button
          onClick={() => navigate("/restaurant")}
          className="bg-gray-400 text-white px-4 py-2 rounded"
        >
          Back to Dashboard
        </button>

      </div>

    </div>

  );

};

export default EditToken;