const STATUS_OPTIONS = [
  "Vacant Dirty",
  "Vacant Clean",
  "Occupied Dirty",
  "Cleaning In Progress",
  "Out of Service",
];

const STATUS_TONE = {
  "Vacant Dirty": "bg-amber-100 text-amber-700 border-amber-200",
  "Vacant Clean": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Occupied Dirty": "bg-rose-100 text-rose-700 border-rose-200",
  "Cleaning In Progress": "bg-violet-100 text-violet-700 border-violet-200",
  "Out of Service": "bg-slate-200 text-slate-700 border-slate-300",
};

export default function HousekeepingRow({
  room,
  housekeepers = [],
  onStatusChange,
  onAssigneeChange,
}) {
  const tone = STATUS_TONE[room.status] || "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <div className="rounded-[26px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 shadow-[0_12px_35px_rgba(15,23,42,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Room</p>
          <h3 className="mt-2 text-2xl font-black text-slate-900">{room.roomNo}</h3>
          <p className="mt-1 text-sm text-slate-500">Guest: {room.guest || "No active guest"}</p>
        </div>
        <div className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] ${tone}`}>
          {room.status}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr,1.15fr,0.9fr]">
        <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/80 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Status</p>
          <select
            value={room.status}
            onChange={(e) => onStatusChange(room.id, e.target.value)}
            className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
          >
            {STATUS_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/80 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Assignee</p>
          <select
            value={room.assignee || "No Housekeeper"}
            onChange={(e) => onAssigneeChange(room.id, e.target.value)}
            className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
          >
            <option value="No Housekeeper">No Housekeeper</option>
            {housekeepers.map((hk, index) => (
              <option key={index} value={hk.name || hk}>
                {hk.name || hk}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Details</p>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
              <span>Priority</span>
              <span className="font-semibold text-slate-900">{room.priority || "Normal"}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
              <span>Hotel Status</span>
              <span className="font-semibold text-slate-900">{room.hotelStatus || "-"}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
              <span>Check In</span>
              <span className="font-semibold text-slate-900">{room.checkIn || "-"}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
              <span>Check Out</span>
              <span className="font-semibold text-slate-900">{room.checkOut || "-"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
