import React, { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiPlusCircle, FiHome, FiGrid, FiRefreshCw } from "react-icons/fi";
import API from "../../api";
import RestaurantContext from "../../Context/restaurantContext";
import AddTableModal from "./AddTableModal";
import { restaurantService } from "../../services/restaurantService";

const ACTIVE_INVOICE_KEY = "restaurant-active-invoice";
const SAVED_INVOICE_KEY = "restaurant-saved-invoice";
const TABLE_PAGE_SIZE = 5;
const normalizeInvoiceStatus = (value) => String(value || "").trim().toLowerCase();
const isOpenInvoiceStatus = (value) => normalizeInvoiceStatus(value) !== "paid";
const getReusableBill = (bill) => (bill && isOpenInvoiceStatus(bill.invoiceStatus) ? bill : null);
const isPaidBill = (bill) =>
  Boolean(
    bill &&
      (
        normalizeInvoiceStatus(bill.invoiceStatus) === "paid" ||
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

  const displayedTableRows = tables.map((table) => {
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
  });

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
    <div className="space-y-6">
      {/* Hero header */}
      <div className="rounded-3xl bg-gradient-to-r from-indigo-900 via-blue-800 to-cyan-700 text-white shadow-2xl shadow-blue-500/30 border border-white/10 p-6 flex flex-wrap justify-between gap-4">
        <div>
          <p className="uppercase text-sm tracking-[0.3em] text-white/70">Restaurant</p>
          <h2 className="mt-1 text-4xl font-bold">Dashboard</h2>
          <p className="mt-2 text-xl text-white/80">Quickly view and manage tables and tokens.</p>
        </div>
        <div className="flex items-end gap-3 w-full md:w-auto">
          <button
            onClick={() => setShowAddTable(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-xl font-semibold text-slate-900 shadow-md transition hover:shadow-lg"
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
            <p className="text-sm uppercase text-slate-500">Running Tables</p>
            <p className="text-4xl font-bold text-slate-900">{runningTables}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl">
            <FiGrid />
          </div>
          <div>
            <p className="text-sm uppercase text-slate-500">Blank Tables</p>
            <p className="text-4xl font-bold text-slate-900">{blankTables}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-xl">
            <FiRefreshCw />
          </div>
          <div>
            <p className="text-sm uppercase text-slate-500">Invoice Pending</p>
            <p className="text-4xl font-bold text-slate-900">{pendingInvoice}</p>
          </div>
        </div>
      </div>

      <div>
        <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-100 px-6 py-5">
            <div className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-500">Table Management</div>
            <h3 className="mt-2 text-4xl font-black text-slate-900">Restaurant tables in list view</h3>
            <p className="mt-1 text-sm text-slate-500">“Each table’s status, person count, and actions will be managed here in a row format.”</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full border-collapse">
              <thead className="bg-slate-50">
                <tr className="text-left">
                  <th className="px-5 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Table</th>
                  <th className="px-5 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Status</th>
                  <th className="px-5 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Section</th>
                  <th className="px-5 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Token</th>
                  <th className="px-5 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Persons</th>
                  <th className="px-5 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTableRows.map(({ table, status, occupied, snapshot, itemCount, showPayNow }) => {

                  return (
                    <tr key={table.id} className="border-t border-slate-100 align-top transition hover:bg-sky-50/30">
                      <td className="px-5 py-4">
                        <div className="text-2xl font-black text-slate-900">T{table.name}</div>
                        <div className="mt-1 text-base text-slate-500">ID #{table.id}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1.5 text-base font-bold ${
                            occupied
                              ? "border-rose-200 bg-rose-50 text-rose-700"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xl font-medium text-slate-600">
                        {[table.floorName, table.sectionName].filter(Boolean).join(" / ") || "Unmapped section"}
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-xl font-semibold text-slate-800">{snapshot.tokenCode || "No active token"}</div>
                        <div className="mt-1 text-base text-slate-500">
                          {itemCount ? `${itemCount} menu items added` : "No items yet"}
                        </div>
                      </td>
                      <td className="px-5 py-4">
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
                            className="h-12 w-24 rounded-xl border border-slate-200 bg-white px-3 text-xl font-bold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleSeatSave(table)}
                            disabled={savingSeatId === table.id}
                            className="h-12 rounded-xl bg-slate-900 px-5 text-base font-bold text-white transition hover:bg-slate-700 disabled:opacity-60"
                          >
                            {savingSeatId === table.id ? "Saving..." : "Save"}
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-4 py-3 text-base font-bold text-white shadow-sm transition hover:shadow-md"
                            onClick={() => {
                              setSelectedTable(table.name);
                              navigate(`/restaurant/token/${table.name}`);
                            }}
                          >
                            + Token
                          </button>

                          {occupied && itemCount ? (
                            <button
                              className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-base font-bold text-white shadow-sm transition hover:shadow-md"
                              onClick={() => openCreateInvoice(table.name)}
                            >
                              Create Invoice
                            </button>
                          ) : null}

                          {showPayNow ? (
                            <button
                              className="rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-3 text-base font-bold text-white shadow-sm transition hover:shadow-md"
                              onClick={() => openPayNow(table.name)}
                            >
                              Pay Now
                            </button>
                          ) : null}

                          <button
                            className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3 text-base font-bold text-white shadow-sm transition hover:shadow-md"
                            onClick={() => {
                              setSelectedTable(table.name);
                              navigate(`/restaurant/token-items/${table.name}`);
                            }}
                          >
                            Token Items
                          </button>

                          <button
                            type="button"
                            onClick={() => setRemoveDialogTable(table)}
                            disabled={removingTableId === table.id}
                            className="rounded-xl bg-rose-600 px-4 py-3 text-base font-bold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-60"
                          >
                            {removingTableId === table.id ? "Removing..." : "Remove"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-sm text-slate-500">
              Showing{" "}
              <span className="font-semibold text-slate-900">{visibleTableStart}</span>-
              <span className="font-semibold text-slate-900">{visibleTableEnd}</span> of{" "}
              <span className="font-semibold text-slate-900">{displayedTableRows.length}</span> tables
            </div>

            {totalTablePages > 1 ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTablePage((current) => Math.max(1, current - 1))}
                  disabled={tablePage === 1}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-sky-200 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                      className={`h-10 min-w-10 rounded-full px-3 text-sm font-bold transition ${
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
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-sky-200 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            ) : null}
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

      {removeDialogTable ? (
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
