const TableCard = ({ table, onClick, isSelected }) => {
  const isOccupied = table.status === 'Occupied';
  return (
    <div
      className={`simple-table-card ${isOccupied ? 'table-occupied' : 'table-free'}`}
      onClick={() => onClick(table)}
      style={isSelected ? { border: "2px solid #1565c0", background: "#e3f0ff" } : {}}
    >
      <div className="simple-table-card-num">{table.number}</div>
      <div className="simple-table-card-info">{table.status}</div>
      {table.guestCount > 0 && <div className="simple-table-card-info">{table.guestCount} guests</div>}
    </div>
  );
};

export default TableCard;
