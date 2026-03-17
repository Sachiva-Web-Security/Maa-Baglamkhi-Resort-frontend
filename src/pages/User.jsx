import React, { useEffect, useMemo, useState } from "react";
import {
  FaEnvelope,
  FaSearch,
  FaShieldAlt,
  FaUserCheck,
  FaUserPlus,
  FaUsers,
} from "react-icons/fa";

import CreateUser from "../components/Createuser/CreateUser";
import API from "../api";

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
            (apiUser) => apiUser.email === localUser.email
          );
          if (!exists) {
            mergedUsers.push(localUser);
          }
        });

        setUsers(mergedUsers);
      } catch (err) {
        console.error("Failed to load users", err);
        setError("Users load nahi ho pa rahe. Backend check karein.");
        setUsers(JSON.parse(localStorage.getItem("users")) || []);
      }
    };

    fetchUsers();
  }, []);

  const handleUserCreated = (newUser) => {
    setUsers((prev) => {
      const exists = prev.some((user) => user.email === newUser.email);
      if (exists) return prev;
      return [...prev, newUser];
    });
  };

  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        const name = (user.name || user.fullName || user.username || "")
          .toString()
          .toLowerCase();
        const email = (user.email || "").toString().toLowerCase();
        const role = (user.role || user.userRole || "")
          .toString()
          .toLowerCase();
        const searchText = search.toLowerCase();

        return (
          name.includes(searchText) ||
          email.includes(searchText) ||
          role.includes(searchText)
        );
      }),
    [search, users]
  );

  const roleCount = useMemo(
    () =>
      new Set(
        users.map((user) => (user.role || user.userRole || "Unknown").toString())
      ).size,
    [users]
  );

  const getUserMeta = (user, index) => {
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

    return { displayName, email, role, initial, avatarSrc, index: index + 1 };
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[linear-gradient(135deg,#f5fbff_0%,#f3f8f4_28%,#fff8f1_58%,#f8fafc_100%)] p-4 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-8%] top-[-6%] h-72 w-72 rounded-full bg-cyan-200/45 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute right-[-10%] top-[8%] h-72 w-72 rounded-full bg-amber-200/45 blur-3xl sm:h-[28rem] sm:w-[28rem]" />
        <div className="absolute bottom-[18%] left-[18%] h-56 w-56 rounded-full bg-emerald-200/30 blur-3xl sm:h-80 sm:w-80" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.55)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.45)_1px,transparent_1px)] bg-[size:72px_72px] opacity-25" />
      </div>

      <div className="mx-auto max-w-[1260px] space-y-7">
        <section className="overflow-hidden rounded-[28px] border border-slate-900/10 bg-[linear-gradient(120deg,#071b34_0%,#0d4a53_52%,#162d45_100%)] px-5 py-6 shadow-[0_22px_55px_rgba(15,23,42,0.12)] sm:px-7 sm:py-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)] lg:items-center">
            <div className="space-y-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-cyan-200">
                Team Directory
              </p>
              <div className="space-y-2">
                <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl">
                  User management made cleaner and faster
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-slate-100/85 sm:text-base">
                  Dashboard style user directory jahan se aap team members ko
                  search, review aur onboard kar sakte hain with better clarity.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-[0_16px_35px_rgba(255,255,255,0.15)] transition hover:-translate-y-0.5"
                >
                  <FaUserPlus className="text-cyan-600" />
                  Add New User
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {[
                { label: "Total Users", value: users.length },
                { label: "Visible Users", value: filteredUsers.length },
                { label: "Active Roles", value: roleCount },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[22px] border border-white/12 bg-white/10 px-4 py-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md"
                >
                  <span className="text-[11px] text-slate-100/75">{item.label}</span>
                  <div className="mt-3 text-2xl font-bold leading-none">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_340px]">
          <div className="rounded-[26px] border border-white/60 bg-white/82 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5">
            <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
                  User Directory
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  Search and manage staff
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Name, email ya role se quickly search karein aur onboarding ko easy banayein.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-600 to-cyan-500 px-4 py-2.5 text-sm font-bold text-white shadow-[0_12px_30px_rgba(14,165,233,0.24)] transition hover:-translate-y-0.5"
              >
                <FaUserPlus />
                Add User
              </button>
            </div>

            <div className="relative w-full">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search users by name, email or role..."
                className="w-full rounded-[20px] border border-slate-200/80 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {error ? (
              <div className="mt-4 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {error}
              </div>
            ) : null}
          </div>

          <div className="rounded-[26px] border border-white/60 bg-white/82 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5">
            <div className="mb-4 flex items-start gap-3">
              <span className="rounded-2xl bg-cyan-50 p-3 text-cyan-700">
                <FaShieldAlt />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
                  Team Snapshot
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  Quick overview
                </h2>
              </div>
            </div>

            <div className="space-y-3">
              {[
                {
                  icon: FaUsers,
                  title: "Total directory",
                  value: `${users.length} staff accounts available`,
                },
                {
                  icon: FaUserCheck,
                  title: "Filtered view",
                  value: `${filteredUsers.length} users current search mein dikh rahe hain`,
                },
                {
                  icon: FaEnvelope,
                  title: "Search ready",
                  value: "Email, role aur username sab search support karte hain",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-[20px] border border-slate-200/80 bg-slate-50 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="rounded-2xl bg-white p-3 text-slate-700 shadow-sm">
                        <Icon />
                      </span>
                      <div>
                        <div className="text-sm font-bold text-slate-900">
                          {item.title}
                        </div>
                        <div className="mt-1 text-sm leading-6 text-slate-500">
                          {item.value}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="hidden rounded-[26px] border border-white/60 bg-white/82 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:block">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">#</th>
                  <th className="px-5 py-4 font-semibold">Profile</th>
                  <th className="px-5 py-4 font-semibold">Name</th>
                  <th className="px-5 py-4 font-semibold">Email</th>
                  <th className="px-5 py-4 font-semibold">Role</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user, index) => {
                    const meta = getUserMeta(user, index);

                    return (
                      <tr
                        key={user.id || user._id || index}
                        className="border-t border-slate-200/80 transition hover:bg-slate-50/80"
                      >
                        <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                          {meta.index}
                        </td>
                        <td className="px-5 py-4">
                          <div className="h-11 w-11 overflow-hidden rounded-full bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow-md">
                            {meta.avatarSrc ? (
                              <img
                                src={meta.avatarSrc}
                                alt={meta.displayName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center font-bold">
                                {meta.initial || "?"}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold text-slate-900">
                          {meta.displayName}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {meta.email}
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                            {meta.role}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-5 py-12 text-center text-sm font-semibold text-slate-500"
                    >
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-4 lg:hidden">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user, index) => {
              const meta = getUserMeta(user, index);

              return (
                <div
                  key={user.id || user._id || index}
                  className="rounded-[24px] border border-white/60 bg-white/82 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 overflow-hidden rounded-full bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow-md">
                      {meta.avatarSrc ? (
                        <img
                          src={meta.avatarSrc}
                          alt={meta.displayName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center font-bold">
                          {meta.initial || "?"}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-base font-bold text-slate-900">
                        {meta.displayName}
                      </div>
                      <div className="truncate text-sm text-slate-500">
                        {meta.email}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">
                      User #{meta.index}
                    </span>
                    <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                      {meta.role}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-[24px] border border-white/60 bg-white/82 px-4 py-10 text-center text-sm font-semibold text-slate-500 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
              No users found
            </div>
          )}
        </section>

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
