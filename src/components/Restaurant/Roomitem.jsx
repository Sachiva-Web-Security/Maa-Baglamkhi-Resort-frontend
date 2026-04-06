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
const ROOM_PAGE_SIZE = 6;
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
  const [roomPage, setRoomPage] = useState(1);

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

  const totalRoomPages = Math.max(1, Math.ceil(activeRoomCards.length / ROOM_PAGE_SIZE));
  const paginatedRooms = useMemo(
    () =>
      activeRoomCards.slice(
        (roomPage - 1) * ROOM_PAGE_SIZE,
        roomPage * ROOM_PAGE_SIZE,
      ),
    [activeRoomCards, roomPage],
  );
  const visibleRoomStart = activeRoomCards.length ? (roomPage - 1) * ROOM_PAGE_SIZE + 1 : 0;
  const visibleRoomEnd = Math.min(roomPage * ROOM_PAGE_SIZE, activeRoomCards.length);

  useEffect(() => {
    if (roomPage > totalRoomPages) {
      setRoomPage(totalRoomPages);
    }
  }, [roomPage, totalRoomPages]);

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

      <div className="mt-6 overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
        <div className="border-b border-slate-100 px-6 py-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-500">Room Service Board</div>
          <h3 className="mt-2 text-2xl font-black text-slate-900">Occupied rooms in data table view</h3>
          <p className="mt-1 text-sm text-slate-500">
            Room, guest stay, token readiness, aur billing actions ko ek hi table layout me manage kariye.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1180px] w-full border-collapse">
            <thead className="bg-slate-50">
              <tr className="text-left">
                <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Room</th>
                <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Status</th>
                <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Guest</th>
                <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Stay</th>
                <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Token</th>
                <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Billing</th>
                <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRooms.length ? (
                paginatedRooms.map(({ room, booking }) => {
                  const hotelStatus = String(room.hotelStatus || room.status || "");
                  const isFocused = focusRoomNo && String(room.roomNo) === focusRoomNo;
                  const guestName = room.guest || booking?.guestName || "No active guest";
                  const stayCheckIn = room.checkIn || booking?.checkIn || "--";
                  const stayCheckOut = room.checkOut || booking?.checkOut || "--";
                  const snapshot = tokenSnapshots[String(room.roomNo)] || { tokenId: null, tokenCode: null, items: [] };
                  const hasMenuItems = (snapshot.items || []).length > 0;
                  const relatedBill =
                    billByRoom[createBillLookupKey("Room", String(room.roomNo), snapshot.tokenId || null)] || null;
                  const showPayNow = relatedBill && String(relatedBill.invoiceStatus || "").toLowerCase() !== "paid";

                  return (
                    <tr
                      key={`${room.roomId}-${room.roomNo}`}
                      className={`border-t border-slate-100 align-top transition ${
                        isFocused ? "bg-blue-50/70" : "hover:bg-sky-50/30"
                      }`}
                    >
                      <td className="px-5 py-4">
                        <div className="text-lg font-black text-slate-900">Room {room.roomNo}</div>
                        <div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          {room.categoryName || "Hotel Room"}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">ID #{room.roomId || "--"}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                            hotelStatus.toLowerCase() === "occupied"
                              ? "border-rose-200 bg-rose-50 text-rose-700"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {hotelStatus || "Available"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm font-semibold text-slate-800">{guestName}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          Booking {booking?.bookingCode || booking?.bookingId || "--"}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        <div>{stayCheckIn}</div>
                        <div className="mt-1 text-xs text-slate-500">to {stayCheckOut}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm font-semibold text-slate-800">{snapshot.tokenCode || "No active token"}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {(snapshot.items || []).length
                            ? `${(snapshot.items || []).length} menu items added`
                            : "No items yet"}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm font-semibold text-slate-800">
                          {relatedBill?.invoiceStatus || (hasMenuItems ? "Ready for invoice" : "Pending token")}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {showPayNow ? "Payment action available" : "No active settlement"}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:shadow-md"
                            onClick={() => openRoomFlow(room, "token")}
                          >
                            + Token
                          </button>

                          {hasMenuItems ? (
                            <button
                              className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:shadow-md"
                              onClick={() => openRoomInvoice(room)}
                            >
                              Create Invoice
                            </button>
                          ) : null}

                          {showPayNow ? (
                            <button
                              className="rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:shadow-md"
                              onClick={() => openPayNow(room)}
                            >
                              Pay Now
                            </button>
                          ) : null}

                          <button
                            className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:shadow-md"
                            onClick={() => openRoomFlow(room, "items")}
                          >
                            Room Items
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-500">
                    No occupied rooms with active booking found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-sm text-slate-500">
            Showing <span className="font-semibold text-slate-900">{visibleRoomStart}</span>-
            <span className="font-semibold text-slate-900">{visibleRoomEnd}</span> of{" "}
            <span className="font-semibold text-slate-900">{activeRoomCards.length}</span> occupied rooms
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

    </div>
  );
};

export default Roomitem;
