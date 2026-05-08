import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api";

const CreateUser = () => {
  const navigate = useNavigate();
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
      const localUser = { id: Date.now(), name: form.name, email: form.email, role: form.role };
      localStorage.setItem("users", JSON.stringify([...existing, localUser]));
      navigate("/user");
    } catch (error) {
      console.log(error);
      alert("Error creating user");
    }
  };

  return (
    <div className="flex items-center justify-center py-10">
      <div className="simple-card w-full max-w-lg">
        <h2 className="simple-page-title mb-6">Create New User</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="simple-form-group">
            <label className="simple-label">Full Name</label>
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              required
              value={form.name}
              onChange={handleChange}
              className="simple-input w-full"
            />
          </div>
          <div className="simple-form-group">
            <label className="simple-label">Email</label>
            <input
              type="email"
              name="email"
              placeholder="Email"
              required
              value={form.email}
              onChange={handleChange}
              className="simple-input w-full"
            />
          </div>
          <div className="simple-form-group">
            <label className="simple-label">Password</label>
            <input
              type="password"
              name="password"
              placeholder="Password"
              required
              value={form.password}
              onChange={handleChange}
              className="simple-input w-full"
            />
          </div>
          <div className="simple-form-group">
            <label className="simple-label">Role</label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="simple-select w-full"
            >
              <option>Admin</option>
              <option>Manager</option>
              <option>Staff</option>
              <option>Receptionist</option>
              <option>Housekeeping</option>
              <option>Accountant</option>
              <option>Waiter</option>
              <option>Kitchen</option>
            </select>
          </div>
          <button type="submit" className="simple-btn simple-btn-primary w-full">
            Create User
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateUser;
