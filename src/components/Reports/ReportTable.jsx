const ReportTable = ({ reportType, rows, loading }) => {
  const columns = (() => {
    if (reportType === 'banquet') {
      return [
        { key: 'date', label: 'Date' },
        { key: 'hall', label: 'Hall' },
        { key: 'eventType', label: 'Event' },
        { key: 'guests', label: 'Guests' },
        { key: 'status', label: 'Status' },
        { key: 'paymentMode', label: 'Payment Mode' },
        { key: 'amount', label: 'Amount' },
      ];
    }
    if (reportType === 'restaurant') {
      return [
        { key: 'date', label: 'Date' },
        { key: 'orders', label: 'Orders' },
        { key: 'status', label: 'Status' },
        { key: 'paymentMode', label: 'Payment Mode' },
        { key: 'amount', label: 'Amount' },
      ];
    }
    if (reportType === 'housekeeping') {
      return [
        { key: 'date', label: 'Date' },
        { key: 'roomType', label: 'Room Type' },
        { key: 'status', label: 'Status' },
        { key: 'assignee', label: 'Assignee' },
        { key: 'rooms', label: 'Rooms' },
      ];
    }
    if (reportType === 'accounts') {
      return [
        { key: 'date', label: 'Date' },
        { key: 'type', label: 'Type' },
        { key: 'description', label: 'Description' },
        { key: 'paymentMode', label: 'Payment Mode' },
        { key: 'amount', label: 'Amount' },
        { key: 'status', label: 'Status' },
      ];
    }
    // room
    return [
      { key: 'date', label: 'Date' },
      { key: 'roomType', label: 'Room Type' },
      { key: 'status', label: 'Status' },
      { key: 'rooms', label: 'Rooms' },
      { key: 'paymentMode', label: 'Payment Mode' },
      { key: 'revenue', label: 'Revenue' },
    ];
  })();

  const formatCell = (key, value) => {
    if (key === 'amount' || key === 'revenue') {
      const n = Number(value) || 0;
      return `₹${n.toLocaleString('en-IN')}`;
    }
    return value ?? '-';
  };

  return (
    <div className="simple-card overflow-hidden p-0">
      <div className="px-4 py-3 border-b border-gray-200 flex items-baseline justify-between gap-3">
        <h2 className="text-base font-bold text-gray-800">Report Table</h2>
        <div className="text-xs text-gray-500 font-semibold">{loading ? 'Loading...' : `${rows.length} row(s)`}</div>
      </div>

      <div className="overflow-x-auto">
        <table className="simple-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                {columns.map((c) => (
                  <td key={c.key}>
                    <span className={c.key === 'amount' || c.key === 'revenue' ? 'font-bold text-gray-900' : ''}>
                      {formatCell(c.key, r[c.key])}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
            {!rows.length && !loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-gray-400 font-semibold">
                  No data for current filters.
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


