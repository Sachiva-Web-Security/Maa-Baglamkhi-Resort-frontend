import React, { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiPlusCircle, FiHome, FiGrid, FiRefreshCw, FiFilter, FiUsers, FiActivity } from "react-icons/fi";
import API from "../../api";
import RestaurantContext from "../../Context/restaurantContext";
import AddTableModal from "./AddTableModal";
import { restaurantService } from "../../services/restaurantService";
import { getCurrentActor, namesMatch } from "../../utils/currentActor";

const ACTIVE_INVOICE_KEY = "restaurant-active-invoice";
const SAVED_INVOICE_KEY = "restaurant-saved-invoice";
const TABLE_PAGE_SIZE = 5;
const normalizeInvoiceStatus = (value) => String(value || "").trim().toLowerCase();
const isSettledInvoiceStatus = (value) => {
  const normalized = normalizeInvoiceStatus(value);
  return normalized === "paid" || normalized === "posted to room";
};
const isOpenInvoiceStatus = (value) => !isSettledInvoiceStatus(value);
const getReusableBill = (bill) => (bill && isOpenInvoiceStatus(bill.invoiceStatus) ? bill : null);
const isPaidBill = (bill) =>
  Boolean(
    bill &&
      (
        isSettledInvoiceStatus(bill.invoiceStatus) ||
        bill.account_transaction_id ||
        bill.accountTransactionId ||
        bill.payment_id ||
        bill.paymentId
      ),
  );
const createBillLookupKey = (entityType, tableName, tokenId) =>
  tokenId
    ? `${String(entityType || "Table").toLowerCase()}:token:${Number(tokenId)}`
    : `${String(entityType || "Table").toLowerCase()}:table:${String(tableName || "").trim()}`;
const canReuseStoredInvoice = (invoice, { tableName, tokenId, entityType }) => {
  if (!invoice) return false;
  if (String(invoice.table || "").trim() !== String(tableName || "").trim()) return false;
  if (String(invoice.entityType || "Table").trim().toLowerCase() !== String(entityType || "Table").trim().toLowerCase()) {
    return false;
  }
  if (!isOpenInvoiceStatus(invoice.invoiceStatus)) return false;
  if (tokenId && invoice.tokenId && Number(invoice.tokenId) !== Number(tokenId)) return false;
  return true;
};

