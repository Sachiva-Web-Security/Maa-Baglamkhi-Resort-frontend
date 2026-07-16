import { Link } from "react-router-dom";

/* ─── Shared tokens ─────────────────────────────────────────────────── */
const fallback = "--";

/* ─── Hero stat card (inside hero header) ──────────────────────────── */
const HeroStatCard = ({ card }) => {
  const Icon = card.icon;
  return (
    <div className="group relative overflow-hidden rounded-[22px] border border-white/25 bg-white/10 p-4 backdrop-blur-md transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:bg-white/15 hover:shadow-[0_18px_40px_rgba(2,6,23,0.35)] sm:p-5">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-white/10 via-white/5 to-transparent opacity-70" />
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-100/85 sm:text-xs">
        {Icon ? (
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-white/25 bg-white/15 text-white">
            <Icon />
          </span>
        ) : null}
        <span className="leading-tight">{card.label}</span>
      </div>
      <div className="mt-3 text-2xl font-extrabold leading-none text-white sm:text-3xl">
        {card.value ?? fallback}
      </div>
    </div>
  );
};

/* ─── Stat card (below hero) ─────────────────────────────────────────── */
const StatCard = ({ card }) => {
  const Icon = card.icon;
  const tone = {
    cyan: {
      border: "border-l-cyan-500",
      icon: "bg-cyan-100 text-cyan-600",
      label: "text-cyan-600",
      glow: "from-cyan-500/15 to-sky-500/10",
    },
    amber: {
      border: "border-l-amber-500",
      icon: "bg-amber-100 text-amber-600",
      label: "text-amber-600",
      glow: "from-amber-500/15 to-orange-500/10",
    },
    emerald: {
      border: "border-l-emerald-500",
      icon: "bg-emerald-100 text-emerald-600",
      label: "text-emerald-600",
      glow: "from-emerald-500/15 to-teal-500/10",
    },
    violet: {
      border: "border-l-violet-500",
      icon: "bg-violet-100 text-violet-600",
      label: "text-violet-600",
      glow: "from-violet-500/15 to-fuchsia-500/10",
    },
  }[card.tone] || {
    border: "border-l-slate-500",
    icon: "bg-slate-100 text-slate-600",
    label: "text-slate-600",
    glow: "from-slate-500/10 to-slate-400/5",
  };

  return (
    <div
      className={`group relative overflow-hidden rounded-[26px] border border-[#E6EEF8] bg-white p-7 shadow-[0_18px_45px_rgba(15,23,42,0.06)] transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-[0_28px_60px_rgba(15,23,42,0.12)] ${tone.border} border-l-[6px]`}
    >
      <div
        className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${tone.glow} blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
      />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${tone.label}`}>
            {card.label}
          </div>
          <div className="mt-3 text-[40px] font-extrabold leading-none text-[#0F172A]">
            {card.value ?? fallback}
          </div>
          <div className="mt-3 text-[15px] leading-6 text-[#64748B]">{card.note}</div>
        </div>
        {Icon ? (
          <span
            className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl ${tone.icon} transition-transform duration-300 ease-in-out group-hover:scale-105`}
          >
            <Icon />
          </span>
        ) : null}
      </div>
    </div>
  );
};

