import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import API from "../../api";
import { restaurantService } from "../../services/restaurantService";

const inferEntityType = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "Table";
  if (/^\d+$/.test(normalized) || normalized.includes("room")) return "Room";
  return "Table";
};

const formatDateTime = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const downloadCsv = (rows) => {
  const headers = ["Date", "From", "To", "Token Code", "Transferred By"];
  const lines = rows.map((row) =>
    [
      formatDateTime(row.created_at),
      `${row.source_type} / ${row.source_ref}`,
      `${row.target_type} / ${row.target_ref}`,
      row.token_code,
      row.transferred_by || "System User",
    ]
      .map((item) => `"${String(item || "").replaceAll('"', '""')}"`)
      .join(","),
  );
  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "token-transfer-report.csv";
  link.click();
  URL.revokeObjectURL(url);
};

const TransferModal = ({
  open,
  mode,
  activeTokens,
  tables,
  rooms,
  submitting,
  onClose,
  onSubmit,
}) => {
  const [tokenId, setTokenId] = useState("");
  const [targetType, setTargetType] = useState("Table");
  const [targetRef, setTargetRef] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    const filtered = activeTokens.filter((token) => {
      if (mode === "table") return inferEntityType(token.tableNumber) === "Table";
      if (mode === "room") return inferEntityType(token.tableNumber) === "Room";
      return true;
    });
    setTokenId(filtered[0]?.id ? String(filtered[0].id) : "");
    setTargetType(mode === "room" ? "Room" : "Table");
    setTargetRef("");
    setNotes("");
  }, [open, mode, activeTokens]);

  const filteredTokens = useMemo(
    () =>
      activeTokens.filter((token) => {
        if (mode === "table") return inferEntityType(token.tableNumber) === "Table";
        if (mode === "room") return inferEntityType(token.tableNumber) === "Room";
        return true;
      }),
    [activeTokens, mode],
  );

  const selectedToken = filteredTokens.find((token) => String(token.id) === String(tokenId));
  const targetOptions = targetType === "Room" ? rooms : tables;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-sm px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-[30px] border border-white/10 bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.35)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700">
              Transfer Token
            </p>
            <h3 className="mt-2 text-3xl font-black text-slate-900">
              {mode === "code"
                ? "Transfer by token code"
                : mode === "room"
                  ? "Transfer room token"
                  : "Transfer table token"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600"
          >
            Close
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 md:col-span-2">
            <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Active Token
            </label>
            <select
              value={tokenId}
              onChange={(event) => setTokenId(event.target.value)}
              className="mt-2 w-full rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-400"
            >
              <option value="">Select active token</option>
              {filteredTokens.map((token) => (
                <option key={token.id} value={token.id}>
                  {token.tokenCode} | {inferEntityType(token.tableNumber)} / {token.tableNumber} | {token.itemCount} items
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
            <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Target Type
            </label>
            <select
              value={targetType}
              onChange={(event) => {
                setTargetType(event.target.value);
                setTargetRef("");
              }}
              className="mt-2 w-full rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-400"
            >
              <option value="Table">Table</option>
              <option value="Room">Room</option>
            </select>
          </div>

          <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
            <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Target Reference
            </label>
            <select
              value={targetRef}
              onChange={(event) => setTargetRef(event.target.value)}
              className="mt-2 w-full rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-400"
            >
              <option value="">Select {targetType.toLowerCase()}</option>
              {targetOptions.map((option) => (
                <option key={String(option)} value={String(option)}>
                  {String(option)}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 md:col-span-2">
            <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="Optional transfer note"
              className="mt-2 w-full rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-400"
            />
          </div>
        </div>

        {selectedToken ? (
          <div className="mt-5 rounded-[24px] border border-slate-200 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_100%)] p-5">
            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Token</div>
                <div className="mt-1 text-sm font-black text-slate-900">{selectedToken.tokenCode}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Current Ref</div>
                <div className="mt-1 text-sm font-black text-slate-900">{selectedToken.tableNumber}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Items</div>
                <div className="mt-1 text-sm font-black text-slate-900">{selectedToken.itemCount}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Amount</div>
                <div className="mt-1 text-sm font-black text-slate-900">Rs. {Number(selectedToken.totalAmount || 0).toFixed(2)}</div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[16px] border border-slate-200 bg-slate-100 px-5 py-3 text-sm font-bold text-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() =>
              onSubmit({
                tokenId,
                sourceType: inferEntityType(selectedToken?.tableNumber),
                sourceRef: selectedToken?.tableNumber,
                targetType,
                targetRef,
                notes,
              })
            }
            className="rounded-[16px] bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {submitting ? "Transferring..." : "Confirm Transfer"}
          </button>
        </div>
      </div>
    </div>
  );
};

const SettlementReport = () => {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(15);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [historyRows, setHistoryRows] = useState([]);
  const [activeTokens, setActiveTokens] = useState([]);
  const [tables, setTables] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [modalMode, setModalMode] = useState("");

  const loadPage = async (filters = {}) => {
    try {
      setLoading(true);
      const [historyResponse, activeTokensResponse, tablesResponse, roomsResponse] = await Promise.all([
        restaurantService.getTokenTransferHistory({
          startDate: filters.startDate ?? startDate,
          endDate: filters.endDate ?? endDate,
          search: filters.search ?? search,
          limit: filters.limit ?? pageSize,
        }),
        restaurantService.getActiveTokens(),
        API.get("/restaurant/tables"),
        API.get("/housekeeping"),
      ]);

      const history = historyResponse || [];
      setHistoryRows(history);
      setSelectedRow(history[0] || null);
      setActiveTokens(activeTokensResponse || []);
      setTables((tablesResponse.data || []).map((item) => item.number).filter(Boolean));
      setRooms(
        (roomsResponse.data || [])
          .map((item) => item.roomNo || item.roomNumber || item.room_number)
          .filter(Boolean)
          .map(String),
      );
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Transfer report load nahi ho paaya.");
      setHistoryRows([]);
      setActiveTokens([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialLoad = async () => {
      try {
        setLoading(true);
        const [historyResponse, activeTokensResponse, tablesResponse, roomsResponse] = await Promise.all([
          restaurantService.getTokenTransferHistory({ limit: pageSize }),
          restaurantService.getActiveTokens(),
          API.get("/restaurant/tables"),
          API.get("/housekeeping"),
        ]);

        const history = historyResponse || [];
        setHistoryRows(history);
        setSelectedRow(history[0] || null);
        setActiveTokens(activeTokensResponse || []);
        setTables((tablesResponse.data || []).map((item) => item.number).filter(Boolean));
        setRooms(
          (roomsResponse.data || [])
            .map((item) => item.roomNo || item.roomNumber || item.room_number)
            .filter(Boolean)
            .map(String),
        );
      } catch (error) {
        console.error(error);
        alert(error.response?.data?.message || "Transfer report load nahi ho paaya.");
        setHistoryRows([]);
        setActiveTokens([]);
      } finally {
        setLoading(false);
      }
    };

    initialLoad();
  }, [pageSize]);

  const handleSubmitFilters = () => {
    loadPage({ startDate, endDate, search, limit: pageSize });
  };

  const handleTransfer = async ({ tokenId, sourceType, sourceRef, targetType, targetRef, notes }) => {
    if (!tokenId || !sourceRef || !targetRef) {
      alert("Token aur target select kijiye.");
      return;
    }

    try {
      setSubmitting(true);
      await restaurantService.transferToken({
        tokenId: Number(tokenId),
        sourceType,
        sourceRef,
        targetType,
        targetRef,
        transferredBy: "System User",
        notes,
      });
      setModalMode("");
      await loadPage({ startDate, endDate, search, limit: pageSize });
      window.dispatchEvent(new Event("tokenUpdated"));
      alert("Token transfer ho gaya.");
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Token transfer nahi ho paaya.");
    } finally {
      setSubmitting(false);
    }
  };

  const summary = useMemo(() => {
    const roomTransfers = historyRows.filter((row) => row.target_type === "Room" || row.source_type === "Room").length;
    const tableTransfers = historyRows.filter((row) => row.target_type === "Table" || row.source_type === "Table").length;
    return {
      totalTransfers: historyRows.length,
      activeTokens: activeTokens.length,
      roomTransfers,
      tableTransfers,
    };
  }, [historyRows, activeTokens]);

  const printRows = () => {
    const body = historyRows
      .map(
        (row) => `
          <tr>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${formatDateTime(row.created_at)}</td>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${row.source_type} / ${row.source_ref}</td>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${row.target_type} / ${row.target_ref}</td>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${row.token_code}</td>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${row.transferred_by || "System User"}</td>
          </tr>
        `,
      )
      .join("");

    const win = window.open("", "_blank");
    win.document.write(`
      <html>
        <head><title>Transferred Tokens</title></head>
        <body style="font-family:Segoe UI,sans-serif;padding:18px;color:#0f172a;">
          <h2>Transferred Restaurant Tokens</h2>
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr>
                <th style="text-align:left;padding:8px;background:#f8fafc;">Date</th>
                <th style="text-align:left;padding:8px;background:#f8fafc;">Transferred From</th>
                <th style="text-align:left;padding:8px;background:#f8fafc;">Transferred To</th>
                <th style="text-align:left;padding:8px;background:#f8fafc;">Token</th>
                <th style="text-align:left;padding:8px;background:#f8fafc;">Transferred By</th>
              </tr>
            </thead>
            <tbody>${body || '<tr><td colspan="5" style="padding:12px;">No data</td></tr>'}</tbody>
          </table>
        </body>
      </html>
    `);
    win.document.close();
    win.print();
    win.close();
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#1a253c_0%,#223252_100%)] p-4 sm:p-6">
      <div className="mx-auto max-w-[1440px] space-y-6">
        <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_48%,#0f766e_100%)] px-6 py-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.35)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200">
                Transfer Restaurant Token
              </p>
              <h1 className="mt-2 text-3xl font-black">Live token transfer control panel</h1>
              <p className="mt-2 text-sm text-white/80">
                Table, room aur token-code based transfer ko real history ke saath manage kijiye.
              </p>
            </div>
            <button
              type="button"
              onClick={printRows}
              className="rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-lg"
            >
              Print Report
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Total Transfers", summary.totalTransfers],
            ["Active Tokens", summary.activeTokens],
            ["Table Transfers", summary.tableTransfers],
            ["Room Transfers", summary.roomTransfers],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-[24px] border border-slate-200/70 bg-white/95 px-5 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.1)]"
            >
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</div>
              <div className="mt-2 text-3xl font-black text-slate-900">{value}</div>
            </div>
          ))}
        </section>

        <section className="rounded-[28px] border border-slate-200/70 bg-white/95 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.1)]">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_160px_140px]">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="mt-2 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="mt-2 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none focus:border-blue-400"
              />
            </div>
            <button
              type="button"
              onClick={handleSubmitFilters}
              className="self-end rounded-[18px] bg-gradient-to-r from-emerald-500 to-green-600 px-5 py-3 text-sm font-bold text-white"
            >
              {loading ? "Loading..." : "Submit"}
            </button>
            <button
              type="button"
              onClick={printRows}
              className="self-end rounded-[18px] bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-3 text-sm font-bold text-white"
            >
              Print
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setModalMode("table")}
              className="rounded-[16px] bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 text-sm font-bold text-white"
            >
              Transfer Token By Table
            </button>
            <button
              type="button"
              onClick={() => setModalMode("code")}
              className="rounded-[16px] bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-sm font-bold text-white"
            >
              Transfer Token By Token Code
            </button>
            <button
              type="button"
              onClick={() => setModalMode("room")}
              className="rounded-[16px] bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-3 text-sm font-bold text-white"
            >
              Transfer Token By Room
            </button>
            <button
              type="button"
              onClick={() => downloadCsv(historyRows)}
              className="rounded-[16px] bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-3 text-sm font-bold text-white"
            >
              Excel Export
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span>Display</span>
              <select
                value={pageSize}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setPageSize(next);
                  loadPage({ startDate, endDate, search, limit: next });
                }}
                className="rounded-xl border border-slate-200 px-3 py-2"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span>records</span>
            </div>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSubmitFilters();
                }
              }}
              placeholder="Search by token, source, target, user"
              className="w-full max-w-[360px] rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400"
            />
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-[28px] border border-slate-200/70 bg-white/95 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.1)]">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">Transfer History</p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">Transferred restaurant tokens</h2>
              </div>
              <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600">
                Rows {historyRows.length}
              </div>
            </div>

            {loading ? <div className="py-14 text-center text-sm text-slate-500">Loading transfer history...</div> : null}
            {!loading && historyRows.length === 0 ? (
              <div className="py-14 text-center text-sm text-slate-500">No transfer data found.</div>
            ) : null}

            {!loading && historyRows.length > 0 ? (
              <div className="mt-5 overflow-hidden rounded-[22px] border border-slate-200">
                <div className="grid grid-cols-[170px_minmax(0,1fr)_minmax(0,1fr)_160px_160px] bg-slate-100 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-600">
                  <div>Date</div>
                  <div>Transferred From</div>
                  <div>Transferred To</div>
                  <div>Token</div>
                  <div>Transferred By</div>
                </div>
                <div className="max-h-[640px] overflow-auto">
                  {historyRows.map((row) => (
                    <button
                      type="button"
                      key={row.id}
                      onClick={() => setSelectedRow(row)}
                      className={`grid w-full grid-cols-[170px_minmax(0,1fr)_minmax(0,1fr)_160px_160px] items-center gap-2 border-t border-slate-100 px-4 py-4 text-left ${
                        selectedRow?.id === row.id ? "bg-blue-50" : "bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-sm font-semibold text-slate-700">{formatDateTime(row.created_at)}</div>
                      <div className="text-sm font-bold text-slate-900">{row.source_type} / {row.source_ref}</div>
                      <div className="text-sm font-bold text-slate-900">{row.target_type} / {row.target_ref}</div>
                      <div className="text-sm font-black text-blue-700">{row.token_code}</div>
                      <div className="text-sm text-slate-700">{row.transferred_by || "System User"}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-slate-200/70 bg-white/95 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.1)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-600">Selected Transfer</p>
              <h3 className="mt-2 text-2xl font-black text-slate-900">Transfer details panel</h3>
              {selectedRow ? (
                <div className="mt-5 space-y-3">
                  {[
                    ["Token Code", selectedRow.token_code],
                    ["Transferred From", `${selectedRow.source_type} / ${selectedRow.source_ref}`],
                    ["Transferred To", `${selectedRow.target_type} / ${selectedRow.target_ref}`],
                    ["Transferred By", selectedRow.transferred_by || "System User"],
                    ["Date", formatDateTime(selectedRow.created_at)],
                    ["Notes", selectedRow.notes || "--"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-[18px] bg-slate-50 px-4 py-4">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</div>
                      <div className="mt-1 text-sm font-black text-slate-900">{value}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-[18px] bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                  Koi transfer row select kijiye.
                </div>
              )}
            </div>

            <div className="rounded-[28px] border border-slate-200/70 bg-white/95 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.1)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-700">Active Tokens</p>
                  <h3 className="mt-2 text-2xl font-black text-slate-900">Live token pool</h3>
                </div>
                <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600">
                  {activeTokens.length} active
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {activeTokens.slice(0, 6).map((token) => (
                  <button
                    key={token.id}
                    type="button"
                    onClick={() =>
                      navigate(`/restaurant/edit-token/${token.tableNumber}`, {
                        state: { entityType: inferEntityType(token.tableNumber) },
                      })
                    }
                    className="w-full rounded-[20px] border border-slate-200 bg-[linear-gradient(135deg,#f8fbff_0%,#ffffff_100%)] px-4 py-4 text-left transition hover:border-blue-300 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-black text-slate-900">{token.tokenCode}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">
                          {inferEntityType(token.tableNumber)} / {token.tableNumber}
                        </div>
                      </div>
                      <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                        {token.itemCount} items
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                      <span>{token.waiter || "Waiter"}</span>
                      <span className="font-bold text-slate-900">Rs. {Number(token.totalAmount || 0).toFixed(2)}</span>
                    </div>
                  </button>
                ))}
                {!activeTokens.length ? (
                  <div className="rounded-[18px] bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                    Koi active token nahi mila.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </div>

      <TransferModal
        open={Boolean(modalMode)}
        mode={modalMode}
        activeTokens={activeTokens}
        tables={tables}
        rooms={rooms}
        submitting={submitting}
        onClose={() => setModalMode("")}
        onSubmit={handleTransfer}
      />
    </div>
  );
};

export default SettlementReport;
