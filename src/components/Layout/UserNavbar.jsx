import { useNavigate, useLocation } from 'react-router-dom';

const UserNavbar = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const role = (localStorage.getItem("role") || "").toLowerCase();
  const userName = localStorage.getItem("userName") || localStorage.getItem("name") || "User";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("name");
    localStorage.removeItem("userName");
    localStorage.removeItem("isAuthenticated");
    if (setIsAuthenticated) setIsAuthenticated(false);
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  // Role-based horizontal menu items
  const roleMenus = {
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

  const menus = roleMenus[role] || roleMenus.staff;

  return (
    <nav style={{
      background: 'linear-gradient(90deg, #1a1a2e 0%, #16213e 100%)',
      color: '#fff',
      padding: '0 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: '60px',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          fontSize: '18px',
        }}>
          {userName.charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Maa Baglamukhi</div>
          <div style={{ fontSize: '10px', color: '#aaa' }}>{role ? role.charAt(0).toUpperCase() + role.slice(1) : 'User'}</div>
        </div>
      </div>

      {/* Menu Links */}
      <div style={{ display: 'flex', gap: '4px', flex: 1, justifyContent: 'center' }}>
        {menus.map((menu) => (
          <button
            key={menu.path}
            onClick={() => navigate(menu.path)}
            style={{
              padding: '10px 16px',
              background: isActive(menu.path) ? 'rgba(102, 126, 234, 0.4)' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: isActive(menu.path) ? '#fff' : '#ccc',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: isActive(menu.path) ? '600' : '400',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!isActive(menu.path)) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.color = '#fff';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive(menu.path)) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#ccc';
              }
            }}
          >
            {menu.name}
          </button>
        ))}
      </div>

      {/* User & Logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '14px', fontWeight: '600' }}>{userName}</div>
          <div style={{ fontSize: '11px', color: '#aaa' }}>{role ? role.charAt(0).toUpperCase() + role.slice(1) : 'User'}</div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding: '8px 16px',
            background: 'rgba(255,107,107,0.2)',
            border: '1px solid rgba(255,107,107,0.4)',
            borderRadius: '8px',
            color: '#ff6b6b',
            cursor: 'pointer',
            fontSize: '13px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,107,107,0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,107,107,0.2)';
          }}
        >
          Logout
        </button>
      </div>
    </nav>
  );
};

export default UserNavbar;
