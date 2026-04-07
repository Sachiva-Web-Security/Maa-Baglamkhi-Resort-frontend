const MetricCard = ({ title, value, subtitle, icon: Icon, gradient, onClick }) => {
  const iconEl = Icon ? <Icon className="text-[16px] sm:text-[18px]" /> : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="
        group relative h-full min-h-[128px] cursor-pointer overflow-hidden rounded-[24px]
        border border-slate-200/80 bg-white px-5 py-4 text-left
        shadow-[0_14px_36px_rgba(15,23,42,0.08)] transition-all duration-300
        hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_22px_48px_rgba(15,23,42,0.12)]
        focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 focus-visible:ring-offset-2
      "
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-slate-100 blur-3xl transition duration-300 group-hover:scale-110" />
      <div className="pointer-events-none absolute -bottom-12 left-0 h-24 w-28 rounded-full bg-slate-50 blur-3xl" />

      <div className="relative grid h-full grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:gap-3.5">
        <div className="min-w-0">
          <div className="flex w-full max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-900 sm:text-[11px]">
            <span className={`block h-1.5 w-1.5 rounded-full ${gradient}`} />
            <span className="min-w-0 whitespace-normal break-words leading-tight">{title}</span>
          </div>
          <h2 className="dash-metric-value mt-3 break-words">
            {value}
          </h2>
          <p className="dash-metric-copy mt-2.5">{subtitle}</p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center self-start rounded-[14px] border border-white/60 text-white shadow-[0_12px_24px_rgba(15,23,42,0.14)] transition duration-300 group-hover:rotate-3 group-hover:scale-105 sm:h-12 sm:w-12 xl:h-12 xl:w-12 ${gradient}`}
        >
          {iconEl}
        </div>
      </div>
    </button>
  );
};

export default MetricCard;
