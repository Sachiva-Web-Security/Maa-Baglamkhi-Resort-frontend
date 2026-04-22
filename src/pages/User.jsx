import React, { useEffect, useMemo, useState } from "react";
import {
  FaEdit,
  FaSearch,
  FaTrash,
  FaTimes,
  FaUserPlus,
} from "react-icons/fa";

import CreateUser from "../components/Createuser/CreateUser";
import API from "../api";

const User = () => {




  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");
  const [paginationMessage, setPaginationMessage] = useState("");
  const [page, setPage] = useState(1);
  const [usersPerPage, setUsersPerPage] = useState(8);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role: "staff",
    password: "",
  });
  const [editError, setEditError] = useState("");
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  const loggedInEmail = localStorage.getItem("email") || "";
  const loggedInAvatar = localStorage.getItem("avatarUrl") || "";
  const currentUserRole = (localStorage.getItem("role") || "").toLowerCase();
  const isAdmin = currentUserRole === "admin";

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

        setError("");
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
    setError("");
    setUsers((prev) => {
      const exists = prev.some((user) => user.email === newUser.email);
      if (exists) return prev;
      return [...prev, newUser];
    });
    setSuccessMessage(`${newUser.name || "User"} created successfully`);
  };

  const handleDeleteUser = async (user) => {
    if (!isAdmin) {
      setError("Sirf admin user account delete kar sakta hai.");
      return;
    }

    const id = user.id || user._id;
    if (!id) {
      setError("User id missing hai, delete nahi ho pa raha.");
      return;
    }

    try {
      setError("");
      await API.delete(`/users/${id}`, { skipAuthRedirect: true });
      setUsers((prev) =>
        prev.filter((item) => String(item.id || item._id) !== String(id))
      );

      const localUsers = JSON.parse(localStorage.getItem("users")) || [];
      localStorage.setItem(
        "users",
        JSON.stringify(
          localUsers.filter(
            (item) =>
              String(item.id) !== String(id) &&
              String(item.email || "").toLowerCase() !==
                String(user.email || "").toLowerCase()
          )
        )
      );

      setDeleteMessage(`${user.name || user.fullName || "User"} deleted successfully`);
    } catch (err) {
      console.error("Failed to delete user", err);
      const status = err.response?.status;
      if (status === 403) {
        setError("Sirf admin user account delete kar sakta hai.");
      } else if (status === 401) {
        setError("Session expire ho gayi hai ya token missing hai. Delete action roka gaya hai.");
      } else if (status === 404) {
        setUsers((prev) =>
          prev.filter(
            (item) =>
              String(item.id || item._id) !== String(id) &&
              String(item.email || "").toLowerCase() !==
                String(user.email || "").toLowerCase()
          )
        );
        const localUsers = JSON.parse(localStorage.getItem("users")) || [];
        localStorage.setItem(
          "users",
          JSON.stringify(
            localUsers.filter(
              (item) =>
                String(item.id) !== String(id) &&
                String(item.email || "").toLowerCase() !==
                  String(user.email || "").toLowerCase()
            )
          )
        );
        setDeleteMessage(`${user.name || user.fullName || "User"} deleted successfully`);
      } else {
        setError(err.response?.data?.message || "User delete nahi ho paaya.");
      }
    }
  };

  const openEditUser = (user) => {
    if (!isAdmin) {
      setError("Sirf admin user account edit kar sakta hai.");
      return;
    }

    setError("");
    setEditError("");
    setEditingUser(user);
    setEditForm({
      name: user.name || user.fullName || user.username || "",
      email: user.email || "",
      role: String(user.role || user.userRole || "staff").toLowerCase(),
      password: "",
    });
  };

  const handleEditChange = (e) => {
    setEditError("");
    setEditForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleUsersPerPageChange = (size) => {
    setPaginationMessage("");
    setPage(1);
    setUsersPerPage(size);
    if (filteredUsers.length <= size) {
      setPaginationMessage("Abhi aur user nahi hain.");
    }
  };

  const handlePrevPage = () => {
    if (page === 1) {
      setPaginationMessage("Aap first page par hain.");
      return;
    }

    setPaginationMessage("");
    setPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    if (page >= totalPages) {
      setPaginationMessage("Abhi aur user nahi hain.");
      return;
    }

    setPaginationMessage("");
    setPage((prev) => Math.min(totalPages, prev + 1));
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!isAdmin) {
      setEditError("Sirf admin user account edit kar sakta hai.");
      return;
    }

    const id = editingUser.id || editingUser._id;
    if (!id) {
      setEditError("User id missing hai, update nahi ho pa raha.");
      return;
    }

    try {
      setIsUpdatingUser(true);
      setEditError("");
      setError("");

      const payload = {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        role: editForm.role,
      };

      if (editForm.password.trim()) {
        payload.password = editForm.password.trim();
      }

      const res = await API.put(`/users/${id}`, payload, {
        skipAuthRedirect: true,
      });

      const updatedUser = res.data?.user || { ...editingUser, ...payload, id };

      setUsers((prev) =>
        prev.map((user) =>
          String(user.id || user._id) === String(id)
            ? { ...user, ...updatedUser }
            : user
        )
      );

      const localUsers = JSON.parse(localStorage.getItem("users")) || [];
      localStorage.setItem(
        "users",
        JSON.stringify(
          localUsers.map((user) =>
            String(user.id) === String(id) ? { ...user, ...updatedUser } : user
          )
        )
      );

      const updatedEmail = updatedUser.email || payload.email;
      if (
        String(editingUser.email || "").toLowerCase() ===
        String(loggedInEmail || "").toLowerCase()
      ) {
        localStorage.setItem("name", updatedUser.name || payload.name);
        localStorage.setItem("email", updatedEmail);
        localStorage.setItem("role", updatedUser.role || payload.role);
      }

      setEditingUser(null);
      setSuccessMessage(`${updatedUser.name || "User"} updated successfully`);
    } catch (err) {
      console.error("Failed to update user", err);
      const status = err.response?.status;
      if (status === 403) {
        setEditError("Sirf admin user account edit kar sakta hai.");
      } else if (status === 401) {
        setEditError("Session expire ho gayi hai ya token missing hai.");
      } else {
        setEditError(err.response?.data?.message || "User update nahi ho paaya.");
      }
    } finally {
      setIsUpdatingUser(false);
    }
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

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredUsers.length / usersPerPage)),
    [filteredUsers.length, usersPerPage]
  );

  const paginationItems = useMemo(() => {
    if (totalPages <= 1) return [1];

    const items = [1];
    const windowStart = Math.max(2, page - 1);
    const windowEnd = Math.min(totalPages - 1, page + 1);

    if (windowStart > 2) {
      items.push("start-ellipsis");
    }

    for (let pageNumber = windowStart; pageNumber <= windowEnd; pageNumber += 1) {
      items.push(pageNumber);
    }

    if (windowEnd < totalPages - 1) {
      items.push("end-ellipsis");
    }

    items.push(totalPages);
    return items;
  }, [page, totalPages]);

  const visibleUsers = useMemo(() => {
    const startIndex = (page - 1) * usersPerPage;
    return filteredUsers.slice(startIndex, startIndex + usersPerPage);
  }, [filteredUsers, page, usersPerPage]);

  useEffect(() => {
    setPage(1);
  }, [search, users.length, usersPerPage]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);







  

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
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[linear-gradient(135deg,#f5fbff_0%,#f3f8f4_28%,#fff8f1_58%,#f8fafc_100%)] p-4 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-8%] top-[-6%] h-72 w-72 rounded-full bg-cyan-200/45 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute right-[-10%] top-[8%] h-72 w-72 rounded-full bg-amber-200/45 blur-3xl sm:h-[28rem] sm:w-[28rem]" />
        <div className="absolute bottom-[18%] left-[18%] h-56 w-56 rounded-full bg-emerald-200/30 blur-3xl sm:h-80 sm:w-80" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.55)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.45)_1px,transparent_1px)] bg-[size:72px_72px] opacity-25" />
      </div>

      <div className="w-full space-y-7">
        <section className="overflow-hidden rounded-[28px] border border-stone-200 bg-[linear-gradient(100deg,#fffdf8_0%,#fffaf2_45%,#fdf7ed_100%)] px-5 py-6 shadow-[0_20px_45px_rgba(120,113,108,0.14)] sm:px-7 sm:py-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)] lg:items-center">
            <div className="space-y-7">
              <p className="text-xl  font-semibold uppercase tracking-[0.29em] text-slate-600">
                Team Directory
              </p>
              <div className="space-y-2">
                <h1 className="text-3xl font-black leading-tight text-slate-900 sm:text-4xl">
                  User management made cleaner and faster
                </h1>
                <p className="max-w-3xl text-2xl leading-6 text-slate-700 sm:text-base">
                 Dashboard-style user directory where you can search, review, and onboard team members with better clarity.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  disabled={!isAdmin}
                  className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-5 py-3 text-xl font-bold text-slate-900 shadow-[0_10px_24px_rgba(120,113,108,0.12)] transition hover:-translate-y-0.5 hover:border-stone-300 hover:bg-stone-50"
                >
                  <FaUserPlus className="text-amber-600" />
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
                  className="rounded-[22px] border border-stone-200 bg-white/90 px-4 py-4 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
                >
                  <span className="text-[18px] text-slate-600">{item.label}</span>
                  <div className="mt-3 text-3xl font-bold leading-none">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[26px] border border-white/60 bg-white/82 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5">
          <div>
            <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[16px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
                  User Directory
                </p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  Search and manage staff
                </h2>
                <p className="mt-2 text-xl text-slate-500">
                  Name, email ya role se quickly search karein aur onboarding ko easy banayein.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                disabled={!isAdmin}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-600 to-cyan-500 px-4 py-2.5 text-xl font-bold text-white shadow-[0_12px_30px_rgba(14,165,233,0.24)] transition hover:-translate-y-0.5"
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
                className="w-full rounded-[20px] border border-slate-200/80 bg-white py-3 pl-11 pr-4 text-[19px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {error ? (
              <div className="mt-4 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {error}
              </div>
            ) : null}

            {!isAdmin ? (
              <div className="mt-4 rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-xl font-semibold text-amber-700">
         Edit, create, and delete actions are allowed only for the admin account.
              </div>
            ) : null}
          </div>

          <div className="mt-5 hidden overflow-x-auto rounded-[22px] border border-slate-200/80 bg-white lg:block">
            <table className="min-w-full text-left">
              <thead className="bg-slate-50 text-xl uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">#</th>
                  <th className="px-5 py-4 font-semibold">Profile</th>
                  <th className="px-5 py-4 font-semibold">Name</th>
                  <th className="px-5 py-4 font-semibold">Email</th>
                  <th className="px-5 py-4 font-semibold">Role</th>
                  <th className="px-5 py-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleUsers.length > 0 ? (
                  visibleUsers.map((user, index) => {
                    const meta = getUserMeta(
                      user,
                      (page - 1) * usersPerPage + index
                    );

                    return (
                      <tr
                        key={user.id || user._id || index}
                        className="border-t border-slate-200/80 transition hover:bg-slate-50/80"
                      >
                        <td className="px-5 py-4 text-xl font-semibold text-slate-700">
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
                        <td className="px-5 py-4 text-xl font-semibold text-slate-900">
                          {meta.displayName}
                        </td>
                        <td className="px-5 py-4 text-xl text-slate-600">
                          {meta.email}
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xl font-bold text-emerald-700">
                            {meta.role}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditUser(user)}
                              disabled={!isAdmin}
                              className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-2 text-xl font-bold text-cyan-700 transition hover:bg-cyan-100"
                            >
                              <FaEdit />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(user)}
                              disabled={!isAdmin}
                              className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xl font-bold text-rose-700 transition hover:bg-rose-100"
                            >
                              <FaTrash />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-5 py-12 text-center text-xl font-semibold text-slate-500"
                    >
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-5 grid gap-4 lg:hidden">
          {visibleUsers.length > 0 ? (
            visibleUsers.map((user, index) => {
              const meta = getUserMeta(
                user,
                (page - 1) * usersPerPage + index
              );

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
                      <div className="truncate text-xl font-bold text-slate-900">
                        {meta.displayName}
                      </div>
                      <div className="truncate text-xl text-slate-500">
                        {meta.email}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xl font-semibold text-slate-500">
                      User #{meta.index}
                    </span>
                    <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xl font-bold text-emerald-700">
                      {meta.role}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEditUser(user)}
                    disabled={!isAdmin}
                    className="mt-4 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-2 text-xl font-bold text-cyan-700 transition hover:bg-cyan-100"
                  >
                    <FaEdit />
                    Edit User
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteUser(user)}
                    disabled={!isAdmin}
                    className="mt-4 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xl font-bold text-rose-700 transition hover:bg-rose-100"
                  >
                    <FaTrash />
                    Delete User
                  </button>
                </div>
              );
            })
          ) : (
            <div className="rounded-[24px] border border-white/60 bg-white/82 px-4 py-10 text-center text-xl font-semibold text-slate-500 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
              No users found
            </div>
          )}
          </div>

          {filteredUsers.length > 0 ? (
            <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="text-xl text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-900">
                  {filteredUsers.length ? (page - 1) * usersPerPage + 1 : 0}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-slate-900">
                  {Math.min(page * usersPerPage, filteredUsers.length)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-900">
                  {filteredUsers.length}
                </span>{" "}
                users
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={page === 1}
                className="inline-flex items-center justify-center rounded-full border border-slate-600 bg-white px-5 py-3 text-xl font-bold text-slate-700 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Prev
              </button>
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-2">
                {[5, 10, 25, 50].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => handleUsersPerPageChange(size)}
                    className={`rounded-full px-3 py-1.5 text-xl font-bold transition ${
                      usersPerPage === size
                        ? "bg-cyan-500 text-white shadow-[0_10px_24px_rgba(14,165,233,0.18)]"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {paginationItems.map((item) =>
                  typeof item === "number" ? (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setPaginationMessage("");
                        setPage(item);
                      }}
                      className={`h-10 min-w-10 rounded-full px-3 text-xl font-semibold transition ${
                        page === item
                          ? "bg-cyan-500 text-white shadow-[0_10px_24px_rgba(14,165,233,0.18)]"
                          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {item}
                    </button>
                  ) : (
                    <span
                      key={item}
                      className="px-1 text-xl font-semibold tracking-[0.2em] text-slate-400"
                    >
                      ...
                    </span>
                  )
                )}
              </div>

              <button
                type="button"
                onClick={handleNextPage}
                disabled={page === totalPages}
                className="inline-flex items-center justify-center rounded-full border border-cyan-200 bg-white px-5 py-3 text-xl font-bold text-cyan-700 shadow-[0_12px_30px_rgba(14,165,233,0.12)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
              </div>
            </div>
          ) : null}

          {paginationMessage ? (
            <div className="mt-3 flex justify-end">
              <div className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xl font-semibold text-amber-700">
                {paginationMessage}
              </div>
            </div>
          ) : null}
        </section>

        {showCreateModal && (
          <CreateUser
            onClose={() => setShowCreateModal(false)}
            onUserCreated={handleUserCreated}
          />
        )}

        {editingUser ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-[30px] border border-white/50 bg-[linear-gradient(180deg,#fafdff_0%,#f8fbff_100%)] p-6 shadow-[0_24px_80px_rgba(15,23,42,0.25)] sm:p-7">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[19px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
                    User Update
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-slate-900">
                    Edit user
                  </h2>
                  <p className="mt-2 text-xl text-slate-500">
                    Name, email, role aur optional password update karein.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingUser(null);
                    setEditError("");
                  }}
                  className="rounded-full border border-slate-200 bg-white p-3 text-slate-700 transition hover:border-cyan-200 hover:text-cyan-700"
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="space-y-4">
                <input
                  type="text"
                  name="name"
                  placeholder="Full Name"
                  required
                  value={editForm.name}
                  onChange={handleEditChange}
                  className="w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                />

                <input
                  type="email"
                  name="email"
                  placeholder="Email Address"
                  required
                  value={editForm.email}
                  onChange={handleEditChange}
                  className="w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                />

                <input
                  type="password"
                  name="password"
                  placeholder="New Password (optional)"
                  value={editForm.password}
                  onChange={handleEditChange}
                  className="w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                />

                <select
                  name="role"
                  value={editForm.role}
                  onChange={handleEditChange}
                  className="w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                >
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="staff">Staff</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="housekeeping">Housekeeping</option>
                  <option value="accountant">Accountant</option>
                  <option value="waiter">Waiter</option>
                  <option value="kitchen">Kitchen</option>
                </select>

                {editError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                    {editError}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={isUpdatingUser}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[22px] bg-gradient-to-r from-sky-600 to-cyan-500 px-5 py-4 text-sm font-bold text-white shadow-[0_16px_35px_rgba(14,165,233,0.24)] transition hover:-translate-y-0.5"
                >
                  <FaEdit />
                  {isUpdatingUser ? "Updating..." : "Update User"}
                </button>
              </form>
            </div>
          </div>
        ) : null}

        {successMessage ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-[28px] border border-white/50 bg-[linear-gradient(180deg,#fafdff_0%,#f8fbff_100%)] p-6 text-center shadow-[0_24px_80px_rgba(15,23,42,0.25)] sm:p-7">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.24),_rgba(6,182,212,0.12)_60%,_rgba(255,255,255,0.96)_100%)] shadow-[0_18px_45px_rgba(16,185,129,0.18)]">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 text-sm font-black text-white">
                  OK
                </div>
              </div>
              <p className="mt-5 text-[18px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
                User Created
              </p>
              <h3 className="mt-2 text-2xl font-black text-slate-900">
                {successMessage}
              </h3>
              <p className="mt-3 text-xl leading-6 text-slate-500">
                New team member ko directory mein successfully add kar diya gaya hai.
              </p>
              <button
                type="button"
                onClick={() => setSuccessMessage("")}
                className="mt-6 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-teal-600 to-emerald-500 px-6 py-3 text-sm font-bold text-white shadow-[0_16px_35px_rgba(16,185,129,0.24)] transition hover:-translate-y-0.5"
              >
                Continue
              </button>
            </div>
          </div>
        ) : null}

        {deleteMessage ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-[28px] border border-white/50 bg-[linear-gradient(180deg,#fff8f8_0%,#ffffff_100%)] p-6 text-center shadow-[0_24px_80px_rgba(15,23,42,0.25)] sm:p-7">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[radial-gradient(circle_at_top,_rgba(244,63,94,0.18),_rgba(251,146,60,0.12)_60%,_rgba(255,255,255,0.96)_100%)] shadow-[0_18px_45px_rgba(244,63,94,0.14)]">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-orange-400 text-sm font-black text-white">
                  OK
                </div>
              </div>
              <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.24em] text-rose-400">
                User Deleted
              </p>
              <h3 className="mt-2 text-2xl font-black text-slate-900">
                {deleteMessage}
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-500">
              The selected user has been successfully removed from the directory.
              </p>
              <button
                type="button"
                onClick={() => setDeleteMessage("")}
                className="mt-6 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-rose-600 to-orange-500 px-6 py-3 text-sm font-bold text-white shadow-[0_16px_35px_rgba(244,63,94,0.22)] transition hover:-translate-y-0.5"
              >
                Continue
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default User;
