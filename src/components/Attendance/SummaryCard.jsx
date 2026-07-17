const SummaryCard = ({ label, value, color, icon: Icon }) => {
  const colors = {
    green: "bg-emerald-500",
    red: "bg-rose-500",
    yellow: "bg-amber-500",
    amber: "bg-amber-500",
    blue: "bg-blue-600",
    emerald: "bg-emerald-500",
  };

  return (
    <div
      className="
      rounded-[18px]
      border
      border-blue-100

      bg-white

      p-4

      shadow-[0_6px_16px_rgba(30,64,175,0.04)]
    "
    >
      {/* Colored Icon */}
      {Icon && (
        <div
          className={`
            inline-flex
            h-9
            w-9
            items-center
            justify-center

            rounded-[10px]

            text-white

            ${colors[color] || "bg-blue-600"}
          `}
        >
          <Icon size={15} />
        </div>
      )}

      {/* Label */}
      <div className="mt-3 text-[16px] font-bold uppercase tracking-[0.1em] text-slate-600">
        {label}
      </div>

      {/* Large Value */}
      <div className="mt-1 text-[42px] font-extrabold text-slate-900 leading-tight">
        {value}
      </div>
    </div>
  );
};

export default SummaryCard;
