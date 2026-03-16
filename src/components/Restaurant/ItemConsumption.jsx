import React, { useState } from "react";
import API from "../../api";

const ItemConsumption = () => {

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [groupBy, setGroupBy] = useState("Item");
  const [data, setData] = useState({});

  const loadReport = async () => {
    let orders = [];

    try {
      const res = await API.get("/kitchen/orders");
      orders = Array.isArray(res.data) ? res.data : [];
    } catch (error) {
      console.error("Failed to load kitchen orders for report:", error);
      setData({});
      return;
    }

    const result = {};

    orders.forEach((order) => {

      const orderDate = new Date(order.created_at);

      if (startDate) {
        const start = new Date(startDate);
        if (orderDate < start) return;
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (orderDate > end) return;
      }

      order.items.forEach((item) => {

        const key =
          groupBy === "Item"
            ? item.name
            : item.category || "Items";

        if (!result[key]) {

          result[key] = {
            name: key,
            qty: 0
          };

        }

        result[key].qty += Number(item.qty || 0);

      });

    });

    setData(result);

  };

  return (

    <div className="bg-gray-100 min-h-screen p-6">

      {/* Breadcrumb */}

      <div className="text-sm text-gray-500 mb-2">
        Home &gt; Item Consumption Report
      </div>

      {/* Header */}

      <div className="bg-blue-600 text-white px-4 py-2 rounded-t">
        Item Consumption Report
      </div>

      {/* Filters */}

      <div className="bg-white border p-4">

        <div className="grid grid-cols-6 gap-4 items-end">

          <div>

            <label className="text-sm">Start Date</label>

            <input
              type="date"
              className="border p-2 w-full rounded"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />

          </div>

          <div>

            <label className="text-sm">End Date</label>

            <input
              type="date"
              className="border p-2 w-full rounded"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />

          </div>

          <div>

            <label className="text-sm">Group By</label>

            <select
              className="border p-2 w-full rounded"
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
            >
              <option value="Item">Item</option>
              <option value="Category">Category</option>
            </select>

          </div>

          <div>

            <label className="text-sm">POS</label>

            <select className="border p-2 w-full rounded">
              <option>All POS</option>
            </select>

          </div>

          <div>

            <label className="text-sm">Token Type</label>

            <select className="border p-2 w-full rounded">
              <option>Regular Tokens</option>
              <option>NC Tokens</option>
            </select>

          </div>

          <div className="flex gap-2">

            <button
              onClick={loadReport}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              Get Report
            </button>

            <button
              onClick={() => window.print()}
              className="bg-orange-500 text-white px-4 py-2 rounded"
            >
              Print
            </button>

          </div>

        </div>

      </div>

      {/* Table */}

      <div className="bg-white border mt-4">

        {Object.keys(data).length === 0 && (

          <div className="p-6 text-center text-gray-500">
            No Data Found
          </div>

        )}

        {Object.values(data).map((item, index) => (

          <div
            key={index}
            className="flex justify-between px-4 py-2 border-b text-sm"
          >

            <span>{item.name}</span>

            <span>{item.qty}</span>

          </div>

        ))}

      </div>

    </div>

  );

};

export default ItemConsumption;
