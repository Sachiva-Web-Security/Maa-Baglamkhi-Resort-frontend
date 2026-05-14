import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import "./Dashboard.css";

const Dashboard = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const auth = localStorage.getItem('isAuthenticated');
    if (auth !== 'true') {
      navigate('/login');
    }
  }, [navigate]);

  const role = (localStorage.getItem("role") || "").toLowerCase();
  const userName = localStorage.getItem("userName") || localStorage.getItem("name") || "User";

  const userPermissions = (() => {
    const storedPerms = localStorage.getItem("permissions");
    if (storedPerms) {
      try {
        return JSON.parse(storedPerms);
      } catch {
        return null;
      }
    }
    const rolePermissions = {
      admin: ["admin", "front_office", "room_dining", "restaurant", "quick_sales", "inventory", "banquet", "gaming_zone"],
      manager: ["front_office", "restaurant", "room_dining", "banquet", "inventory"],
      receptionist: ["front_office", "restaurant", "room_dining", "quick_sales", "banquet"],
      waiter: ["restaurant", "room_dining", "quick_sales"],
      kitchen: ["kitchen_kds", "restaurant"],
      accountant: ["accounts", "reports"],
      housekeeping: ["housekeeping", "assignments"],
      staff: ["front_office"]
    };
    return rolePermissions[role] || [];
  })();

  const isAdmin = role === "admin";

  const modules = [
    { id: "admin", name: "Admin", icon: "📊", path: "/user", color: "#6c5ce7" },
    { id: "front_office", name: "Front Office", icon: "🏨", path: "/hotel", color: "#00b894" },
    { id: "room_dining", name: "Room Dining", icon: "🛎️", path: "/room-service", color: "#e17055" },
    { id: "restaurant", name: "Restaurant", icon: "🍽️", path: "/restaurant", color: "#fdcb6e" },
    { id: "quick_sales", name: "Quick Sales", icon: "⚡", path: "/quick-sales", color: "#74b9ff" },
    { id: "inventory", name: "Inventory", icon: "📦", path: "/inventory", color: "#a29bfe" },
    { id: "banquet", name: "Banquet", icon: "🎉", path: "/banquet", color: "#fd79a8" },
    { id: "gaming_zone", name: "Gaming Zone", icon: "🎮", path: "/reports", color: "#00cec9" },
  ];

  const handleLogout = () => {
    if (confirm("Logout?")) {
      localStorage.clear();
      navigate("/login");
    }
  };

  const setPermissions = () => {
    const perms = prompt(
      "Enter permissions (comma-separated):\n" +
      "admin, front_office, room_dining, restaurant, quick_sales, inventory, banquet, gaming_zone"
    );
    if (perms !== null) {
      localStorage.setItem("permissions", JSON.stringify(perms.split(",").map(p => p.trim())));
      window.location.reload();
    }
  };

  return (
    <div className="urban-dashboard">
      {/* Top Navigation Bar */}
      <div className="urban-nav">
        <div className="urban-nav-brand" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
          <div className="urban-logo">Q</div>
          <span className="urban-brand-name">urbanPOS</span>
        </div>
        <div className="urban-nav-tabs">
          <div className="urban-nav-tab active">Application</div>
        </div>
        <div className="urban-nav-user">
          <span>{userName}</span>
          <span className="urban-nav-arrow" onClick={handleLogout}>🚪</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="urban-main">
        {/* Module Access Grid - The Main Screen */}
        <div className="urban-modules-section">
          <div className="urban-modules-header">
            <span className="urban-modules-title">Select Application</span>
            {isAdmin && (
              <button className="urban-settings-btn" onClick={setPermissions}>
                ⚙️ Set Permissions
              </button>
            )}
          </div>
          <div className="urban-modules-grid">
            {modules.map((mod) => {
              const hasAccess = isAdmin || userPermissions.includes(mod.id);
              return (
                <div
                  key={mod.id}
                  className={`urban-module-tile ${!hasAccess ? 'no-access' : ''}`}
                  onClick={() => {
                    if (!hasAccess) {
                      alert("You don't have permission to access this module.");
                      return;
                    }
                    navigate(mod.path);
                  }}
                  style={hasAccess ? { '--module-color': mod.color } : { filter: 'grayscale(100%)', opacity: 0.5 }}
                >
                  <div className="urban-module-icon">{mod.icon}</div>
                  <div className="urban-module-label">{mod.name}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;