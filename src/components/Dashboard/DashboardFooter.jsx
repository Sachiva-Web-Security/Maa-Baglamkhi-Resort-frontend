const dashboardFooterHighlights = [
  // "Daily hotel operations",
  // "Live booking and revenue view",
  // "Front desk friendly workflow",
];

const DashboardFooter = ({ contentOffset = 0 }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      id="dashboard-footer"
      className="relative w-full h-20 overflow-hidden border-t border-white/10 bg-[linear-gradient(180deg,#020617_0%,#050b16_42%,#000000_100%)] px-5 py-10 shadow-[0_-20px_60px_rgba(2,6,23,0.45)] sm:px-6 sm:py-12 lg:px-10 lg:py-14"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.18),transparent_26%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_24%)]" />
      <div className="relative">
        <div className="mx-auto flex min-h-[240px] w-full max-w-7xl flex-col justify-between gap-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              {/* <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-300">
                Dashboard Footer
              </p> */}
              {/* <h3 className="mt-2 text-xl font-bold text-white sm:text-2xl">
                Maa Baglamukhi Resort operations at a glance
              </h3> */}
              {/* <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Track reservations, room readiness, occupancy, and food sales from one clean
                dashboard workspace built for everyday hotel operations.
              </p> */}
            </div>

            <div className="flex flex-wrap gap-2.5">
              {dashboardFooterHighlights.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-200 shadow-[0_10px_25px_rgba(0,0,0,0.22)] backdrop-blur-sm"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-white/10 pt-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-slate-300">Powered by Maa Baglamukhi Resort Dashboard</span>
            <span>&copy; {currentYear} All rights reserved</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default DashboardFooter;
