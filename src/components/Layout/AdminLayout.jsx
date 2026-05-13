import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const menuItems = [
  {
    section: 'Main',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: '📊' },
      { path: '/profile', label: 'Profile', icon: '👤' },
    ]
  },
  {
    section: 'Manage',
    items: [
      { path: '/user', label: 'Users', icon: '👥' },
      { path: '/create-user', label: 'Create User', icon: '➕' },
    ]
  },
  {
    section: 'Front Office',
    items: [
      { path: '/hotel', label: 'Hotel / Rooms', icon: '🏨' },
      { path: '/banquet', label: 'Banquet', icon: '🎉' },
      { path: '/attendance', label: 'Attendance', icon: '📋' },
    ]
  },
  {
    section: 'F&B Service',
    items: [
      { path: '/restaurant', label: 'Restaurant POS', icon: '🍽️' },
      { path: '/quick-sales', label: 'Quick Sales', icon: '⚡' },
      { path: '/kitchen', label: 'Kitchen', icon: '👨‍🍳' },
      { path: '/housekeeping', label: 'Housekeeping', icon: '🧹' },
    ]
  },
  {
    section: 'Accounts',
    items: [
      { path: '/accounts', label: 'Accounts', icon: '💰' },
      { path: '/inventory', label: 'Inventory', icon: '📦' },
    ]
  },
  {
    section: 'Restaurant Settings',
    items: [
      { path: '/restaurant-settings', label: 'Restaurant Settings', icon: '⚙️' },
      { path: '/room-service', label: 'Room Service', icon: '🛎️' },
      { path: '/table-groups', label: 'Table Groups', icon: '🪑' },
      { path: '/items', label: 'Items', icon: '🍴' },
      { path: '/modifiers', label: 'Modifiers', icon: '✏️' },
      { path: '/item-groups', label: 'Item Groups', icon: '📁' },
      { path: '/price-groups', label: 'Price Groups', icon: '💵' },
      { path: '/print-groups', label: 'Print Groups', icon: '🖨️' },
      { path: '/units', label: 'Units', icon: '📏' },
      { path: '/invoice-groups', label: 'Invoice Groups', icon: '📄' },
      { path: '/edit-invoice', label: 'Edit Invoice', icon: '📝' },
      { path: '/manage-data', label: 'Manage Data', icon: '🗄️' },
    ]
  },
  {
    section: 'Reports',
    items: [
      { path: '/reports', label: 'Reports', icon: '📈' },
      { path: '/assignments', label: 'Assignments', icon: '📌' },
    ]
  },
];

const AdminLayout = ({ children, setIsAuthenticated }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const userName = localStorage.getItem('userName') || 'Admin';
  const userRole = localStorage.getItem('role') || 'admin';

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userName');
    setIsAuthenticated(false);
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: sidebarOpen ? '260px' : '60px',
          background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
          color: '#fff',
          transition: 'width 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          height: '100vh',
          overflowY: 'auto',
          zIndex: 1000,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: sidebarOpen ? 'space-between' : 'center',
          }}
        >
          {sidebarOpen && (
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Maa Baglamukhi</div>
              <div style={{ fontSize: '11px', color: '#aaa' }}>Resort Admin</div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: '#fff',
              padding: '8px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        {/* User Profile */}
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: sidebarOpen ? 'block' : 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}
          >
            {userName.charAt(0).toUpperCase()}
          </div>
          {sidebarOpen && (
            <div>
              <div style={{ fontWeight: '600', fontSize: '14px' }}>{userName}</div>
              <div style={{ fontSize: '11px', color: '#aaa', textTransform: 'capitalize' }}>{userRole}</div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
          {menuItems.map((section) => (
            <div key={section.section} style={{ marginBottom: '16px' }}>
              {sidebarOpen && (
                <div
                  style={{
                    padding: '8px 16px',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: '#666',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                  }}
                >
                  {section.section}
                </div>
              )}
              {section.items.map((item) => (
                <div
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  style={{
                    padding: sidebarOpen ? '10px 16px' : '10px',
                    margin: '2px 8px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: isActive(item.path) ? 'rgba(102, 126, 234, 0.3)' : 'transparent',
                    color: isActive(item.path) ? '#fff' : '#ccc',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive(item.path)) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                      e.currentTarget.style.color = '#fff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive(item.path)) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#ccc';
                    }
                  }}
                >
                  <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}>{item.icon}</span>
                  {sidebarOpen && <span style={{ fontSize: '14px' }}>{item.label}</span>}
                </div>
              ))}
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div
          onClick={handleLogout}
          style={{
            padding: '16px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: sidebarOpen ? 'flex-start' : 'center',
            gap: '12px',
            color: '#ff6b6b',
            transition: 'background 0.2s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,107,107,0.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <span style={{ fontSize: '18px' }}>🚪</span>
          {sidebarOpen && <span style={{ fontSize: '14px' }}>Logout</span>}
        </div>
      </aside>

      {/* Main Content */}
      <main
        style={{
          marginLeft: sidebarOpen ? '260px' : '60px',
          flex: 1,
          background: '#f5f6fa',
          minHeight: '100vh',
          transition: 'margin-left 0.3s ease',
        }}
      >
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
