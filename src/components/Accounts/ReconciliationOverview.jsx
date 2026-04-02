import { useMemo, useState } from "react";

const formatINR = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

const toKey = (item) => `${item.sourceType}:${item.sourceId}`;

const buildBankOptionLabel = (entry) => {
  const amount = Number(entry.amount || entry.credit || entry.debit || 0);
  const reference = entry.reference_no ? ` | ${entry.reference_no}` : "";
  return `${entry.bank_name || "Bank"}${reference} | ${formatINR(amount)}`;
};

const ReconciliationOverview = ({
  summary,
  items,
  bankLedger,
  sourceFilter,
  onSourceFilterChange,
  matchFilter,
  onMatchFilterChange,
  onLink,
  onUnlink,
}) => {
  const [selectedLinks, setSelectedLinks] = useState({});
  const [busyKey, setBusyKey] = useState("");

  const unlinkedLedger = useMemo(
    () =>
      (bankLedger || []).filter(
        (entry) => !entry.source_type && !entry.source_id && !entry.sourceType && !entry.sourceId,
      ),
    [bankLedger],
  );

  const getCandidates = (item) =>
    unlinkedLedger.filter((entry) => {
      const entryDirection = String(entry.direction || (Number(entry.debit || 0) > 0 ? "out" : "in"))
        .trim()
        .toLowerCase();
      const itemDirection = String(item.direction || "in").trim().toLowerCase();
      if (entryDirection !== itemDirection) return false;

      const entryMode = String(entry.payment_mode || entry.paymentMode || "manual")
        .trim()
        .toLowerCase();
      const itemMode = String(item.paymentMode || "unknown")
        .trim()
        .toLowerCase();
      return entryMode === "manual" || entryMode === itemMode;
    });

  const handleLink = async (item) => {
    const key = toKey(item);
    const bankLedgerId = selectedLinks[key];
    if (!bankLedgerId) return;

    setBusyKey(key);
    await onLink({
      bankLedgerId,
      sourceType: item.sourceType,
      sourceId: item.sourceId,
      matchedAmount: item.sourceAmount,
    });
    setBusyKey("");
    setSelectedLinks((prev) => ({ ...prev, [key]: "" }));
  };

  const handleUnlink = async (item) => {
    if (!item.linkedBankLedgerId) return;
    setBusyKey(toKey(item));
    await onUnlink({ bankLedgerId: item.linkedBankLedgerId });
    setBusyKey("");
  };

  return (
    <section className="rounded-[26px] border border-white/60 bg-white/82 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-700">
            Linked Reconciliation Flow
          </div>
          <h2 className="mt-2 text-2xl font-black text-slate-900">
            Billing to bank reconciliation view
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Match paid hotel invoices, restaurant bills, banquet invoices, and vendor payouts with
            bank ledger rows so the accounts team can verify what is billed, what reached the bank,
            and what still needs action.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Bank In", value: formatINR(summary.totalBankIn), tone: "text-cyan-700" },
            { label: "Bank Out", value: formatINR(summary.totalBankOut), tone: "text-rose-700" },
            { label: "Unmatched Amount", value: formatINR(summary.unmatchedAmount), tone: "text-amber-700" },
            { label: "Reconciled Amount", value: formatINR(summary.reconciledAmount), tone: "text-emerald-700" },
          ].map((card) => (
            <div
              key={card.label}
              className="min-w-[180px] rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {card.label}
              </div>
              <div className={`mt-3 text-2xl font-black ${card.tone}`}>{card.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Source Filter
          </span>
          <select
            value={sourceFilter}
            onChange={(event) => onSourceFilterChange(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
          >
            <option value="all">All Sources</option>
            <option value="invoice">Hotel Invoices</option>
            <option value="restaurant_bill">Restaurant Bills</option>
            <option value="banquet">Banquet Invoices</option>
            <option value="vendor_payment">Vendor Payments</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Match Filter
          </span>
          <select
            value={matchFilter}
            onChange={(event) => onMatchFilterChange(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
          >
            <option value="all">All Match States</option>
            <option value="unmatched">Unmatched</option>
            <option value="partial">Partial</option>
            <option value="matched">Matched</option>
            <option value="reconciled">Reconciled</option>
          </select>
        </label>

        <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Flow Hint
          </div>
          <div className="mt-2">
            Paid billing rows should be linked with a bank ledger entry. Cash rows can remain
            outside bank reconciliation.
          </div>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-[18px] border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.14em] text-slate-500">
            <tr>
              <th className="px-3 py-3">Source</th>
              <th className="px-3 py-3">Reference</th>
              <th className="px-3 py-3">Party</th>
              <th className="px-3 py-3">Label</th>
              <th className="px-3 py-3">Payment Mode</th>
              <th className="px-3 py-3">Billed</th>
              <th className="px-3 py-3">Bank</th>
              <th className="px-3 py-3">Difference</th>
              <th className="px-3 py-3">Match</th>
              <th className="px-3 py-3">Reconciliation</th>
              <th className="px-3 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {(items || []).slice(0, 10).map((item) => {
              const key = toKey(item);
              const candidates = getCandidates(item);
              const busy = busyKey === key;

              return (
                <tr key={key} className="border-t border-slate-200">
                  <td className="px-3 py-3 text-slate-700">{item.sourceType}</td>
                  <td className="px-3 py-3 font-semibold text-slate-900">{item.sourceReference}</td>
                  <td className="px-3 py-3 text-slate-700">{item.partyName || "-"}</td>
                  <td className="px-3 py-3 text-slate-700">{item.sourceLabel || "-"}</td>
                  <td className="px-3 py-3 text-slate-700">{item.paymentMode || "-"}</td>
                  <td className="px-3 py-3 font-semibold text-slate-900">
                    {formatINR(item.sourceAmount)}
                  </td>
                  <td className="px-3 py-3 text-slate-700">{formatINR(item.bankAmount)}</td>
                  <td className="px-3 py-3 text-slate-700">{formatINR(item.difference)}</td>
                  <td className="px-3 py-3">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">
                      {item.matchStatus}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">
                      {item.reconciliationStatus}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {item.linkedBankLedgerId ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleUnlink(item)}
                        className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 disabled:opacity-60"
                      >
                        Unlink
                      </button>
                    ) : candidates.length ? (
                      <div className="flex min-w-[240px] flex-col gap-2">
                        <select
                          value={selectedLinks[key] || ""}
                          onChange={(event) =>
                            setSelectedLinks((prev) => ({ ...prev, [key]: event.target.value }))
                          }
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none"
                        >
                          <option value="">Select bank row</option>
                          {candidates.map((entry) => (
                            <option key={entry.id} value={entry.id}>
                              {buildBankOptionLabel(entry)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={busy || !selectedLinks[key]}
                          onClick={() => handleLink(item)}
                          className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-700 disabled:opacity-60"
                        >
                          Link
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">No free bank row</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!items?.length ? (
              <tr>
                <td colSpan={11} className="px-3 py-6 text-center text-slate-500">
                  No reconciliation items for the selected filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default ReconciliationOverview;
