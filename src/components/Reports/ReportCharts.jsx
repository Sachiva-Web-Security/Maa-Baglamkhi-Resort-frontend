import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const palette = ["#14b8a6", "#3b82f6", "#f59e0b", "#ef4444", "#0f766e", "#8b5cf6"];

const formatCompactNumber = (value) => Number(value || 0).toLocaleString("en-IN");

const Card = ({ title, subtitle, children }) => (
  <div className="min-w-0 rounded-[26px] border border-white/60 bg-white/82 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5">
    <div className="mb-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
        Visual Summary
      </p>
      <h2 className="mt-1 text-xl font-bold text-slate-900">{title}</h2>
      {subtitle ? <div className="mt-1 text-sm text-slate-500">{subtitle}</div> : null}
    </div>
    <div className="h-[320px] w-full min-w-0">{children}</div>
  </div>
);

const EmptyChartState = ({ title, subtitle }) => (
  <Card title={title} subtitle={subtitle}>
    <div className="flex h-full items-center justify-center rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
      <div>
        <div className="text-base font-bold text-slate-900">
          graph dosen't available wait for a moment
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          there was no data for a current chart showing 
        </p>
      </div>
    </div>
  </Card>
);

const groupSum = (rows, key, valueKey) => {
  const map = new Map();

  rows.forEach((row) => {
    const name = row[key] ?? "Unknown";
    map.set(name, (map.get(name) || 0) + (Number(row[valueKey]) || 0));
  });

  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
};

const groupCount = (rows, key) => {
  const map = new Map();

  rows.forEach((row) => {
    const name = row[key] ?? "Unknown";
    map.set(name, (map.get(name) || 0) + 1);
  });

  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
};

const groupByDateSum = (rows, valueKey) => {
  const map = new Map();

  rows.forEach((row) => {
    const date = row.date ?? "Unknown";
    map.set(date, (map.get(date) || 0) + (Number(row[valueKey]) || 0));
  });

  return Array.from(map.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
};

const tooltipStyle = {
  borderRadius: 16,
  border: "1px solid rgba(226,232,240,0.9)",
  boxShadow: "0 18px 40px rgba(15,23,42,0.12)",
};

const CustomPieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;

  const item = payload[0]?.payload;
  if (!item) return null;

  return (
    <div
      className="rounded-[18px] border border-slate-200/90 bg-white/95 px-4 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.12)] backdrop-blur"
      style={{ minWidth: 170 }}
    >
      <div className="flex items-center gap-2">
        <span
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: item.fill || payload[0]?.color || "#3b82f6" }}
        />
        <span className="text-sm font-bold text-slate-900">{item.name}</span>
      </div>
      <div className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">Rooms</div>
      <div className="mt-1 text-lg font-black text-slate-900">{formatCompactNumber(item.value)}</div>
      <div className="mt-1 text-sm text-slate-500">{item.percentLabel || "--"} of visible mix</div>
    </div>
  );
};

const ReportCharts = ({ reportType, rows }) => {
  if (!rows.length) {
    return (
      <EmptyChartState
        title="Visual Summary"
        subtitle="Chart selected filters ke hisaab se populate hota hai"
      />
    );
  }

  if (reportType === "all-bills") {
    const data = groupSum(rows, "source", "amount");

    return (
      <Card title="All Bills by Source" subtitle="Combined amount grouped by billing module">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 12 }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="value" fill="#14b8a6" radius={[12, 12, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    );
  }

  if (reportType === "banquet") {
    const data = groupSum(rows, "hall", "amount");

    return (
      <Card title="Banquet Revenue by Hall" subtitle="See which hall is generating the highest revenue">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 12 }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="value" fill="#0ea5e9" radius={[12, 12, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    );
  }

  if (reportType === "restaurant") {
    const data = groupByDateSum(rows, "amount");

    return (
      <Card title="Restaurant Sales Trend" subtitle="Track selected date range food billing movement">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 12 }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#2563eb"
              strokeWidth={3}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    );
  }

  if (reportType === "housekeeping") {
    const data = groupCount(rows, "status");

    return (
      <Card title="Housekeeping Status Mix" subtitle="Room condition distribution for selected rows">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 12 }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="value" fill="#f59e0b" radius={[12, 12, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    );
  }

  if (reportType === "accounts") {
    const income = rows
      .filter((row) => row.type === "Income")
      .reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
    const expense = rows
      .filter((row) => row.type === "Expense")
      .reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
    const data = [
      { name: "Income", value: income },
      { name: "Expense", value: expense },
      { name: "Net", value: income - expense },
    ];

    return (
      <Card title="Accounts Overview" subtitle="Income vs expense vs net impact">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 12 }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="value" fill="#8b5cf6" radius={[12, 12, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    );
  }

  const data = groupCount(rows, "status");
  const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const enrichedData = data.map((item, index) => ({
    ...item,
    fill: palette[index % palette.length],
    percent: total ? (Number(item.value || 0) / total) * 100 : 0,
    percentLabel: total ? `${((Number(item.value || 0) / total) * 100).toFixed(1)}%` : "0%",
  }));
  const topStatus = [...enrichedData].sort((a, b) => Number(b.value || 0) - Number(a.value || 0))[0];

  return (
    <Card title="Room Status Mix" subtitle="Occupancy and room state distribution">
      <div className="grid h-full gap-4 xl:grid-cols-[minmax(0,1fr)_210px]">
        <div className="rounded-[24px] border border-slate-100 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_38%),linear-gradient(180deg,rgba(248,250,252,0.95)_0%,rgba(255,255,255,0.92)_100%)] p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-2 pt-1">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Room Overview
              </div>
              <div className="mt-1 text-sm text-slate-500">
                Total visible rooms <span className="font-bold text-slate-900">{formatCompactNumber(total)}</span>
              </div>
            </div>
            {topStatus ? (
              <div className="rounded-full border border-slate-200 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm">
                Top: <span className="text-slate-900">{topStatus.name}</span> ({topStatus.percentLabel})
              </div>
            ) : null}
          </div>

          <ResponsiveContainer width="100%" height={270}>
            <PieChart>
              <Pie
                data={enrichedData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={76}
                outerRadius={112}
                paddingAngle={3}
                stroke="#ffffff"
                strokeWidth={3}
              >
                {enrichedData.map((entry, index) => (
                  <Cell key={`${entry.name}-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
              <text x="50%" y="46%" textAnchor="middle" dominantBaseline="central" className="fill-slate-400 text-[11px] font-semibold uppercase tracking-[0.24em]">
                Rooms
              </text>
              <text x="50%" y="55%" textAnchor="middle" dominantBaseline="central" className="fill-slate-900 text-[28px] font-black">
                {formatCompactNumber(total)}
              </text>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-col gap-3">
          {enrichedData.map((item) => (
            <div
              key={item.name}
              className="rounded-[20px] border border-slate-200/80 bg-white/92 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className="h-3.5 w-3.5 rounded-full shadow-sm"
                    style={{ backgroundColor: item.fill }}
                  />
                  <div>
                    <div className="text-sm font-bold text-slate-900">{item.name}</div>
                    <div className="text-xs text-slate-500">{item.percentLabel} share</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-slate-900">{formatCompactNumber(item.value)}</div>
                  <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">rooms</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default ReportCharts;
