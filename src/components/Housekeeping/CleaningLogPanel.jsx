import { useEffect, useMemo, useState } from "react";
import { FaClock, FaChevronLeft, FaChevronRight, FaExclamationTriangle, FaSearch, FaPaperPlane, FaCheck } from "react-icons/fa";

const PAGE_SIZE = 6;
const PAGE_WINDOW = 10;

const formatTimeRange = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatCountdown = (ms) => {
  if (ms === null || ms === undefined) return "--";
  const totalSeconds = Math.max(Math.floor(ms / 1000), 0);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const CleaningLogPanel = ({
  rows = [],
  warningRows = [],
  completedTodayRows = [],
  logSearch,
  setLogSearch,
  logStatus,
  setLogStatus,
  logAssignee,
  setLogAssignee,
  housekeepers = [],
  roomMessageDrafts = {},
  setRoomMessageDrafts,
  onSendCleaningMessage,
  onExtendCleaningTime,
  onMarkCleaningComplete,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [extraMinutesByRoom, setExtraMinutesByRoom] = useState({});

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return rows.slice(startIndex, startIndex + PAGE_SIZE);
  }, [currentPage, rows]);

  useEffect(() => {
    setCurrentPage(1);
  }, [logSearch, logStatus, logAssignee, rows.length]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const visibleStart = rows.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const visibleEnd = Math.min(currentPage * PAGE_SIZE, rows.length);

  const goToPage = (page) => {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages));
  };

  const handleExtendClick = (room) => {
    const roomKey = String(room.id || room.roomNo || room.roomNumber);
    const parsedValue = Number(extraMinutesByRoom[roomKey]);
    const extraMinutes = Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 5;
    onExtendCleaningTime(room, extraMinutes);
    setExtraMinutesByRoom((prev) => ({ ...prev, [roomKey]: "" }));
  };

  const pageNumbers = useMemo(() => {
    if (totalPages <= PAGE_WINDOW) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const middleWindow = PAGE_WINDOW - 2;
    const halfWindow = Math.floor(middleWindow / 2);
    let start = Math.max(2, currentPage - halfWindow);
    let end = Math.min(totalPages - 1, start + middleWindow - 1);

    if (end - start + 1 < middleWindow) {
      start = Math.max(2, end - middleWindow + 1);
    }

    const numbers = [1];
    if (start > 2) numbers.push("ellipsis-start");

    for (let page = start; page <= end; page += 1) {
      numbers.push(page);
    }

    if (end < totalPages - 1) numbers.push("ellipsis-end");
    numbers.push(totalPages);
    return numbers;
  }, [currentPage, totalPages]);

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#071321_0%,#0b2740_52%,#ffffff_52%,#ffffff_100%)] shadow-[0_24px_60px_rgba(15,23,42,0.15)]">
        <div className="grid gap-5 p-5 lg:grid-cols-[1.12fr,0.88fr] lg:p-6">
          <div className="rounded-[1.7rem] border border-white/10 bg-white/8 p-5 shadow-[0_18px_45px_rgba(2,6,23,0.2)] backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-200">Housekeeping Page</p>
            <h3 className="mt-1 text-2xl font-semibold text-white">Cleaning Log</h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-200">
              Room-wise cleaning activity, timer status, assignee updates aur reception notes ko ek polished live board me dekhiye.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.2rem] border border-white/10 bg-white/10 px-4 py-3 text-white">
                <div className="text-[10px] uppercase tracking-[0.22em] text-cyan-100/80">Rooms</div>
                <div className="mt-1 text-2xl font-black">{rows.length}</div>
              </div>
              <div className="rounded-[1.2rem] border border-white/10 bg-white/10 px-4 py-3 text-white">
                <div className="text-[10px] uppercase tracking-[0.22em] text-cyan-100/80">Warnings</div>
                <div className="mt-1 text-2xl font-black">{warningRows.length}</div>
              </div>
              <div className="rounded-[1.2rem] border border-white/10 bg-white/10 px-4 py-3 text-white">
                <div className="text-[10px] uppercase tracking-[0.22em] text-cyan-100/80">Assignees</div>
                <div className="mt-1 text-2xl font-black">{housekeepers.length}</div>
              </div>
              <div className="rounded-[1.2rem] border border-white/10 bg-white/10 px-4 py-3 text-white sm:col-span-3">
                <div className="text-[10px] uppercase tracking-[0.22em] text-cyan-100/80">Completed Today</div>
                <div className="mt-1 text-2xl font-black">{completedTodayRows.length}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-[1.4rem] border border-rose-200 bg-rose-50 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <FaExclamationTriangle className="mt-1 text-rose-500" />
                <div>
                  <div className="font-semibold text-slate-900">Live cleaning alerts</div>
                  <div className="text-sm text-slate-600">
                    {warningRows.length} room(s) ka timer close hai ya overdue ho chuka hai.
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-white/70 bg-white/90 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl">
              <div className="grid gap-3 md:grid-cols-[1.4fr,1fr,1fr]">
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
                  <FaSearch className="text-cyan-500" />
                  <input
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    placeholder="Search by room no or type"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                  />
                </label>

                <select
                  value={logStatus}
                  onChange={(e) => setLogStatus(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
                >
                  <option value="All">All Status</option>
                  <option value="dirty">Dirty</option>
                  <option value="clean">Clean</option>
                  <option value="occupied">Occupied</option>
                  <option value="out of service">Out of Service</option>
                </select>

                <select
                  value={logAssignee}
                  onChange={(e) => setLogAssignee(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
                >
                  <option value="All">All Assignees</option>
                  <option value="No Housekeeper">No Housekeeper</option>
                  {housekeepers.map((hk, index) => (
                    <option key={`${hk}-${index}`} value={hk}>
                      {hk}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
                <div>
                  Showing <span className="font-semibold text-slate-900">{visibleStart || 0}</span>-
                  <span className="font-semibold text-slate-900">{visibleEnd || 0}</span> of{" "}
                  <span className="font-semibold text-slate-900">{rows.length}</span> rooms
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[1.6rem] border border-emerald-200 bg-[linear-gradient(135deg,#ecfdf5_0%,#ffffff_100%)] p-4 shadow-[0_18px_38px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Completed Cleaning Rooms
            </div>
            <div className="mt-1 text-sm text-slate-600">
              Aaj total <span className="font-bold text-slate-900">{completedTodayRows.length}</span> room clean mark hue hain.
            </div>
          </div>
          <div className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
            {completedTodayRows.length} Completed
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-[1.2rem] border border-emerald-100 bg-white">
          <table className="min-w-full text-left text-sm text-slate-700">
            <thead className="bg-emerald-50 text-[11px] uppercase tracking-[0.14em] text-emerald-700">
              <tr>
                <th className="px-4 py-3">Room</th>
                <th className="px-4 py-3">Assignee</th>
                <th className="px-4 py-3">Guest Status</th>
                <th className="px-4 py-3">Completed At</th>
              </tr>
            </thead>
            <tbody>
              {completedTodayRows.length ? (
                completedTodayRows.map((entry, index) => (
                  <tr key={`${entry.roomId || entry.roomNo}-${entry.completedAt || index}`} className="border-t border-emerald-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">Room {entry.roomNo}</td>
                    <td className="px-4 py-3">{entry.assignee || "No Housekeeper"}</td>
                    <td className="px-4 py-3">{entry.guestStatus || "-"}</td>
                    <td className="px-4 py-3">{formatTimeRange(entry.completedAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                    Aaj abhi tak koi room completed mark nahi hua.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {rows.length ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {paginatedRows.map((room) => (
              <div
                key={`clean-${room.id}`}
                className="relative overflow-visible"
              >
                <span className="absolute -right-2 -top-2 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-white bg-slate-900 text-[11px] font-black text-white shadow-[0_10px_24px_rgba(15,23,42,0.2)]">
                  {room.minutesLeft !== null ? Math.max(room.minutesLeft, 0) : "!"}
                </span>
                <div className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-[0_18px_38px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(15,23,42,0.12)]">
                  <div className="h-1.5 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400" />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-black text-slate-900">Room {room.roomNo}</p>
                        <p className="text-xs text-slate-500">{room.roomType}</p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${room.isOverdue ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                        {room.status}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-slate-600">
                      <p>
                        Assignee: <span className="font-semibold text-slate-900">{room.assignee}</span>
                      </p>
                      <p>
                        Guest: <span className="font-semibold text-slate-900">{room.guestStatus || "-"}</span>
                      </p>
                    </div>

                    <div className={`mt-4 rounded-[1.2rem] border px-3 py-3 ${room.isOverdue ? "border-rose-200 bg-rose-50" : "border-violet-200 bg-violet-50"}`}>
                      <div className="flex items-center gap-2">
                        <span className={`flex h-8 w-8 items-center justify-center rounded-full ${room.isOverdue ? "bg-rose-600 text-white" : "bg-violet-600 text-white"}`}>
                          <FaClock className="text-xs" />
                        </span>
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Cleaning Timer</div>
                          <div className="font-bold text-slate-900">
                            {room.isOverdue
                              ? "Deadline crossed"
                              : room.remainingMs !== null
                                ? `Due in ${formatCountdown(room.remainingMs)}`
                                : room.task?.dueAt || room.task?.startedAt
                                  ? "Timer scheduled"
                                  : "No cleaning timer"}
                          </div>
                          <div className="mt-1 text-[11px] font-medium text-slate-500">
                            Start {formatTimeRange(room.task?.startedAt)} | Due {formatTimeRange(room.task?.dueAt)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80">
                        <div
                          className={`h-full rounded-full ${room.isOverdue ? "bg-rose-500" : "bg-gradient-to-r from-violet-500 to-cyan-400"}`}
                          style={{
                            width: `${room.progress || 34}%`,
                            transition: "width 900ms linear",
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 rounded-[1.1rem] border border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-700">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900">Message to Reception</span>
                        <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                          Live note
                        </span>
                      </div>
                      <textarea
                        value={roomMessageDrafts[String(room.id || room.roomNo || room.roomNumber)] ?? room.task?.message ?? ""}
                        onChange={(event) =>
                          setRoomMessageDrafts((prev) => ({
                            ...prev,
                            [String(room.id || room.roomNo || room.roomNumber)]: event.target.value,
                          }))
                        }
                        rows={3}
                        placeholder="Write message for reception / front desk..."
                        className="w-full resize-none rounded-[14px] border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none placeholder:text-slate-400"
                      />
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onSendCleaningMessage(room)}
                          className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-emerald-700"
                        >
                          <FaPaperPlane className="text-[10px]" />
                          Send
                        </button>
                        <span className="text-[11px] text-slate-500">
                          Reception dashboard aur notifications me show hoga.
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 rounded-[1.15rem] border border-violet-200 bg-violet-50/70 p-3">
                      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700">
                        Need more time?
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={extraMinutesByRoom[String(room.id || room.roomNo || room.roomNumber)] ?? ""}
                          onChange={(event) =>
                            setExtraMinutesByRoom((prev) => ({
                              ...prev,
                              [String(room.id || room.roomNo || room.roomNumber)]: event.target.value,
                            }))
                          }
                          placeholder="Minutes"
                          className="w-24 rounded-full border border-violet-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleExtendClick(room)}
                          className="rounded-full bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-700"
                        >
                          Add Time
                        </button>
                        <button
                          type="button"
                          onClick={() => onExtendCleaningTime(room, 5)}
                          className="rounded-full border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
                        >
                          +5
                        </button>
                      </div>
                    </div>

                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => onMarkCleaningComplete(room)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-[1rem] bg-gradient-to-r from-emerald-600 to-teal-500 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95"
                      >
                        <FaCheck className="text-xs" />
                        Mark Cleaning Complete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)] sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-600">
              Page <span className="font-semibold text-slate-900">{currentPage}</span> of{" "}
              <span className="font-semibold text-slate-900">{totalPages}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FaChevronLeft className="text-xs" />
                Prev
              </button>

              {pageNumbers.map((item) =>
                item === "ellipsis-start" || item === "ellipsis-end" ? (
                  <span key={item} className="px-2 text-slate-400">
                    ...
                  </span>
                ) : (
                  <button
                    type="button"
                    key={item}
                    onClick={() => goToPage(item)}
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition ${
                      currentPage === item
                        ? "bg-slate-900 text-white shadow-[0_12px_24px_rgba(15,23,42,0.18)]"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {item}
                  </button>
                ),
              )}

              <button
                type="button"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <FaChevronRight className="text-xs" />
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
          No cleaning rooms found for the current filters.
        </div>
      )}
    </div>
  );
};

export default CleaningLogPanel;
