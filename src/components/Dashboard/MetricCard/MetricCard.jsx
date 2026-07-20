const MetricCard = ({ title, value, subtitle, icon: Icon, gradient, onClick }) => {
  const iconEl = Icon ? <Icon className="text-[16px] sm:text-[18px]" /> : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="
        dashboard-card group relative h-full min-h-[112px] cursor-pointer overflow-hidden
        px-3.5 py-3 text-left transition-all duration-300 hover:-translate-y-0.5
        hover:border-slate-300 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]
        focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:ring-offset-2
        sm:min-h-[128px] sm:px-5 sm:py-4
      "
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-slate-100/80 blur-3xl transition duration-300 group-hover:scale-110" />
      <div className="pointer-events-none absolute -bottom-10 left-0 h-20 w-24 rounded-full bg-slate-50 blur-3xl" />

      <div className="relative grid h-full grid-cols-[minmax(0,1fr)_auto] items-start gap-2.5 sm:gap-3.5">
        <div className="min-w-0">
          <div className="dashboard-label inline-flex w-fit max-w-full items-center gap-1.5 rounded-full bg-slate-50 px-2 py-0.5 sm:px-2.5 sm:py-1">
            <span className={`block h-2 w-2 shrink-0 rounded-full ${gradient}`} />
            <span className="min-w-0 whitespace-normal break-words leading-tight">{title}</span>
          </div>
          <h2 className="dash-metric-value mt-2 break-words sm:mt-3">
            {value}
          </h2>
          <p className="dash-metric-copy mt-2 sm:mt-2.5">{subtitle}</p>
        </div>

        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center self-start rounded-xl text-white shadow-[0_10px_24px_rgba(15,23,42,0.12)] transition duration-300 group-hover:scale-105 sm:h-11 sm:w-11 xl:h-12 xl:w-12 ${gradient}`}
        >
          {iconEl}
        </div>
      </div>
    </button>
  );
};

export default MetricCard;
