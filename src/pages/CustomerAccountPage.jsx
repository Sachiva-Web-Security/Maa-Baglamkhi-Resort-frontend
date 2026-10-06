import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaSearch,
  FaFileInvoiceDollar,
  FaMoneyBillWave,
  FaUndoAlt,
  FaPrint,
} from "react-icons/fa";

import API from "../api";

const formatINR = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

const toNumber = (value) => Number(value || 0);
const STATEMENT_PAGE_SIZE = 25;

const flowMeta = {
  Income: {
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    sign: "+",
    tone: "text-emerald-700",
  },
  Expense: {
    className: "border-rose-200 bg-rose-50 text-rose-700",
    sign: "−",
    tone: "text-rose-700",
  },
};

const modeMeta = {
  Cash: "border-slate-200 bg-slate-50 text-slate-700",
  UPI: "border-sky-200 bg-sky-50 text-sky-700",
  Card: "border-indigo-200 bg-indigo-50 text-indigo-700",
  "Bank Transfer": "border-violet-200 bg-violet-50 text-violet-700",
  Cheque: "border-amber-200 bg-amber-50 text-amber-700",
  Pending: "border-amber-200 bg-amber-50 text-amber-700",
  "Billed to Room": "border-cyan-200 bg-cyan-50 text-cyan-700",
  Folio: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
};

