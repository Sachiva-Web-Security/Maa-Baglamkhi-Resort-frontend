import { useCallback, useEffect, useMemo, useState } from "react";
import API from "../../../api";
import "./NewReservationView.css";

const NewReservationView = ({ rooms = [], onSaved, onList }) => {
  const [form, setForm] = useState({
    bookingDate: new Date().toISOString().slice(0, 10),
    bookingType: "Walk In",
    bookedBy: "",
    checkIn: "",
    checkOut: "",
    adults: "1",
    children: "0",
    category: "",
    room: "",
    mobile: "",
    guestName: "",
    gender: "",
    email: "",
    address: "",
    comingFrom: "",
    goingTo: "",
    purpose: "",
    pickup: false,
    pickupFrom: "",
    pickupDetails: "",
    remarks: "",
    amount: "0",
    paymentMode: "",
    paymentDetail: "",
    paidBy: "",
  });
  const [saving, setSaving] = useState(false);
  const [roomTypes, setRoomTypes] = useState([]);

  // Load room types from backend for the dropdown
  useEffect(() => {
    API.get("/room-types")
      .then((r) => setRoomTypes(Array.isArray(r.data) ? r.data.filter((t) => t.is_active !== false) : []))
      .catch(() => setRoomTypes([]));
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(roomTypes.map((t) => t.name).filter(Boolean));
    return Array.from(cats);
  }, [roomTypes]);

  const available = useMemo(() => {
    return rooms.filter(
      (r) =>
        (!form.category || r.categoryName === form.category) &&
        !String(r.status || "").toLowerCase().includes("occup"),
    );
  }, [rooms, form.category]);

  const set = (key) => (e) =>
    setForm((p) => ({
      ...p,
      [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    }));

  const nights =
    form.checkIn && form.checkOut
      ? Math.max(0, Math.ceil((new Date(form.checkOut) - new Date(form.checkIn)) / 86400000))
      : 0;

  const save = async () => {
    if (!form.guestName || !form.checkIn || !form.checkOut || !form.room)
      return alert("Guest name, Check-in, Check-out dates and Room are required");
    setSaving(true);
    try {
      const bookingPayload = {
        guestName: form.guestName,
        guest_name: form.guestName,
        phone: form.mobile || null,
        mobile: form.mobile || null,
        room: form.room,
        room_no: form.room,
        checkIn: form.checkIn,
        check_in: form.checkIn,
        checkOut: form.checkOut,
        check_out: form.checkOut,
        adults: Number(form.adults) || 1,
        children: Number(form.children) || 0,
        comingFrom: form.comingFrom,
        goingTo: form.goingTo,
        purpose: form.purpose,
        pickup: form.pickup,
        pickupFrom: form.pickupFrom,
        pickupDetails: form.pickupDetails,
        remarks: form.remarks,
        amount: Number(form.amount) || 0,
        paymentMode: form.paymentMode,
        paymentDetail: form.paymentDetail,
        paidBy: form.paidBy,
      };
      await API.post("/hotel/book", bookingPayload);

      // If advance payment amount is entered, post advance to the booking
      if (Number(form.amount) > 0) {
        try {
          const bookingsRes = await API.get("/hotel/all-bookings");
          const latestBooking = Array.isArray(bookingsRes.data) ? bookingsRes.data[0] : null;
          if (latestBooking?.bookingId) {
            await API.post(`/hotel/advance/${latestBooking.bookingId}`, {
              amount: Number(form.amount),
              payment_mode: form.paymentMode || "Cash",
              remarks: form.remarks || "",
            });
          }
        } catch {}
      }

      await onSaved?.();
      onList();
    } catch (e) {
      alert(e.response?.data?.message || "Reservation failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="new-res">
      <div className="new-res-head">
        <span>Reservation</span>
        <button onClick={() => window.location.reload()}>↻ Refresh</button>
      </div>
      <div className="new-res-grid">
        {/* Column 1 */}
        <div>
          <Box title="Booking Information">
            <div className="two">
              <Field label="Booking No" disabled />
              <Field label="Booking Date">
                <input type="date" value={form.bookingDate} onChange={set("bookingDate")} />
              </Field>
            </div>
            <label>Booking Type</label>
            <p>
              ◉ Walk In　○ Via　○ Online
            </p>
            <Field label="Booked By">
              <input
                value={form.bookedBy}
                onChange={set("bookedBy")}
                placeholder="Person name who has booked"
              />
            </Field>
          </Box>
          <Box title="Arrival Details">
            <div className="two">
              <Field label="Check In Date *">
                <input type="date" value={form.checkIn} onChange={set("checkIn")} />
              </Field>
              <Field label="Check Out Date *">
                <input type="date" value={form.checkOut} onChange={set("checkOut")} />
              </Field>
            </div>
            <div className="three">
              <Field label="No Of Days *">
                <input value={nights} readOnly />
              </Field>
              <Field label="Adults *">
                <input
                  value={form.adults}
                  onChange={set("adults")}
                  placeholder="Enter no of adults"
                />
              </Field>
              <Field label="Children">
                <input value={form.children} onChange={set("children")} />
              </Field>
            </div>
          </Box>
        </div>

        {/* Column 2 */}
        <div>
          <Box title="Room Details">
            <div className="room-row">
              <select value={form.category} onChange={set("category")}>
                <option value="">Room Category</option>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <select value={form.room} onChange={set("room")}>
                <option value="">No Of Rooms</option>
                {available.map((r) => (
                  <option key={r.id} value={r.number}>
                    Room {r.number}
                  </option>
                ))}
              </select>
              <button>+ Add</button>
            </div>
            <b>Blocked Rooms</b>
          </Box>
          <Box title="Guest Details">
            <div className="two">
              <Field label="Mobile Number *">
                <input
                  value={form.mobile}
                  onChange={set("mobile")}
                  placeholder="Enter primary mobile number"
                />
              </Field>
              <Field label="Guest Name *">
                <input
                  value={form.guestName}
                  onChange={set("guestName")}
                  placeholder="Enter guest name"
                />
              </Field>
            </div>
            <div className="two">
              <Field label="Gender">
                <select value={form.gender} onChange={set("gender")}>
                  <option value="">Select Gender</option>
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </Field>
              <Field label="Email Id">
                <input
                  value={form.email}
                  onChange={set("email")}
                  placeholder="Enter email id"
                />
              </Field>
            </div>
            <Field label="Address">
              <textarea value={form.address} onChange={set("address")} />
            </Field>
          </Box>
        </div>

        {/* Column 3 */}
        <div>
          <Box title="Office Use">
            <div className="two">
              <Field label="Coming From">
                <input
                  value={form.comingFrom}
                  onChange={set("comingFrom")}
                  placeholder="Please enter from where guest is coming"
                />
              </Field>
              <Field label="Going To">
                <input
                  value={form.goingTo}
                  onChange={set("goingTo")}
                  placeholder="Please enter where guest is going to"
                />
              </Field>
            </div>
            <Field label="Purpose of Visit">
              <input
                value={form.purpose}
                onChange={set("purpose")}
                placeholder="Please enter purpose of visit"
              />
            </Field>
            <div className="two">
              <label>
                <input
                  type="checkbox"
                  checked={form.pickup}
                  onChange={set("pickup")}
                />{" "}
                Pickup?
              </label>
              <Field label="Pickup From">
                <input
                  value={form.pickupFrom}
                  onChange={set("pickupFrom")}
                  placeholder="Please enter pickup point"
                />
              </Field>
            </div>
            <Field label="Pickup Details">
              <input
                value={form.pickupDetails}
                onChange={set("pickupDetails")}
                placeholder="Please enter pickup details"
              />
            </Field>
            <Field label="Remarks">
              <textarea value={form.remarks} onChange={set("remarks")} />
            </Field>
          </Box>
          <Box title="Advance Payment Details">
            <div className="two">
              <Field label="Amount">
                <input value={form.amount} onChange={set("amount")} />
              </Field>
              <Field label="Payment Mode">
                <select value={form.paymentMode} onChange={set("paymentMode")}>
                  <option value="">Select</option>
                  <option>Cash</option>
                  <option>UPI</option>
                  <option>Card</option>
                </select>
              </Field>
            </div>
            <div className="two">
              <Field label="Payment Detail">
                <input
                  value={form.paymentDetail}
                  onChange={set("paymentDetail")}
                  placeholder="Please enter payment detail"
                />
              </Field>
              <Field label="Paid By">
                <input
                  value={form.paidBy}
                  onChange={set("paidBy")}
                  placeholder="Please enter paid by name"
                />
              </Field>
            </div>
            <div className="actions">
              <button className="save" onClick={save} disabled={saving}>
                ⚑ {saving ? "Saving" : "Save"}
              </button>
              <button onClick={onList}>☷ List</button>
            </div>
          </Box>
        </div>
      </div>
    </div>
  );
};

const Box = ({ title, children }) => (
  <section>
    <h3>{title}</h3>
    <div>{children}</div>
  </section>
);
const Field = ({ label, children, disabled }) => (
  <div className="field">
    <label>{label}</label>
    {children || <input disabled={disabled} placeholder="Booking No" />}
  </div>
);
export default NewReservationView;
