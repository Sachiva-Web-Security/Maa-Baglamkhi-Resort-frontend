const MetricCard = ({ title, value, subtitle, icon: Icon, gradient, onClick }) => {
  const iconEl = Icon ? <Icon size={26} /> : null;
  return (
    <div
      onClick={onClick}
      className={`
        cursor-pointer rounded-[26px] border border-white/18 px-5 py-5 text-white shadow-[0_20px_45px_rgba(15,23,42,0.14)]
        transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.015] hover:shadow-[0_26px_60px_rgba(15,23,42,0.2)]
        ${gradient}
      `}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-white/85 sm:text-[11px]">
            {title}
          </p>
          <h2 className="mt-= text-[1.9rem] font-bold leading-none sm:text-[2.2rem]">
            {value}
          </h2>
          <p className="mt-4 max-w-[19ch] text-sm leading-6 text-white/88 sm:text-[15px]">
            {subtitle}
          </p>
        </div>

        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/16 shadow-inner shadow-white/10 backdrop-blur-md sm:h-14 sm:w-14">
          {iconEl}
        </div>
      </div>
    </div>
  );
};

export default MetricCard;
