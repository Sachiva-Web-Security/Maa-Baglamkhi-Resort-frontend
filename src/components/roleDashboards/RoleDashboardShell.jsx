import { Link } from "react-router-dom";
import { FaArrowRight } from "react-icons/fa";

const toneMap = {
  cyan: "from-cyan-500 to-sky-500",
  emerald: "from-emerald-500 to-teal-500",
  amber: "from-amber-500 to-orange-500",
  rose: "from-rose-500 to-pink-500",
  violet: "from-violet-500 to-fuchsia-500",
  slate: "from-slate-800 to-slate-600",
};

const borderToneMap = {
  cyan: "border-cyan-200 bg-cyan-50 text-cyan-700",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  rose: "border-rose-200 bg-rose-50 text-rose-700",
  violet: "border-violet-200 bg-violet-50 text-violet-700",
  slate: "border-slate-200 bg-slate-50 text-slate-700",
};

const iconBgMap = {
  cyan: "bg-gradient-to-br from-cyan-500 to-sky-500",
  emerald: "bg-gradient-to-br from-emerald-500 to-teal-500",
  amber: "bg-gradient-to-br from-amber-500 to-orange-500",
  rose: "bg-gradient-to-br from-rose-500 to-pink-500",
  violet: "bg-gradient-to-br from-violet-500 to-fuchsia-500",
  slate: "bg-gradient-to-br from-slate-800 to-slate-600",
};

const statusBadgeColor = (status) => {
  const s = String(status || "").toLowerCase();
  if (s.includes("confirmed") || s.includes("checked") || s.includes("completed") || s.includes("paid"))
    return "bg-emerald-100 text-emerald-700 border border-emerald-200";
  if (s.includes("pending") || s.includes("processing"))
    return "bg-amber-100 text-amber-700 border border-amber-200";
  if (s.includes("cancel") || s.includes("failed") || s.includes("overdue"))
    return "bg-rose-100 text-rose-700 border border-rose-200";
  if (s.includes("checkout") || s.includes("check-out") || s.includes("partial"))
    return "bg-cyan-100 text-cyan-700 border border-cyan-200";
  if (s.includes("high") || s.includes("urgent"))
    return "bg-red-100 text-red-700 border border-red-200";
  if (s.includes("medium"))
    return "bg-blue-100 text-blue-700 border border-blue-200";
  if (s.includes("low"))
    return "bg-slate-100 text-slate-600 border border-slate-200";
  return "bg-slate-100 text-slate-600 border border-slate-200";
};

const fallback = "--";

const StatCard = ({ card }) => {
  const tone = borderToneMap[card.tone] || borderToneMap.slate;
  const Icon = card.icon;

  return (
    <div className="group rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
            {card.label}
          </div>
          <div className="mt-3 text-[38px] font-black leading-none tracking-tight text-slate-900">
            {card.value ?? fallback}
          </div>
          <div className="mt-2.5 text-[15px] leading-relaxed text-slate-500">{card.note}</div>
        </div>
        {Icon ? (
          <span className={`inline-flex shrink-0 items-center justify-center rounded-[18px] ${iconBgMap[card.tone] || iconBgMap.slate} p-3.5 text-white shadow-lg shadow-black/10 transition-transform duration-300 group-hover:scale-110`}>
            <Icon size={26} />
          </span>
        ) : null}
      </div>
    </div>
  );
};

const QuickAction = ({ action }) => {
  const Icon = action.icon;
  const iconBg = iconBgMap[action.tone] || iconBgMap.cyan;

  return (
    <Link
      to={action.route}
      className="group flex flex-col rounded-[22px] border border-slate-900/5 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(15,23,42,0.1)]"
    >
      <div className="flex items-center justify-between">
        <span className={`inline-flex items-center justify-center rounded-2xl ${iconBg} p-3 text-white shadow-lg shadow-black/10 transition-transform duration-300 group-hover:scale-110`}>
          {Icon ? <Icon size={22} /> : null}
        </span>
        <span className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 p-2 text-slate-400 transition-all duration-300 group-hover:border-slate-900 group-hover:bg-slate-900 group-hover:text-white">
          <FaArrowRight size={14} />
        </span>
      </div>
      <h3 className="mt-4 text-[22px] font-bold text-slate-900">{action.label}</h3>
      <p className="mt-1.5 text-[15px] leading-relaxed text-slate-500">{action.helper}</p>
    </Link>
  );
};