const sourceMeta = {
  invoice: { label: "Invoice", tone: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  payment_history: { label: "Payment History", tone: "border-sky-200 bg-sky-50 text-sky-700" },
  restaurant_bill: { label: "Restaurant", tone: "border-cyan-200 bg-cyan-50 text-cyan-700" },
  room_order: { label: "Room Order", tone: "border-amber-200 bg-amber-50 text-amber-700" },
  advance_payment: { label: "Advance", tone: "border-violet-200 bg-violet-50 text-violet-700" },
  accounts_transactions: { label: "Transaction", tone: "border-slate-200 bg-slate-50 text-slate-700" },
  hotel_folio: { label: "Folio", tone: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700" },
  banquet_booking: { label: "Banquet", tone: "border-orange-200 bg-orange-50 text-orange-700" },
  other: { label: "Other", tone: "border-slate-200 bg-slate-50 text-slate-700" },
};

const resolveModeClass = (mode) => {
  if (!mode) return modeMeta.Cash;
  const key = Object.keys(modeMeta).find((k) => String(mode).toLowerCase().includes(k.toLowerCase()));
  return modeMeta[key] || "border-slate-200 bg-slate-50 text-slate-700";
};

const resolveSource = (source) => {
  const key = Object.keys(sourceMeta).find((k) => String(source || "").toLowerCase().includes(k));
  return sourceMeta[key || "other"];
};

const CustomerAccountPage = () => {
  const { identifier } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [query, setQuery] = useState(() => String(identifier || "").trim());
  const [by, setBy] = useState("auto");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [statementPage, setStatementPage] = useState(1);
  const abortRef = useRef(null);

  const fetchStatement = async (value, lookupBy, replaceHistory = false) => {
    const trimmed = String(value || "").trim();
    if (!trimmed) return;

    setLoading(true);
    setError("");
    setData(null);
    setStatementPage(1);

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resolvedBy = lookupBy === "auto"
        ? (!Number.isNaN(Number(trimmed)) && Number(trimmed) >= 1000000000 && Number(trimmed) <= 9999999999999 ? "mobile" : "name")
        : lookupBy;

      const res = await API.get("/accounts/customer-statement", {
        signal: controller.signal,
        params: { by: resolvedBy, value: trimmed },
      });
      if (!controller.signal.aborted) {
        setData(res.data || null);
        if (replaceHistory) {
          navigate(`/accounts/customer/${encodeURIComponent(trimmed)}`, { replace: true });
        }
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err?.response?.data?.message || "Unable to load customer statement");
        setData(null);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const raw = String(identifier || "").trim();
    if (!raw) return;
    setQuery(raw);
    fetchStatement(raw, by, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identifier]);

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const customerName = useMemo(() => {
    if (!data?.customer) return query || "Customer";
    return data.customer.name || data.customer.guest_name || data.customer.customer_name || query || "Customer";
  }, [data, query]);

  const transactions = useMemo(() => {
    if (!Array.isArray(data?.transactions)) return [];
    return [...data.transactions].sort((a, b) => String(b.sort_date || "").localeCompare(String(a.sort_date || "")));
  }, [data]);

  const totals = useMemo(() => {
    if (data?.totals) return data.totals;
    const income = transactions.reduce((s, row) => s + (String(row.flow_type || "").toLowerCase() === "income" ? toNumber(row.amount) : 0), 0);
    const expense = transactions.reduce((s, row) => s + (String(row.flow_type || "").toLowerCase() === "expense" ? toNumber(row.amount) : 0), 0);
    return { income, expense, net: income - expense };
  }, [data, transactions]);

  const paginated = useMemo(() => {
    const start = (statementPage - 1) * STATEMENT_PAGE_SIZE;
    return transactions.slice(start, start + STATEMENT_PAGE_SIZE);
  }, [transactions, statementPage]);

  const statementTotalPages = Math.max(1, Math.ceil(transactions.length / STATEMENT_PAGE_SIZE));

  useEffect(() => {
    if (statementPage > statementTotalPages) setStatementPage(statementTotalPages);
  }, [statementPage, statementTotalPages]);

  const doSearch = () => fetchStatement(query, by, true);

  const handleSearchKey = (event) => {
    if (event.key === "Enter") doSearch();
  };

  const print = () => window.print();

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[linear-gradient(135deg,#f5fbff_0%,#f3f8f4_28%,#fff8f1_58%,#f8fafc_100%)] p-3 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-8%] top-[-6%] h-72 w-72 rounded-full bg-blue-200/45 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute right-[-10%] top-[8%] h-72 w-72 rounded-full bg-amber-200/45 blur-3xl sm:h-[28rem] sm:w-[28rem]" />
      </div>

      <div className="space-y-5 sm:space-y-7">
        {/* HERO */}
        <section className="overflow-hidden rounded-[22px] border border-slate-900/10 bg-gradient-to-br from-blue-950 via-blue-800 to-sky-500 px-4 py-5 text-white shadow-[0_22px_55px_rgba(15,23,42,0.12)] sm:rounded-[28px] sm:px-7 sm:py-8">
          <div className="grid gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.95fr)] lg:items-center">
            <div className="space-y-3 sm:space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-cyan-200 sm:text-sm">
                Finance Center
              </p>
              <h1 className="text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
                Customer account statement
              </h1>
              <p className="max-w-3xl text-base leading-7 text-slate-100/85 sm:text-lg sm:leading-8 lg:text-xl">
                Full incoming and outgoing record for one customer across hotel, restaurant, banquet, invoices, payments, folios, and manual transactions.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={() => navigate("/accounts")}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-base font-bold text-slate-900 shadow-[0_16px_35px_rgba(255,255,255,0.15)] sm:w-auto"
                >
                  <FaArrowLeft className="text-cyan-600" />
                  Back To Accounts
                </button>
                <label className="w-full rounded-[20px] border border-white/15 bg-white/10 px-4 py-3 text-left backdrop-blur-md sm:min-w-[220px] sm:w-auto">
                  <span className="block text-sm font-semibold uppercase tracking-[0.2em] text-cyan-100/80">
                    Lookup By
                  </span>
                  <select
                    value={by}
                    onChange={(event) => setBy(event.target.value)}
                    className="mt-2 w-full bg-transparent text-base font-semibold text-white outline-none"
                  >
                    <option value="auto" className="text-slate-900">Auto Detect</option>
                    <option value="mobile" className="text-slate-900">Mobile</option>
                    <option value="name" className="text-slate-900">Name</option>
                  </select>
                </label>
                <label className="flex-1 rounded-[20px] border border-white/15 bg-white/10 px-4 py-3 text-left backdrop-blur-md sm:min-w-[260px] sm:w-auto">
                  <span className="block text-sm font-semibold uppercase tracking-[0.2em] text-cyan-100/80">
                    Search Customer
                  </span>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={handleSearchKey}
                    placeholder="Mobile number or customer name"
                    className="mt-2 w-full bg-transparent text-base font-semibold text-white outline-none placeholder:text-white/60"
                  />
                </label>
                <button
                  type="button"
                  onClick={doSearch}
                  disabled={loading || !query.trim()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-cyan-400 px-5 py-3 text-base font-bold text-white transition hover:bg-cyan-300 disabled:opacity-50 sm:w-auto"
                >
                  <FaSearch />
                  {loading ? "Loading..." : "Open Statement"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {[
                { label: "Total Income", value: formatINR(totals.income), tone: "text-emerald-200" },
                { label: "Total Expense", value: formatINR(totals.expense), tone: "text-rose-200" },
                { label: "Net Position", value: formatINR(totals.net), tone: "text-white" },
                { label: "Transactions", value: String(transactions.length), tone: "text-cyan-200" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[18px] border border-white/12 bg-white/10 px-3 py-3 backdrop-blur-md sm:rounded-[22px] sm:px-4 sm:py-4"
                >
                  <span className="text-[13px] font-semibold text-slate-100/85 sm:text-[16px]">{item.label}</span>
                  <div className={`mt-2 text-xl font-bold leading-none sm:mt-3 sm:text-3xl ${item.tone}`}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ERROR */}
        {error ? (
          <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : null}

        {/* STATEMENT */}
        {data ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700 sm:text-base">
                  Statement
                </div>
                <h2 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl lg:text-5xl">
                  {customerName}
                </h2>
                <p className="mt-2 text-[15px] font-semibold text-slate-500">
                  {transactions.length} recorded entr{transactions.length === 1 ? "y" : "ies"}
                </p>
              </div>
              <button
                type="button"
                onClick={print}
                className="w-fit rounded-full border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-bold text-slate-700 sm:text-sm"
              >
                <FaPrint className="mr-2 inline text-slate-500" />
                Print Statement
              </button>
            </div>

            {/* DESKTOP TABLE */}
            <div className="hidden overflow-x-auto rounded-[22px] border border-slate-200 xl:block">
              <table className="min-w-full text-left text-base">
                <thead className="bg-slate-50 text-sm uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Mode</th>
                    <th className="px-4 py-3">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((row) => {
                    const flow = String(row.flow_type || "Income").trim();
                    const isIncome = flow.toLowerCase() === "income";
                    const meta = isIncome ? flowMeta.Income : flowMeta.Expense;
                    const modeCls = resolveModeClass(row.mode);
                    const source = resolveSource(row.source);

                    return (
                      <tr key={row.id} className="border-t border-slate-200">
                        <td className="px-4 py-4 text-lg text-slate-700">{row.date || "--"}</td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-[12px] font-bold sm:px-4 sm:py-1.5 sm:text-sm ${meta.className}`}>
                            {flow}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-lg text-slate-700">{row.department || "--"}</td>
                        <td className="px-4 py-4 text-lg text-slate-700">
                          <div className="max-w-xl">{row.description || "--"}</div>
                          {row.narration ? (
                            <div className="text-sm text-slate-500">{row.narration}</div>
                          ) : null}
                        </td>
                        <td className={`px-4 py-4 text-right text-lg font-black ${meta.tone}`}>
                          {meta.sign} {formatINR(row.amount)}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-[12px] font-bold sm:px-4 sm:py-1.5 sm:text-sm ${modeCls}`}>
                            {row.mode || "Cash"}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-[12px] font-bold sm:px-4 sm:py-1.5 sm:text-sm ${source.tone}`}>
                            {source.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {!paginated.length ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        No transactions found for this customer.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            {/* MOBILE / TABLET CARDS */}
            <div className="space-y-3 xl:hidden">
              {paginated.map((row) => {
                const flow = String(row.flow_type || "Income").trim();
                const isIncome = flow.toLowerCase() === "income";
                const meta = isIncome ? flowMeta.Income : flowMeta.Expense;
                const modeCls = resolveModeClass(row.mode);
                const source = resolveSource(row.source);

                return (
                  <div
                    key={row.id}
                    className="rounded-[18px] border border-slate-200 bg-white p-3.5 shadow-sm sm:rounded-[20px] sm:p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className={`inline-flex rounded-full border px-3 py-1 text-[12px] font-bold sm:px-4 sm:py-1.5 sm:text-sm ${meta.className}`}>
                          {flow}
                        </span>
                        <div className="mt-2 text-base font-bold text-slate-900">{row.description || "--"}</div>
                        {row.narration ? (
                          <div className="mt-1 text-sm text-slate-500">{row.narration}</div>
                        ) : null}
                      </div>
                      <div className={`text-right text-lg font-black ${meta.tone}`}>
                        {meta.sign} {formatINR(row.amount)}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-600">
                      <span className="text-slate-500">{row.date || "--"}</span>
                      <span className="text-slate-300">•</span>
                      <span>{row.department || "--"}</span>
                      <span className="text-slate-300">•</span>
                      <span className={`rounded-full border px-3 py-1 text-[12px] font-bold ${modeCls}`}>{row.mode || "Cash"}</span>
                      <span className={`rounded-full border px-3 py-1 text-[12px] font-bold ${source.tone}`}>{source.label}</span>
                    </div>
                  </div>
                );
              })}

              {!paginated.length ? (
                <div className="rounded-[18px] border border-slate-200 bg-white p-6 text-center text-slate-500">
                  No transactions found for this customer.
                </div>
              ) : null}
            </div>

            {/* PAGINATION */}
            {transactions.length > STATEMENT_PAGE_SIZE ? (
              <div className="flex items-center justify-between rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">
                <span>
                  Page {statementPage} of {statementTotalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStatementPage((page) => Math.max(1, page - 1))}
                    disabled={statementPage <= 1}
                    className="rounded-full border border-slate-200 px-3 py-1 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatementPage((page) => Math.min(statementTotalPages, page + 1))}
                    disabled={statementPage >= statementTotalPages}
                    className="rounded-full border border-slate-200 px-3 py-1 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* LOADING */}
        {loading ? (
          <div className="rounded-[20px] border border-slate-200 bg-white px-5 py-6 text-center text-base font-semibold text-slate-600">
            Loading customer statement...
          </div>
        ) : null}

        {/* EMPTY */}
        {!loading && !error && !data ? (
          <div className="rounded-[20px] border border-slate-200 bg-white px-5 py-6 text-center text-base font-semibold text-slate-600">
            Search for a customer by mobile number or name to open their full statement.
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default CustomerAccountPage;
