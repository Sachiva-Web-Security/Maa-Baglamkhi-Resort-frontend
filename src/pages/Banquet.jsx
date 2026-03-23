import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FaBell,
  FaCalendarAlt,
  FaEdit,
  FaEnvelope,
  FaGlassCheers,
  FaHeadset,
  FaLightbulb,
  FaMoneyCheckAlt,
  FaPaperPlane,
  FaPlus,
  FaTrash,
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

const banquetConfigStorageKey = "banquetPricingConfig";
const banquetMenuDraftStorageKey = "banquetReservationDraft";
const defaultMenuPackages = [
  {
    id: "standard",
    name: "Standard Celebration",
    perGuest: 650,
    mealLabel: "Veg buffet + snacks",
    description:
      "Budget-friendly family functions ke liye balanced buffet plan.",
    highlights: [
      "Welcome drinks aur 2 starter options",
      "2 veg sabzi, dal, rice aur breads",
      "1 dessert aur standard service setup",
    ],
  },
  {
    id: "premium",
    name: "Premium Feast",
    perGuest: 950,
    mealLabel: "Veg + live counter",
    description:
      "Engagement aur reception events ke liye richer spread with live counter.",
    highlights: [
      "Mocktail station aur 3 premium starters",
      "Paneer specialty, main course buffet aur salads",
      "Live counter plus 2 dessert selections",
    ],
  },
  {
    id: "royal",
    name: "Royal Signature",
    perGuest: 1250,
    mealLabel: "Full event dining experience",
    description:
      "Large-format celebrations ke liye signature dining experience.",
    highlights: [
      "Grand welcome beverages aur chef-curated starters",
      "Multi-cuisine main course with live counter access",
      "Premium desserts, service crew aur elegant presentation",
    ],
  },
];

const defaultLightingOptions = [
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

const defaultMealSectionPrices = mealSections.reduce((acc, section, index) => {
  acc[section] = [60, 140, 260, 220, 120][index] || 0;
  return acc;
}, {});

const defaultPricingConfig = {
  menuPackages: defaultMenuPackages,
  lightingOptions: defaultLightingOptions,
  mealSectionPrices: defaultMealSectionPrices,
  eventSupportFee: 12000,
  decorServiceFee: 15000,
};

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
  eventSupportFee: 12000,
  decorationFee: 15000,
  notes: "",
  date: "",
  startTime: "18:00",
  endTime: "22:00",
  discount: 0,
  gstPercent: 5,
  advance: 0,
  paymentReferenceId: "",
  receiptFileName: "",
  receiptFileDataUrl: "",
  refundAmount: 0,
  selectedCustomMenuItems: [],
  selectedRestaurantMenuItems: [],
  manualCustomMenuItems: [],
  manualMenuEntry: "",
};

const defaultHall = {
  name: "",
  capacity: "",
  ratePerHour: "",
  is_ac: true,
  status: "Available",
};

const inputCls =
  "w-full rounded-2xl border border-slate-200/80 bg-white/88 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100";

const labelCls =
  "mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500";

const modalCloseBtnCls =
  "rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-200 hover:text-cyan-700";

function ModalShell({
  title,
  eyebrow,
  onClose,
  children,
  widthClass = "max-w-5xl",
  heightClass = "h-[min(88vh,760px)]",
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-4">
      <div className={`w-full ${widthClass}`}>
        <div
          className={`mx-auto flex w-full flex-col overflow-hidden rounded-[30px] border border-white/50 bg-[linear-gradient(180deg,#fafdff_0%,#f8fbff_100%)] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.25)] sm:p-7 ${heightClass}`}
        >
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {eyebrow ? (
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
                  {eyebrow}
                </p>
              ) : null}
              {title ? (
                <h3 className="mt-1 text-2xl font-black text-slate-900">
                  {title}
                </h3>
              ) : null}
            </div>
            <button type="button" onClick={onClose} className={modalCloseBtnCls}>
              Close
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">{children}</div>
        </div>
      </div>
    </div>
  );
}

function useDelayedValue(value, delay = 1000) {
  const [delayedValue, setDelayedValue] = useState(value);

  useEffect(() => {
    if (!value) {
      setDelayedValue(value);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setDelayedValue(value);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [delay, value]);

  return delayedValue;
}

function PaginationControls({ page, totalPages, onChange, label }) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col gap-3 rounded-[22px] border border-slate-200/80 bg-white/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm font-semibold text-slate-600">
        {label} Page {page} of {totalPages}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

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

function normalizeCategory(value) {
  return (value || "Other").trim().toLowerCase();
}

function parseMenuItemsList(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildCustomMenuItemsText(selectedItems = [], manualItems = []) {
  return [...selectedItems, ...manualItems]
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .filter((item, index, arr) => arr.indexOf(item) === index)
    .join(", ");
}

function parseRestaurantMenuSelection(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => ({
      name: String(item?.name || "").trim(),
      qty: Number(item?.qty || 0),
      rate: Number(item?.rate || 0),
      amount: Number(item?.amount || 0),
      taxAmount: Number(item?.taxAmount || 0),
      total: Number(item?.total || 0),
    }))
    .filter((item) => item.name);
}

function calculateRestaurantMenuCharge(items = []) {
  return parseRestaurantMenuSelection(items).reduce(
    (sum, item) => sum + (Number(item.total) || 0),
    0
  );
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("file_read_failed"));
    reader.readAsDataURL(file);
  });
}

function calculateBookingGrandTotal(booking, halls, pricingConfig) {
  const hall = halls.find((item) => String(item.id) === String(booking.hallId));
  const menu = pricingConfig.menuPackages.find(
    (item) => item.id === booking.menuPackageId
  );
  const lighting = pricingConfig.lightingOptions.find(
    (item) => item.id === booking.lightingSystem
  );

  const subtotal =
    (hall?.ratePerHour || 0) * hoursBetween(booking.startTime, booking.endTime) +
    (menu?.perGuest || 0) * (Number(booking.guests) || 0) +
    calculateRestaurantMenuCharge(booking.selectedRestaurantMenuItems) +
    (Number(booking.eventSupportFee) || 0) +
    (Number(booking.decorationFee) || 0) +
    (lighting?.price || 0);
  const discount = Math.min(subtotal, Number(booking.discount) || 0);
  const taxable = subtotal - discount;
  const gst = Math.round((taxable * (Number(booking.gstPercent) || 0)) / 100);

  return taxable + gst;
}

function getStoredPricingConfig() {
  if (typeof window === "undefined") return defaultPricingConfig;

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(banquetConfigStorageKey) || "{}"
    );

    return {
      menuPackages:
        parsed.menuPackages?.length === defaultMenuPackages.length
          ? parsed.menuPackages
          : defaultMenuPackages,
      lightingOptions:
        parsed.lightingOptions?.length === defaultLightingOptions.length
          ? parsed.lightingOptions
          : defaultLightingOptions,
      mealSectionPrices: {
        ...defaultMealSectionPrices,
        ...(parsed.mealSectionPrices || {}),
      },
      eventSupportFee: Number(
        parsed.eventSupportFee ?? defaultPricingConfig.eventSupportFee
      ),
      decorServiceFee: Number(
        parsed.decorServiceFee ?? defaultPricingConfig.decorServiceFee
      ),
    };
  } catch {
    return defaultPricingConfig;
  }
}

function normalizeBooking(raw) {
  const meta = extractMeta(raw.notes || "");
  const selectedCustomMenuItems = parseMenuItemsList(
    meta.selectedCustomMenuItems
  );
  const manualCustomMenuItems = parseMenuItemsList(
    meta.manualCustomMenuItems || raw.customMenuItems || raw.custom_menu_items
  );
  const customMenuItemsText = buildCustomMenuItemsText(
    selectedCustomMenuItems,
    manualCustomMenuItems
  );
  const selectedRestaurantMenuItems = parseRestaurantMenuSelection(
    meta.selectedRestaurantMenuItems
  );
  const advance = Number(raw.advance ?? meta.advance ?? meta.paymentReceived ?? 0);
  const refundAmount = Number(meta.refundAmount || 0);

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
    guestEmail: raw.guestEmail || raw.guest_email || meta.guestEmail || "",
    eventTitle: raw.eventTitle || raw.event_title || meta.eventTitle || "",
    mealSection: raw.mealSection || raw.meal_section || meta.mealSection || "",
    customMenuItems:
      customMenuItemsText ||
      meta.customMenuItems ||
      raw.customMenuItems ||
      raw.custom_menu_items ||
      "",
    selectedCustomMenuItems,
    selectedRestaurantMenuItems,
    manualCustomMenuItems,
    manualMenuEntry: "",
    lightingSystem:
      raw.lightingSystem || raw.lighting_system || meta.lightingSystem || "",
    eventSupportFee: Number(
      raw.eventSupportFee || meta.eventSupportFee || 0
    ),
    advance,
    paymentReferenceId:
      raw.paymentReferenceId ||
      raw.payment_reference_id ||
      meta.paymentReferenceId ||
      "",
    receiptFileName: meta.receiptFileName || "",
    receiptFileDataUrl: meta.receiptFileDataUrl || "",
    paymentReceived: advance,
    refundAmount,
    netReceived: Math.max(0, advance - refundAmount),
    balanceDue: 0,
    notes: stripMeta(raw.notes || ""),
  };
}

