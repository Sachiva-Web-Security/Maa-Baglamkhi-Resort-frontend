import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { RestaurantContext } from "../../Context/RestaurantContext";

const TablePage = () => {

  const navigate = useNavigate();

  const { tables, addTable, getTableStatus, setSelectedTable } = useContext(RestaurantContext);

  const [tableNo, setTableNo] = useState("");

  const handleAddTable = async () => {

    if (!tableNo.trim()) return;

    try {

      await addTable(tableNo);

      setTableNo("");

    } catch (err) {

      alert(err.message);

    }

  };

  const runningTables = tables.filter(
    t => getTableStatus(t.name) === "Occupied"
  ).length;

  const blankTables = tables.filter(
    t => getTableStatus(t.name) === "Available"
  ).length;

  const pendingInvoice = 0;

  const getColor = (status) => {

    if (status === "Occupied") return "bg-green-200";

    if (status === "Due") return "bg-red-200";

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
          onClick={handleAddTable}
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

        {tables.map((table, i) => {

          const status = getTableStatus(table.name);

          return (

            <div
              key={i}
              className={`p-3 rounded border ${getColor(status)}`}
            >

              <div className="font-semibold mb-2 text-center">
                Table {table.name}
              </div>

              {/* STATUS BADGE */}
              <div className="text-center mb-2">
                <span
                  className={`px-2 py-1 rounded text-xs font-bold ${
                    status === "Occupied"
                      ? "bg-red-500 text-white"
                      : "bg-green-500 text-white"
                  }`}
                >
                  {status}
                </span>
              </div>

              <div className="flex flex-col gap-2">

                <button
                  className="bg-teal-500 text-white px-2 py-1 rounded text-xs"
                  onClick={() => {
                    setSelectedTable(table.name);
                    navigate(`/restaurant/token/${table.name}`);
                  }}
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
                  onClick={() => {
                    setSelectedTable(table.name);
                    navigate(`/restaurant/token-items/${table.name}`);
                  }}
                >
                  Token Items
                </button>

              </div>

            </div>

          );

        })}

      </div>

    </div>

  );

};

export default TablePage;