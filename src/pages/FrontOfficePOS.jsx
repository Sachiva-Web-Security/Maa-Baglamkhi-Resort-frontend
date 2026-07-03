import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import "./FrontOfficePOS.css";
import ReservationView from "./front-office/views/ReservationView";
import OtaBookingsView from "./front-office/views/OtaBookingsView";
import CreditSettlementView from "./front-office/views/CreditSettlementView";
import InvoiceEditorView from "./front-office/views/InvoiceEditorView";
import RoomType from "./front-office/RoomType";
import Rooms from "./front-office/Rooms";
import Services from "./front-office/Services";
import Guests from "./manage/Guests";
import HousekeepingMasterView from "./front-office/views/HousekeepingMasterView";

const normalizeStatus = (room) => {
  const raw = String(room.status || room.operational_status || "").toLowerCase();
  if (raw.includes("occup")) return "Occupied";
  if (raw.includes("clean") || raw.includes("dirty") || raw.includes("housekeep")) return "House Keeping";
  if (raw.includes("maint")) return "Maintenance";
  if (raw.includes("reserve") || raw.includes("advance")) return "Advance Booking";
  if (raw.includes("expected") && raw.includes("out")) return "Expected Checkout";
  if (raw.includes("expected") && raw.includes("in")) return "Expected Checkin";
  return "Available";
};

