const AttendanceRow = ({ employee }) => {
  const statusColors = {
    Present:
      "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-green-200",
    Absent:
      "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-red-200",
    Late:
      "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-200",
    "On Leave":
      "bg-gradient-to-r from-blue-500 to-sky-600 text-white shadow-blue-200",
  };

  const methodColors = {
    Biometric:
      "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-violet-200",
    Manual:
      "bg-gradient-to-r from-slate-500 to-slate-700 text-white shadow-slate-200",
  };

  return (
    <tr className={`group border-b border-blue-50 transition-all duration-300 hover:shadow-md ${
      idx % 2 === 0 ? "bg-white" : "bg-blue-50/50"
    }`}>

      {/* Employee */}

      <td className="px-6 py-5">

        <div className="flex items-center gap-4">

          <div className="flex h-16 w-16 items-center justify-center rounded-[12px] bg-gradient-to-br from-blue-600 via-sky-500 to-cyan-400 text-xl font-extrabold text-white shadow-2xl ring-4 ring-blue-50">

            {employee.name?.charAt(0).toUpperCase()}

          </div>

          <div>

            <h3 className="text-[18px] font-extrabold text-slate-900">

              {employee.name}

            </h3>

            <p className="text-sm font-semibold text-slate-500">

              {employee.role || "--"}

            </p>

          </div>

        </div>

      </td>

      {/* Check In */}

      <td className="px-6 py-5">

        <div className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-4 py-2 font-semibold text-blue-700 shadow-sm">

          {employee.checkIn || "--"}

        </div>

      </td>

      {/* Check Out */}

      <td className="px-6 py-5">

        <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 font-semibold text-slate-700 shadow-sm">

          {employee.checkOut || "--"}

        </div>

      </td>

      {/* Status */}

      <td className="px-6 py-5">

        <span
          className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-bold shadow-md ${
            statusColors[employee.status] ||
            "bg-slate-200 text-slate-700"
          }`}
        >
          {employee.status}
        </span>

      </td>

      {/* Method */}

      <td className="px-6 py-5">

        <span
          className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-bold shadow-lg ${
            methodColors[employee.method] ||
            "bg-slate-200 text-slate-700"
          }`}
        >
          {employee.method}
        </span>

      </td>

      {/* Action Buttons */}

      <td className="px-6 py-5">

        <div className="flex gap-3">

          <button
            type="button"
            className="
            rounded-xl
            bg-gradient-to-r
            from-blue-600
            via-blue-500
            to-sky-500
            px-5
            py-2.5
            text-sm
            font-bold
            text-white
            shadow-[0_10px_25px_rgba(37,99,235,0.30)]
            transition-all
            duration-300
            hover:-translate-y-1
            hover:scale-105
          "
          >
            Check In
          </button>

          <button
            type="button"
            className="
            rounded-xl
            border
            border-red-200
            bg-white
            px-5
            py-2.5
            text-sm
            font-bold
            text-red-600
            shadow-md
            transition-all
            duration-300
            hover:bg-red-500
            hover:text-white
            hover:-translate-y-1
            hover:scale-105
          "
          >
            Check Out
          </button>

        </div>

      </td>

    </tr>
  );
};

export default AttendanceRow;