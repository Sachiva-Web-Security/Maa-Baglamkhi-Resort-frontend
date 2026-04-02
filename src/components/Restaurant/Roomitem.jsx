import React, { useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FiFileText, FiHome, FiPlusCircle } from "react-icons/fi";

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
const normalizeInvoiceStatus = (value) => String(value || "").trim().toLowerCase();
const getReusableBill = (bill) => (normalizeInvoiceStatus(bill?.invoiceStatus) === "paid" ? null : bill);
const createBillLookupKey = (entityType, tableName, tokenId) =>
  tokenId
    ? `${String(entityType || "Table").toLowerCase()}:token:${Number(tokenId)}`
    : `${String(entityType || "Table").toLowerCase()}:table:${String(tableName || "").trim()}`;

const Roomitem = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSelectedTable } = useContext(RestaurantContext);
  const [roomNo, setRoomNo] = useState("");
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tokenSnapshots, setTokenSnapshots] = useState({});
  const [billByRoom, setBillByRoom] = useState({});

  const focusRoomNo = String(location.state?.focusRoomNo || "");

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

  const addRoom = async () => {
    if (!roomNo.trim()) {
      alert("Enter Room Number");
      return;
    }

    const exists = rooms.some((room) => String(room.roomNo) === String(roomNo));
    if (exists) {
      alert("Room already exists");
      return;
    }

    try {
      await API.post("/housekeeping", {
        roomNumber: roomNo,
        roomNo,
        status: "Vacant Dirty",
        assignee: "No Housekeeper",
      });
      setRoomNo("");
      loadRooms();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Room add nahi ho paaya.");
    }
  };

  const occupiedCount = useMemo(
    () =>
      rooms.filter((room) => String(room.status || room.hotelStatus || "").toLowerCase() === "occupied").length,
    [rooms],
  );
  const mergedBookings = useMemo(() => mergeBookingsWithRooms(bookings, rooms), [bookings, rooms]);
  const today = todayISO();
  const isActiveBooking = (status) => {
    const normalized = String(status || "").toLowerCase();
    return (
      normalized.includes("confirmed") ||
      normalized.includes("booked") ||
      normalized.includes("reserved") ||
      normalized.includes("checked in") ||
      normalized.includes("check in") ||
      normalized.includes("occupied")
    );
  };

  const activeRoomCards = useMemo(
    () =>
      rooms
        .map((room) => {
          const activeBooking = getRoomBookingForDate(room.roomNo, today, mergedBookings, false);
          return { room, booking: activeBooking };
        })
        .filter(({ room, booking }) => {
          const roomStatus = String(room.status || room.hotelStatus || "").toLowerCase();
          return (
            Boolean(booking) &&
            roomStatus === "occupied" &&
            isActiveBooking(booking.bookingStatus) &&
            booking.bookingStatus &&
            !String(booking.bookingStatus).toLowerCase().includes("cleaning")
          );
        }),
    [rooms, mergedBookings, today],
  );

  useEffect(() => {
    const loadTokenSnapshots = async () => {
      if (!activeRoomCards.length) {
        setTokenSnapshots({});
        return;
      }

      try {
        const entries = await Promise.all(
          activeRoomCards.map(async ({ room }) => {
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

    loadTokenSnapshots();
  }, [activeRoomCards]);

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
    const activeBooking =
      getRoomBookingForDate(room.roomNo, today, mergedBookings, false) ||
      getRoomBookingReference(room.roomNo, today, mergedBookings);
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
    const activeBooking =
      getRoomBookingForDate(room.roomNo, today, mergedBookings, false) ||
      getRoomBookingReference(room.roomNo, today, mergedBookings);
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

  return (
    <div className="bg-gradient-to-br from-slate-100 via-white to-slate-100 min-h-screen p-6">
      <div className="rounded-3xl bg-white shadow-[0_18px_40px_rgba(15,23,42,0.12)] border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-900 via-blue-800 to-cyan-700 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <p className="uppercase text-xs tracking-[0.28em] text-white/70">Front Office</p>
            <h2 className="text-2xl font-bold">Room Dashboard</h2>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm text-white/80">
            <span className="px-3 py-1 rounded-full bg-white/15 border border-white/25">Rooms - Tokens - Billing</span>
          </div>
        </div>

        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              placeholder="Enter Room No"
              value={roomNo}
              onChange={(e) => setRoomNo(e.target.value)}
              className="flex-1 border border-slate-200 p-3 rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <button
              onClick={addRoom}
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-5 py-3 rounded-xl font-semibold shadow-md hover:shadow-lg transition"
            >
              <FiPlusCircle />
              Add Room
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <div className="rounded-2xl border border-slate-200 bg-blue-50 p-4 flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-white text-blue-600 flex items-center justify-center text-xl border border-blue-100">
                <FiHome />
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Total Rooms</p>
                <p className="text-2xl font-bold text-slate-900">{rooms.length}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-amber-50 p-4 flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-white text-amber-600 flex items-center justify-center text-xl border border-amber-100">
                <FiFileText />
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Occupied Hotel Rooms</p>
                <p className="text-2xl font-bold text-slate-900">{occupiedCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? <div className="mt-6 text-sm text-slate-500">Loading hotel rooms...</div> : null}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 mt-6">
        {activeRoomCards.map(({ room, booking }) => {
          const hotelStatus = String(room.hotelStatus || room.status || "");
          const isFocused = focusRoomNo && String(room.roomNo) === focusRoomNo;
          const guestName = room.guest || booking?.guestName || "No active guest";
          const stayCheckIn = room.checkIn || booking?.checkIn || "--";
          const stayCheckOut = room.checkOut || booking?.checkOut || "--";
          const hasMenuItems = (tokenSnapshots[String(room.roomNo)]?.items || []).length > 0;
          const relatedBill =
            billByRoom[
              createBillLookupKey("Room", String(room.roomNo), tokenSnapshots[String(room.roomNo)]?.tokenId || null)
            ] || null;
          const showPayNow = relatedBill && String(relatedBill.invoiceStatus || "").toLowerCase() !== "paid";
          return (
            <div
              key={`${room.roomId}-${room.roomNo}`}
              className={`rounded-3xl border bg-white shadow-[0_10px_30px_rgba(15,23,42,0.12)] transition ${
                isFocused
                  ? "border-blue-400 ring-2 ring-blue-200 shadow-[0_18px_44px_rgba(59,130,246,0.18)]"
                  : "border-slate-100 hover:shadow-[0_18px_44px_rgba(59,130,246,0.18)]"
              }`}
            >
              <div className="p-4 space-y-2">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <div className="font-semibold text-slate-900 text-lg">Room {room.roomNo}</div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {room.categoryName || "Hotel Room"}
                    </div>
                    <div className="text-xs text-slate-500">ID {room.roomId || "--"}</div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide border ${
                      hotelStatus.toLowerCase() === "occupied"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}
                  >
                  {hotelStatus || "Available"}
                  </span>
                </div>

                <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
                  <div>Guest: {guestName}</div>
                  <div>Stay: {stayCheckIn} to {stayCheckOut}</div>
                </div>
              </div>

              <div className="px-4 pb-4 flex flex-col gap-2.5">
                <button
                  className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-2.5 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition"
                  onClick={() => openRoomFlow(room, "token")}
                >
                  + Token
                </button>

                {hasMenuItems ? (
                  <button
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition"
                    onClick={() => openRoomInvoice(room)}
                  >
                    Create Invoice
                  </button>
                ) : null}

                {showPayNow ? (
                  <button
                    className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white py-2.5 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition"
                    onClick={() => openPayNow(room)}
                  >
                    Pay Now
                  </button>
                ) : null}

                <button
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-2.5 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition"
                  onClick={() => openRoomFlow(room, "items")}
                >
                  Room Items
                </button>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default Roomitem;
