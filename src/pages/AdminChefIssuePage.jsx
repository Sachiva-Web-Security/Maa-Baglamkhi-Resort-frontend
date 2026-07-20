import React, { useEffect, useMemo, useState } from "react";
import {
  FaBoxOpen, FaClipboardCheck, FaHandHolding, FaSearch, FaSyncAlt,
  FaUndo, FaUsers, FaCheckCircle, FaHourglassHalf, FaTimes, FaChartPie,
} from "react-icons/fa";
import chefService from "../services/chefService";
import { getUserFromStorage } from "../utils/authStorage";

function StatusBadge({ status }) {
  const map = {
    issued: { label: "Issued", classes: "bg-amber-100 text-amber-700 border-amber-200", Icon: FaHourglassHalf },
    partially_returned: { label: "Partially Returned", classes: "bg-cyan-100 text-cyan-700 border-cyan-200", Icon: FaUndo },
    fully_returned: { label: "Fully Returned", classes: "bg-emerald-100 text-emerald-700 border-emerald-200", Icon: FaCheckCircle },
  };
  const cfg = map[status] || { label: status || "—", classes: "bg-slate-100 text-slate-600", Icon: FaHourglassHalf };
  const Icon = cfg.Icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${cfg.classes}`}>
      <Icon size={11} /> {cfg.label}
    </span>
  );
}

function Field({ label, required, children, full = false }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-600">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

export default function AdminChefIssuePage() {
  const user = getUserFromStorage() || {};
  const adminName = user?.username || user?.name || user?.fullName || "Admin";

  const [items, setItems] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ── Issue-to-chef form (admin can push raw material to any chef) ──────────
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [issueDraft, setIssueDraft] = useState({
    itemId: "", itemName: "", quantityIssued: "", unit: "",
    chefName: "", chefId: "", purpose: "", remarks: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // ── Filters ─────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterChef, setFilterChef] = useState("");

  // ── Return modal (admin can reconcile a return on behalf of any chef) ────
  const [returnModal, setReturnModal] = useState(null); // { id, itemName, chefName, max }
  const [returnForm, setReturnForm] = useState({ quantityReturned: "", remarks: "" });
  const [returning, setReturning] = useState(false);

  const clearBanners = () => {
    setError("");
    setSuccess("");
  };

  // ── Load items + every chef's issues ──────────────────────────────────────
  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const [itemsRes, issuesRes] = await Promise.all([
        chefService.getInventoryItems(),
        chefService.getChefIssues(), // no filters → full ledger, we filter client-side
      ]);
      const itemsList = Array.isArray(itemsRes)
        ? itemsRes
        : Array.isArray(itemsRes?.items)
          ? itemsRes.items
          : Array.isArray(itemsRes?.data)
            ? itemsRes.data
            : [];
      setItems(itemsList);
      setIssues(Array.isArray(issuesRes) ? issuesRes : []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load chef issue records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Issue item to a chef ───────────────────────────────────────────────────
  const handleItemSelect = (e) => {
    const id = e.target.value;
    const found = items.find((it) => String(it.id) === String(id));
    setIssueDraft((c) => ({
      ...c,
      itemId: id,
      itemName: found?.name || "",
      unit: found?.unit || "",
    }));
  };

  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    clearBanners();
    if (!issueDraft.itemId) return setError("Select an inventory item.");
    if (!issueDraft.chefName.trim()) return setError("Enter the chef's name.");
    const qty = Number(issueDraft.quantityIssued);
    if (!qty || qty <= 0) return setError("Quantity must be greater than zero.");
    const selectedItem = items.find((it) => String(it.id) === String(issueDraft.itemId));
    if (selectedItem && Number(selectedItem.stock || 0) < qty) {
      return setError(`Insufficient stock. Available: ${selectedItem.stock} ${selectedItem.unit || ""}`);
    }
    setSubmitting(true);
    try {
      await chefService.createChefIssue({
        itemId: Number(issueDraft.itemId),
        itemName: issueDraft.itemName,
        quantityIssued: qty,
        unit: issueDraft.unit,
        chefName: issueDraft.chefName.trim(),
        chefId: issueDraft.chefId || null,
        purpose: issueDraft.purpose,
        remarks: issueDraft.remarks,
      });
      setSuccess(`Issued ${qty} ${issueDraft.unit || ""} of ${issueDraft.itemName} to ${issueDraft.chefName}.`);
      setIssueDraft({ itemId: "", itemName: "", quantityIssued: "", unit: "", chefName: "", chefId: "", purpose: "", remarks: "" });
      setShowIssueForm(false);
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to issue item.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Return / reconcile ──────────────────────────────────────────────────
  const openReturn = (row) => {
    const remaining = Number(row.quantityIssued || 0) - Number(row.quantityReturned || 0);
    clearBanners();
    setReturnModal({ id: row.id, itemName: row.itemName, chefName: row.chefName, max: remaining });
    setReturnForm({ quantityReturned: "", remarks: "" });
  };

  const submitReturn = async (e) => {
    e.preventDefault();
    if (!returnModal) return;
    const qty = Number(returnForm.quantityReturned);
    if (!qty || qty <= 0) return setError("Return quantity must be greater than zero.");
    if (qty > returnModal.max) {
      return setError(`Cannot return more than remaining ${returnModal.max}.`);
    }
    setReturning(true);
    setError("");
    try {
      await chefService.returnChefIssue(returnModal.id, {
        quantityReturned: qty,
        remarks: returnForm.remarks,
      });
      setSuccess(`Return of ${qty} recorded for ${returnModal.itemName} (${returnModal.chefName}).`);
      setReturnModal(null);
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to record return.");
    } finally {
      setReturning(false);
    }
  };

  // ── Derived: chef list for filter dropdown ─────────────────────────────
  const chefOptions = useMemo(() => {
    const names = new Set(issues.map((r) => r.chefName).filter(Boolean));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [issues]);

  // ── Derived: filtered issues (client-side so status + chef + search can combine) ──
  const filteredIssues = useMemo(() => {
    let rows = issues;
    if (filterStatus) rows = rows.filter((r) => r.status === filterStatus);
    if (filterChef) rows = rows.filter((r) => r.chefName === filterChef);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          String(r.itemName || "").toLowerCase().includes(q) ||
          String(r.chefName || "").toLowerCase().includes(q) ||
          String(r.purpose || "").toLowerCase().includes(q),
      );
    }
    return [...rows].sort(
      (a, b) => new Date(b.issuedAt || 0).getTime() - new Date(a.issuedAt || 0).getTime(),
    );
  }, [issues, search, filterStatus, filterChef]);

  // ── Derived: fleet-wide stats ────────────────────────────────────────────
  const stats = useMemo(() => {
    const openRows = issues.filter((r) => r.status !== "fully_returned");
    const issuedTotal = issues.reduce((sum, r) => sum + Number(r.quantityIssued || 0), 0);
    const returnedTotal = issues.reduce((sum, r) => sum + Number(r.quantityReturned || 0), 0);
    return {
      totalRecords: issues.length,
      openCount: openRows.length,
      activeChefs: new Set(openRows.map((r) => r.chefName).filter(Boolean)).size,
      issuedTotal,
      returnedTotal,
      withChefs: issuedTotal - returnedTotal,
    };
  }, [issues]);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef2ff_100%)] p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(135deg,#1e1b4b_0%,#4338ca_55%,#7e22ce_100%)] px-6 py-6 text-white shadow-[0_24px_60px_rgba(15,23,42,0.25)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                <FaChartPie size={22} />
              </div>
              <div>
                <h1 className="text-2xl font-bold md:text-3xl">Chef Issue &amp; Return Oversight</h1>
                <p className="mt-1 text-sm text-white/80">
                  Signed in as {adminName} · Track raw material issued to every chef and reconcile returns.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <p className="text-xs uppercase tracking-wider text-white/70">Records</p>
                <p className="text-xl font-bold">{stats.totalRecords}</p>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <p className="text-xs uppercase tracking-wider text-white/70">Open</p>
                <p className="text-xl font-bold">{stats.openCount}</p>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <p className="text-xs uppercase tracking-wider text-white/70">Active Chefs</p>
                <p className="text-xl font-bold">{stats.activeChefs}</p>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <p className="text-xs uppercase tracking-wider text-white/70">Issued</p>
                <p className="text-xl font-bold">{stats.issuedTotal.toFixed(2)}</p>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <p className="text-xs uppercase tracking-wider text-white/70">Returned</p>
                <p className="text-xl font-bold">{stats.returnedTotal.toFixed(2)}</p>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <p className="text-xs uppercase tracking-wider text-white/70">With Chefs</p>
                <p className="text-xl font-bold">{stats.withChefs.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {success}
          </div>
        )}

        {/* Issue-to-chef (collapsible) */}
        <div className="rounded-[26px] border border-white/80 bg-white p-6 shadow-[0_22px_50px_rgba(15,23,42,0.08)]">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FaHandHolding className="text-indigo-500" />
              <h2 className="text-xl font-bold text-slate-900">Issue Item to a Chef</h2>
            </div>
            <button
              type="button"
              onClick={() => setShowIssueForm((v) => !v)}
              className="rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
            >
              {showIssueForm ? "Close" : "New Issue"}
            </button>
          </div>

          {showIssueForm && (
            <form onSubmit={handleIssueSubmit} className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Inventory Item" required>
                <select
                  value={issueDraft.itemId}
                  onChange={handleItemSelect}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">Select an item…</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name} · {it.stock ?? 0} {it.unit || ""}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Chef Name" required>
                <input
                  value={issueDraft.chefName}
                  onChange={(e) => setIssueDraft((c) => ({ ...c, chefName: e.target.value }))}
                  placeholder="e.g. Ramesh Kumar"
                  list="admin-chef-issue-known-chefs"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
                <datalist id="admin-chef-issue-known-chefs">
                  {chefOptions.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </Field>

              <Field label="Quantity" required>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={issueDraft.quantityIssued}
                  onChange={(e) => setIssueDraft((c) => ({ ...c, quantityIssued: e.target.value }))}
                  placeholder="e.g. 2"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </Field>

              <Field label="Unit">
                <input
                  value={issueDraft.unit}
                  onChange={(e) => setIssueDraft((c) => ({ ...c, unit: e.target.value }))}
                  placeholder="kg / ltr / pcs"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </Field>

              <Field label="Purpose (optional)">
                <input
                  value={issueDraft.purpose}
                  onChange={(e) => setIssueDraft((c) => ({ ...c, purpose: e.target.value }))}
                  placeholder="e.g. Lunch prep / Banquet / Daily cooking"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </Field>

              <Field label="Remarks (optional)">
                <input
                  value={issueDraft.remarks}
                  onChange={(e) => setIssueDraft((c) => ({ ...c, remarks: e.target.value }))}
                  placeholder="Any additional note"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </Field>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(99,102,241,0.25)] transition hover:-translate-y-0.5 disabled:opacity-60"
                >
                  <FaBoxOpen size={12} />
                  {submitting ? "Issuing…" : "Issue Item"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* All chef issues */}
        <div className="rounded-[26px] border border-white/80 bg-white p-6 shadow-[0_22px_50px_rgba(15,23,42,0.08)]">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <FaClipboardCheck className="text-emerald-500" />
              <h2 className="text-xl font-bold text-slate-900">All Chef Issues</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2">
                <FaSearch className="text-slate-400" size={12} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search item, chef, purpose…"
                  className="w-48 bg-transparent text-sm outline-none"
                />
              </div>
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2">
                <FaUsers className="text-slate-400" size={12} />
                <select
                  value={filterChef}
                  onChange={(e) => setFilterChef(e.target.value)}
                  className="bg-transparent text-sm outline-none"
                >
                  <option value="">All Chefs</option>
                  {chefOptions.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">All Status</option>
                <option value="issued">Issued</option>
                <option value="partially_returned">Partially Returned</option>
                <option value="fully_returned">Fully Returned</option>
              </select>
              <button
                type="button"
                onClick={refresh}
                className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-xs font-semibold text-cyan-700 hover:bg-cyan-100"
              >
                <FaSyncAlt size={10} /> Refresh
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Item</th>
                  <th className="px-4 py-3 text-left">Chef</th>
                  <th className="px-4 py-3 text-left">Issued</th>
                  <th className="px-4 py-3 text-left">Returned</th>
                  <th className="px-4 py-3 text-left">With Chef</th>
                  <th className="px-4 py-3 text-left">Purpose</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Issued At</th>
                  <th className="px-4 py-3 text-left">Returned At</th>
                  <th className="px-4 py-3 text-left">Issued By</th>
                  <th className="px-4 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center text-slate-400">
                      Loading…
                    </td>
                  </tr>
                ) : filteredIssues.length ? (
                  filteredIssues.map((row) => {
                    const remaining = Number(row.quantityIssued || 0) - Number(row.quantityReturned || 0);
                    return (
                      <tr key={row.id} className="border-t border-slate-100 hover:bg-indigo-50/40">
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {row.itemName}
                          <div className="text-xs text-slate-500">{row.unit || ""}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{row.chefName || "—"}</td>
                        <td className="px-4 py-3 text-slate-700">{Number(row.quantityIssued || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-slate-700">{Number(row.quantityReturned || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{remaining.toFixed(2)}</td>
                        <td className="px-4 py-3 text-slate-600">{row.purpose || "—"}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={row.status} />
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {row.issuedAt ? new Date(row.issuedAt).toLocaleString() : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {row.returnedAt ? new Date(row.returnedAt).toLocaleString() : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">{row.createdBy || "—"}</td>
                        <td className="px-4 py-3">
                          {row.status === "fully_returned" ? (
                            <span className="text-xs text-slate-400">Closed</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openReturn(row)}
                              className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                            >
                              <FaUndo size={10} /> Return
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center text-slate-400">
                      No chef issue records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Return modal */}
      {returnModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                Record Return — {returnModal.itemName}
              </h3>
              <button
                type="button"
                onClick={() => setReturnModal(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100"
              >
                <FaTimes />
              </button>
            </div>
            <p className="mb-4 rounded-xl bg-amber-50 px-4 py-2 text-xs font-medium text-amber-700">
              Chef: {returnModal.chefName || "—"} · Maximum returnable quantity: {returnModal.max}
            </p>
            <form onSubmit={submitReturn} className="space-y-4">
              <Field label="Quantity to Return" required>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={returnModal.max}
                  value={returnForm.quantityReturned}
                  onChange={(e) => setReturnForm((c) => ({ ...c, quantityReturned: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  placeholder="e.g. 2"
                />
              </Field>
              <Field label="Remarks (optional)">
                <textarea
                  rows={2}
                  value={returnForm.remarks}
                  onChange={(e) => setReturnForm((c) => ({ ...c, remarks: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </Field>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReturnModal(null)}
                  className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={returning}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-60"
                >
                  <FaUndo size={12} />
                  {returning ? "Saving…" : "Confirm Return"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}