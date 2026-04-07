import { useNavigate } from "react-router-dom";

const Header = ({ setIsAuthenticated, sidebarOffset = 0, isMobile = false }) => {
  const navigate = useNavigate();
  const userName = localStorage.getItem("name") || "User";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("name");
    localStorage.removeItem("isAuthenticated");

    if (setIsAuthenticated) {
      setIsAuthenticated(false);
    }

    navigate("/login");
  };

  return (
    <header
      className="fixed top-0 z-50 flex h-[70px] items-center justify-between border-b border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] px-4 text-slate-900 shadow-[0_8px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:px-6"
      style={{
        left: isMobile ? 0 : sidebarOffset,
        width: isMobile ? "100%" : `calc(100% - ${sidebarOffset}px)`,
      }}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-slate-900 shadow-lg ring-1 ring-slate-900/10">
          <img
            className="h-full w-full object-cover"
            src="https://www.maabaglamukhinalkehda.com/assets/images/maa2.jpg"
            alt="Logo"
          />
        </div>
        <div className="leading-tight">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-600">
            Resort operations
          </p>
          <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">
            Maa Baglamukhi Resort
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <span className="hidden rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 sm:inline-flex">
          Welcome, {userName}
        </span>

        <button
          onClick={handleLogout}
          className="inline-flex h-10 items-center justify-center rounded-full bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-sky-700"
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default Header;
