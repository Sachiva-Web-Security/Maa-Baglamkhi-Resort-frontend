const OrderSummary = ({ orderItems, onRemoveItem, onUpdateQuantity }) => {
  const subtotal = orderItems.reduce((t, i) => t + i.price * i.quantity, 0);
  const gst = subtotal * 0.05;
  const total = subtotal + gst;

  const handleQty = (id, qty) => {
    if (qty < 1) onRemoveItem(id);
    else onUpdateQuantity(id, qty);
  };

  return (
    <div className="simple-card" style={{ marginBottom: 10 }}>
      <div className="simple-card-title">Order Summary</div>
      {orderItems.length === 0 ? (
        <div style={{ textAlign: "center", padding: "20px 0", color: "#aaa", fontSize: 13 }}>
          No items — select from menu
        </div>
      ) : (
        <>
          {orderItems.map((item) => (
            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, fontSize: 13 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{item.name}</div>
                <div style={{ color: "#888", fontSize: 11 }}>₹{item.price} each</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button onClick={() => handleQty(item.id, item.quantity - 1)} style={{ width: 22, height: 22, border: "1px solid #ccc", borderRadius: 3, background: "#f5f5f5", cursor: "pointer", fontWeight: 700 }}>−</button>
                <span style={{ minWidth: 18, textAlign: "center" }}>{item.quantity}</span>
                <button onClick={() => handleQty(item.id, item.quantity + 1)} style={{ width: 22, height: 22, border: "1px solid #ccc", borderRadius: 3, background: "#f5f5f5", cursor: "pointer", fontWeight: 700 }}>+</button>
                <button onClick={() => onRemoveItem(item.id)} style={{ width: 22, height: 22, border: "none", borderRadius: 3, background: "#ffebee", color: "#c62828", cursor: "pointer", fontWeight: 700 }}>×</button>
              </div>
              <div style={{ minWidth: 54, textAlign: "right", fontWeight: 600 }}>₹{item.price * item.quantity}</div>
            </div>
          ))}
          <hr className="simple-divider" />
          <div className="simple-summary">
            <div className="simple-summary-row"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
            <div className="simple-summary-row"><span>GST (5%)</span><span>₹{gst.toFixed(2)}</span></div>
            <div className="simple-summary-total"><span>Grand Total</span><span>₹{total.toFixed(2)}</span></div>
          </div>
        </>
      )}
    </div>
  );
};

export default OrderSummary;
