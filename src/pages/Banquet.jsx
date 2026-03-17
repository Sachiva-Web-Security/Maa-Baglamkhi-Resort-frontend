import { useEffect, useMemo, useState } from "react";
import {
  FaBell,
  FaCalendarAlt,
  FaEnvelope,
  FaGlassCheers,
  FaHeadset,
  FaLightbulb,
  FaMoneyCheckAlt,
  FaPaperPlane,
  FaPlus,
  FaUtensils,
  FaUsers,
  FaWhatsapp,
} from "react-icons/fa";

import BanquetHallCard from "../components/Banquet/BanquetHallCard";
import BanquetBookingRow from "../components/Banquet/BanquetBookingRow";
import BanquetBill from "../components/Banquet/BanquetBill";
import API from "../api";

const formatINR = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

const menuPackages = [
  {
    id: "standard",
    name: "Standard Celebration",
    perGuest: 650,
    mealLabel: "Veg buffet + snacks",
  },
  {
    id: "premium",
    name: "Premium Feast",
    perGuest: 950,
    mealLabel: "Veg + live counter",
  },
  {
    id: "royal",
    name: "Royal Signature",
    perGuest: 1250,
    mealLabel: "Full event dining experience",
  },
];

const lightingOptions = [
  { id: "classic", label: "Classic", price: 8000 },
  { id: "stage", label: "Stage Focus", price: 15000 },
  { id: "premium", label: "Premium Intelligent", price: 28000 },
];

const mealSections = [
  "Welcome Drinks",
  "Starters",
  "Main Course",
  "Live Counter",
  "Desserts",
];

const quickSections = [
  {
    id: "halls",
    label: "Banquet Halls",
    icon: FaGlassCheers,
    desc: "Capacity and venue overview",
  },
  {
    id: "addons",
    label: "Banquet Addons",
    icon: FaLightbulb,
    desc: "Decor, AV and event support",
  },
  {
    id: "meals",
    label: "Meal Menus",
    icon: FaUtensils,
    desc: "Event meal planning",
  },
  {
    id: "reservations",
    label: "Reservations",
    icon: FaCalendarAlt,
    desc: "Create and manage bookings",
  },
  {
    id: "settlement",
    label: "Settlement Report",
    icon: FaMoneyCheckAlt,
    desc: "Revenue snapshot and bill actions",
  },
];

const defaultWizard = {
  hallId: "",
  customerName: "",
  phone: "",
  guestEmail: "",
  eventTitle: "",
  eventType: "Wedding",
  guests: 150,
  menuPackageId: "standard",
  mealSection: "Main Course",
  customMenuItems: "",
  lightingSystem: "classic",
  decorationFee: 15000,
  notes: "",
  date: "",
  startTime: "18:00",
  endTime: "22:00",
  discount: 0,
  gstPercent: 5,
};

const defaultHall = {
  name: "",
  capacity: "",
  ratePerHour: "",
  is_ac: true,
};

const inputCls =
  "w-full rounded-2xl border border-slate-200/80 bg-white/88 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100";

const labelCls =
  "mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500";

function hoursBetween(start, end) {
  if (!start || !end) return 0;

  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const diff = eh * 60 + em - (sh * 60 + sm);

  if (diff <= 0) return 0;

  return Math.max(1, Math.ceil(diff / 60));
}

function buildNotesPayload(notes, meta) {
  return `${notes?.trim() || ""}\n[[BNQ_META]]${JSON.stringify(meta)}[[/BNQ_META]]`.trim();
}

function extractMeta(notes = "") {
  const match = notes.match(/\[\[BNQ_META\]\](.*?)\[\[\/BNQ_META\]\]/);

  if (!match?.[1]) return {};

  try {
    return JSON.parse(match[1]);
  } catch {
    return {};
  }
}

function stripMeta(notes = "") {
  return notes.replace(/\s*\[\[BNQ_META\]\].*?\[\[\/BNQ_META\]\]/, "").trim();
}

