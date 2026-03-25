import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiPlusCircle, FiHome, FiGrid, FiRefreshCw } from "react-icons/fi";
import API from "../../api";
import { RestaurantContext } from "../../Context/RestaurantContext";
import AddTableModal from "./AddTableModal";

const ACTIVE_INVOICE_KEY = "restaurant-active-invoice";
const SAVED_INVOICE_KEY = "restaurant-saved-invoice";

const TablePage = () => {
  const navigate = useNavigate();
  const { tables, addTable, getTableStatus, setSelectedTable } = useContext(RestaurantContext);

  const [tableNo, setTableNo] = useState("");
  const [showAddTable, setShowAddTable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tokenSnapshots, setTokenSnapshots] = useState({});

  useEffect(() => {
    const loadTokenSnapshots = async () => {
      if (!tables.length) {
        setTokenSnapshots({});
        return;
      }

      try {
        const entries = await Promise.all(
          tables.map(async (table) => {
            const tokenRes = await API.get(`/token/table/${table.name}`);
            const tokenId = tokenRes.data?.id || null;

            if (!tokenId) {
              return [table.name, { tokenId: null, items: [] }];
            }

            const itemsRes = await API.get(`/token/items/${tokenId}`);
            return [table.name, { tokenId, items: itemsRes.data || [] }];
          }),
        );

        setTokenSnapshots(Object.fromEntries(entries));
      } catch (error) {
        console.error("Failed to load table token snapshots:", error);
        setTokenSnapshots({});
      }
    };

    loadTokenSnapshots();
  }, [tables]);

  const handleAddTable = async () => {
    if (!tableNo.trim()) return;
    try {
      setSaving(true);
      await addTable(tableNo);
      setTableNo("");
      setShowAddTable(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const runningTables = tables.filter((t) => getTableStatus(t.name) === "Occupied").length;
  const blankTables = tables.filter((t) => getTableStatus(t.name) === "Available").length;
  const pendingInvoice = tables.filter((table) => (tokenSnapshots[table.name]?.items || []).length > 0).length;

  const openCreateInvoice = (tableName) => {
    const snapshot = tokenSnapshots[tableName];
    const items = snapshot?.items || [];

    if (!items.length) {
      return;
    }

    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.qty || 0) * Number(item.rate || 0),
      0,
    );
    const gst = subtotal * 0.05;
    const total = subtotal + gst;

    const invoicePayload = {
      table: tableName,
      tokenId: snapshot.tokenId,
      items: items.map((item) => ({
        id: item.id,
        name: item.item_name,
        qty: Number(item.qty),
        rate: Number(item.rate),
      })),
      subtotal,
      gst,
      total,
      date: new Date().toISOString(),
      entityType: "Table",
    };

    localStorage.setItem(ACTIVE_INVOICE_KEY, JSON.stringify(invoicePayload));
    localStorage.setItem(SAVED_INVOICE_KEY, JSON.stringify(invoicePayload));
    navigate("/restaurant/payment", { state: invoicePayload });
  };

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
          <button
            onClick={() => setShowAddTable(true)}
            className="inline-flex items-center gap-2 bg-white text-slate-900 font-semibold px-4 py-2 rounded-xl shadow-md hover:shadow-lg transition"
          >
            <FiPlusCircle /> Add Table
          </button>
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
          const hasMenuItems = (tokenSnapshots[table.name]?.items || []).length > 0;
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

                {occupied && hasMenuItems ? (
                  <button
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition"
                    onClick={() => openCreateInvoice(table.name)}
                  >
                    Create Invoice
                  </button>
                ) : null}

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

      <AddTableModal
        open={showAddTable}
        onClose={() => setShowAddTable(false)}
        onSubmit={handleAddTable}
        value={tableNo}
        setValue={setTableNo}
        loading={saving}
      />
    </div>
  );
};

export default TablePage;
