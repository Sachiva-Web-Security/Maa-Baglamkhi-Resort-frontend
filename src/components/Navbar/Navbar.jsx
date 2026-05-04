import { useNavigate, useLocation } from "react-router-dom";

const Navbar = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const role = (localStorage.getItem("role") || "").toLowerCase();
  const userName = localStorage.getItem("name") || "User";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("name");
    localStorage.removeItem("isAuthenticated");
    if (setIsAuthenticated) setIsAuthenticated(false);
    navigate("/login");
  };

  let roleMenus = [];
  if (role === "admin") {
    roleMenus = [
      { name: "Hotel", path: "/hotel" },
      { name: "Restaurant", path: "/restaurant" },
      { name: "Kitchen", path: "/kitchen" },
      { name: "Banquet", path: "/banquet" },
      { name: "Housekeeping", path: "/housekeeping" },
      { name: "Accounts", path: "/accounts" },
      { name: "Inventory", path: "/inventory" },
      { name: "Reports", path: "/reports" },
      { name: "Users", path: "/user" },
    ];
  } else if (role === "waiter") {
    roleMenus = [{ name: "Restaurant", path: "/restaurant" }];
  } else if (role === "receptionist") {
    roleMenus = [
      { name: "Hotel", path: "/hotel" },
      { name: "Banquet", path: "/banquet" },
    ];
  } else if (role === "housekeeping") {
    roleMenus = [
      { name: "Housekeeping", path: "/housekeeping" },
      { name: "Assignments", path: "/assignments" },
    ];
  } else if (role === "accountant") {
    roleMenus = [
      { name: "Accounts", path: "/accounts" },
      { name: "Reports", path: "/reports" },
    ];
  } else if (role === "kitchen") {
    roleMenus = [
      { name: "Kitchen", path: "/kitchen" },
      { name: "Restaurant", path: "/restaurant" },
      { name: "Inventory", path: "/inventory" },
    ];
  } else if (role === "manager" || role === "staff") {
    roleMenus = [
      { name: "Hotel", path: "/hotel" },
      { name: "Restaurant", path: "/restaurant" },
      { name: "Kitchen", path: "/kitchen" },
      { name: "Banquet", path: "/banquet" },
      { name: "Housekeeping", path: "/housekeeping" },
      { name: "Accounts", path: "/accounts" },
      { name: "Inventory", path: "/inventory" },
    ];
  }

  const allMenus = [
    { name: "Dashboard", path: "/dashboard" },
    { name: "Attendance", path: "/attendance" },
    ...roleMenus,
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <header className="simple-navbar">
      {/* Brand */}
      <div className="simple-navbar-brand" onClick={() => navigate("/dashboard")}>
        <div className="simple-navbar-logo">M</div>
        <span className="simple-navbar-title">Maa Baglamukhi Resort</span>
      </div>

      {/* Nav Links */}
      <nav className="simple-navbar-links">
        {allMenus.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`simple-nav-link ${isActive(item.path) ? "simple-nav-link-active" : ""}`}
          >
            {item.name}
          </button>
        ))}
      </nav>

      {/* User Info */}
      <div className="simple-navbar-user">
        <span className="simple-navbar-username">
          {userName} <small className="simple-navbar-role">({role})</small>
        </span>
        <button onClick={handleLogout} className="simple-btn simple-btn-outline simple-btn-sm">
          Logout
        </button>
      </div>
    </header>
  );
};

export default Navbar;
