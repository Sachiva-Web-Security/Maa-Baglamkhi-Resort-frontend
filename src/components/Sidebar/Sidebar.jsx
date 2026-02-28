import { useNavigate, useLocation } from "react-router-dom";
import {
  FaBuilding,
  FaHome,
  FaUserCheck,
  FaHotel,
  FaUtensils,
  FaWallet,
  FaBoxes,
  FaBroom,
  FaGlassCheers,
  FaChartBar,
  FaCog,
  FaUser,
  FaFire,
  FaTasks
} from "react-icons/fa";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const role = (localStorage.getItem("role") || "").toLowerCase();
  const userName = localStorage.getItem("name") || "User";
  const avatarUrl = localStorage.getItem("avatarUrl") || "";

  let roleMenus = [];

  if (role === "admin") {
    roleMenus = [
      { id: 2, name: "Attendance", icon: FaUserCheck, path: "/attendance" },
      { id: 3, name: "Hotel", icon: FaHotel, path: "/hotel" },
      { id: 4, name: "Restaurant POS", icon: FaUtensils, path: "/restaurant" },
      { id: 12, name: "Kitchen", icon: FaFire, path: "/kitchen" },
      { id: 5, name: "Accounts", icon: FaWallet, path: "/accounts" },
      { id: 6, name: "Inventory", icon: FaBoxes, path: "/inventory" },
      { id: 7, name: "Housekeeping", icon: FaBroom, path: "/housekeeping" },
      { id: 13, name: "Assignments", icon: FaTasks, path: "/assignments" },
      { id: 8, name: "Banquet", icon: FaGlassCheers, path: "/banquet" },
      { id: 9, name: "Reports", icon: FaChartBar, path: "/reports" },
      { id: 11, name: "User Management", icon: FaUserCheck, path: "/user" },
    ];
  } else if (role === "waiter") {
    roleMenus = [
      { id: 2, name: "Attendance", icon: FaUserCheck, path: "/attendance" },
      { id: 3, name: "Restaurant POS", icon: FaUtensils, path: "/restaurant" },
    ];
  } else if (role === "receptionist") {
    roleMenus = [
      { id: 2, name: "Attendance", icon: FaUserCheck, path: "/attendance" },
      { id: 3, name: "Hotel", icon: FaHotel, path: "/hotel" },
      { id: 4, name: "Banquet", icon: FaGlassCheers, path: "/banquet" },
    ];
  } else if (role === "housekeeping") {
    roleMenus = [
      { id: 2, name: "Housekeeping", icon: FaBroom, path: "/housekeeping" },
      { id: 13, name: "Assignments", icon: FaTasks, path: "/assignments" },
    ];
  } else if (role === "accountant") {
    roleMenus = [
      { id: 2, name: "Accounts", icon: FaWallet, path: "/accounts" },
      { id: 3, name: "Reports", icon: FaChartBar, path: "/reports" },
    ];
  } else if (role === "kitchen") {
    roleMenus = [
      { id: 12, name: "Kitchen", icon: FaFire, path: "/kitchen" },
      { id: 2, name: "Restaurant POS", icon: FaUtensils, path: "/restaurant" },
      { id: 3, name: "Inventory", icon: FaBoxes, path: "/inventory" },
    ];
  } else if (role === "manager" || role === "staff") {
    roleMenus = [
      { id: 2, name: "Attendance", icon: FaUserCheck, path: "/attendance" },
      { id: 3, name: "Hotel", icon: FaHotel, path: "/hotel" },
      { id: 4, name: "Restaurant POS", icon: FaUtensils, path: "/restaurant" },
      { id: 12, name: "Kitchen", icon: FaFire, path: "/kitchen" },
      { id: 5, name: "Accounts", icon: FaWallet, path: "/accounts" },
      { id: 6, name: "Inventory", icon: FaBoxes, path: "/inventory" },
      { id: 7, name: "Housekeeping", icon: FaBroom, path: "/housekeeping" },
      { id: 13, name: "Assignments", icon: FaTasks, path: "/assignments" },
    ];
  }

  const menuItems = [
    { id: 1, name: "Dashboard", icon: FaHome, path: "/dashboard" },
    { id: 99, name: "My Profile", icon: FaUser, path: "/profile" },
    ...roleMenus,
  ];

  const handleNavClick = (path) => navigate(path);
  const isActive = (path) => location.pathname === path;

  return (
    <div
      className="
      fixed top-[70px] left-0
      w-[250px] h-[calc(100vh-70px)]
      flex flex-col justify-between
      text-gray-800
      bg-slate-900
      shadow-2xl rounded-r-3xl
    "
    >
      <style>
        {`
.sidebar-scroll::-webkit-scrollbar {
  width: 6px;
}

.sidebar-scroll::-webkit-scrollbar-track {
  background: #0f172a; /* same as bg-slate-900 */
}

.sidebar-scroll::-webkit-scrollbar-thumb {
  background: #192034;
  border-radius: 10px;
}

.sidebar-scroll::-webkit-scrollbar-thumb:hover {
  background: #1d4ed8;
}
`}
      </style>
      {/* Menu */}
      <nav className="flex-1 px-4 space-y-2 overflow-y-auto font-bold sidebar-scroll">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.id}
              onClick={() => handleNavClick(item.path)}
              className={`
            flex items-center gap-3
           px-4 py-3 rounded-xl
          cursor-pointer transition-all duration-300
          hover:bg-blue-600 hover:text-white hover:shadow-md
      ${isActive(item.path) ? "bg-blue-600 text-white shadow-md" : ""}
   `}
            >
              <Icon className="text-lg text-white" />
              <span className="text-base font-bold text-white">{item.name}</span>
            </div>
          );
        })}
      </nav>

      {/* Profile */}
      <div className="p-3 border-t border-gray-700 bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-white">
            👤
          </div>
          <div>
            <p className="text-lg font-bold text-white">{userName}</p>
            <p className="text-base font-bold text-gray-300">
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
