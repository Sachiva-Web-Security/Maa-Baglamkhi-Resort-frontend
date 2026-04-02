import { useState } from "react";

const fieldCls =
  "w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100";

const labelCls =
  "mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500";





const AttendanceForm = ({ onSubmit, onCancel, initialData = {} }) => {
  const [formData, setFormData] = useState({
    employeeName: initialData.employeeName || "",
    role: initialData.role || "",
    department: initialData.department || "",
    date: initialData.date || new Date().toISOString().split("T")[0],
    checkIn: initialData.checkIn || "",
    checkOut: initialData.checkOut || "",
    status: initialData.status || "Present",
    method: initialData.method || "Manual",
    notes: initialData.notes || "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };


  

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="employeeName" className={labelCls}>
          Employee Name
        </label>
        <input
          type="text"
          id="employeeName"
          name="employeeName"
          value={formData.employeeName}
          onChange={handleChange}
          required
          placeholder="Enter employee name"
          className={fieldCls}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="role" className={labelCls}>
            Role
          </label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            required
            className={fieldCls}
          >
            <option value="">Select Role</option>
            <option value="Admin">Admin</option>
            <option value="Manager">Manager</option>
            <option value="Staff">Staff</option>
            <option value="Receptionist">Receptionist</option>
            <option value="Housekeeping">Housekeeping</option>
          </select>
        </div>

        <div>
          <label htmlFor="department" className={labelCls}>
            Department
          </label>
          <select
            id="department"
            name="department"
            value={formData.department}
            onChange={handleChange}
            required
            className={fieldCls}
          >
            <option value="">Select Department</option>
            <option value="Reception">Reception</option>
            <option value="Kitchen">Kitchen</option>
            <option value="Housekeeping">Housekeeping</option>
            <option value="Management">Management</option>
            <option value="Security">Security</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="date" className={labelCls}>
            Date
          </label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
            className={fieldCls}
          />
        </div>

        <div>
          <label htmlFor="status" className={labelCls}>
            Status
          </label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            required
            className={fieldCls}
          >
            <option value="Present">Present</option>
            <option value="Absent">Absent</option>
            <option value="Late">Late</option>
            <option value="On Leave">On Leave</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="checkIn" className={labelCls}>
            Check-In Time
          </label>
          <input
            type="time"
            id="checkIn"
            name="checkIn"
            value={formData.checkIn}
            onChange={handleChange}
            className={fieldCls}
          />
        </div>

        <div>
          <label htmlFor="checkOut" className={labelCls}>
            Check-Out Time
          </label>
          <input
            type="time"
            id="checkOut"
            name="checkOut"
            value={formData.checkOut}
            onChange={handleChange}
            className={fieldCls}
          />
        </div>
      </div>

      <div>
        <label htmlFor="method" className={labelCls}>
          Method
        </label>
        <select
          id="method"
          name="method"
          value={formData.method}
          onChange={handleChange}
          required
          className={fieldCls}
        >
          <option value="Manual">Manual</option>
          <option value="Biometric">Biometric</option>
        </select>
      </div>

      <div>
        <label htmlFor="notes" className={labelCls}>
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows="3"
          placeholder="Any additional notes..."
          className={fieldCls}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-[20px] border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-cyan-200 hover:text-cyan-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-[20px] bg-gradient-to-r from-sky-600 to-cyan-500 px-5 py-3 text-sm font-bold text-white shadow-[0_16px_35px_rgba(14,165,233,0.24)] transition hover:-translate-y-0.5"
        >
          Submit
        </button>
      </div>
    </form>
  );
};

export default AttendanceForm;
