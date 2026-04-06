import { Link } from "react-router-dom";

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

const fallback = "--";

const StatCard = ({ card }) => {
  const tone = borderToneMap[card.tone] || borderToneMap.slate;
  const Icon = card.icon;

  return (
    <div className="rounded-[24px] border border-white/60 bg-white/88 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {card.label}
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900">
            {card.value ?? fallback}
          </div>
          <div className="mt-2 text-sm text-slate-500">{card.note}</div>
        </div>
        {Icon ? (
          <span className={`rounded-2xl border p-3 ${tone}`}>
            <Icon />
          </span>
        ) : null}
      </div>
    </div>
  );
};

const QuickAction = ({ action }) => {
  const Icon = action.icon;
  const tone = toneMap[action.tone] || toneMap.cyan;

  return (
    <Link
      to={action.route}
      className="group rounded-[24px] border border-white/70 bg-white/88 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] transition hover:-translate-y-1"
    >
      <div className={`inline-flex rounded-2xl bg-gradient-to-r ${tone} p-3 text-white shadow-lg`}>
        {Icon ? <Icon /> : null}
      </div>
      <div className="mt-4 text-lg font-bold text-slate-900">{action.label}</div>
      <div className="mt-2 text-sm leading-6 text-slate-500">{action.helper}</div>
    </Link>
  );
};

const InsightCard = ({ item }) => (
  <div className="rounded-[22px] border border-slate-200/80 bg-slate-50 px-4 py-4">
    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
      {item.label}
    </div>
    <div className="mt-2 text-2xl font-black text-slate-900">{item.value ?? fallback}</div>
    <div className="mt-2 text-sm text-slate-500">{item.note}</div>
  </div>
);

const DataTable = ({ table }) => {
  if (!table) return null;

  return (
    <section className="rounded-[26px] border border-white/60 bg-white/88 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200/80 px-5 py-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
            {table.eyebrow || "Detail View"}
          </div>
          <h2 className="mt-1 text-xl font-bold text-slate-900">{table.title}</h2>
        </div>
        {table.meta ? (
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
            {table.meta}
          </div>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
            <tr>
              {table.columns.map((column) => (
                <th key={column.key} className="px-5 py-4 font-semibold">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.length ? (
              table.rows.map((row, index) => (
                <tr key={row.id || row.key || index} className="border-t border-slate-200/80 hover:bg-slate-50/80">
                  {table.columns.map((column) => (
                    <td key={column.key} className="px-5 py-4 text-sm text-slate-700">
                      {column.render ? column.render(row, index) : row[column.key] ?? fallback}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={table.columns.length} className="px-5 py-12 text-center text-sm font-semibold text-slate-500">
                  {table.emptyText || "No records available"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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
    <div className="relative min-h-screen overflow-x-hidden bg-[linear-gradient(135deg,#f5fbff_0%,#f3f8f4_28%,#fff8f1_58%,#f8fafc_100%)] p-4 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-8%] top-[-6%] h-72 w-72 rounded-full bg-cyan-200/45 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute right-[-10%] top-[8%] h-72 w-72 rounded-full bg-amber-200/45 blur-3xl sm:h-[28rem] sm:w-[28rem]" />
        <div className="absolute bottom-[18%] left-[18%] h-56 w-56 rounded-full bg-emerald-200/30 blur-3xl sm:h-80 sm:w-80" />
      </div>

      <div className="w-full space-y-7">
        <section className="overflow-hidden rounded-[28px] border border-slate-900/10 bg-[linear-gradient(120deg,#071b34_0%,#0d4a53_52%,#162d45_100%)] px-5 py-6 shadow-[0_22px_55px_rgba(15,23,42,0.12)] sm:px-7 sm:py-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)] lg:items-center">
            <div className="space-y-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-cyan-200">
                {badge}
              </p>
              <div className="space-y-2">
                <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl">
                  {title}
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-slate-100/85 sm:text-base">
                  {description}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
              {stats.slice(0, 4).map((card) => (
                <div
                  key={card.label}
                  className="rounded-[22px] border border-white/12 bg-white/10 px-4 py-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md"
                >
                  <span className="text-[11px] text-slate-100/75">{card.label}</span>
                  <div className="mt-3 text-2xl font-bold leading-none">{card.value ?? fallback}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-[22px] border border-cyan-200 bg-cyan-50 px-4 py-4 text-sm font-semibold text-cyan-700">
            Dashboard data loading...
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((card) => (
            <StatCard key={card.label} card={card} />
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="rounded-[26px] border border-white/60 bg-white/88 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
            <div className="mb-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
                Quick Actions
              </div>
              <h2 className="mt-1 text-xl font-bold text-slate-900">Jump to active workflow</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {quickActions.map((action) => (
                <QuickAction key={action.label} action={action} />
              ))}
            </div>
          </div>

          <div className="rounded-[26px] border border-white/60 bg-white/88 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
            <div className="mb-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
                Snapshot
              </div>
              <h2 className="mt-1 text-xl font-bold text-slate-900">Operational highlights</h2>
            </div>
            <div className="space-y-3">
              {insights.map((item) => (
                <InsightCard key={item.label} item={item} />
              ))}
            </div>
          </div>
        </section>

        <DataTable table={table} />
      </div>
    </div>
  );
};

export default RoleDashboardShell;
