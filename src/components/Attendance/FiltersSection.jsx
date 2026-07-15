import { FaCalendarAlt, FaSearch, FaUserPlus } from "react-icons/fa";

const fieldCls = `
w-full
rounded-2xl
border
border-blue-100
bg-gradient-to-b
from-white
to-blue-50

px-5
py-3.5

text-[15px]
font-semibold
text-slate-700

shadow-sm

outline-none

transition-all
duration-300

focus:border-blue-500
focus:ring-4
focus:ring-blue-100

hover:border-blue-300
hover:shadow-lg
`;

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
  showAddButton = true,
}) => {
  return (
    <section
      className="
      relative
      overflow-hidden

      rounded-[32px]

      border
      border-blue-50

      bg-white/60
      backdrop-blur-sm

      p-8

      shadow-[0_24px_60px_rgba(37,99,235,0.08)]
    "
    >
      {/* Decorative Glow */}

      <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-blue-200/40 blur-3xl"></div>

      <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-sky-100 blur-3xl"></div>

      {/* Header */}

      <div className="relative mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        <div>

          <div className="inline-flex items-center gap-3 rounded-full bg-blue-100/80 px-4 py-2">

            <span className="h-3 w-3 rounded-full bg-blue-600"></span>

            <span className="text-[13px] font-bold uppercase tracking-[0.18em] text-blue-700">

              Attendance

            </span>

          </div>

          <h2 className="mt-4 text-[34px] font-extrabold text-slate-900">

            Attendance Dashboard

          </h2>

          <p className="mt-2 text-[16px] text-slate-600">

            Filter employees by date, role, department and search.

          </p>

        </div>

        {showAddButton && (
          <button
            onClick={onAddManualEntry}
            className="
            inline-flex
            items-center
            gap-3

            rounded-2xl

            bg-gradient-to-r
            from-blue-600
            via-blue-500
            to-sky-500

            px-7
            py-4

            text-[16px]
            font-bold
            text-white

            shadow-[0_15px_35px_rgba(37,99,235,0.30)]

            transition-all
            duration-300

            hover:-translate-y-1
            hover:scale-105
          "
          >
            <FaUserPlus className="text-xl" />
            Add Manual Entry
          </button>
        )}

      </div>

      {/* Filters */}

      <div className="relative grid gap-6 md:grid-cols-2 xl:grid-cols-4">

        {/* Date */}

        <div>

          <label className="mb-3 block text-[13px] font-bold uppercase tracking-wider text-slate-600">

            Date

          </label>

          <div className="relative">

            <FaCalendarAlt className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-600 text-lg" />

            <input
              type="date"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              className={`pl-14 ${fieldCls}`}
            />

          </div>

        </div>

        {/* Department */}

        <div>

          <label className="mb-3 block text-[13px] font-bold uppercase tracking-wider text-slate-600">

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

        {/* Role */}

        <div>

          <label className="mb-3 block text-[13px] font-bold uppercase tracking-wider text-slate-600">

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

        {/* Search */}

        <div>

          <label className="mb-3 block text-[13px] font-bold uppercase tracking-wider text-slate-600">

            Search Employee

          </label>

          <div className="relative">

            <FaSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-600 text-lg" />

            <input
              type="text"
              placeholder="Search employee..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className={`pl-14 ${fieldCls}`}
            />

          </div>

        </div>

      </div>

    </section>
  );
};

export default FiltersSection;