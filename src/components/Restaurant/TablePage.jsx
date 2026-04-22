import React, { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiPlusCircle, FiHome, FiGrid, FiRefreshCw, FiSearch, FiX } from "react-icons/fi";
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
  const [tableSearchQuery, setTableSearchQuery] = useState("");

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
  const filteredTableRows = useMemo(() => {
    const query = String(tableSearchQuery || "").trim().toLowerCase();
    if (!query) return displayedTableRows;

    return displayedTableRows.filter(({ table, status, snapshot, itemCount }) => {
      const searchableText = [
        `t${table.name}`,
        table.name,
        String(table.id),
        status,
        table.floorName,
        table.sectionName,
        snapshot.tokenCode,
        snapshot.waiterName,
        itemCount ? `${itemCount} items` : "no items",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [displayedTableRows, tableSearchQuery]);

  const totalTablePages = Math.max(1, Math.ceil(filteredTableRows.length / TABLE_PAGE_SIZE));
  const paginatedTableRows = useMemo(
    () =>
      filteredTableRows.slice(
        (tablePage - 1) * TABLE_PAGE_SIZE,
        tablePage * TABLE_PAGE_SIZE,
      ),
    [filteredTableRows, tablePage],
  );
  const visibleTableStart = filteredTableRows.length ? (tablePage - 1) * TABLE_PAGE_SIZE + 1 : 0;
  const visibleTableEnd = Math.min(tablePage * TABLE_PAGE_SIZE, filteredTableRows.length);

  useEffect(() => {
    if (tablePage > totalTablePages) {
      setTablePage(totalTablePages);
    }
  }, [tablePage, totalTablePages]);

  useEffect(() => {
    setTablePage(1);
  }, [tableSearchQuery]);

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
    <div className="space-y-2.5">
      <div className="rounded-[18px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f7f9ff_100%)] p-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)] sm:p-3.5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-[-0.02em] text-slate-900">Dashboard</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Real-time floor occupancy and invoicing
            </p>
          </div>
          {!isWaiter ? (
            <button
              onClick={() => setShowAddTable(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0b7d79] px-4 py-2 text-sm font-bold text-white shadow-[0_10px_20px_rgba(11,125,121,0.16)] transition hover:-translate-y-0.5 hover:bg-[#096b68]"
            >
              <FiPlusCircle className="text-base" /> Add Table
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <div className="rounded-[16px] bg-[#eef4ff] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600">Running Tables</p>
              <p className="mt-0.5 text-3xl font-black leading-none text-[#0f5ed7]">{runningTables}</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#dcebff] text-lg text-[#0f5ed7]">
              <FiHome />
            </span>
          </div>
        </div>
        <div className="rounded-[16px] bg-[#eef4ff] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600">Blank Tables</p>
              <p className="mt-0.5 text-3xl font-black leading-none text-[#0b7d79]">{blankTables}</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#dff4f3] text-lg text-[#0b7d79]">
              <FiGrid />
            </span>
          </div>
        </div>
        <div className="rounded-[16px] bg-[#eef4ff] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600">Invoice Pending</p>
              <p className="mt-0.5 text-3xl font-black leading-none text-slate-900">{pendingInvoice}</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8eef9] text-lg text-slate-700">
              <FiRefreshCw />
            </span>
          </div>
        </div>
      </div>

      <div>
        <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_16px_36px_rgba(15,23,42,0.07)]">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-500">Table Management</div>
              <h3 className="mt-1 text-2xl font-black tracking-[-0.02em] text-slate-900">Restaurant tables</h3>
              <p className="mt-1 text-sm text-slate-500">Only table list scrolls below.</p>
            </div>

            <div className="flex w-full max-w-sm items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <FiSearch className="shrink-0 text-slate-400" />
              <input
                type="text"
                value={tableSearchQuery}
                onChange={(event) => setTableSearchQuery(event.target.value)}
                placeholder="Search table, status, section, booking"
                className="w-full border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
              {tableSearchQuery ? (
                <button
                  type="button"
                  onClick={() => setTableSearchQuery("")}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Clear table search"
                >
                  <FiX className="text-sm" />
                </button>
              ) : null}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full border-collapse">
              <thead className="bg-white">
                <tr className="text-left">
                  <th className="px-5 py-6 text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Table ID</th>
                  <th className="px-5 py-6 text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Status</th>
                  <th className="px-5 py-6 text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Section</th>
                  <th className="px-5 py-6 text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Booking Info</th>
                  <th className="px-5 py-6 text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Persons</th>
                  <th className="px-5 py-6 text-right text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Actions</th>
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
                    <tr key={table.id} className="border-t border-slate-100 align-top transition hover:bg-slate-50/60">
                      <td className="px-5 py-5">
                        <div className="text-xl font-black text-[#165DFF]">T{table.name}</div>
                        <div className="mt-1 text-base font-medium text-slate-500">ID #{table.id}</div>
                      </td>
                      <td className="px-5 py-5">
                        <span
                          className={`inline-flex rounded-full border px-5 py-2.5 text-base font-bold ${
                            occupied
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-cyan-200 bg-cyan-50 text-cyan-700"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-5 py-5 text-lg font-medium text-slate-600">
                        {[table.floorName, table.sectionName].filter(Boolean).join(" / ") || "Unmapped section"}
                      </td>
                      <td className="px-5 py-5">
                        <div className="inline-flex rounded-lg bg-[#eef3ff] px-4 py-2 text-base font-semibold text-slate-600">
                          {snapshot.tokenCode || "No Active Booking"}
                        </div>
                        <div className="mt-3 text-base text-slate-500">
                          {itemCount ? `${itemCount} menu items added` : "No items yet"}
                        </div>
                        <div className="mt-3 text-base font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Waiter: <span className="text-slate-600">{assignedWaiterName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-5">
                        {isWaiter ? (
                          <div className="inline-flex min-w-[92px] items-center justify-center rounded-xl bg-slate-50 px-5 py-3.5 text-lg font-semibold text-slate-700">
                            {table.seatCount || 1} guests
                          </div>
                        ) : (
                          <div className="flex max-w-[260px] items-center gap-3">
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
                              className="h-14 w-28 rounded-xl border border-slate-200 bg-white px-4 text-lg font-bold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleSeatSave(table)}
                              disabled={savingSeatId === table.id}
                              className="h-14 rounded-xl bg-slate-900 px-6 text-base font-bold uppercase tracking-[0.08em] text-white transition hover:bg-slate-700 disabled:opacity-60"
                            >
                              {savingSeatId === table.id ? "Saving..." : "Save"}
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-5">
                        <div className="flex flex-wrap justify-end gap-3">
                          <button
                            className="rounded-2xl bg-[#1f2937] px-5 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-[#111827]"
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
                              className="rounded-2xl bg-[#0b7d79] px-5 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-[#096b68]"
                              disabled={waiterLocked}
                              onClick={() => openCreateInvoice(table.name)}
                            >
                              Invoice
                            </button>
                          ) : null}

                          {showPayNow ? (
                            <button
                              className="rounded-2xl bg-[#f59e0b] px-5 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-[#d88c09]"
                              disabled={waiterLocked}
                              onClick={() => openPayNow(table.name)}
                            >
                              Pay
                            </button>
                          ) : null}

                          <button
                            className="rounded-2xl bg-[#ff8a00] px-5 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-[#e97800]"
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
                              className="rounded-2xl bg-[#b42318] px-5 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-[#971b11] disabled:opacity-60"
                            >
                              {removingTableId === table.id ? "Removing..." : "Remove"}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!paginatedTableRows.length ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-base font-medium text-slate-500">
                      No tables match your search.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-lg text-slate-500">
              Showing{" "}
              <span className="font-semibold text-slate-900">{visibleTableStart}</span>-
              <span className="font-semibold text-slate-900">{visibleTableEnd}</span> of{" "}
              <span className="font-semibold text-slate-900">{filteredTableRows.length}</span> tables
            </div>

            {totalTablePages > 1 ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTablePage((current) => Math.max(1, current - 1))}
                  disabled={tablePage === 1}
                  className="rounded-full border border-slate-200 bg-white px-5 py-3 text-base font-semibold text-slate-600 transition hover:border-sky-200 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                      className={`h-12 min-w-12 rounded-full px-4 text-base font-bold transition ${
                        isActive
                          ? "bg-slate-900 text-white shadow-[0_12px_24px_rgba(15,23,42,0.14)]"
                          : "border border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:text-sky-700"
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
                  className="rounded-full border border-slate-200 bg-white px-5 py-3 text-base font-semibold text-slate-600 transition hover:border-sky-200 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            ) : null}
          </div>
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
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-white/60 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.28)]">
            <div className="bg-gradient-to-r from-rose-50 via-white to-orange-50 px-6 py-5">
              <div className="inline-flex items-center rounded-full border border-rose-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-rose-600">
                Remove Table
              </div>
              <h3 className="mt-4 text-2xl font-black text-slate-900">Remove Table {removeDialogTable.name}?</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                This table will be removed from the restaurant dashboard. You can add it again later if needed.
              </p>
            </div>

            <div className="px-6 py-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Selected Table</div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-black text-slate-900">T{removeDialogTable.name}</div>
                    <div className="text-sm text-slate-500">
                      {[removeDialogTable.floorName, removeDialogTable.sectionName].filter(Boolean).join(" / ") || "Unmapped section"}
                    </div>
                  </div>
                  <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                    ID #{removeDialogTable.id}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setRemoveDialogTable(null)}
                  disabled={removingTableId === removeDialogTable.id}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Keep Table
                </button>
                <button
                  type="button"
                  onClick={confirmRemoveTable}
                  disabled={removingTableId === removeDialogTable.id}
                  className="rounded-2xl bg-gradient-to-r from-rose-600 to-orange-500 px-5 py-3 text-sm font-bold text-white shadow-[0_16px_30px_rgba(244,63,94,0.28)] transition hover:shadow-[0_18px_36px_rgba(244,63,94,0.36)] disabled:cursor-not-allowed disabled:opacity-60"
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
