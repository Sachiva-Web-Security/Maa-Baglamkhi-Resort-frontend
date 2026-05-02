const MenuItem = ({ item, onAddToOrder }) => (
  <div
    onClick={() => onAddToOrder(item)}
    style={{
      border: "1px solid #ddd", borderRadius: 6, padding: 10, cursor: "pointer",
      background: item.available === false ? "#f5f5f5" : "#fff",
      opacity: item.available === false ? 0.6 : 1,
      transition: "box-shadow .15s",
      position: "relative",
    }}
    onMouseEnter={e => { if (item.available !== false) e.currentTarget.style.boxShadow = "0 2px 8px rgba(21,101,192,.15)"; }}
    onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
  >
    <div style={{ fontWeight: 600, fontSize: 13, color: "#1565c0", marginBottom: 2 }}>{item.name}</div>
    <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>{item.category}</div>
    <div style={{ fontWeight: 700, fontSize: 14, color: "#333" }}>₹{item.price}</div>
    {item.available === false && (
      <div style={{ position: "absolute", top: 6, right: 6, background: "#f44336", color: "#fff", fontSize: 10, padding: "1px 5px", borderRadius: 3 }}>NA</div>
    )}
  </div>
);

export default MenuItem;
