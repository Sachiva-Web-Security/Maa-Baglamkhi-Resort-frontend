const SummaryCard = ({ label, value, color, icon: Icon }) => {
  const colors = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    red: "bg-rose-50 text-rose-700 border-rose-200",
    yellow: "bg-amber-50 text-amber-700 border-amber-200",
    blue: "bg-sky-50 text-sky-700 border-sky-200",
  };

  return (
    <div className="rounded-[24px] border border-white/60 bg-white/82 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {label}
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900">{value}</div>
        </div>
        {Icon ? (
          <span
            className={`inline-flex rounded-2xl border p-3 ${
              colors[color] || "border-slate-200 bg-slate-50 text-slate-700"
            }`}
          >
            <Icon />
          </span>
        ) : null}
      </div>
    </div>
  );
};

export default SummaryCard;
