import React, { useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FiFileText, FiHome, FiPlusCircle, FiSearch, FiTrendingUp } from "react-icons/fi";

import API from "../../api";
import RestaurantContext from "../../Context/restaurantContext";
import { restaurantService } from "../../services/restaurantService";
import {
  expandBookings,
  getRoomBookingReference,
  getRoomBookingForDate,
  mergeBookingsWithRooms,
  normalizeRooms,
  todayISO,
} from "../Dashboard/stayoverUtils";

const ACTIVE_INVOICE_KEY = "restaurant-active-invoice";
const SAVED_INVOICE_KEY = "restaurant-saved-invoice";
const ROOM_PAGE_SIZE = 9;
const normalizeInvoiceStatus = (value) => String(value || "").trim().toLowerCase();
const isSettledInvoiceStatus = (value) => {
  const normalized = normalizeInvoiceStatus(value);
  return normalized === "paid" || normalized === "posted to room";
};
const getReusableBill = (bill) => (isSettledInvoiceStatus(bill?.invoiceStatus) ? null : bill);
const createBillLookupKey = (entityType, tableName, tokenId) =>
  tokenId
    ? `${String(entityType || "Table").toLowerCase()}:token:${Number(tokenId)}`
    : `${String(entityType || "Table").toLowerCase()}:table:${String(tableName || "").trim()}`;

const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;

const formatShortDate = (value) => {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);
  return parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const isOccupiedRoomStatus = (room) =>
  String(room.status || room.hotelStatus || "").toLowerCase() === "occupied";

