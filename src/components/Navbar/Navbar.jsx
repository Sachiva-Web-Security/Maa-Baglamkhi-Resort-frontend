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

  const [expandedMenus, setExpandedMenus] = useState({});
  const toggleMenu = (key) => {
    setExpandedMenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isActive = (path) => location.pathname === path;
  const isAnyActive = (children = []) => children.some(c => isActive(c.path));

  // Role-based sidebar menus
  const roleMenus = {
    admin: [
      { name: "Dashboard", path: "/dashboard" },
      { name: "Profile", path: "/profile" },
      { name: "Attendance", path: "/attendance" },
      { name: "Front Office", children: [
        { name: "Hotel PMS", path: "/hotel" },
        { name: "Banquet", path: "/banquet" },
      ]},
      { name: "F&B Service", children: [
        { name: "Invoice Groups", path: "/invoice-groups" },
        { name: "Price Groups", path: "/price-groups" },
        { name: "Print Groups", path: "/print-groups" },
        { name: "Item Groups", path: "/item-groups" },
        { name: "Units", path: "/units" },
        { name: "Modifiers", path: "/modifiers" },
        { name: "Items", path: "/items" },
        { name: "Table Groups", path: "/table-groups" },
        { name: "Tables", path: "/restaurant" },
        { name: "Parcel Setting", path: "/parcel-setting" },
        { name: "Captains", path: "/user" },
        { name: "Invoices", path: "/accounts" },
        { name: "Edit Invoice", path: "/edit-invoice" },
        { name: "Bar to Food", path: "/bar-to-food" },
        { name: "Room Service", path: "/room-service" },
        { name: "Manage Data", path: "/manage-data" },
        { name: "Restaurant Settings", path: "/restaurant-settings" },
        { name: "Restaurant POS", path: "/restaurant" },
        { name: "Kitchen", path: "/kitchen" },
        { name: "Quick Sales", path: "/quick-sales" },
      ]},
      { name: "Inventory", path: "/inventory" },
      { name: "Housekeeping", children: [
        { name: "Housekeeping", path: "/housekeeping" },
        { name: "Assignments", path: "/assignments" },
      ]},
      { name: "Accounts", path: "/accounts" },
      { name: "Reports", path: "/reports" },
      { name: "Admin Controls", children: [
        { name: "Users", path: "/user" },
        { name: "Create User", path: "/create-user" },
      ]},
    ],
    manager: [
      { name: "Dashboard", path: "/dashboard" },
      { name: "Profile", path: "/profile" },
      { name: "Attendance", path: "/attendance" },
      { name: "Hotel PMS", path: "/hotel" },
      { name: "Restaurant POS", path: "/restaurant" },
      { name: "Kitchen", path: "/kitchen" },
      { name: "Banquet", path: "/banquet" },
      { name: "Housekeeping", path: "/housekeeping" },
      { name: "Assignments", path: "/assignments" },
      { name: "Accounts", path: "/accounts" },
      { name: "Inventory", path: "/inventory" },
      { name: "Reports", path: "/reports" },
    ],
    receptionist: [
      { name: "Dashboard", path: "/dashboard" },
      { name: "Profile", path: "/profile" },
      { name: "Attendance", path: "/attendance" },
      { name: "Hotel PMS", path: "/hotel" },
      { name: "Restaurant POS", path: "/restaurant" },
      { name: "Quick Sales", path: "/quick-sales" },
      { name: "Banquet", path: "/banquet" },
    ],
    waiter: [
      { name: "Dashboard", path: "/dashboard" },
      { name: "Profile", path: "/profile" },
      { name: "Attendance", path: "/attendance" },
      { name: "Restaurant POS", path: "/restaurant" },
      { name: "Quick Sales", path: "/quick-sales" },
      { name: "Room Service", path: "/room-service" },
    ],
    kitchen: [
      { name: "Dashboard", path: "/dashboard" },
      { name: "Profile", path: "/profile" },
      { name: "Attendance", path: "/attendance" },
      { name: "Kitchen", path: "/kitchen" },
      { name: "Restaurant POS", path: "/restaurant" },
      { name: "Inventory", path: "/inventory" },
    ],
    housekeeping: [
      { name: "Dashboard", path: "/dashboard" },
      { name: "Profile", path: "/profile" },
      { name: "Attendance", path: "/attendance" },
      { name: "Housekeeping", path: "/housekeeping" },
      { name: "Assignments", path: "/assignments" },
    ],
    accountant: [
      { name: "Dashboard", path: "/dashboard" },
      { name: "Profile", path: "/profile" },
      { name: "Attendance", path: "/attendance" },
      { name: "Accounts", path: "/accounts" },
      { name: "Reports", path: "/reports" },
    ],
    staff: [
      { name: "Dashboard", path: "/dashboard" },
      { name: "Profile", path: "/profile" },
      { name: "Attendance", path: "/attendance" },
    ],
  };

  const sidebarMenus = roleMenus[role] || roleMenus.staff;

  return (
    <aside className="simple-admin-sidebar">
      <div className="simple-admin-brand" onClick={() => navigate("/dashboard")}>
        <div className="simple-admin-brand-logo">Q</div>
        <div className="simple-admin-brand-text">Maa Baglamukhi Resort</div>
      </div>

      <div className="simple-admin-user">
        <div className="simple-admin-user-name">{userName}</div>
        <div className="simple-admin-user-role">{role ? role.charAt(0).toUpperCase() + role.slice(1) : "User"}</div>
      </div>

      <div className="simple-admin-nav-wrap">
        {sidebarMenus.map((menu) => {
          if (!menu.children) {
            return (
              <button key={menu.path} onClick={() => navigate(menu.path)}
                className={`simple-admin-link ${isActive(menu.path) ? "simple-admin-link-active" : ""}`}>
                {menu.name}
              </button>
            );
          }
          const open = expandedMenus[menu.name] ?? false;
          const hasActive = isAnyActive(menu.children);
          return (
            <div key={menu.name} className="simple-admin-submenu">
              <button onClick={() => toggleMenu(menu.name)}
                className={`simple-admin-link simple-admin-link-parent ${hasActive ? "simple-admin-link-active" : ""}`}>
                <span>{menu.name}</span>
                <span className="simple-admin-caret">{open ? "−" : "+"}</span>
              </button>
              {open && (
                <div className="simple-admin-submenu-items">
                  {menu.children.map((child) => (
                    <button key={child.path + child.name} onClick={() => navigate(child.path)}
                      className={`simple-admin-link simple-admin-link-child ${isActive(child.path) ? "simple-admin-link-active" : ""}`}>
                      {child.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button onClick={handleLogout} className="simple-admin-logout">Logout</button>
    </aside>
  );
};

export default Navbar;