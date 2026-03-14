import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const TablePage = () => {

  const navigate = useNavigate();

  const [tables, setTables] = useState(() => {
    const saved = localStorage.getItem("restaurantTables");
    return saved ? JSON.parse(saved) : [
      { name: "201", status: "blank" },
      { name: "105", status: "blank" },
      { name: "103", status: "blank" },
      { name: "101", status: "blank" },
      { name: "102", status: "blank" },
    ];
  });

  const [tableNo, setTableNo] = useState("");

  // save to localStorage whenever tables change
  useEffect(() => {
    localStorage.setItem("restaurantTables", JSON.stringify(tables));
  }, [tables]);

  const addTable = () => {

    if (!tableNo.trim()) return;

    const exists = tables.find(t => t.name === tableNo);

    if (exists) {
      alert("Table already exists");
      return;
    }

    const newTable = {
      name: tableNo,
      status: "blank",
    };

    setTables([...tables, newTable]);
    setTableNo("");
  };

  const runningTables = tables.filter(t => t.status === "running").length;
  const blankTables = tables.filter(t => t.status === "blank").length;
  const pendingInvoice = tables.filter(t => t.status === "due").length;

  const getColor = (status) => {
    if (status === "running") return "bg-green-200";
    if (status === "due") return "bg-red-200";
    return "bg-gray-100";
  };

  return (
    <div className="space-y-6">

      <h2 className="text-xl font-bold">
        Restaurant Dashboard
      </h2>

      {/* ADD TABLE */}

      <div className="flex gap-3">

        <input
          value={tableNo}
          onChange={(e) => setTableNo(e.target.value)}
          placeholder="Enter Table No"
          className="border p-2 rounded"
        />

        <button
          onClick={addTable}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Add Table
        </button>

      </div>

      {/* SUMMARY */}

      <div className="grid grid-cols-2 gap-4">

        <div className="bg-blue-100 rounded p-4">

          <h3 className="font-semibold mb-2">Table</h3>

          <div className="flex justify-between">
            <span>Running Tables</span>
            <span>{runningTables}</span>
          </div>

          <div className="flex justify-between">
            <span>Blank Tables</span>
            <span>{blankTables}</span>
          </div>

        </div>

        <div className="bg-yellow-200 rounded p-4">

          <h3 className="font-semibold mb-2">
            Room
          </h3>

          <div className="flex justify-between">
            <span>Invoice Pending</span>
            <span>{pendingInvoice}</span>
          </div>

        </div>

      </div>

      {/* TABLE GRID */}

      <div className="grid grid-cols-6 gap-4">

        {tables.map((table, i) => (

          <div
            key={i}
            className={`p-3 rounded border ${getColor(table.status)}`}
          >

            <div className="font-semibold mb-2 text-center">
              {table.name}
            </div>

            <div className="flex flex-col gap-2">

              <button
                className="bg-teal-500 text-white px-2 py-1 rounded text-xs"
                onClick={() => navigate(`/restaurant/token/${table.name}`)}
              >
                + Token
              </button>

              <button
                className="bg-purple-500 text-white px-2 py-1 rounded text-xs"
              >
                + NC Token
              </button>

                <button
                 className="bg-orange-500 text-white px-2 py-1 rounded text-xs"
                  onClick={() => navigate(`/restaurant/token-items/${table.name}`)}
                  >
                     Token Items
  </button>



            </div>

          </div>

        ))}

      </div>

    </div>
  );
};

export default TablePage;