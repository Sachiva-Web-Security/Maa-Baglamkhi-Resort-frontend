import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
const TokenItemsPage = () => {
const { table } = useParams();
const navigate = useNavigate();

const [items, setItems] = useState([]);

useEffect(() => {
  const saved = localStorage.getItem(`token-${table}`);
  if (saved) {
    setItems(JSON.parse(saved));
  }
}, [table]);
  useEffect(() => {

  const loadItems = () => {
    const saved = localStorage.getItem(`token-${table}`);
    if (saved) {
      setItems(JSON.parse(saved));
    } else {
      setItems([]);
    }
  };

  window.addEventListener("focus", loadItems);

  return () => {
    window.removeEventListener("focus", loadItems);
  };

}, [table]);

  return (

    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">

      <div className="bg-white w-[600px] rounded shadow">

        <div className="p-3 border-b font-semibold">
          Table - {table}
        </div>

        <div className="p-4">

          <h4 className="font-semibold mb-3">
            All Token Items (Non-Invoiced)
          </h4>

          <table className="w-full text-sm">

            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Item Name</th>
                <th className="p-2 text-center">Quantity</th>
                <th className="p-2 text-right">Amount</th>
              </tr>
            </thead>

            <tbody>

              {/* Example rows */}
{items.length === 0 ? (
  <tr>
    <td colSpan="3" className="text-center p-3 text-gray-400">
      No items added
    </td>
  </tr>
) : (
  items.map((item) => (
    <tr key={item.id} className="border-b">
      <td className="p-2">{item.name}</td>
      <td className="p-2 text-center">{item.qty}</td>
      <td className="p-2 text-right">
        ₹ {Number(item.qty) * Number(item.rate)}
      </td>
    </tr>
  ))
)}
           

            </tbody>

          </table>

          <div className="mt-4 text-right">

            <button
              className="bg-red-500 text-white px-4 py-2 rounded"
              onClick={() => navigate("/restaurant")}
            >
              Close
            </button>

<button
    className="bg-blue-600 text-white px-4 py-2 rounded"
    onClick={() =>
      navigate(`/restaurant/edit-token/${table}`)
    }
  >
    Edit Token
  </button>



          </div>

        </div>

      </div>

    </div>

  );

};

export default TokenItemsPage;