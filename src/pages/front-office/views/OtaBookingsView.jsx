import { useEffect, useState } from "react";
import API from "../../../api";

const OtaBookingsView = ({ refreshing, onRefresh, onNewReservation }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [acknowledging, setAcknowledging] = useState(null);

  useEffect(() => {
    if (!refreshing) loadData();
  }, [refreshing]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/fo-payments/ota-bookings/all");
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load OTA bookings:", err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeBooking = async (bookingId) => {
    try {
      await API.post(`/fo-payments/ota-bookings/${bookingId}/acknowledge`, {
        acknowledged: true,
      });
      alert("Booking acknowledged");
    } catch (err) {
      alert(err.response?.data?.message || "Acknowledgment failed");
    } finally {
      setAcknowledging(null);
    }
  };

  const renderStatusBadge = (status) => {
    const statusMap = {
      pending: { bg: "#ffd23f", color: "#000" },
      confirmed: { bg: "#00d826", color: "#000" },
      checked_in: { bg: "#4a90e2", color: "#fff" },
      checked_out: { bg: "#9b9b9b", color: "#fff" },
      cancelled: { bg: "#e02b20", color: "#fff" },
    };
    const colors = statusMap[status.toLowerCase()] || statusMap.pending;
    return (
      <span
        style={{
          background: colors.bg,
          color: colors.color,
          fontSize: "9px",
          padding: "2px 4px",
          borderRadius: "2px",
          whiteSpace: "nowrap",
        }}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="fo-ota-page">
      <div className="fo-ota-heading">
        <span>OTA Bookings</span>
        <div className="fo-reservation-actions">
          <button
            className="fo-reference-btn fo-reference-btn--refresh"
            onClick={onRefresh}
            disabled={loading || refreshing}
          >
            ↻ {loading ? "Loading" : refreshing ? "Refreshing" : "Refresh"}
          </button>
          <button className="fo-reference-btn fo-reference-btn--new" onClick={onNewReservation}>
            ⊕ New Reservation
          </button>
        </div>
      </div>
      <section className="fo-ota-panel">
        <div className="fo-ota-panel-head">
          <strong>New Bookings</strong>
          <button className="fo-acknowledge-btn">Booking Acknowledgement</button>
        </div>
        <div className="fo-ota-table-wrap">
          <table className="fo-reservation-table">
            <thead>
              <tr>
                <th>Booking#</th>
                <th>Guest Name</th>
                <th>Source</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Nights</th>
                <th>Rooms</th>
                <th>Status</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan="12" className="fo-reservation-empty">
                    No OTA bookings found
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const checkIn = new Date(row.check_in);
                  const checkOut = new Date(row.check_out);
                  const nights = checkIn && checkOut
                    ? Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24))
                    : 1;

                  return (
                    <tr key={row.bookingId}>
                      <td>{row.booking_code || row.bookingId}</td>
                      <td>{row.guest_name || "—"}</td>
                      <td>{row.bookingSource || "OTA"}</td>
                      <td>{checkIn.toLocaleDateString("en-GB")}</td>
                      <td>{checkOut.toLocaleDateString("en-GB")}</td>
                      <td>{nights}</td>
                      <td>{row.rooms || "—"}</td>
                      <td>{renderStatusBadge(row.booking_status)}</td>
                      <td>{Number(row.totalAmount || 0).toFixed(2)}</td>
                      <td>{Number(row.paidAmount || 0).toFixed(2)}</td>
                      <td>{(Number(row.totalAmount || 0) - Number(row.paidAmount || 0)).toFixed(2)}</td>
                      <td>
                        {acknowledging === row.bookingId ? (
                          <button onClick={() => acknowledgeBooking(row.bookingId)}>
                            ✓
                          </button>
                        ) : (
                          <button onClick={() => setAcknowledging(row.bookingId)}>
                            Acknowledge
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
      <button className="fo-edge-toggle" type="button" aria-label="Collapse side panel">
        ‹
      </button>
    </div>
  );
};

export default OtaBookingsView;
