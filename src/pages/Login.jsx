import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";

const Login = ({ setIsAuthenticated }) => {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
    <div className="simple-login-page">
      <div className="simple-login-card">
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{
            width: 56, height: 56, background: "#1565c0", borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 10px", color: "#fff", fontSize: 22, fontWeight: 700,
          }}>M</div>
          <div className="simple-login-title">Maa Baglamukhi Resort</div>
          <div className="simple-login-subtitle">Management System — Please sign in</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="simple-form-group" style={{ marginBottom: 14 }}>
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

          <div className="simple-form-group" style={{ marginBottom: 20 }}>
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
            disabled={loading}
            className="simple-btn simple-btn-primary w-full simple-btn-lg"
            style={{ width: "100%", justifyContent: "center" }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 16, color: "#aaa", fontSize: 11 }}>
          Maa Baglamukhi Resort &copy; {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
};

export default Login;