const Banquet = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const restoredMenuStateKeyRef = useRef(null);
  const hallsPerPage = 6;
  const bookingsPerPage = 5;
  const [halls, setHalls] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [hallPage, setHallPage] = useState(1);
  const [bookingPage, setBookingPage] = useState(1);
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [showAddHall, setShowAddHall] = useState(false);
  const [detailHall, setDetailHall] = useState(null);
  const [showBill, setShowBill] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedMenuPackage, setSelectedMenuPackage] = useState(null);
  const [activeQuickSection, setActiveQuickSection] = useState(null);
  const [pricingConfig, setPricingConfig] = useState(getStoredPricingConfig);
  const [menuCatalog, setMenuCatalog] = useState([]);
  const [hallFormError, setHallFormError] = useState("");
  const [isAddingHall, setIsAddingHall] = useState(false);
  const [editingHallId, setEditingHallId] = useState(null);
  const [editingBookingId, setEditingBookingId] = useState(null);
  const [isDeletingHall, setIsDeletingHall] = useState(false);
  const [reservationError, setReservationError] = useState("");
  const [isSavingReservation, setIsSavingReservation] = useState(false);
  const [reservationSuccess, setReservationSuccess] = useState(null);
  const [receiptInputKey, setReceiptInputKey] = useState(0);
  const [wizard, setWizard] = useState(() => ({
    ...defaultWizard,
    eventSupportFee: getStoredPricingConfig().eventSupportFee,
    decorationFee: getStoredPricingConfig().decorServiceFee,
  }));
  const [newHall, setNewHall] = useState(defaultHall);
  const delayedShowReservationForm = useDelayedValue(showReservationForm);
  const delayedShowAddHall = useDelayedValue(showAddHall);
  const delayedDetailHall = useDelayedValue(detailHall);
  const delayedShowBill = useDelayedValue(showBill);
  const delayedSelectedMenuPackage = useDelayedValue(selectedMenuPackage);
  const delayedActiveQuickSection = useDelayedValue(activeQuickSection);
  const delayedReservationSuccess = useDelayedValue(reservationSuccess);

  const selectedHall = useMemo(
    () => halls.find((hall) => String(hall.id) === String(wizard.hallId)),
    [halls, wizard.hallId]
  );

  const selectedPackage = useMemo(
    () =>
      pricingConfig.menuPackages.find((pkg) => pkg.id === wizard.menuPackageId),
    [pricingConfig.menuPackages, wizard.menuPackageId]
  );

  const selectedLighting = useMemo(
    () =>
      pricingConfig.lightingOptions.find(
        (option) => option.id === wizard.lightingSystem
      ),
    [pricingConfig.lightingOptions, wizard.lightingSystem]
  );

  const menuCategories = useMemo(() => {
    const labels = menuCatalog.map(
      (item) => (item.category || "Other").trim() || "Other"
    );

    return labels.filter(
      (label, index, arr) =>
        arr.findIndex((value) => normalizeCategory(value) === normalizeCategory(label)) ===
        index
    );
  }, [menuCatalog]);

  const menuCatalogByCategory = useMemo(
    () =>
      menuCategories.reduce((acc, category) => {
        acc[category] = menuCatalog.filter(
          (item) =>
            normalizeCategory(item.category) === normalizeCategory(category)
        );
        return acc;
      }, {}),
    [menuCatalog, menuCategories]
  );

  const enrichBooking = (booking) => {
    const normalized = normalizeBooking(booking);
    const grandTotal = calculateBookingGrandTotal(
      normalized,
      halls,
      pricingConfig
    );

    return {
      ...normalized,
      balanceDue:
        normalized.status === "Cancelled" || normalized.status === "Refunded"
          ? 0
          : Math.max(0, grandTotal - (normalized.advance || 0)),
    };
  };

  const wizardHours = useMemo(
    () => hoursBetween(wizard.startTime, wizard.endTime),
    [wizard.startTime, wizard.endTime]
  );

  const wizardTotals = useMemo(() => {
    const hallCharge = (selectedHall?.ratePerHour || 0) * wizardHours;
    const mealCharge =
      (Number(wizard.guests) || 0) * (selectedPackage?.perGuest || 0);
    const customMenuCharge = calculateRestaurantMenuCharge(
      wizard.selectedRestaurantMenuItems
    );
    const lightingCharge = selectedLighting?.price || 0;
    const eventSupportCharge = Number(wizard.eventSupportFee) || 0;
    const decorationCharge = Number(wizard.decorationFee) || 0;
    const subtotal =
      hallCharge +
      mealCharge +
      customMenuCharge +
      lightingCharge +
      eventSupportCharge +
      decorationCharge;
    const discount = Math.min(subtotal, Number(wizard.discount) || 0);
    const taxable = subtotal - discount;
    const gst = Math.round((taxable * (Number(wizard.gstPercent) || 0)) / 100);

    return {
      hallCharge,
      mealCharge,
      customMenuCharge,
      lightingCharge,
      eventSupportCharge,
      decorationCharge,
      subtotal,
      gst,
      grandTotal: taxable + gst,
      advance: Math.max(0, Number(wizard.advance) || 0),
      balanceDue: Math.max(0, taxable + gst - (Number(wizard.advance) || 0)),
    };
  }, [selectedHall, selectedLighting, selectedPackage, wizard, wizardHours]);

  const stats = useMemo(() => {
    const expectedRevenue = bookings.reduce((sum, booking) => {
      if (["Cancelled", "Refunded"].includes(booking.status)) {
        return sum;
      }

      const hall = halls.find((item) => String(item.id) === String(booking.hallId));
      const menu = pricingConfig.menuPackages.find(
        (item) => item.id === booking.menuPackageId
      );
      const lighting = pricingConfig.lightingOptions.find(
        (item) => item.id === booking.lightingSystem
      );

      const total =
        (hall?.ratePerHour || 0) *
          hoursBetween(booking.startTime, booking.endTime) +
        (menu?.perGuest || 0) * (Number(booking.guests) || 0) +
        calculateRestaurantMenuCharge(booking.selectedRestaurantMenuItems) +
        (Number(booking.eventSupportFee) || 0) +
        (Number(booking.decorationFee) || 0) +
        (lighting?.price || 0);

      return sum + total;
    }, 0);

    return [
      {
        label: "Active reservations",
        value: String(
          bookings.filter(
            (booking) =>
              !["Completed", "Cancelled", "Refunded"].includes(booking.status)
          ).length
        ),
      },
      {
        label: "Banquet halls",
        value: String(halls.filter((hall) => hall.status !== "Occupied").length),
      },
      { label: "Expected revenue", value: formatINR(expectedRevenue) },
    ];
  }, [bookings, halls, pricingConfig]);

  const totalHallPages = useMemo(
    () => Math.max(1, Math.ceil(halls.length / hallsPerPage)),
    [halls.length]
  );

  const totalBookingPages = useMemo(
    () => Math.max(1, Math.ceil(bookings.length / bookingsPerPage)),
    [bookings.length]
  );

  const paginatedHalls = useMemo(() => {
    const start = (hallPage - 1) * hallsPerPage;
    return halls.slice(start, start + hallsPerPage);
  }, [hallPage, halls]);

  const paginatedBookings = useMemo(() => {
    const start = (bookingPage - 1) * bookingsPerPage;
    return bookings.slice(start, start + bookingsPerPage);
  }, [bookingPage, bookings]);

  useEffect(() => {
    const load = async () => {
      const res = await API.get("/banquet");
      setHalls(res.data?.halls || []);
      setBookings((res.data?.bookings || []).map(normalizeBooking));
    };

    load();
  }, []);

  useEffect(() => {
    setBookings((prev) =>
      prev.map((booking) => {
        const grandTotal = calculateBookingGrandTotal(
          booking,
          halls,
          pricingConfig
        );
        return {
          ...booking,
          balanceDue:
            booking.status === "Cancelled" || booking.status === "Refunded"
              ? 0
              : Math.max(0, grandTotal - (booking.advance || 0)),
        };
      })
    );
  }, [halls, pricingConfig]);

  useEffect(() => {
    const loadMenuCatalog = async () => {
      try {
        const response = await API.get("/restaurant/menu");
        setMenuCatalog(Array.isArray(response.data) ? response.data : []);
      } catch {
        setMenuCatalog([]);
      }
    };

    loadMenuCatalog();
  }, []);

  useEffect(() => {
    const hasBanquetMenuState =
      Boolean(location.state?.banquetMenuSelection) ||
      Boolean(location.state?.banquetMenuCancelled);

    if (!hasBanquetMenuState) {
      restoredMenuStateKeyRef.current = null;
      return;
    }

    if (restoredMenuStateKeyRef.current === location.key) {
      return;
    }

    restoredMenuStateKeyRef.current = location.key;

    let draft = null;

    try {
      draft = JSON.parse(
        window.sessionStorage.getItem(banquetMenuDraftStorageKey) || "null"
      );
    } catch {
      draft = null;
    }

    const restoredWizard = {
      ...defaultWizard,
      eventSupportFee: pricingConfig.eventSupportFee,
      decorationFee: pricingConfig.decorServiceFee,
      ...(draft?.wizard || {}),
      selectedCustomMenuItems:
        location.state?.banquetMenuSelection?.selectedCustomMenuItems ||
        draft?.wizard?.selectedCustomMenuItems ||
        [],
      selectedRestaurantMenuItems:
        location.state?.banquetMenuSelection?.selectedRestaurantMenuItems ||
        draft?.wizard?.selectedRestaurantMenuItems ||
        [],
      manualCustomMenuItems: draft?.wizard?.manualCustomMenuItems || [],
      manualMenuEntry: "",
    };

    setReservationError("");
    setEditingBookingId(draft?.editingBookingId || null);
    setReceiptInputKey((prev) => prev + 1);
    setWizard(restoredWizard);
    setActiveQuickSection(null);
    setShowReservationForm(true);
    window.sessionStorage.removeItem(banquetMenuDraftStorageKey);
  }, [
    location.key,
    location.state,
    pricingConfig.decorServiceFee,
    pricingConfig.eventSupportFee,
  ]);

  useEffect(() => {
    window.localStorage.setItem(
      banquetConfigStorageKey,
      JSON.stringify(pricingConfig)
    );
  }, [pricingConfig]);

  useEffect(() => {
    if (hallPage > totalHallPages) {
      setHallPage(totalHallPages);
    }
  }, [hallPage, totalHallPages]);

  useEffect(() => {
    if (bookingPage > totalBookingPages) {
      setBookingPage(totalBookingPages);
    }
  }, [bookingPage, totalBookingPages]);

  useEffect(() => {
    const hasOpenModal =
      delayedShowReservationForm ||
      delayedShowAddHall ||
      Boolean(delayedDetailHall) ||
      delayedShowBill ||
      Boolean(delayedReservationSuccess) ||
      Boolean(delayedSelectedMenuPackage) ||
      Boolean(delayedActiveQuickSection);

    if (!hasOpenModal) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;

      if (selectedMenuPackage) {
        setSelectedMenuPackage(null);
        return;
      }
      if (showBill) {
        setShowBill(false);
        return;
      }
      if (reservationSuccess) {
        setReservationSuccess(null);
        return;
      }
      if (detailHall) {
        setDetailHall(null);
        return;
      }
      if (showAddHall) {
        setHallFormError("");
        setShowAddHall(false);
        return;
      }
      if (showReservationForm) {
        resetWizard();
        return;
      }
      if (activeQuickSection) {
        setActiveQuickSection(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    delayedActiveQuickSection,
    delayedDetailHall,
    delayedReservationSuccess,
    delayedSelectedMenuPackage,
    delayedShowAddHall,
    delayedShowBill,
    delayedShowReservationForm,
    activeQuickSection,
    detailHall,
    reservationSuccess,
    selectedMenuPackage,
    showAddHall,
    showBill,
    showReservationForm,
  ]);

  const resetWizard = () => {
    setReservationError("");
    setEditingBookingId(null);
    setReceiptInputKey((prev) => prev + 1);
    setWizard({
      ...defaultWizard,
      eventSupportFee: pricingConfig.eventSupportFee,
      decorationFee: pricingConfig.decorServiceFee,
    });
    setShowReservationForm(false);
  };

  const openCreateReservationForm = () => {
    setReservationError("");
    setEditingBookingId(null);
    setReceiptInputKey((prev) => prev + 1);
    setWizard({
      ...defaultWizard,
      eventSupportFee: pricingConfig.eventSupportFee,
      decorationFee: pricingConfig.decorServiceFee,
    });
    setShowReservationForm(true);
  };

  const handleEditBooking = (booking) => {
    const normalizedBooking = normalizeBooking(booking);
    setReservationError("");
    setEditingBookingId(booking.id);
    setReceiptInputKey((prev) => prev + 1);
    setWizard({
      ...defaultWizard,
      ...normalizedBooking,
      hallId: String(normalizedBooking.hallId || ""),
      guests: String(normalizedBooking.guests || ""),
      eventSupportFee: String(normalizedBooking.eventSupportFee || 0),
      decorationFee: String(normalizedBooking.decorationFee || 0),
      discount: String(normalizedBooking.discount || 0),
      gstPercent: String(normalizedBooking.gstPercent || 5),
      advance: String(normalizedBooking.advance || 0),
      refundAmount: String(normalizedBooking.refundAmount || 0),
      selectedCustomMenuItems: normalizedBooking.selectedCustomMenuItems || [],
      selectedRestaurantMenuItems:
        normalizedBooking.selectedRestaurantMenuItems || [],
      manualCustomMenuItems: normalizedBooking.manualCustomMenuItems || [],
      manualMenuEntry: "",
    });
    setShowReservationForm(true);
    setActiveQuickSection(null);
  };

  const toggleCustomMenuSelection = (name) => {
    setWizard((prev) => {
      const exists = prev.selectedCustomMenuItems.includes(name);
      return {
        ...prev,
        selectedCustomMenuItems: exists
          ? prev.selectedCustomMenuItems.filter((item) => item !== name)
          : [...prev.selectedCustomMenuItems, name],
      };
    });
  };

  const handleAddManualMenuItem = () => {
    const value = String(wizard.manualMenuEntry || "").trim();
    if (!value) return;

    setWizard((prev) => ({
      ...prev,
      manualCustomMenuItems: prev.manualCustomMenuItems.includes(value)
        ? prev.manualCustomMenuItems
        : [...prev.manualCustomMenuItems, value],
      manualMenuEntry: "",
    }));
  };

  const handleRemoveManualMenuItem = (itemToRemove) => {
    setWizard((prev) => ({
      ...prev,
      manualCustomMenuItems: prev.manualCustomMenuItems.filter(
        (item) => item !== itemToRemove
      ),
    }));
  };

  const handleRemoveSelectedRestaurantMenuItem = (itemToRemove, indexToRemove) => {
    setWizard((prev) => {
      const nextRestaurantItems = prev.selectedRestaurantMenuItems.filter(
        (_, index) =>
          index !== indexToRemove ||
          String(itemToRemove?.name || "").trim() !==
            String(prev.selectedRestaurantMenuItems[index]?.name || "").trim()
      );
      const removedName = String(itemToRemove?.name || "").trim();
      const shouldKeepCustomChip =
        !removedName ||
        nextRestaurantItems.some((item) => item.name === removedName) ||
        prev.manualCustomMenuItems.includes(removedName);

      return {
        ...prev,
        selectedRestaurantMenuItems: nextRestaurantItems,
        selectedCustomMenuItems: shouldKeepCustomChip
          ? prev.selectedCustomMenuItems
          : prev.selectedCustomMenuItems.filter((item) => item !== removedName),
      };
    });
  };

  const handleRemoveSelectedCustomMenuItem = (itemToRemove) => {
    setWizard((prev) => ({
      ...prev,
      selectedCustomMenuItems: prev.selectedCustomMenuItems.filter(
        (item) => item !== itemToRemove
      ),
      selectedRestaurantMenuItems: prev.selectedRestaurantMenuItems.filter(
        (item) => item.name !== itemToRemove
      ),
    }));
  };

  const handleOpenRestaurantMenu = () => {
    window.sessionStorage.setItem(
      banquetMenuDraftStorageKey,
      JSON.stringify({
        wizard,
        editingBookingId,
      })
    );

    navigate("/restaurant/menu/banquet", {
      state: {
        banquetMenuPicker: true,
        returnTo: "/banquet",
      },
    });
  };

  const handleReceiptUpload = async (file) => {
    if (!file) return;

    const maxFileSize = 2 * 1024 * 1024;
    if (file.size > maxFileSize) {
      setReservationError("Receipt file 2MB se chhoti honi chahiye.");
      setReceiptInputKey((prev) => prev + 1);
      return;
    }

    try {
      const fileDataUrl = await readFileAsDataUrl(file);
      setReservationError("");
      setWizard((prev) => ({
        ...prev,
        receiptFileName: file.name,
        receiptFileDataUrl: fileDataUrl,
      }));
    } catch {
      setReservationError("Receipt file read nahi ho paayi. Dobara try kijiye.");
      setReceiptInputKey((prev) => prev + 1);
    }
  };

  const handleRemoveReceipt = () => {
    setWizard((prev) => ({
      ...prev,
      receiptFileName: "",
      receiptFileDataUrl: "",
    }));
    setReceiptInputKey((prev) => prev + 1);
  };

  const showReservationSuccessPopup = ({
    title,
    eyebrow,
    message,
    customerName,
    hallName,
    date,
    detail,
    subjectLabel,
  }) => {
    setReservationSuccess({
      title,
      eyebrow,
      message,
      customerName,
      hallName,
      date,
      detail,
      subjectLabel,
    });
  };

  const handleConfirmBooking = async ({ cancelAfterSave = false } = {}) => {
    if (!wizard.hallId || !wizard.customerName.trim() || !wizard.date) {
      setReservationError(
        "Hall, guest name aur booking date bharna zaroori hai."
      );
      return;
    }

    if (!wizard.startTime || !wizard.endTime || wizardHours <= 0) {
      setReservationError("Start time aur end time valid select kijiye.");
      return;
    }

    if (Number(wizard.refundAmount || 0) > Number(wizard.advance || 0)) {
      setReservationError(
        "Refund amount payment received se zyada nahi ho sakta."
      );
      return;
    }

    setReservationError("");
    setIsSavingReservation(true);

    const customMenuItems = buildCustomMenuItemsText(
      wizard.selectedCustomMenuItems,
      wizard.manualCustomMenuItems
    );
    const existingBooking = bookings.find(
      (booking) => booking.id === editingBookingId
    );

    const reservationMeta = {
      guestEmail: wizard.guestEmail,
      eventTitle: wizard.eventTitle,
      mealSection: wizard.mealSection,
      customMenuItems,
      selectedCustomMenuItems: wizard.selectedCustomMenuItems,
      selectedRestaurantMenuItems: wizard.selectedRestaurantMenuItems,
      manualCustomMenuItems: wizard.manualCustomMenuItems,
      lightingSystem: wizard.lightingSystem,
      eventSupportFee: wizard.eventSupportFee,
      phone: wizard.phone,
      advance: wizard.advance,
      paymentReferenceId: wizard.paymentReferenceId,
      receiptFileName: wizard.receiptFileName,
      refundAmount: Number(wizard.refundAmount || 0),
    };

    const payload = {
      ...wizard,
      customMenuItems,
      advance: Number(wizard.advance || 0),
      refundAmount: Number(wizard.refundAmount || 0),
      notes: buildNotesPayload(wizard.notes, reservationMeta),
    };

    try {
      if (editingBookingId) {
        await API.put(`/banquet/${editingBookingId}`, payload);
        let updatedStatus = existingBooking?.status || "Confirmed";

        if (cancelAfterSave) {
          await API.put(`/banquet/${editingBookingId}/cancel`);
          updatedStatus = "Cancelled";
        }

        const updatedBooking = enrichBooking({
          ...payload,
          id: editingBookingId,
          hallName: selectedHall?.name || "Banquet Hall",
          status: updatedStatus,
          invoiceNo: existingBooking?.invoiceNo || "",
        });

        setBookings((prev) =>
          prev.map((booking) =>
            booking.id === editingBookingId ? updatedBooking : booking
          )
        );

        showReservationSuccessPopup({
          title: cancelAfterSave
            ? "Booking cancelled"
            : "Reservation updated",
          eyebrow: cancelAfterSave ? "Booking Cancelled" : "Reservation Updated",
          message: cancelAfterSave
            ? "booking has been cancelled."
            : "reservation has been updated.",
          customerName: updatedBooking.customerName,
          hallName: updatedBooking.hallName,
          date: updatedBooking.date,
        });
      } else {
        const res = await API.post("/banquet", payload);
        const newBooking = enrichBooking({
          ...payload,
          id: res.data?.id || Date.now(),
          hallName: selectedHall?.name || "Banquet Hall",
          status: "Confirmed",
          invoiceNo: "",
        });

        setBookings((prev) => [newBooking, ...prev]);
        showReservationSuccessPopup({
          title: "Reservation successful",
          eyebrow: "Booking Confirmed",
          message: "reservation has been saved.",
          customerName: newBooking.customerName,
          hallName: newBooking.hallName,
          date: newBooking.date,
        });
      }
      resetWizard();
    } catch (error) {
      setReservationError(
        error.response?.data?.message || "Reservation save nahi ho paayi."
      );
    } finally {
      setIsSavingReservation(false);
    }
  };

  const handleCompleteBooking = async (bookingId) => {
    await API.put(`/banquet/${bookingId}/complete`);

    setBookings((prev) =>
      prev.map((booking) =>
        booking.id === bookingId ? { ...booking, status: "Completed" } : booking
      )
    );
  };

  const handleCancelBooking = async (booking) => {
    const confirmed = window.confirm(
      `${booking.customerName} ki booking cancel karni hai?`
    );
    if (!confirmed) return;

    await API.put(`/banquet/${booking.id}/cancel`);

    const cancelledBooking = {
      ...booking,
      status: "Cancelled",
      balanceDue: 0,
    };

    setBookings((prev) =>
      prev.map((item) =>
        item.id === booking.id
          ? cancelledBooking
          : item
      )
    );

    showReservationSuccessPopup({
      title: "Booking cancelled",
      eyebrow: "Booking Cancelled",
      message: "booking has been cancelled.",
      customerName: cancelledBooking.customerName,
      hallName: cancelledBooking.hallName,
      date: cancelledBooking.date,
    });
  };

  const handleRefundBooking = async (booking) => {
    const remainingRefund = Math.max(
      0,
      Number(booking.advance || 0) - Number(booking.refundAmount || 0)
    );

    if (remainingRefund <= 0) {
      window.alert("Is booking ka pura payment pehle hi refund ho chuka hai.");
      return;
    }

    const value = window.prompt(
      `Kitna refund karna hai? Max ${remainingRefund}`,
      String(remainingRefund)
    );
    if (value === null) return;

    const refundAmount = Number(value);
    if (!refundAmount || refundAmount <= 0 || refundAmount > remainingRefund) {
      window.alert("Refund amount valid nahi hai.");
      return;
    }

    const response = await API.put(`/banquet/${booking.id}/refund`, {
      refundAmount,
    });
    const totalRefund = Number(response.data?.refundAmount || 0);
    const nextStatus =
      response.data?.status ||
      (totalRefund >= Number(booking.advance || 0)
        ? "Refunded"
        : booking.status);

    setBookings((prev) =>
      prev.map((item) =>
        item.id === booking.id
          ? {
              ...item,
              refundAmount: totalRefund,
              netReceived: Math.max(0, Number(item.advance || 0) - totalRefund),
              status: nextStatus,
              balanceDue: 0,
            }
          : item
      )
    );
  };

  const handleDeleteBooking = async (booking) => {
    if (booking.status !== "Cancelled") {
      window.alert("Delete sirf cancelled reservation ke liye available hai.");
      return;
    }

    const confirmed = window.confirm(
      `${booking.customerName} ki booking permanently delete karni hai?`
    );
    if (!confirmed) return;

    await API.delete(`/banquet/${booking.id}`);
    setBookings((prev) => prev.filter((item) => item.id !== booking.id));
    showReservationSuccessPopup({
      title: "Reservation deleted",
      eyebrow: "History Deleted",
      message: "reservation history has been deleted.",
      customerName: booking.customerName,
      hallName: booking.hallName,
      date: booking.date,
    });
  };

  const handleGenerateBill = async (booking) => {
    const invoiceNo =
      booking.invoiceNo || `BNQ-${String(booking.id).padStart(6, "0")}`;

    await API.put(`/banquet/${booking.id}/bill`, { invoiceNo });

    const updatedBooking = enrichBooking({
      ...booking,
      invoiceNo,
      status: "Billed",
    });

    setBookings((prev) =>
      prev.map((item) => (item.id === booking.id ? updatedBooking : item))
    );
    setSelectedBooking(updatedBooking);
    setShowBill(true);
  };

  const handleSendQuotation = (booking, type) => {
    const hall = halls.find((item) => String(item.id) === String(booking.hallId));
    const pkg = pricingConfig.menuPackages.find(
      (item) => item.id === booking.menuPackageId
    );
    const lighting = pricingConfig.lightingOptions.find(
      (item) => item.id === booking.lightingSystem
    );

    const subtotal =
      (hall?.ratePerHour || 0) * hoursBetween(booking.startTime, booking.endTime) +
      (pkg?.perGuest || 0) * (Number(booking.guests) || 0) +
      (Number(booking.eventSupportFee) || 0) +
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
      `Custom menu amount: ${formatINR(
        calculateRestaurantMenuCharge(booking.selectedRestaurantMenuItems)
      )}`,
      `Lighting: ${lighting?.label || "Standard"}`,
      `Event support: ${formatINR(booking.eventSupportFee || 0)}`,
      `Estimated amount: ${formatINR(subtotal)}`,
      `Paid: ${formatINR(booking.advance || 0)}`,
      `Refunded: ${formatINR(booking.refundAmount || 0)}`,
      `Balance due: ${formatINR(booking.balanceDue || 0)}`,
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
    const payload = {
      ...newHall,
      name: newHall.name.trim(),
      capacity: Number(newHall.capacity),
      ratePerHour: Number(newHall.ratePerHour),
    };

    if (!payload.name || payload.capacity <= 0 || payload.ratePerHour <= 0) {
      setHallFormError("Hall name, capacity aur rate per hour sahi bharna zaroori hai.");
      return;
    }

    setIsAddingHall(true);
    setHallFormError("");

    try {
      if (editingHallId) {
        await API.put(`/banquet/halls/${editingHallId}`, {
          ...payload,
          status: newHall.status || "Available",
        });
      } else {
        await API.post("/banquet/halls", payload);
      }
      const refreshed = await API.get("/banquet");
      setHalls(refreshed.data?.halls || []);
      showReservationSuccessPopup({
        title: editingHallId ? "Hall updated" : "Hall added",
        eyebrow: editingHallId ? "Hall Updated" : "Hall Added",
        message: editingHallId
          ? "hall details have been updated."
          : "hall has been added successfully.",
        customerName: payload.name,
        hallName: `${payload.capacity} guests capacity`,
        detail: `Rate ${formatINR(payload.ratePerHour)} per hour`,
        subjectLabel: "Hall",
      });
      setNewHall(defaultHall);
      setEditingHallId(null);
      setShowAddHall(false);
      setActiveQuickSection(null);
    } catch (error) {
      setHallFormError(
        error.response?.data?.message ||
          (editingHallId
            ? "Banquet hall update nahi ho paaya."
            : "Banquet hall add nahi ho paaya.")
      );
    } finally {
      setIsAddingHall(false);
    }
  };

  const handleEditHall = (hall) => {
    setHallFormError("");
    setEditingHallId(hall.id);
    setNewHall({
      name: hall.name || "",
      capacity: String(hall.capacity || ""),
      ratePerHour: String(hall.ratePerHour || ""),
      is_ac: Boolean(hall.is_ac),
      status: hall.status || "Available",
    });
    setDetailHall(null);
    setShowAddHall(true);
  };

  const handleDeleteHall = async (hall) => {
    const confirmed = window.confirm(
      `${hall.name} hall ko delete karna hai? Ye action undo nahi hoga.`
    );
    if (!confirmed) return;

    setIsDeletingHall(true);
    setHallFormError("");

    try {
      await API.delete(`/banquet/halls/${hall.id}`);
      const refreshed = await API.get("/banquet");
      setHalls(refreshed.data?.halls || []);
      showReservationSuccessPopup({
        title: "Hall deleted",
        eyebrow: "Hall Deleted",
        message: "hall has been deleted successfully.",
        customerName: hall.name,
        hallName: `${hall.capacity} guests capacity`,
        detail: `Rate ${formatINR(hall.ratePerHour)} per hour`,
        subjectLabel: "Hall",
      });
      setDetailHall(null);
      if (String(wizard.hallId) === String(hall.id)) {
        setWizard((prev) => ({ ...prev, hallId: "" }));
      }
    } catch (error) {
      setHallFormError(
        error.response?.data?.message || "Banquet hall delete nahi ho paaya."
      );
    } finally {
      setIsDeletingHall(false);
    }
  };

  const handleMenuPriceChange = (packageId, value) => {
    setPricingConfig((prev) => ({
      ...prev,
      menuPackages: prev.menuPackages.map((pkg) =>
        pkg.id === packageId ? { ...pkg, perGuest: Number(value) || 0 } : pkg
      ),
    }));
  };

  const handleLightingPriceChange = (lightingId, value) => {
    setPricingConfig((prev) => ({
      ...prev,
      lightingOptions: prev.lightingOptions.map((option) =>
        option.id === lightingId
          ? { ...option, price: Number(value) || 0 }
          : option
      ),
    }));
  };

  const handleMealSectionPriceChange = (section, value) => {
    setPricingConfig((prev) => ({
      ...prev,
      mealSectionPrices: {
        ...prev.mealSectionPrices,
        [section]: Number(value) || 0,
      },
    }));
  };

  const renderQuickSectionModal = () => {
    if (!activeQuickSection) return null;

    if (activeQuickSection === "halls") {
      return (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
                Venue Options
              </p>
              <h3 className="mt-1 text-2xl font-black text-slate-900">
                Banquet halls
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setHallFormError("");
                setEditingHallId(null);
                setNewHall(defaultHall);
                setShowAddHall(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-teal-600 to-emerald-500 px-4 py-2.5 text-sm font-bold text-white"
            >
              <FaPlus />
              Add Hall
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {halls.length ? (
              paginatedHalls.map((hall) => (
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
                  <div className="flex flex-wrap items-center gap-3 text-sm font-semibold">
                    <button
                      type="button"
                      onClick={() => setDetailHall(hall)}
                      className="text-cyan-700"
                    >
                      View hall details
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditHall(hall)}
                      className="inline-flex items-center gap-1 text-amber-700"
                    >
                      <FaEdit />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteHall(hall)}
                      className="inline-flex items-center gap-1 text-rose-700"
                    >
                      <FaTrash />
                      Delete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[22px] border border-dashed border-slate-300 bg-white/70 p-6 text-sm text-slate-500 md:col-span-2 xl:col-span-3">
                Abhi tak koi banquet hall add nahi hua hai. `Add Hall` se naya hall create kijiye.
              </div>
            )}
          </div>
          <PaginationControls
            page={hallPage}
            totalPages={totalHallPages}
            onChange={setHallPage}
            label="Halls"
          />
        </div>
      );
    }

    if (activeQuickSection === "addons") {
      return (
        <div className="space-y-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
              Banquet Addons
            </p>
            <h3 className="mt-1 text-2xl font-black text-slate-900">
              Addon pricing controls
            </h3>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {pricingConfig.lightingOptions.map((option) => (
              <div
                key={option.id}
                className="rounded-[22px] border border-slate-200/80 bg-white p-5"
              >
                <div className="text-sm font-bold text-slate-900">
                  {option.label}
                </div>
                <div className="mt-3">
                  <label className={labelCls}>Lighting Price</label>
                  <input
                    type="number"
                    min="0"
                    value={option.price}
                    onChange={(e) =>
                      handleLightingPriceChange(option.id, e.target.value)
                    }
                    className={inputCls}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[22px] border border-slate-200/80 bg-white p-5">
              <div className="text-sm font-bold text-slate-900">
                Event support
              </div>
              <label className={`${labelCls} mt-4`}>Setup Price</label>
              <input
                type="number"
                min="0"
                value={pricingConfig.eventSupportFee}
                onChange={(e) =>
                  setPricingConfig((prev) => ({
                    ...prev,
                    eventSupportFee: Number(e.target.value) || 0,
                  }))
                }
                className={inputCls}
              />
            </div>
            <div className="rounded-[22px] border border-slate-200/80 bg-white p-5">
              <div className="text-sm font-bold text-slate-900">
                Decor and service
              </div>
              <label className={`${labelCls} mt-4`}>Decor Price</label>
              <input
                type="number"
                min="0"
                value={pricingConfig.decorServiceFee}
                onChange={(e) =>
                  setPricingConfig((prev) => ({
                    ...prev,
                    decorServiceFee: Number(e.target.value) || 0,
                  }))
                }
                className={inputCls}
              />
            </div>
          </div>
        </div>
      );
    }

    if (activeQuickSection === "meals") {
      return (
        <div className="space-y-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
              Event Dining
            </p>
            <h3 className="mt-1 text-2xl font-black text-slate-900">
              Meal menu pricing
            </h3>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {pricingConfig.menuPackages.map((menu) => (
              <div
                key={menu.id}
                className="rounded-[22px] border border-slate-200/80 bg-white p-5"
              >
                <div className="text-sm font-bold uppercase tracking-[0.14em] text-cyan-700">
                  {menu.name}
                </div>
                <label className={`${labelCls} mt-4`}>Per Guest Price</label>
                <input
                  type="number"
                  min="0"
                  value={menu.perGuest}
                  onChange={(e) =>
                    handleMenuPriceChange(menu.id, e.target.value)
                  }
                  className={inputCls}
                />
                <p className="mt-4 text-sm text-slate-500">{menu.mealLabel}</p>
              </div>
            ))}
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <div className="text-sm font-bold text-slate-900">
              Meal section prices
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {mealSections.map((section) => (
                <div key={section} className="rounded-2xl bg-white p-4">
                  <div className="text-sm font-semibold text-slate-800">
                    {section}
                  </div>
                  <label className={`${labelCls} mt-3`}>Section Price</label>
                  <input
                    type="number"
                    min="0"
                    value={pricingConfig.mealSectionPrices[section] || 0}
                    onChange={(e) =>
                      handleMealSectionPriceChange(section, e.target.value)
                    }
                    className={inputCls}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (activeQuickSection === "reservations") {
      return (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
                Reservation Dashboard
              </p>
              <h3 className="mt-1 text-2xl font-black text-slate-900">
                Manage banquet reservations
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveQuickSection(null);
                openCreateReservationForm();
              }}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-600 to-cyan-500 px-4 py-2.5 text-sm font-bold text-white"
            >
              <FaPlus />
              Add New
            </button>
          </div>
          <div className="grid gap-4">
            {bookings.length ? (
              paginatedBookings.map((booking) => (
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
                        {booking.customerName} |{" "}
                        {booking.eventTitle || booking.eventType}
                      </div>
                    </div>
                    <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                      {booking.status}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-slate-600 md:grid-cols-4">
                    <div>Date: {booking.date}</div>
                    <div>
                      Time: {booking.startTime} - {booking.endTime}
                    </div>
                    <div>Guests: {booking.guests}</div>
                    <div>Meal: {booking.mealSection || "Planned"}</div>
                    <div>Paid: {formatINR(booking.advance || 0)}</div>
                    <div>Refunded: {formatINR(booking.refundAmount || 0)}</div>
                    <div>Due: {formatINR(booking.balanceDue || 0)}</div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditBooking(booking)}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
                    >
                      <FaEdit />
                      Edit
                    </button>
                    {booking.status === "Confirmed" ? (
                      <button
                        type="button"
                        onClick={() => handleCancelBooking(booking)}
                        className="rounded-full bg-rose-500 px-3 py-2 text-xs font-bold text-white"
                      >
                        Cancel
                      </button>
                    ) : null}
                    {["Cancelled", "Refunded"].includes(booking.status) &&
                    Number(booking.advance || 0) >
                      Number(booking.refundAmount || 0) ? (
                      <button
                        type="button"
                        onClick={() => handleRefundBooking(booking)}
                        className="rounded-full bg-violet-600 px-3 py-2 text-xs font-bold text-white"
                      >
                        Refund
                      </button>
                    ) : null}
                    {booking.status === "Cancelled" ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteBooking(booking)}
                        className="rounded-full border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600"
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[22px] border border-dashed border-slate-300 bg-white/70 p-6 text-sm text-slate-500">
                Koi reservation available nahi hai. `Add New` se pehli booking create kijiye.
              </div>
            )}
          </div>
          <PaginationControls
            page={bookingPage}
            totalPages={totalBookingPages}
            onChange={setBookingPage}
            label="Reservations"
          />
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
            Settlement Report
          </p>
          <h3 className="mt-1 text-2xl font-black text-slate-900">
            Pricing and settlement preview
          </h3>
        </div>
        <div className="grid gap-4 md:grid-cols-5">
          {[
            { label: "Hall amount", value: formatINR(wizardTotals.hallCharge) },
            { label: "Meal amount", value: formatINR(wizardTotals.mealCharge) },
            {
              label: "Custom menu",
              value: formatINR(wizardTotals.customMenuCharge),
            },
            {
              label: "Lighting setup",
              value: formatINR(wizardTotals.lightingCharge),
            },
            {
              label: "Event support",
              value: formatINR(wizardTotals.eventSupportCharge),
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
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[22px] border border-slate-200/80 bg-white p-5">
            <div className="text-sm font-bold text-slate-900">
              Global addon pricing
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label className={labelCls}>Event Support Fee</label>
                <input
                  type="number"
                  min="0"
                  value={pricingConfig.eventSupportFee}
                  onChange={(e) =>
                    setPricingConfig((prev) => ({
                      ...prev,
                      eventSupportFee: Number(e.target.value) || 0,
                    }))
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Decor Service Fee</label>
                <input
                  type="number"
                  min="0"
                  value={pricingConfig.decorServiceFee}
                  onChange={(e) =>
                    setPricingConfig((prev) => ({
                      ...prev,
                      decorServiceFee: Number(e.target.value) || 0,
                    }))
                  }
                  className={inputCls}
                />
              </div>
            </div>
          </div>
          <div className="rounded-[22px] border border-slate-200/80 bg-white p-5">
            <div className="text-sm font-bold text-slate-900">
              Menu package pricing
            </div>
            <div className="mt-4 space-y-4">
              {pricingConfig.menuPackages.map((pkg) => (
                <div key={pkg.id}>
                  <label className={labelCls}>{pkg.name}</label>
                  <input
                    type="number"
                    min="0"
                    value={pkg.perGuest}
                    onChange={(e) =>
                      handleMenuPriceChange(pkg.id, e.target.value)
                    }
                    className={inputCls}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
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
                  onClick={openCreateReservationForm}
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
                    onClick={() => setActiveQuickSection(section.id)}
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
              onClick={() => {
                setHallFormError("");
                setEditingHallId(null);
                setNewHall(defaultHall);
                setShowAddHall(true);
              }}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-teal-600 to-emerald-500 px-4 py-2.5 text-sm font-bold text-white shadow-[0_12px_30px_rgba(13,148,136,0.24)] transition hover:-translate-y-0.5"
                >
                  <FaPlus />
                  Add Hall
                </button>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {paginatedHalls.map((hall) => (
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
              <PaginationControls
                page={hallPage}
                totalPages={totalHallPages}
                onChange={setHallPage}
                label="Halls"
              />
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
                  info: pricingConfig.lightingOptions
                    .map((item) => `${item.label} ${formatINR(item.price)}`)
                    .join(" | "),
                },
                {
                  icon: FaHeadset,
                  title: "Event support",
                  value: "DJ desk, sound, mic and service staff",
                  info: `Current setup price ${formatINR(pricingConfig.eventSupportFee)}.`,
                },
                {
                  icon: FaBell,
                  title: "Decor and service",
                  value: "Decoration, floral gate and welcome desk",
                  info: `Current decor fee ${formatINR(pricingConfig.decorServiceFee)}.`,
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
                  {pricingConfig.menuPackages.map((menu) => (
                    <button
                      type="button"
                      key={menu.id}
                      onClick={() => setSelectedMenuPackage(menu)}
                      className="rounded-[22px] border border-slate-200/80 bg-white p-5 text-left transition hover:-translate-y-1 hover:border-cyan-300 hover:shadow-[0_18px_35px_rgba(8,145,178,0.14)]"
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
                      <div className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Click to view details
                      </div>
                    </button>
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
                    Reservation form mein restaurant menu sirf custom menu items
                    section ke andar show hota hai, jisse booking ke time par
                    direct selection easy rahe.
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
              onClick={openCreateReservationForm}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-600 to-cyan-500 px-4 py-2.5 text-sm font-bold text-white shadow-[0_12px_30px_rgba(14,165,233,0.24)] transition hover:-translate-y-0.5"
            >
              <FaPlus />
              Add New
            </button>
          </div>

          <div className="hidden overflow-x-auto lg:block">
            {bookings.length ? (
              <table className="min-w-full overflow-hidden rounded-[22px] border border-slate-200/80 bg-white">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-4 py-4">Hall</th>
                    <th className="px-4 py-4">Guest</th>
                    <th className="px-4 py-4">Event</th>
                    <th className="px-4 py-4">Date</th>
                    <th className="px-4 py-4">Time</th>
                    <th className="px-4 py-4">Payment</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedBookings.map((booking) => (
                    <BanquetBookingRow
                      key={booking.id}
                      booking={booking}
                      formatINR={formatINR}
                      onComplete={() => handleCompleteBooking(booking.id)}
                      onCancel={() => handleCancelBooking(booking)}
                      onEdit={() => handleEditBooking(booking)}
                      onRefund={() => handleRefundBooking(booking)}
                      onGenerateBill={() => handleGenerateBill(booking)}
                      onDelete={() => handleDeleteBooking(booking)}
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
            ) : (
              <div className="rounded-[22px] border border-dashed border-slate-300 bg-white/70 p-6 text-sm text-slate-500">
                Koi reservation available nahi hai. `Add New` se pehli booking create kijiye.
              </div>
            )}
          </div>
          <PaginationControls
            page={bookingPage}
            totalPages={totalBookingPages}
            onChange={setBookingPage}
            label="Reservations"
          />

          <div className="grid gap-4 lg:hidden">
            {paginatedBookings.map((booking) => (
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
                      {booking.customerName} |{" "}
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
                  <div>Paid: {formatINR(booking.advance || 0)}</div>
                  <div>Refunded: {formatINR(booking.refundAmount || 0)}</div>
                  <div>Due: {formatINR(booking.balanceDue || 0)}</div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleEditBooking(booking)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"
                  >
                    <FaEdit />
                    Edit
                  </button>
                  {booking.status === "Confirmed" && (
                    <button
                      type="button"
                      onClick={() => handleCancelBooking(booking)}
                      className="rounded-full bg-rose-500 px-3 py-2 text-xs font-bold text-white"
                    >
                      Cancel
                    </button>
                  )}
                  {booking.status === "Confirmed" && (
                    <button
                      type="button"
                      onClick={() => handleCompleteBooking(booking.id)}
                      className="rounded-full bg-amber-500 px-3 py-2 text-xs font-bold text-white"
                    >
                      Mark Completed
                    </button>
                  )}
                  {(booking.status === "Completed" ||
                    booking.status === "Confirmed") && (
                    <button
                      type="button"
                      onClick={() => handleGenerateBill(booking)}
                      className="rounded-full bg-emerald-600 px-3 py-2 text-xs font-bold text-white"
                    >
                      Generate Bill
                    </button>
                  )}
                  {["Cancelled", "Refunded"].includes(booking.status) &&
                  Number(booking.advance || 0) >
                    Number(booking.refundAmount || 0) ? (
                    <button
                      type="button"
                      onClick={() => handleRefundBooking(booking)}
                      className="rounded-full bg-violet-600 px-3 py-2 text-xs font-bold text-white"
                    >
                      Refund
                    </button>
                  ) : null}
                  {booking.status === "Cancelled" ? (
                    <button
                      type="button"
                      onClick={() => handleDeleteBooking(booking)}
                      className="rounded-full border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600"
                    >
                      Delete
                    </button>
                  ) : null}
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
          <div className="grid gap-4 md:grid-cols-5">
            {[
            { label: "Hall amount", value: formatINR(wizardTotals.hallCharge) },
            { label: "Meal amount", value: formatINR(wizardTotals.mealCharge) },
            {
              label: "Custom menu",
              value: formatINR(wizardTotals.customMenuCharge),
            },
            {
              label: "Lighting setup",
              value: formatINR(wizardTotals.lightingCharge),
              },
              {
                label: "Event support",
                value: formatINR(wizardTotals.eventSupportCharge),
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

      {delayedActiveQuickSection && (
        <ModalShell
          title="Banquet Quick View"
          eyebrow="Section Preview"
          onClose={() => setActiveQuickSection(null)}
          widthClass="max-w-6xl"
          heightClass="h-[min(88vh,820px)]"
        >
          {renderQuickSectionModal()}
        </ModalShell>
      )}

      {delayedShowReservationForm && (
        <ModalShell
          title={
            editingBookingId
              ? "Edit banquet reservation"
              : "Add banquet reservation"
          }
          eyebrow="Reservation Form"
          onClose={resetWizard}
          widthClass="max-w-5xl"
          heightClass="h-[min(88vh,820px)]"
        >
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
                      {pricingConfig.menuPackages.map((pkg) => (
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
                      {pricingConfig.lightingOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label} - {formatINR(option.price)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Event Support Fee</label>
                    <input
                      type="number"
                      min="0"
                      value={wizard.eventSupportFee}
                      onChange={(e) =>
                        setWizard((prev) => ({
                          ...prev,
                          eventSupportFee: e.target.value,
                        }))
                      }
                      className={inputCls}
                    />
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
                  <div>
                    <label className={labelCls}>Payment Received</label>
                    <input
                      type="number"
                      min="0"
                      value={wizard.advance}
                      onChange={(e) =>
                        setWizard((prev) => ({
                          ...prev,
                          advance: e.target.value,
                        }))
                      }
                      className={inputCls}
                      placeholder="Kitna payment mila hai"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Payment Reference ID</label>
                    <input
                      value={wizard.paymentReferenceId}
                      onChange={(e) =>
                        setWizard((prev) => ({
                          ...prev,
                          paymentReferenceId: e.target.value,
                        }))
                      }
                      className={inputCls}
                      placeholder="UTR / Txn ID / Reference"
                    />
                  </div>
                  {editingBookingId ? (
                    <div>
                      <label className={labelCls}>Payment Refund</label>
                      <input
                        type="number"
                        min="0"
                        max={wizard.advance || 0}
                        value={wizard.refundAmount}
                        onChange={(e) =>
                          setWizard((prev) => ({
                            ...prev,
                            refundAmount: e.target.value,
                          }))
                        }
                        className={inputCls}
                        placeholder="Kitna refund kiya hai"
                      />
                    </div>
                  ) : null}
                </div>

                <div>
                  <label className={labelCls}>Payment Receipt</label>
                  <div className="space-y-3 rounded-[24px] border border-slate-200/80 bg-white p-4">
                    <input
                      key={receiptInputKey}
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleReceiptUpload(e.target.files?.[0])}
                      className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white"
                    />
                    <p className="text-xs text-slate-500">
                      Optional hai. Image ya PDF receipt upload kar sakte hain.
                    </p>
                    {wizard.receiptFileName ? (
                      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                        <span className="font-semibold">{wizard.receiptFileName}</span>
                        {wizard.receiptFileDataUrl ? (
                          <a
                            href={wizard.receiptFileDataUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-cyan-700"
                          >
                            View receipt
                          </a>
                        ) : null}
                        <button
                          type="button"
                          onClick={handleRemoveReceipt}
                          className="font-semibold text-rose-600"
                        >
                          Remove
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Custom Menu Items</label>
                  <div className="space-y-4 rounded-[24px] border border-slate-200/80 bg-white p-4">
                    <div className="flex flex-col gap-3 rounded-2xl border border-cyan-100 bg-cyan-50/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-sm font-bold text-slate-900">
                          Restaurant menu se select karein
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Full restaurant menu khol kar items select kijiye, fir
                          yahin reservation form par wapas aa jayenge.
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleOpenRestaurantMenu}
                        className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2.5 text-xs font-bold text-white"
                      >
                        Open Restaurant Menu
                      </button>
                    </div>
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
                      <div className="max-h-[320px] space-y-4 overflow-y-auto pr-1">
                        {menuCategories.length ? (
                          menuCategories.map((category) => (
                            <div key={category} className="rounded-2xl border border-slate-100 p-4">
                              <div className="text-sm font-bold text-slate-900">
                                {category}
                              </div>
                              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                {(menuCatalogByCategory[category] || []).map((item) => {
                                  const isSelected =
                                    wizard.selectedCustomMenuItems.includes(item.name);

                                  return (
                                    <button
                                      key={item.id || `${category}-${item.name}`}
                                      type="button"
                                      onClick={() => toggleCustomMenuSelection(item.name)}
                                      className={`rounded-2xl border px-3 py-3 text-left text-xs font-semibold transition ${
                                        isSelected
                                          ? "border-cyan-200 bg-cyan-50 text-cyan-700"
                                          : "border-slate-200 bg-slate-50 text-slate-600 hover:border-cyan-100 hover:text-cyan-700"
                                      }`}
                                    >
                                      <span className="block text-sm font-bold">
                                        {item.name}
                                      </span>
                                      {item.price ? (
                                        <span className="mt-1 block text-xs opacity-80">
                                          {formatINR(item.price)}
                                        </span>
                                      ) : null}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
                            Restaurant menu abhi load nahi hua. Aap manual items add kar sakte hain.
                          </div>
                        )}
                      </div>

                      <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
                        <div className="text-sm font-bold text-slate-900">
                          Manual item add
                        </div>
                        <div className="flex gap-2">
                          <input
                            value={wizard.manualMenuEntry}
                            onChange={(e) =>
                              setWizard((prev) => ({
                                ...prev,
                                manualMenuEntry: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddManualMenuItem();
                              }
                            }}
                            className={inputCls}
                            placeholder="Special sweet, extra starter..."
                          />
                          <button
                            type="button"
                            onClick={handleAddManualMenuItem}
                            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white"
                          >
                            Add
                          </button>
                        </div>
                        <div className="text-xs text-slate-500">
                          Full menu se select bhi kar sakte hain aur yahan se custom item manually bhi add kar sakte hain.
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Selected items
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {wizard.selectedRestaurantMenuItems.length ||
                        [...wizard.selectedCustomMenuItems, ...wizard.manualCustomMenuItems].length ? (
                          <>
                            {wizard.selectedRestaurantMenuItems.map((item, index) => (
                              <button
                                key={`${item.name}-${index}`}
                                type="button"
                                onClick={() =>
                                  handleRemoveSelectedRestaurantMenuItem(item, index)
                                }
                                className="rounded-2xl bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700"
                              >
                                {item.name} x{item.qty} • {formatINR(item.total)} x
                              </button>
                            ))}
                            {wizard.selectedCustomMenuItems.map((item) => (
                              wizard.selectedRestaurantMenuItems.some(
                                (restaurantItem) => restaurantItem.name === item
                              ) ? null : (
                                <button
                                  key={`selected-${item}`}
                                  type="button"
                                  onClick={() => handleRemoveSelectedCustomMenuItem(item)}
                                  className="rounded-full bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700"
                                >
                                  {item} x
                                </button>
                              )
                            ))}
                            {wizard.manualCustomMenuItems.map((item) => (
                              <button
                                key={`manual-${item}`}
                                type="button"
                                onClick={() => handleRemoveManualMenuItem(item)}
                                className="rounded-full bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700"
                              >
                                {item} x
                              </button>
                            ))}
                          </>
                        ) : (
                          <div className="text-sm text-slate-500">
                            Abhi koi custom menu item select nahi hua hai.
                          </div>
                        )}
                      </div>
                      {wizard.selectedRestaurantMenuItems.length ? (
                        <div className="mt-4 flex items-center justify-between rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm">
                          <span className="font-semibold text-slate-700">
                            Selected items total
                          </span>
                          <span className="font-black text-cyan-700">
                            {formatINR(wizardTotals.customMenuCharge)}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
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
                {reservationError ? (
                  <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                    {reservationError}
                  </div>
                ) : null}
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
                        <FaUtensils className="text-cyan-600" />
                        Custom menu
                      </span>
                      <span className="font-semibold text-slate-900">
                        {formatINR(wizardTotals.customMenuCharge)}
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
                        <FaHeadset className="text-cyan-600" />
                        Event support
                      </span>
                      <span className="font-semibold text-slate-900">
                        {formatINR(wizardTotals.eventSupportCharge)}
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
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2">
                        <FaMoneyCheckAlt className="text-cyan-600" />
                        Payment received
                      </span>
                      <span className="font-semibold text-emerald-700">
                        {formatINR(wizardTotals.advance)}
                      </span>
                    </div>
                    {editingBookingId ? (
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-2">
                          <FaMoneyCheckAlt className="text-cyan-600" />
                          Payment refund
                        </span>
                        <span className="font-semibold text-amber-600">
                          {formatINR(wizard.refundAmount || 0)}
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-5 rounded-[20px] bg-slate-950 px-4 py-4 text-white">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-300">
                      Estimated total
                    </div>
                    <div className="mt-2 text-3xl font-black">
                      {formatINR(wizardTotals.grandTotal)}
                    </div>
                    <div className="mt-3 text-sm text-slate-300">
                      Bakaya: {formatINR(wizardTotals.balanceDue)}
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
                  onClick={() => handleConfirmBooking()}
                  disabled={isSavingReservation}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[22px] bg-gradient-to-r from-sky-600 to-cyan-500 px-5 py-4 text-sm font-bold text-white shadow-[0_16px_35px_rgba(14,165,233,0.24)] transition hover:-translate-y-0.5"
                >
                  <FaPaperPlane />
                  {isSavingReservation
                    ? "Saving..."
                    : editingBookingId
                    ? "Update Reservation"
                    : "Save Reservation"}
                </button>
                {editingBookingId ? (
                  <button
                    type="button"
                    onClick={() => handleConfirmBooking({ cancelAfterSave: true })}
                    disabled={isSavingReservation}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-[22px] bg-gradient-to-r from-rose-600 to-rose-500 px-5 py-4 text-sm font-bold text-white shadow-[0_16px_35px_rgba(244,63,94,0.24)] transition hover:-translate-y-0.5"
                  >
                    Cancel Booking
                  </button>
                ) : null}
              </div>
            </div>
        </ModalShell>
      )}

      {delayedShowAddHall && (
        <ModalShell
          title={editingHallId ? "Edit Hall" : "Add Hall"}
          eyebrow="Venue Setup"
          onClose={() => {
            setHallFormError("");
            setEditingHallId(null);
            setNewHall(defaultHall);
            setShowAddHall(false);
          }}
          widthClass="max-w-xl"
          heightClass="h-[min(78vh,560px)]"
        >
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
              {editingHallId ? (
                <div>
                  <label className={labelCls}>Hall Status</label>
                  <select
                    value={newHall.status || "Available"}
                    onChange={(e) =>
                      setNewHall((prev) => ({ ...prev, status: e.target.value }))
                    }
                    className={inputCls}
                  >
                    <option value="Available">Available</option>
                    <option value="Occupied">Occupied</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
              ) : null}
              <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                <span>AC enabled hall</span>
                <input
                  type="checkbox"
                  checked={newHall.is_ac}
                  onChange={(e) =>
                    setNewHall((prev) => ({ ...prev, is_ac: e.target.checked }))
                  }
                  className="h-5 w-5 accent-rose-500"
                />
              </label>
              {hallFormError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                  {hallFormError}
                </div>
              ) : null}
              <button
                type="button"
                onClick={handleAddHall}
                disabled={isAddingHall}
                className="rounded-[22px] bg-gradient-to-r from-teal-600 to-emerald-500 px-5 py-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAddingHall
                  ? editingHallId
                    ? "Updating..."
                    : "Adding..."
                  : editingHallId
                  ? "Update Hall"
                  : "Add Hall"}
              </button>
            </div>
        </ModalShell>
      )}

      {delayedDetailHall && (
        <ModalShell
          title={delayedDetailHall.name}
          eyebrow="Hall Details"
          onClose={() => setDetailHall(null)}
          widthClass="max-w-lg"
          heightClass="h-[min(72vh,520px)]"
        >
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[22px] border border-slate-200/80 bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Capacity
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900">
                  {delayedDetailHall.capacity}
                </div>
              </div>
              <div className="rounded-[22px] border border-slate-200/80 bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Rate / hour
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900">
                  {formatINR(delayedDetailHall.ratePerHour)}
                </div>
              </div>
              <div className="rounded-[22px] border border-slate-200/80 bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Cooling
                </div>
                <div className="mt-2 text-lg font-bold text-slate-900">
                  {delayedDetailHall.is_ac ? "AC Hall" : "Non-AC Hall"}
                </div>
              </div>
              <div className="rounded-[22px] border border-slate-200/80 bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Status
                </div>
                <div className="mt-2 text-lg font-bold text-slate-900">
                  {delayedDetailHall.status}
                </div>
              </div>
              {hallFormError ? (
                <div className="rounded-[22px] border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 sm:col-span-2">
                  {hallFormError}
                </div>
              ) : null}
              <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                <button
                  type="button"
                  onClick={() => handleEditHall(delayedDetailHall)}
                  className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-white"
                >
                  <FaEdit />
                  Edit Hall
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteHall(delayedDetailHall)}
                  disabled={isDeletingHall}
                  className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                >
                  <FaTrash />
                  {isDeletingHall ? "Deleting..." : "Delete Hall"}
                </button>
              </div>
          </div>
        </ModalShell>
      )}

      {delayedReservationSuccess && (
        <ModalShell
          title={delayedReservationSuccess.title || "Reservation successful"}
          eyebrow={delayedReservationSuccess.eyebrow || "Booking Confirmed"}
          onClose={() => setReservationSuccess(null)}
          widthClass="max-w-md"
          heightClass="h-auto"
        >
          <div className="space-y-5 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.24),_rgba(6,182,212,0.12)_60%,_rgba(255,255,255,0.96)_100%)] shadow-[0_18px_45px_rgba(16,185,129,0.18)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 text-xl font-black text-white">
                OK
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-lg font-black text-slate-900">
                {delayedReservationSuccess.customerName}
                {delayedReservationSuccess.subjectLabel ? " " : "'s "}
                {delayedReservationSuccess.message || "reservation has been saved."}
              </p>
              {delayedReservationSuccess.detail || delayedReservationSuccess.hallName ? (
                <p className="text-sm leading-6 text-slate-600">
                  {delayedReservationSuccess.hallName ? (
                    <span className="font-semibold text-slate-900">
                      {delayedReservationSuccess.hallName}
                    </span>
                  ) : null}
                  {delayedReservationSuccess.hallName && delayedReservationSuccess.date
                    ? " ke liye "
                    : delayedReservationSuccess.hallName && delayedReservationSuccess.detail
                    ? " • "
                    : ""}
                  {delayedReservationSuccess.date ? (
                    <span className="font-semibold text-slate-900">
                      {delayedReservationSuccess.date}
                    </span>
                  ) : null}
                  {delayedReservationSuccess.detail && !delayedReservationSuccess.date
                    ? delayedReservationSuccess.detail
                    : ""}
                  {delayedReservationSuccess.date
                    ? " par status successfully update ho gaya hai."
                    : ""}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setReservationSuccess(null)}
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-teal-600 to-emerald-500 px-6 py-3 text-sm font-bold text-white shadow-[0_16px_35px_rgba(16,185,129,0.24)] transition hover:-translate-y-0.5"
            >
              Continue
            </button>
          </div>
        </ModalShell>
      )}

      {delayedShowBill && selectedBooking && (
        <ModalShell
          title="Banquet Bill"
          eyebrow="Invoice View"
          onClose={() => setShowBill(false)}
          widthClass="max-w-4xl"
          heightClass="h-[min(88vh,780px)]"
        >
            <BanquetBill
              booking={selectedBooking}
              halls={halls}
              menuPackages={pricingConfig.menuPackages}
              lightingOptions={pricingConfig.lightingOptions}
              formatINR={formatINR}
            />
        </ModalShell>
      )}

      {delayedSelectedMenuPackage && (
        <ModalShell
          title={delayedSelectedMenuPackage.name}
          eyebrow="Banquet Menu Details"
          onClose={() => setSelectedMenuPackage(null)}
          widthClass="max-w-2xl"
          heightClass="h-[min(78vh,620px)]"
        >
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-600">
                Package Pricing
              </div>
              <div className="mt-4 max-w-xs">
                <label className={labelCls}>Per Guest Price</label>
                <input
                  type="number"
                  min="0"
                  value={delayedSelectedMenuPackage.perGuest}
                  onChange={(e) => {
                    handleMenuPriceChange(
                      delayedSelectedMenuPackage.id,
                      e.target.value
                    );
                    setSelectedMenuPackage((prev) =>
                      prev
                        ? {
                            ...prev,
                            perGuest: Number(e.target.value) || 0,
                          }
                        : prev
                    );
                  }}
                  className={inputCls}
                />
              </div>
              <p className="mt-5 text-base leading-7 text-slate-600">
                {delayedSelectedMenuPackage.description}
              </p>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Included Highlights
                </div>
                <div className="mt-4 space-y-3">
                  {delayedSelectedMenuPackage.highlights.map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-700"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-cyan-100 bg-[linear-gradient(180deg,#ecfeff_0%,#f8fafc_100%)] p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
                  Meal Type
                </div>
                <div className="mt-3 text-lg font-bold text-slate-900">
                  {delayedSelectedMenuPackage.mealLabel}
                </div>
                <div className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
                  Available Sections
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {mealSections.map((section) => (
                    <span
                      key={section}
                      className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                    >
                      {section}
                    </span>
                  ))}
                </div>
              </div>
            </div>
        </ModalShell>
      )}
    </div>
  );
};

export default Banquet;
