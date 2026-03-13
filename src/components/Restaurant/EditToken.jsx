import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const EditToken = () => {

  const navigate = useNavigate();
  const location = useLocation();

  const [items, setItems] = useState(location.state?.items || []);

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

      <div className="bg-white border p-5">

        {/* Token Details */}
        <div className="bg-gray-100 p-4 rounded mb-4 grid grid-cols-3 text-sm">

          <div>
            <strong>Token Code:</strong> BM5242501189
          </div>

          <div>
            <strong>Token Reference:</strong> Table / Table-6
          </div>

          <div>
            <strong>Waiter:</strong> Souvick
          </div>

        </div>

        {/* Buttons */}
        <div className="flex gap-2 mb-4">

          <button className="bg-green-500 text-white px-4 py-2 rounded text-sm">
            Add Item +
          </button>

          <button
            onClick={() => navigate("/restaurant/menu/table-6")}
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

            {/* Item Dropdown */}
            <select
              value={item.name}
              onChange={(e) =>
                handleChange(item.id, "name", e.target.value)
              }
              className="border p-1 rounded"
            >
              <option>Paneer Pakoda (8pcs)</option>
              <option>Paneer Do Pyaza</option>
              <option>Jeera Rice</option>
              <option>Egg Dopyaza</option>
              <option>Egg Masala</option>
            </select>


            {/* Quantity */}
            <input
              type="number"
              value={item.qty}
              className="border p-1 w-16 rounded"
              onChange={(e) =>
                handleChange(item.id, "qty", e.target.value)
              }
            />


            {/* Rate */}
            <input
              type="number"
              value={item.rate}
              className="border p-1 w-20 rounded"
              onChange={(e) =>
                handleChange(item.id, "rate", e.target.value)
              }
            />


            {/* Amount */}
            <div>
              {Number(item.qty) * Number(item.rate)}
            </div>


            {/* Notes */}
            <input
              type="text"
              placeholder="Notes"
              className="border p-1 rounded"
            />


            {/* Delete Button */}
            <button
              onClick={() => deleteItem(item.id)}
              className="bg-red-500 text-white px-2 py-1 rounded"
            >
              🗑
            </button>

          </div>

        ))}


        {/* Reason Section */}
        <div className="mt-6 text-sm">

          <div className="font-semibold mb-2">
            Reason for Edit
          </div>

          <div className="grid grid-cols-2 gap-2">

            <label>
              <input type="checkbox" /> Guest Cancelled for Quality
            </label>

            <label>
              <input type="checkbox" /> High Price
            </label>

            <label>
              <input type="checkbox" /> Fly in Food
            </label>

            <label>
              <input type="checkbox" /> Change in Order
            </label>

            <label>
              <input type="checkbox" /> Food Service Delayed
            </label>

          </div>

        </div>

      </div>

    </div>

  );
};

export default EditToken;