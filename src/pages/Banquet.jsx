import { useEffect, useMemo, useState } from "react";

import BanquetStepper from "../components/Banquet/BanquetStepper";
import BanquetHallCard from "../components/Banquet/BanquetHallCard";
import BanquetBookingRow from "../components/Banquet/BanquetBookingRow";

import API from "../api";

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

/* ---------------- STEPS ---------------- */

const steps = [
  "Select Hall",
  "Event Details",
  "Date & Time",
  "Confirm Booking",
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

/* ---------------- COMPONENT ---------------- */

const Banquet = () => {
  const [halls, setHalls] = useState([]);
  const [bookings, setBookings] = useState([]);

  const [showWizard, setShowWizard] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const [wizard, setWizard] = useState({
    hallId: "",
    customerName: "",
    phone: "",
    eventType: "Wedding",
    guests: 150,
    menuPackageId: "standard",
    decorationFee: 15000,
    date: "",
    startTime: "18:00",
    endTime: "22:00",
  });

  const selectedHall = useMemo(
    () => halls.find((h) => h.id === wizard.hallId),
    [wizard.hallId, halls]
  );

  const wizardHours = useMemo(
    () => hoursBetween(wizard.startTime, wizard.endTime),
    [wizard.startTime, wizard.endTime]
  );

  /* ---------------- LOAD DATA ---------------- */

  useEffect(() => {
    const load = async () => {
      try {
        const res = await API.get("/banquet");

        setHalls(res.data?.halls || []);
        setBookings(res.data?.bookings || []);

      } catch (err) {
        console.log("Banquet load error", err);
      }
    };

    load();
  }, []);

  /* ---------------- BOOKING ---------------- */

  const handleConfirmBooking = async () => {
    if (!selectedHall) {
      alert("Please select hall");
      return;
    }

    try {
      const res = await API.post("/banquet", {
        ...wizard,
        hallId: selectedHall.id,
      });

      const newBooking = {
        ...wizard,
        id: res.data?.id || Date.now(),
        hallName: selectedHall.name,
        status: "Confirmed",
      };

      setBookings((prev) => [newBooking, ...prev]);

      alert("Booking created");

      setShowWizard(false);
      setActiveStep(0);

    } catch (err) {
      console.log(err);
      alert("Error creating booking");
    }
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="p-6">

      <h1 className="text-2xl font-bold mb-4">
        Banquet Management
      </h1>

      <button
        onClick={() => setShowWizard(true)}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg mb-4"
      >
        + New Booking
      </button>

      {/* Wizard */}

      {showWizard && (
        <>
          <BanquetStepper steps={steps} activeStep={activeStep} />

          {/* Step 0 */}
          {activeStep === 0 && (
            <div className="grid grid-cols-3 gap-4 mt-4">
              {halls.map((hall) => (
                <BanquetHallCard
                  key={hall.id}
                  hall={hall}
                  selected={wizard.hallId === hall.id}
                  onSelect={() =>
                    setWizard((p) => ({ ...p, hallId: hall.id }))
                  }
                />
              ))}
            </div>
          )}

          {/* Step 1 */}
          {activeStep === 1 && (
            <div className="mt-4">
              <input
                className="border p-2 mr-2"
                placeholder="Customer Name"
                value={wizard.customerName}
                onChange={(e) =>
                  setWizard((p) => ({
                    ...p,
                    customerName: e.target.value,
                  }))
                }
              />

              <input
                className="border p-2"
                placeholder="Phone"
                value={wizard.phone}
                onChange={(e) =>
                  setWizard((p) => ({
                    ...p,
                    phone: e.target.value,
                  }))
                }
              />
            </div>
          )}

          {/* Step 2 */}
          {activeStep === 2 && (
            <div className="mt-4">
              <input
                type="date"
                className="border p-2 mr-2"
                value={wizard.date}
                onChange={(e) =>
                  setWizard((p) => ({ ...p, date: e.target.value }))
                }
              />

              <input
                type="time"
                className="border p-2 mr-2"
                value={wizard.startTime}
                onChange={(e) =>
                  setWizard((p) => ({
                    ...p,
                    startTime: e.target.value,
                  }))
                }
              />

              <input
                type="time"
                className="border p-2"
                value={wizard.endTime}
                onChange={(e) =>
                  setWizard((p) => ({
                    ...p,
                    endTime: e.target.value,
                  }))
                }
              />

              <p className="mt-2 text-sm">
                Duration: {wizardHours} hr
              </p>
            </div>
          )}

          {/* Step 3 */}
          {activeStep === 3 && (
            <div className="mt-4">
              <p>Hall: {selectedHall?.name}</p>
              <p>Customer: {wizard.customerName}</p>
              <p>Date: {wizard.date}</p>

              <button
                onClick={handleConfirmBooking}
                className="bg-green-600 text-white px-4 py-2 mt-3 rounded"
              >
                Confirm Booking
              </button>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-4 flex gap-3">
            <button
              disabled={activeStep === 0}
              onClick={() => setActiveStep((s) => s - 1)}
              className="bg-gray-600 text-white px-4 py-2 rounded"
            >
              Back
            </button>

            {activeStep < steps.length - 1 && (
              <button
                onClick={() => setActiveStep((s) => s + 1)}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Next
              </button>
            )}
          </div>
        </>
      )}

      {/* BOOKINGS */}

      <div className="mt-10">
        <h2 className="font-bold mb-2">
          All Bookings
        </h2>

        <table className="w-full border">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2">Hall</th>
              <th className="p-2">Customer</th>
              <th className="p-2">Date</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>

          <tbody>
            {bookings.map((b) => (
              <BanquetBookingRow key={b.id} booking={b} />
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default Banquet;