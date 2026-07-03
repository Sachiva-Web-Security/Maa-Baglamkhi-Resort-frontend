import { useMemo, useState } from "react";
import "./PmsDashboardView.css";

const day = (value) => String(value || "").slice(0, 10);
const PmsDashboardView = ({ bookings = [], rooms = [], invoices = [] }) => {
  const [reservationTab, setReservationTab] = useState("arrivals");
  const [activityTab, setActivityTab] = useState("sales");
  const today = new Date().toISOString().slice(0, 10);
  const arrivals = bookings.filter((b) => day(b.check_in || b.checkIn) === today);
  const departures = bookings.filter((b) => day(b.check_out || b.checkOut) === today);
  const occupied = rooms.filter((r) => String(r.status).toLowerCase().includes("occup"));
  const reservationRows = reservationTab === "arrivals" ? arrivals : reservationTab === "departures" ? departures : reservationTab === "inhouse" ? bookings.filter((b) => String(b.status).toLowerCase().includes("occup")) : [];
  const sales = useMemo(() => invoices.reduce((sum, i) => sum + Number(i.final_total || i.total_amount || i.total || 0), 0), [invoices]);
  const reservationTabs = [["arrivals","Arrivals List"],["departures","Departure List"],["stayover","Stay Over"],["inhouse","In House"]];
  const activityTabs = [["sales","Sales"],["collection","Collection"],["services","Services"],["advance","Advance Booking"],["cancellation","Cancellation"],["cashbook","Cash Book"]];
  const emptyLabel = { arrivals:"No Arrivals Today", departures:"No Departure Today", stayover:"No Stay Over Today", inhouse:"No Inhouse List Today" }[reservationTab];

  return <div className="pms-dash">
    <h2>PMS Dashboard</h2>
    <div className="pms-metrics"><Metric color="green" value={arrivals.length} label="Arrivals"/><Metric color="yellow" value={departures.length} label="Departures"/><Metric color="blue" value={occupied.length} label="Occupied Rooms"/><Metric color="red" value={`${rooms.length ? ((occupied.length / rooms.length) * 100).toFixed(2) : "0.00"}%`} label="Today's Occupancy"/></div>
    <section className="pms-block reservations"><h3>Reservations</h3><Tabs items={reservationTabs} active={reservationTab} setActive={setReservationTab}/><div className="pms-result">
      {reservationRows.length ? <table><thead><tr><th>Booking#</th><th>Guest Name</th><th>Arrival</th><th>Departure Date</th><th>Adults</th><th>Children</th><th>No Of Rooms</th></tr></thead><tbody>{reservationRows.map((b)=><tr key={b.id || b.bookingId}><td>{b.id || b.bookingId}</td><td>{b.guest_name || b.guestName}</td><td>{day(b.check_in || b.checkIn)}</td><td>{day(b.check_out || b.checkOut)}</td><td>{b.adults || 1}</td><td>{b.children || 0}</td><td>{Array.isArray(b.rooms) ? b.rooms.length : 1}</td></tr>)}</tbody></table> : emptyLabel}
    </div></section>
    <section className="pms-block activities"><h3>Activities</h3><Tabs items={activityTabs} active={activityTab} setActive={setActivityTab}/><Activity tab={activityTab} sales={sales}/></section>
    <button className="fo-edge-toggle">‹</button>
  </div>;
};
const Metric=({color,value,label})=><div className={`pms-metric ${color}`}><strong>{value}</strong><span>{label}</span></div>;
const Tabs=({items,active,setActive})=><div className="pms-tabs">{items.map(([key,label])=><button key={key} className={active===key?"active":""} onClick={()=>setActive(key)}>{label}</button>)}</div>;
const Activity=({tab,sales})=>{if(tab==="sales")return <table className="pms-small"><tbody><tr><td>Checkout Revenue</td><td>{sales.toFixed(2)}</td></tr><tr><td>Reservation Revenue</td><td>0</td></tr><tr><td>Cancellation Charges</td><td>0</td></tr><tr><td>Room Dining Revenue</td><td>0</td></tr></tbody></table>;if(tab==="collection")return <table className="pms-small"><tbody><tr><td>Cash In Hand</td><td>0.00</td></tr></tbody></table>;if(tab==="services")return <Generic headers={["Service Type","Total Amount","Discount","Net Payable","Total CGST","Total","Final Total"]} empty="No Services"/>;if(tab==="advance")return <Generic headers={["Booking#","Guest Name","Arrival","Departure Date","Adults","Children","No Of Rooms"]} empty="No Advance Booking Today"/>;if(tab==="cancellation")return <Generic headers={["Booking#","Guest Name","Arrival","Departure Date","No Of Rooms","Cancellation Charges"]} empty="No Cancellation Today"/>;return <div className="pms-cash"><b>▥ Cashbook Summary</b><Generic headers={["Mode","Paid Out (Dr.)","Received (Cr.)"]} empty="No Records Found"/><p>Total Paid Out (Dr.) <b>0.00</b></p><p>Total Received (Cr.) <b>0.00</b></p><p>Balance <b>0.00 Cr.</b></p></div>};
const Generic=({headers,empty})=><table className="pms-generic"><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody><tr><td colSpan={headers.length}>{empty}</td></tr></tbody></table>;
export default PmsDashboardView;
