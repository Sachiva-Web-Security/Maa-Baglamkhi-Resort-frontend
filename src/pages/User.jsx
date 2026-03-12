import React, { useState, useEffect } from "react";
import { FaUserPlus, FaSearch } from "react-icons/fa";
import API from "../api";
import CreateUser from "../components/Createuser/CreateUser";

const User = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loggedInEmail = localStorage.getItem("email") || "";
  const loggedInAvatar = localStorage.getItem("avatarUrl") || "";

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await API.get("/users");
        const apiData = Array.isArray(res.data)
          ? res.data
          : res.data.users || [];

        const localUsers = JSON.parse(localStorage.getItem("users")) || [];

        const mergedUsers = [...apiData];

        localUsers.forEach((localUser) => {
          const exists = mergedUsers.some(
            (apiUser) => apiUser.email === localUser.email,
          );
          if (!exists) {
            mergedUsers.push(localUser);
          }
        });

        setUsers(mergedUsers);
      } catch (err) {
        console.error("Failed to load users", err);
        setError("Users load nahi ho pa rahe. Backend check karein.");

        const localUsers = JSON.parse(localStorage.getItem("users")) || [];
        setUsers(localUsers);
      }
    };

    fetchUsers();
  }, []);

  const handleUserCreated = (newUser) => {
    setUsers((prev) => {
      const exists = prev.some((u) => u.email === newUser.email);
      if (exists) return prev;
      return [...prev, newUser];
    });
  };

  const filteredUsers = users.filter((u) => {
    const name = (u.name || u.fullName || u.username || "")
      .toString()
      .toLowerCase();

    const email = (u.email || "").toString().toLowerCase();
    const role = (u.role || u.userRole || "").toString().toLowerCase();

    const searchText = search.toLowerCase();

    return (
      name.includes(searchText) ||
      email.includes(searchText) ||
      role.includes(searchText)
    );
  });

  return (
    <div className="resort-page">
      <div className="resort-shell">
        <section className="resort-hero">
          <div className="resort-hero-content lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="resort-eyebrow">Team Directory</p>
              <h1 className="resort-title">User management made simpler</h1>
              <p className="resort-subtitle">
                Browse staff accounts, roles, and profile images in a cleaner
                responsive directory with quick onboarding access.
              </p>
            </div>
            <div className="resort-stat-grid">
              <div className="resort-stat">
                <span className="resort-stat-label">Total Users</span>
                <span className="resort-stat-value">{users.length}</span>
              </div>
              <div className="resort-stat">
                <span className="resort-stat-label">Visible Users</span>
                <span className="resort-stat-value">{filteredUsers.length}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="resort-panel">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="resort-panel-title">Search and manage staff</h2>
              <p className="resort-panel-copy">
                Quickly search by name, email, or role and create new users when needed.
              </p>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="resort-button inline-flex items-center justify-center gap-2"
            >
              <FaUserPlus />
              Add User
            </button>
          </div>
        </section>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="relative">
        <FaSearch className="absolute left-3 top-3 text-gray-400" />
        <input
          type="text"
          placeholder="Search users..."
          className="resort-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Desktop View - Full Table */}
      <div className="resort-table-shell hidden md:block overflow-x-auto">
        <table className="w-full text-left bg-slate-800 rounded-2xl overflow-hidden">
          <thead className="bg-slate-700 text-white">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Avatar</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
            </tr>
          </thead>

          <tbody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user, index) => {
                const displayName =
                  user.name || user.fullName || user.username || "Unknown User";
                const email = user.email || user.username || "N/A";
                const role = user.role || user.userRole || "N/A";
                const initial = displayName.toString().charAt(0).toUpperCase();

                const backendAvatar = user.avatar || user.avatarUrl || "";

                const avatarSrc =
                  (email && email === loggedInEmail && loggedInAvatar) ||
                  backendAvatar ||
                  "";

                return (
                  <tr
                    key={user.id || user._id || index}
                    className="border-t border-white/10 hover:bg-slate-700/40"
                  >
                    <td className="px-4 py-4 text-white/100">{index + 1}</td>

                    <td className="px-4 py-4">
                      <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold overflow-hidden">
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
                    </td>

                    <td className="px-4 py-4 text-white/100">{displayName}</td>
                    <td className="px-4 py-4 text-white/100">{email}</td>
                    <td className="px-4 py-4">
                      <span className="px-3 py-1 rounded-full text-xs bg-green-100 text-green-700">
                        {role}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="5" className="text-center py-8 text-gray-400">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile View - Card Layout */}
      <div className="md:hidden space-y-3">
        {filteredUsers.length > 0 ? (
          filteredUsers.map((user, index) => {
            const displayName =
              user.name || user.fullName || user.username || "Unknown User";
            const email = user.email || user.username || "N/A";
            const role = user.role || user.userRole || "N/A";
            const initial = displayName.toString().charAt(0).toUpperCase();

            const backendAvatar = user.avatar || user.avatarUrl || "";

            const avatarSrc =
              (email && email === loggedInEmail && loggedInAvatar) ||
              backendAvatar ||
              "";

            return (
              <div
                key={user.id || user._id || index}
                className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 shadow-[0_14px_30px_rgba(15,23,42,0.2)] backdrop-blur-md"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0">
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
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">
                      {displayName}
                    </p>
                    <p className="text-gray-400 text-sm truncate">{email}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 text-xs">#{index + 1}</span>
                  <span className="px-3 py-1 rounded-full text-xs bg-green-100 text-green-700">
                    {role}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-gray-400">No users found</div>
        )}
      </div>

      {showCreateModal && (
        <CreateUser
          onClose={() => setShowCreateModal(false)}
          onUserCreated={handleUserCreated}
        />
      )}
      </div>
    </div>
  );
};

export default User;
