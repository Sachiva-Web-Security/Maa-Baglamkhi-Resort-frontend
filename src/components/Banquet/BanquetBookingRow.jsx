const BanquetBookingRow = ({ booking, onComplete, onGenerateBill, onView }) => {
  const getStatusBadge = (status) => {
    const baseClasses = 'px-3 py-1 rounded-full text-xs font-bold';
    switch (status) {
      case 'Confirmed':
        return `${baseClasses} bg-blue-900 text-white border border-blue-700`;
      case 'Completed':
        return `${baseClasses} bg-yellow-900 text-white border border-yellow-700`;
      case 'Billed':
        return `${baseClasses} bg-green-900 text-white border border-green-700`;
      default:
        return `${baseClasses} bg-white/6 text-gray-200 border border-white/6`;
    }
  };

  return (
    <tr className="border-t border-white/5 hover:bg-white/2">
      <td className="px-4 py-3 text-sm font-semibold text-gray-100">{booking.hallName}</td>
      <td className="px-4 py-3 text-sm text-gray-300">{booking.customerName}</td>
      <td className="px-4 py-3 text-sm text-gray-300">{booking.eventType}</td>
      <td className="px-4 py-3 text-sm text-gray-300">{booking.date || '-'}</td>
      <td className="px-4 py-3 text-sm text-gray-300">
        {booking.startTime} - {booking.endTime}
      </td>
      <td className="px-4 py-3">
        <span className={getStatusBadge(booking.status)}>{booking.status}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2 flex-wrap">
          {booking.status === 'Confirmed' && (
            <button
              onClick={onComplete}
              className="px-3 py-1 bg-yellow-700 text-white text-xs font-bold rounded-lg hover:bg-yellow-600 transition-colors"
            >
              Mark Completed
            </button>
          )}
          {(booking.status === 'Completed' || booking.status === 'Confirmed') && (
            <button
              onClick={onGenerateBill}
              className="px-3 py-1 bg-green-700 text-white text-xs font-bold rounded-lg hover:bg-green-600 transition-colors"
            >
              Generate Bill
            </button>
          )}
          {booking.invoiceNo && (
            <button
              onClick={onView}
              className="px-3 py-1 bg-blue-700 text-white text-xs font-bold rounded-lg hover:bg-blue-600 transition-colors"
            >
              View Bill
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

export default BanquetBookingRow;