const readStoredInvoice = () => {
  try {
    const active = localStorage.getItem(ACTIVE_INVOICE_KEY);
    if (active) return JSON.parse(active);
  } catch {}

  try {
    const saved = localStorage.getItem(SAVED_INVOICE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}

  return null;
};

const TablePage = () => {
  const navigate = useNavigate();
  const { tables, addTable, getTableStatus, setSelectedTable, loadTables } = useContext(RestaurantContext);
  const actor = getCurrentActor();
  const isWaiter = actor.isWaiter;

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
  const [billByTable, setBillByTable] = useState({});
  const [seatDrafts, setSeatDrafts] = useState({});
  const [savingSeatId, setSavingSeatId] = useState(null);
  const [removingTableId, setRemovingTableId] = useState(null);
  const [tablePage, setTablePage] = useState(1);
  const [removeDialogTable, setRemoveDialogTable] = useState(null);

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
    const loadBills = async () => {
      try {
        const rows = await API.get("/restaurant/bills");
        const latestByTable = {};
        (Array.isArray(rows.data) ? rows.data : []).forEach((bill) => {
          const key = createBillLookupKey(bill.entityType, bill.tableNumber, bill.tokenId);
          if (!latestByTable[key] || Number(bill.id || 0) > Number(latestByTable[key].id || 0)) {
            latestByTable[key] = bill;
          }
        });
        setBillByTable(latestByTable);
      } catch (error) {
        console.error("Failed to load bills:", error);
        setBillByTable({});
      }
    };

    loadBills();
    window.addEventListener("tokenUpdated", loadBills);
    return () => window.removeEventListener("tokenUpdated", loadBills);
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
            const tokenCode = tokenRes.data?.token_code || tokenRes.data?.tokenCode || null;

            if (!tokenId) {
              return [table.name, { tokenId: null, tokenCode: null, items: [], waiterName }];
            }

            const itemsRes = await API.get(`/token/items/${tokenId}`);
            return [table.name, { tokenId, tokenCode, items: itemsRes.data || [], waiterName }];
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

  useEffect(() => {
    const nextDrafts = {};
    tables.forEach((table) => {
      nextDrafts[table.id] = String(Number(table.seatCount || 1));
    });
    setSeatDrafts(nextDrafts);
  }, [tables]);

  const handleAddTable = async () => {
    if (!tableForm.number.trim()) return;


const exists = tables.some(
  (t) => String(t.name).trim() === tableForm.number.trim()
);

if (exists) {
  alert("Table already exists");
  return;
}


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
      alert(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSeatSave = async (table) => {
    const nextSeatCount = Math.max(1, Number(seatDrafts[table.id] || table.seatCount || 1));
    try {
      setSavingSeatId(table.id);
      await restaurantService.updateTable(table.id, {
        floorName: table.floorName,
        sectionName: table.sectionName,
        seatCount: nextSeatCount,
        statusColor: table.statusColor,
      });
      await loadTables();
    } catch (error) {
      alert(error.response?.data?.message || "Person count update nahi ho paaya.");
    } finally {
      setSavingSeatId(null);
    }
  };

  const confirmRemoveTable = async () => {
    if (!removeDialogTable) return;
    try {
      setRemovingTableId(removeDialogTable.id);
      await restaurantService.deleteTable(removeDialogTable.id);
      await loadTables();
      window.dispatchEvent(new Event("tokenUpdated"));
      setRemoveDialogTable(null);
    } catch (error) {
      alert(error.response?.data?.message || "Unable to remove this table right now.");
    } finally {
      setRemovingTableId(null);
    }
  };

  const displayedTableRows = useMemo(
    () =>
      tables.map((table) => {
        const snapshot = tokenSnapshots[table.name] || {};
        const latestTokenBill =
          billByTable[createBillLookupKey("Table", table.name, snapshot.tokenId || null)] ||
          null;
        const latestTableBill =
          billByTable[createBillLookupKey("Table", table.name, null)] ||
          null;
        const relatedBill = latestTokenBill || latestTableBill;
        const paidBill = isPaidBill(relatedBill);
        const openBill = Boolean(relatedBill) && !paidBill;
        const itemCount = (snapshot.items || []).length;
        const hasMeaningfulToken = itemCount > 0 || openBill;
        const displaySnapshot = hasMeaningfulToken
          ? snapshot
          : { tokenId: null, tokenCode: null, items: [], waiterName: "Waiter" };
        const status = hasMeaningfulToken ? "Occupied" : "Available";

        return {
          table,
          status,
          occupied: status === "Occupied",
          snapshot: displaySnapshot,
          itemCount,
          relatedBill,
          showPayNow: openBill,
        };
      }),
    [tables, tokenSnapshots, billByTable],
  );

  const runningTables = displayedTableRows.filter((row) => row.occupied).length;
  const blankTables = displayedTableRows.filter((row) => row.status === "Available").length;
  const pendingInvoice = displayedTableRows.filter((row) => row.itemCount > 0 && row.showPayNow).length;
  const totalTablePages = Math.max(1, Math.ceil(displayedTableRows.length / TABLE_PAGE_SIZE));
  const paginatedTableRows = useMemo(
    () =>
      displayedTableRows.slice(
        (tablePage - 1) * TABLE_PAGE_SIZE,
        tablePage * TABLE_PAGE_SIZE,
      ),
    [displayedTableRows, tablePage],
  );
  const visibleTableStart = displayedTableRows.length ? (tablePage - 1) * TABLE_PAGE_SIZE + 1 : 0;
  const visibleTableEnd = Math.min(tablePage * TABLE_PAGE_SIZE, displayedTableRows.length);

  useEffect(() => {
    if (tablePage > totalTablePages) {
      setTablePage(totalTablePages);
    }
  }, [tablePage, totalTablePages]);

  const openCreateInvoice = async (tableName) => {
    const snapshot = tokenSnapshots[tableName];
    const items = snapshot?.items || [];
    const storedInvoice = readStoredInvoice();
    const reusableStoredInvoice = canReuseStoredInvoice(storedInvoice, {
      tableName,
      tokenId: snapshot?.tokenId || null,
      entityType: "Table",
    })
      ? storedInvoice
      : null;
    const table = tables.find((entry) => entry.name === tableName);

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
      tokenCode: snapshot.tokenCode || null,
      waiterName: snapshot.waiterName || "Waiter",
      personCount: Number(
        reusableStoredInvoice
          ? reusableStoredInvoice.personCount || 1
          : 1,
      ),
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
      billId: reusableStoredInvoice?.billId || null,
      invoiceStatus: reusableStoredInvoice?.invoiceStatus || null,
      customerName: reusableStoredInvoice?.customerName || "",
      phone: reusableStoredInvoice?.phone || "",
      paymentMethod: reusableStoredInvoice?.paymentMethod || "Cash",
      splitCount: Number(
        reusableStoredInvoice
          ? reusableStoredInvoice.splitCount || reusableStoredInvoice.personCount || 1
          : 1,
      ),
    };

    try {
      const response = await restaurantService.createBill({
        ...invoicePayload,
        tokenId: snapshot?.tokenId || null,
        invoiceStatus: "Generated",
        paymentMethod: null,
      });
      const persistedInvoice = {
        ...invoicePayload,
        billId: response?.id || invoicePayload.billId || null,
        invoiceStatus: response?.bill?.invoiceStatus || "Generated",
      };
      localStorage.setItem(ACTIVE_INVOICE_KEY, JSON.stringify(persistedInvoice));
      localStorage.setItem(SAVED_INVOICE_KEY, JSON.stringify(persistedInvoice));
      window.dispatchEvent(new Event("tokenUpdated"));
      navigate("/restaurant/payment", { state: persistedInvoice });
    } catch (error) {
      alert(error.response?.data?.message || "Invoice create nahi ho paaya.");
    }
  };

  const buildInvoicePayload = (tableName) => {
    const snapshot = tokenSnapshots[tableName];
    const items = snapshot?.items || [];
    const billKey = createBillLookupKey("Table", tableName, snapshot?.tokenId || null);
    const relatedBill = billByTable[billKey] || null;
    const reusableBill = items.length ? getReusableBill(relatedBill) : relatedBill;
    const table = tables.find((entry) => entry.name === tableName);

    const subtotal = items.length
      ? items.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.rate || 0), 0)
      : Number(reusableBill?.subtotal || 0);
    const gst = items.length ? subtotal * 0.05 : Number(reusableBill?.gst || 0);
    const total = items.length ? subtotal + gst : Number(reusableBill?.total || 0);

    return {
      table: tableName,
      tokenId: snapshot?.tokenId || null,
      tokenCode: snapshot?.tokenCode || null,
      waiterName: snapshot?.waiterName || reusableBill?.waiter_name || "Waiter",
      personCount: Number(reusableBill?.split_count || 1),
      items: items.map((item) => ({
        id: item.id,
        name: item.item_name,
        qty: Number(item.qty),
        rate: Number(item.rate),
      })),
      subtotal,
      gst,
      total,
      date: reusableBill?.created_at || new Date().toISOString(),
      entityType: "Table",
      billId: reusableBill?.id || null,
      invoiceStatus: reusableBill?.invoiceStatus || null,
      customerName: reusableBill?.customerName || "",
      phone: reusableBill?.phone || "",
      paymentMethod: reusableBill?.paymentMethod || "Cash",
      discountAmount: Number(reusableBill?.discountAmount || 0),
      splitCount: Number(reusableBill?.split_count || 1),
    };
  };

  const openPayNow = (tableName) => {
    navigate(`/restaurant/pay-now/${tableName}`, { state: buildInvoicePayload(tableName) });
  };

  return (
    <div className="relative space-y-6 p-1">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-32 h-96 w-96 rounded-full bg-sky-300/25 blur-[110px]" />
        <div className="absolute top-1/3 -right-24 h-[28rem] w-[28rem] rounded-full bg-blue-400/15 blur-[130px]" />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/40 to-white" />
      </div>

      {/* Header */}
      <div className="relative overflow-hidden rounded-[28px] border border-blue-100/70 bg-white/80 p-7 shadow-[0_20px_50px_-15px_rgba(30,64,175,0.15)] backdrop-blur-xl sm:p-9">
        {/* subtle wave pattern */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.06]"
          viewBox="0 0 800 240"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0 160 C 150 100, 300 220, 450 140 S 700 60, 800 120 L 800 240 L 0 240 Z"
            fill="url(#headerWave)"
          />
          <defs>
            <linearGradient id="headerWave" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#172554" />
              <stop offset="55%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>
        </svg>

        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-950 via-blue-700 to-sky-500 px-3 py-1 text-[13px] font-bold uppercase tracking-wider text-white shadow-sm">
              Live Floor
            </span>
            <h2 className="mt-3 text-[34px] font-extrabold leading-tight tracking-tight text-slate-900">
              Dashboard
            </h2>
            <p className="mt-1.5 text-[18px] text-slate-500">
              Real-time floor occupancy and invoicing
            </p>
          </div>
          {!isWaiter ? (
            <button
              onClick={() => setShowAddTable(true)}
              className="group inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-[17px] font-bold text-white shadow-lg shadow-blue-600/30 transition-all duration-200 hover:bg-blue-800 hover:shadow-xl hover:shadow-blue-600/40 active:scale-[0.98]"
            >
              <FiPlusCircle className="text-xl transition-transform duration-200 group-hover:rotate-90" /> Add Table
            </button>
          ) : null}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-5 md:grid-cols-3">
        <div className="group flex flex-col justify-between rounded-3xl border border-blue-100/70 bg-white/90 p-6 shadow-[0_10px_30px_-12px_rgba(30,64,175,0.12)] backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-14px_rgba(30,64,175,0.22)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[15px] font-bold uppercase tracking-wide text-blue-900/60">Running Tables</p>
              <p className="mt-2 text-4xl font-extrabold leading-none text-slate-900">{runningTables}</p>
              <p className="mt-2 text-[15px] text-slate-400">Currently active</p>
            </div>
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-950 via-blue-700 to-sky-500 text-2xl text-white shadow-md shadow-blue-600/30">
              <FiHome />
            </span>
          </div>
        </div>
        <div className="group flex flex-col justify-between rounded-3xl border border-blue-100/70 bg-white/90 p-6 shadow-[0_10px_30px_-12px_rgba(30,64,175,0.12)] backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-14px_rgba(30,64,175,0.22)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[15px] font-bold uppercase tracking-wide text-blue-900/60">Blank Tables</p>
              <p className="mt-2 text-4xl font-extrabold leading-none text-slate-900">{blankTables}</p>
              <p className="mt-2 text-[15px] text-slate-400">Available for seating</p>
            </div>
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-400 text-2xl text-white shadow-md shadow-emerald-500/30">
              <FiGrid />
            </span>
          </div>
        </div>
        <div className="group flex flex-col justify-between rounded-3xl border border-blue-100/70 bg-white/90 p-6 shadow-[0_10px_30px_-12px_rgba(30,64,175,0.12)] backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-14px_rgba(30,64,175,0.22)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[15px] font-bold uppercase tracking-wide text-blue-900/60">Invoice Pending</p>
              <p className="mt-2 text-4xl font-extrabold leading-none text-slate-900">{pendingInvoice}</p>
              <p className="mt-2 text-[15px] text-slate-400">Awaiting finalization</p>
            </div>
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-400 text-2xl text-white shadow-md shadow-amber-500/30">
              <FiRefreshCw />
            </span>
          </div>
        </div>
      </div>

      {/* Table list card */}
      <div className="overflow-hidden rounded-3xl border border-blue-100/70 bg-white/90 shadow-[0_20px_50px_-20px_rgba(30,64,175,0.18)] backdrop-blur">
        <div className="flex items-start justify-between gap-4 border-b border-blue-100/70 bg-gradient-to-r from-blue-50/60 via-white to-white px-7 py-6">
          <div className="flex items-start gap-4">
            <span className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-950 via-blue-700 to-sky-500 text-lg text-white shadow-md shadow-blue-600/30">
              <FiActivity />
            </span>
            <div>
              <div className="text-[15px] font-bold uppercase tracking-wider text-blue-700">Table Management</div>
              <h3 className="mt-1 text-[24px] font-extrabold tracking-tight text-slate-900">Restaurant tables in list view</h3>
              <p className="mt-1.5 text-[17px] text-slate-500">Status, section, booking info, person count, and actions in one place.</p>
            </div>
          </div>

          <button
            type="button"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-white text-blue-600 shadow-sm transition-all duration-200 hover:border-blue-300 hover:bg-blue-50 hover:shadow-md"
            aria-label="Filter table list"
          >
            <FiFilter className="text-lg" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full border-collapse">
            <thead className="bg-gradient-to-r from-blue-50/70 to-blue-50/30">
              <tr className="text-left">
                <th className="px-6 py-4 text-[16px] font-bold uppercase tracking-wide text-blue-900/60">Table ID</th>
                <th className="px-6 py-4 text-[16px] font-bold uppercase tracking-wide text-blue-900/60">Status</th>
                <th className="px-6 py-4 text-[16px] font-bold uppercase tracking-wide text-blue-900/60">Section</th>
                <th className="px-6 py-4 text-[16px] font-bold uppercase tracking-wide text-blue-900/60">Booking Info</th>
                <th className="px-6 py-4 text-[16px] font-bold uppercase tracking-wide text-blue-900/60">Persons</th>
                <th className="px-6 py-4 text-right text-[16px] font-bold uppercase tracking-wide text-blue-900/60">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTableRows.map(({ table, status, occupied, snapshot, itemCount, showPayNow }) => {
                const assignedWaiterName = getDisplayWaiterName(snapshot.waiterName);
                const tableOwnedByCurrentWaiter =
                  !snapshot.tokenId ||
                  !snapshot.waiterName ||
                  namesMatch(snapshot.waiterName, actor.name);
                const waiterLocked = isWaiter && !tableOwnedByCurrentWaiter;

                return (
                  <tr key={table.id} className="border-t border-blue-50 align-top transition-colors duration-150 hover:bg-blue-50/40">
                    <td className="px-6 py-5">
                      <div className="text-[18px] font-extrabold text-blue-700">T{table.name}</div>
                      <div className="mt-0.5 text-[15px] font-medium text-slate-400">ID #{table.id}</div>
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[15px] font-bold shadow-sm ${
                          occupied
                            ? "border-amber-200 bg-gradient-to-r from-amber-50 to-amber-100/60 text-amber-700"
                            : "border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-100/60 text-emerald-700"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${occupied ? "bg-amber-500" : "bg-emerald-500"}`} />
                        {status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-[17px] font-medium text-slate-600">
                      {[table.floorName, table.sectionName].filter(Boolean).join(" / ") || "Unmapped section"}
                    </td>
                    <td className="px-6 py-5">
                      <div className="inline-flex rounded-lg bg-gradient-to-r from-blue-50 to-sky-50 px-3.5 py-2 text-[15px] font-bold text-blue-700 shadow-sm ring-1 ring-blue-100">
                        {snapshot.tokenCode || "No Active Booking"}
                      </div>
                      <div className="mt-2 text-[15px] text-slate-500">
                        {itemCount ? `${itemCount} menu items added` : "No items yet"}
                      </div>
                      <div className="mt-2 text-[15px] font-semibold uppercase tracking-wide text-slate-400">
                        Waiter: <span className="text-slate-700">{assignedWaiterName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      {isWaiter ? (
                        <div className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50/70 px-3.5 py-2.5 text-[17px] font-bold text-slate-700">
                          <FiUsers className="text-blue-400" /> {table.seatCount || 1} guests
                        </div>
                      ) : (
                        <div className="flex max-w-[220px] items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            value={seatDrafts[table.id] ?? String(table.seatCount || 1)}
                            onChange={(event) =>
                              setSeatDrafts((current) => ({
                                ...current,
                                [table.id]: event.target.value.replace(/\D/g, "").slice(0, 2) || "1",
                              }))
                            }
                            className="h-11 w-20 rounded-xl border border-blue-200 bg-white px-3 text-[17px] font-bold text-slate-800 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/15"
                          />
                          <button
                            type="button"
                            onClick={() => handleSeatSave(table)}
                            disabled={savingSeatId === table.id}
                            className="h-11 rounded-xl bg-blue-700 px-4 text-[15px] font-bold uppercase tracking-wide text-white shadow-md shadow-blue-600/25 transition-all duration-200 hover:bg-blue-800 disabled:opacity-60"
                          >
                            {savingSeatId === table.id ? "Saving..." : "Save"}
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          className="rounded-xl bg-slate-900 px-4 py-2.5 text-[15px] font-bold text-white shadow-md shadow-slate-900/20 transition-all duration-200 hover:bg-slate-800 hover:shadow-lg disabled:opacity-50"
                          disabled={waiterLocked}
                          onClick={() => {
                            setSelectedTable(table.name);
                            navigate(`/restaurant/token/${table.name}`);
                          }}
                        >
                          {waiterLocked ? "Assigned" : "+ Booking"}
                        </button>

                        {occupied && itemCount ? (
                          <button
                            className="rounded-xl bg-blue-700 px-4 py-2.5 text-[15px] font-bold text-white shadow-md shadow-blue-600/25 transition-all duration-200 hover:bg-blue-800 hover:shadow-lg disabled:opacity-50"
                            disabled={waiterLocked}
                            onClick={() => openCreateInvoice(table.name)}
                          >
                            Invoice
                          </button>
                        ) : null}

                        {showPayNow ? (
                          <button
                            className="rounded-xl bg-amber-500 px-4 py-2.5 text-[15px] font-bold text-white shadow-md shadow-amber-500/25 transition-all duration-200 hover:bg-amber-600 hover:shadow-lg disabled:opacity-50"
                            disabled={waiterLocked}
                            onClick={() => openPayNow(table.name)}
                          >
                            Pay
                          </button>
                        ) : null}

                        <button
                          className="rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-[15px] font-bold text-blue-700 shadow-sm transition-all duration-200 hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50"
                          disabled={waiterLocked}
                          onClick={() => {
                            setSelectedTable(table.name);
                            navigate(`/restaurant/token-items/${table.name}`);
                          }}
                        >
                          Items
                        </button>

                        {!isWaiter ? (
                          <button
                            type="button"
                            onClick={() => setRemoveDialogTable(table)}
                            disabled={removingTableId === table.id}
                            className="rounded-xl bg-rose-50 px-4 py-2.5 text-[15px] font-bold text-rose-600 shadow-sm transition-all duration-200 hover:bg-rose-100 hover:shadow-md disabled:opacity-60"
                          >
                            {removingTableId === table.id ? "Removing..." : "Remove"}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-blue-100/70 bg-blue-50/20 px-7 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-[17px] text-slate-500">
            Showing{" "}
            <span className="font-bold text-slate-900">{visibleTableStart}</span>-
            <span className="font-bold text-slate-900">{visibleTableEnd}</span> of{" "}
            <span className="font-bold text-slate-900">{displayedTableRows.length}</span> tables
          </div>

          {totalTablePages > 1 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setTablePage((current) => Math.max(1, current - 1))}
                disabled={tablePage === 1}
                className="rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-[15px] font-bold text-slate-600 shadow-sm transition-all duration-200 hover:border-blue-400 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>

              {Array.from({ length: totalTablePages }, (_, index) => index + 1).map((pageNumber) => {
                const isActive = pageNumber === tablePage;
                return (
                  <button
                    key={`table-page-${pageNumber}`}
                    type="button"
                    onClick={() => setTablePage(pageNumber)}
                    className={`h-10 min-w-10 rounded-xl px-3 text-[15px] font-bold transition-all duration-200 ${
                      isActive
                        ? "bg-blue-700 text-white shadow-md shadow-blue-600/30"
                        : "border border-blue-200 bg-white text-slate-600 hover:border-blue-400 hover:text-blue-700"
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setTablePage((current) => Math.min(totalTablePages, current + 1))}
                disabled={tablePage === totalTablePages}
                className="rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-[15px] font-bold text-slate-600 shadow-sm transition-all duration-200 hover:border-blue-400 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {!isWaiter ? (
        <AddTableModal
          open={showAddTable}
          onClose={() => setShowAddTable(false)}
          onSubmit={handleAddTable}
          value={tableForm}
          setValue={setTableForm}
          loading={saving}
        />
      ) : null}

      {!isWaiter && removeDialogTable ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-blue-100 bg-white shadow-2xl">
            <div className="border-b border-blue-100/70 bg-gradient-to-r from-rose-50/60 to-white px-7 py-6">
              <div className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[13px] font-bold uppercase tracking-wide text-rose-600">
                Remove Table
              </div>
              <h3 className="mt-4 text-[24px] font-extrabold text-slate-900">Remove Table {removeDialogTable.name}?</h3>
              <p className="mt-2 text-[17px] leading-6 text-slate-500">
                This table will be removed from the restaurant dashboard. You can add it again later if needed.
              </p>
            </div>

            <div className="px-7 py-6">
              <div className="rounded-2xl border border-blue-100 bg-blue-50/40 px-5 py-4">
                <div className="text-[13px] font-bold uppercase tracking-wide text-blue-900/60">Selected Table</div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[18px] font-extrabold text-slate-900">T{removeDialogTable.name}</div>
                    <div className="text-[16px] text-slate-500">
                      {[removeDialogTable.floorName, removeDialogTable.sectionName].filter(Boolean).join(" / ") || "Unmapped section"}
                    </div>
                  </div>
                  <div className="rounded-full bg-white px-3 py-1 text-[14px] font-bold text-slate-600 shadow-sm ring-1 ring-blue-100">
                    ID #{removeDialogTable.id}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setRemoveDialogTable(null)}
                  disabled={removingTableId === removeDialogTable.id}
                  className="rounded-xl border border-blue-200 bg-white px-5 py-2.5 text-[17px] font-bold text-slate-700 shadow-sm transition-all duration-200 hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Keep Table
                </button>
                <button
                  type="button"
                  onClick={confirmRemoveTable}
                  disabled={removingTableId === removeDialogTable.id}
                  className="rounded-xl bg-rose-600 px-5 py-2.5 text-[17px] font-bold text-white shadow-md shadow-rose-500/25 transition-all duration-200 hover:bg-rose-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {removingTableId === removeDialogTable.id ? "Removing..." : "Remove Table"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default TablePage;