/* ─── Quick Action card ─────────────────────────────────────────────── */
const QuickAction = ({ action }) => {
  const Icon = action.icon;
  const tone = {
    cyan: "from-blue-500 to-sky-500",
    emerald: "from-emerald-500 to-teal-500",
    amber: "from-amber-500 to-orange-500",
    rose: "from-rose-500 to-pink-500",
    violet: "from-violet-500 to-fuchsia-500",
  }[action.tone] || "from-blue-500 to-sky-500";

  return (
    <Link
      to={action.route}
      className="group relative flex h-full flex-col rounded-[26px] border border-[#E6EEF8] bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] transition-all duration-300 ease-in-out hover:-translate-y-1 hover:border-[#cfe0f5] hover:shadow-[0_28px_60px_rgba(37,99,235,0.16)]"
    >
      <div className="flex items-start justify-between">
        <div
          className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${tone} text-xl text-white shadow-[0_10px_24px_rgba(37,99,235,0.25)] transition-transform duration-300 ease-in-out group-hover:scale-105`}
        >
          {Icon ? <Icon /> : null}
        </div>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E6EEF8] text-[#2563EB] transition-all duration-300 ease-in-out group-hover:translate-x-1 group-hover:border-[#2563EB] group-hover:bg-blue-50">
          →
        </span>
      </div>
      <div className="mt-5 text-[20px] font-bold text-[#0F172A]">{action.label}</div>
      <div className="mt-2 text-[15px] leading-6 text-[#64748B]">{action.helper}</div>
    </Link>
  );
};

/* ─── Insight row (Operational Highlights) ─────────────────────────── */
const InsightCard = ({ item, tone }) => {
  const accent = {
    cyan: {
      soft: "bg-cyan-50",
      icon: "bg-cyan-100 text-cyan-600",
    },
    amber: {
      soft: "bg-amber-50",
      icon: "bg-amber-100 text-amber-600",
    },
    emerald: {
      soft: "bg-emerald-50",
      icon: "bg-emerald-100 text-emerald-600",
    },
    violet: {
      soft: "bg-violet-50",
      icon: "bg-violet-100 text-violet-600",
    },
  }[tone] || {
    soft: "bg-slate-50",
    icon: "bg-slate-100 text-slate-600",
  };
  const Icon = item.icon;
  return (
    <div className="group flex items-center gap-4 rounded-[20px] border border-[#E6EEF8] bg-white px-4 py-4 transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(15,23,42,0.08)]">
      {Icon ? (
        <span className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg ${accent.icon}`}>
          <Icon />
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#64748B]">
          {item.label}
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <div className="text-[26px] font-extrabold leading-none text-[#0F172A]">
            {item.value ?? fallback}
          </div>
          <div className="truncate text-[14px] text-[#64748B]">{item.note}</div>
        </div>
      </div>
    </div>
  );
};

