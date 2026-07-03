const OtaBookingsView = ({ refreshing, onRefresh, onNewReservation }) => (
  <div className="fo-ota-page">
    <div className="fo-ota-heading">
      <span>OTA Bookings</span>
      <div className="fo-reservation-actions">
        <button className="fo-reference-btn fo-reference-btn--refresh" onClick={onRefresh} disabled={refreshing}>↻ {refreshing ? "Refreshing" : "Refresh"}</button>
        <button className="fo-reference-btn fo-reference-btn--new" onClick={onNewReservation}>⊕ New Reservation</button>
      </div>
    </div>
    <section className="fo-ota-panel">
      <div className="fo-ota-panel-head"><strong>New Bookings</strong><button className="fo-acknowledge-btn">Booking Acknowledgement</button></div>
      <div className="fo-ota-panel-body" />
    </section>
    <button className="fo-edge-toggle" type="button" aria-label="Collapse side panel">‹</button>
  </div>
);

export default OtaBookingsView;
