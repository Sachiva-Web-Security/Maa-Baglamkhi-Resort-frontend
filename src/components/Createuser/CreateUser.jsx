import React, { useState } from "react";
import { FaTimes, FaUserPlus } from "react-icons/fa";

import API from "../../api";

const fieldCls =
  "w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100";

const CreateUser = ({ onClose, onUserCreated }) => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "Staff",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setError("");
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const res = await API.post("/users", form, { skipAuthRedirect: true });

      const existing = JSON.parse(localStorage.getItem("users")) || [];
      const createdUser = res.data?.user || {
        id: Date.now(),
        name: form.name,
        email: form.email,
        role: form.role.toLowerCase(),
      };

      const dedupedUsers = existing.filter(
        (item) => String(item.email || "").toLowerCase() !== String(createdUser.email || "").toLowerCase()
      );
      localStorage.setItem("users", JSON.stringify([...dedupedUsers, createdUser]));

      if (onUserCreated) {
        onUserCreated(createdUser);
      }

      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.log(error);
      const status = error.response?.status;
      if (status === 401) {
        setError("Session expire ho gayi hai ya token missing hai. Login page par bina bheje create action roka gaya hai.");
      } else if (status === 403) {
        setError("Sirf admin user naya account create kar sakta hai.");
      } else {
        setError(error.response?.data?.message || "Error creating user");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[30px] border border-white/50 bg-[linear-gradient(180deg,#fafdff_0%,#f8fbff_100%)] p-6 shadow-[0_24px_80px_rgba(15,23,42,0.25)] sm:p-7">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
              User Onboarding
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">
              Create new user
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Team member details add karke unka role assign karein.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white p-3 text-slate-700 transition hover:border-cyan-200 hover:text-cyan-700"
          >
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            required
            value={form.name}
            onChange={handleChange}
            className={fieldCls}
          />

          <input
            type="email"
            name="email"
            placeholder="Email Address"
            required
            value={form.email}
            onChange={handleChange}
            className={fieldCls}
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            required
            value={form.password}
            onChange={handleChange}
            className={fieldCls}
          />

          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            className={fieldCls}
          >
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="staff">Staff</option>
            <option value="Receptionist">Receptionist</option>
            <option value="Housekeeping">Housekeeping</option>
            <option value="Accountant">Accountant</option>
            <option value="Waiter">Waiter</option>
            <option value="Kitchen">Kitchen</option>
          </select>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-[22px] bg-gradient-to-r from-sky-600 to-cyan-500 px-5 py-4 text-sm font-bold text-white shadow-[0_16px_35px_rgba(14,165,233,0.24)] transition hover:-translate-y-0.5"
          >
            <FaUserPlus />
            {isSubmitting ? "Creating..." : "Create User"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateUser;
