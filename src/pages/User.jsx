import React, { useState, useEffect } from "react";
import { FaUserPlus, FaSearch } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import API from "../api";

const User = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const loggedInEmail = localStorage.getItem("email") || "";
  const loggedInAvatar = localStorage.getItem("avatarUrl") || "";

  // Load users from backend + localStorage every time page opens
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await API.get("/users");
        // Adjust this depending on your backend response shape
        const apiData = Array.isArray(res.data)
          ? res.data
          : res.data.users || [];

        const localUsers =
          JSON.parse(localStorage.getItem("users")) || [];

        // Simple merge (backend + localStorage)
        setUsers([...apiData, ...localUsers]);
      } catch (err) {
        console.error("Failed to load users", err);
        setError("Users load nahi ho pa rahe. Backend check karein.");

        // Backend fail ho to kam se kam localStorage se dikha do
        const localUsers =
          JSON.parse(localStorage.getItem("users")) || [];
        setUsers(localUsers);
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = users.filter((u) => {
    const name =
      (u.name || u.fullName || u.username || "").toString().toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <div>
      <div className="simple-page-header">
        <h1 className="simple-page-title">User Management</h1>

        <button
          onClick={() => navigate("/create-user")}
          className="add-user-btn"
        >
          <FaUserPlus />
          Add User
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="error-message">
          {error}
        </p>
      )}

      {/* Search */}
      <div className="user-search-bar">
        <FaSearch className="absolute left-3 top-3 text-gray-400" />
        <input
          type="text"
          placeholder="Search users..."
          className="user-search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Cards */}
      <div className="user-cards-grid">
        {filteredUsers.map((user, index) => {
          const displayName =
            user.name || user.fullName || user.username || "Unknown User";
          const email = user.email || user.username || "N/A";
          const role = user.role || user.userRole || "N/A";
          const initial = displayName.toString().charAt(0).toUpperCase();

          // Agar backend future me avatar bheje to use kar sakte hain
          const backendAvatar = user.avatar || user.avatarUrl || "";

          // Current logged-in user ke liye localStorage wala avatar use karo
          const avatarSrc =
            (email && email === loggedInEmail && loggedInAvatar) ||
            backendAvatar ||
            "";

          return (
            <div className="user-card">
              <div className="user-card-header">
                <div className="user-avatar">
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    initial || "?"
                  )}
                </div>

                <div className="user-card-info">
                  <h2 className="user-name">{displayName}</h2>
                  <p className="user-email">{email}</p>
                </div>
              </div>

              <span className="user-role-badge">
                {role}
              </span>
            </div>
          );
        })}
      </div>

      {users.length === 0 && (
        <p className="empty-order">
          No users created yet
        </p>
      )}
    </div>
  );
};

export default User;