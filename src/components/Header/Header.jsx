import { useNavigate } from "react-router-dom";
import { FaBuilding, FaBars } from "react-icons/fa";

const Header = ({ setIsAuthenticated, setSidebarOpen }) => {
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
      className="fixed top-0 left-0 right-0 h-[70px] 
bg-slate-900
shadow-md flex items-center justify-between px-6 z-50 text-white backdrop-blur-md"
    >
      {/* LEFT SIDE - Mobile Menu Button + Logo */}
      <div className="flex items-center gap-3">
        {/* Hamburger Menu Button - Mobile Only */}
        <button
          className="md:hidden text-xl hover:text-blue-400 transition-colors"
          onClick={() => setSidebarOpen && setSidebarOpen((prev) => !prev)}
        >
          <FaBars />
        </button>

        <h1 className="flex items-center gap-2 text-l font-semi-bold">
          <div className="-ml-2 w-8 h-8 flex items-center justify-center rounded-lg bg-blue-600 text-white">
            <FaBuilding />
          </div>
          Maa Baglamukhi Resort
        </h1>
      </div>

      {/* RIGHT SIDE - User Info + Logout */}

      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">Welcome, {userName}</span>

        <button
          onClick={handleLogout}
          className="bg-white/20 hover:bg-white/30 text-white px-4 py-1 rounded-md text-sm backdrop-blur-md"
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default Header;
