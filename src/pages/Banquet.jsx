import { useEffect, useMemo, useState } from "react";

import BanquetStepper from "../components/Banquet/BanquetStepper";
import BanquetHallCard from "../components/Banquet/BanquetHallCard";
import BanquetBookingRow from "../components/Banquet/BanquetBookingRow";
import BanquetBill from "../components/Banquet/BanquetBill";

import API, { getBackendBaseURL } from "../api";

/* ---------------- FORMAT ---------------- */

const formatINR = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

/* ---------------- MENU ---------------- */

const menuPackages = [
  { id: "standard", name: "Standard", perGuest: 650 },
  { id: "premium", name: "Premium", perGuest: 950 },
  { id: "royal", name: "Royal", perGuest: 1250 },
];

/* ---------------- TIME ---------------- */

function hoursBetween(start, end) {
  if (!start || !end) return 0;

  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);

  const diff = eh * 60 + em - (sh * 60 + sm);

  if (diff <= 0) return 0;

  return Math.max(1, Math.ceil(diff / 60));
}

const inputCls =
  "w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-100 text-sm";

const labelCls = "block text-xs font-bold text-gray-300 mb-1";

const Banquet = () => {
  const [halls, setHalls] = useState([]);
  const [bookings, setBookings] = useState([]);

  const [showWizard, setShowWizard] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const [showAddHall, setShowAddHall] = useState(false);
  const [detailHall, setDetailHall] = useState(null);

  const [showBill, setShowBill] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const [wizard, setWizard] = useState({
    hallId: "",
    customerName: "",
    phone: "",
    eventType: "Wedding",
    guests: 150,
    menuPackageId: "standard",
    decorationFee: 15000,
    notes: "",
    date: "",
    startTime: "18:00",
    endTime: "22:00",
    discount: 0,
    gstPercent: 5,
  });

  const [newHall, setNewHall] = useState({
    name: "",
    capacity: "",
    ratePerHour: "",
    is_ac: true,
  });

  /* ---------------- SELECTED ---------------- */

  const selectedHall = useMemo(
    () => halls.find((h) => h.id === wizard.hallId),
    [wizard.hallId, halls]
  );

  const selectedPackage = useMemo(
    () => menuPackages.find((p) => p.id === wizard.menuPackageId),
    [wizard.menuPackageId]
  );

  const wizardHours = useMemo(
    () => hoursBetween(wizard.startTime, wizard.endTime),
    [wizard.startTime, wizard.endTime]
  );

  /* ---------------- BILL ---------------- */

  const wizardTotals = useMemo(() => {
    const hallCharge = selectedHall
      ? selectedHall.ratePerHour * wizardHours
      : 0;

    const foodCharge =
      (Number(wizard.guests) || 0) * (selectedPackage?.perGuest || 0);

    const decoration = Number(wizard.decorationFee) || 0;

    const subTotal = hallCharge + foodCharge + decoration;

    const discount = Math.min(subTotal, wizard.discount);

    const taxable = subTotal - discount;

    const gst = Math.round((taxable * wizard.gstPercent) / 100);

    return {
      subTotal,
      gst,
      grandTotal: taxable + gst,
    };
  }, [wizard, wizardHours, selectedHall, selectedPackage]);

  /* ---------------- LOAD ---------------- */

  useEffect(() => {
    const load = async () => {
      const res = await API.get("/banquet");

      if (res.data?.halls) setHalls(res.data.halls);
      if (res.data?.bookings) setBookings(res.data.bookings);
    };

    load();
  }, []);

  /* ---------------- BOOKING ---------------- */

  const handleConfirmBooking = async () => {
    const res = await API.post("/banquet", wizard);

    const newBooking = {
      ...wizard,
      id: res.data?.id || Date.now(),
      hallName: selectedHall?.name,
      status: "Confirmed",
    };

    setBookings((prev) => [newBooking, ...prev]);

    setActiveStep(4);
  };

  const generateBill = async (booking) => {
    setSelectedBooking(booking);
    setShowBill(true);
  };

  /* ---------------- ADD HALL ---------------- */

  const handleAddHall = async () => {
    const res = await API.post("/banquet/halls", newHall);

    if (res.data?.hall) {
      setHalls((prev) => [...prev, res.data.hall]);
    }

    setShowAddHall(false);
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="p-6">

      <h1 className="text-2xl font-bold mb-4">Banquet Management</h1>

      <div className="flex gap-3 mb-4">
        <button
          onClick={() => setShowWizard(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          + New Booking
        </button>

        <button
          onClick={() => setShowAddHall(true)}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          + Add Hall
        </button>
      </div>

      {/* HALL LIST */}

      <div className="grid grid-cols-4 gap-4">
        {halls.map((hall) => (
          <div key={hall.id}>

            <BanquetHallCard
              hall={hall}
              selected={wizard.hallId === hall.id}
              onSelect={() =>
                setWizard((p) => ({
                  ...p,
                  hallId: hall.id,
                }))
              }
            />

            <button
              onClick={() => setDetailHall(hall)}
              className="text-xs text-blue-400 mt-1"
            >
              View Details
            </button>

          </div>
        ))}
      </div>

      {/* BOOKING TABLE */}

      <div className="mt-10">

        <h2 className="text-lg font-bold mb-3">All Bookings</h2>

        <table className="w-full">

          <thead>
            <tr>
              <th>Hall</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {bookings.map((b) => (
              <BanquetBookingRow
                key={b.id}
                booking={b}
                onGenerateBill={() => generateBill(b)}
              />
            ))}
          </tbody>

        </table>

      </div>

      {/* BILL VIEW */}

      {showBill && selectedBooking && (
        <div className="mt-8 border p-5 rounded">

          <BanquetBill
            booking={selectedBooking}
            halls={halls}
            menuPackages={menuPackages}
            formatINR={formatINR}
          />

          <button
            onClick={() => setShowBill(false)}
            className="mt-4 bg-red-500 px-4 py-2 rounded"
          >
            Close
          </button>

        </div>
      )}

      {/* ADD HALL */}

      {showAddHall && (
        <div className="mt-8 border p-5 rounded">

          <h2 className="font-bold mb-3">Add Hall</h2>

          <input
            className={inputCls}
            placeholder="Hall Name"
            onChange={(e) =>
              setNewHall((p) => ({ ...p, name: e.target.value }))
            }
          />

          <button
            onClick={handleAddHall}
            className="mt-3 bg-green-600 px-4 py-2 rounded"
          >
            Add Hall
          </button>

        </div>
      )}

      {/* HALL DETAIL */}

      {detailHall && (
        <div className="mt-8 border p-5 rounded">

          <h2 className="font-bold text-lg">{detailHall.name}</h2>

          <p>Capacity: {detailHall.capacity}</p>
          <p>Rate: ₹{detailHall.ratePerHour}</p>

          <button
            onClick={() => setDetailHall(null)}
            className="mt-3 bg-red-500 px-4 py-2 rounded"
          >
            Close
          </button>

        </div>
      )}

    </div>
  );
};

export default Banquet;