const FrontOfficePOS = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState("dashboard"); // "reservation" | "dashboard"
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [reservationFilters, setReservationFilters] = useState({ bookingNo: "", date: "", guestName: "" });
  const [refreshing, setRefreshing] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [creditTab, setCreditTab] = useState("guest");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [activeFilter, setActiveFilter] = useState("Available");
  const [roomTypeFilter, setRoomTypeFilter] = useState("");
  const [roomNumberFilter, setRoomNumberFilter] = useState("");
  const [availabilityDate, setAvailabilityDate] = useState("");
  const [invFilters, setInvFilters] = useState({
    invoiceNo: "", roomNo: "", folioNo: "", fromDate: "", toDate: "",
    companyName: "", guestName: "", mobileNo: "", via: false, company: "",
  });

  useEffect(() => {
    (async () => {
      try {
        const [roomsRes, bookingsRes, invoicesRes] = await Promise.all([
          API.get("/hotel/rooms/setup"),
          API.get("/hotel/all-bookings").catch(() => ({ data: [] })),
          API.get("/invoices/all").catch(() => ({ data: [] })),
        ]);
        setInvoices(Array.isArray(invoicesRes.data) ? invoicesRes.data : []);

        const extracted = [];
        if (Array.isArray(roomsRes.data)) {
          roomsRes.data.forEach((category) => {
            const cat = category.name || category.categoryName || "Standard";
            const list = category.roomDetails || category.rooms || [];
            list.forEach((room) => {
              extracted.push({
                id: room.id || `${cat}-${room.number}`,
                number: String(room.number || room.roomNumber || ""),
                categoryName: cat,
                status: room.status || "Available",
                defaultPrice: category.defaultPrice || room.price || 0,
              });
            });
          });
        }
        setRooms(extracted);
        setBookings(Array.isArray(bookingsRes.data) ? bookingsRes.data : []);
      } catch (err) {
        console.error("Error loading front-office rooms:", err);
      }
    })();
  }, []);

  // Compute room summary counts
  const counts = useMemo(() => {
    const c = {
      "Total Rooms": rooms.length,
      "Available": 0,
      "House Keeping": 0,
      "Maintenance": 0,
      "Occupied": 0,
      "Group Checkin": 0,
      "Advance Booking": 0,
      "Expected Checkout": 0,
      "Expected Checkin": 0,
    };
    rooms.forEach((r) => {
      const s = normalizeStatus(r);
      if (c[s] != null) c[s] += 1;
    });
    // crude expected counts from bookings if data present
    const today = new Date().toISOString().slice(0, 10);
    bookings.forEach((b) => {
      const ci = String(b.check_in || b.checkIn || "").slice(0, 10);
      const co = String(b.check_out || b.checkOut || "").slice(0, 10);
      if (ci === today) c["Expected Checkin"] += 1;
      if (co === today) c["Expected Checkout"] += 1;
    });
    return c;
  }, [rooms, bookings]);

  const summaryItems = [
    { key: "Total Rooms", color: "slate", value: counts["Total Rooms"] },
    { key: "Available", color: "green", value: counts["Available"] },
    { key: "House Keeping", color: "orange", value: counts["House Keeping"] },
    { key: "Maintenance", color: "cyan", value: counts["Maintenance"] },
    { key: "Occupied", color: "red", value: counts["Occupied"] },
    { key: "Group Checkin", color: "slate", value: counts["Group Checkin"] },
    { key: "Advance Booking", color: "blue", value: counts["Advance Booking"] },
    { key: "Expected Checkout", color: "slate", value: counts["Expected Checkout"] },
    { key: "Expected Checkin", color: "slate", value: counts["Expected Checkin"] },
  ];

  const roomTypes = useMemo(() => {
    const set = new Set();
    rooms.forEach((r) => r.categoryName && set.add(r.categoryName));
    return Array.from(set);
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      const s = normalizeStatus(r);
      const matchesStatus =
        activeFilter === "Total Rooms" ? true : s === activeFilter;
      const matchesType = !roomTypeFilter || r.categoryName === roomTypeFilter;
      const matchesNumber =
        !roomNumberFilter || String(r.number).includes(roomNumberFilter);
      return matchesStatus && matchesType && matchesNumber;
    });
  }, [rooms, activeFilter, roomTypeFilter, roomNumberFilter]);

  const statusToClass = (s) => {
    switch (s) {
      case "Available": return "fo-card--green";
      case "Occupied": return "fo-card--red";
      case "House Keeping": return "fo-card--orange";
      case "Maintenance": return "fo-card--cyan";
      case "Advance Booking": return "fo-card--blue";
      case "Expected Checkout": return "fo-card--slate";
      case "Expected Checkin": return "fo-card--slate";
      default: return "fo-card--slate";
    }
  };

  const reservationRows = useMemo(() => bookings.filter((booking) => {
    const number = String(booking.bookingId || booking.booking_id || booking.id || "");
    const guest = String(booking.guest_name || booking.guestName || booking.customer_name || "");
    const arrival = String(booking.check_in || booking.checkIn || "").slice(0, 10);
    return (!reservationFilters.bookingNo || number.toLowerCase().includes(reservationFilters.bookingNo.toLowerCase()))
      && (!reservationFilters.guestName || guest.toLowerCase().includes(reservationFilters.guestName.toLowerCase()))
      && (!reservationFilters.date || arrival === reservationFilters.date);
  }), [bookings, reservationFilters]);

  const refreshReservations = async () => {
    setRefreshing(true);
    try {
      const response = await API.get("/hotel/all-bookings");
      setBookings(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Error refreshing reservations:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const formatReservationDate = (value) => {
    if (!value) return "—";
    const date = new Date(String(value).length === 10 ? `${value}T12:00:00` : value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-GB");
  };

  const reservationStatus = (booking) => {
    const raw = String(booking.status || booking.booking_status || "Reserved").toLowerCase();
    if (raw.includes("cancel")) return { label: "Cancelled", tone: "cancelled" };
    if (raw.includes("out")) return { label: "Checked Out", tone: "out" };
    if (raw.includes("occup") || (raw.includes("check") && raw.includes("in"))) return { label: "Checked In", tone: "checked-in" };
    return { label: "Reserved", tone: "reserved" };
  };

  const topMenus = {
    ota: [
      { label: "Bookings", action: () => setActiveView("ota-bookings") },
      { label: "OTA Rates" }, { label: "OTA Inventory" }, { label: "Stop/Open Rooms", action: () => setActiveView("ota-stop-open") },
    ],
    manage: [
      { label: "Invoices", action: () => setActiveView("invoice") },
      { label: "Company Ledger", path: "/accounts" }, { label: "Cash Book", path: "/accounts" }, { label: "Due List", path: "/accounts" },
    ],
    master: [
      { label: "Room Type Master", action: () => setActiveView("master-room-types") }, { label: "Room Master", action: () => setActiveView("master-rooms") },
      { label: "Service Master", action: () => setActiveView("master-services") }, { label: "Guest Master", action: () => setActiveView("master-guests") },
      { label: "OTA Master" }, { label: "Laundry Master" }, { label: "HK Item Group" }, { label: "HK Items" },
    ],
    housekeeping: [
      { label: "Manage House Keeping", action: () => setActiveView("housekeeping-manage") }, { label: "Adjust HK Stock", path: "/housekeeping" },
      { label: "Item Issue/Receive", path: "/housekeeping" }, { label: "Inhouse Laundry", path: "/housekeeping" },
    ],
    reports: [
      "Periodical Collection", "Daily Sales", "MIS Report", "Invoice Register", "Service Wise Report", "Daily Service Report",
      "Breakfast Report", "Room Occupancy Report", "Occupied Room Summary", "All Room Summary", "Checkout Room Summary",
      "Company Ledger", "Room History", "Room Performance Report", "Guest List for Police", "House Keeping History",
      "Maintenance History", "General Ledger", "Cashbook Summary", "Night Audit", "Cash Summary", "Refund Collection", "Current Stock Summary",
    ].map((label) => ({ label, path: "/reports" })),
  };

  const runMenuItem = (item) => {
    setOpenMenu(null);
    if (item.action) item.action();
    else if (item.path) navigate(item.path);
  };

  const renderTopMenu = (key, label) => (
    <div className="fo-menu-wrap" onMouseEnter={() => setOpenMenu(key)} onMouseLeave={() => setOpenMenu(null)}>
      <button className={`fo-tab ${openMenu === key ? "fo-tab--menu-open" : ""} ${key === "ota" && activeView.startsWith("ota-") ? "fo-tab--active" : ""} ${key === "manage" && activeView.startsWith("invoice") ? "fo-tab--active" : ""} ${key === "master" && activeView.startsWith("master-") ? "fo-tab--active" : ""} ${key === "housekeeping" && activeView.startsWith("housekeeping-") ? "fo-tab--active" : ""}`} onClick={() => setOpenMenu((current) => current === key ? null : key)}>
        {label} <span className="fo-caret">▾</span>
      </button>
      {openMenu === key && <div className={`fo-dropdown fo-dropdown--${key}`}>
        {topMenus[key].map((item) => <button key={item.label} onClick={() => runMenuItem(item)}>{item.label}</button>)}
      </div>}
    </div>
  );

  const userName = localStorage.getItem("userName") || localStorage.getItem("name") || "User";

  return (
    <div className="fo-screen">
      {/* TOP NAV */}
      <div className="fo-topbar">
        <div className="fo-topbar-left">
          <button className="fo-logo-btn" onClick={() => navigate("/dashboard")}>
            <span className="fo-logo-icon">Q</span>
            <span>Maa Baglamukhi</span>
          </button>
          <button
            className={`fo-tab ${activeView === "dashboard" ? "fo-tab--active" : ""}`}
            onClick={() => setActiveView("dashboard")}
          >Dashboard</button>
          <button
            className={`fo-tab ${activeView === "reservation" ? "fo-tab--active" : ""}`}
            onClick={() => setActiveView("reservation")}
          >Reservation</button>
          {renderTopMenu("ota", "OTA")}
          <button className="fo-tab">OTA <span className="fo-caret">▾</span></button>
          <button
            className={`fo-tab ${activeView === "checkin-checkout" ? "fo-tab--active" : ""}`}
            onClick={() => setActiveView("checkin-checkout")}
          >Checkin/Checkout</button>
          {renderTopMenu("manage", "Manage")}
          <button className="fo-tab">Manage <span className="fo-caret">▾</span></button>
          <button className="fo-tab">Post Service</button>
          {renderTopMenu("master", "Master")}
          {renderTopMenu("housekeeping", "House Keeping")}
          <button className="fo-tab">Master <span className="fo-caret">▾</span></button>
          <button className="fo-tab">House Keeping <span className="fo-caret">▾</span></button>
          <button className="fo-tab">GRC</button>
          {renderTopMenu("reports", "Reports")}
          <button className="fo-tab">Reports <span className="fo-caret">▾</span></button>
          <button className="fo-tab">Data Backup</button>
        </div>
        <div className="fo-topbar-right">
          <button className="fo-icon-btn" title="Switch screen"><span className="ico-grid" /></button>
          <button className="fo-icon-btn" title="Monitor"><span className="ico-screen" /></button>
          <button className="fo-icon-btn" title="Collapse"><span className="ico-chev" /></button>
          <span className="fo-user">{userName} <span className="fo-caret">▾</span></span>
          <button
            className="fo-logout"
            onClick={() => {
              if (confirm("Logout?")) {
                localStorage.clear();
                navigate("/login");
              }
            }}
            title="Logout"
          >
            ⏻
          </button>
        </div>
      </div>

      {/* BODY: sidebar + main */}
      {activeView === "reservation" && <ReservationView filters={reservationFilters} setFilters={setReservationFilters} rows={reservationRows} formatDate={formatReservationDate} getStatus={reservationStatus} onRefresh={refreshReservations} refreshing={refreshing} onOpenBooking={() => navigate("/hotel")} />}
      {activeView === "ota-bookings" && <OtaBookingsView refreshing={refreshing} onRefresh={refreshReservations} onNewReservation={() => navigate("/hotel")} />}
      {activeView === "ota-stop-open" && <CreditSettlementView activeTab={creditTab} onTabChange={setCreditTab} />}

      {false && activeView === "reservation" && (
      <div className="fo-reservation-page">
        <div className="fo-reservation-heading">
          <span>Reservation</span>
          <div className="fo-reservation-actions">
            <button className="fo-reference-btn fo-reference-btn--refresh" onClick={refreshReservations} disabled={refreshing}>↻ {refreshing ? "Refreshing" : "Refresh"}</button>
            <button className="fo-reference-btn fo-reference-btn--new" onClick={() => navigate("/hotel")}>⊕ New Reservation</button>
          </div>
        </div>
        <section className="fo-reservation-panel">
          <div className="fo-reservation-panel-title">Search Invoice</div>
          <div className="fo-reservation-search">
            <input placeholder="Enter Booking No" value={reservationFilters.bookingNo} onChange={(e) => setReservationFilters((p) => ({ ...p, bookingNo: e.target.value }))} />
            <input type="date" aria-label="Reservation date" value={reservationFilters.date} onChange={(e) => setReservationFilters((p) => ({ ...p, date: e.target.value }))} />
            <input placeholder="Enter guest name" value={reservationFilters.guestName} onChange={(e) => setReservationFilters((p) => ({ ...p, guestName: e.target.value }))} />
            <button className="fo-reference-btn fo-reference-btn--search">⌕ Search</button>
            <button className="fo-reference-btn fo-reference-btn--clear" onClick={() => setReservationFilters({ bookingNo: "", date: "", guestName: "" })}>↶ Clear Filter</button>
          </div>
          <div className="fo-reservation-table-wrap">
            <table className="fo-reservation-table">
              <thead><tr><th>Action</th><th>Booking#</th><th>Date</th><th>Guest Name</th><th>Arrival</th><th>Departure Date</th><th>Adults</th><th>Children</th><th>No Of Rooms</th><th>Coming From</th><th>Pickup Point</th><th>Booking Status</th></tr></thead>
              <tbody>
                {reservationRows.map((booking) => {
                  const roomList = Array.isArray(booking.rooms) ? booking.rooms : booking.rooms ? [booking.rooms] : booking.room ? [booking.room] : [];
                  const status = reservationStatus(booking);
                  return <tr key={booking.bookingId || booking.booking_id || booking.id}>
                    <td><button className="fo-row-action" title="Open booking" onClick={() => navigate("/hotel")}>⋮</button></td>
                    <td>{booking.bookingId || booking.booking_id || booking.id || "—"}</td>
                    <td>{formatReservationDate(booking.created_at || booking.booking_date || booking.check_in || booking.checkIn)}</td>
                    <td>{booking.guest_name || booking.guestName || booking.customer_name || "—"}</td>
                    <td>{formatReservationDate(booking.check_in || booking.checkIn)}</td>
                    <td>{formatReservationDate(booking.check_out || booking.checkOut)}</td>
                    <td>{booking.adults ?? booking.no_of_adults ?? 1}</td>
                    <td>{booking.children ?? booking.no_of_children ?? 0}</td>
                    <td>{booking.no_of_rooms ?? (roomList.length || 1)}</td>
                    <td>{booking.coming_from || booking.comingFrom || ""}</td>
                    <td>{booking.pickup_point || booking.pickupPoint || ""}</td>
                    <td><span className={`fo-booking-status fo-booking-status--${status.tone}`}>{status.label}</span></td>
                  </tr>;
                })}
                {reservationRows.length === 0 && <tr><td colSpan="12" className="fo-reservation-empty">No reservations found</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        <button className="fo-edge-toggle" type="button" aria-label="Collapse side panel">‹</button>
      </div>
      )}

      {false && activeView === "ota-bookings" && (
      <div className="fo-ota-page">
        <div className="fo-ota-heading">
          <span>OTA Bookings</span>
          <div className="fo-reservation-actions">
            <button className="fo-reference-btn fo-reference-btn--refresh" onClick={refreshReservations} disabled={refreshing}>↻ {refreshing ? "Refreshing" : "Refresh"}</button>
            <button className="fo-reference-btn fo-reference-btn--new" onClick={() => navigate("/hotel")}>⊕ New Reservation</button>
          </div>
        </div>
        <section className="fo-ota-panel">
          <div className="fo-ota-panel-head">
            <strong>New Bookings</strong>
            <button className="fo-acknowledge-btn">Booking Acknowledgement</button>
          </div>
          <div className="fo-ota-panel-body" />
        </section>
        <button className="fo-edge-toggle" type="button" aria-label="Collapse side panel">‹</button>
      </div>
      )}

      {false && activeView === "ota-stop-open" && (
      <div className="fo-credit-page">
        <div className="fo-credit-title">CREDIT BILL SETTLEMENT</div>
        <section className="fo-credit-panel">
          <div className="fo-credit-tabs">
            <button className={creditTab === "guest" ? "is-active" : ""} onClick={() => setCreditTab("guest")}>Guest</button>
            <button className={creditTab === "vendor" ? "is-active" : ""} onClick={() => setCreditTab("vendor")}>Vendor</button>
          </div>
          {creditTab === "guest" ? <>
          <div className="fo-credit-filters">
            <label>Mobile Number<input placeholder="Mobile No" /></label>
            <label>Guest Name<input placeholder="Guest name" /></label>
            <div className="fo-credit-filter-actions">
              <button className="fo-credit-search">⌕ Search</button>
              <button className="fo-credit-reset">↶</button>
            </div>
          </div>
          <div className="fo-credit-table-wrap">
            <table className="fo-credit-table">
              <thead><tr><th>Action</th><th>Guest Name</th><th>Mobile Number</th><th>Module</th><th>Total Credit</th><th>Total Paid</th><th>Total Received</th><th>Balance</th></tr></thead>
              <tbody><tr><td colSpan="8">No Receipts Found</td></tr></tbody>
            </table>
          </div>
          </> : <div className="fo-vendor-credit">
            <label>Search</label>
            <div className="fo-vendor-search-row">
              <select defaultValue=""><option value="" disabled>Select Vendor</option></select>
              <button className="fo-credit-search">⌕ Search</button>
              <button className="fo-credit-reset">↶</button>
            </div>
            <div className="fo-vendor-empty">No Receipts Found</div>
          </div>}
        </section>
        <button className="fo-edge-toggle" type="button" aria-label="Collapse side panel">‹</button>
      </div>
      )}

      {(activeView === "dashboard" || activeView === "checkin-checkout") && (
      <div className="fo-body">
        {/* LEFT SIDEBAR: Room Summary */}
        <aside className="fo-sidebar">
          <div className="fo-sidebar-title">Room Summary</div>
          {summaryItems.map((s) => (
            <button
              key={s.key}
              className={`fo-stat fo-stat--${s.color} ${activeFilter === s.key ? "is-active" : ""}`}
              onClick={() => setActiveFilter(s.key)}
            >
              <span className="fo-stat-badge">{s.value}</span>
              <span className="fo-stat-label">{s.key}</span>
            </button>
          ))}
        </aside>

        {/* MAIN: filter row + rooms grid */}
        <main className="fo-main">
          <div className="fo-filter-row">
            <div className="fo-filter">
              <label>Room Type</label>
              <select
                value={roomTypeFilter}
                onChange={(e) => setRoomTypeFilter(e.target.value)}
              >
                <option value="">All Rooms</option>
                {roomTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="fo-filter">
              <label>Room#</label>
              <select
                value={roomNumberFilter}
                onChange={(e) => setRoomNumberFilter(e.target.value)}
              >
                <option value="">All Rooms</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.number}>{r.number}</option>
                ))}
              </select>
            </div>
            <div className="fo-filter fo-filter--avail">
              <label>Availability Check</label>
              <div className="fo-avail-input">
                <input
                  type="date"
                  value={availabilityDate}
                  onChange={(e) => setAvailabilityDate(e.target.value)}
                />
                <button className="fo-search-btn">Search</button>
              </div>
            </div>
          </div>

          <div className="fo-rooms-grid">
            {filteredRooms.map((r) => {
              const status = normalizeStatus(r);
              return (
                <div key={r.id} className={`fo-card ${statusToClass(status)}`}>
                  <div className="fo-card-head">
                    <div className="fo-card-title">
                      <span className="fo-bed">🛏</span>
                      <strong>{r.number}</strong>
                      <span className="fo-card-cat">({r.categoryName})</span>
                    </div>
                    <button className="fo-card-menu" title="Actions">▾</button>
                  </div>
                  <div className="fo-card-body">{status}</div>
                  <div className="fo-card-footer">
                    <button className="fo-release-btn">Release</button>
                    <span className="fo-room-home" aria-hidden="true">🏠</span>
                  </div>
                </div>
              );
            })}
            {filteredRooms.length === 0 && (
              <div className="fo-empty">No rooms match the current filter.</div>
            )}
          </div>
        </main>
      </div>
      )}

      {activeView === "invoice-edit" && <InvoiceEditorView invoice={selectedInvoice} onBack={() => setActiveView("invoice")} />}
      {activeView === "master-room-types" && <div className="fo-master-view"><RoomType /></div>}
      {activeView === "master-rooms" && <div className="fo-master-view"><Rooms /></div>}
      {activeView === "master-services" && <div className="fo-master-view"><Services /></div>}
      {activeView === "master-guests" && <div className="fo-master-view"><Guests /></div>}
      {activeView === "housekeeping-manage" && <HousekeepingMasterView />}

      {/* DASHBOARD / INVOICE VIEW */}
      {activeView === "invoice" && (
      <div className="fo-invoice-wrap">
        <div className="fo-invoice-head">
          <h2 className="fo-invoice-title">INVOICE</h2>
          <div className="fo-invoice-head-actions">
            <button className="fo-inv-btn fo-inv-btn--orange">⬇ Export to Excel</button>
            <button className="fo-inv-btn fo-inv-btn--gray">⟳ Refresh</button>
          </div>
        </div>

        <div className="fo-invoice-search-card">
          <div className="fo-invoice-search-title">Search Invoice</div>
          <div className="fo-invoice-search-grid">
            <input className="fo-inv-input" placeholder="Invoice No"
              value={invFilters.invoiceNo}
              onChange={(e) => setInvFilters((p) => ({ ...p, invoiceNo: e.target.value }))} />
            <input className="fo-inv-input" placeholder="Room no"
              value={invFilters.roomNo}
              onChange={(e) => setInvFilters((p) => ({ ...p, roomNo: e.target.value }))} />
            <input className="fo-inv-input" placeholder="Folio no"
              value={invFilters.folioNo}
              onChange={(e) => setInvFilters((p) => ({ ...p, folioNo: e.target.value }))} />
            <input className="fo-inv-input" type="date"
              value={invFilters.fromDate}
              onChange={(e) => setInvFilters((p) => ({ ...p, fromDate: e.target.value }))} />
            <input className="fo-inv-input" type="date"
              value={invFilters.toDate}
              onChange={(e) => setInvFilters((p) => ({ ...p, toDate: e.target.value }))} />
            <input className="fo-inv-input" placeholder="Company name"
              value={invFilters.companyName}
              onChange={(e) => setInvFilters((p) => ({ ...p, companyName: e.target.value }))} />
            <input className="fo-inv-input" placeholder="Guest name"
              value={invFilters.guestName}
              onChange={(e) => setInvFilters((p) => ({ ...p, guestName: e.target.value }))} />
            <input className="fo-inv-input" placeholder="Mobile No"
              value={invFilters.mobileNo}
              onChange={(e) => setInvFilters((p) => ({ ...p, mobileNo: e.target.value }))} />
            <label className="fo-inv-via">
              <input type="checkbox"
                checked={invFilters.via}
                onChange={(e) => setInvFilters((p) => ({ ...p, via: e.target.checked }))} /> VIA
            </label>
            <select className="fo-inv-input"
              value={invFilters.company}
              onChange={(e) => setInvFilters((p) => ({ ...p, company: e.target.value }))}>
              <option value="">Select Company</option>
            </select>
            <button className="fo-inv-btn fo-inv-btn--blue">🔍 Search</button>
            <button
              className="fo-inv-btn fo-inv-btn--gray"
              onClick={() => setInvFilters({ invoiceNo: "", roomNo: "", folioNo: "", fromDate: "", toDate: "", companyName: "", guestName: "", mobileNo: "", via: false, company: "" })}
            >⌫ Clear Filter</button>
          </div>
        </div>

        <div className="fo-invoice-table-wrap">
          <table className="fo-invoice-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Invoice#</th>
                <th>Folio No</th>
                <th>Date</th>
                <th>Room No</th>
                <th>Guest Name</th>
                <th>Guest Company</th>
                <th>Via</th>
                <th>Checkin</th>
                <th>Departure Date</th>
                <th>Nights</th>
                <th>Adults</th>
                <th>Tariff</th>
                <th>Discount</th>
                <th>Taxable</th>
                <th>SGST</th>
                <th>CGST</th>
                <th>Room</th>
                <th>Roundoff Discount</th>
                <th>Service</th>
                <th>Net</th>
                <th>Payment Mode</th>
              </tr>
            </thead>
            <tbody>
              {invoices
                .filter((inv) => {
                  if (invFilters.invoiceNo && !String(inv.invoice_no || inv.id || "").includes(invFilters.invoiceNo)) return false;
                  if (invFilters.roomNo && !String(inv.room_no || "").includes(invFilters.roomNo)) return false;
                  if (invFilters.folioNo && !String(inv.booking_id || "").includes(invFilters.folioNo)) return false;
                  if (invFilters.guestName) {
                    const name = String(inv.customer_name || inv.guest_name || "").toLowerCase();
                    if (!name.includes(invFilters.guestName.toLowerCase())) return false;
                  }
                  if (invFilters.mobileNo && !String(inv.phone || "").includes(invFilters.mobileNo)) return false;
                  if (invFilters.fromDate && inv.date && inv.date < invFilters.fromDate) return false;
                  if (invFilters.toDate && inv.date && inv.date > invFilters.toDate) return false;
                  return true;
                })
                .map((inv) => {
                  const checkIn = inv.check_in ? new Date(inv.check_in) : null;
                  const checkOut = inv.check_out ? new Date(inv.check_out) : null;
                  const nights = checkIn && checkOut ? Math.max(1, Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24))) : 1;
                  const tariff = Number(inv.price_per_day || 0) * nights;
                  const discount = Number(inv.discount || 0);
                  const taxable = Math.max(0, tariff - discount);
                  const gstAmt = Number(inv.gst || 0);
                  const gstPctVal = taxable > 0 ? (gstAmt / taxable) * 100 : 0;
                  const sgst = +(gstAmt / 2).toFixed(2);
                  const cgst = +(gstAmt / 2).toFixed(2);
                  const room = +(taxable + gstAmt).toFixed(2);
                  const net = Number(inv.final_total || inv.total_amount || inv.total || room);
                  const fmtDt = (d) => d ? new Date(d).toLocaleDateString("en-GB") : "—";
                  const fmtDtTime = (d) => d ? new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }).replace(",", "") : "—";
                  return (
                    <tr key={inv.id}>
                      <td>
                        <button className="fo-inv-action-btn" title="Edit" onClick={() => { setSelectedInvoice(inv); setActiveView("invoice-edit"); }}>✎</button>
                        <button className="fo-inv-action-btn fo-inv-action-btn--del" title="Delete">🗑</button>
                      </td>
                      <td>{inv.invoice_no || inv.id}</td>
                      <td>{inv.booking_id || "—"}</td>
                      <td>{fmtDt(inv.date)}</td>
                      <td>{inv.room_no || "—"}</td>
                      <td>{inv.customer_name || inv.guest_name || "—"}</td>
                      <td>{inv.company_name || ""}</td>
                      <td>{inv.via || ""}</td>
                      <td>{fmtDtTime(inv.check_in)}</td>
                      <td>{fmtDtTime(inv.check_out)}</td>
                      <td>{nights}</td>
                      <td>{inv.adults || 1} Adults</td>
                      <td>{tariff.toFixed(2)}</td>
                      <td>{discount}</td>
                      <td>{taxable.toFixed(2)}</td>
                      <td>{sgst.toFixed(2)}</td>
                      <td>{cgst.toFixed(2)}</td>
                      <td>{room.toFixed(0)}</td>
                      <td>0</td>
                      <td>0</td>
                      <td>{Number(net).toFixed(0)}</td>
                      <td>{`${inv.payment_mode || "—"}-${Number(net).toFixed(2)}`}</td>
                    </tr>
                  );
                })}
              {invoices.length === 0 && (
                <tr><td colSpan={22} style={{ textAlign: "center", padding: 24, color: "#6b7280" }}>No invoices found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
};

export default FrontOfficePOS;
