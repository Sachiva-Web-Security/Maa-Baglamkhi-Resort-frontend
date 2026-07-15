const SummaryCard = ({ label, value, color, icon: Icon }) => {
  const colors = {
    green: "from-emerald-500 to-green-600",
    red: "from-rose-500 to-red-600",
    yellow: "from-amber-500 to-orange-500",
    amber: "from-amber-500 to-orange-500",
    blue: "from-blue-600 to-sky-500",
    emerald: "from-emerald-500 to-teal-500",
  };

  return (
    <div
      className="
      group
      relative
      overflow-hidden

      rounded-[32px]

      border
      border-blue-50

      bg-white

      p-6

      shadow-[0_20px_60px_rgba(37,99,235,0.08)]

      transition-all
      duration-500

      hover:-translate-y-2
      hover:shadow-[0_30px_60px_rgba(37,99,235,0.14)]
      hover:border-blue-100
      "
    >
      {/* Background Glow */}

      <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-blue-100/60 blur-3xl"></div>

      <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-sky-100 blur-3xl"></div>

      <div className="relative flex items-center justify-between">

        {/* Left */}

        <div>

          <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2">

            <span className="h-2.5 w-2.5 rounded-full bg-blue-600"></span>

            <span className="text-[13px] font-bold uppercase tracking-[0.18em] text-blue-700">

              {label}

            </span>

          </div>

          <h2 className="mt-5 text-[48px] font-extrabold leading-none text-slate-900">

            {value}

          </h2>

          <div className="mt-4 h-1 w-16 rounded-full bg-gradient-to-r from-blue-600 to-sky-400 transition-all duration-500 group-hover:w-28"></div>

        </div>

        {/* Icon */}

        {Icon && (

          <div
            className={`
            flex
            h-16
            w-16
            items-center
            justify-center

            rounded-full

            bg-gradient-to-br

            ${colors[color] || "from-blue-600 to-sky-500"}

            text-white

            shadow-[0_18px_35px_rgba(37,99,235,0.25)]

            transition-all
            duration-500

            group-hover:scale-110
            group-hover:rotate-12
            `}
          >
            <Icon className="text-[28px]" />
          </div>

        )}

      </div>

    </div>
  );
};

export default SummaryCard;