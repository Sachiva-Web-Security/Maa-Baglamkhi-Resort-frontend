import { useEffect, useMemo, useState } from "react";

import BanquetStepper from "../components/Banquet/BanquetStepper";
import BanquetHallCard from "../components/Banquet/BanquetHallCard";
import BanquetBookingRow from "../components/Banquet/BanquetBookingRow";
import BanquetBill from "../components/Banquet/BanquetBill";

import Modal from "../components/Hotel/Modal";
import API, { getBackendBaseURL } from "../api";

/* ------------------- FORMAT ------------------- */

const formatINR = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

/* ------------------- MENU PACKAGES ------------------- */

const menuPackages = [
  { id: "standard", name: "Standard", perGuest: 650 },
  { id: "premium", name: "Premium", perGuest: 950 },
  { id: "royal", name: "Royal", perGuest: 1250 },
];

/* ------------------- STEPS ------------------- */

const steps = [
  "Select Hall",
  "Event Details",
  "Date & Time",
  "Confirm Booking",
  "Event Completed",
  "Generate Bill",
];

/* ------------------- TIME CALCULATION ------------------- */

function hoursBetween(start, end) {
  if (!start || !end) return 0;

  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);

  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;

  const diff = endMin - startMin;

  if (diff <= 0) return 0;

  return Math.max(1, Math.ceil(diff / 60));
}

/* ------------------- INPUT HELPER ------------------- */

const inputCls =
  "w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-100 text-sm focus:outline-none focus:border-blue-500 transition";

const labelCls = "block text-xs font-bold text-gray-300 mb-1";

/* ------------------- COMPONENT ------------------- */