/* ─── Data Table ───────────────────────────────────────────────────── */
const DataTable = ({ table }) => {
  if (!table) return null;

  return (
    <section className="overflow-hidden rounded-[28px] border border-[#E6EEF8] bg-white shadow-[0_22px_55px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6EEF8] bg-gradient-to-r from-[#F1F6FF] via-[#F4F8FF] to-white px-6 py-6 sm:px-8">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#2563EB]">
            {table.eyebrow || "Detail View"}
          </div>
          <h2 className="mt-2 text-[28px] font-bold leading-tight text-[#0F172A] sm:text-[30px]">
            {table.title}
          </h2>
        </div>
        {table.meta ? (
          <div className="inline-flex items-center rounded-full border border-[#E6EEF8] bg-white px-4 py-2 text-[13px] font-semibold text-[#2563EB] shadow-sm">
            {table.meta}
          </div>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead className="bg-gradient-to-r from-[#F8FAFF] to-[#F1F6FF] text-[12px] uppercase tracking-[0.16em] text-[#64748B]">
            <tr>
              {table.columns.map((column) => (
                <th key={column.key} className="px-6 py-4 font-bold sm:px-8">
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
                  className="group border-t border-[#E6EEF8] transition-colors duration-300 ease-in-out hover:bg-[#F4F8FF]"
                >
                  {table.columns.map((column) => (
                    <td
                      key={column.key}
                      className="px-6 py-5 text-[15px] font-medium text-[#0F172A] sm:px-8"
                    >
                      {column.render ? column.render(row, index) : row[column.key] ?? fallback}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={table.columns.length} className="px-6 py-16 text-center sm:py-20">
                  <div className="mx-auto flex max-w-md flex-col items-center gap-3">
                    <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-[#2563EB]">
                      📭
                    </span>
                    <div className="text-[20px] font-bold text-[#0F172A]">No records available</div>
                    <div className="text-[15px] text-[#64748B]">
                      {table.emptyText || "Once data arrives, it will appear here in a clean list."}
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

/* ─── Premium Reception Dashboard Layout ────────────────────────────── */
const ReceptionDashboardLayout = ({
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
    <div className="relative min-h-screen overflow-x-hidden bg-[#F8FAFC] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-blue-200/35 blur-3xl" />
        <div className="absolute right-[-12%] top-[10%] h-[28rem] w-[28rem] rounded-full bg-sky-200/30 blur-3xl" />
        <div className="absolute bottom-[10%] left-[20%] h-80 w-80 rounded-full bg-indigo-200/20 blur-3xl" />
      </div>

      <div className="relative w-full space-y-10">
        {/* ─── Hero ─── */}
        <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-gradient-to-br from-blue-950 via-blue-800 to-sky-500 px-6 py-9 text-white shadow-[0_30px_70px_rgba(2,6,23,0.35)] sm:px-10 sm:py-12">
          <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
            <div className="absolute -left-20 -top-24 h-72 w-72 rounded-full bg-sky-400/30 blur-3xl" />
            <div className="absolute right-[-10%] top-[10%] h-80 w-80 rounded-full bg-blue-500/25 blur-3xl" />
            <div className="absolute bottom-[-40%] left-[30%] h-[26rem] w-[26rem] rounded-full bg-indigo-500/20 blur-3xl" />
            <svg
              className="absolute inset-x-0 bottom-[-1px] h-24 w-full text-white/10"
              viewBox="0 0 1440 320"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                fill="currentColor"
                d="M0,160L60,176C120,192,240,224,360,213.3C480,203,600,149,720,138.7C840,128,960,160,1080,176C1200,192,1320,192,1380,192L1440,192L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"
              />
            </svg>
            <svg
              className="absolute inset-x-0 top-1/2 h-32 w-full -translate-y-1/2 text-white/5"
              viewBox="0 0 1440 200"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                d="M0,100 C240,40 480,160 720,100 C960,40 1200,160 1440,100"
              />
            </svg>
          </div>

          <div className="relative grid items-stretch gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.95fr)] lg:gap-10">
            <div className="flex flex-col justify-center">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-100 backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-sky-200" />
                {badge}
              </span>
              <h1 className="mt-5 text-[36px] font-extrabold leading-[1.1] tracking-tight text-white sm:text-[44px] lg:text-[46px]">
                {title}
              </h1>
              <p className="mt-4 max-w-2xl text-[18px] font-medium leading-7 text-sky-100/85 sm:text-[19px]">
                {description}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3 text-[13px] text-sky-100/80">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 backdrop-blur-md">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Live · Auto refreshed
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 backdrop-blur-md">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-200" /> {stats.length} key metrics
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {stats.slice(0, 4).map((card) => (
                <HeroStatCard key={card.label} card={card} />
              ))}
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-5 py-4 text-[15px] font-semibold text-rose-700 shadow-sm">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="inline-flex w-full items-center justify-center gap-3 rounded-[22px] border border-sky-200 bg-sky-50 px-5 py-4 text-[15px] font-semibold text-sky-700 shadow-sm">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
            Dashboard data loading...
          </div>
        ) : null}

        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((card) => (
            <StatCard key={card.label} card={card} />
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="rounded-[26px] border border-[#E6EEF8] bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#2563EB]">Quick Actions</div>
                <h2 className="mt-2 text-[26px] font-bold leading-tight text-[#0F172A] sm:text-[30px]">Jump to active workflow</h2>
              </div>
              <span className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB] sm:inline-flex">⚡</span>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {quickActions.map((action) => (
                <QuickAction key={action.label} action={action} />
              ))}
            </div>
          </div>

          <div className="rounded-[26px] border border-[#E6EEF8] bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#2563EB]">Snapshot</div>
                <h2 className="mt-2 text-[26px] font-bold leading-tight text-[#0F172A] sm:text-[30px]">Operational highlights</h2>
              </div>
              <span className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB] sm:inline-flex">📊</span>
            </div>
            <div className="space-y-4">
              {insights.map((item, index) => (
                <InsightCard key={item.label} item={item} tone={["cyan", "amber", "emerald", "violet"][index % 4]} />
              ))}
            </div>
          </div>
        </section>

        <DataTable table={table} />
      </div>
    </div>
  );
};

export { ReceptionDashboardLayout };
export default ReceptionDashboardLayout;
