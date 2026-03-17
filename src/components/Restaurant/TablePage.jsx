import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";

import { RestaurantContext } from "../../Context/RestaurantContext";

const inputCls =
  "w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100";

const TablePage = () => {
  const navigate = useNavigate();
  const { tables, addTable, getTableStatus, setSelectedTable } =
    useContext(RestaurantContext);
  const [tableNo, setTableNo] = useState("");

  const handleAddTable = async () => {
    if (!tableNo.trim()) return;

    try {
      await addTable(tableNo);
      setTableNo("");
    } catch (err) {
      window.alert(err.message);
    }
  };

  const runningTables = tables.filter(
    (table) => getTableStatus(table.name) === "Occupied"
  ).length;
  const blankTables = tables.filter(
    (table) => getTableStatus(table.name) === "Available"
  ).length;
  const pendingInvoice = 0;

  return (
    <div className="space-y-6">
      <div className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_14px_30px_rgba(15,23,42,0.06)]">
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
              Table Dashboard
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">
              Restaurant tables
            </h2>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row lg:max-w-xl">
            <input
              value={tableNo}
              onChange={(e) => setTableNo(e.target.value)}
              placeholder="Enter table number"
              className={inputCls}
            />
            <button
              type="button"
              onClick={handleAddTable}
              className="rounded-[20px] bg-gradient-to-r from-sky-600 to-cyan-500 px-5 py-3 text-sm font-bold text-white shadow-[0_16px_35px_rgba(14,165,233,0.24)] transition hover:-translate-y-0.5"
            >
              Add Table
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: "Running Tables", value: runningTables },
            { label: "Available Tables", value: blankTables },
            { label: "Invoice Pending", value: pendingInvoice },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-[22px] border border-slate-200/80 bg-slate-50 p-4"
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {card.label}
              </div>
              <div className="mt-3 text-3xl font-black text-slate-900">
                {card.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tables.map((table, index) => {
          const status = getTableStatus(table.name);
          const occupied = status === "Occupied";

          return (
            <div
              key={`${table.name}-${index}`}
              className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_14px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:border-cyan-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Table
                  </div>
                  <div className="mt-2 text-2xl font-black text-slate-900">
                    {table.name}
                  </div>
                </div>
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                    occupied
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {status}
                </span>
              </div>

              <div className="mt-5 grid gap-2">
                <button
                  type="button"
                  className="rounded-[18px] bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
                  onClick={() => {
                    setSelectedTable(table.name);
                    navigate(`/restaurant/token/${table.name}`);
                  }}
                >
                  + Token
                </button>

                <button
                  type="button"
                  className="rounded-[18px] bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700"
                >
                  + NC Token
                </button>

                <button
                  type="button"
                  className="rounded-[18px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-cyan-200 hover:text-cyan-700"
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
