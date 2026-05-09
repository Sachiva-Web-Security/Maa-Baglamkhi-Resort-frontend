import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const Navbar = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const role = (localStorage.getItem("role") || "").toLowerCase();
  const userName = localStorage.getItem("name") || "User";
  const isAdmin = role === "admin";

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

  const [expandedMenus, setExpandedMenus] = useState({
    "Front Office": true,
    "F&B Service": true,
    Housekeeping: false,
    "Admin Controls": false,
  });

  const toggleMenu = (key) => {
    setExpandedMenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isAnyActive = (items = []) => items.some((item) => isActive(item.path));

  if (isAdmin) {
    const adminSidebarMenus = [
      { name: "Dashboard", path: "/dashboard" },
      { name: "Profile", path: "/profile" },
      {
        name: "Front Office",
        children: [
          { name: "Hotel PMS", path: "/hotel" },
          { name: "Banquet", path: "/banquet" },
        ],
      },
      {
        name: "F&B Service",
        children: [
          { name: "Invoice Groups", path: "/restaurant" },
          { name: "Price Groups", path: "/price-groups" },
          { name: "Print Groups", path: "/print-groups" },
          { name: "Item Groups", path: "/item-groups" },
          { name: "Units", path: "/units" },
          { name: "Modifiers", path: "/modifiers" },
          { name: "Items", path: "/inventory" },
          { name: "Table Groups", path: "/table-groups" },
          { name: "Tables", path: "/restaurant" },
          { name: "Parcel Setting", path: "/parcel-setting" },
          { name: "Captains", path: "/user" },
          { name: "Invoices", path: "/accounts" },
          { name: "Edit Invoice", path: "/accounts" },
          { name: "Bar to Food", path: "/bar-to-food" },
          { name: "Room Service", path: "/room-service" },
          { name: "Manage Data", path: "/reports" },
          { name: "Restaurant Settings", path: "/restaurant-settings" },
          { name: "Restaurant POS", path: "/restaurant" },
          { name: "Kitchen", path: "/kitchen" },
          { name: "Quick Sales", path: "/quick-sales" },
        ],
      },
      { name: "Inventory", path: "/inventory" },
      {
        name: "Housekeeping",
        children: [
          { name: "Housekeeping", path: "/housekeeping" },
          { name: "Assignments", path: "/assignments" },
        ],
      },
      { name: "Accounts", path: "/accounts" },
      { name: "Reports", path: "/reports" },
      { name: "Attendance", path: "/attendance" },
      {
        name: "Admin Controls",
        children: [
          { name: "Users", path: "/user" },
          { name: "Create User", path: "/create-user" },
        ],
      },
    ];

    return (
      <aside className="simple-admin-sidebar">
        <div className="simple-admin-brand" onClick={() => navigate("/dashboard")}>
          <div className="simple-admin-brand-logo">Q</div>
          <div className="simple-admin-brand-text">Maa Baglamukhi Resort</div>
        </div>

        <div className="simple-admin-user">
          <div className="simple-admin-user-name">{userName}</div>
          <div className="simple-admin-user-role">Admin</div>
        </div>

        <div className="simple-admin-nav-wrap">
          {adminSidebarMenus.map((menu) => {
            if (!menu.children) {
              return (
                <button
                  key={menu.path}
                  onClick={() => navigate(menu.path)}
                  className={`simple-admin-link ${
                    isActive(menu.path) ? "simple-admin-link-active" : ""
                  }`}
                >
                  {menu.name}
                </button>
              );
            }

            const submenuOpen = expandedMenus[menu.name];
            const submenuHasActive = isAnyActive(menu.children);

            return (
              <div key={menu.name} className="simple-admin-submenu">
                <button
                  type="button"
                  onClick={() => toggleMenu(menu.name)}
                  className={`simple-admin-link simple-admin-link-parent ${
                    submenuHasActive ? "simple-admin-link-active" : ""
                  }`}
                >
                  <span>{menu.name}</span>
                  <span className="simple-admin-caret">{submenuOpen ? "-" : "+"}</span>
                </button>
                {submenuOpen && (
                  <div className="simple-admin-submenu-items">
                    {menu.children.map((child) => (
                      <button
                        key={child.path + child.name}
                        onClick={() => navigate(child.path)}
                        className={`simple-admin-link simple-admin-link-child ${
                          isActive(child.path) ? "simple-admin-link-active" : ""
                        }`}
                      >
                        {child.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button onClick={handleLogout} className="simple-admin-logout">
          Logout
        </button>
      </aside>
    );
  }

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
