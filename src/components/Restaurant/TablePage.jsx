import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { FiPlusCircle, FiHome, FiGrid, FiRefreshCw } from "react-icons/fi";
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

  const runningTables = tables.filter((t) => getTableStatus(t.name) === "Occupied").length;
  const blankTables = tables.filter((t) => getTableStatus(t.name) === "Available").length;
  const pendingInvoice = 0;

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="rounded-3xl bg-gradient-to-r from-indigo-900 via-blue-800 to-cyan-700 text-white shadow-2xl shadow-blue-500/30 border border-white/10 p-6 flex flex-wrap justify-between gap-4">
        <div>
          <p className="uppercase text-xs tracking-[0.3em] text-white/70">Restaurant</p>
          <h2 className="text-2xl font-bold mt-1">Dashboard</h2>
          <p className="text-sm text-white/80 mt-1">Quickly view and manage tables and tokens.</p>
        </div>
        <div className="flex items-end gap-3 w-full md:w-auto">
          <div className="flex-1 md:flex-none">
            <label className="text-xs text-white/80">Add Table</label>
            <div className="flex gap-2 mt-1">
              <input
                value={tableNo}
                onChange={(e) => setTableNo(e.target.value)}
                placeholder="Enter Table No"
                className="w-full md:w-56 bg-white/10 border border-white/30 text-white placeholder-white/60 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/70"
              />
              <button
                onClick={handleAddTable}
                className="inline-flex items-center gap-2 bg-white text-slate-900 font-semibold px-4 py-2 rounded-xl shadow-md hover:shadow-lg transition"
              >
                <FiPlusCircle /> Add
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-xl">
            <FiHome />
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Running Tables</p>
            <p className="text-2xl font-bold text-slate-900">{runningTables}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl">
            <FiGrid />
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Blank Tables</p>
            <p className="text-2xl font-bold text-slate-900">{blankTables}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-xl">
            <FiRefreshCw />
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Invoice Pending</p>
            <p className="text-2xl font-bold text-slate-900">{pendingInvoice}</p>
          </div>
        </div>
      </div>

      {/* Table grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {tables.map((table, i) => {
          const status = getTableStatus(table.name);
          const occupied = status === "Occupied";
          return (
            <div
              key={i}
              className="rounded-3xl border border-slate-100 bg-gradient-to-br from-white via-slate-50 to-white shadow-[0_18px_40px_rgba(15,23,42,0.08)] hover:shadow-[0_22px_50px_rgba(37,99,235,0.18)] transition duration-200"
            >
              <div className="p-5 flex justify-between items-center">
                <div className="font-semibold text-slate-900 text-lg">Table {table.name}</div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide border ${
                    occupied
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}
                >
                  {status}
                </span>
              </div>
              <div className="px-5 pb-5 flex flex-col gap-2.5">
                <button
                  className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-2.5 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition"
                  onClick={() => {
                    setSelectedTable(table.name);
                    navigate(`/restaurant/token/${table.name}`);
                  }}
                >
                  + Token
                </button>

                <button className="w-full bg-gradient-to-r from-fuchsia-500 to-purple-500 text-white py-2.5 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition">
                  + NC Token
                </button>

                <button
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-2.5 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition"
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