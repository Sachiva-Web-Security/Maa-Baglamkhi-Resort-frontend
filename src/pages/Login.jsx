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
    <div className="maab-login-bg">
      <div className="maab-login-card">
        {/* Logo */}
        <div className="maab-login-logo">
          <div className="maab-logo-circle">Q</div>
          <span className="maab-brand-text">Maa Baglamukhi</span>
        </div>

        {/* Welcome */}
        <h1 className="maab-login-title">Welcome to Maa Baglamukhi Resort.</h1>
        <p className="maab-login-subtitle">Please sign in to continue.</p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="maab-login-form">
          <div className="maab-login-field">
            <div className="maab-input-icon">👤</div>
            <input
              type="email"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Email address"
              autoComplete="username"
              aria-label="Email address"
              className="maab-input"
            />
          </div>

          <div className="maab-login-field">
            <div className="maab-input-icon">🔒</div>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Password"
              autoComplete="current-password"
              aria-label="Password"
              className="maab-input"
            />
          </div>

          <button type="submit" className="maab-login-btn" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        {/* Support */}
        <div className="maab-login-support">
          <strong>For Sales & Support</strong>
          <div className="maab-contact-info">
            Call us: 9826054590 / 9826254590 / 9324779107
          </div>
          <div className="maab-contact-info">
            Email us: sales@maabaglamukhi.com
          </div>
        </div>

        {/* Footer */}
        <div className="maab-login-footer">
          License Valid Upto: 10 Jun 2026
        </div>
      </div>

      <div className="maab-login-bottom">
        <a href="#">For restaurant demo Click Here</a>
        <div className="maab-copyright">
          © 2020 maabaglamukhi.com, made with ❤ by PulpyOrange™
        </div>
        <div className="maab-legal">
          <a href="#">Terms of Service</a> | <a href="#">Privacy</a>
        </div>
      </div>
    </div>
  );
};

export default Login;