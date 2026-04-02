const MetricCard = ({ title, value, subtitle, icon: Icon, gradient, onClick }) => {
  const iconEl = Icon ? <Icon className="text-[16px] sm:text-[18px]" /> : null;
  const isTotalRoomsCard = title === "Total Rooms";
  return (
    <div
      onClick={onClick}
      className={`
        group relative h-full min-h-[108px] cursor-pointer overflow-hidden rounded-[20px] border border-white/18 px-3 py-3 text-white
        shadow-[0_16px_34px_rgba(15,23,42,0.14)] transition-all duration-300
        hover:-translate-y-1 hover:scale-[1.01] hover:shadow-[0_24px_55px_rgba(15,23,42,0.2)]
        ${gradient}
      `}
    >



   <div className="pointer-events-none absolute inset-0 
        bg-[linear-gradient(180deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.02)_45%,rgba(15,23,42,0.08)_100%)]" 
      />




   <div className="pointer-events-none absolute inset-0 
        bg-[radial-gradient(circle_at_18%_12%,rgba(214,255,120,0.34)_0%,transparent_28%),
             radial-gradient(circle_at_74%_18%,rgba(156,255,170,0.26)_0%,transparent_24%)]" 
      />

 <div className="pointer-events-none absolute inset-x-3 bottom-2 h-8 rounded-[12px] 
        bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0)_100%)]">
        <div className="absolute inset-x-1 bottom-1 flex items-end justify-between gap-1 opacity-35">
          <span className="h-2.5 w-2 rounded-sm bg-white/80" />
          <span className="h-4 w-2 rounded-sm bg-white/80" />
          <span className="h-6 w-2 rounded-sm bg-white/90" />
          <span className="h-3.5 w-2 rounded-sm bg-white/80" />
          <span className="h-5 w-2 rounded-sm bg-white/90" />
          <span className="h-7 w-2 rounded-sm bg-white/95" />
        </div>
      </div>







      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.02)_45%,rgba(15,23,42,0.08)_100%)]" />
    
      <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-white/18 blur-2xl transition duration-300 group-hover:scale-110" />
      <div className="pointer-events-none absolute -bottom-12 left-0 h-24 w-28 rounded-full bg-slate-950/12 blur-2xl" />

       <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-white/18 blur-2xl transition duration-300 group-hover:scale-110" />
      <div className="pointer-events-none absolute -bottom-12 left-0 h-24 w-28 rounded-full bg-slate-950/12 blur-2xl" />

      {/* Content */}
      <div className="relative grid h-full grid-cols-[minmax(0,1fr)_auto] items-start gap-2.5 sm:gap-3">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1 rounded-full border border-white/14 bg-white/10 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.15em] text-white/88">
            <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
            {title}
          </div>
          <h2 className="mt-2.5 text-[1.3rem] font-black leading-none tracking-[-0.03em] sm:text-[1.5rem]">
            {value}
          </h2>
          <p className="mt-2 line-clamp-2 max-w-[16ch] text-[10px] leading-4 text-white/90 sm:max-w-[18ch] sm:text-[11px]">
            {subtitle}
          </p>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center self-start rounded-[12px] border border-white/22 
          bg-[linear-gradient(180deg,rgba(255,255,255,0.24)_0%,rgba(255,255,255,0.1)_100%)] 
          shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_8px_16px_rgba(15,23,42,0.12)] 
          backdrop-blur-md transition duration-300 group-hover:rotate-3 group-hover:scale-105 sm:h-10 sm:w-10">
          {iconEl}
        </div>
      </div>
    </div>
  );
};

export default MetricCard;