const Banquet = () => {
  const [halls, setHalls] = useState([]);
  const [activeStep, setActiveStep] = useState(0);
  const [showWizard, setShowWizard] = useState(false);

  const [bookings, setBookings] = useState([]);

  const [selectedBooking, setSelectedBooking] = useState(null);

  const [modals, setModals] = useState({
    viewBill: false,
    addHall: false,
    hallDetail: false,
  });

  /* ---- Add Hall Form ---- */
  const [newHall, setNewHall] = useState({
    name: "",
    capacity: "",
    ratePerHour: "",
    is_ac: true,
    imageFile: null,
    imagePreview: null,
  });

  /* ---- Hall Detail View ---- */
  const [detailHall, setDetailHall] = useState(null);

  /* ------------------- FORM DATA ------------------- */

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

  /* ------------------- SELECTED DATA ------------------- */

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

  /* ------------------- BILL CALCULATION ------------------- */

  const wizardTotals = useMemo(() => {
    const hallCharge = selectedHall
      ? selectedHall.ratePerHour * wizardHours
      : 0;

    const foodCharge =
      (Number(wizard.guests) || 0) * (selectedPackage?.perGuest || 0);

    const decoration = Number(wizard.decorationFee) || 0;

    const subTotal = hallCharge + foodCharge + decoration;

    const discount = Math.min(subTotal, Number(wizard.discount) || 0);

    const taxable = subTotal - discount;

    const gst = Math.round((taxable * wizard.gstPercent) / 100);

    const grandTotal = taxable + gst;

    return {
      hallCharge,
      foodCharge,
      decoration,
      subTotal,
      discount,
      gst,
      grandTotal,
    };
  }, [
    selectedHall,
    wizardHours,
    wizard.guests,
    wizard.decorationFee,
    wizard.discount,
    wizard.gstPercent,
    selectedPackage,
  ]);

  /* ------------------- MODAL ------------------- */

  const openModal = (name) =>
    setModals((prev) => ({ ...prev, [name]: true }));

  const closeModal = (name) =>
    setModals((prev) => ({ ...prev, [name]: false }));

  /* ------------------- NAVIGATION ------------------- */

  const canGoNext = () => {
    if (activeStep === 0 && !wizard.hallId) return false;
    if (activeStep === 1 && (!wizard.customerName || !wizard.phone)) return false;
    if (activeStep === 2 && !wizard.date) return false;
    return true;
  };

  const goNext = () => {
    if (!canGoNext()) {
      alert("Please fill all required fields before proceeding.");
      return;
    }
    setActiveStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const goBack = () => {
    setActiveStep((s) => Math.max(s - 1, 0));
  };

  /* ------------------- RESET FORM ------------------- */

  const resetWizard = () => {
    setWizard({
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

    setActiveStep(0);
    setShowWizard(true);
  };

  /* ------------------- LOAD DATA ------------------- */

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await API.get("/banquet");

        if (res.data?.halls) {
          setHalls(res.data.halls);
        }
        if (res.data?.bookings) {
          setBookings(res.data.bookings);
        }
      } catch (err) {
        console.log("Banquet load error", err);
      }
    };

    loadData();
  }, []);

  /* ------------------- CONFIRM BOOKING ------------------- */

  const handleConfirmBooking = async () => {
    if (!selectedHall) return;

    const payload = {
      ...wizard,
      hallId: selectedHall.id,
    };

    try {
      const res = await API.post("/banquet", payload);

      const newBooking = {
        ...payload,
        id: res.data?.id || Date.now(),
        hallName: selectedHall.name,
        status: "Confirmed",
      };

      setBookings((prev) => [newBooking, ...prev]);

      setActiveStep(4);

      alert("✅ Booking Confirmed Successfully!");
    } catch (err) {
      alert("Error creating booking");
    }
  };

  /* ------------------- COMPLETE EVENT ------------------- */

  const markCompleted = async (booking) => {
    try {
      await API.put(`/banquet/${booking.id}/complete`);

      setBookings((prev) =>
        prev.map((b) =>
          b.id === booking.id ? { ...b, status: "Completed" } : b
        )
      );
    } catch (err) {
      alert("Error completing event");
    }
  };

  /* ------------------- GENERATE BILL ------------------- */

  const generateBill = async (booking) => {
    try {
      const res = await API.put(`/banquet/${booking.id}/bill`);

      const updated = {
        ...booking,
        status: "Billed",
        invoiceNo: res.data?.invoiceNo || "INV-" + booking.id,
      };

      setBookings((prev) =>
        prev.map((b) => (b.id === booking.id ? updated : b))
      );

      setSelectedBooking(updated);

      openModal("viewBill");
    } catch (err) {
      alert("Error generating bill");
    }
  };

  /* ------------------- ADD HALL ------------------- */

  const handleAddHall = async () => {
    if (!newHall.name || !newHall.capacity || !newHall.ratePerHour) {
      alert("Please fill Name, Capacity and Rate");
      return;
    }

    const formData = new FormData();
    formData.append("name", newHall.name);
    formData.append("capacity", newHall.capacity);
    formData.append("ratePerHour", newHall.ratePerHour);
    formData.append("is_ac", newHall.is_ac);
    if (newHall.imageFile) {
      formData.append("image", newHall.imageFile);
    }

    try {
      const res = await API.post("/banquet/halls", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const created = res.data?.hall;
      if (created) {
        setHalls((prev) => [...prev, { ...created, ratePerHour: Number(created.ratePerHour) }]);
      }

      setNewHall({ name: "", capacity: "", ratePerHour: "", is_ac: true, imageFile: null, imagePreview: null });
      closeModal("addHall");
      alert("✅ Hall Added!");
    } catch (err) {
      alert("Error adding hall");
    }
  };

  /* ------------------- UI ------------------- */

  return (
    <div className="p-6">

      <h1 className="text-2xl font-bold mb-4">
        Banquet Management
      </h1>

      <div className="flex gap-3 mb-4">
        <button
          onClick={resetWizard}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold transition"
        >
          + New Booking
        </button>
        <button
          onClick={() => openModal("addHall")}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold transition"
        >
          + Add Hall
        </button>
      </div>

      {/* Wizard */}
      {showWizard && (
        <>
          {/* Stepper */}
          <BanquetStepper
            steps={steps}
            activeStep={activeStep}
          />

          {/* ========== Step 0 - Hall Selection ========== */}
          {activeStep === 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-400 mb-3">Click on a hall to select it, or click the image to view details.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {halls.map((hall) => (
                  <div key={hall.id} className="relative">
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
                    {/* View Details Button */}
                    <button
                      className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white text-[10px] font-bold px-2 py-1 rounded-full transition"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailHall(hall);
                        openModal("hallDetail");
                      }}
                    >
                      View Details
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========== Step 1 - Event Details ========== */}
          {activeStep === 1 && (
            <div className="mt-4 max-w-2xl">
              <h2 className="text-lg font-bold text-white mb-4">Event Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Customer Name *</label>
                  <input
                    className={inputCls}
                    value={wizard.customerName}
                    onChange={(e) => setWizard((p) => ({ ...p, customerName: e.target.value }))}
                    placeholder="Enter customer name"
                  />
                </div>
                <div>
                  <label className={labelCls}>Phone *</label>
                  <input
                    className={inputCls}
                    value={wizard.phone}
                    onChange={(e) => setWizard((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <label className={labelCls}>Event Type</label>
                  <select
                    className={inputCls}
                    value={wizard.eventType}
                    onChange={(e) => setWizard((p) => ({ ...p, eventType: e.target.value }))}
                  >
                    <option value="Wedding">Wedding</option>
                    <option value="Birthday">Birthday</option>
                    <option value="Corporate">Corporate</option>
                    <option value="Reception">Reception</option>
                    <option value="Conference">Conference</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Number of Guests</label>
                  <input
                    type="number"
                    className={inputCls}
                    value={wizard.guests}
                    onChange={(e) => setWizard((p) => ({ ...p, guests: e.target.value }))}
                    placeholder="150"
                  />
                </div>
                <div>
                  <label className={labelCls}>Menu Package</label>
                  <select
                    className={inputCls}
                    value={wizard.menuPackageId}
                    onChange={(e) => setWizard((p) => ({ ...p, menuPackageId: e.target.value }))}
                  >
                    {menuPackages.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name} - ₹{pkg.perGuest}/guest
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Decoration Fee (₹)</label>
                  <input
                    type="number"
                    className={inputCls}
                    value={wizard.decorationFee}
                    onChange={(e) => setWizard((p) => ({ ...p, decorationFee: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={labelCls}>Notes</label>
                  <textarea
                    className={inputCls + " h-20 resize-none"}
                    value={wizard.notes}
                    onChange={(e) => setWizard((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="Any special instructions..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========== Step 2 - Date & Time ========== */}
          {activeStep === 2 && (
            <div className="mt-4 max-w-lg">
              <h2 className="text-lg font-bold text-white mb-4">Date & Time</h2>
              <div className="grid gap-4">
                <div>
                  <label className={labelCls}>Event Date *</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={wizard.date}
                    onChange={(e) => setWizard((p) => ({ ...p, date: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Start Time</label>
                    <input
                      type="time"
                      className={inputCls}
                      value={wizard.startTime}
                      onChange={(e) => setWizard((p) => ({ ...p, startTime: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>End Time</label>
                    <input
                      type="time"
                      className={inputCls}
                      value={wizard.endTime}
                      onChange={(e) => setWizard((p) => ({ ...p, endTime: e.target.value }))}
                    />
                  </div>
                </div>
                {wizardHours > 0 && (
                  <p className="text-sm text-gray-400">
                    Duration: <strong className="text-white">{wizardHours} hour(s)</strong>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ========== Step 3 - Confirm Booking ========== */}
          {activeStep === 3 && (
            <div className="mt-4 max-w-2xl">
              <h2 className="text-lg font-bold text-white mb-4">Confirm Booking</h2>

              <div className="border border-white/10 rounded-xl p-5 bg-white/3 space-y-3">
                {/* Summary */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-400">Hall:</span>{" "}
                    <span className="text-white font-bold">{selectedHall?.name || "-"}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Customer:</span>{" "}
                    <span className="text-white font-bold">{wizard.customerName}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Phone:</span>{" "}
                    <span className="text-white">{wizard.phone}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Event:</span>{" "}
                    <span className="text-white">{wizard.eventType}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Date:</span>{" "}
                    <span className="text-white font-bold">{wizard.date || "-"}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Time:</span>{" "}
                    <span className="text-white">{wizard.startTime} - {wizard.endTime} ({wizardHours}hr)</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Guests:</span>{" "}
                    <span className="text-white">{wizard.guests}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Package:</span>{" "}
                    <span className="text-white">{selectedPackage?.name || "-"}</span>
                  </div>
                </div>

                {/* Charges */}
                <hr className="border-white/10" />
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-gray-400">Hall Charge:</span>
                  <span className="text-white text-right">{formatINR(wizardTotals.hallCharge)}</span>

                  <span className="text-gray-400">Food Charge:</span>
                  <span className="text-white text-right">{formatINR(wizardTotals.foodCharge)}</span>

                  <span className="text-gray-400">Decoration:</span>
                  <span className="text-white text-right">{formatINR(wizardTotals.decoration)}</span>

                  <span className="text-gray-400 font-bold">Sub Total:</span>
                  <span className="text-white text-right font-bold">{formatINR(wizardTotals.subTotal)}</span>
                </div>

                {/* Discount */}
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <label className={labelCls}>Discount (₹)</label>
                    <input
                      type="number"
                      className={inputCls}
                      value={wizard.discount}
                      onChange={(e) => setWizard((p) => ({ ...p, discount: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>GST %</label>
                    <input
                      type="number"
                      className={inputCls}
                      value={wizard.gstPercent}
                      onChange={(e) => setWizard((p) => ({ ...p, gstPercent: e.target.value }))}
                    />
                  </div>
                </div>

                <hr className="border-white/10" />
                <div className="flex justify-between text-lg font-black">
                  <span className="text-white">Grand Total</span>
                  <span className="text-green-400">{formatINR(wizardTotals.grandTotal)}</span>
                </div>

                <button
                  onClick={handleConfirmBooking}
                  className="w-full mt-3 bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl font-bold text-sm transition"
                >
                  ✅ Confirm Booking
                </button>
              </div>
            </div>
          )}

          {/* ========== Step 4 - Event Completed ========== */}
          {activeStep === 4 && (
            <div className="mt-4 max-w-lg text-center py-10">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-xl font-bold text-white mb-2">Booking Confirmed!</h2>
              <p className="text-gray-400 text-sm mb-6">
                The event booking has been confirmed. You can mark it completed once the event is done.
              </p>
              <button
                onClick={() => { setShowWizard(false); }}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold transition"
              >
                Go to Bookings
              </button>
            </div>
          )}

          {/* ========== Step 5 - Generate Bill ========== */}
          {activeStep === 5 && (
            <div className="mt-4 max-w-lg text-center py-10">
              <div className="text-5xl mb-4">🧾</div>
              <h2 className="text-xl font-bold text-white mb-2">Generate Bill</h2>
              <p className="text-gray-400 text-sm mb-6">
                Select a booking from the table below and click "Generate Bill".
              </p>
              <button
                onClick={() => { setShowWizard(false); }}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold transition"
              >
                Go to Bookings
              </button>
            </div>
          )}

          {/* Navigation */}
          {activeStep < 4 && (
            <div className="mt-6 flex gap-3">
              <button
                onClick={goBack}
                disabled={activeStep === 0}
                className="px-4 py-2 bg-gray-600 disabled:opacity-40 text-white rounded-lg font-bold transition hover:bg-gray-500"
              >
                ← Back
              </button>
              {activeStep < 3 && (
                <button
                  onClick={goNext}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold transition hover:bg-blue-500"
                >
                  Next →
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* Booking Table */}
      <div className="mt-10">
        <h2 className="text-lg font-bold text-white mb-3">All Bookings</h2>
        <div className="overflow-x-auto">
          <table className="w-full border border-white/5 rounded-xl overflow-hidden">
            <thead className="bg-white/5">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-300">Hall</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-300">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-300">Event</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-300">Date</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-300">Time</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-300">Status</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-300">Action</th>
              </tr>
            </thead>

            <tbody>
              {bookings.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-500 text-sm">
                    No bookings yet
                  </td>
                </tr>
              )}
              {bookings.map((b) => (
                <BanquetBookingRow
                  key={b.id}
                  booking={b}
                  onComplete={() => markCompleted(b)}
                  onGenerateBill={() => generateBill(b)}
                  onView={() => {
                    setSelectedBooking(b);
                    openModal("viewBill");
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================== BILL MODAL ================== */}
      <Modal
        isOpen={modals.viewBill}
        onClose={() => closeModal("viewBill")}
        title="Banquet Invoice"
      >
        {selectedBooking && (
          <BanquetBill
            booking={selectedBooking}
            halls={halls}
            menuPackages={menuPackages}
            formatINR={formatINR}
          />
        )}
      </Modal>

      {/* ================== ADD HALL MODAL ================== */}
      <Modal
        isOpen={modals.addHall}
        onClose={() => closeModal("addHall")}
        title="Add New Hall"
      >
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Hall Name *</label>
            <input
              className={inputCls}
              value={newHall.name}
              onChange={(e) => setNewHall((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Grand Ballroom"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Capacity *</label>
              <input
                type="number"
                className={inputCls}
                value={newHall.capacity}
                onChange={(e) => setNewHall((p) => ({ ...p, capacity: e.target.value }))}
                placeholder="e.g. 500"
              />
            </div>
            <div>
              <label className={labelCls}>Rate per Hour (₹) *</label>
              <input
                type="number"
                className={inputCls}
                value={newHall.ratePerHour}
                onChange={(e) => setNewHall((p) => ({ ...p, ratePerHour: e.target.value }))}
                placeholder="e.g. 12000"
              />
            </div>
          </div>

          {/* AC / Non-AC */}
          <div>
            <label className={labelCls}>AC Type</label>
            <div className="flex gap-4 mt-1">
              <label className="flex items-center gap-2 text-sm text-gray-200 cursor-pointer">
                <input
                  type="radio"
                  name="is_ac"
                  checked={newHall.is_ac === true}
                  onChange={() => setNewHall((p) => ({ ...p, is_ac: true }))}
                  className="accent-blue-500"
                />
                ❄️ AC
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-200 cursor-pointer">
                <input
                  type="radio"
                  name="is_ac"
                  checked={newHall.is_ac === false}
                  onChange={() => setNewHall((p) => ({ ...p, is_ac: false }))}
                  className="accent-blue-500"
                />
                🌀 Non-AC
              </label>
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className={labelCls}>Hall Image</label>
            <input
              type="file"
              accept="image/*"
              className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  setNewHall((p) => ({
                    ...p,
                    imageFile: file,
                    imagePreview: URL.createObjectURL(file),
                  }));
                }
              }}
            />
            {newHall.imagePreview && (
              <img
                src={newHall.imagePreview}
                alt="Preview"
                className="mt-3 w-full h-40 object-cover rounded-lg border border-white/10"
              />
            )}
          </div>

          <button
            onClick={handleAddHall}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl font-bold transition"
          >
            ✅ Add Hall
          </button>
        </div>
      </Modal>

      {/* ================== HALL DETAIL MODAL ================== */}
      <Modal
        isOpen={modals.hallDetail}
        onClose={() => closeModal("hallDetail")}
        title={detailHall?.name || "Hall Details"}
      >
        {detailHall && (
          <div className="space-y-4">
            {detailHall.image ? (
              <img
                src={`${getBackendBaseURL()}/uploads/${detailHall.image}`}
                alt={detailHall.name}
                className="w-full h-48 object-cover rounded-xl"
              />
            ) : (
              <div className="w-full h-48 bg-gradient-to-br from-blue-900/40 to-slate-800 flex items-center justify-center rounded-xl">
                <span className="text-5xl">🏛️</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-400">Name:</span>
                <p className="text-white font-bold">{detailHall.name}</p>
              </div>
              <div>
                <span className="text-gray-400">Capacity:</span>
                <p className="text-white font-bold">{detailHall.capacity} guests</p>
              </div>
              <div>
                <span className="text-gray-400">Rate:</span>
                <p className="text-white font-bold">₹{detailHall.ratePerHour}/hr</p>
              </div>
              <div>
                <span className="text-gray-400">Type:</span>
                <p className="text-white font-bold">{detailHall.is_ac ? '❄️ AC' : '🌀 Non-AC'}</p>
              </div>
              <div>
                <span className="text-gray-400">Status:</span>
                <p className={`font-bold ${detailHall.status === 'Available' ? 'text-green-400' : 'text-red-400'}`}>
                  {detailHall.status}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setWizard((p) => ({ ...p, hallId: detailHall.id }));
                closeModal("hallDetail");
              }}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl font-bold transition"
            >
              Book this Hall
            </button>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default Banquet;