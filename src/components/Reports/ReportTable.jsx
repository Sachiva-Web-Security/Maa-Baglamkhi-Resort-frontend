const getColumns = (reportType) => {
  if (reportType === "all-bills") {
    return [
      { key: "date", label: "Date" },
      { key: "source", label: "Source" },
      { key: "billNo", label: "Bill No" },
      { key: "description", label: "Description" },
      { key: "type", label: "Type" },
      { key: "status", label: "Status" },
      { key: "paymentMode", label: "Payment Mode" },
      { key: "amount", label: "Amount" },
    ];
  }

  if (reportType === "banquet") {
    return [
      { key: "date", label: "Date" },
      { key: "hall", label: "Hall" },
      { key: "eventType", label: "Event" },
      { key: "guests", label: "Guests" },
      { key: "status", label: "Status" },
      { key: "paymentMode", label: "Payment Mode" },
      { key: "amount", label: "Amount" },
    ];
  }

  if (reportType === "restaurant") {
    return [
      { key: "date", label: "Date" },
      { key: "table_number", label: "Table" },
      { key: "status", label: "Status" },
      { key: "paymentMode", label: "Payment Mode" },
      { key: "amount", label: "Amount" },
    ];
  }

  if (reportType === "housekeeping") {
    return [
      { key: "date", label: "Date" },
      { key: "roomType", label: "Room" },
      { key: "status", label: "Status" },
      { key: "assignee", label: "Assignee" },
      { key: "rooms", label: "Rooms" },
    ];
  }

  if (reportType === "accounts") {
    return [
      { key: "date", label: "Date" },
      { key: "type", label: "Type" },
      { key: "description", label: "Description" },
      { key: "paymentMode", label: "Payment Mode" },
      { key: "amount", label: "Amount" },
      { key: "status", label: "Status" },
    ];
  }

  return [
    { key: "date", label: "Date" },
    { key: "guest", label: "Guest" },
    { key: "roomType", label: "Room" },
    { key: "status", label: "Status" },
    { key: "paymentMode", label: "Payment Mode" },
    { key: "revenue", label: "Revenue" },
  ];
};

const formatCell = (key, value) => {
  if (key === "amount" || key === "revenue") {
    return `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
  }

  return value ?? "-";
};

const getStatusClass = (value) => {
  const normalized = String(value || "").toLowerCase();

  if (["confirmed", "occupied", "paid", "posted"].includes(normalized)) {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }
  if (["completed", "billed", "vacant clean"].includes(normalized)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (["pending", "vacant dirty"].includes(normalized)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-600";
};

const ReportTable = ({ reportType, rows, loading }) => {
  const columns = getColumns(reportType);

  return (
    <div className="rounded-[26px] border border-white/60 bg-white/82 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div className="flex flex-col gap-2 border-b border-slate-200/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
            Report Table
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">
            Detailed report rows
          </h2>
        </div>
        <div className="text-sm font-semibold text-slate-500">
          {loading ? "Loading..." : `${rows.length} row(s) found`}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-4 font-semibold sm:px-5">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.id || `${reportType}-${index}`}
                className="border-t border-slate-200/80 transition hover:bg-slate-50/80"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className="px-4 py-4 text-sm text-slate-700 sm:px-5"
                  >
                    {column.key === "status" ? (
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusClass(
                          row[column.key]
                        )}`}
                      >
                        {formatCell(column.key, row[column.key])}
                      </span>
                    ) : (
                      <span
                        className={
                          column.key === "amount" || column.key === "revenue"
                            ? "font-bold text-slate-900"
                            : ""
                        }
                      >
                        {formatCell(column.key, row[column.key])}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}

            {!rows.length && !loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-sm font-semibold text-slate-500 sm:px-5"
                >
                  No data found for current filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReportTable;