const Roomitem = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSelectedTable } = useContext(RestaurantContext);

  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tokenSnapshots, setTokenSnapshots] = useState({});
  const [billByRoom, setBillByRoom] = useState({});
  const [roomPage, setRoomPage] = useState(1);

  const [search, setSearch] = useState("");
  const [menuItems, setMenuItems] = useState([]);
  const [addonForms, setAddonForms] = useState({});

  const focusRoomNo = String(location.state?.focusRoomNo || "");

  /* ---------- data loading (unchanged: real rooms + bookings from the same
     /housekeeping + /hotel/all-bookings endpoints BookingFlow.jsx uses) ---------- */

  const loadRooms = async () => {
    try {
      setLoading(true);
      const [roomsResponse, bookingsResponse] = await Promise.all([
        API.get("/housekeeping"),
        API.get("/hotel/all-bookings"),
      ]);
      setRooms(normalizeRooms(roomsResponse.data));
      setBookings(expandBookings(bookingsResponse.data));
    } catch (error) {
      console.error(error);
      alert("Hotel room data load nahi ho paaya.");
      setRooms([]);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  useEffect(() => {
    const loadBills = async () => {
      try {
        const response = await API.get("/restaurant/bills");
        const latestByRoom = {};
        (Array.isArray(response.data) ? response.data : []).forEach((bill) => {
          const key = createBillLookupKey(bill.entityType, bill.tableNumber, bill.tokenId);
          if (!latestByRoom[key] || Number(bill.id || 0) > Number(latestByRoom[key].id || 0)) {
            latestByRoom[key] = bill;
          }
        });
        setBillByRoom(latestByRoom);
      } catch (error) {
        console.error("Failed to load room bills:", error);
        setBillByRoom({});
      }
    };

    loadBills();
    window.addEventListener("tokenUpdated", loadBills);
    return () => window.removeEventListener("tokenUpdated", loadBills);
  }, []);

  const mergedBookings = useMemo(() => mergeBookingsWithRooms(bookings, rooms), [bookings, rooms]);
  const today = todayISO();

  const getBookingForRoom = (room) =>
    getRoomBookingForDate(room.roomNo, today, mergedBookings, false) ||
    getRoomBookingReference(room.roomNo, today, mergedBookings);

  const occupiedRooms = useMemo(() => rooms.filter(isOccupiedRoomStatus), [rooms]);

  // Menu items for the inline "Add-on" quick-add dropdown on each occupied
  // room card. Uses the same restaurantService.getMenu() endpoint that
  // MenuPage.jsx uses (GET /restaurant/menu?tableNumber=...), so the data
  // structure is identical.  Placed after occupiedRooms so the closure can
  // safely reference it.
  useEffect(() => {
    let active = true;
    const loadMenu = async () => {
      try {
        // Pass the first occupied room's number as tableNumber so the
        // backend returns the full shared menu. Fall back to "1" if no
        // rooms are loaded yet.
        const tableNumber = occupiedRooms.length ? String(occupiedRooms[0].roomNo) : "1";
        const data = await restaurantService.getMenu(tableNumber);
        if (!active) return;
        const list = Array.isArray(data) ? data : data?.data || [];
        setMenuItems(
          list.map((item) => ({
            id: item.id,
            name: item.name || item.item_name || "Menu Item",
            price: Number(item.price ?? item.rate ?? 0),
          })),
        );
      } catch (error) {
        console.error("Failed to load menu items:", error);
        if (active) setMenuItems([]);
      }
    };
    loadMenu();
    return () => {
      active = false;
    };
  }, [occupiedRooms]);

  const roomCards = useMemo(
    () =>
      rooms
        .map((room) => {
          const occupied = isOccupiedRoomStatus(room);
          const booking = occupied ? getBookingForRoom(room) : null;
          return { room, booking, occupied };
        })
        .filter(({ occupied }) => occupied), // show only occupied rooms
    [rooms, mergedBookings, today],
  );

  const filteredRoomCards = useMemo(() => {
    const q = search.trim().toLowerCase();
    return roomCards.filter(({ room, booking }) => {
      if (!q) return true;
      const guestName = String(room.guest || booking?.guestName || "").toLowerCase();
      return String(room.roomNo).toLowerCase().includes(q) || guestName.includes(q);
    });
  }, [roomCards, search]);

  const totalRoomPages = Math.max(1, Math.ceil(filteredRoomCards.length / ROOM_PAGE_SIZE));
  const paginatedCards = useMemo(
    () => filteredRoomCards.slice((roomPage - 1) * ROOM_PAGE_SIZE, roomPage * ROOM_PAGE_SIZE),
    [filteredRoomCards, roomPage],
  );
  const visibleRoomStart = filteredRoomCards.length ? (roomPage - 1) * ROOM_PAGE_SIZE + 1 : 0;
  const visibleRoomEnd = Math.min(roomPage * ROOM_PAGE_SIZE, filteredRoomCards.length);

  useEffect(() => {
    setRoomPage(1);
  }, [search]);

  useEffect(() => {
    if (roomPage > totalRoomPages) {
      setRoomPage(totalRoomPages);
    }
  }, [roomPage, totalRoomPages]);

  /* ---------- token snapshots for occupied rooms (kept same shape as before) ---------- */

  const refreshTokenSnapshots = async (roomsToLoad) => {
    if (!roomsToLoad.length) {
      setTokenSnapshots({});
      return;
    }

    try {
      const entries = await Promise.all(
        roomsToLoad.map(async (room) => {
          const roomRef = String(room.roomNo);
          const tokenRes = await API.get(`/token/table/${roomRef}`);
          const tokenId = tokenRes.data?.id || null;
          const tokenCode = tokenRes.data?.token_code || tokenRes.data?.tokenCode || null;

          if (!tokenId) {
            return [roomRef, { tokenId: null, tokenCode: null, items: [] }];
          }

          const itemsRes = await API.get(`/token/items/${tokenId}`);
          return [roomRef, { tokenId, tokenCode, items: itemsRes.data || [] }];
        }),
      );

      setTokenSnapshots(Object.fromEntries(entries));
    } catch (error) {
      console.error("Failed to load room token snapshots:", error);
      setTokenSnapshots({});
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!active) return;
      await refreshTokenSnapshots(occupiedRooms);
    };
    load();
    window.addEventListener("tokenUpdated", load);
    return () => {
      active = false;
      window.removeEventListener("tokenUpdated", load);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [occupiedRooms]);

  /* ---------- stats ---------- */

  const pendingBillTotal = useMemo(() => {
    return occupiedRooms.reduce((sum, room) => {
      const roomRef = String(room.roomNo);
      const snapshot = tokenSnapshots[roomRef];
      const items = snapshot?.items || [];

      if (items.length) {
        const subtotal = items.reduce(
          (itemSum, item) => itemSum + Number(item.qty || 0) * Number(item.rate || 0),
          0,
        );
        return sum + subtotal + subtotal * 0.05;
      }

      const bill = billByRoom[createBillLookupKey("Room", roomRef, snapshot?.tokenId || null)];
      if (bill && !isSettledInvoiceStatus(bill.invoiceStatus)) {
        return sum + Number(bill.total || 0);
      }
      return sum;
    }, 0);
  }, [occupiedRooms, tokenSnapshots, billByRoom]);

  /* ---------- add room ---------- */

  const addRoom = async (explicitRoomNo) => {
    const value = String(explicitRoomNo || "").trim();
    if (!value) {
      alert("Enter Room Number");
      return;
    }

    const exists = rooms.some((room) => String(room.roomNo) === value);
    if (exists) {
      alert("Room already exists");
      return;
    }

    try {
      await API.post("/housekeeping", {
        roomNumber: value,
        roomNo: value,
        status: "Vacant Dirty",
        assignee: "No Housekeeper",
      });
      loadRooms();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Room add nahi ho paaya.");
    }
  };

  const handleAddRoomClick = () => {
    const value = window.prompt("Enter new room number");
    if (value) addRoom(value);
  };

  /* ---------- inline add-on (per-card quick add) ---------- */

  const updateAddonForm = (roomNo, patch) => {
    setAddonForms((current) => ({
      ...current,
      [roomNo]: {
        open: false,
        menuItemId: "",
        qty: 1,
        submitting: false,
        ...current[roomNo],
        ...patch,
      },
    }));
  };

  const toggleAddonForm = (roomNo) => {
    setAddonForms((current) => {
      const existing = current[roomNo] || { open: false, menuItemId: "", qty: 1, submitting: false };
      return { ...current, [roomNo]: { ...existing, open: !existing.open } };
    });
  };

  const handleAddToBill = async (room) => {
    const roomRef = String(room.roomNo);
    const form = addonForms[roomRef];
    const menuItem = menuItems.find((item) => String(item.id) === String(form?.menuItemId));
    if (!menuItem) {
      alert("Menu item select kijiye.");
      return;
    }
    const qty = Math.max(1, Number(form?.qty || 1));
    const lineTotal = menuItem.price * qty;

    // Get the active booking so we can post to the folio
    const booking = getBookingForRoom(room);
    const bookingId = booking?.bookingId || null;

    updateAddonForm(roomRef, { submitting: true });
    try {
      let snapshot = tokenSnapshots[roomRef];
      let tokenId = snapshot?.tokenId;

      if (!tokenId) {
        // NOTE: adjust this endpoint/payload if your backend's token-create route differs.
        const createdToken = await API.post("/token/create", {
          tableNumber: roomRef,
          waiter: "Room Service",
        });
        tokenId = createdToken.data?.tokenId || null;
      }

      if (!tokenId) {
        throw new Error("Token create nahi ho paaya.");
      }

      // NOTE: adjust this endpoint/payload if your backend's add-item route differs.
      await API.post("/token/item", {
        tokenId,
        name: menuItem.name,
        qty,
        rate: menuItem.price,
      });

      const [itemsRes, tokenRes] = await Promise.all([
        API.get(`/token/items/${tokenId}`),
        API.get(`/token/table/${roomRef}`),
      ]);

      setTokenSnapshots((current) => ({
        ...current,
        [roomRef]: {
          tokenId,
          tokenCode: tokenRes.data?.token_code || tokenRes.data?.tokenCode || snapshot?.tokenCode || null,
          items: itemsRes.data || [],
        },
      }));

      // Also post to the hotel folio so it appears in FolioView.jsx for this guest
      if (bookingId) {
        try {
          const today = new Date().toISOString().slice(0, 10);
          await API.post(`/hotel/folio/${bookingId}`, {
            entry_date: today,
            entry_type: "Extra Charge",
            category: "Room Service",
            description: `${menuItem.name} x${qty}`,
            amount: lineTotal,
            created_by: "Room Service",
          });
          // Notify FolioView to reload if it's open
          window.dispatchEvent(new Event("folioUpdated"));
        } catch (folioErr) {
          // Non-fatal — token item already saved, just log the folio error
          console.warn("Folio post failed (non-fatal):", folioErr);
        }
      }

      updateAddonForm(roomRef, { open: false, menuItemId: "", qty: 1, submitting: false });
      window.dispatchEvent(new Event("tokenUpdated"));
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || error.message || "Add-on add nahi ho paaya.");
      updateAddonForm(roomRef, { submitting: false });
    }
  };

  /* ---------- navigation / invoice / pay-now (unchanged logic) ---------- */

  const openRoomFlow = (room, target = "token") => {
    setSelectedTable(room.roomNo);
    const state = {
      entityType: "Room",
      roomData: room,
    };

    if (target === "items") {
      navigate(`/restaurant/token-items/${room.roomNo}`, { state });
      return;
    }

    navigate(`/restaurant/token/${room.roomNo}`, { state });
  };

  const openRoomInvoice = async (room) => {
    const roomRef = String(room.roomNo);
    const snapshot = tokenSnapshots[roomRef];
    const items = snapshot?.items || [];
    const relatedBill = getReusableBill(
      billByRoom[createBillLookupKey("Room", roomRef, snapshot?.tokenId || null)] || null,
    );
    const activeBooking = getBookingForRoom(room);
    const customerName = relatedBill?.customerName || room.guest || activeBooking?.guestName || "Walk-in Customer";
    const phone = relatedBill?.phone || activeBooking?.mobile || "";

    if (!items.length) {
      return;
    }

    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.qty || 0) * Number(item.rate || 0),
      0,
    );
    const gst = subtotal * 0.05;
    const total = subtotal + gst;

    const invoicePayload = {
      table: roomRef,
      tokenId: snapshot.tokenId,
      tokenCode: snapshot.tokenCode || null,
      items: items.map((item) => ({
        id: item.id,
        name: item.item_name,
        qty: Number(item.qty),
        rate: Number(item.rate),
      })),
      subtotal,
      gst,
      total,
      date: new Date().toISOString(),
      entityType: "Room",
      billId: relatedBill?.id || null,
      invoiceStatus: relatedBill?.invoiceStatus || null,
      customerName,
      phone,
      paymentMethod: relatedBill?.paymentMethod || "Cash",
      discountAmount: Number(relatedBill?.discountAmount || 0),
      splitCount: Number(relatedBill?.split_count || 1),
      personCount: Number(relatedBill?.split_count || 1),
      bookingId: activeBooking?.bookingId || null,
      bookingCode: activeBooking?.bookingCode || "",
      roomData: room,
    };

    try {
      const response = await restaurantService.createBill({
        ...invoicePayload,
        tokenId: snapshot?.tokenId || null,
        invoiceStatus: "Generated",
        paymentMethod: null,
      });
      const persistedInvoice = {
        ...invoicePayload,
        billId: response?.id || invoicePayload.billId || null,
        invoiceStatus: response?.bill?.invoiceStatus || "Generated",
      };
      localStorage.setItem(ACTIVE_INVOICE_KEY, JSON.stringify(persistedInvoice));
      localStorage.setItem(SAVED_INVOICE_KEY, JSON.stringify(persistedInvoice));
      window.dispatchEvent(new Event("tokenUpdated"));
      navigate("/restaurant/payment", { state: persistedInvoice });
    } catch (error) {
      alert(error.response?.data?.message || "Invoice create nahi ho paaya.");
    }
  };

  const openPayNow = (room) => {
    const roomRef = String(room.roomNo);
    const snapshot = tokenSnapshots[roomRef];
    const items = snapshot?.items || [];
    const relatedBill = items.length
      ? getReusableBill(billByRoom[createBillLookupKey("Room", roomRef, snapshot?.tokenId || null)] || null)
      : billByRoom[createBillLookupKey("Room", roomRef, snapshot?.tokenId || null)] || null;
    const activeBooking = getBookingForRoom(room);
    const subtotal = items.length
      ? items.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.rate || 0), 0)
      : Number(relatedBill?.subtotal || 0);
    const gst = items.length ? subtotal * 0.05 : Number(relatedBill?.gst || 0);
    const discountAmount = Number(relatedBill?.discountAmount || 0);
    const total = items.length ? subtotal + gst - discountAmount : Number(relatedBill?.total || 0);

    navigate(`/restaurant/pay-now/${roomRef}`, {
      state: {
        table: roomRef,
        tokenId: snapshot?.tokenId || null,
        tokenCode: snapshot?.tokenCode || null,
        waiterName: "Room Service",
        items: items.map((item) => ({
          id: item.id,
          name: item.item_name,
          qty: Number(item.qty),
          rate: Number(item.rate),
        })),
        subtotal,
        gst,
        total,
        date: relatedBill?.created_at || new Date().toISOString(),
        entityType: "Room",
        billId: relatedBill?.id || null,
        invoiceStatus: relatedBill?.invoiceStatus || null,
        customerName: relatedBill?.customerName || room.guest || activeBooking?.guestName || "Walk-in Customer",
        phone: relatedBill?.phone || activeBooking?.mobile || "",
        paymentMethod: relatedBill?.paymentMethod || "Cash",
        discountAmount,
        splitCount: Number(relatedBill?.split_count || 1),
        personCount: Number(relatedBill?.split_count || 1),
        bookingId: activeBooking?.bookingId || null,
        bookingCode: activeBooking?.bookingCode || "",
        roomData: room,
      },
    });
  };

  const openCheckIn = (room) => {
    // Hands off to BookingFlow's "New Booking" screen (mounted at /hotel/guest),
    // which is where real guest + stay data actually gets created.
    navigate("/hotel/guest", { state: { focusRoomNo: room.roomNo } });
  };

  /* ---------- render ---------- */

  return (
    <div className="bg-gradient-to-br from-slate-100 via-white to-slate-100 min-h-screen p-4 sm:p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-slate-900">Room Dashboard</h2>
        <p className="mt-1 text-sm text-slate-500">
          Every room, its guest, and its running bill — add an add-on and the total updates instantly.
        </p>
      </div>

      {/* ---------- stat cards ---------- */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Total Rooms</div>
            <div className="mt-1 text-3xl font-black text-slate-900">{rooms.length}</div>
          </div>
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <FiHome size={18} />
          </span>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Occupied</div>
            <div className="mt-1 text-3xl font-black text-slate-900">{occupiedRooms.length}</div>
          </div>
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <FiFileText size={18} />
          </span>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Pending Bill Total</div>
            <div className="mt-1 text-3xl font-black text-slate-900">{formatCurrency(pendingBillTotal)}</div>
          </div>
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <FiTrendingUp size={18} />
          </span>
        </div>
      </div>

      {/* ---------- search + add room ---------- */}
      <div className="mb-6 flex flex-col items-stretch gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search room no. or guest name"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <button
          type="button"
          onClick={handleAddRoomClick}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:shadow-md"
        >
          <FiPlusCircle /> Add Room
        </button>
      </div>

      {/* ---------- room card grid ---------- */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Loading hotel rooms...
          </div>
        ) : paginatedCards.length ? (
          paginatedCards.map(({ room, booking, occupied }) => {
            const roomRef = String(room.roomNo);
            const isFocused = focusRoomNo && roomRef === focusRoomNo;
            const snapshot = tokenSnapshots[roomRef] || { tokenId: null, tokenCode: null, items: [] };
            const items = snapshot.items || [];
            const hasMenuItems = items.length > 0;
            const itemsTotal = items.reduce(
              (sum, item) => sum + Number(item.qty || 0) * Number(item.rate || 0),
              0,
            );
            const relatedBill = billByRoom[createBillLookupKey("Room", roomRef, snapshot.tokenId || null)] || null;
            const showPayNow = Boolean(relatedBill) && !isSettledInvoiceStatus(relatedBill.invoiceStatus);
            const guestName = room.guest || booking?.guestName || "Guest";
            const checkInLabel = formatShortDate(room.checkIn || booking?.checkIn);
            const checkOutLabel = formatShortDate(room.checkOut || booking?.checkOut);
            const addonForm = addonForms[roomRef] || { open: false, menuItemId: "", qty: 1, submitting: false };

            return (
              <div
                key={`${room.roomId}-${room.roomNo}`}
                className={`rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md ${
                  isFocused ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-lg font-black text-slate-900">Room {room.roomNo}</div>
                    <div className="text-xs font-medium text-slate-400">
                      {room.categoryName || room.roomType || "Hotel Room"}
                    </div>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-[11px] font-bold ${
                      occupied ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                    }`}
                  >
                    <span
                      className={`mr-1.5 h-1.5 w-1.5 rounded-full ${occupied ? "bg-amber-500" : "bg-emerald-500"}`}
                    />
                    {occupied ? "Occupied" : "Vacant"}
                  </span>
                </div>

                {occupied ? (
                  <>
                    <div className="mt-3">
                      <div className="text-sm font-bold text-slate-800">{guestName}</div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {checkInLabel} → {checkOutLabel}
                      </div>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 px-3 py-3">
                      {hasMenuItems ? (
                        <div className="space-y-1.5">
                          {items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between text-[13px] text-slate-700">
                              <span>
                                {item.item_name} x{item.qty}
                              </span>
                              <span className="font-semibold">
                                {formatCurrency(Number(item.qty || 0) * Number(item.rate || 0))}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[13px] text-slate-400">No items added yet</div>
                      )}
                      <div className="mt-2 flex items-center justify-between border-t border-dashed border-slate-200 pt-2 text-[13px] font-black text-slate-900">
                        <span>Total</span>
                        <span>{formatCurrency(itemsTotal)}</span>
                      </div>
                    </div>

                    {addonForm.open ? (
                      <div className="mt-3 space-y-2">
                        <div className="flex gap-2">
                          <select
                            value={addonForm.menuItemId}
                            onChange={(e) => updateAddonForm(roomRef, { menuItemId: e.target.value })}
                            className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[12.5px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                          >
                            <option value="">Select item</option>
                            {menuItems.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name} — {formatCurrency(item.price)}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min="1"
                            value={addonForm.qty}
                            onChange={(e) =>
                              updateAddonForm(roomRef, { qty: Math.max(1, Number(e.target.value || 1)) })
                            }
                            className="w-16 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-[12.5px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddToBill(room)}
                          disabled={addonForm.submitting || !addonForm.menuItemId}
                          className="w-full rounded-lg bg-blue-600 px-3 py-2 text-[12.5px] font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {addonForm.submitting ? "Adding..." : "Add to Bill"}
                        </button>
                      </div>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => toggleAddonForm(roomRef)}
                        className="flex-1 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 px-3 py-2.5 text-[12.5px] font-bold text-white shadow-sm transition hover:shadow-md"
                      >
                        + Add-on
                      </button>
                      <button
                        type="button"
                        onClick={() => openRoomInvoice(room)}
                        disabled={!hasMenuItems}
                        className="flex-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2.5 text-[12.5px] font-bold text-white shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Create Invoice
                      </button>
                    </div>

                    {showPayNow ? (
                      <button
                        type="button"
                        onClick={() => openPayNow(room)}
                        className="mt-2 w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12.5px] font-bold text-emerald-700 transition hover:bg-emerald-100"
                      >
                        Pay Now
                      </button>
                    ) : null}

                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] font-semibold text-slate-400">
                      <button type="button" onClick={() => openRoomFlow(room, "token")} className="hover:text-slate-600">
                        + Token
                      </button>
                      <button type="button" onClick={() => openRoomFlow(room, "items")} className="hover:text-slate-600">
                        Room Items
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="mt-4">
                    <div className="text-[13px] text-slate-400">Ready for check-in.</div>
                    <button
                      type="button"
                      onClick={() => openCheckIn(room)}
                      className="mt-3 w-full rounded-full border border-slate-200 bg-white px-3 py-2.5 text-[12.5px] font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                      Check-in Guest
                    </button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
            No rooms match your search.
          </div>
        )}
      </div>

      {/* ---------- pagination ---------- */}
      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="text-sm text-slate-500">
          Showing <span className="font-semibold text-slate-900">{visibleRoomStart}</span>-
          <span className="font-semibold text-slate-900">{visibleRoomEnd}</span> of{" "}
          <span className="font-semibold text-slate-900">{filteredRoomCards.length}</span> rooms
        </div>

        {totalRoomPages > 1 ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setRoomPage((current) => Math.max(1, current - 1))}
              disabled={roomPage === 1}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-sky-200 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>

            {Array.from({ length: totalRoomPages }, (_, index) => index + 1).map((pageNumber) => {
              const isActive = pageNumber === roomPage;
              return (
                <button
                  key={`room-page-${pageNumber}`}
                  type="button"
                  onClick={() => setRoomPage(pageNumber)}
                  className={`h-10 min-w-10 rounded-full px-3 text-sm font-bold transition ${
                    isActive
                      ? "bg-slate-900 text-white shadow-[0_12px_24px_rgba(15,23,42,0.14)]"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:text-sky-700"
                  }`}
                >
                  {pageNumber}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setRoomPage((current) => Math.min(totalRoomPages, current + 1))}
              disabled={roomPage === totalRoomPages}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-sky-200 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Roomitem;