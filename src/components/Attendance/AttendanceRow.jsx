const AttendanceRow = ({ employee }) => {
  const statusColors = {
    Present: "border-emerald-200 bg-emerald-50 text-emerald-700",
    Absent: "border-rose-200 bg-rose-50 text-rose-700",
    Late: "border-amber-200 bg-amber-50 text-amber-700",
    "On Leave": "border-sky-200 bg-sky-50 text-sky-700",
  };

  const methodColors = {
    Biometric: "border-violet-200 bg-violet-50 text-violet-700",
    Manual: "border-slate-200 bg-slate-100 text-slate-700",
  };

  return (
    <tr className="border-t border-slate-200/80 transition hover:bg-slate-50/80">
      <td className="px-5 py-4 text-sm font-semibold text-slate-900">
        {employee.name}
      </td>
      <td className="px-5 py-4 text-sm text-slate-600">{employee.role || "--"}</td>
      <td className="px-5 py-4 text-sm text-slate-600">{employee.checkIn || "--"}</td>
      <td className="px-5 py-4 text-sm text-slate-600">
        {employee.checkOut || "--"}
      </td>
      <td className="px-5 py-4">
        <span
          className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
            statusColors[employee.status] || "border-slate-200 bg-slate-100 text-slate-600"
          }`}
        >
          {employee.status || "--"}
        </span>
      </td>
      <td className="px-5 py-4">
        <span
          className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
            methodColors[employee.method] || "border-slate-200 bg-slate-100 text-slate-600"
          }`}
        >
          {employee.method || "--"}
        </span>
      </td>
      <td className="px-5 py-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
          >
            Check In
          </button>
          <button
            type="button"
            className="rounded-full bg-rose-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-rose-700"
          >
            Check Out
          </button>
        </div>
      </td>
    </tr>
  );
};

export default AttendanceRow;