const InsightCard = ({ item }) => {
  const Icon = item.icon;
  const iconBg = iconBgMap[item.tone] || iconBgMap.slate;

  return (
    <div className="group rounded-[22px] border border-slate-900/5 bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.03)] transition-all duration-300 hover:shadow-[0_6px_20px_rgba(15,23,42,0.07)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
            {item.label}
          </div>
          <div className="mt-2.5 text-[38px] font-black leading-none tracking-tight text-slate-900">{item.value ?? fallback}</div>
          <div className="mt-2 text-[15px] leading-relaxed text-slate-500">{item.note}</div>
        </div>
        {Icon ? (
          <span className={`inline-flex shrink-0 items-center justify-center rounded-[16px] ${iconBg} p-2.5 text-white shadow-md shadow-black/10 transition-transform duration-300 group-hover:scale-110`}>
            <Icon size={20} />
          </span>
        ) : null}
      </div>
    </div>
  );
};

const DataTable = ({ table }) => {
  if (!table) return null;

  return (
    <section className="rounded-[28px] border border-slate-900/5 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] overflow-hidden">
      {/* Table Header */}
      <div className="flex flex-col gap-3 border-b border-slate-900/5 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-6">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-emerald-500">
            {table.eyebrow || "Detail View"}
          </div>
          <h2 className="mt-2 text-[30px] font-bold tracking-tight text-slate-900">{table.title}</h2>
        </div>
        {table.meta ? (
          <div className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-600">
            {table.meta}
          </div>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead>
            <tr className="border-b border-slate-900/5 bg-slate-50/60">
              {table.columns.map((column) => (
                <th
                  key={column.key}
                  className="whitespace-nowrap px-6 py-4 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 sm:px-8"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.length ? (
              table.rows.map((row, index) => (
                <tr
                  key={row.id || row.key || index}
                  className="group border-b border-slate-900/5 transition-colors duration-200 hover:bg-slate-50/60"
                >
                  {table.columns.map((column) => {
                    const rawValue = column.render ? column.render(row, index) : row[column.key] ?? fallback;
                    const isStatus = column.key === "status";
                    return (
                      <td
                        key={column.key}
                        className="whitespace-nowrap px-6 py-4.5 text-[15px] text-slate-700 sm:px-8 sm:py-5"
                      >
                        {isStatus ? (
                          <span className={`inline-flex rounded-full px-3.5 py-1.5 text-xs font-bold ${statusBadgeColor(rawValue)}`}>
                            {rawValue}
                          </span>
                        ) : (
                          <span className="font-medium">{rawValue}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={table.columns.length} className="px-6 py-16 text-center sm:px-8">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                      <svg className="text-slate-400" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                    </div>
                    <p className="text-[20px] font-bold text-slate-900">{table.emptyText || "No records available"}</p>
                    <p className="text-[15px] text-slate-500">No data to display at this time.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      {table.rows.length > 0 && (
        <div className="flex items-center justify-between border-t border-slate-900/5 px-6 py-4 sm:px-8">
          <p className="text-sm text-slate-500">
            Showing <span className="font-semibold text-slate-700">{table.rows.length}</span> records
          </p>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-[14px] border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-all duration-300 hover:border-slate-900 hover:bg-slate-900 hover:text-white hover:shadow-md"
          >
            View All
            <FaArrowRight size={14} />
          </button>
        </div>
      )}
    </section>
  );
};

const RoleDashboardShell = ({
  badge,
  title,
  description,
  stats = [],
  quickActions = [],
  insights = [],
  table,
  loading = false,
  error = "",
}) => {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#F8FAFC]">
      {/* Background decorative blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-blue-200/40 blur-[100px]" />
        <div className="absolute top-20 -right-40 h-[400px] w-[400px] rounded-full bg-sky-200/30 blur-[100px]" />
        <div className="absolute bottom-40 left-1/4 h-[350px] w-[350px] rounded-full bg-cyan-200/25 blur-[100px]" />
      </div>

      <div className="w-full space-y-8 p-4 sm:p-6 lg:p-8 xl:p-10">
        {/* Error State */}
        {error && (
          <div className="animate-fade-in-up rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700 shadow-sm">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="animate-fade-in-up rounded-[24px] border border-cyan-200 bg-cyan-50 px-5 py-4 text-sm font-semibold text-cyan-700 shadow-sm">
            Dashboard data loading...
          </div>
        )}

        {/* ─── HERO SECTION ───────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-[28px] border border-slate-900/10 bg-[linear-gradient(135deg,#172554_0%,#1e40af_52%,#0ea5e9_100%)] px-6 py-8 shadow-[0_22px_55px_rgba(15,23,42,0.18)] sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          {/* Abstract wave patterns and glowing effects */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-sky-400/10 blur-[60px]" />
            <div className="absolute bottom-0 left-0 h-64 w-full bg-gradient-to-t from-blue-950/40 to-transparent" />
            <div className="absolute top-1/2 left-0 h-40 w-40 -translate-y-1/2 rounded-full bg-cyan-300/8 blur-[50px]" />
            <svg className="absolute bottom-0 left-0 h-32 w-full opacity-[0.06]" viewBox="0 0 1200 120" preserveAspectRatio="none">
              <path d="M0,60 C300,120 600,0 900,60 C1050,90 1150,40 1200,60 L1200,120 L0,120 Z" fill="white" />
            </svg>
            <svg className="absolute bottom-0 left-0 h-24 w-full opacity-[0.04]" viewBox="0 0 1200 80" preserveAspectRatio="none">
              <path d="M0,40 C200,80 400,0 600,40 C800,80 1000,20 1200,40 L1200,80 L0,80 Z" fill="white" />
            </svg>
          </div>

          <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.7fr)] lg:items-center">
            {/* Left Side */}
            <div className="space-y-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-cyan-200">
                {badge}
              </p>
              <div className="space-y-3">
                <h1 className="text-[42px] font-black leading-[1.1] tracking-tight text-white sm:text-[46px]">
                  {title}
                </h1>
                <p className="max-w-2xl text-[17px] leading-[1.7] text-slate-100/85">
                  {description}
                </p>
              </div>
            </div>

            {/* Right Side - 4 Glass Stat Cards with Icons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {stats.slice(0, 4).map((card) => {
                const Icon = card.icon;
                const iconBg = iconBgMap[card.tone] || iconBgMap.slate;
                return (
                  <div
                    key={card.label}
                    className="group rounded-[22px] border border-white/12 bg-white/10 px-4 py-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md transition-all duration-300 hover:scale-[1.03] hover:bg-white/15"
                  >
                    <div className="flex items-center gap-3">
                      {Icon ? (
                        <span className={`inline-flex shrink-0 items-center justify-center rounded-xl ${iconBg} p-2 text-white shadow-md`}>
                          <Icon size={18} />
                        </span>
                      ) : null}
                      <span className="text-[11px] font-medium text-slate-100/75">{card.label}</span>
                    </div>
                    <div className="mt-3 text-[26px] font-bold leading-none tracking-tight">{card.value ?? fallback}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── STATISTICS SECTION (6 cards) ───────────────────────── */}
        <section>
          <div className="mb-5">
            <h2 className="text-[32px] font-bold tracking-tight text-slate-900">Dashboard Overview</h2>
            <p className="mt-1.5 text-[17px] text-slate-500">Complete operational snapshot at a glance</p>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {stats.map((card) => (
              <StatCard key={card.label} card={card} />
            ))}
          </div>
        </section>

        {/* ─── QUICK ACTIONS + OPERATIONAL HIGHLIGHTS ─────────────── */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          {/* Quick Actions */}
          <div className="rounded-[28px] border border-slate-900/5 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.05)] sm:p-8">
            <div className="mb-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-emerald-500">
                Quick Actions
              </p>
              <h2 className="mt-2 text-[30px] font-bold tracking-tight text-slate-900">
                Jump to active workflow
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {quickActions.map((action) => (
                <QuickAction key={action.label} action={action} />
              ))}
            </div>
          </div>

          {/* Operational Highlights */}
          <div className="rounded-[28px] border border-slate-900/5 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.05)] sm:p-8">
            <div className="mb-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-emerald-500">
                Snapshot
              </p>
              <h2 className="mt-2 text-[30px] font-bold tracking-tight text-slate-900">
                Operational highlights
              </h2>
            </div>
            <div className="space-y-4">
              {insights.map((item) => (
                <InsightCard key={item.label} item={item} />
              ))}
            </div>
          </div>
        </section>

        {/* ─── TABLE SECTION ───────────────────────────────────────── */}
        <DataTable table={table} />
      </div>
    </div>
  );
};

export default RoleDashboardShell;
