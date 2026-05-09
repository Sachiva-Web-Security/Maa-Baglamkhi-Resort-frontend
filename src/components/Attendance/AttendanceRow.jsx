const AttendanceRow = ({ employee, onCheckIn, onCheckOut }) => {
  const statusBadge = {
    Present: "simple-badge badge-green",
    Absent: "simple-badge badge-red",
    Late: "simple-badge badge-orange",
    "On Leave": "simple-badge badge-blue",
  };

  const methodBadge = {
    Biometric: "simple-badge badge-blue",
    Manual: "simple-badge badge-gray",
  };

  const canCheckIn = !employee.checkIn;
  const canCheckOut = employee.checkIn && !employee.checkOut;

  return (
    <tr>
      <td className="font-medium">{employee.name}</td>
      <td>{employee.role}</td>
      <td>{employee.checkIn || "—"}</td>
      <td>{employee.checkOut || "—"}</td>
      <td>
        <span className={statusBadge[employee.status] || "simple-badge badge-gray"}>
          {employee.status}
        </span>
      </td>
      <td>
        <span className={methodBadge[employee.method] || "simple-badge badge-gray"}>
          {employee.method}
        </span>
      </td>
      <td className="flex gap-2">
        {canCheckIn && (
          <button onClick={() => onCheckIn?.(employee)} className="simple-btn simple-btn-success simple-btn-sm">Check In</button>
        )}
        {canCheckOut && (
          <button onClick={() => onCheckOut?.(employee)} className="simple-btn simple-btn-danger simple-btn-sm">Check Out</button>
        )}
      </td>
    </tr>
  );
};

export default AttendanceRow;
