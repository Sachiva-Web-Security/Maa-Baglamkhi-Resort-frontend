import React, { useState } from "react";
import API from "../../api";

const CreateUser = ({ onClose, onUserCreated }) => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "Staff",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await API.post("/users", form);

      alert(res.data.message);

      const existing = JSON.parse(localStorage.getItem("users")) || [];
      const localUser = {
        id: Date.now(),
        name: form.name,
        email: form.email,
        role: form.role,
      };

      localStorage.setItem("users", JSON.stringify([...existing, localUser]));

      if (onUserCreated) {
        onUserCreated(localUser);
      }

      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.log(error);
      alert("Error creating user");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-slate-900 border border-white/20 p-6 sm:p-10 rounded-2xl shadow-xl w-full max-w-lg relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-white text-2xl"
        >
          ×
        </button>

        <h2 className="text-2xl text-white font-bold mb-6">Create New User</h2>

        <form onSubmit={handleSubmit} className="space-y-4">

          <input
            type="text"
            name="name"
            placeholder="Full Name"
            required
            value={form.name}
            onChange={handleChange}
            className="w-full p-3 text-white bg-slate-800 border border-white/20 rounded-xl outline-none"
          />

          <input
            type="email"
            name="email"
            placeholder="Email"
            required
            value={form.email}
            onChange={handleChange}
            className="w-full p-3 text-white bg-slate-800 border border-white/20 rounded-xl outline-none"
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            required
            value={form.password}
            onChange={handleChange}
            className="w-full p-3 text-white bg-slate-800 border border-white/20 rounded-xl outline-none"
          />

          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            className="w-full p-3 text-white bg-slate-800 border border-white/20 rounded-xl outline-none"
          >
            <option value="Admin">Admin</option>
            <option value="Manager">Manager</option>
            <option value="Staff">Staff</option>
            <option value="Receptionist">Receptionist</option>
            <option value="Housekeeping">Housekeeping</option>
            <option value="Accountant">Accountant</option>
            <option value="Waiter">Waiter</option>
            <option value="Kitchen">Kitchen</option>
          </select>

          <button
            type="submit"
            className="w-full bg-indigo-500 text-white py-3 rounded-xl"
          >
            Create User
          </button>

        </form>
      </div>
    </div>
  );
};

export default CreateUser;