function normalizeBooking(raw) {
  const meta = extractMeta(raw.notes || "");

  return {
    ...raw,
    hallId: raw.hallId || raw.hall_id,
    customerName: raw.customerName || raw.customer_name,
    phone: raw.phone || meta.phone || "",
    eventType: raw.eventType || raw.event_type || "Event",
    guests: Number(raw.guests || 0),
    menuPackageId: raw.menuPackageId || raw.menu_package_id || "standard",
    decorationFee: Number(raw.decorationFee || raw.decoration_fee || 0),
    date: raw.date ? String(raw.date).slice(0, 10) : "",
    startTime: raw.startTime || raw.start_time || "",
    endTime: raw.endTime || raw.end_time || "",
    discount: Number(raw.discount || 0),
    gstPercent: Number(raw.gstPercent || raw.gst_percent || 5),
    invoiceNo: raw.invoiceNo || raw.invoice_no || "",
    guestEmail: meta.guestEmail || "",
    eventTitle: meta.eventTitle || "",
    mealSection: meta.mealSection || "",
    customMenuItems: meta.customMenuItems || "",
    lightingSystem: meta.lightingSystem || "",
    notes: stripMeta(raw.notes || ""),
  };
}

const Banquet = () => {
  const [halls, setHalls] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [showAddHall, setShowAddHall] = useState(false);
  const [detailHall, setDetailHall] = useState(null);
  const [showBill, setShowBill] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [wizard, setWizard] = useState(defaultWizard);
  const [newHall, setNewHall] = useState(defaultHall);

  const selectedHall = useMemo(
    () => halls.find((hall) => String(hall.id) === String(wizard.hallId)),
    [halls, wizard.hallId]
  );

  const selectedPackage = useMemo(
    () => menuPackages.find((pkg) => pkg.id === wizard.menuPackageId),
    [wizard.menuPackageId]
  );

  const selectedLighting = useMemo(
    () => lightingOptions.find((option) => option.id === wizard.lightingSystem),
    [wizard.lightingSystem]
  );

  const wizardHours = useMemo(
    () => hoursBetween(wizard.startTime, wizard.endTime),
    [wizard.startTime, wizard.endTime]
  );

  const wizardTotals = useMemo(() => {
    const hallCharge = (selectedHall?.ratePerHour || 0) * wizardHours;
    const mealCharge =
      (Number(wizard.guests) || 0) * (selectedPackage?.perGuest || 0);
    const lightingCharge = selectedLighting?.price || 0;
    const decorationCharge = Number(wizard.decorationFee) || 0;
    const subtotal =
      hallCharge + mealCharge + lightingCharge + decorationCharge;
    const discount = Math.min(subtotal, Number(wizard.discount) || 0);
    const taxable = subtotal - discount;
    const gst = Math.round((taxable * (Number(wizard.gstPercent) || 0)) / 100);

    return {
      hallCharge,
      mealCharge,
      lightingCharge,
      decorationCharge,
      subtotal,
      gst,
      grandTotal: taxable + gst,
    };
  }, [selectedHall, selectedLighting, selectedPackage, wizard, wizardHours]);

  const stats = useMemo(() => {
    const expectedRevenue = bookings.reduce((sum, booking) => {
      const hall = halls.find((item) => String(item.id) === String(booking.hallId));
      const menu = menuPackages.find((item) => item.id === booking.menuPackageId);
      const lighting = lightingOptions.find(
        (item) => item.id === booking.lightingSystem
      );

      const total =
        (hall?.ratePerHour || 0) *
          hoursBetween(booking.startTime, booking.endTime) +
        (menu?.perGuest || 0) * (Number(booking.guests) || 0) +
        (Number(booking.decorationFee) || 0) +
        (lighting?.price || 0);

      return sum + total;
    }, 0);

    return [
      { label: "Active reservations", value: String(bookings.length) },
      { label: "Banquet halls", value: String(halls.length) },
      { label: "Expected revenue", value: formatINR(expectedRevenue) },
    ];
  }, [bookings, halls]);

  useEffect(() => {
    const load = async () => {
      const res = await API.get("/banquet");
      setHalls(res.data?.halls || []);
      setBookings((res.data?.bookings || []).map(normalizeBooking));
    };

    load();
  }, []);

  const resetWizard = () => {
    setWizard(defaultWizard);
    setShowReservationForm(false);
  };

  const handleConfirmBooking = async () => {
    const reservationMeta = {
      guestEmail: wizard.guestEmail,
      eventTitle: wizard.eventTitle,
      mealSection: wizard.mealSection,
      customMenuItems: wizard.customMenuItems,
      lightingSystem: wizard.lightingSystem,
      phone: wizard.phone,
    };

    const payload = {
      ...wizard,
      notes: buildNotesPayload(wizard.notes, reservationMeta),
    };

    const res = await API.post("/banquet", payload);
    const newBooking = normalizeBooking({
      ...payload,
      id: res.data?.id || Date.now(),
      hallName: selectedHall?.name || "Banquet Hall",
      status: "Confirmed",
      invoiceNo: "",
    });

    setBookings((prev) => [newBooking, ...prev]);
    resetWizard();
  };

  const handleCompleteBooking = async (bookingId) => {
    await API.put(`/banquet/${bookingId}/complete`);

    setBookings((prev) =>
      prev.map((booking) =>
        booking.id === bookingId ? { ...booking, status: "Completed" } : booking
      )
    );
  };

  const handleGenerateBill = async (booking) => {
    const invoiceNo =
      booking.invoiceNo || `BNQ-${String(booking.id).padStart(6, "0")}`;

    await API.put(`/banquet/${booking.id}/bill`, { invoiceNo });

    const updatedBooking = { ...booking, invoiceNo, status: "Billed" };

    setBookings((prev) =>
      prev.map((item) => (item.id === booking.id ? updatedBooking : item))
    );
    setSelectedBooking(updatedBooking);
    setShowBill(true);
  };

  const handleSendQuotation = (booking, type) => {
    const hall = halls.find((item) => String(item.id) === String(booking.hallId));
    const pkg = menuPackages.find((item) => item.id === booking.menuPackageId);
    const lighting = lightingOptions.find(
      (item) => item.id === booking.lightingSystem
    );

    const subtotal =
      (hall?.ratePerHour || 0) * hoursBetween(booking.startTime, booking.endTime) +
      (pkg?.perGuest || 0) * (Number(booking.guests) || 0) +
      (Number(booking.decorationFee) || 0) +
      (lighting?.price || 0);

    const quoteLines = [
      `Banquet quotation for ${booking.customerName}`,
      `Hall: ${booking.hallName}`,
      `Event: ${booking.eventTitle || booking.eventType}`,
      `Date: ${booking.date}`,
      `Time: ${booking.startTime} - ${booking.endTime}`,
      `Guests: ${booking.guests}`,
      `Meal: ${pkg?.name || booking.menuPackageId} / ${
        booking.mealSection || "Meal plan"
      }`,
      `Menu items: ${booking.customMenuItems || "As discussed"}`,
      `Lighting: ${lighting?.label || "Standard"}`,
      `Estimated amount: ${formatINR(subtotal)}`,
    ];

    const message = encodeURIComponent(quoteLines.join("\n"));

    if (type === "email") {
      const subject = encodeURIComponent(
        `Banquet quotation - ${booking.eventTitle || booking.eventType}`
      );
      const email = booking.guestEmail || "";
      window.open(`mailto:${email}?subject=${subject}&body=${message}`, "_self");
      return;
    }

    const whatsappNumber = String(booking.phone || "").replace(/\D/g, "");
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, "_blank");
  };

  const handleAddHall = async () => {
    const res = await API.post("/banquet/halls", {
      ...newHall,
      capacity: Number(newHall.capacity),
      ratePerHour: Number(newHall.ratePerHour),
    });

    if (res.data?.hall) {
      setHalls((prev) => [...prev, res.data.hall]);
    }

    setNewHall(defaultHall);
    setShowAddHall(false);
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[linear-gradient(135deg,#f5fbff_0%,#f3f8f4_28%,#fff8f1_58%,#f8fafc_100%)] p-4 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-8%] top-[-6%] h-72 w-72 rounded-full bg-cyan-200/45 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute right-[-10%] top-[8%] h-72 w-72 rounded-full bg-amber-200/45 blur-3xl sm:h-[28rem] sm:w-[28rem]" />
        <div className="absolute bottom-[18%] left-[18%] h-56 w-56 rounded-full bg-emerald-200/30 blur-3xl sm:h-80 sm:w-80" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.55)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.45)_1px,transparent_1px)] bg-[size:72px_72px] opacity-25" />
      </div>

      <div className="mx-auto max-w-[1260px] space-y-7">
        <section className="overflow-hidden rounded-[28px] border border-slate-900/10 bg-[linear-gradient(120deg,#071b34_0%,#0d4a53_52%,#162d45_100%)] px-5 py-6 shadow-[0_22px_55px_rgba(15,23,42,0.12)] sm:px-7 sm:py-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)] lg:items-center">
            <div className="space-y-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-cyan-200">
                Banquet Control Panel
              </p>
              <div className="space-y-2">
                <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl">
                  Attractive banquet dashboard with smarter reservations
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-slate-100/85 sm:text-base">
                  Add reservations from one clean form, attach lighting and meal
                  plans, and send guest quotation instantly by email or WhatsApp.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setShowReservationForm(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-[0_16px_35px_rgba(255,255,255,0.15)] transition hover:-translate-y-0.5"
                >
                  <FaPlus className="text-cyan-600" />
                  Add New Reservation
                </button>
                <button
                  type="button"
                  onClick={() =>
                    document
                      .getElementById("reservation-section")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                  className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-md"
                >
                  Go to Reservations
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {stats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[22px] border border-white/12 bg-white/10 px-4 py-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md"
                >
                  <span className="text-[11px] text-slate-100/75">{item.label}</span>
                  <div className="mt-3 text-2xl font-bold leading-none">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-[26px] border border-white/60 bg-white/76 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <div className="mb-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
                Banquet Menu
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">
                Quick sections
              </h2>
            </div>
            <div className="space-y-2">
              {quickSections.map((section) => {
                const Icon = section.icon;

                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() =>
                      document
                        .getElementById(section.id)
                        ?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }
                    className="flex w-full items-start gap-3 rounded-[20px] border border-slate-200/80 bg-white px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-cyan-300"
                  >
                    <span className="mt-0.5 rounded-2xl bg-cyan-50 p-2 text-cyan-700">
                      <Icon />
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-slate-900">
                        {section.label}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {section.desc}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="space-y-4">
            <section
              id="halls"
              className="rounded-[26px] border border-white/60 bg-white/78 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5"
            >
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
                    Venue Options
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-slate-900">
                    Banquet halls
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddHall(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-teal-600 to-emerald-500 px-4 py-2.5 text-sm font-bold text-white shadow-[0_12px_30px_rgba(13,148,136,0.24)] transition hover:-translate-y-0.5"
                >
                  <FaPlus />
                  Add Hall
                </button>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {halls.map((hall) => (
                  <div key={hall.id} className="space-y-2">
                    <BanquetHallCard
                      hall={hall}
                      selected={String(wizard.hallId) === String(hall.id)}
                      onSelect={() =>
                        setWizard((prev) => ({
                          ...prev,
                          hallId: hall.id,
                        }))
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setDetailHall(hall)}
                      className="text-xs font-semibold text-cyan-700 transition hover:text-cyan-900"
                    >
                      View hall details
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section
              id="addons"
              className="grid gap-4 rounded-[26px] border border-white/60 bg-white/78 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl md:grid-cols-3 sm:p-5"
            >
              {[
                {
                  icon: FaLightbulb,
                  title: "Lighting system",
                  value: "Classic to intelligent stage setup",
                  info: lightingOptions
                    .map((item) => `${item.label} ${formatINR(item.price)}`)
                    .join(" | "),
                },
                {
                  icon: FaHeadset,
                  title: "Event support",
                  value: "DJ desk, sound, mic and service staff",
                  info: "Add notes in reservation form for stage, music and host setup.",
                },
                {
                  icon: FaBell,
                  title: "Decor and service",
                  value: "Decoration, floral gate and welcome desk",
                  info: "Decoration fee is already included inside the reservation form.",
                },
              ].map((card) => {
                const Icon = card.icon;

                return (
                  <div
                    key={card.title}
                    className="rounded-[22px] border border-slate-200/80 bg-white p-5"
                  >
                    <div className="mb-4 inline-flex rounded-2xl bg-amber-50 p-3 text-amber-600">
                      <Icon />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {card.title}
                    </h3>
                    <p className="mt-2 text-sm font-medium text-slate-700">
                      {card.value}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      {card.info}
                    </p>
                  </div>
                );
              })}
            </section>

            <section
              id="meals"
              className="rounded-[26px] border border-white/60 bg-white/78 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5"
            >
              <div className="mb-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
                  Event Dining
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  Meal menu section
                </h2>
              </div>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="grid gap-4 md:grid-cols-3">
                  {menuPackages.map((menu) => (
                    <div
                      key={menu.id}
                      className="rounded-[22px] border border-slate-200/80 bg-white p-5"
                    >
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-600">
                        {menu.name}
                      </div>
                      <div className="mt-3 text-2xl font-black text-slate-900">
                        {formatINR(menu.perGuest)}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">Per guest</div>
                      <p className="mt-4 text-sm leading-6 text-slate-600">
                        {menu.mealLabel}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="rounded-[22px] border border-slate-200/80 bg-[linear-gradient(180deg,#f9fdff_0%,#ffffff_100%)] p-5">
                  <div className="text-sm font-bold text-slate-900">
                    Meal sections for events
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {mealSections.map((section) => (
                      <span
                        key={section}
                        className="rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700"
                      >
                        {section}
                      </span>
                    ))}
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-500">
                    Reservation form mein meal section aur custom menu items dono
                    fields diye gaye hain, jisse event-wise food planning easy ho.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </section>

        <section
          id="reservations"
          className="rounded-[26px] border border-white/60 bg-white/80 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5"
        >
          <div
            id="reservation-section"
            className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
          >
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
                Reservation Dashboard
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">
                Manage banquet reservations
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Add new booking, generate bill, and send quotation from one
                place.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowReservationForm(true)}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-600 to-cyan-500 px-4 py-2.5 text-sm font-bold text-white shadow-[0_12px_30px_rgba(14,165,233,0.24)] transition hover:-translate-y-0.5"
            >
              <FaPlus />
              Add New
            </button>
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <table className="min-w-full overflow-hidden rounded-[22px] border border-slate-200/80 bg-white">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-4 py-4">Hall</th>
                  <th className="px-4 py-4">Guest</th>
                  <th className="px-4 py-4">Event</th>
                  <th className="px-4 py-4">Date</th>
                  <th className="px-4 py-4">Time</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <BanquetBookingRow
                    key={booking.id}
                    booking={booking}
                    onComplete={() => handleCompleteBooking(booking.id)}
                    onGenerateBill={() => handleGenerateBill(booking)}
                    onView={() => {
                      setSelectedBooking(booking);
                      setShowBill(true);
                    }}
                    onSendEmail={() => handleSendQuotation(booking, "email")}
                    onSendWhatsApp={() =>
                      handleSendQuotation(booking, "whatsapp")
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 lg:hidden">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-bold text-slate-900">
                      {booking.hallName}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {booking.customerName} •{" "}
                      {booking.eventTitle || booking.eventType}
                    </div>
                  </div>
                  <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                    {booking.status}
                  </span>
                </div>
                <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                  <div>Date: {booking.date}</div>
                  <div>
                    Time: {booking.startTime} - {booking.endTime}
                  </div>
                  <div>Guests: {booking.guests}</div>
                  <div>Meal: {booking.mealSection || "Planned"}</div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {booking.status === "Confirmed" && (
                    <button
                      type="button"
                      onClick={() => handleCompleteBooking(booking.id)}
                      className="rounded-full bg-amber-500 px-3 py-2 text-xs font-bold text-white"
                    >
                      Mark Completed
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleGenerateBill(booking)}
                    className="rounded-full bg-emerald-600 px-3 py-2 text-xs font-bold text-white"
                  >
                    Generate Bill
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendQuotation(booking, "email")}
                    className="rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"
                  >
                    Email Quote
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendQuotation(booking, "whatsapp")}
                    className="rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"
                  >
                    WhatsApp Quote
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          id="settlement"
          className="rounded-[26px] border border-white/60 bg-white/80 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5"
        >
          <div className="mb-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
              Settlement Report
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">
              Reservation pricing preview
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { label: "Hall amount", value: formatINR(wizardTotals.hallCharge) },
              { label: "Meal amount", value: formatINR(wizardTotals.mealCharge) },
              {
                label: "Lighting setup",
                value: formatINR(wizardTotals.lightingCharge),
              },
              {
                label: "Estimated total",
                value: formatINR(wizardTotals.grandTotal),
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[22px] border border-slate-200/80 bg-white p-5"
              >
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {item.label}
                </div>
                <div className="mt-3 text-2xl font-black text-slate-900">
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {showReservationForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[30px] border border-white/50 bg-[linear-gradient(180deg,#fafdff_0%,#f8fbff_100%)] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.25)] sm:p-7">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
                  Reservation Form
                </p>
                <h3 className="mt-1 text-2xl font-black text-slate-900">
                  Add banquet reservation
                </h3>
              </div>
              <button
                type="button"
                onClick={resetWizard}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Close
              </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_340px]">
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className={labelCls}>Banquet Hall</label>
                    <select
                      value={wizard.hallId}
                      onChange={(e) =>
                        setWizard((prev) => ({ ...prev, hallId: e.target.value }))
                      }
                      className={inputCls}
                    >
                      <option value="">Select hall</option>
                      {halls.map((hall) => (
                        <option key={hall.id} value={hall.id}>
                          {hall.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Event Type</label>
                    <select
                      value={wizard.eventType}
                      onChange={(e) =>
                        setWizard((prev) => ({
                          ...prev,
                          eventType: e.target.value,
                        }))
                      }
                      className={inputCls}
                    >
                      <option>Wedding</option>
                      <option>Engagement</option>
                      <option>Birthday</option>
                      <option>Corporate</option>
                      <option>Reception</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Guest Name</label>
                    <input
                      value={wizard.customerName}
                      onChange={(e) =>
                        setWizard((prev) => ({
                          ...prev,
                          customerName: e.target.value,
                        }))
                      }
                      className={inputCls}
                      placeholder="Enter guest name"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Event Title</label>
                    <input
                      value={wizard.eventTitle}
                      onChange={(e) =>
                        setWizard((prev) => ({
                          ...prev,
                          eventTitle: e.target.value,
                        }))
                      }
                      className={inputCls}
                      placeholder="Sangeet Night, Corporate Meet..."
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Phone / WhatsApp</label>
                    <input
                      value={wizard.phone}
                      onChange={(e) =>
                        setWizard((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      className={inputCls}
                      placeholder="Enter mobile number"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Guest Email</label>
                    <input
                      type="email"
                      value={wizard.guestEmail}
                      onChange={(e) =>
                        setWizard((prev) => ({
                          ...prev,
                          guestEmail: e.target.value,
                        }))
                      }
                      className={inputCls}
                      placeholder="guest@email.com"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Date</label>
                    <input
                      type="date"
                      value={wizard.date}
                      onChange={(e) =>
                        setWizard((prev) => ({ ...prev, date: e.target.value }))
                      }
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Guests</label>
                    <input
                      type="number"
                      min="1"
                      value={wizard.guests}
                      onChange={(e) =>
                        setWizard((prev) => ({ ...prev, guests: e.target.value }))
                      }
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Start Time</label>
                    <input
                      type="time"
                      value={wizard.startTime}
                      onChange={(e) =>
                        setWizard((prev) => ({
                          ...prev,
                          startTime: e.target.value,
                        }))
                      }
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>End Time</label>
                    <input
                      type="time"
                      value={wizard.endTime}
                      onChange={(e) =>
                        setWizard((prev) => ({ ...prev, endTime: e.target.value }))
                      }
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className={labelCls}>Menu Package</label>
                    <select
                      value={wizard.menuPackageId}
                      onChange={(e) =>
                        setWizard((prev) => ({
                          ...prev,
                          menuPackageId: e.target.value,
                        }))
                      }
                      className={inputCls}
                    >
                      {menuPackages.map((pkg) => (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.name} - {formatINR(pkg.perGuest)}/guest
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Meal Section</label>
                    <select
                      value={wizard.mealSection}
                      onChange={(e) =>
                        setWizard((prev) => ({
                          ...prev,
                          mealSection: e.target.value,
                        }))
                      }
                      className={inputCls}
                    >
                      {mealSections.map((section) => (
                        <option key={section} value={section}>
                          {section}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Lighting System</label>
                    <select
                      value={wizard.lightingSystem}
                      onChange={(e) =>
                        setWizard((prev) => ({
                          ...prev,
                          lightingSystem: e.target.value,
                        }))
                      }
                      className={inputCls}
                    >
                      {lightingOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label} - {formatINR(option.price)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Decoration Fee</label>
                    <input
                      type="number"
                      min="0"
                      value={wizard.decorationFee}
                      onChange={(e) =>
                        setWizard((prev) => ({
                          ...prev,
                          decorationFee: e.target.value,
                        }))
                      }
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Discount</label>
                    <input
                      type="number"
                      min="0"
                      value={wizard.discount}
                      onChange={(e) =>
                        setWizard((prev) => ({
                          ...prev,
                          discount: e.target.value,
                        }))
                      }
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>GST %</label>
                    <input
                      type="number"
                      min="0"
                      value={wizard.gstPercent}
                      onChange={(e) =>
                        setWizard((prev) => ({
                          ...prev,
                          gstPercent: e.target.value,
                        }))
                      }
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Custom Menu Items</label>
                  <textarea
                    rows="3"
                    value={wizard.customMenuItems}
                    onChange={(e) =>
                      setWizard((prev) => ({
                        ...prev,
                        customMenuItems: e.target.value,
                      }))
                    }
                    className={inputCls}
                    placeholder="Paneer tikka, dal makhani, naan, gulab jamun..."
                  />
                </div>

                <div>
                  <label className={labelCls}>Notes</label>
                  <textarea
                    rows="3"
                    value={wizard.notes}
                    onChange={(e) =>
                      setWizard((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    className={inputCls}
                    placeholder="Special stage, family table, projector requirement..."
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-sm">
                  <div className="text-sm font-bold text-slate-900">
                    Reservation summary
                  </div>
                  <div className="mt-4 space-y-3 text-sm text-slate-600">
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2">
                        <FaGlassCheers className="text-cyan-600" />
                        Hall charge
                      </span>
                      <span className="font-semibold text-slate-900">
                        {formatINR(wizardTotals.hallCharge)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2">
                        <FaUtensils className="text-cyan-600" />
                        Meal plan
                      </span>
                      <span className="font-semibold text-slate-900">
                        {formatINR(wizardTotals.mealCharge)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2">
                        <FaLightbulb className="text-cyan-600" />
                        Lighting
                      </span>
                      <span className="font-semibold text-slate-900">
                        {formatINR(wizardTotals.lightingCharge)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2">
                        <FaUsers className="text-cyan-600" />
                        Guests
                      </span>
                      <span className="font-semibold text-slate-900">
                        {wizard.guests || 0}
                      </span>
                    </div>
                  </div>
                  <div className="mt-5 rounded-[20px] bg-slate-950 px-4 py-4 text-white">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-300">
                      Estimated total
                    </div>
                    <div className="mt-2 text-3xl font-black">
                      {formatINR(wizardTotals.grandTotal)}
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-sm">
                  <div className="text-sm font-bold text-slate-900">
                    After booking
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    Booking dashboard se guest ko quotation email ya WhatsApp par
                    bhejne ke liye action buttons diye gaye hain.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700">
                      <FaEnvelope />
                      Email Quote
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                      <FaWhatsapp />
                      WhatsApp Quote
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmBooking}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[22px] bg-gradient-to-r from-sky-600 to-cyan-500 px-5 py-4 text-sm font-bold text-white shadow-[0_16px_35px_rgba(14,165,233,0.24)] transition hover:-translate-y-0.5"
                >
                  <FaPaperPlane />
                  Save Reservation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddHall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[30px] border border-white/50 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.25)]">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900">Add Hall</h3>
              <button
                type="button"
                onClick={() => setShowAddHall(false)}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Close
              </button>
            </div>
            <div className="grid gap-4">
              <input
                className={inputCls}
                placeholder="Hall name"
                value={newHall.name}
                onChange={(e) =>
                  setNewHall((prev) => ({ ...prev, name: e.target.value }))
                }
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  className={inputCls}
                  placeholder="Capacity"
                  type="number"
                  value={newHall.capacity}
                  onChange={(e) =>
                    setNewHall((prev) => ({
                      ...prev,
                      capacity: e.target.value,
                    }))
                  }
                />
                <input
                  className={inputCls}
                  placeholder="Rate per hour"
                  type="number"
                  value={newHall.ratePerHour}
                  onChange={(e) =>
                    setNewHall((prev) => ({
                      ...prev,
                      ratePerHour: e.target.value,
                    }))
                  }
                />
              </div>
              <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={newHall.is_ac}
                  onChange={(e) =>
                    setNewHall((prev) => ({ ...prev, is_ac: e.target.checked }))
                  }
                />
                AC enabled hall
              </label>
              <button
                type="button"
                onClick={handleAddHall}
                className="rounded-[22px] bg-gradient-to-r from-teal-600 to-emerald-500 px-5 py-4 text-sm font-bold text-white"
              >
                Add Hall
              </button>
            </div>
          </div>
        </div>
      )}

      {detailHall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[30px] border border-white/50 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.25)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
                  Hall Details
                </p>
                <h3 className="mt-1 text-2xl font-black text-slate-900">
                  {detailHall.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailHall(null)}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Close
              </button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[22px] border border-slate-200/80 bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Capacity
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900">
                  {detailHall.capacity}
                </div>
              </div>
              <div className="rounded-[22px] border border-slate-200/80 bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Rate / hour
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900">
                  {formatINR(detailHall.ratePerHour)}
                </div>
              </div>
              <div className="rounded-[22px] border border-slate-200/80 bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Cooling
                </div>
                <div className="mt-2 text-lg font-bold text-slate-900">
                  {detailHall.is_ac ? "AC Hall" : "Non-AC Hall"}
                </div>
              </div>
              <div className="rounded-[22px] border border-slate-200/80 bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Status
                </div>
                <div className="mt-2 text-lg font-bold text-slate-900">
                  {detailHall.status}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBill && selectedBooking && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="mx-auto max-w-4xl rounded-[30px] border border-white/50 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.25)]">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-2xl font-black text-slate-900">
                Banquet Bill
              </h3>
              <button
                type="button"
                onClick={() => setShowBill(false)}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Close
              </button>
            </div>
            <BanquetBill
              booking={selectedBooking}
              halls={halls}
              menuPackages={menuPackages}
              formatINR={formatINR}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Banquet;
