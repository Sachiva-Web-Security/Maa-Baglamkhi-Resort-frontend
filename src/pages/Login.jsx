import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import "./Login.css";

const Login = ({ setIsAuthenticated }) => {
  const [formData, setFormData] = useState({
    username: "admin@resort.com",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState("admin");
  const navigate = useNavigate();

  const roleTiles = [
    {
      id: "admin",
      label: "Admin",
      image:
        "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=900&q=80",
    },
    {
      id: "manager",
      label: "Manager",
      image:
        "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=900&q=80",
    },
    {
      id: "receptionist",
      label: "Receptionist",
      image:
        "https://images.unsplash.com/photo-1557426272-fc759fdf7a8d?auto=format&fit=crop&w=900&q=80",
    },
    {
      id: "waiter",
      label: "Waiter",
      image:
        "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=80",
    },
    {
      id: "kitchen",
      label: "Kitchen",
      image:
        "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=900&q=80",
    },
    {
      id: "accountant",
      label: "Accountant",
      image:
        "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=900&q=80",
    },
    {
      id: "housekeeping",
      label: "Housekeeping",
      image:
        "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80",
    },
    {
      id: "staff",
      label: "Staff",
      image:
        "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80",
    },
  ];

  const roleSeedEmailMap = {
    admin: "admin@resort.com",
    manager: "manager@resort.com",
    receptionist: "reception@resort.com",
    waiter: "waiter@resort.com",
    kitchen: "kitchen@resort.com",
    accountant: "accounts@resort.com",
    housekeeping: "tarun@resort.com",
    staff: "staff@resort.com",
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username || !formData.password) {
      alert("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      const res = await API.post("/auth/login", {
        email: formData.username,
        password: formData.password,
      });
      const user = res.data;
      localStorage.setItem("token", user.token);
      localStorage.setItem("role", user.role.toLowerCase());
      localStorage.setItem("name", user.name);
      localStorage.setItem("email", user.email);
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("selectedRole", selectedRole);
      if (setIsAuthenticated) setIsAuthenticated(true);
      navigate("/dashboard", { state: { loginSuccess: true } });
    } catch (error) {
      let errorMsg;
      if (error.message === "Network Error") {
        errorMsg = `Unable to reach server. Please make sure the backend is running.`;
      } else {
        errorMsg = error.response?.data?.message || "Invalid Credentials";
      }
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="module-login-page">
      <div className="module-login-shell">
        <div className="module-login-header">
          <div>
            <h1 className="module-login-title">Maa Baglamukhi Resort</h1>
            <p className="module-login-subtitle">
              Choose your department and sign in
            </p>
          </div>
          <button
            type="button"
            className="module-login-close"
            onClick={() => setSelectedRole("")}
          >
            Close
          </button>
        </div>

        <div className="module-grid">
          {roleTiles.map((tile) => (
            <button
              key={tile.id}
              type="button"
              className={`module-tile ${
                selectedRole === tile.id ? "is-selected" : ""
              }`}
              onClick={() => {
                setSelectedRole(tile.id);
                setFormData((prev) => ({
                  ...prev,
                  username: roleSeedEmailMap[tile.id] || "",
                }));
              }}
              style={{ backgroundImage: `url(${tile.image})` }}
            >
              <span>{tile.label}</span>
            </button>
          ))}
        </div>

        <div className="module-login-form-wrap">
          <div className="module-selected">
            Selected Role:{" "}
            <strong>
              {roleTiles.find((role) => role.id === selectedRole)?.label ||
                "Choose from above"}
            </strong>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="simple-form-group" style={{ marginBottom: 12 }}>
              <label className="simple-label">Email Address</label>
              <input
                type="email"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter your email"
                required
                className="simple-input"
              />
            </div>

            <div className="simple-form-group" style={{ marginBottom: 16 }}>
              <label className="simple-label">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
                className="simple-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !selectedRole}
              className="simple-btn simple-btn-primary w-full simple-btn-lg"
              style={{ width: "100%", justifyContent: "center" }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <div style={{ textAlign: "center", marginTop: 14, color: "#aaa", fontSize: 11 }}>
          Maa Baglamukhi Resort &copy; {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
};

export default Login;
