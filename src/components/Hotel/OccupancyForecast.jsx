import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api";

const MONTHS = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];
const DAYS_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const SELECTED_DATE_PAGE_SIZE = 5;

const formatDate = (y, m, d) => {
  const mm = String(m + 1).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
};

const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

const OccupancyForecast = () => {
  const navigate = useNavigate();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [bookings, setBookings] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDatePage, setSelectedDatePage] = useState(1);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [bookingsRes, blocksRes, setupRes] = await Promise.all([
        API.get("/hotel/all-bookings"),
        API.get("/hotel/room-blocks").catch(() => ({ data: [] })),
        API.get("/hotel/rooms/setup"),
      ]);
      setBookings(Array.isArray(bookingsRes.data) ? bookingsRes.data : []);
      setBlocks(Array.isArray(blocksRes.data) ? blocksRes.data : []);
      const allRooms = [];
      if (Array.isArray(setupRes.data)) {
        for (const cat of setupRes.data) {
          for (const rn of cat.rooms || []) {
            allRooms.push({ roomNumber: rn, categoryName: cat.name });
          }
        }
      }
      setRooms(allRooms);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Build occupancy data per date
  const occupancyMap = useMemo(() => {
    const map = {};

    for (const b of bookings) {
      if (!b.check_in || !b.check_out) continue;
      const start = new Date(b.check_in);
      const end = new Date(b.check_out);
      const cur = new Date(start);
      while (cur < end) {
        const key = cur.toISOString().slice(0, 10);
        if (!map[key]) map[key] = { bookings: [], blocks: [] };
        map[key].bookings.push(b);
        cur.setDate(cur.getDate() + 1);
      }
    }

    for (const bl of blocks) {
      if (bl.status !== "Active" || !bl.blocked_from || !bl.blocked_until) continue;
      const start = new Date(bl.blocked_from);
      const end = new Date(bl.blocked_until);
      const cur = new Date(start);
      while (cur <= end) {
        const key = cur.toISOString().slice(0, 10);
        if (!map[key]) map[key] = { bookings: [], blocks: [] };
        map[key].blocks.push(bl);
        cur.setDate(cur.getDate() + 1);
      }
    }

    return map;
  }, [bookings, blocks]);

  const totalRooms = rooms.length || 1;

  // Month stats
  const monthStats = useMemo(() => {
    const days = daysInMonth(year, month);
    let totalOccupancy = 0;
    let peakOccupancy = 0;

    for (let d = 1; d <= days; d++) {
      const key = formatDate(year, month, d);
      const data = occupancyMap[key] || { bookings: [], blocks: [] };
      const occupied = data.bookings.length + data.blocks.length;
      totalOccupancy += occupied;
      if (occupied > peakOccupancy) peakOccupancy = occupied;
    }

    const avgOccupancy = ((totalOccupancy / (days * totalRooms)) * 100).toFixed(0);
    return { avgOccupancy, peakOccupancy };
  }, [year, month, occupancyMap, totalRooms]);

  // Selected date details
  const selectedData = useMemo(() => {
    if (!selectedDate) return null;
    return occupancyMap[selectedDate] || { bookings: [], blocks: [] };
  }, [selectedDate, occupancyMap]);

  const totalSelectedDatePages = Math.max(
    1,
    Math.ceil((selectedData?.bookings?.length || 0) / SELECTED_DATE_PAGE_SIZE),
  );
  const paginatedSelectedBookings = (selectedData?.bookings || []).slice(
    (selectedDatePage - 1) * SELECTED_DATE_PAGE_SIZE,
    selectedDatePage * SELECTED_DATE_PAGE_SIZE,
  );

  useEffect(() => {
    setSelectedDatePage(1);
  }, [selectedDate]);

  useEffect(() => {
    if (selectedDatePage > totalSelectedDatePages) {
      setSelectedDatePage(totalSelectedDatePages);
    }
  }, [selectedDatePage, totalSelectedDatePages]);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDate(null);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDate(null);
  };

  const days = daysInMonth(year, month);
  const firstDay = firstDayOfMonth(year, month);
  const todayStr = now.toISOString().slice(0, 10);

  const getOccupancyColor = (pct) => {
    if (pct === 0) return "bg-white border-slate-100 hover:border-slate-200";
    if (pct < 30) return "bg-emerald-50 border-emerald-100 hover:border-emerald-300";
    if (pct < 60) return "bg-amber-50 border-amber-100 hover:border-amber-300";
    if (pct < 90) return "bg-orange-50 border-orange-100 hover:border-orange-300";
    return "bg-rose-50 border-rose-200 hover:border-rose-400";
  };

    return (
      <div className="min-h-screen w-full bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.1),_transparent_30%),linear-gradient(135deg,#f8fbff_0%,#fffbeb_50%,#fff8ef_100%)] p-4 sm:p-6">
        <div className="w-full space-y-5">
        {/* Header */}
        <section className="overflow-hidden rounded-[32px] border border-white/70 bg-[linear-gradient(135deg,#292524_0%,#92400e_45%,#0f766e_100%)] px-6 py-7 text-white shadow-[0_22px_70px_rgba(15,23,42,0.22)]">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-200">
                Occupancy Forecast
              </p>
              <h1 className="mt-3 text-3xl font-black sm:text-4xl">
                Room Availability Calendar
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-100/80">
                “View the month-wise occupancy forecast — see which days are fully booked and which days are available.”
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-[18px] border border-white/10 bg-white/10 p-3 text-center backdrop-blur">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-white/65">
                  Total Rooms
                </div>
                <div className="mt-2 text-2xl font-black">{totalRooms}</div>
              </div>
              <div className="rounded-[18px] border border-white/10 bg-amber-800/40 p-3 text-center backdrop-blur">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                  Avg Occ.
                </div>
                <div className="mt-2 text-2xl font-black">
                  {monthStats.avgOccupancy}%
                </div>
              </div>
              <div className="rounded-[18px] border border-rose-400/30 bg-rose-900/30 p-3 text-center backdrop-blur">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-rose-200">
                  Peak Day
                </div>
                <div className="mt-2 text-2xl font-black">
                  {monthStats.peakOccupancy}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Calendar + Sidebar */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.36fr)] xl:grid-cols-[minmax(0,1fr)_minmax(390px,0.4fr)] 2xl:grid-cols-[minmax(0,1fr)_minmax(430px,0.42fr)] xl:items-start">
          {/* Calendar */}
          <div className="w-full min-w-0 rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur">
            {/* Month Nav */}
            <div className="mb-5 flex items-center justify-between">
              <button
                type="button"
                onClick={prevMonth}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                ← Prev
              </button>
              <h2 className="text-xl font-black text-slate-900">
                {MONTHS[month]} {year}
              </h2>
              <button
                type="button"
                onClick={nextMonth}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Next →
              </button>
            </div>

            {/* Legend */}
            <div className="mb-4 flex flex-wrap gap-3 text-xs font-semibold">
              {[
                { color: "bg-white border border-slate-200", label: "Empty" },
                { color: "bg-emerald-100", label: "< 30%" },
                { color: "bg-amber-100", label: "30–60%" },
                { color: "bg-orange-100", label: "60–90%" },
                { color: "bg-rose-100", label: "90–100%" },
              ].map((l) => (
                <span key={l.label} className="flex items-center gap-1.5">
                  <span className={`h-4 w-4 rounded ${l.color}`} />
                  {l.label}
                </span>
              ))}
            </div>

            {/* Day Headers */}
            <div className="mb-2 grid grid-cols-7 text-center">
              {DAYS_SHORT.map((d) => (
                <div
                  key={d}
                  className="py-2 text-[11px] font-bold uppercase tracking-wide text-slate-400"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            {loading ? (
              <div className="py-16 text-center text-slate-400">Loading…</div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for first week */}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}

                {/* Day cells */}
                {Array.from({ length: days }, (_, i) => i + 1).map((d) => {
                  const dateStr = formatDate(year, month, d);
                  const data = occupancyMap[dateStr] || {
                    bookings: [],
                    blocks: [],
                  };
                  const occupied = data.bookings.length + data.blocks.length;
                  const pct = (occupied / totalRooms) * 100;
                  const isToday = dateStr === todayStr;
                  const isSelected = dateStr === selectedDate;
                  const colorCls = getOccupancyColor(pct);

                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() =>
                        setSelectedDate(
                          dateStr === selectedDate ? null : dateStr,
                        )
                      }
                      className={`relative rounded-[12px] border p-2 text-center transition ${colorCls} ${
                        isSelected
                          ? "ring-2 ring-sky-500 ring-offset-1"
                          : ""
                      } ${isToday ? "border-sky-400 ring-1 ring-sky-200" : ""}`}
                    >
                      <div
                        className={`text-sm font-black ${
                          isToday ? "text-sky-600" : "text-slate-800"
                        }`}
                      >
                        {d}
                      </div>
                      {occupied > 0 && (
                        <div className="mt-0.5 text-[10px] font-bold text-slate-600">
                          {occupied}/{totalRooms}
                        </div>
                      )}
                      {data.blocks.length > 0 && (
                        <div className="absolute right-1 top-1 h-2 w-2 rounded-full bg-violet-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar Detail */}
          <div className="w-full min-w-0 space-y-4">
            {selectedDate ? (
              <div className="w-full rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-600">
                  Selected Date
                </p>
                <h3 className="mt-2 text-xl font-black text-slate-900">
                  {new Date(selectedDate + "T00:00:00").toLocaleDateString(
                    "en-IN",
                    { weekday: "long", day: "2-digit", month: "long" },
                  )}
                </h3>

                {/* Occupancy Bar */}
                <div className="mt-4 overflow-hidden rounded-xl bg-slate-100">
                  <div
                    className="h-3 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 transition-all"
                    style={{
                      width: `${Math.min(
                        ((
                          (selectedData?.bookings?.length || 0) +
                          (selectedData?.blocks?.length || 0)
                        ) /
                          totalRooms) *
                          100,
                        100,
                      )}%`,
                    }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {(selectedData?.bookings?.length || 0) +
                    (selectedData?.blocks?.length || 0)}{" "}
                  / {totalRooms} rooms occupied
                </p>

                {/* Bookings on that day */}
                {selectedData?.bookings?.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-bold text-slate-500">
                      Active Bookings
                    </p>
                    <div className="space-y-2.5">
                      {paginatedSelectedBookings.map((b) => (
                        <div
                          key={b.bookingId}
                          className="flex items-start justify-between gap-3 rounded-[16px] bg-sky-50 px-3.5 py-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="break-words text-sm font-bold leading-5 text-slate-800">
                              {b.guest_name || "Walk-in"}
                            </div>
                            <div className="mt-1 break-words text-[11px] leading-4 text-slate-500">
                              Room: {b.rooms || "—"}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              navigate("/hotel/communication", {
                                state: { bookingId: b.bookingId },
                              })
                            }
                            className="shrink-0 rounded-full bg-sky-600 px-3 py-1 text-[11px] font-bold text-white"
                          >
                            View
                          </button>
                        </div>
                      ))}
                    </div>

                    {selectedData.bookings.length > SELECTED_DATE_PAGE_SIZE ? (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                        <div className="text-[11px] font-semibold text-slate-500">
                          Showing{" "}
                          <span className="text-slate-900">
                            {(selectedDatePage - 1) * SELECTED_DATE_PAGE_SIZE + 1}
                          </span>{" "}
                          to{" "}
                          <span className="text-slate-900">
                            {Math.min(
                              selectedDatePage * SELECTED_DATE_PAGE_SIZE,
                              selectedData.bookings.length,
                            )}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedDatePage((current) => Math.max(1, current - 1))
                            }
                            disabled={selectedDatePage === 1}
                            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Prev
                          </button>

                          {Array.from(
                            { length: totalSelectedDatePages },
                            (_, index) => index + 1,
                          ).map((pageNumber) => (
                            <button
                              key={pageNumber}
                              type="button"
                              onClick={() => setSelectedDatePage(pageNumber)}
                              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                                pageNumber === selectedDatePage
                                  ? "bg-sky-600 text-white"
                                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              {pageNumber}
                            </button>
                          ))}

                          <button
                            type="button"
                            onClick={() =>
                              setSelectedDatePage((current) =>
                                Math.min(totalSelectedDatePages, current + 1),
                              )
                            }
                            disabled={selectedDatePage === totalSelectedDatePages}
                            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Maintenance blocks on that day */}
                {selectedData?.blocks?.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-bold text-slate-500">
                      Maintenance Blocks
                    </p>
                    <div className="space-y-2">
                      {selectedData.blocks.map((bl) => (
                        <div
                          key={bl.id}
                          className="rounded-[14px] bg-violet-50 px-3 py-2"
                        >
                          <div className="text-sm font-bold text-violet-800">
                            Room {bl.room_number} — {bl.block_type}
                          </div>
                          {bl.reason && (
                            <div className="text-[11px] text-violet-500">
                              {bl.reason}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!selectedData?.bookings?.length &&
                  !selectedData?.blocks?.length && (
                    <p className="mt-4 rounded-[14px] bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                      ✅ all room available in this day
                    </p>
                  )}
              </div>
            ) : (
              <div className="rounded-[28px] border-2 border-dashed border-slate-200 py-12 text-center">
                <div className="text-3xl">📅</div>
                <p className="mt-3 text-sm font-bold text-slate-500">
“Select any day to view the details.”
                </p>
              </div>
            )}

            {/* Month Summary */}
            <div className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                {MONTHS[month]} {year} Summary
              </p>
              <div className="mt-4 space-y-3">
                <div className="flex justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <span className="text-sm font-semibold text-slate-600">
                    Total Active Bookings
                  </span>
                  <span className="font-black text-slate-900">
                    {bookings.length}
                  </span>
                </div>
                <div className="flex justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <span className="text-sm font-semibold text-slate-600">
                    Maintenance Blocks
                  </span>
                  <span className="font-black text-violet-700">
                    {blocks.filter((b) => b.status === "Active").length}
                  </span>
                </div>
                <div className="flex justify-between rounded-xl bg-amber-50 px-4 py-3">
                  <span className="text-sm font-semibold text-amber-700">
                    Avg Monthly Occ.
                  </span>
                  <span className="font-black text-amber-900">
                    {monthStats.avgOccupancy}%
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("/hotel/room-maintenance")}
              className="w-full rounded-[22px] border border-violet-200 bg-violet-50 px-5 py-3.5 text-sm font-bold text-violet-700 transition hover:bg-violet-100"
            >
              🔧 Manage Maintenance Blocks
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate("/hotel/all-bookings")}
            className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            ← All Bookings
          </button>
        </div>
      </div>
    </div>
  );
};

export default OccupancyForecast;
