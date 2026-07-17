const AttendanceRow = ({ employee, isAdmin = true }) => {
  const statusColors = {
    Present:
      "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-emerald-200",
    Absent:
      "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-red-200",
    Late:
      "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-200",
    "Half Day":
      "bg-gradient-to-r from-yellow-400 to-amber-500 text-white shadow-amber-200",
    "On Leave":
      "bg-gradient-to-r from-blue-500 to-sky-600 text-white shadow-blue-200",
  };

  const methodColors = {
    Biometric:
      "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-violet-200",
    Manual:
      "bg-gradient-to-r from-slate-500 to-slate-700 text-white shadow-slate-200",
  };

  const formatCurrency = (amount) => {
    const n = parseFloat(amount || 0);
    return `₹ ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <tr
      className="
      group

      border-b
      border-blue-50/80

      bg-white

      transition-all
      duration-300

      hover:bg-blue-50/30
      hover:shadow-[0_4px_20px_rgba(37,99,235,0.06)]
    "
    >
      {/* Employee */}
      <td className="px-6 py-5">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div
            className="
            flex
            h-14
            w-14
            shrink-0
            items-center
            justify-center

            rounded-[14px]

            bg-gradient-to-br
            from-blue-600
            via-sky-500
            to-cyan-400

            text-lg
            font-extrabold
            text-white

            shadow-[0_8px_24px_rgba(37,99,235,0.25)]
            ring-4
            ring-blue-50

            transition-all
            duration-300

            group-hover:scale-105
            group-hover:shadow-[0_12px_32px_rgba(37,99,235,0.30)]
          "
          >
            {employee.name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            {/* Employee Name */}
            <h3 className="text-[20px] font-bold text-slate-900 leading-tight">
              {employee.name}
            </h3>
            {/* Employee Role */}
            <p className="mt-0.5 text-[15px] font-medium text-slate-500">
              {employee.role || "--"}
            </p>
          </div>
        </div>
      </td>

      {/* Check In */}
      <td className="px-6 py-5">
        <div
          className="
          inline-flex
          items-center

          rounded-full

          border
          border-blue-200
          bg-blue-50

          px-4
          py-2

          text-[16px]
          font-semibold
          text-blue-700

          shadow-sm
        "
        >
          {employee.checkIn || "--"}
        </div>
      </td>

      {/* Check Out */}
      <td className="px-6 py-5">
        <div
          className="
          inline-flex
          items-center

          rounded-full

          border
          border-slate-200
          bg-slate-50

          px-4
          py-2

          text-[16px]
          font-semibold
          text-slate-700

          shadow-sm
        "
        >
          {employee.checkOut || "--"}
        </div>
      </td>

      {/* Status */}
      <td className="px-6 py-5">
        <span
          className={`
            inline-flex
            items-center

            rounded-full

            px-4
            py-2

            text-[15px]
            font-bold

            shadow-lg

            ${
              statusColors[employee.status] ||
              "bg-slate-200 text-slate-700"
            }
          `}
        >
          {employee.status}
        </span>
      </td>

      {/* Method */}
      <td className="px-6 py-5">
        <span
          className={`
            inline-flex
            items-center

            rounded-full

            px-4
            py-2

            text-[15px]
            font-bold

            shadow-lg

            ${
              methodColors[employee.method] ||
              "bg-slate-200 text-slate-700"
            }
          `}
        >
          {employee.method}
        </span>
      </td>

      {/* Daily Salary */}
      <td className="px-6 py-5">
        <div className="inline-flex flex-col items-start">
          <div
            className="
            inline-flex
            items-center

            rounded-full

            border
            border-emerald-200
            bg-emerald-50

            px-4
            py-2

            text-[15px]
            font-bold
            text-emerald-700

            shadow-sm
          "
          >
            {formatCurrency(employee.salary_amount)}
          </div>
          {isAdmin && employee.user_salary > 0 && (
            <span className="mt-1.5 text-[13px] font-semibold text-slate-500">
              /mo: {formatCurrency(employee.user_salary)}
            </span>
          )}
        </div>
      </td>

      {/* Action Buttons (admin only) */}
      {isAdmin && (
        <td className="px-6 py-5">
          <div className="flex gap-3">
            {/* Check In */}
            <button
              type="button"
              className="
              rounded-[14px]

              bg-gradient-to-r
              from-blue-600
              via-blue-500
              to-sky-500

              px-5
              py-2.5

              text-[16px]
              font-bold
              text-white

              shadow-[0_10px_28px_rgba(37,99,235,0.28)]

              transition-all
              duration-300

              hover:-translate-y-1
              hover:scale-105
              hover:shadow-[0_16px_38px_rgba(37,99,235,0.38)]
            "
            >
              Check In
            </button>

            {/* Check Out */}
            <button
              type="button"
              className="
              rounded-[14px]

              border
              border-red-200
              bg-white

              px-5
              py-2.5

              text-[16px]
              font-bold
              text-red-600

              shadow-md

              transition-all
              duration-300

              hover:bg-red-500
              hover:text-white
              hover:-translate-y-1
              hover:scale-105
              hover:border-red-500
              hover:shadow-[0_14px_32px_rgba(239,68,68,0.25)]
            "
            >
              Check Out
            </button>
          </div>
        </td>
      )}
    </tr>
  );
};

export default AttendanceRow;
