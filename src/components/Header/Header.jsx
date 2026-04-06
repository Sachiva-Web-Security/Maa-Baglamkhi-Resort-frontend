import { useNavigate } from "react-router-dom";
import { FaBuilding } from "react-icons/fa";

const Header = ({ setIsAuthenticated }) => {
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
      className="fixed top-0 left-0 right-0 h-22 
bg-slate-900
shadow-md flex items-center justify-between px-6 z-50 text-white backdrop-blur-md"
    >
      {/* LEFT SIDE - Mobile Menu Button + Logo */}
      <div className="flex items-center gap-3">
  <h1 className="flex items-center gap-2 text-2xl font-semibold">
    
    <div className="w-17 h-17 rounded-full bg-blue-700 flex items-center justify-center overflow-hidden">
      <img
        className="w-full h-full object-cover rounded-full"
        src="https://www.maabaglamukhinalkehda.com/assets/images/maa2.jpg"
        alt="Logo"
      />
    </div>

    Maa Baglamukhi Resort
  </h1>
</div>

      {/* RIGHT SIDE - User Info + Logout */}

      <div className="flex items-center gap-4">
        <span className="hidden sm:inline text-xl font-medium">
          Welcome, {userName}
        </span>

        <button
          onClick={handleLogout}
          className="bg-blue-500 h-10 hover:bg-red-900 text-white px-4 py-1 rounded-md text-sm backdrop-blur-md"
        >
          Logout
        </button>
        {/* test v2 */}
      </div>
    </header>
  );
};

export default Header;
