import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiPlusCircle, FiHome, FiGrid, FiRefreshCw } from "react-icons/fi";
import API from "../../api";
import { RestaurantContext } from "../../Context/RestaurantContext";
import AddTableModal from "./AddTableModal";
import { restaurantService } from "../../services/restaurantService";

const ACTIVE_INVOICE_KEY = "restaurant-active-invoice";
const SAVED_INVOICE_KEY = "restaurant-saved-invoice";

const TablePage = () => {
  const navigate = useNavigate();
  const { tables, addTable, getTableStatus, setSelectedTable } = useContext(RestaurantContext);

  const [tableForm, setTableForm] = useState({
    number: "",
    floorName: "",
    sectionName: "",
    seatCount: 4,
    statusColor: "",
  });
  const [showAddTable, setShowAddTable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tokenSnapshots, setTokenSnapshots] = useState({});
  const [waiterPerformance, setWaiterPerformance] = useState([]);

  const getDisplayWaiterName = (value) => {
    const normalized = String(value || "").trim();
    if (!normalized) return "Waiter";
    if (normalized.toLowerCase() === "unassigned") return "Waiter";
    return normalized;
  };

  useEffect(() => {
    const loadWaiterPerformance = async () => {
      try {
        setWaiterPerformance(await restaurantService.getWaiterPerformance());
      } catch (error) {
        console.error("Failed to load waiter performance:", error);
        setWaiterPerformance([]);
      }
    };

    loadWaiterPerformance();
    window.addEventListener("tokenUpdated", loadWaiterPerformance);
    return () => window.removeEventListener("tokenUpdated", loadWaiterPerformance);
  }, []);

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
            const waiterName = tokenRes.data?.waiter || "Waiter";

            if (!tokenId) {
              return [table.name, { tokenId: null, items: [], waiterName }];
            }

            const itemsRes = await API.get(`/token/items/${tokenId}`);
            return [table.name, { tokenId, items: itemsRes.data || [], waiterName }];
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
    if (!tableForm.number.trim()) return;
    try {
      setSaving(true);
      await addTable(tableForm);
      setTableForm({
        number: "",
        floorName: "",
        sectionName: "",
        seatCount: 4,
        statusColor: "",
      });
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
      waiterName: snapshot.waiterName || "Waiter",
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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {tables.map((table, i) => {
            const status = getTableStatus(table.name);
            const occupied = status === "Occupied";
            const hasMenuItems = (tokenSnapshots[table.name]?.items || []).length > 0;
            const manualTone =
              table.statusColor === "rose"
                ? "ring-rose-200"
                : table.statusColor === "amber"
                ? "ring-amber-200"
                : table.statusColor === "sky"
                ? "ring-sky-200"
                : table.statusColor === "emerald"
                ? "ring-emerald-200"
                : "ring-slate-100";
            return (
              <div
                key={i}
                className={`rounded-3xl border border-slate-100 bg-gradient-to-br from-white via-slate-50 to-white shadow-[0_18px_40px_rgba(15,23,42,0.08)] ring-1 ${manualTone} hover:shadow-[0_22px_50px_rgba(37,99,235,0.18)] transition duration-200`}
              >
                <div className="p-5 flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-slate-900 text-lg">Table {table.name}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {[table.floorName, table.sectionName].filter(Boolean).join(" / ") || "Unmapped section"}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      Seats {table.seatCount || 4}
                    </div>
                  </div>
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

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs uppercase tracking-[0.26em] text-slate-500">Waiter Performance</div>
          <h3 className="mt-2 text-xl font-black text-slate-900">Shift sales view</h3>
          <div className="mt-4 space-y-3">
            {waiterPerformance.length ? waiterPerformance.slice(0, 6).map((waiter, index) => (
              <div key={`${waiter.waiterName}-${index}`} className="rounded-2xl bg-slate-50 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-bold text-slate-900">{getDisplayWaiterName(waiter.waiterName)}</div>
                  <div className="text-sm font-semibold text-slate-500">{waiter.billsHandled} bills</div>
                </div>
                <div className="mt-2 text-sm text-slate-600">Sales Rs. {Number(waiter.salesTotal || 0).toFixed(2)}</div>
                <div className="text-xs text-slate-500">Avg bill Rs. {Number(waiter.avgBillValue || 0).toFixed(2)}</div>
              </div>
            )) : (
              <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">
                Waiter performance data bill settlement ke baad yahan show hogi.
              </div>
            )}
          </div>
        </div>
      </div>

      <AddTableModal
        open={showAddTable}
        onClose={() => setShowAddTable(false)}
        onSubmit={handleAddTable}
        value={tableForm}
        setValue={setTableForm}
        loading={saving}
      />
    </div>
  );
};

export default TablePage;
