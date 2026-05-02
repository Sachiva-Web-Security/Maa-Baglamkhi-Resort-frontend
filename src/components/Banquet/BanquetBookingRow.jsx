const BanquetBookingRow = ({ booking, onComplete, onGenerateBill, onView }) => {
  const badge = booking.status === 'Confirmed' ? 'badge-blue' :
    booking.status === 'Completed' ? 'badge-orange' :
    booking.status === 'Billed' ? 'badge-green' : 'badge-gray';

  return (
    <tr>
      <td style={{ fontWeight: 600 }}>{booking.hallName}</td>
      <td>{booking.customerName}</td>
      <td>{booking.eventType}</td>
      <td>{booking.date || '—'}</td>
      <td>{booking.startTime} – {booking.endTime}</td>
      <td><span className={`simple-badge ${badge}`}>{booking.status}</span></td>
      <td>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {booking.status === 'Confirmed' && (
            <button onClick={onComplete} className="simple-btn simple-btn-sm simple-btn-warning">Mark Completed</button>
          )}
          {(booking.status === 'Completed' || booking.status === 'Confirmed') && (
            <button onClick={onGenerateBill} className="simple-btn simple-btn-sm simple-btn-success">Generate Bill</button>
          )}
          {booking.invoiceNo && (
            <button onClick={onView} className="simple-btn simple-btn-sm simple-btn-primary">View Bill</button>
          )}
        </div>
      </td>
    </tr>
  );
};

export default BanquetBookingRow;
