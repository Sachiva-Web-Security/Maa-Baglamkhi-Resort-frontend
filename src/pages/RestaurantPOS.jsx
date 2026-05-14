import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import "./RestaurantPOS.css";

const RestaurantPOS = () => {
  const navigate = useNavigate();
  const [selectedTable, setSelectedTable] = useState(null);
  const [showSplitBillModal, setShowSplitBillModal] = useState(false);
  const [splitBillData, setSplitBillData] = useState({ parts: 2 });
  const [selectedSection, setSelectedSection] = useState("RESTAURANT");
  const [searchTerm, setSearchTerm] = useState("");
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showKOTModal, setShowKOTModal] = useState(false);
  const [kotHistory, setKotHistory] = useState([]);
  const [tables, setTables] = useState([]);
  const [activeTab, setActiveTab] = useState("pos");
  const [orderType, setOrderType] = useState("DINE_IN");
  const [orderTypeData, setOrderTypeData] = useState({
    DINE_IN: { items: [], table: null },
    TAKEAWAY: { items: [], customerName: "", phone: "" },
    DELIVERY: { items: [], customerName: "", phone: "", address: "" },
    PARCEL: { items: [] },
  });
  const [selectedCategory, setSelectedCategory] = useState("");
  const [captains, setCaptains] = useState([]);
  const [invoiceGroups, setInvoiceGroups] = useState([]);
  const [transBills, setTransBills] = useState([]);
  const [showSplitBill, setShowSplitBill] = useState(false);
  const [tableFilter, setTableFilter] = useState("ALL");
  const [occupiedTableData, setOccupiedTableData] = useState({});

  const sections = ["RESTAURANT", "GARDEN", "PARSAL", "ROOM DINING"];
  const categories = ["All", "Beverages", "Starters", "Main Course", "Desserts", "South Indian", "Chinese", "Tandoor"];

  useEffect(() => {
    fetchTables();
    fetchMenuItems();
    fetchBills();
    fetchUsers();
  }, []);

  const fetchTables = async () => {
    try {
      const res = await API.get("/restaurant/tables");
      if (res.data) setTables(res.data);
    } catch (err) {
      console.error("Error fetching tables:", err);
    }
    try {
      const billRes = await API.get("/restaurant/bills");
      if (billRes.data) {
        const occData = {};
        billRes.data.forEach(b => {
          const tNum = String(b.tableNumber || b.table || "");
          if (tNum && !occData[tNum]) {
            occData[tNum] = {
              amount: b.total || 0,
              captain: b.waiter || b.captain || "RECEPTION",
              guests: b.guestCount || b.pax || 0,
              orderId: b.id
            };
          }
        });
        setOccupiedTableData(occData);
      }
    } catch (err) {
      console.error("Error fetching bills:", err);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const res = await API.get("/restaurant/menu");
      if (res.data) {
        setMenuItems(res.data);
        if (res.data.length > 0 && !selectedCategory) {
          setSelectedCategory(res.data[0].category || "Beverages");
        }
      }
    } catch (err) {
      console.error("Error fetching menu:", err);
    }
  };

  const fetchBills = async () => {
    try {
      const res = await API.get("/restaurant/bills");
      if (res.data) {
        setInvoiceGroups(res.data.map(b => ({
          id: b.id,
          invoiceNo: b.id,
          table: b.tableNumber || b.table,
          amount: b.total,
          status: b.invoiceStatus,
          date: b.created_at
        })));
      }
    } catch (err) {
      console.error("Error fetching bills:", err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await API.get("/users");
      if (res.data) {
        setCaptains(res.data.filter(u => u.role === "Waiter" || u.role === "waiter"));
      }
    } catch (err) {
      console.error("Error fetching captains:", err);
    }
  };

  const filteredMenuItems = menuItems.filter(item => {
    const catMatch = selectedCategory === "All" || !selectedCategory || item.category === selectedCategory;
    const searchMatch = !searchTerm || item.name.toLowerCase().includes(searchTerm.toLowerCase());
    return catMatch && searchMatch;
  });

  const filteredTables = tables.filter(table => {
    const sectionValue = String(table.section || table.sectionName || table.area || "").toLowerCase();
    const hasNoSection = !sectionValue || sectionValue === "null" || sectionValue === "undefined";
    const sectionMatch = hasNoSection || sectionValue === selectedSection.toLowerCase() || sectionValue.includes(selectedSection.toLowerCase());
    const tableNum = String(table.number || table.tableNumber || "");
    const searchMatch = !searchTerm || tableNum.includes(searchTerm.trim());
    return sectionMatch && searchMatch;
  });

  const getTableKey = (table) => String(table.id || table.number || table.tableNumber || table.table_no);

  const handleTableClick = (table) => setSelectedTable(table);

  const handleCreateTable = async () => {
    const newTableNumber = searchTerm.trim();
    if (!newTableNumber) { alert("Enter a table number"); return; }
    const exists = tables.some(t => String(t.number || t.tableNumber) === newTableNumber);
    if (exists) { alert("Table already exists"); return; }
    try {
      const res = await API.post("/restaurant/tables", { number: newTableNumber, sectionName: selectedSection, seatCount: 4 });
      if (res.data && res.data.id) {
        setTables(prev => [...prev, { id: res.data.id, number: res.data.number || newTableNumber, status: "Available", section: selectedSection.toLowerCase() }]);
        setSearchTerm("");
      }
    } catch (err) {
      console.error("Error creating table:", err);
      alert(err.response?.data?.message || "Error creating table");
    }
  };

  const getCurrentOrderItems = () => orderTypeData[orderType]?.items || [];
  const setCurrentOrderItems = (items) => setOrderTypeData(prev => ({ ...prev, [orderType]: { ...prev[orderType], items } }));

  const handleAddToOrder = (item) => {
    if (item.status === "Not Available") { alert(`${item.name} is not available`); return; }
    const currentItems = getCurrentOrderItems();
    const existing = currentItems.find(o => o.id === item.id);
    let newItems;
    if (existing) {
      newItems = currentItems.map(o => o.id === item.id ? { ...o, quantity: o.quantity + 1 } : o);
    } else {
      newItems = [...currentItems, {
        id: item.id,
        name: item.name,
        price: Number(item.effectivePrice || item.effective_price || item.price || 0),
        quantity: 1,
        category: item.category,
        addedAt: new Date(),
      }];
    }
    setCurrentOrderItems(newItems);
    if (orderType === "DINE_IN" && selectedTable) {
      setTables(prev => prev.map(t => t.id === selectedTable.id ? { ...t, status: "Occupied" } : t));
    }
  };

  const handleUpdateQuantity = (itemId, quantity) => {
    const currentItems = getCurrentOrderItems();
    if (quantity < 1) {
      setCurrentOrderItems(currentItems.filter(i => i.id !== itemId));
      return;
    }
    setCurrentOrderItems(currentItems.map(i => i.id === itemId ? { ...i, quantity } : i));
  };

  const handleRemoveItem = (itemId) => setCurrentOrderItems(getCurrentOrderItems().filter(i => i.id !== itemId));

  const calculateTotal = () => {
    return getCurrentOrderItems().reduce((t, i) => t + i.price * i.quantity, 0);
  };

  const calculateTax = () => calculateTotal() * 0.05;

  const calculateGrandTotal = () => calculateTotal() + calculateTax();

  const handlePrintKOT = async () => {
    const currentItems = getCurrentOrderItems();
    if (!currentItems.length) return alert("Add items first");
    if (orderType === "DINE_IN" && !selectedTable) { alert("Select a table first"); return; }
    setLoading(true);
    try {
      const kitchenItems = currentItems.map(i => ({ name: i.name, quantity: i.quantity }));
      try {
        const resp = await API.post("/kitchen/order", {
          table: orderType === "DINE_IN" ? selectedTable.number : orderType,
          waiter: localStorage.getItem("name") || "RECEPTION",
          items: kitchenItems,
          entityType: orderType,
          prepTimeMinutes: 20,
        });
        const newKOT = { id: resp?.data?.id || Date.now(), kotNo: resp?.data?.kotNo || `KOT-${Date.now()}`, table: orderType === "DINE_IN" ? selectedTable.number : orderType, timestamp: new Date(), items: kitchenItems };
        setKotHistory(prev => [...prev, newKOT]);
      } catch (e) {
        const newKOT = { id: Date.now(), kotNo: `KOT-${Date.now()}`, table: orderType === "DINE_IN" ? selectedTable.number : orderType, timestamp: new Date(), items: kitchenItems };
        setKotHistory(prev => [...prev, newKOT]);
      }
      alert("KOT printed — sent to Kitchen!");
    } catch (err) {
      console.error("Error printing KOT:", err);
      alert(err.response?.data?.message || "Error printing KOT");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBill = async () => {
    const currentItems = getCurrentOrderItems();
    if (!currentItems.length) return alert("Add items first");
    if (orderType === "DINE_IN" && !selectedTable) { alert("Select a table first"); return; }
    const subtotal = calculateTotal();
    const tax = calculateTax();
    const total = calculateGrandTotal();
    const billData = {
      table: orderType === "DINE_IN" ? selectedTable.number : orderType,
      tableNumber: orderType === "DINE_IN" ? selectedTable.number : orderType,
      subtotal, gst: tax, total,
      paymentMethod: "Cash",
      orderType: orderType,
      items: currentItems.map(i => ({ name: i.name, price: i.price, quantity: i.quantity, amount: i.price * i.quantity })),
      customerName: orderTypeData[orderType]?.customerName || "",
      phone: orderTypeData[orderType]?.phone || "",
    };
    setLoading(true);
    try {
      const res = await API.post("/restaurant/bill", billData);
      alert(`Bill Generated!\n\nType: ${orderType.replace('_', '+')}\nTotal: ₹${total.toFixed(2)}\nInvoice# ${res.data?.id || "N/A"}`);
      setCurrentOrderItems([]);
      if (orderType === "DINE_IN") { setSelectedTable(null); setTables(prev => prev.map(t => t.id === selectedTable?.id ? { ...t, status: "Available" } : t)); }
      fetchBills();
    } catch (err) {
      console.error("Error saving bill:", err);
      alert(err.response?.data?.message || "Error saving bill");
    } finally {
      setLoading(false);
    }
  };

  const handleClearOrder = () => {
    if (orderType === "DINE_IN" && !selectedTable) { setCurrentOrderItems([]); return; }
    const act = window.prompt("Enter 'clear' to cancel, 'save' to print KOT, 'pay' to generate bill:", "");
    if (act === "clear") {
      setCurrentOrderItems([]);
      if (orderType === "DINE_IN" && selectedTable) setTables(prev => prev.map(t => t.id === selectedTable.id ? { ...t, status: "Available" } : t));
    } else if (act === "save") {
      handlePrintKOT();
    } else if (act === "pay") {
      handleSaveBill();
    }
  };

  const handleTransferToRoom = async () => {
    const roomNum = prompt("Enter room number:");
    if (!roomNum) return;
    if (orderType === "DINE_IN" && !selectedTable) { alert("Select a table first"); return; }
    const subtotal = calculateTotal();
    const tax = calculateTax();
    setLoading(true);
    try {
      await API.post("/restaurant/bill", {
        table: orderType === "DINE_IN" ? selectedTable.number : orderType,
        tableNumber: orderType === "DINE_IN" ? selectedTable.number : orderType,
        subtotal, gst: tax, total: subtotal + tax,
        paymentMethod: "Room Transfer",
        entityType: "Room",
        customerName: `Room ${roomNum}`,
        items: getCurrentOrderItems().map(i => ({ name: i.name, price: i.price, quantity: i.quantity, amount: i.price * i.quantity })),
      });
      alert(`Order transferred to Room ${roomNum}`);
      setCurrentOrderItems([]);
      if (orderType === "DINE_IN") setSelectedTable(null);
    } catch (err) {
      console.error("Error transferring:", err);
      alert(err.response?.data?.message || "Error transferring to room");
    } finally {
      setLoading(false);
    }
  };

  const handleSplitBillOpen = () => {
    if (!getCurrentOrderItems().length) return alert("Add items first");
    setShowSplitBill(true);
  };

  const handleOrderTypeChange = (type) => {
    setOrderType(type);
  };

  const handleSplitBillConfirm = () => {
    const perPerson = (calculateGrandTotal() / splitBillData.parts).toFixed(2);
    alert(`Bill split into ${splitBillData.parts} parts\nAmount per person: ₹${perPerson}`);
    setShowSplitBill(false);
    setSplitBillData({ parts: 2 });
  };

  const handleDeleteMenuItem = async (id) => {
    if (!confirm("Delete this item?")) return;
    try {
      await API.delete(`/restaurant/menu/${id}`);
      setMenuItems(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error("Error deleting:", err);
    }
  };

  const handleDeleteTable = async (id) => {
    if (!confirm("Delete this table?")) return;
    try {
      await API.delete(`/restaurant/tables/${id}`);
      setTables(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error("Error deleting:", err);
    }
  };

  // Filter for KDS
  const tableKots = kotHistory.filter(k => k.table === selectedTable?.number);

  const today = new Date().toLocaleDateString("en-IN");

  return (
    <div className="pos-screen">
      {/* TOP NAV BAR */}
      <div className="pos-topbar">
        <div className="pos-topbar-left">
          <button className="pos-logo-btn" onClick={() => navigate('/dashboard')}>
            <span className="pos-logo-icon">Q</span>
            <span>urbanPOS</span>
          </button>
          <button className={`pos-tab ${activeTab === "dashboard" ? "active" : ""}`} onClick={() => setActiveTab("dashboard")}>Dashboard</button>
          <button className={`pos-tab ${activeTab === "pos" ? "active-green" : ""}`} onClick={() => setActiveTab("pos")}>New Order</button>
          <button className={`pos-tab ${activeTab === "quick" ? "active" : ""}`} onClick={() => setActiveTab("quick")}>Quick Bill</button>
          <button className={`pos-tab ${activeTab === "kds" ? "active" : ""}`} onClick={() => setActiveTab("kds")}>KDS (KOT)</button>
          <button className={`pos-tab ${activeTab === "transaction" ? "active" : ""}`} onClick={() => setActiveTab("transaction")}>Daily Transaction</button>
          <button className={`pos-tab ${activeTab === "items" ? "active" : ""}`} onClick={() => setActiveTab("items")}>Items</button>
          <button className={`pos-tab ${activeTab === "tables" ? "active" : ""}`} onClick={() => setActiveTab("tables")}>Tables</button>
          <button className={`pos-tab ${activeTab === "invoices" ? "active" : ""}`} onClick={() => setActiveTab("invoices")}>Invoices</button>
          <button className={`pos-tab ${activeTab === "captains" ? "active" : ""}`} onClick={() => setActiveTab("captains")}>Captains</button>
        </div>
        <div className="pos-topbar-right">
          <span>{localStorage.getItem("userName") || localStorage.getItem("name") || "User"} |</span>
          <span>{today}</span>
          <button
            className="logout-btn"
            onClick={() => {
              if (confirm("Logout?")) {
                localStorage.clear();
                navigate("/login");
              }
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* ORDER TYPE BAR */}
      <div className="pos-ordertype-bar">
        {['DINE_IN', 'TAKEAWAY', 'DELIVERY', 'PARCEL'].map(type => (
          <button
            key={type}
            className={`ordertype-btn ${orderType === type ? 'active' : ''}`}
            onClick={() => handleOrderTypeChange(type)}
          >
            {type.replace('_', '+')}
          </button>
        ))}
        <div className="ordertype-divider" />
        <button className="ordertype-icon-btn" title="User">👤</button>
        <button className="ordertype-icon-btn" title="Area">🔲</button>
        <button className="ordertype-icon-btn" title="Currency">₹</button>
        <button className="ordertype-icon-btn" title="Table Transfer">🔄</button>
        <button className="ordertype-icon-btn" style={{ background: '#e3f2fd', color: '#1976d2', border: '1px solid #90caf9' }}>R</button>
        <button className="ordertype-icon-btn" style={{ background: '#ffebee', color: '#c62828', border: '1px solid #ef9a9a' }}>↻</button>
        <select
          value={tableFilter}
          onChange={e => setTableFilter(e.target.value)}
          style={{ border: '1px solid #ccc', padding: '2px 6px', fontSize: '11px', borderRadius: '3px', height: '22px', background: '#fff' }}
        >
          <option>All Tables</option>
          <option>Available</option>
          <option>Occupied</option>
        </select>
        <button className="ordertype-btn" style={{ height: '22px', fontSize: '10px', padding: '0 8px', background: '#e3f2fd', color: '#1976d2', border: '1px solid #90caf9', fontWeight: 600 }}>All</button>
        <div className="ordertype-right">
          <input
            placeholder="Table#"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ border: '1px solid #ccc', padding: '2px 6px', fontSize: '11px', borderRadius: '3px', height: '22px', width: '70px' }}
          />
          <button className="pos-create-btn" onClick={handleCreateTable}>Create</button>
        </div>
      </div>

      {/* === NEW ORDER === */}
      {activeTab === "pos" && (
        <div className="pos-content">
          {/* LEFT: Table Map - only for DINE_IN */}
          {orderType === "DINE_IN" ? (
          <div className="pos-left-panel">
            <div className="pos-section-bar">
              {sections.map(s => (
                <button
                  key={s}
                  className={`section-btn ${selectedSection === s ? 'selected' : ''}`}
                  onClick={() => setSelectedSection(s)}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="pos-table-grid">
              {filteredTables.map(table => {
                const sel = selectedTable?.id === table.id;
                const occ = table.status === "Occupied";
                const occData = occupiedTableData[String(table.number || table.tableNumber || "")];
                return (
                  <div
                    key={table.id}
                    className={`table-card ${occ ? 'occupied' : ''} ${sel ? 'selected' : ''}`}
                    onClick={() => handleTableClick(table)}
                  >
                    <div className="table-card-top">
                      <span className="table-num">{table.number}</span>
                      {occ && <span className="table-badge">RUN</span>}
                    </div>
                    {occ && occData ? (
                      <>
                        <div className="table-card-meta" style={{ fontWeight: 700, color: '#333', fontSize: '12px', textAlign: 'center', paddingTop: '4px' }}>
                          ₹ {occData.amount?.toFixed(2) || '0.00'}
                        </div>
                        <div className="table-card-meta" style={{ fontSize: '9px', color: '#666' }}>
                          {occData.captain || 'RECEPTION'}
                        </div>
                        <div className="table-card-meta" style={{ fontSize: '9px', color: '#666' }}>
                          Guests: {occData.guests || 1}
                        </div>
                      </>
                    ) : (
                      <div className="table-card-meta">Available</div>
                    )}
                    <div className="table-card-bottom">
                      <span style={{ fontSize: '10px', color: '#888' }}>#{table.number}</span>
                      <span className="table-card-icon">➕</span>
                    </div>
                  </div>
                );
              })}
              {filteredTables.length === 0 && (
                <div className="empty-order">No tables found</div>
              )}
            </div>
          </div>
          ) : (
          /* NON-DINE_IN LEFT PANEL */
          <div className="pos-left-panel">
            <div style={{ padding: '10px', borderBottom: '1px solid #eee', background: '#fafafa' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#333', marginBottom: '8px' }}>
                {orderType.replace('_', '+')} — Order
              </div>
              <input
                placeholder="Customer Name"
                value={orderTypeData[orderType]?.customerName || ""}
                onChange={e => setOrderTypeData(prev => ({ ...prev, [orderType]: { ...prev[orderType], customerName: e.target.value } }))}
                style={{ width: '100%', border: '1px solid #ccc', padding: '4px 6px', fontSize: '11px', borderRadius: '3px', marginBottom: '6px' }}
              />
              <input
                placeholder="Phone"
                value={orderTypeData[orderType]?.phone || ""}
                onChange={e => setOrderTypeData(prev => ({ ...prev, [orderType]: { ...prev[orderType], phone: e.target.value } }))}
                style={{ width: '100%', border: '1px solid #ccc', padding: '4px 6px', fontSize: '11px', borderRadius: '3px', marginBottom: '6px' }}
              />
              {(orderType === "DELIVERY") && (
                <textarea
                  placeholder="Delivery Address"
                  value={orderTypeData[orderType]?.address || ""}
                  onChange={e => setOrderTypeData(prev => ({ ...prev, [orderType]: { ...prev[orderType], address: e.target.value } }))}
                  style={{ width: '100%', border: '1px solid #ccc', padding: '4px 6px', fontSize: '11px', borderRadius: '3px', resize: 'vertical', minHeight: '60px' }}
                />
              )}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px', fontWeight: 600 }}>
                Running Orders ({getCurrentOrderItems().length})
              </div>
              {getCurrentOrderItems().length === 0 ? (
                <div className="empty-order">No items added</div>
              ) : getCurrentOrderItems().map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #eee', fontSize: '11px' }}>
                  <span>{item.name} × {item.quantity}</span>
                  <span>₹{item.price * item.quantity}</span>
                </div>
              ))}
            </div>
          </div>
          )}

          {/* CENTER: Order Items + Menu */}
          <div className="pos-center-panel">
            <div className="pos-order-header">
              <div className="pos-order-header-left">
                {orderType === "DINE_IN" ? (
                  <>
                    <strong>{selectedTable ? `Table No ${selectedTable.number}` : 'Table No ?'}</strong>
                    <span className="captain">Captain RECEPTION</span>
                  </>
                ) : (
                  <strong style={{ fontSize: '13px' }}>{orderType.replace('_', '+')} Order</strong>
                )}
              </div>
              <div className="pos-order-header-right">
                {orderType === "DINE_IN" && selectedTable ? `Invoice ${selectedTable.id || '-'}` : `Invoice -`}
              </div>
            </div>

            <div className="pos-order-items">
              <div className="order-item-head">
                <span>Item Name</span>
                <span>Qty</span>
                <span>Rate</span>
                <span>Amount</span>
              </div>
              {getCurrentOrderItems().length === 0 ? (
                <div className="empty-order">No items selected.</div>
              ) : (
                getCurrentOrderItems().map(item => (
                  <div key={item.id} className="order-item-row">
                    <span>{item.name}</span>
                    <span>
                      <button className="qty-btn" onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}>−</button>
                      <span className="qty-display">{item.quantity}</span>
                      <button className="qty-btn" onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}>+</button>
                    </span>
                    <span>₹{item.price}</span>
                    <span>₹{item.price * item.quantity} <span onClick={() => handleRemoveItem(item.id)} style={{ cursor: 'pointer', color: '#e74c3c', marginLeft: '4px', fontSize: '10px' }}>✕</span></span>
                  </div>
                ))
              )}
            </div>

            {/* MENU */}
            <div className="pos-menu-area">
              <div className="pos-category-list">
                {categories.map(cat => (
                  <div
                    key={cat}
                    className={`category-chip ${selectedCategory === cat ? 'selected' : ''}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </div>
                ))}
              </div>
              <div className="pos-menu-grid">
                {filteredMenuItems.map(item => (
                  <button
                    key={item.id}
                    className="menu-item-btn"
                    onClick={() => handleAddToOrder(item)}
                    disabled={item.status === "Not Available"}
                  >
                    <div className="menu-item-name">{item.name}</div>
                    <div className="menu-item-price">₹ {item.effectivePrice || item.effective_price || item.price}</div>
                  </button>
                ))}
                {filteredMenuItems.length === 0 && (
                  <div className="empty-order" style={{ gridColumn: '1/-1' }}>No items in this category</div>
                )}
              </div>
            </div>

            {/* BOTTOM BAR */}
            <div className="pos-bottom-bar">
              <div className="pos-summary">
                <div>Total Items: {getCurrentOrderItems().reduce((a, i) => a + i.quantity, 0)}</div>
                <div>Sub Total: ₹{calculateTotal().toFixed(2)}</div>
                <div>Tax (5% GST): ₹{calculateTax().toFixed(2)}</div>
                <div className="total-label">Net Total: ₹{calculateGrandTotal().toFixed(2)}</div>
              </div>
              <div className="pos-actions">
                <button className="action-btn red" onClick={handleClearOrder} disabled={loading}>Clear</button>
                <button className="action-btn yellow" onClick={handlePrintKOT} disabled={loading}>KOT</button>
                <button className="action-btn green" onClick={handleSaveBill} disabled={loading}>Bill</button>
                {orderType === "DINE_IN" && <button className="action-btn blue" onClick={handleTransferToRoom} disabled={loading}>Transfer</button>}
                <button className="action-btn orange" onClick={handleSplitBillOpen} disabled={loading}>Split</button>
              </div>
            </div>
          </div>

          {/* RIGHT: KOT */}
          <div className="pos-right-panel">
            <div className="kot-header">
              <span>KOT (KITCHEN ORDER TICKET)</span>
              <button className="mini-btn blue" onClick={() => setShowKOTModal(true)}>View All</button>
            </div>
            <div className="kot-scroll">
              {tableKots.length === 0 ? (
                <div className="empty-order">No KOT printed for this table.</div>
              ) : (
                tableKots.map((kot, idx) => (
                  <div key={kot.id} className="kot-card">
                    <div className="kot-card-head">
                      <strong>KOT#{idx + 1}</strong>
                      <span style={{ color: '#888', fontSize: '10px' }}>{new Date(kot.timestamp).toLocaleTimeString()}</span>
                    </div>
                    {kot.items.map((item, i) => (
                      <div key={i} className="kot-card-item">
                        <span>{item.name}</span>
                        <span>{item.quantity}</span>
                      </div>
                    ))}
                    <div style={{ padding: '4px 8px', display: 'flex', gap: '4px', borderTop: '1px solid #eee' }}>
                      <button className="mini-btn blue">Waiter</button>
                      <button className="mini-btn yellow">Transfer</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* === DASHBOARD === */}
      {activeTab === "dashboard" && (
        <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
          <div className="simple-card">
            <div className="simple-page-header">
              <h2 className="simple-page-title">Restaurant Dashboard</h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input type="date" style={{ border: '1px solid #ccc', padding: '4px 6px', fontSize: '11px', borderRadius: '3px' }} />
                <input type="date" style={{ border: '1px solid #ccc', padding: '4px 6px', fontSize: '11px', borderRadius: '3px' }} />
                <button style={{ background: '#3498db', color: '#fff', border: 'none', padding: '4px 10px', fontSize: '11px', borderRadius: '3px', cursor: 'pointer' }}>Search</button>
              </div>
            </div>
          </div>
          <div className="pos-kpi-grid">
            {[
              { label: "Table Sale", value: `₹ ${calculateTotal().toLocaleString() || 0}`, sub: "Unsettled: 0" },
              { label: "Counter Sale", value: "₹ 0", sub: "Unsettled: 0" },
              { label: "Parcel Charges", value: "₹ 0", sub: " " },
              { label: "Total Tax", value: `₹ ${calculateTax().toLocaleString()}`, sub: "CGST + SGST" },
              { label: "Total Discount", value: "₹ 0", sub: " " },
            ].map((kpi, i) => (
              <div key={i} className="pos-kpi-card">
                <div className="pos-kpi-label">{kpi.label}</div>
                <div className="pos-kpi-value">{kpi.value}</div>
                <div className="pos-kpi-sub">{kpi.sub}</div>
              </div>
            ))}
          </div>
          <div className="pos-charts-row">
            <div className="pos-chart-card">
              <div className="pos-chart-title">Item Wise Sale</div>
              <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'conic-gradient(#3498db 0deg 200deg, #eee 200deg 360deg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '55px', height: '55px', background: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                    <span style={{ fontSize: '14px', fontWeight: '700' }}>{getCurrentOrderItems().length}</span>
                    <span style={{ fontSize: '9px', color: '#888' }}>Items</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="pos-chart-card">
              <div className="pos-chart-title">Category Wise Sale</div>
              <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'conic-gradient(#f1c40f 0deg 150deg, #eee 150deg 360deg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '55px', height: '55px', background: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                    <span style={{ fontSize: '14px', fontWeight: '700' }}>{tables.filter(t => t.status === "Occupied").length}</span>
                    <span style={{ fontSize: '9px', color: '#888' }}>Tables</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="pos-chart-card">
              <div className="pos-chart-title">Hourly Sale</div>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', height: '100px', gap: '6px', paddingBottom: '10px' }}>
                {[30, 50, 20, 70, 40, 90, 60, 80].map((h, i) => (
                  <div key={i} style={{ width: '24px', background: 'linear-gradient(to top, #9b59b6, #8e44ad)', borderRadius: '3px 3px 0 0', height: `${h}%`, minHeight: '8px' }} />
                ))}
              </div>
            </div>
          </div>
          <div className="pos-summary-row">
            <div className="pos-table-card">
              <div className="pos-table-title">Top Selling Items</div>
              <table className="pos-table">
                <thead><tr><th>#</th><th>Item Name</th><th>Qty</th><th>Amount</th></tr></thead>
                <tbody>
                  {getCurrentOrderItems().length > 0 ? getCurrentOrderItems().map((item, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td><td>{item.name}</td><td>{item.quantity}</td><td>₹ {(item.price * item.quantity).toLocaleString()}</td>
                    </tr>
                  )) : <tr><td colSpan="4" style={{ textAlign: 'center', color: '#999' }}>No items sold today</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="pos-table-card">
              <div className="pos-table-title">Table Wise Sale</div>
              <table className="pos-table">
                <thead><tr><th>Table</th><th>Items</th><th>Amount</th></tr></thead>
                <tbody>
                  {tables.filter(t => t.status === "Occupied").length > 0 ? tables.filter(t => t.status === "Occupied").map(t => (
                    <tr key={t.id}><td>{t.number}</td><td>0</td><td>₹ 0</td></tr>
                  )) : <tr><td colSpan="3" style={{ textAlign: 'center', color: '#999' }}>No occupied tables</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* === QUICK BILL === */}
      {activeTab === "quick" && (
        <div className="pos-content">
          <div className="pos-left-panel">
            <div style={{ padding: '8px', borderBottom: '1px solid #eee', background: '#fafafa' }}>
              <h3 style={{ margin: 0, fontSize: '12px', fontWeight: '700', color: '#333' }}>Quick Bill — No Table</h3>
            </div>
            <div className="pos-section-bar">
              {categories.map(cat => (
                <button key={cat} className={`section-btn ${selectedCategory === cat ? 'selected' : ''}`} onClick={() => setSelectedCategory(cat)}>{cat}</button>
              ))}
            </div>
            <div className="pos-menu-grid" style={{ padding: '8px' }}>
              {filteredMenuItems.map(item => (
                <button key={item.id} className="menu-item-btn" onClick={() => handleAddToOrder(item)}>
                  <div className="menu-item-name">{item.name}</div>
                  <div className="menu-item-price">₹ {item.price}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="pos-center-panel">
            <div className="pos-order-header">
              <div className="pos-order-header-left">
                <strong>Quick Bill</strong>
                <span className="captain">No Table Selected</span>
              </div>
              <div className="pos-order-header-right">Invoice -</div>
            </div>
            <div className="pos-order-items">
              <div className="order-item-head"><span>Item Name</span><span>Qty</span><span>Rate</span><span>Amount</span></div>
              {getCurrentOrderItems().length === 0 ? <div className="empty-order">No items selected.</div> : getCurrentOrderItems().map(item => (
                <div key={item.id} className="order-item-row">
                  <span>{item.name}</span>
                  <span>
                    <button className="qty-btn" onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}>−</button>
                    <span className="qty-display">{item.quantity}</span>
                    <button className="qty-btn" onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}>+</button>
                  </span>
                  <span>₹{item.price}</span>
                  <span>₹{item.price * item.quantity} <span onClick={() => handleRemoveItem(item.id)} style={{ cursor: 'pointer', color: '#e74c3c', marginLeft: '4px', fontSize: '10px' }}>✕</span></span>
                </div>
              ))}
            </div>
            <div className="pos-bottom-bar">
              <div className="pos-summary">
                <div>Total Items: {getCurrentOrderItems().reduce((a, i) => a + i.quantity, 0)}</div>
                <div>Sub Total: ₹{calculateTotal().toFixed(2)}</div>
                <div>Tax (5% GST): ₹{calculateTax().toFixed(2)}</div>
                <div className="total-label">Net Total: ₹{calculateGrandTotal().toFixed(2)}</div>
              </div>
              <div className="pos-actions">
                <button className="action-btn red" onClick={() => setCurrentOrderItems([])}>Clear</button>
                <button className="action-btn yellow" onClick={handlePrintKOT} disabled={loading}>KOT</button>
                <button className="action-btn green" onClick={handleSaveBill} disabled={loading}>Bill</button>
              </div>
            </div>
          </div>
          <div className="pos-right-panel">
            <div className="kot-header"><span>KOT</span></div>
            <div className="kot-scroll">
              <div className="empty-order">No orders yet.</div>
            </div>
          </div>
        </div>
      )}

      {/* === KDS === */}
      {activeTab === "kds" && (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <div style={{ flex: 1, padding: '10px', overflowY: 'auto' }}>
            <div className="kds-header">
              <span>KDS (KITCHEN DISPLAY SYSTEM)</span>
              <button className="kds-toggle">🗂 All</button>
            </div>
            <div className="kds-scroll">
              {kotHistory.length === 0 ? (
                <div className="empty-order">No orders in kitchen.</div>
              ) : kotHistory.map((kot, idx) => (
                <div key={kot.id} className="kds-card">
                  <div className="kds-card-head">
                    <strong>KOT#{idx + 1} — Table {kot.table}</strong>
                    <div>
                      <span style={{ marginRight: '6px', fontSize: '10px', color: '#888' }}>{new Date(kot.timestamp).toLocaleTimeString()}</span>
                      <span className="kds-status pending">PENDING</span>
                    </div>
                  </div>
                  {kot.items.map((item, i) => (
                    <div key={i} className="kds-card-item">
                      <span>{item.name}</span>
                      <span style={{ fontWeight: '700' }}>{item.quantity}</span>
                    </div>
                  ))}
                  <div style={{ padding: '6px 8px', display: 'flex', gap: '6px' }}>
                    <button className="mini-btn blue">Mark Ready</button>
                    <button className="mini-btn yellow">Served</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* === DAILY TRANSACTION === */}
      {activeTab === "transaction" && (
        <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
          <div className="simple-card">
            <div className="simple-page-header">
              <h2 className="simple-page-title">Daily Transaction</h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input type="date" style={{ border: '1px solid #ccc', padding: '4px 6px', fontSize: '11px', borderRadius: '3px' }} />
                <button style={{ background: '#3498db', color: '#fff', border: 'none', padding: '4px 10px', fontSize: '11px', borderRadius: '3px', cursor: 'pointer' }}>Search</button>
              </div>
            </div>
            <table className="trans-table">
              <thead><tr><th>#</th><th>Invoice No</th><th>Table</th><th>Date</th><th>Amount</th><th>Payment</th><th>Status</th></tr></thead>
              <tbody>
                {invoiceGroups.length > 0 ? invoiceGroups.map((inv, idx) => (
                  <tr key={inv.id}>
                    <td>{idx + 1}</td><td>{inv.invoiceNo}</td><td>{inv.table || '-'}</td>
                    <td>{inv.date ? new Date(inv.date).toLocaleDateString() : '-'}</td>
                    <td>₹{inv.amount?.toLocaleString() || 0}</td>
                    <td>Cash</td>
                    <td><span className="trans-status success">PAID</span></td>
                  </tr>
                )) : <tr><td colSpan="7" style={{ textAlign: 'center', color: '#999', padding: '20px' }}>No transactions found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* === ITEMS === */}
      {activeTab === "items" && (
        <div className="pos-management-view">
          <div className="simple-card">
            <div className="simple-page-header">
              <h2 className="simple-page-title">Menu Items</h2>
            </div>
            <table className="simple-table">
              <thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {menuItems.map(item => (
                  <tr key={item.id}>
                    <td className="font-medium">{item.name}</td>
                    <td>{item.category || '-'}</td>
                    <td>₹{item.price}</td>
                    <td><span className={`simple-badge ${item.foodType === "Veg" ? "badge-green" : "badge-red"}`}>{item.foodType || "Veg"}</span></td>
                    <td><span className={`simple-badge ${item.status === "Available" ? "badge-green" : "badge-orange"}`}>{item.status || "Available"}</span></td>
                    <td>
                      <button className="simple-btn simple-btn-outline simple-btn-sm" style={{ marginRight: '5px' }}>Edit</button>
                      <button className="simple-btn simple-btn-gray simple-btn-sm" onClick={() => handleDeleteMenuItem(item.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
                {menuItems.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center', color: '#999', padding: '20px' }}>No menu items found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* === TABLES === */}
      {activeTab === "tables" && (
        <div className="pos-management-view">
          <div className="simple-card">
            <div className="simple-page-header">
              <h2 className="simple-page-title">Tables</h2>
              <button className="simple-btn simple-btn-primary" onClick={() => { const n = prompt("Table number:"); if (n) { setSearchTerm(n); handleCreateTable(); } }}>+ Add Table</button>
            </div>
            <table className="simple-table">
              <thead><tr><th>Table No</th><th>Section</th><th>Seats</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {tables.map(table => (
                  <tr key={table.id}>
                    <td className="font-medium">{table.number}</td>
                    <td>{table.sectionName || table.section || '-'}</td>
                    <td>{table.seatCount || 4}</td>
                    <td><span className={`simple-badge ${table.status === "Available" ? "badge-green" : "badge-orange"}`}>{table.status || "Available"}</span></td>
                    <td><button className="simple-btn simple-btn-gray simple-btn-sm" onClick={() => handleDeleteTable(table.id)}>Delete</button></td>
                  </tr>
                ))}
                {tables.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', color: '#999', padding: '20px' }}>No tables found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* === INVOICES === */}
      {activeTab === "invoices" && (
        <div className="pos-management-view">
          <div className="simple-card">
            <div className="simple-page-header">
              <h2 className="simple-page-title">Invoice History</h2>
            </div>
            <table className="simple-table">
              <thead><tr><th>Invoice No</th><th>Table</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {invoiceGroups.map(inv => (
                  <tr key={inv.id}>
                    <td className="font-medium">{inv.invoiceNo}</td>
                    <td>{inv.table || '-'}</td>
                    <td>₹{inv.amount?.toLocaleString() || 0}</td>
                    <td><span className={`simple-badge ${inv.status === "Paid" ? "badge-green" : "badge-orange"}`}>{inv.status || "Generated"}</span></td>
                    <td>{inv.date ? new Date(inv.date).toLocaleDateString() : '-'}</td>
                  </tr>
                ))}
                {invoiceGroups.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', color: '#999', padding: '20px' }}>No invoices found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* === CAPTAINS === */}
      {activeTab === "captains" && (
        <div className="pos-management-view">
          <div className="simple-card">
            <div className="simple-page-header">
              <h2 className="simple-page-title">Captains / Waiters</h2>
              <button className="simple-btn simple-btn-primary" onClick={() => navigate("/create-user")}>+ Add Captain</button>
            </div>
            <table className="simple-table">
              <thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead>
              <tbody>
                {captains.map(cap => (
                  <tr key={cap.id}>
                    <td className="font-medium">{cap.name}</td>
                    <td>{cap.email}</td>
                    <td><span className="simple-badge badge-blue">{cap.role}</span></td>
                  </tr>
                ))}
                {captains.length === 0 && <tr><td colSpan="3" style={{ textAlign: 'center', color: '#999', padding: '20px' }}>No captains found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* === SPLIT BILL MODAL === */}
      {showSplitBill && (
        <div className="modal-overlay" onClick={() => setShowSplitBill(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Split Bill</div>
            <div className="simple-form-group">
              <label className="simple-label">Number of Parts</label>
              <input type="number" min="2" max="10" value={splitBillData.parts}
                onChange={e => setSplitBillData({ ...splitBillData, parts: parseInt(e.target.value) || 2 })}
                className="simple-input" />
            </div>
            <div className="simple-summary">
              <div className="simple-summary-row"><span>Total Amount</span><span>₹{calculateGrandTotal().toFixed(2)}</span></div>
              <div className="simple-summary-row"><span>Per Person</span><span>₹{((calculateGrandTotal() || 0) / splitBillData.parts).toFixed(2)}</span></div>
            </div>
            <div className="simple-btn-row">
              <button className="simple-btn simple-btn-gray" onClick={() => setShowSplitBill(false)}>Cancel</button>
              <button className="simple-btn simple-btn-primary" onClick={handleSplitBillConfirm}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* === KOT MODAL === */}
      {showKOTModal && (
        <div className="modal-overlay" onClick={() => setShowKOTModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-title">KOT History — Table {selectedTable?.number || 'N/A'}</div>
            <div className="kot-scroll" style={{ maxHeight: '400px' }}>
              {tableKots.length === 0 ? (
                <div className="empty-order">No KOTs for this table.</div>
              ) : tableKots.map((kot, idx) => (
                <div key={kot.id} className="kot-card" style={{ marginBottom: '10px' }}>
                  <div className="kot-card-head">
                    <strong>KOT#{idx + 1}</strong>
                    <span>{new Date(kot.timestamp).toLocaleTimeString()}</span>
                  </div>
                  {kot.items.map((item, i) => (
                    <div key={i} className="kot-card-item">
                      <span>{item.name}</span>
                      <span style={{ fontWeight: '700' }}>{item.quantity}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="simple-btn-row" style={{ marginTop: '10px' }}>
              <button className="simple-btn simple-btn-gray" onClick={() => setShowKOTModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantPOS;