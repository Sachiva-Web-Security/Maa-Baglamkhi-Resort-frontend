import { FaCalendarAlt, FaSearch, FaUserPlus } from "react-icons/fa";

const fieldCls =
  "w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100";

const FiltersSection = ({
  date,
  department,
  role,
  searchQuery,
  onDateChange,
  onDepartmentChange,
  onRoleChange,
  onSearchChange,
  onAddManualEntry,
}) => {
  return (
    <section className="rounded-[26px] border border-white/60 bg-white/82 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
            Smart Filters
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">
            Filter attendance records
          </h2>
        </div>
        <button
          type="button"
          onClick={onAddManualEntry}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-600 to-cyan-500 px-4 py-2.5 text-sm font-bold text-white shadow-[0_12px_30px_rgba(14,165,233,0.24)] transition hover:-translate-y-0.5"
        >
          <FaUserPlus />
          Add Manual Entry
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Date
          </label>
          <div className="relative">
            <FaCalendarAlt className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              className={`pl-11 ${fieldCls}`}
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Department
          </label>
          <select
            value={department}
            onChange={(e) => onDepartmentChange(e.target.value)}
            className={fieldCls}
          >
            <option>All Departments</option>
            <option>Reception</option>
            <option>Kitchen</option>
            <option>Housekeeping</option>
            <option>Management</option>
            <option>Security</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Role
          </label>
          <select
            value={role}
            onChange={(e) => onRoleChange(e.target.value)}
            className={fieldCls}
          >
            <option>All Roles</option>
            <option>Manager</option>
            <option>Staff</option>
            <option>Receptionist</option>
            <option>Housekeeping</option>
            <option>Security</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Search
          </label>
          <div className="relative">
            <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search employee"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className={`pl-11 ${fieldCls}`}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default FiltersSection;
