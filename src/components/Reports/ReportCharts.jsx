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

const Card = ({ title, subtitle, children }) => (
  <div className="rounded-[26px] border border-white/60 bg-white/82 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5">
    <div className="mb-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
        Visual Summary
      </p>
      <h2 className="mt-1 text-xl font-bold text-slate-900">{title}</h2>
      {subtitle ? <div className="mt-1 text-sm text-slate-500">{subtitle}</div> : null}
    </div>
    <div className="h-[320px] w-full">{children}</div>
  </div>
);

const EmptyChartState = ({ title, subtitle }) => (
  <Card title={title} subtitle={subtitle}>
    <div className="flex h-full items-center justify-center rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
      <div>
        <div className="text-base font-bold text-slate-900">
          Graph abhi available nahi hai
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Current filters ke liye chart data nahi mila. Date range ya filters ko
          thoda broad karke dobara check karein.
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
        <ResponsiveContainer width="100%" height="100%">
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
        <ResponsiveContainer width="100%" height="100%">
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
        <ResponsiveContainer width="100%" height="100%">
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
        <ResponsiveContainer width="100%" height="100%">
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
        <ResponsiveContainer width="100%" height="100%">
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

  return (
    <Card title="Room Status Mix" subtitle="Occupancy and room state distribution">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={110}
            paddingAngle={4}
          >
            {data.map((entry, index) => (
              <Cell key={`${entry.name}-${index}`} fill={palette[index % palette.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default ReportCharts;
