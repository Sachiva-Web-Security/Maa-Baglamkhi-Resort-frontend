const ReservationView = ({ filters, setFilters, rows, formatDate, getStatus, onRefresh, refreshing, onOpenBooking }) => (
  <div className="fo-reservation-page">
    <div className="fo-reservation-heading"><span>Reservation</span><div className="fo-reservation-actions">
      <button className="fo-reference-btn fo-reference-btn--refresh" onClick={onRefresh} disabled={refreshing}>↻ {refreshing ? "Refreshing" : "Refresh"}</button>
      <button className="fo-reference-btn fo-reference-btn--new" onClick={onOpenBooking}>⊕ New Reservation</button>
    </div></div>
    <section className="fo-reservation-panel">
      <div className="fo-reservation-panel-title">Search Invoice</div>
      <div className="fo-reservation-search">
        <input placeholder="Enter Booking No" value={filters.bookingNo} onChange={(e) => setFilters((p) => ({ ...p, bookingNo: e.target.value }))} />
        <input type="date" aria-label="Reservation date" value={filters.date} onChange={(e) => setFilters((p) => ({ ...p, date: e.target.value }))} />
        <input placeholder="Enter guest name" value={filters.guestName} onChange={(e) => setFilters((p) => ({ ...p, guestName: e.target.value }))} />
        <button className="fo-reference-btn fo-reference-btn--search">⌕ Search</button>
        <button className="fo-reference-btn fo-reference-btn--clear" onClick={() => setFilters({ bookingNo: "", date: "", guestName: "" })}>↶ Clear Filter</button>
      </div>
      <div className="fo-reservation-table-wrap"><table className="fo-reservation-table">
        <thead><tr><th>Action</th><th>Booking#</th><th>Date</th><th>Guest Name</th><th>Arrival</th><th>Departure Date</th><th>Adults</th><th>Children</th><th>No Of Rooms</th><th>Coming From</th><th>Pickup Point</th><th>Booking Status</th></tr></thead>
        <tbody>{rows.map((booking) => { const roomList = Array.isArray(booking.rooms) ? booking.rooms : booking.rooms ? [booking.rooms] : booking.room ? [booking.room] : []; const status = getStatus(booking); return <tr key={booking.bookingId || booking.booking_id || booking.id}>
          <td><button className="fo-row-action" onClick={onOpenBooking}>⋮</button></td><td>{booking.bookingId || booking.booking_id || booking.id || "—"}</td>
          <td>{formatDate(booking.created_at || booking.booking_date || booking.check_in || booking.checkIn)}</td><td>{booking.guest_name || booking.guestName || booking.customer_name || "—"}</td>
          <td>{formatDate(booking.check_in || booking.checkIn)}</td><td>{formatDate(booking.check_out || booking.checkOut)}</td><td>{booking.adults ?? booking.no_of_adults ?? 1}</td><td>{booking.children ?? booking.no_of_children ?? 0}</td>
          <td>{booking.no_of_rooms ?? (roomList.length || 1)}</td><td>{booking.coming_from || booking.comingFrom || ""}</td><td>{booking.pickup_point || booking.pickupPoint || ""}</td><td><span className={`fo-booking-status fo-booking-status--${status.tone}`}>{status.label}</span></td>
        </tr>; })}{rows.length === 0 && <tr><td colSpan="12" className="fo-reservation-empty">No reservations found</td></tr>}</tbody>
      </table></div>
    </section>
    <button className="fo-edge-toggle" type="button" aria-label="Collapse side panel">‹</button>
  </div>
);

export default ReservationView;
