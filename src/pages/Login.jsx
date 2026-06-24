import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

const Login = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

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
      }, { _noAuthRedirect: true });
      const user = res.data;
      login({
        token: user.token,
        role: user.role,
        name: user.name,
        email: user.email,
        permissions: user.permissions,
      });
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
    <div className="urban-login-bg">
      <div className="urban-login-card">
        {/* Logo */}
        <div className="urban-login-logo">
          <div className="urban-logo-circle">Q</div>
          <span className="urban-brand-text">urbanPOS</span>
        </div>

        {/* Welcome */}
        <h1 className="urban-login-title">Welcome to urbanPOS.</h1>
        <p className="urban-login-subtitle">Please sign in to continue.</p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="urban-login-form">
          <div className="urban-login-field">
            <div className="urban-input-icon">👤</div>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Username"
              autoComplete="username"
              aria-label="Username"
              className="urban-input"
            />
          </div>

          <div className="urban-login-field">
            <div className="urban-input-icon">🔒</div>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Password"
              autoComplete="current-password"
              aria-label="Password"
              className="urban-input"
            />
          </div>

          <button type="submit" className="urban-login-btn" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        {/* Support */}
        <div className="urban-login-support">
          <strong>For Sales & Support</strong>
          <div className="urban-contact-info">
            Call us: 9826054590 / 9826254590 / 9324779107
          </div>
          <div className="urban-contact-info">
            Email us: sales@urbanpos.com
          </div>
        </div>

        {/* Footer */}
        <div className="urban-login-footer">
          License Valid Upto: 10 Jun 2026
        </div>
      </div>

      <div className="urban-login-bottom">
        <a href="#">For restaurant demo Click Here</a>
        <div className="urban-copyright">
          © 2020 urbanpos.com, made with ❤ by PulpyOrange™
        </div>
        <div className="urban-legal">
          <a href="#">Terms of Service</a> | <a href="#">Privacy</a>
        </div>
      </div>
    </div>
  );
};

export default Login;