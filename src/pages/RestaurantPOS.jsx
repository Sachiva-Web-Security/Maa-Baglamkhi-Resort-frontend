import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import "./RestaurantPOS.css";

const RestaurantPOS = () => {
  const navigate = useNavigate();
  const formatAmount = (value) => {
    const amount = Number(value);
    return Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
  };
  const normalizeTableNumber = (value) => {
    const raw = String(value || "").trim().toUpperCase();
    if (!raw) return "";
    const prefixed = raw.match(/^([A-Z]+)0+(\d+)$/);
    if (prefixed) return `${prefixed[1]}${prefixed[2]}`;
    if (/^\d+$/.test(raw)) return String(Number(raw));
    return raw;
  };
  const [selectedTable, setSelectedTable] = useState(null);
  const [splitBillData, setSplitBillData] = useState({ parts: 2 });
  const [selectedSection, setSelectedSection] = useState("RESTAURANT");
  const [searchTerm, setSearchTerm] = useState("");
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showKOTModal, setShowKOTModal] = useState(false);
  const [kotHistory, setKotHistory] = useState([]);
  const [tables, setTables] = useState([]);
  const [editingTable, setEditingTable] = useState(null);
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
  const [showSplitBill, setShowSplitBill] = useState(false);
  const [tableFilter, setTableFilter] = useState("ALL");
  const [editingMenuItem, setEditingMenuItem] = useState(null); // null | {id?, name, category, price, foodType, status}
  const [kotDetailsTable, setKotDetailsTable] = useState(null); // table object for which KOT details modal is open
  const [occupiedTableData, setOccupiedTableData] = useState({});
  const [tableOrderData, setTableOrderData] = useState({});

  const defaultSections = ["RESTAURANT", "GARDEN", "PARSAL", "ROOM DINING"];
  const inferTableSection = (table) => {
    const explicitSection = String(table.sectionName || table.section || table.area || "").trim().toUpperCase();
    if (explicitSection) return explicitSection;

    const tableCode = normalizeTableNumber(table.number || table.tableNumber || table.roomNumber || "");
    if (tableCode.startsWith("T")) return "RESTAURANT";
    if (tableCode.startsWith("G")) return "GARDEN";
    if (tableCode.startsWith("P")) return "PARSAL";
    if (tableCode.startsWith("R")) return "ROOM DINING";
    return "RESTAURANT";
  };
  const sections = Array.from(new Set([
    ...defaultSections,
    ...tables.map((table) => inferTableSection(table)).filter(Boolean),
  ]));
  // Categories are derived from the menu items themselves so admin edits flow
  // through automatically — adding an item with a new category creates that
  // category, deleting the last item in a category removes it.
  const categories = React.useMemo(() => {
    const set = new Set(["All"]);
    menuItems.forEach((m) => {
      const c = String(m.category || "").trim();
      if (c) set.add(c);
    });
    return Array.from(set);
  }, [menuItems]);

  useEffect(() => {
    (async () => {
      try {
        const [tablesRes, menuRes, billRes, kotRes, usersRes] = await Promise.all([
          API.get("/restaurant/tables"),
          API.get("/restaurant/menu"),
          API.get("/restaurant/bills"),
          API.get("/kitchen/orders").catch(() => ({ data: [] })),
          API.get("/users"),
        ]);

        if (tablesRes.data) {
          // Normalize table numbers: strip T/G/R/P prefixes to match DB ids
          const normalized = (tablesRes.data || []).map(t => ({
            ...t,
            number: String(t.number || t.id || "").replace(/^[TGRP]/, ""),
            _rawNumber: String(t.number || t.id || ""),
          }));
          setTables(normalized);
        }

        if (menuRes.data) {
          setMenuItems(menuRes.data);
          if (menuRes.data.length > 0) {
            setSelectedCategory(menuRes.data[0].category || "Beverages");
          }
        }

        // Build occupiedTableData from paid bills
        const occData = {};
        (billRes.data || []).forEach(b => {
          const rawNum = String(b.tableNumber || b.table || "");
          const normNum = rawNum.replace(/^[TGRP]/, "");
          const key = normNum || rawNum;
          if (!occData[key] && !occData[rawNum] && key) {
            occData[key] = {
              amount: Number(b.total) || 0,
              captain: b.waiter_name || b.waiter || b.captain || "RECEPTION",
              guests: b.guestCount || b.pax || 0,
              orderId: b.id,
              rawNumber: rawNum,
              normNumber: normNum,
            };
          }
        });

        // Also flag tables as occupied if they have active kitchen orders
        const kotByTable = {};
        const kotHistoryFromApi = [];
        const menuPrices = {};
        (menuRes.data || []).forEach(m => {
          menuPrices[String(m.name || "").toLowerCase()] = Number(m.price || m.effectivePrice || 0);
        });

        (kotRes.data || []).forEach(k => {
          const rawNum = String(k.table_number || "");
          // Normalize key so T1, G1, R1, P1 all match table "1"
          const normNum = rawNum.replace(/^[TGRP]/, "");
          kotByTable[normNum] = kotByTable[normNum] || [];
          kotByTable[rawNum] = kotByTable[rawNum] || [];

          const parsedItems = (() => {
            try {
              const arr = JSON.parse(k.items || "[]");
              return arr.map(it => ({
                ...it,
                price: menuPrices[String(it.name || "").toLowerCase()] || 0,
              }));
            } catch { return []; }
          })();

          const kotEntry = {
            id: k.id,
            kotNo: k.kot_no,
            table: rawNum,
            normNumber: normNum,
            timestamp: k.created_at,
            items: parsedItems,
          };
          kotByTable[normNum].push(kotEntry);
          kotHistoryFromApi.push(kotEntry);
        });

        // Merge KOT totals into occData for display
        Object.keys(kotByTable).forEach(rawNum => {
          const normNum = rawNum.replace(/^[TGRP]/, "");
          const key = occData[rawNum] ? rawNum : normNum;
          if (!occData[key] && kotByTable[rawNum]) {
            const allItems = kotByTable[rawNum].flatMap(k => k.items);
            const total = allItems.reduce((s, it) => s + (Number(it.price || 0) * Number(it.quantity || 0)), 0);
            occData[key] = {
              amount: total,
              captain: "RECEPTION",
              guests: 1,
              orderId: null,
              rawNumber: rawNum,
              normNumber: normNum,
            };
          }
        });

        // Update kotHistory so KOT modal shows real data
        if (kotHistoryFromApi.length > 0) {
          setKotHistory(kotHistoryFromApi);
        }

        // Update occData amounts to be the running KOT total (all items × price) for tables with KOTs
        Object.keys(kotByTable).forEach(normNum => {
          if (!occData[normNum]) return;
          const allItems = kotByTable[normNum].flatMap(k => k.items || []);
          const kotTotal = allItems.reduce((s, it) => s + (it.price || 0) * (it.quantity || 0), 0);
          occData[normNum].amount = kotTotal;
        });

        setOccupiedTableData(occData);

        setInvoiceGroups((billRes.data || []).map(b => ({
          id: b.id,
          invoiceNo: b.id,
          table: b.tableNumber || b.table,
          amount: b.total,
          gst: b.gst || 0,
          discountAmount: b.discount || 0,
          entityType: b.entityType || b.entity_type || 'Table',
          status: b.invoiceStatus,
          date: b.created_at,
        })));

        if (usersRes.data) {
          setCaptains(usersRes.data.filter(u => u.role === "Waiter" || u.role === "waiter"));
        }
      } catch (err) {
        console.error("Error loading POS data:", err);
      }
    })();
  }, []);

  const fetchTables = async () => {
    try {
      const res = await API.get("/restaurant/tables");
      if (res.data) setTables(res.data);
    } catch (err) {
      console.error("Error fetching tables:", err);
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

  const filteredMenuItems = menuItems.filter(item => {
    const catMatch = selectedCategory === "All" || !selectedCategory || item.category === selectedCategory;
    const searchMatch = !searchTerm || item.name.toLowerCase().includes(searchTerm.toLowerCase());
    return catMatch && searchMatch;
  });

  const filteredTables = tables.filter(table => {
    const sectionValue = inferTableSection(table).toLowerCase();
    const sectionMatch = sectionValue === selectedSection.toLowerCase() || sectionValue.includes(selectedSection.toLowerCase());
    const tableNum = String(table.number || table.tableNumber || "");
    const searchMatch = !searchTerm || tableNum.includes(searchTerm.trim());
    return sectionMatch && searchMatch;
  });

  const getTableKey = (table) => `${table.id || ''}-${normalizeTableNumber(table.number || table.tableNumber || table.table_no || String(table.id || ''))}`;

  const handleTableClick = (table) => setSelectedTable(table);

  const handleCreateTable = async () => {
    const newTableNumber = normalizeTableNumber(searchTerm);
    if (!newTableNumber) { alert("Enter a table number"); return; }
    const exists = tables.some(t => normalizeTableNumber(t.number || t.tableNumber) === newTableNumber);
    if (exists) { alert("Table already exists"); return; }
    try {
      const res = await API.post("/restaurant/tables", { number: newTableNumber, sectionName: selectedSection, seatCount: 4 });
      if (res.data && res.data.id) {
        setTables(prev => [...prev, { id: res.data.id, number: normalizeTableNumber(res.data.number || newTableNumber), status: "Available", section: selectedSection.toLowerCase() }]);
        setSearchTerm("");
      }
    } catch (err) {
      console.error("Error creating table:", err);
      alert(err.response?.data?.message || "Error creating table");
    }
  };

  const openEditTable = (table) => {
    setEditingTable({
      id: table.id,
      number: normalizeTableNumber(table.number || table.tableNumber || ""),
      sectionName: String(table.sectionName || table.section || table.area || selectedSection || "").trim(),
      floorName: String(table.floorName || table.floor || "").trim(),
      seatCount: Number(table.seatCount || table.seat_count || 4),
      status: String(table.status || "available"),
      statusColor: String(table.statusColor || table.status_color || "").trim(),
    });
  };

  const handleSaveTableEdit = async () => {
    if (!editingTable) return;
    const tableNumber = normalizeTableNumber(editingTable.number || "");
    if (!tableNumber) {
      alert("Table number is required");
      return;
    }
    try {
      await API.put(`/restaurant/tables/${editingTable.id}`, {
        number: tableNumber,
        sectionName: String(editingTable.sectionName || "").trim() || null,
        floorName: String(editingTable.floorName || "").trim() || null,
        seatCount: Number(editingTable.seatCount || 4),
        status: String(editingTable.status || "available").trim() || "available",
        statusColor: String(editingTable.statusColor || "").trim() || null,
      });
      await fetchTables();
      setEditingTable(null);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update table");
    }
  };

  const getCurrentTableKey = () => (orderType === "DINE_IN" && selectedTable ? getTableKey(selectedTable) : "");

  const getCurrentTableData = () => {
    const tableKey = getCurrentTableKey();
    return tableKey ? (tableOrderData[tableKey] || {}) : {};
  };

  const setCurrentDineInField = (field, value) => {
    const tableKey = getCurrentTableKey();
    if (!tableKey) return;
    setTableOrderData(prev => ({
      ...prev,
      [tableKey]: {
        ...(prev[tableKey] || {}),
        [field]: value,
      },
    }));
  };

  const getCurrentOrderItems = () => {
    if (orderType === "DINE_IN") {
      const tableKey = getCurrentTableKey();
      return tableKey ? (tableOrderData[tableKey]?.items || []) : [];
    }
    return orderTypeData[orderType]?.items || [];
  };

  const setCurrentOrderItems = (items) => {
    if (orderType === "DINE_IN") {
      const tableKey = getCurrentTableKey();
      if (!tableKey) return;
      setTableOrderData(prev => ({
        ...prev,
        [tableKey]: { ...(prev[tableKey] || {}), items },
      }));
      return;
    }
    setOrderTypeData(prev => ({ ...prev, [orderType]: { ...prev[orderType], items } }));
  };

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

  const clearCurrentTableKots = () => {
    if (!selectedTable) return;
    const tableNumber = String(selectedTable.number || selectedTable.tableNumber || "");
    if (!tableNumber) return;
    setKotHistory(prev => prev.filter(k => String(k.table || "") !== tableNumber));
  };

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
      } catch {
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
    return handleSaveBillInternal(false);
  };

  const handleSaveBillAndSendWhatsApp = async () => {
    return handleSaveBillInternal(true);
  };

  const handleSaveBillInternal = async (sendToWhatsApp = false) => {
    const currentItems = getCurrentOrderItems();
    if (!currentItems.length) return alert("Add items first");
    if (orderType === "DINE_IN" && !selectedTable) { alert("Select a table first"); return; }
    const subtotal = calculateTotal();
    const tax = calculateTax();
    const total = calculateGrandTotal();
    const currentTableData = getCurrentTableData();
    const customerName = orderType === "DINE_IN" ? (currentTableData.customerName || "") : (orderTypeData[orderType]?.customerName || "");
    const phone = orderType === "DINE_IN" ? (currentTableData.phone || "") : (orderTypeData[orderType]?.phone || "");

    if (!customerName.trim() || !phone.trim()) {
      alert("Customer name and phone number are required before generating the bill.");
      return;
    }

    const billData = {
      table: orderType === "DINE_IN" ? selectedTable.number : orderType,
      tableNumber: orderType === "DINE_IN" ? selectedTable.number : orderType,
      subtotal, gst: tax, total,
      paymentMethod: "Cash",
      orderType: orderType,
      items: currentItems.map(i => ({ name: i.name, price: i.price, quantity: i.quantity, amount: i.price * i.quantity })),
      customerName,
      phone,
      forceSendWhatsApp: sendToWhatsApp,
    };
    setLoading(true);
    try {
      const res = await API.post("/restaurant/bill", billData);
      const didSendWhatsApp = !!res.data?.whatsapp && res.data.whatsapp.status !== "skipped" && res.data.whatsapp.status !== "error";
      alert(`Bill Generated${didSendWhatsApp ? ' and sent to WhatsApp' : ''}!\n\nType: ${orderType.replace('_', '+')}\nTotal: ₹${total.toFixed(2)}\nInvoice# ${res.data?.id || "N/A"}`);
      setCurrentOrderItems([]);
      if (orderType === "DINE_IN") {
        clearCurrentTableKots();
        const tableKey = getCurrentTableKey();
        if (tableKey) {
          setTableOrderData(prev => {
            const next = { ...prev };
            delete next[tableKey];
            return next;
          });
        }
        setSelectedTable(null);
        setTables(prev => prev.map(t => t.id === selectedTable?.id ? { ...t, status: "Available" } : t));
      }
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
      if (orderType === "DINE_IN" && selectedTable) {
        const tableKey = getCurrentTableKey();
        if (tableKey) {
          setTableOrderData(prev => {
            const next = { ...prev };
            delete next[tableKey];
            return next;
          });
        }
        setTables(prev => prev.map(t => t.id === selectedTable.id ? { ...t, status: "Available" } : t));
      }
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
      if (orderType === "DINE_IN") {
        clearCurrentTableKots();
        setSelectedTable(null);
      }
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

  const openAddMenuItem = () => setEditingMenuItem({
    id: null,
    name: "",
    category: "",
    price: "",
    foodType: "Veg",
    status: "Available",
  });

  const openEditMenuItem = (item) => setEditingMenuItem({
    id: item.id,
    name: item.name || "",
    category: item.category || "",
    price: String(item.price ?? item.effectivePrice ?? item.effective_price ?? ""),
    foodType: item.foodType || item.food_type || "Veg",
    status: item.status || "Available",
  });

  const handleSaveMenuItem = async () => {
    if (!editingMenuItem) return;
    const name = String(editingMenuItem.name || "").trim();
    const category = String(editingMenuItem.category || "").trim();
    const price = Number(editingMenuItem.price || 0);
    if (!name) return alert("Item name is required");
    if (!category) return alert("Category is required");
    if (!price || price < 0) return alert("Valid price is required");

    const payload = {
      name,
      category,
      price,
      foodType: editingMenuItem.foodType || "Veg",
      food_type: editingMenuItem.foodType || "Veg",
      status: editingMenuItem.status || "Available",
    };

    try {
      if (editingMenuItem.id) {
        await API.put(`/restaurant/menu/${editingMenuItem.id}`, payload);
        setMenuItems((prev) => prev.map((m) => m.id === editingMenuItem.id ? { ...m, ...payload } : m));
      } else {
        const res = await API.post("/restaurant/menu", payload);
        const created = res.data && (res.data.item || res.data);
        const newItem = { id: created.id || Date.now(), ...payload };
        setMenuItems((prev) => [...prev, newItem]);
      }
      setEditingMenuItem(null);
    } catch (err) {
      console.error("Save menu item failed:", err);
      alert(err.response?.data?.message || "Failed to save item");
    }
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

      {/* ORDER TYPE BAR — hidden while an inside-table order is open */}
      {!(activeTab === "pos" && orderType === "DINE_IN" && selectedTable) && (
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
      )}

      {/* === NEW ORDER — INSIDE TABLE VIEW === */}
      {activeTab === "pos" && orderType === "DINE_IN" && selectedTable && (
        <div className="pos-inside">
          {/* Top info row replaces order-type + section bars */}
          <div className="pos-inside-toprow">
            <div className="pos-inside-info">
              <strong>Table No</strong>
              <span>{String(selectedTable.number || "").toUpperCase()}</span>
            </div>
            <div className="pos-inside-info">
              <strong>PAX</strong>
              <span>{getCurrentTableData().pax || 1}</span>
            </div>
            <div className="pos-inside-info">
              <strong>Date</strong>
              <span>{new Date().toLocaleString("en-IN", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}</span>
            </div>
            <select
              className="pos-inside-reception"
              value={getCurrentTableData().captain || "RECEPTION"}
              onChange={(e) => setCurrentDineInField("captain", e.target.value)}
            >
              <option value="RECEPTION">RECEPTION</option>
              {captains.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <input
              className="pos-inside-search"
              placeholder="Search Item"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <input className="pos-inside-search" placeholder="Search By Code" />
            <input className="pos-inside-qty" value={getCurrentTableData().qty || 1} onChange={(e) => setCurrentDineInField("qty", e.target.value)} />
            <button className="pos-inside-add-icon" title="Add item with this qty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
              </svg>
            </button>
            <button
              className="pos-inside-close"
              title="Back to table grid"
              onClick={() => setSelectedTable(null)}
            >✕</button>
          </div>

          {/* Body grid: order table+numpad | category list | items grid */}
          <div className="pos-inside-body">
            {/* LEFT */}
            <div className="pos-inside-left">
              <div className="pos-inside-order-wrap">
                <table className="pos-inside-order-table">
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}>#</th>
                      <th>Item Name</th>
                      <th>Modifier</th>
                      <th style={{ width: 110 }}>Quantity</th>
                      <th style={{ width: 90 }}>Rate</th>
                      <th style={{ width: 90 }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getCurrentOrderItems().length === 0 ? (
                      <tr>
                        <td colSpan={6} className="pos-inside-empty">
                          <div>No item selected</div>
                          <div style={{ fontSize: 11, color: "#9aa3ad", marginTop: 4 }}>please select item from Menu</div>
                        </td>
                      </tr>
                    ) : (
                      getCurrentOrderItems().map((item, idx) => (
                        <tr key={item.id}>
                          <td>{idx + 1}</td>
                          <td>{item.name}</td>
                          <td>—</td>
                          <td>
                            <button className="qty-btn" onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}>−</button>
                            <span className="qty-display">{item.quantity}</span>
                            <button className="qty-btn" onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}>+</button>
                          </td>
                          <td>₹{item.price.toFixed(2)}</td>
                          <td>
                            ₹{(item.price * item.quantity).toFixed(2)}
                            <span onClick={() => handleRemoveItem(item.id)} style={{ cursor: "pointer", color: "#e74c3c", marginLeft: 6, fontSize: 11 }}>✕</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="pos-inside-subtotal">
                <span>Total Items: {getCurrentOrderItems().reduce((a, i) => a + i.quantity, 0)}</span>
                <span>Sub Total: ₹{calculateTotal().toFixed(2)}</span>
              </div>

              <div className="pos-numpad">
                <button className="np-num">7</button>
                <button className="np-num">8</button>
                <button className="np-num">9</button>
                <button className="np-blank" />
                <button className="np-gray">Qty</button>
                <button className="np-red" onClick={handleSaveBill} disabled={loading}>Save KOT</button>

                <button className="np-num">4</button>
                <button className="np-num">5</button>
                <button className="np-num">6</button>
                <button className="np-gray" onClick={handleClearOrder}>Clear</button>
                <button className="np-gray">Item</button>
                <button className="np-yellow" onClick={handlePrintKOT} disabled={loading}>Print KOT</button>

                <button className="np-num">1</button>
                <button className="np-num">2</button>
                <button className="np-num">3</button>
                <button className="np-gray" title="Backspace">⌫</button>
                <button className="np-gray">Captain</button>
                <button className="np-green" onClick={() => setSelectedTable(null)}>New Order</button>

                <button className="np-num">0</button>
                <button className="np-num">-</button>
                <button className="np-num">.</button>
                <button className="np-gray">PAX</button>
                <button className="np-gray">Rate</button>
                <button className="np-gray">Guest</button>
              </div>
            </div>

            {/* MIDDLE: vertical category list */}
            <div className="pos-inside-cats">
              <button
                className={`pos-inside-cat fav ${selectedCategory === "All" ? "selected" : ""}`}
                onClick={() => setSelectedCategory("All")}
              >
                <span style={{ color: "#fff", marginRight: 6 }}>♥</span> FAVOURITE ITEMS
              </button>
              {categories.filter((c) => c !== "All").map((cat) => (
                <button
                  key={cat}
                  className={`pos-inside-cat ${selectedCategory === cat ? "selected" : ""}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat.toUpperCase()}
                </button>
              ))}
            </div>

            {/* RIGHT: top tabs + search + items grid */}
            <div className="pos-inside-menu">
              <div className="pos-inside-menu-tabs">
                {categories.filter((c) => c !== "All").slice(0, 3).map((cat) => (
                  <button
                    key={cat}
                    className={`pos-inside-menu-tab ${selectedCategory === cat ? "active" : ""}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    <span className="dots">≡</span> {cat.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="pos-inside-menu-searchbar">
                <input
                  placeholder="Type 3 characters to search items"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button className="pos-inside-menu-add" title="Add new item">+</button>
              </div>
              <div className="pos-inside-menu-grid">
                {filteredMenuItems.map((item) => (
                  <button
                    key={item.id}
                    className="pos-inside-item-card"
                    onClick={() => handleAddToOrder(item)}
                    disabled={item.status === "Not Available"}
                  >
                    <span className="dot" />
                    <div className="item-name">{item.name}</div>
                    <div className="item-price">₹ {Number(item.effectivePrice || item.effective_price || item.price || 0).toFixed(2)}</div>
                  </button>
                ))}
                <button className="pos-inside-item-card open-item" onClick={() => alert("Open item — TODO")}>
                  <div className="open-item-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                      <rect x="3" y="6" width="18" height="14" rx="1" />
                      <path d="M3 10h18" />
                    </svg>
                    <span>OPEN ITEM</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === NEW ORDER === fallback layout when no inside-table view is open */}
      {activeTab === "pos" && !(orderType === "DINE_IN" && selectedTable) && (
        <div className={`pos-content ${orderType === "DINE_IN" && !selectedTable ? "pos-content--tables-only" : ""}`}>
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
            {selectedTable && (
              <div style={{ padding: '10px', borderBottom: '1px solid #eee', background: '#fafafa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#333' }}>
                    Table {selectedTable.number}
                  </div>
                  <button
                    onClick={() => setSelectedTable(null)}
                    style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: '14px', padding: 0 }}
                    title="Back to tables"
                  >
                    ✕
                  </button>
                </div>
                <input
                  placeholder="Customer Name"
                  value={getCurrentTableData().customerName || ""}
                  onChange={e => setCurrentDineInField("customerName", e.target.value)}
                  style={{ width: '100%', border: '1px solid #ccc', padding: '4px 6px', fontSize: '11px', borderRadius: '3px', marginBottom: '6px' }}
                />
                <input
                  placeholder="Phone"
                  value={getCurrentTableData().phone || ""}
                  onChange={e => setCurrentDineInField("phone", e.target.value)}
                  style={{ width: '100%', border: '1px solid #ccc', padding: '4px 6px', fontSize: '11px', borderRadius: '3px' }}
                />
              </div>
            )}
            <div className="pos-table-grid">
              {filteredTables.map(table => {
                const sel = selectedTable?.id === table.id;
                const occ = table.status === "Occupied";
                const occData = occupiedTableData[String(table.number || table.tableNumber || "")];
                const tableLabel = String(table.number || table.tableNumber || "").toUpperCase();
                const stop = (e) => e.stopPropagation();
                return (
                  <div
                    key={getTableKey(table)}
                    className={`table-card ${occ ? 'occupied' : ''} ${sel ? 'selected' : ''}`}
                    onClick={() => handleTableClick(table)}
                  >
                    <div className="table-card-top">
                      <span className="table-num">{tableLabel}</span>
                      {occ && occData ? (
                        <>
                          <div className="table-card-runinfo">
                            <span className="reception">{occ.captain || 'RECEPTION'}</span>
                            <span className="amount">{formatAmount(occ.amount)}</span>
                          </div>
                          <span className="table-guest-pill">{occ.guests || 1}</span>
                        </>
                      ) : null}
                    </div>
                    <div className="table-card-bottom">
                      <button
                        className="table-card-icon-btn"
                        title="Add order"
                        onClick={(e) => { stop(e); handleTableClick(table); }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square">
                          <rect x="4" y="4" width="16" height="16" />
                          <line x1="12" y1="8" x2="12" y2="16" />
                          <line x1="8" y1="12" x2="16" y2="12" />
                        </svg>
                      </button>
                      {occ && (
                        <>
                          <button
                            className="table-card-icon-btn"
                            title="Invoice"
                            onClick={(e) => { stop(e); setKotDetailsTable(table); }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M6 2h12v20l-3-2-3 2-3-2-3 2z" />
                              <line x1="9" y1="8" x2="15" y2="8" />
                              <line x1="9" y1="12" x2="15" y2="12" />
                              <line x1="9" y1="16" x2="13" y2="16" />
                            </svg>
                          </button>
                          <button
                            className="table-card-icon-btn"
                            title="KOT list"
                            onClick={(e) => { stop(e); setKotDetailsTable(table); }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                              <line x1="4" y1="7" x2="20" y2="7" />
                              <line x1="4" y1="12" x2="20" y2="12" />
                              <line x1="4" y1="17" x2="20" y2="17" />
                            </svg>
                          </button>
                        </>
                      )}
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
                <button className="action-btn blue" onClick={handleSaveBillAndSendWhatsApp} disabled={loading}>Bill + WhatsApp</button>
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
            {(() => {
              const totalSales = invoiceGroups.reduce((s, inv) => s + Number(inv.amount || 0), 0);
              const totalTax = invoiceGroups.reduce((s, inv) => s + Number(inv.gst || 0), 0);
              const totalDiscount = invoiceGroups.reduce((s, inv) => s + Number(inv.discountAmount || 0), 0);
              const counterSale = invoiceGroups.filter(inv => inv.entityType === 'Quick' || inv.entityType === 'Counter').reduce((s, inv) => s + Number(inv.amount || 0), 0);
              const parcelCharges = invoiceGroups.filter(inv => inv.entityType === 'Parcel' || inv.entityType === 'PARCEL').reduce((s, inv) => s + Number(inv.amount || 0), 0);

              const kpis = [
                { label: 'Table Sale', value: `₹ ${totalSales.toFixed(2)}`, sub: `Invoices: ${invoiceGroups.length}` },
                { label: 'Counter Sale', value: `₹ ${counterSale.toFixed(2)}`, sub: 'Unsettled: 0' },
                { label: 'Parcel Charges', value: `₹ ${parcelCharges.toFixed(2)}`, sub: ' ' },
                { label: 'Total Tax', value: `₹ ${totalTax.toFixed(2)}`, sub: 'CGST + SGST' },
                { label: 'Total Discount', value: `₹ ${totalDiscount.toFixed(2)}`, sub: ' ' },
              ];

              return kpis.map((kpi, i) => (
                <div key={i} className="pos-kpi-card">
                  <div className="pos-kpi-label">{kpi.label}</div>
                  <div className="pos-kpi-value">{kpi.value}</div>
                  <div className="pos-kpi-sub">{kpi.sub}</div>
                </div>
              ));
            })()}
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
                        <tr key={getTableKey(t)}><td>{t.number}</td><td>0</td><td>₹ 0</td></tr>
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
            <div style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
              <div style={{ marginBottom: '6px' }}>
                <input
                  placeholder="Customer Name"
                  value={orderTypeData[orderType]?.customerName || ""}
                  onChange={e => setOrderTypeData(prev => ({ ...prev, [orderType]: { ...prev[orderType], customerName: e.target.value } }))}
                  style={{ width: '100%', border: '1px solid #ccc', padding: '6px', fontSize: '12px', borderRadius: '4px' }}
                />
              </div>
              <div>
                <input
                  placeholder="Phone"
                  value={orderTypeData[orderType]?.phone || ""}
                  onChange={e => setOrderTypeData(prev => ({ ...prev, [orderType]: { ...prev[orderType], phone: e.target.value } }))}
                  style={{ width: '100%', border: '1px solid #ccc', padding: '6px', fontSize: '12px', borderRadius: '4px' }}
                />
              </div>
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
              <button className="simple-btn simple-btn-primary" onClick={openAddMenuItem}>+ Add Item</button>
            </div>
            <table className="simple-table">
              <thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {menuItems.map(item => (
                  <tr key={item.id}>
                    <td className="font-medium">{item.name}</td>
                    <td>{item.category || '-'}</td>
                    <td>₹{item.price}</td>
                    <td><span className={`simple-badge ${item.foodType === "Veg" || item.food_type === "Veg" ? "badge-green" : "badge-red"}`}>{item.foodType || item.food_type || "Veg"}</span></td>
                    <td><span className={`simple-badge ${item.status === "Available" ? "badge-green" : "badge-orange"}`}>{item.status || "Available"}</span></td>
                    <td>
                      <button className="simple-btn simple-btn-outline simple-btn-sm" style={{ marginRight: '5px' }} onClick={() => openEditMenuItem(item)}>Edit</button>
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

      {kotDetailsTable && (() => {
        const tableNo = String(kotDetailsTable.number || kotDetailsTable.tableNumber || "");
        const kotsForTable = kotHistory.filter((k) => String(k.table || "") === tableNo);
        const fmtTs = (ts) => {
          const d = ts ? new Date(ts) : new Date();
          return d.toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }).replace(",", "");
        };
        const closeModal = () => setKotDetailsTable(null);
        const handleGenerateBillFromModal = () => {
          setSelectedTable(kotDetailsTable);
          closeModal();
          // give state a tick to update before triggering bill flow
          setTimeout(() => handleSaveBill(), 100);
        };
        const handleNewKotFromModal = () => {
          setSelectedTable(kotDetailsTable);
          closeModal();
        };
        return (
          <div className="kot-modal-overlay" onClick={closeModal}>
            <div className="kot-modal" onClick={(e) => e.stopPropagation()}>
              <div className="kot-modal-head">
                <span>KOT Details - Table No. {tableNo.toUpperCase()}</span>
                <button className="kot-modal-close" onClick={closeModal}>✕</button>
              </div>

              <div className="kot-modal-body">
                {kotsForTable.length === 0 ? (
                  <div className="kot-modal-empty">No KOT printed for this table yet.</div>
                ) : (
                  kotsForTable.map((kot, idx) => {
                    const totalItems = (kot.items || []).length;
                    return (
                      <div key={kot.id || idx} className="kot-modal-card">
                        <div className="kot-modal-card-head">
                          <span className="kot-modal-card-title">
                            KOT/{kot.kotNo ? String(kot.kotNo).replace(/^KOT-?/i, "") : (idx + 65)} - {fmtTs(kot.timestamp)}
                          </span>
                          <div className="kot-modal-card-actions">
                            <button className="kot-modal-btn kot-modal-btn--void">⊘ Void Items</button>
                            <button className="kot-modal-btn kot-modal-btn--transfer">↔ Transfer KOT</button>
                          </div>
                        </div>
                        <table className="kot-modal-items-table">
                          <thead>
                            <tr>
                              <th style={{ width: 60 }}>SL No</th>
                              <th>Item Name</th>
                              <th style={{ width: 110, textAlign: "right" }}>Quantity</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(kot.items || []).map((it, i) => (
                              <tr key={i}>
                                <td>{i + 1}</td>
                                <td>{it.name}</td>
                                <td style={{ textAlign: "right" }}>{Number(it.quantity || 0).toFixed(3)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="kot-modal-card-foot">Total Items: {totalItems}</div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="kot-modal-foot">
                <button className="kot-modal-btn kot-modal-btn--bill" onClick={handleGenerateBillFromModal}>Generate Bill</button>
                <button className="kot-modal-btn kot-modal-btn--newkot" onClick={handleNewKotFromModal}>New KOT</button>
              </div>
            </div>
          </div>
        );
      })()}

      {editingMenuItem && (
        <div className="modal-overlay" onClick={() => setEditingMenuItem(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-title">{editingMenuItem.id ? "Edit Menu Item" : "Add Menu Item"}</div>
            <div className="simple-form-group">
              <label className="simple-label">Item Name *</label>
              <input
                className="simple-input"
                value={editingMenuItem.name}
                onChange={(e) => setEditingMenuItem((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Cold Coffee"
                autoFocus
              />
            </div>
            <div className="simple-form-group">
              <label className="simple-label">Category *</label>
              <input
                className="simple-input"
                value={editingMenuItem.category}
                onChange={(e) => setEditingMenuItem((p) => ({ ...p, category: e.target.value }))}
                list="menu-category-options"
                placeholder="e.g. Beverages (type new to create)"
              />
              <datalist id="menu-category-options">
                {categories.filter((c) => c !== "All").map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="simple-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="simple-form-group">
                <label className="simple-label">Price (₹) *</label>
                <input
                  type="number"
                  className="simple-input"
                  value={editingMenuItem.price}
                  onChange={(e) => setEditingMenuItem((p) => ({ ...p, price: e.target.value }))}
                  min={0}
                  step="0.01"
                />
              </div>
              <div className="simple-form-group">
                <label className="simple-label">Food Type</label>
                <select
                  className="simple-input"
                  value={editingMenuItem.foodType}
                  onChange={(e) => setEditingMenuItem((p) => ({ ...p, foodType: e.target.value }))}
                >
                  <option value="Veg">Veg</option>
                  <option value="Non Veg">Non Veg</option>
                  <option value="Egg">Egg</option>
                </select>
              </div>
            </div>
            <div className="simple-form-group">
              <label className="simple-label">Status</label>
              <select
                className="simple-input"
                value={editingMenuItem.status}
                onChange={(e) => setEditingMenuItem((p) => ({ ...p, status: e.target.value }))}
              >
                <option value="Available">Available</option>
                <option value="Out of Stock">Out of Stock</option>
              </select>
            </div>
            <div className="modal-actions" style={{ justifyContent: "flex-end" }}>
              <button className="simple-btn simple-btn-gray" onClick={() => setEditingMenuItem(null)}>Cancel</button>
              <button className="simple-btn simple-btn-primary" onClick={handleSaveMenuItem}>{editingMenuItem.id ? "Save" : "Add"}</button>
            </div>
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
                  <tr key={getTableKey(table)}>
                    <td className="font-medium">{table.number}</td>
                    <td>{table.sectionName || table.section || '-'}</td>
                    <td>{table.seatCount || 4}</td>
                    <td><span className={`simple-badge ${table.status === "Available" ? "badge-green" : "badge-orange"}`}>{table.status || "Available"}</span></td>
                    <td><button className="simple-btn simple-btn-gray simple-btn-sm" onClick={() => handleDeleteTable(table.id)}>Delete</button></td>
                    <td><button className="simple-btn simple-btn-outline simple-btn-sm" onClick={() => openEditTable(table)}>Edit</button></td>
                  </tr>
                ))}
                {tables.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center', color: '#999', padding: '20px' }}>No tables found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editingTable && (
        <div className="modal-overlay" onClick={() => setEditingTable(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-title">Edit Table</div>
            <div className="simple-form-group">
              <label className="simple-label">Table / Room Number</label>
              <input
                className="simple-input"
                value={editingTable.number || ""}
                onChange={(e) => setEditingTable((prev) => ({ ...prev, number: e.target.value }))}
                placeholder="T1 or 101"
              />
            </div>
            <div className="simple-form-group">
              <label className="simple-label">Section Name</label>
              <input
                className="simple-input"
                value={editingTable.sectionName || ""}
                onChange={(e) => setEditingTable((prev) => ({ ...prev, sectionName: e.target.value }))}
                placeholder="RESTAURANT / GARDEN / ROOM DINING"
              />
            </div>
            <div className="simple-form-group">
              <label className="simple-label">Seats</label>
              <input
                type="number"
                className="simple-input"
                value={editingTable.seatCount || 4}
                onChange={(e) => setEditingTable((prev) => ({ ...prev, seatCount: e.target.value }))}
              />
            </div>
            <div className="simple-form-group">
              <label className="simple-label">Status</label>
              <select
                className="simple-input"
                value={editingTable.status || "available"}
                onChange={(e) => setEditingTable((prev) => ({ ...prev, status: e.target.value }))}
              >
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
                <option value="reserved">Reserved</option>
              </select>
            </div>
            <div className="simple-form-group">
              <label className="simple-label">Floor Name</label>
              <input
                className="simple-input"
                value={editingTable.floorName || ""}
                onChange={(e) => setEditingTable((prev) => ({ ...prev, floorName: e.target.value }))}
                placeholder="Ground Floor"
              />
            </div>
            <div className="modal-actions" style={{ justifyContent: "flex-end" }}>
              <button className="simple-btn simple-btn-gray" onClick={() => setEditingTable(null)}>Cancel</button>
              <button className="simple-btn simple-btn-primary" onClick={handleSaveTableEdit}>Save</button>
            </div>
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