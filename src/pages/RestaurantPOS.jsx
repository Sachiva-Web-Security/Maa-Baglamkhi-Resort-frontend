import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import Modal from "../components/Hotel/Modal";
import "./RestaurantPOS.css";

const RestaurantPOS = () => {
  const navigate = useNavigate();
  const [selectedTable, setSelectedTable] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [showSplitBillModal, setShowSplitBillModal] = useState(false);
  const [splitBillData, setSplitBillData] = useState({ parts: 2 });
  const [selectedSection, setSelectedSection] = useState("RESTAURANT");
  const [searchTerm, setSearchTerm] = useState("");
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showKOTModal, setShowKOTModal] = useState(false);
  const [showKOTPanel, setShowKOTPanel] = useState(true);
  const [kotHistory, setKotHistory] = useState([]);
  const [tables, setTables] = useState([]);
  const [activeTab, setActiveTab] = useState("pos");

  // Management states
  const [captains, setCaptains] = useState([]);
  const [invoiceGroups, setInvoiceGroups] = useState([]);

  const sections = ["RESTAURANT", "GARDEN", "PARSAL", "ROOM DINING"];

  useEffect(() => {
    const fetchTables = async () => {
      try {
        const res = await API.get("/restaurant/tables");
        if (res.data) {
          setTables(res.data);
        }
      } catch (err) {
        console.error("Error fetching restaurant tables:", err);
      }
    };
    const fetchMenuItems = async () => {
      try {
        const res = await API.get("/restaurant/menu");
        if (res.data) {
          setMenuItems(res.data);
          // Extract categories from menu items
          const categories = [...new Set(res.data.map(i => i.category).filter(Boolean))];
          if (categories.length === 0) categories.push("Beverages", "Starters", "Main Course", "Desserts");
          // Categories extracted for potential future use
        }
      } catch (err) {
        console.error("Error fetching menu items:", err);
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
    fetchTables();
    fetchMenuItems();
    fetchBills();
    fetchUsers();
  }, []);

  const filteredMenuItems = menuItems.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const normalizedSection = selectedSection.toLowerCase();
  const filteredTables = tables.filter((table) => {
    // Check section via multiple possible field names
    const sectionValue = String(
      table.section || table.sectionName || table.area || table.zone || table.tableGroup || "",
    ).toLowerCase();

    // If table has no section assigned, show it in all sections
    const hasNoSection = sectionValue === "" || sectionValue === "null" || sectionValue === "undefined";

    // Match if: table has no section (show in all) OR section matches selected
    const sectionMatch = hasNoSection ||
      sectionValue === normalizedSection ||
      sectionValue.includes(normalizedSection);

    const tableNumber = String(table.number || table.tableNumber || "");
    const searchMatch = !searchTerm || tableNumber.includes(searchTerm.trim());
    return sectionMatch && searchMatch;
  });

  const getTableKey = (table) => String(table.id || table.number || table.tableNumber || table.table_no);

  const handleTableClick = (table) => {
    const tableKey = getTableKey(table);
    const prevKey = selectedTable ? getTableKey(selectedTable) : null;

    if (selectedTable && prevKey !== tableKey) {
      if (orderItems.length > 0) {
        if (!window.confirm("Switch table? Current order will be cleared.")) return;
      }
    }

    // Mark previous table as available
    if (prevKey && prevKey !== tableKey) {
      setTables((prev) =>
        prev.map((t) => getTableKey(t) === prevKey ? { ...t, status: "Available" } : t)
      );
    }

    // Mark new table as occupied if it has items
    if (orderItems.length > 0 || selectedTable) {
      setTables((prev) =>
        prev.map((t) => getTableKey(t) === tableKey ? { ...t, status: "Occupied" } : t)
      );
    }

    setOrderItems([]);
    setSelectedTable(table);
  };

  // Clear order - also mark table as available
  const handleClearOrder = () => {
    setOrderItems([]);
    if (selectedTable) {
      setTables((prev) =>
        prev.map((t) =>
          t.id === selectedTable.id ? { ...t, status: "Available" } : t
        )
      );
    }
  };

  // After bill is generated - mark table as available
  const handleBillGenerated = () => {
    if (selectedTable) {
      setTables((prev) =>
        prev.map((t) =>
          t.id === selectedTable.id ? { ...t, status: "Available" } : t
        )
      );
    }
    setOrderItems([]);
    setSelectedTable(null);
  };

  const handleCreateTable = async () => {
    const newTableNumber = searchTerm.trim();
    if (!newTableNumber) {
      alert("Enter a table number first");
      return;
    }
    const alreadyExists = tables.some(
      (table) => String(table.number || table.tableNumber) === newTableNumber,
    );
    if (alreadyExists) {
      alert("Table already exists");
      return;
    }

    try {
      const res = await API.post("/restaurant/tables", {
        number: newTableNumber,
        sectionName: selectedSection,
        seatCount: 4,
      });

      if (res.data && res.data.id) {
        setTables((prev) => [
          ...prev,
          {
            id: res.data.id,
            number: res.data.number || newTableNumber,
            status: "Available",
            section: selectedSection.toLowerCase(),
            guestCount: 0,
            currentBill: 0,
          },
        ]);
        setSearchTerm("");
      }
    } catch (err) {
      console.error("Error creating table:", err);
      alert(err.response?.data?.message || "Error creating table");
    }
  };

  const handleDeleteTable = async (id) => {
    if (!confirm("Delete this table?")) return;
    try {
      await API.delete(`/restaurant/tables/${id}`);
      setTables(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error("Error deleting table:", err);
      alert("Failed to delete table");
    }
  };

  const handleDeleteMenuItem = async (id) => {
    if (!confirm("Delete this menu item?")) return;
    try {
      await API.delete(`/restaurant/menu/${id}`);
      setMenuItems(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error("Error deleting menu item:", err);
      alert("Failed to delete menu item");
    }
  };

  const handleAddToOrder = (item) => {
    if (!selectedTable) {
      alert("Please select a table first");
      return;
    }

    if (item.status === "Not Available") {
      alert(`${item.name} is currently unavailable`);
      return;
    }

    // Mark table as occupied when adding first item
    setTables((prev) =>
      prev.map((t) =>
        t.id === selectedTable.id ? { ...t, status: "Occupied" } : t
      )
    );

    const existingItem = orderItems.find(
      (orderItem) => orderItem.id === item.id,
    );

    if (existingItem) {
      setOrderItems((prev) =>
        prev.map((orderItem) =>
          orderItem.id === item.id
            ? { ...orderItem, quantity: orderItem.quantity + 1 }
            : orderItem,
        ),
      );
    } else {
      setOrderItems((prev) => [
        ...prev,
        {
          id: item.id,
          name: item.name,
          price: Number(item.effectivePrice || item.effective_price || item.price || 0),
          quantity: 1,
          category: item.category,
          addedAt: new Date(),
        },
      ]);
    }
  };

  const _handleRemoveItem = (itemId) => {
    setOrderItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleUpdateQuantity = (itemId, quantity) => {
    setOrderItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, quantity } : item)),
    );
  };

  const calculateTotal = () => {
    const subtotal = orderItems.reduce(
      (total, item) => total + item.price * item.quantity,
      0,
    );
    const gst = subtotal * 0.05;
    return subtotal + gst;
  };

  const handleGenerateBill = async ({ paymentMethod, totalAmount }) => {
    if (!selectedTable) {
      alert("Please select a table first");
      return;
    }

    const subtotal = orderItems.reduce(
      (total, item) => total + item.price * item.quantity,
      0,
    );
    const gst = subtotal * 0.05;
    const total = subtotal + gst;

    const billData = {
      table: selectedTable.number,
      tableNumber: selectedTable.number,
      subtotal: subtotal,
      gst: gst,
      total: total,
      paymentMethod: paymentMethod || "Cash",
      items: orderItems.map((item) => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        amount: item.price * item.quantity,
      })),
      customerName: "",
      phone: "",
    };

    setLoading(true);
    try {
      const res = await API.post("/restaurant/bill", billData);

      if (res.data && res.data.id) {
        alert(
          `Bill Generated!\n\nTable: ${selectedTable.number}\nTotal: ₹${total.toFixed(2)}\nPayment: ${paymentMethod}\nInvoice# ${res.data.id}`,
        );
      } else {
        alert(
          `Bill Generated!\n\nTable: ${selectedTable.number}\nTotal: ₹${total.toFixed(2)}\nPayment: ${paymentMethod}`,
        );
      }

      // Clear order and table selection, mark table as available
      handleBillGenerated();
    } catch (err) {
      console.error("Error saving restaurant bill:", err);
      alert(err.response?.data?.message || "Error saving bill to server");
    } finally {
      setLoading(false);
    }
  };

  const handlePrintKOT = async () => {
    if (!calculateTotal()) return alert("Add items first");
    if (!selectedTable) {
      alert("Please select a table first");
      return;
    }

    setLoading(true);
    try {
      // Create order and add items to restaurant orders (persist each item)
      for (const item of orderItems) {
        await API.post("/restaurant/order/add", {
          tableNumber: selectedTable.number,
          item: {
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          },
        });
      }

      // Prepare kitchen items with timestamps
      const kitchenItems = orderItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        addedAt: item.addedAt || new Date(),
      }));

      // If a KOT already exists for this table, append items to it instead of creating a new KOT
      const existingKot = kotHistory.slice().reverse().find((k) => k.table === selectedTable.number);

      if (existingKot) {
        // Try to append to existing KOT on the server
        try {
          const resp = await API.post("/kitchen/order", {
            table: selectedTable.number,
            waiter: localStorage.getItem("name") || "RECEPTION",
            items: kitchenItems,
            entityType: "Table",
            prepTimeMinutes: 20,
            appendToKot: existingKot.kotNo,
          });

          if (resp?.data?.id) {
            // Server appended and returned an order id - update local history with server id
            setKotHistory((prev) =>
              prev.map((k) =>
                k.table === selectedTable.number
                  ? { ...k, items: [...k.items, ...kitchenItems], updatedAt: new Date(), serverUpdated: true }
                  : k,
              ),
            );
          } else {
            // Append acknowledged but no id - still update UI
            setKotHistory((prev) =>
              prev.map((k) =>
                k.table === selectedTable.number
                  ? { ...k, items: [...k.items, ...kitchenItems], updatedAt: new Date() }
                  : k,
              ),
            );
          }
        } catch (e) {
          console.error("Failed to append to existing KOT on server:", e);
          // Inform user that kitchen push failed
          alert("Warning: Could not push new items to Kitchen server. They are shown locally only.");
          setKotHistory((prev) =>
            prev.map((k) =>
              k.table === selectedTable.number
                ? { ...k, items: [...k.items, ...kitchenItems], updatedAt: new Date() }
                : k,
            ),
          );
        }
      } else {
        // Create new kitchen order
        try {
          const resp = await API.post("/kitchen/order", {
            table: selectedTable.number,
            waiter: localStorage.getItem("name") || "RECEPTION",
            items: kitchenItems,
            entityType: "Table",
            prepTimeMinutes: 20,
          });

          const newKOT = {
            id: resp?.data?.order?.id || resp?.data?.id || Date.now(),
            kotNo: resp?.data?.kotNo || `KOT-${Date.now()}`,
            table: selectedTable.number,
            timestamp: new Date(),
            items: kitchenItems,
          };
          setKotHistory((prev) => [...prev, newKOT]);
        } catch (e) {
          console.error("Failed to create kitchen order:", e);
          alert("Warning: Could not send KOT to Kitchen server. It will be available locally only.");
          const newKOT = {
            id: Date.now(),
            kotNo: `KOT-${Date.now()}`,
            table: selectedTable.number,
            timestamp: new Date(),
            items: kitchenItems,
          };
          setKotHistory((prev) => [...prev, newKOT]);
        }
      }

      // Show KOT panel if hidden
      setShowKOTPanel(true);

      alert("KOT printed successfully - Sent to Kitchen!");
    } catch (err) {
      console.error("Error printing KOT:", err);
      alert(err.response?.data?.message || "Error printing KOT");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBill = () => {
    if (!calculateTotal()) return alert("Add items first");
    handleGenerateBill({ paymentMethod: "Cash", totalAmount: calculateTotal() });
  };

  const handleTransferToRoom = async ({ paymentMethod, totalAmount, table }) => {
    if (!table) {
      alert("Select a table first");
      return;
    }
    const roomNumber = prompt("Enter room number:");
    if (roomNumber) {
      setLoading(true);
      try {
        const subtotal = orderItems.reduce((a, i) => a + i.price * i.quantity, 0);
        const gst = subtotal * 0.05;

        // Create bill
        const res = await API.post("/restaurant/bill", {
          table: table.number,
          tableNumber: table.number,
          subtotal,
          gst,
          total: subtotal + gst,
          paymentMethod: "Room Transfer",
          entityType: "Room",
          customerName: `Room ${roomNumber}`,
          items: orderItems.map((item) => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            amount: item.price * item.quantity,
          })),
        });

        // If bill created, try to charge to room
        if (res.data && res.data.id) {
          try {
            await API.post(`/restaurant/bill/${res.data.id}/charge-to-room`, {
              roomNumber: roomNumber,
            });
          } catch (chargeErr) {
            console.warn("Could not charge to room (non-critical):", chargeErr);
          }
        }

        alert(
          `Order transferred to Room ${roomNumber}\n\nTable: ${table.number}\nTotal: ₹${totalAmount.toFixed(2)}\nPayment: ${paymentMethod}`,
        );
        handleBillGenerated();
      } catch (err) {
        console.error("Error transferring to room:", err);
        alert(err.response?.data?.message || "Error transferring order to room");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSplitBill = ({ totalAmount }) => {
    setShowSplitBillModal(true);
    setSplitBillData({ parts: 2, totalAmount });
  };

  const handleSplitBillSubmit = () => {
    const amountPerPerson = (
      splitBillData.totalAmount / splitBillData.parts
    ).toFixed(2);
    alert(
      `Bill Split into ${splitBillData.parts} parts\n\nAmount per person: ₹${amountPerPerson}`,
    );
    setShowSplitBillModal(false);
    handleBillGenerated();
  };

  return (
    <div className="pos-screen">
      <div className="pos-topbar">
        <div className="pos-topbar-left">
          <button className={`pos-tab ${activeTab === "pos" ? "active" : ""}`} onClick={() => setActiveTab("pos")}>Dashboard</button>
          <button className={`pos-tab ${activeTab === "pos" ? "active-green" : ""}`} onClick={() => setActiveTab("pos")}>New Order</button>
          <button className={`pos-tab ${activeTab === "quick" ? "active" : ""}`} onClick={() => setActiveTab("quick")}>Quick Bill</button>
          <button className={`pos-tab ${activeTab === "kds" ? "active" : ""}`} onClick={() => setActiveTab("kds")}>KDS (KOT)</button>
          <button className={`pos-tab ${activeTab === "transaction" ? "active" : ""}`} onClick={() => setActiveTab("transaction")}>Daily Transaction</button>
          {/* Management tabs */}
          <button className={`pos-tab ${activeTab === "items" ? "active" : ""}`} onClick={() => setActiveTab("items")}>Items</button>
          <button className={`pos-tab ${activeTab === "tables" ? "active" : ""}`} onClick={() => setActiveTab("tables")}>Tables</button>
          <button className={`pos-tab ${activeTab === "invoices" ? "active" : ""}`} onClick={() => setActiveTab("invoices")}>Invoices</button>
          <button className={`pos-tab ${activeTab === "captains" ? "active" : ""}`} onClick={() => setActiveTab("captains")}>Captains</button>
        </div>
        <div className="pos-topbar-right">
          <span>{new Date().toLocaleDateString("en-IN")}</span>
        </div>
      </div>

      {activeTab === "items" && (
        <div className="pos-content" style={{ padding: "20px" }}>
          <div className="simple-card">
            <div className="simple-page-header">
              <h2 className="simple-page-title">Menu Items Management</h2>
              <button className="simple-btn simple-btn-primary" onClick={() => alert("Use Restaurant POS to add new items via menu")}>+ Add Item</button>
            </div>
            <div className="simple-table-wrapper">
              <table className="simple-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Food Type</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {menuItems.map(item => (
                    <tr key={item.id}>
                      <td className="font-medium">{item.name}</td>
                      <td>{item.category}</td>
                      <td>₹{item.price}</td>
                      <td><span className={`simple-badge ${item.foodType === "Veg" ? "badge-green" : "badge-red"}`}>{item.foodType}</span></td>
                      <td><span className={`simple-badge ${item.status === "Available" ? "badge-green" : "badge-orange"}`}>{item.status}</span></td>
                      <td>
                        <button onClick={() => alert("Menu item editing coming soon")} className="simple-btn simple-btn-outline simple-btn-sm" style={{marginRight: "5px"}}>Edit</button>
                        <button onClick={() => handleDeleteMenuItem(item.id)} className="simple-btn simple-btn-gray simple-btn-sm">Delete</button>
                      </td>
                    </tr>
                  ))}
                  {menuItems.length === 0 && <tr><td colSpan="6" className="empty-order">No menu items found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "tables" && (
        <div className="pos-content" style={{ padding: "20px" }}>
          <div className="simple-card">
            <div className="simple-page-header">
              <h2 className="simple-page-title">Tables Management</h2>
              <button className="simple-btn simple-btn-primary" onClick={handleCreateTable}>+ Add Table</button>
            </div>
            <div className="simple-table-wrapper">
              <table className="simple-table">
                <thead>
                  <tr>
                    <th>Table No</th>
                    <th>Section</th>
                    <th>Floor</th>
                    <th>Seats</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tables.map(table => (
                    <tr key={table.id}>
                      <td className="font-medium">{table.number}</td>
                      <td>{table.sectionName || table.section || "-"}</td>
                      <td>{table.floorName || "-"}</td>
                      <td>{table.seatCount || 4}</td>
                      <td><span className={`simple-badge ${table.status === "Available" ? "badge-green" : "badge-orange"}`}>{table.status}</span></td>
                      <td>
                        <button onClick={() => handleDeleteTable(table.id)} className="simple-btn simple-btn-gray simple-btn-sm">Delete</button>
                      </td>
                    </tr>
                  ))}
                  {tables.length === 0 && <tr><td colSpan="6" className="empty-order">No tables found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "invoices" && (
        <div className="pos-content" style={{ padding: "20px" }}>
          <div className="simple-card">
            <div className="simple-page-header">
              <h2 className="simple-page-title">Invoice History</h2>
            </div>
            <div className="simple-table-wrapper">
              <table className="simple-table">
                <thead>
                  <tr>
                    <th>Invoice No</th>
                    <th>Table</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceGroups.map(inv => (
                    <tr key={inv.id}>
                      <td className="font-medium">{inv.invoiceNo}</td>
                      <td>{inv.table || "-"}</td>
                      <td>₹{inv.amount?.toLocaleString() || 0}</td>
                      <td><span className={`simple-badge ${inv.status === "Paid" ? "badge-green" : "badge-orange"}`}>{inv.status || "Generated"}</span></td>
                      <td>{inv.date ? new Date(inv.date).toLocaleDateString() : "-"}</td>
                    </tr>
                  ))}
                  {invoiceGroups.length === 0 && <tr><td colSpan="5" className="empty-order">No invoices found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "captains" && (
        <div className="pos-content" style={{ padding: "20px" }}>
          <div className="simple-card">
            <div className="simple-page-header">
              <h2 className="simple-page-title">Captains / Waiters</h2>
              <button className="simple-btn simple-btn-primary" onClick={() => navigate("/create-user")}>+ Add Captain</button>
            </div>
            <div className="simple-table-wrapper">
              <table className="simple-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                  </tr>
                </thead>
                <tbody>
                  {captains.map(cap => (
                    <tr key={cap.id}>
                      <td className="font-medium">{cap.name}</td>
                      <td>{cap.email}</td>
                      <td><span className="simple-badge badge-blue">{cap.role}</span></td>
                    </tr>
                  ))}
                  {captains.length === 0 && <tr><td colSpan="3" className="empty-order">No captains found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {(activeTab === "pos" || activeTab === "quick" || activeTab === "kds" || activeTab === "transaction") && (
        <div className="pos-content">
        <div className="table-booking-panel">
          <div className="table-booking-header">
            <div className="table-section-tabs">
              {sections.map((section) => (
                <button
                  key={section}
                  className={`section-tab ${
                    selectedSection === section ? "selected" : ""
                  }`}
                  onClick={() => setSelectedSection(section)}
                >
                  {section}
                </button>
              ))}
            </div>
            <div className="table-booking-actions">
              <input
                className="pos-input"
                placeholder="Table#"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button className="pos-create-btn" onClick={handleCreateTable}>
                Create
              </button>
            </div>
          </div>

          <div className="table-map-grid">
            {filteredTables.map((table) => {
              const selected = selectedTable?.id === table.id;
              const occupied = table.status === "Occupied";
              return (
                <button
                  key={table.id}
                  className={`table-map-card ${selected ? "selected" : ""} ${
                    occupied ? "occupied" : ""
                  }`}
                  onClick={() => handleTableClick(table)}
                >
                  <div className="table-number">{table.number}</div>
                  {occupied ? (
                    <div className="table-meta">
                      <div>RECEPTION</div>
                      <div>₹ {(table.currentBill || 0).toFixed(2)}</div>
                    </div>
                  ) : (
                    <div className="table-meta">Available</div>
                  )}
                </button>
              );
            })}
            {filteredTables.length === 0 && (
              <div className="empty-order">No tables found for this section.</div>
            )}
          </div>
        </div>

        <div className="pos-order-panel">
          <div className="pos-order-header">
            <div>
              <strong>{selectedTable ? `Table No ${selectedTable.number}` : "Table No ?"}</strong>
              <div className="muted">Captain RECEPTION</div>
            </div>
            <div className="muted">
              {selectedTable ? `Invoice ${selectedTable.id}` : "Invoice -"}
            </div>
          </div>

          <div className="pos-order-grid">
            <div className="order-items-table">
              <div className="order-table-head">
                <span>Item Name</span>
                <span>Qty</span>
                <span>Rate</span>
                <span>Amount</span>
              </div>
              {orderItems.length === 0 ? (
                <div className="empty-order">No items selected.</div>
              ) : (
                orderItems.map((item) => (
                  <div key={item.id} className="order-row">
                    <span>{item.name}</span>
                    <span className="qty-controls">
                      <button onClick={() => handleUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}>-</button>
                      <b>{item.quantity}</b>
                      <button onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}>+</button>
                    </span>
                    <span>₹{item.price}</span>
                    <span>₹{item.price * item.quantity}</span>
                  </div>
                ))
              )}
            </div>

            <div className="menu-categories">
              <div className="category-title">FAVOURITE ITEMS</div>
              <div className="menu-item-grid">
                {filteredMenuItems.map((item) => (
                  <button
                    key={item.id}
                    className="menu-chip"
                    onClick={() => handleAddToOrder(item)}
                    disabled={item.status === "Not Available"}
                  >
                    <div>{item.name}</div>
                    <small>₹ {item.effectivePrice || item.effective_price || item.price}</small>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pos-bottom-actions">
            <div className="summary-box">
              <div>Total Items: {orderItems.reduce((a, i) => a + i.quantity, 0)}</div>
              <div>Sub Total: ₹{orderItems.reduce((a, i) => a + i.price * i.quantity, 0).toFixed(2)}</div>
              <div className="total">Net Total: ₹{calculateTotal().toFixed(2)}</div>
            </div>
            <div className="action-buttons">
              <button
                className="action red"
                onClick={handleClearOrder}
                disabled={loading}
              >
                Clear
              </button>
              <button
                className="action yellow"
                onClick={handlePrintKOT}
                disabled={loading}
              >
                Print KOT
              </button>
              <button
                className="action green"
                onClick={handleSaveBill}
                disabled={loading}
              >
                Save Bill
              </button>
              <button
                className="action blue"
                onClick={() => {
                  if (!calculateTotal()) return alert("Add items first");
                  handleTransferToRoom({
                    paymentMethod: "Room Transfer",
                    totalAmount: calculateTotal(),
                    table: selectedTable,
                  });
                }}
                disabled={loading}
              >
                Transfer
              </button>
              <button
                className="action purple"
                onClick={() => {
                  if (!calculateTotal()) return alert("Add items first");
                  handleSplitBill({ totalAmount: calculateTotal() });
                }}
                disabled={loading}
              >
                Split
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* KOT Popup Modal */}
      <Modal isOpen={showKOTModal} onClose={() => setShowKOTModal(false)} title={`KOT Details - Table ${selectedTable?.number || "N/A"}`}>
        <div className="kot-scroll" style={{ maxHeight: "400px", overflowY: "auto" }}>
          {(() => {
            const tableKots = kotHistory.filter((k) => k.table === selectedTable?.number);
            if (!tableKots || tableKots.length === 0) {
              return <div className="empty-order">No KOT entries.</div>;
            }

            return tableKots.map((kot, _kidx) => (
              <div key={kot.id} className="kot-card">
                <div className="kot-row-head">
                  <strong>{kot.kotNo}</strong>
                  <div className="muted">{new Date(kot.timestamp).toLocaleString()}</div>
                </div>

                {kot.items.map((item, idx) => (
                  <div key={`${kot.id}-${idx}`} className="kot-item-row">
                    <span>{item.name}</span>
                    <span>{Number(item.quantity).toFixed(3)}</span>
                    <span className="muted" style={{ marginLeft: 12 }}>{new Date(item.addedAt).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            ));
          })()}
        </div>
      </Modal>

      {/* Split Bill Modal */}
      <Modal isOpen={showSplitBillModal} onClose={() => setShowSplitBillModal(false)} title="Split Bill">
        <div>
          <div className="simple-form-group" style={{ marginBottom: 12 }}>
            <label className="simple-label">Number of Parts</label>
            <input type="number" min="2" max="10" value={splitBillData.parts}
              onChange={(e) => setSplitBillData({ ...splitBillData, parts: parseInt(e.target.value) || 2 })}
              className="simple-input" />
          </div>
          <div className="simple-summary" style={{ marginBottom: 14 }}>
            <div className="simple-summary-row"><span>Total Amount</span><span>₹{splitBillData.totalAmount?.toFixed(2)}</span></div>
            <div className="simple-summary-row"><span>Per Person</span><span>₹{((splitBillData.totalAmount || 0) / splitBillData.parts).toFixed(2)}</span></div>
          </div>
          <div className="simple-btn-row" style={{ justifyContent: "flex-end" }}>
            <button className="simple-btn simple-btn-gray" onClick={() => setShowSplitBillModal(false)}>Cancel</button>
            <button className="simple-btn simple-btn-primary" onClick={handleSplitBillSubmit}>Confirm Split</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RestaurantPOS;
