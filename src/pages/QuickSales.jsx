import React, { useEffect, useState } from "react";
import API from "../api";
import "./QuickSales.css";

const QuickSales = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(false);
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [discount, setDiscount] = useState(0);
  const [showPayModal, setShowPayModal] = useState(false);
  const [lastBill, setLastBill] = useState(null);

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    try {
      const res = await API.get("/restaurant/menu");
      setMenuItems(res.data || []);
    } catch (err) {
      console.error("Error fetching menu:", err);
    }
  };

  const categories = ["All", ...new Set(menuItems.map(i => i.category).filter(Boolean))];

  const filtered = menuItems.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "All" || item.category === category;
    const matchAvail = item.status !== "Not Available";
    return matchSearch && matchCat && matchAvail;
  });

  const subtotal = cart.reduce((a, i) => a + i.price * i.qty, 0);
  const discountAmt = Math.min(subtotal, Number(discount) || 0);
  const taxable = subtotal - discountAmt;
  const gst = Math.round(taxable * 0.05);
  const total = taxable + gst;

  const handleAdd = (item) => {
    const existing = cart.find(c => c.id === item.id);
    if (existing) {
      setCart(prev => prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart(prev => [...prev, {
        id: item.id,
        name: item.name,
        price: Number(item.effectivePrice || item.effective_price || item.price || 0),
        qty: 1,
        category: item.category,
      }]);
    }
  };

  const handleQty = (id, delta) => {
    setCart(prev => prev.map(c => {
      if (c.id !== id) return c;
      const newQty = c.qty + delta;
      return newQty <= 0 ? null : { ...c, qty: newQty };
    }).filter(Boolean));
  };

  const handleRemove = (id) => setCart(prev => prev.filter(c => c.id !== id));

  const handleGenerateBill = async () => {
    if (cart.length === 0) return alert("No items in cart");
    setLoading(true);
    try {
      const res = await API.post("/restaurant/bill", {
        customerName,
        phone,
        subtotal,
        gst,
        discount: discountAmt,
        total,
        paymentMethod: paymentMode,
        entityType: "QuickSale",
        items: cart.map(c => ({ name: c.name, price: c.price, quantity: c.qty, amount: c.price * c.qty })),
      });
      setLastBill({
        invoiceNo: res.data?.id || res.data?.invoiceNo || Date.now(),
        total,
        paymentMethod,
        items: cart,
        date: new Date().toLocaleString(),
      });
      setCart([]);
      setCustomerName("");
      setPhone("");
      setDiscount(0);
      setShowPayModal(false);
      alert(`Bill Generated! Invoice# ${res.data?.id || res.data?.invoiceNo || Date.now()}`);
    } catch (err) {
      console.error("Error generating bill:", err);
      alert("Failed to generate bill");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="qs-screen">
      {/* Left: Menu */}
      <div className="qs-menu-panel">
        <div className="qs-header">
          <h2 className="qs-title">Quick Sales</h2>
        </div>

        <div className="qs-search-row">
          <input
            className="qs-search-input"
            placeholder="Search items..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="qs-category-tabs">
          {categories.map(cat => (
            <button
              key={cat}
              className={`qs-cat-tab ${category === cat ? "active" : ""}`}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="qs-items-grid">
          {filtered.map(item => (
            <button key={item.id} className="qs-item-card" onClick={() => handleAdd(item)}>
              <div className="qs-item-name">{item.name}</div>
              <div className="qs-item-price">₹{item.effectivePrice || item.effective_price || item.price}</div>
              {item.foodType && (
                <span className={`qs-item-type ${item.foodType.toLowerCase()}`}>{item.foodType}</span>
              )}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="qs-empty">No items found</div>
          )}
        </div>
      </div>

      {/* Right: Cart & Billing */}
      <div className="qs-cart-panel">
        <div className="qs-cart-header">
          <h3>Current Order</h3>
          <span className="qs-cart-count">{cart.length} items</span>
        </div>

        {cart.length === 0 ? (
          <div className="qs-cart-empty">No items added yet</div>
        ) : (
          <>
            <div className="qs-cart-items">
              {cart.map(item => (
                <div key={item.id} className="qs-cart-row">
                  <div className="qs-cart-item-info">
                    <div className="qs-cart-item-name">{item.name}</div>
                    <div className="qs-cart-item-price">₹{item.price} × {item.qty}</div>
                  </div>
                  <div className="qs-cart-item-actions">
                    <button className="qs-qty-btn" onClick={() => handleQty(item.id, -1)}>−</button>
                    <span className="qs-qty-val">{item.qty}</span>
                    <button className="qs-qty-btn" onClick={() => handleQty(item.id, 1)}>+</button>
                    <button className="qs-remove-btn" onClick={() => handleRemove(item.id)}>✕</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="qs-cart-summary">
              <div className="qs-summary-row">
                <span>Sub Total</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="qs-summary-discount">
                <span>Discount (₹)</span>
                <input
                  type="number"
                  min="0"
                  max={subtotal}
                  value={discount}
                  onChange={e => setDiscount(Number(e.target.value) || 0)}
                  className="qs-discount-input"
                />
              </div>
              <div className="qs-summary-row">
                <span>GST (5%)</span>
                <span>₹{gst.toFixed(2)}</span>
              </div>
              <div className="qs-summary-total">
                <span>Total</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>

            <div className="qs-customer-fields">
              <input
                className="qs-field-input"
                placeholder="Customer Name (optional)"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
              />
              <input
                className="qs-field-input"
                placeholder="Phone (optional)"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>

            <div className="qs-payment-modes">
              {["Cash", "Card", "UPI", "Room Transfer"].map(mode => (
                <button
                  key={mode}
                  className={`qs-pay-mode ${paymentMode === mode ? "active" : ""}`}
                  onClick={() => setPaymentMode(mode)}
                >
                  {mode}
                </button>
              ))}
            </div>

            <button
              className="qs-generate-btn"
              onClick={() => setShowPayModal(true)}
              disabled={loading}
            >
              {loading ? "Processing..." : `Generate Bill — ₹${total.toFixed(2)}`}
            </button>
          </>
        )}

        {lastBill && (
          <div className="qs-last-bill">
            <div className="qs-last-bill-title">Last Bill</div>
            <div className="qs-last-bill-row"><span>Invoice</span><span>#{lastBill.invoiceNo}</span></div>
            <div className="qs-last-bill-row"><span>Amount</span><span>₹{lastBill.total.toFixed(2)}</span></div>
            <div className="qs-last-bill-row"><span>Mode</span><span>{lastBill.paymentMethod}</span></div>
            <div className="qs-last-bill-row"><span>Date</span><span>{lastBill.date}</span></div>
          </div>
        )}
      </div>

      {/* Pay Modal */}
      {showPayModal && (
        <div className="qs-pay-modal-backdrop" onClick={() => setShowPayModal(false)}>
          <div className="qs-pay-modal" onClick={e => e.stopPropagation()}>
            <h3 className="qs-pay-modal-title">Confirm Bill</h3>
            <div className="qs-pay-summary">
              <div className="qs-pay-row"><span>Items</span><span>{cart.length}</span></div>
              <div className="qs-pay-row"><span>Sub Total</span><span>₹{subtotal.toFixed(2)}</span></div>
              {discountAmt > 0 && <div className="qs-pay-row"><span>Discount</span><span>-₹{discountAmt.toFixed(2)}</span></div>}
              <div className="qs-pay-row"><span>GST</span><span>₹{gst.toFixed(2)}</span></div>
              <div className="qs-pay-total"><span>Total</span><span>₹{total.toFixed(2)}</span></div>
              <div className="qs-pay-row"><span>Payment Mode</span><span>{paymentMode}</span></div>
            </div>
            <div className="qs-pay-actions">
              <button className="qs-pay-cancel" onClick={() => setShowPayModal(false)}>Cancel</button>
              <button className="qs-pay-confirm" onClick={handleGenerateBill} disabled={loading}>
                {loading ? "Generating..." : "Confirm & Print"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickSales;