const FiltersSection = ({
  date,
  department,
  role,
  searchQuery,
  onDateChange,
  onDepartmentChange,
  onRoleChange,
  onSearchChange,
  onAddManualEntry,
}) => {
  return (
    <div className="simple-card flex flex-wrap gap-3 items-center">
      <input
        type="date"
        value={date}
        onChange={(e) => onDateChange(e.target.value)}
        className="simple-input"
      />

      <select
        value={department}
        onChange={(e) => onDepartmentChange(e.target.value)}
        className="simple-select"
      >
        <option>All Departments</option>
        <option>Reception</option>
        <option>Kitchen</option>
        <option>Housekeeping</option>
        <option>Restaurant</option>
        <option>Accounts</option>
        <option>Security</option>
      </select>

      <select
        value={role}
        onChange={(e) => onRoleChange(e.target.value)}
        className="simple-select"
      >
        <option>All Roles</option>
        <option>Manager</option>
        <option>Receptionist</option>
        <option>Chef</option>
        <option>Waiter</option>
        <option>Housekeeper</option>
        <option>Accountant</option>
        <option>Security</option>
      </select>

      <input
        type="text"
        placeholder="Search Employee"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="simple-input flex-1 min-w-40"
      />

      <button
        onClick={onAddManualEntry}
        className="simple-btn simple-btn-primary ml-auto"
      >
        + Add Manual Entry
      </button>
    </div>
  );
};

export default FiltersSection;
