import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 10;

const getColumns = (reportType) => {
  if (reportType === "room") {
    return [
      { key: "date", label: "Date" },
      { key: "guest", label: "Guest" },
      { key: "roomNumber", label: "Room No" },
      { key: "roomType", label: "Room Type" },
      { key: "status", label: "Status" },
      { key: "paymentMode", label: "Payment Mode" },
      { key: "revenue", label: "Revenue" },
    ];
  }

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

  return [];
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
  const [currentPage, setCurrentPage] = useState(1);
  const columns = getColumns(reportType);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage(1);
  }, [reportType, rows.length]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return rows.slice(startIndex, startIndex + PAGE_SIZE);
  }, [currentPage, rows]);

  const visibleStart = rows.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const visibleEnd = Math.min(currentPage * PAGE_SIZE, rows.length);

  const paginationItems = useMemo(() => {
    if (totalPages <= 1) return [1];

    const items = [1];
    const windowStart = Math.max(2, currentPage - 1);
    const windowEnd = Math.min(totalPages - 1, currentPage + 1);

    if (windowStart > 2) {
      items.push("start-ellipsis");
    }

    for (let page = windowStart; page <= windowEnd; page += 1) {
      items.push(page);
    }

    if (windowEnd < totalPages - 1) {
      items.push("end-ellipsis");
    }

    items.push(totalPages);
    return items;
  }, [currentPage, totalPages]);

  const showPagination = rows.length > PAGE_SIZE;

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
            {paginatedRows.map((row, index) => (
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

      {showPagination ? (
        <div className="flex flex-col gap-3 border-t border-slate-200/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="text-sm text-slate-500">
            Showing <span className="font-semibold text-slate-900">{visibleStart}</span> to{" "}
            <span className="font-semibold text-slate-900">{visibleEnd}</span> of{" "}
            <span className="font-semibold text-slate-900">{rows.length}</span> rows
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>

            {paginationItems.map((item) =>
              typeof item === "number" ? (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCurrentPage(item)}
                  className={`h-10 min-w-10 rounded-full px-3 text-sm font-semibold transition ${
                    currentPage === item
                      ? "bg-emerald-500 text-white shadow-[0_10px_25px_rgba(16,185,129,0.25)]"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-700"
                  }`}
                >
                  {item}
                </button>
              ) : (
                <span
                  key={item}
                  className="px-1 text-sm font-semibold tracking-[0.2em] text-slate-400"
                >
                  ...
                </span>
              )
            )}

            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ReportTable;
