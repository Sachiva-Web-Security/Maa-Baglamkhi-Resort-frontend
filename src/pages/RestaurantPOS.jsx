import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import API from "../api";
import RestaurantBillModal from "../components/Restaurant/RestaurantBillModal";
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
  const [showSaveCustomerModal, setShowSaveCustomerModal] = useState(false);
  const [saveCustomerInfo, setSaveCustomerInfo] = useState({
    customerName: "",
    phone: "",
  });
  const [activeTab, setActiveTab] = useState("pos");
  const [orderType, setOrderType] = useState("DINE_IN");
  const [deliveryNewOrder, setDeliveryNewOrder] = useState(false);
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
  const [waiterPerformance, setWaiterPerformance] = useState([]); // waiter performance data
  const [generatedBill, setGeneratedBill] = useState(null); // bill data for bill modal
  const [selectedManageKot, setSelectedManageKot] = useState(null);
  const [selectedSettlement, setSelectedSettlement] = useState(null);
  const [editingItemGroup, setEditingItemGroup] = useState(false);
  const [tableSetupTarget, setTableSetupTarget] = useState(null);
  const [tableSetupPax, setTableSetupPax] = useState(null);
  const [invoiceTable, setInvoiceTable] = useState(null);
  const [occupiedTableData, setOccupiedTableData] = useState({});
  const [tableOrderData, setTableOrderData] = useState({});
  const [orderIdByTable, setOrderIdByTable] = useState({}); // tracks backend order IDs per table
  // Dashboard summary from backend
  const [dashboardSummary, setDashboardSummary] = useState(null);
  // Date filters for reports
  const [dashboardDateFrom, setDashboardDateFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [dashboardDateTo, setDashboardDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [transactionDateFrom, setTransactionDateFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [transactionDateTo, setTransactionDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [settlementDateFrom, setSettlementDateFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [settlementDateTo, setSettlementDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [kotDateFrom, setKotDateFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [kotDateTo, setKotDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  // Filtered data from backend
  const [filteredBills, setFilteredBills] = useState([]);
  const [filteredKots, setFilteredKots] = useState([]);
  const [topSellingItems, setTopSellingItems] = useState([]);

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

  // Tab change effect: refresh data when switching to dashboard, transaction, settlement, or manageKot
  useEffect(() => {
    if (activeTab === "dashboard") {
      fetchDashboardSummary(dashboardDateFrom, dashboardDateTo);
      fetchTopSellingItems(dashboardDateFrom, dashboardDateTo);
    } else if (activeTab === "transaction") {
      fetchFilteredBills(transactionDateFrom, transactionDateTo);
    } else if (activeTab === "manageSettlement") {
      fetchFilteredBills(settlementDateFrom, settlementDateTo);
    } else if (activeTab === "manageKot") {
      fetchFilteredKots(kotDateFrom, kotDateTo);
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Socket.io for real-time kitchen order updates
  useEffect(() => {
    // Initialize socket connection if not already present
    if (!window.socket) {
      // Get the base URL without /api suffix for socket.io connection
      const apiBase = API.defaults.baseURL || '';
      const socketUrl = apiBase.replace(/\/api\/?$/, '') || 'http://localhost:5002';
      window.socket = io(socketUrl, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
      });
    }

    const socket = window.socket;

    const handleKitchenOrderCreated = (data) => {
      // New order from kitchen — add to kotHistory
      setKotHistory(prev => [...prev, {
        id: data.id,
        kotNo: data.kotNo || `KOT-${data.id}`,
        table: data.table || "",
        normNumber: String(data.table || "").replace(/^[TGRP]/, ""),
        timestamp: new Date().toISOString(),
        items: data.items || [],
        status: "Pending",
        waiter_name: data.waiter || "RECEPTION",
      }]);

      // Also update occupiedTableData for this table if it's DINE_IN
      if (data.table && (!data.entityType || data.entityType === "Table")) {
        const normNum = String(data.table || "").replace(/^[TGRP]/, "");
        const total = (data.items || []).reduce((s, it) => s + (Number(it.price || 0) * Number(it.quantity || 0)), 0);
        setOccupiedTableData(prev => ({
          ...prev,
          [normNum]: {
            amount: total,
            captain: data.waiter || "RECEPTION",
            guests: 1,
            orderId: null,
            timestamp: new Date().toISOString(),
            billing: false,
            normNumber: normNum,
          },
        }));
      }
    };

    const handleKitchenOrderUpdated = (data) => {
      // Order status changed — update kotHistory
      setKotHistory(prev => prev.map(k => {
        if (k.id === data.id) {
          return { ...k, status: data.status, items: data.items || k.items };
        }
        return k;
      }));
    };

    const handleKitchenOrderReady = (data) => {
      // Order is ready — optionally show notification
      console.log("Kitchen order ready:", data);
    };

    socket.on("kitchen-order-created", handleKitchenOrderCreated);
    socket.on("kitchen-order-updated", handleKitchenOrderUpdated);
    socket.on("kitchen-order-ready", handleKitchenOrderReady);

    return () => {
      socket.off("kitchen-order-created", handleKitchenOrderCreated);
      socket.off("kitchen-order-updated", handleKitchenOrderUpdated);
      socket.off("kitchen-order-ready", handleKitchenOrderReady);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    (async () => {
      try {
        const [tablesRes, menuRes, billRes, kotRes, usersRes, perfRes, dashboardRes] = await Promise.all([
          API.get("/restaurant/tables"),
          API.get("/restaurant/menu"),
          API.get("/restaurant/bills"),
          API.get("/kitchen/orders").catch(() => ({ data: [] })),
          API.get("/users"),
          API.get("/restaurant/waiter-performance").catch(() => ({ data: [] })),
          API.get("/restaurant/dashboard-summary").catch(() => ({ data: null })),
        ]);

        // Dashboard summary from backend
        if (dashboardRes.data) {
          setDashboardSummary(dashboardRes.data);
        }

        if (perfRes.data) {
          setWaiterPerformance(Array.isArray(perfRes.data) ? perfRes.data : []);
        }

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

        // Build occupiedTableData — keyed by normalized number
        // Source of truth: KOT orders first (tables are occupied once they have KOTs),
        // then bills (tables with completed bills)
        const occData = {};
        const menuPrices = {};
        (menuRes.data || []).forEach(m => {
          menuPrices[String(m.name || "").toLowerCase()] = Number(m.price || m.effectivePrice || 0);
        });

        // --- PHASE 1: Collect all KOT orders per table ---
        const kotByTable = {};  // rawNum -> []
        const kotHistoryFromApi = [];

        (kotRes.data || []).forEach(k => {
          const rawNum = String(k.table_number || "");
          const normNum = rawNum.replace(/^[TGRP]/, "");
          kotByTable[normNum] = kotByTable[normNum] || [];
          kotByTable[rawNum] = kotByTable[rawNum] || [];

          const parsedItems = (() => {
            try {
              const arr = JSON.parse(k.items || "[]");
              return arr.map(it => ({
                ...it,
                price: menuPrices[String(it.name || "").toLowerCase()] || Number(it.price || 0),
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
            status: k.status,
            waiter_name: k.waiter_name,
          };
          kotByTable[normNum].push(kotEntry);
          kotHistoryFromApi.push(kotEntry);
        });

        // Mark tables with active KOTs as occupied FIRST (source of truth)
        Object.keys(kotByTable).forEach(normNum => {
          const allItems = kotByTable[normNum].flatMap(k => k.items || []);
          const total = allItems.reduce((s, it) => s + (Number(it.price || 0) * Number(it.quantity || 0)), 0);
          // Use the first (most recent) KOT's waiter name
          const waiter = kotByTable[normNum][0]?.waiter_name || "RECEPTION";
          const ts = kotByTable[normNum][0]?.timestamp || null;

          occData[normNum] = {
            amount: total,
            captain: waiter,
            guests: 1,
            orderId: null,
            timestamp: ts,
            billing: false,
            rawNumber: null,
            normNumber: normNum,
          };
        });

        // --- PHASE 2: Merge bills on top ---
        // If a table has BOTH KOTs and a bill, the bill takes over (table is in billing state)
        (billRes.data || []).forEach(b => {
          const rawNum = String(b.tableNumber || b.table || "");
          const normNum = rawNum.replace(/^[TGRP]/, "");
          const key = normNum || rawNum;
          if (!key) return;

          occData[key] = {
            amount: Number(b.total) || 0,
            captain: b.waiter_name || b.waiter || b.captain || "RECEPTION",
            guests: b.guestCount || b.pax || 0,
            orderId: b.id,
            timestamp: b.created_at || b.date || null,
            billing: true,
            bill: b,
            rawNumber: rawNum,
            normNumber: normNum,
          };
        });

        // Update KOT totals for tables that also have bills
        Object.keys(kotByTable).forEach(normNum => {
          if (!occData[normNum]) return;
          const allItems = kotByTable[normNum].flatMap(k => k.items || []);
          const kotTotal = allItems.reduce((s, it) => s + (it.price || 0) * (it.quantity || 0), 0);
          // Only update amount if table is NOT in billing state
          if (!occData[normNum].billing) {
            occData[normNum].amount = kotTotal;
          }
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

        if (kotHistoryFromApi.length > 0) {
          setKotHistory(kotHistoryFromApi);
        }

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

  const fetchDashboardSummary = async (fromDate, toDate) => {
    try {
      const params = {};
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      const res = await API.get("/restaurant/dashboard-summary", { params });
      if (res.data) setDashboardSummary(res.data);
    } catch (err) {
      console.error("Error fetching dashboard summary:", err);
    }
  };

  const fetchFilteredBills = async (fromDate, toDate) => {
    try {
      const params = {};
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      const res = await API.get("/restaurant/bills/filtered", { params });
      if (res.data) {
        setFilteredBills(res.data);
        setInvoiceGroups(res.data.map(b => ({
          id: b.id,
          invoiceNo: b.id,
          table: b.tableNumber || b.table,
          amount: b.total,
          gst: b.gst,
          discountAmount: b.discountAmount || b.discount || 0,
          entityType: b.entityType || 'Table',
          status: b.invoiceStatus,
          date: b.created_at,
          customerName: b.customerName,
          phone: b.phone,
          paymentMethod: b.paymentMethod,
          waiter_name: b.waiter_name,
        })));
      }
    } catch (err) {
      console.error("Error fetching filtered bills:", err);
    }
  };

  const fetchFilteredKots = async (fromDate, toDate, tableNumber) => {
    try {
      const params = {};
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      if (tableNumber) params.tableNumber = tableNumber;
      const res = await API.get("/restaurant/kot-history", { params });
      if (res.data) setFilteredKots(res.data);
    } catch (err) {
      console.error("Error fetching KOT history:", err);
    }
  };

  const fetchTopSellingItems = async (fromDate, toDate) => {
    try {
      const params = {};
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      const res = await API.get("/restaurant/top-selling", { params });
      if (res.data) setTopSellingItems(res.data);
    } catch (err) {
      console.error("Error fetching top selling items:", err);
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

  const handleTableClick = async (table) => {
    setSelectedTable(table);
    // Sync order from backend when a table is selected
    if (orderType === "DINE_IN") {
      fetchBackendOrder(table.number);
    }
  };

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
      handleBackendAddOrder(selectedTable.number, item);
    }
  };

  const handleUpdateQuantity = (itemId, quantity, fromKotItem = null) => {
    const currentItems = getCurrentOrderItems();
    if (quantity < 1) {
      setCurrentOrderItems(currentItems.filter(i => i.id !== itemId));
      // Remove from backend if it exists
      if (fromKotItem) {
        const orderId = selectedTable ? orderIdByTable[selectedTable.number] : null;
        if (orderId) deleteBackendOrderItem(orderId, itemId);
      }
      return;
    }
    const updatedItems = currentItems.map(i => i.id === itemId ? { ...i, quantity } : i);
    setCurrentOrderItems(updatedItems);
    // Update backend if table selected
    if (orderType === "DINE_IN" && selectedTable) {
      const orderId = selectedTable ? orderIdByTable[selectedTable.number] : null;
      if (orderId) {
        // Find the backend order item ID
        const backendItem = currentItems.find(i => i.id === itemId);
        if (backendItem && backendItem._orderItemId) {
          updateBackendOrderItem(orderId, backendItem._orderItemId, quantity);
        }
      }
    }
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
    const currentTableData = getCurrentTableData();
    const customerName = orderType === "DINE_IN" ? (currentTableData.customerName || "") : (orderTypeData[orderType]?.customerName || "");
    const phone = orderType === "DINE_IN" ? (currentTableData.phone || "") : (orderTypeData[orderType]?.phone || "");

    if (!customerName.trim() || !phone.trim()) {
      setSaveCustomerInfo({ customerName: customerName.trim(), phone: phone.trim() });
      setShowSaveCustomerModal(true);
      return;
    }

    proceedSaveBill();
  };

  const proceedSaveBill = async () => {
    const customerName = orderType === "DINE_IN" ? (getCurrentTableData().customerName || saveCustomerInfo.customerName) : (orderTypeData[orderType]?.customerName || saveCustomerInfo.customerName);
    const phone = orderType === "DINE_IN" ? (getCurrentTableData().phone || saveCustomerInfo.phone) : (orderTypeData[orderType]?.phone || saveCustomerInfo.phone);

    if (!customerName.trim() || !phone.trim()) {
      alert("Customer name and phone are required.");
      return;
    }

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
      customerName,
      phone,
      forceSendWhatsApp: sendToWhatsApp,
    };
    setLoading(true);
    try {
      const res = await API.post("/restaurant/bill", billData);
      const savedBill = res.data?.bill || {
        id: res.data?.id,
        billNo: res.data?.id,
        tableNumber: billData.table,
        customerName,
        phone,
        subtotal,
        gst: tax,
        total,
        items: billData.items,
        entityType: orderType,
        paymentMethod: "Cash",
        waiter_name: "",
        created_at: new Date().toISOString(),
      };
      setGeneratedBill(savedBill);
      setCurrentOrderItems([]);
      if (orderType === "DINE_IN") {
        const prevTable = selectedTable;
        if (prevTable) {
          const rawNum = String(prevTable.number || prevTable.tableNumber || "").toUpperCase();
          const normNum = rawNum.replace(/^[TGRP]/, "");
          setKotHistory(prev => prev.filter(k => {
            const kRaw = String(k.table || "").toUpperCase();
            const kNorm = kRaw.replace(/^[TGRP]/, "");
            return kRaw !== rawNum && kNorm !== normNum;
          }));
          setOccupiedTableData(prev => ({ ...prev, [normNum]: {
            amount: Number(savedBill.total || total),
            captain: getCurrentTableData().captain || "RECEPTION",
            guests: getCurrentTableData().pax || 1,
            orderId: savedBill.id,
            timestamp: savedBill.created_at || new Date().toISOString(),
            billing: true,
            bill: savedBill,
          }}));
          const tKey = getTableKey(prevTable);
          setTableOrderData(prev => { const n = {...prev}; delete n[tKey]; return n; });
          setTables(prev => prev.map(t => t.id === prevTable?.id ? { ...t, status: "Occupied" } : t));
        }
        setSelectedTable(null);
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
      if (orderType === "DINE_IN" && selectedTable) {
        const rawNum = String(selectedTable.number || selectedTable.tableNumber || "").toUpperCase();
        const normNum = rawNum.replace(/^[TGRP]/, "");
        setKotHistory(prev => prev.filter(k => {
          const kRaw = String(k.table || "").toUpperCase();
          const kNorm = kRaw.replace(/^[TGRP]/, "");
          return kRaw !== rawNum && kNorm !== normNum;
        }));
        setOccupiedTableData(prev => {
          const next = { ...prev };
          delete next[normNum];
          delete next[rawNum];
          return next;
        });
        const tKey = getTableKey(selectedTable);
        setTableOrderData(prev => { const n = {...prev}; delete n[tKey]; return n; });
        setTables(prev => prev.map(t => t.id === selectedTable.id ? { ...t, status: "Available" } : t));
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
    if (type === "DELIVERY") setDeliveryNewOrder(false);
  };

  const handleSaveKOT = async () => {
    const currentItems = getCurrentOrderItems();
    if (!currentItems.length) return alert("Add items first");
    if (!selectedTable) return alert("Select a table first");
    setLoading(true);
    try {
      const kitchenItems = currentItems.map(i => ({ name: i.name, quantity: i.quantity, price: Number(i.price || 0) }));
      let responseData = null;
      try {
        const response = await API.post("/kitchen/order", {
          table: selectedTable.number,
          waiter: getCurrentTableData().captain || "RECEPTION",
          items: kitchenItems,
          entityType: "DINE_IN",
          prepTimeMinutes: 20,
        });
        responseData = response?.data || null;
      } catch (error) {
        console.error("KOT save API failed; retaining local KOT state:", error);
      }
      const savedAt = new Date();
      const newKOT = { id: responseData?.id || Date.now(), kotNo: responseData?.kotNo || `KOT-${Date.now()}`, table: selectedTable.number, captain: getCurrentTableData().captain || "RECEPTION", timestamp: savedAt, items: kitchenItems };
      setKotHistory(prev => [...prev, newKOT]);
      const rawNumber = String(selectedTable.number || selectedTable.tableNumber || "");
      const normalizedNumber = rawNumber.replace(/^[TGRP]/, "");
      setOccupiedTableData(prev => ({ ...prev, [normalizedNumber]: {
        amount: calculateTotal(),
        captain: getCurrentTableData().captain || "RECEPTION",
        guests: getCurrentTableData().pax || 1,
        orderId: responseData?.id || orderIdByTable[selectedTable.number],
        timestamp: savedAt,
        billing: false,
      }}));
      setTables(prev => prev.map(table => table.id === selectedTable.id ? { ...table, status: "Occupied" } : table));
      setSelectedTable(null);
    } finally {
      setLoading(false);
    }
  };

  const openTableSetup = (table) => {
    setTableSetupTarget(table);
    setTableSetupPax(null);
  };

  const finishTableSetup = (captain) => {
    if (!tableSetupTarget || !tableSetupPax) return;
    const tableKey = getTableKey(tableSetupTarget);
    setTableOrderData(prev => ({ ...prev, [tableKey]: { ...(prev[tableKey] || {}), pax: tableSetupPax, captain } }));
    const target = tableSetupTarget;
    setTableSetupTarget(null);
    setTableSetupPax(null);
    handleTableClick(target);
  };

  const openAddMenuItem = () => setEditingMenuItem({
    id: null,
    name: "",
    category: "",
    price: "",
    foodType: "Veg",
    status: "Available",
    itemCode: "",
    shortcutKey: "",
    barcode: "",
    displayName: "",
    unit: "",
    favourite: false,
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

  // ============== ORDER MANAGEMENT ==============

  /** Add a single item to a backend order for this table */
  const handleBackendAddOrder = async (tableNum, item) => {
    try {
      const res = await API.post("/restaurant/order/add", {
        tableNumber: tableNum,
        item: { name: item.name, price: item.price, quantity: item.quantity || 1 },
      });
      if (res.data?.orderId) {
        setOrderIdByTable(prev => ({ ...prev, [tableNum]: res.data.orderId }));
      }
    } catch (err) {
      console.error("Backend add order item failed:", err);
    }
  };

  /** Fetch and sync order data from backend for a given table number */
  const fetchBackendOrder = async (tableNum) => {
    try {
      const [orderRes, itemsRes] = await Promise.all([
        API.get("/restaurant/order", { params: { tableNumber: tableNum } }).catch(() => ({ data: null })),
        API.get(`/restaurant/order/${tableNum}`).catch(() => ({ data: null })),
      ]);

      if (itemsRes.data) {
        const items = (Array.isArray(itemsRes.data) ? itemsRes.data : [itemsRes.data]).map(oi => ({
          id: oi.id,
          name: oi.name,
          price: Number(oi.price || 0),
          quantity: Number(oi.quantity || 1),
          _orderItemId: oi.id,
          _orderId: oi.order_id,
        }));
        if (items.length > 0) {
          setCurrentOrderItems(items);
        }
      }

      if (orderRes.data) {
        // orderRes.data is an array; grab the first pending order
        const pending = Array.isArray(orderRes.data)
          ? orderRes.data.find(o => o.status === "pending")
          : null;
        if (pending) {
          setOrderIdByTable(prev => ({ ...prev, [tableNum]: pending.id }));
          // Also fetch order items using the dedicated /order-items endpoint
          API.get(`/restaurant/order-items/${pending.id}`).then(itemsRes2 => {
            if (itemsRes2.data) {
              const orderedItems = (Array.isArray(itemsRes2.data) ? itemsRes2.data : [itemsRes2.data]).map(oi => ({
                id: oi.id,
                name: oi.name,
                price: Number(oi.price || 0),
                quantity: Number(oi.quantity || 1),
                _orderItemId: oi.id,
                _orderId: oi.order_id,
              }));
              if (orderedItems.length > 0) {
                setCurrentOrderItems(orderedItems);
              }
            }
          }).catch(() => {/* silently ignore */});
        }
      }
    } catch (err) {
      // silently ignore — order may not exist yet
    }
  };

  /** Update quantity on backend order item */
  const updateBackendOrderItem = async (orderId, itemId, qty) => {
    if (!orderId || !itemId) return;
    try {
      await API.put(`/restaurant/order/${orderId}`, {
        items: [{ orderItemId: itemId, quantity: qty }],
      });
    } catch (err) {
      console.error("Backend order update failed:", err);
    }
  };

  /** Remove an item from backend order */
  const deleteBackendOrderItem = async (orderId, itemId) => {
    if (!orderId) return;
    try {
      await API.delete(`/restaurant/order/${orderId}`, { data: { itemId } });
    } catch (err) {
      // Try POST fallback for some implementations
      try {
        await API.post(`/restaurant/order/${orderId}/remove`, { itemId });
      } catch { /* silently ignore */ }
    }
  };

  /** Pay the order / bill from POS */
  const handlePayBill = async (payMethod = "Cash") => {
    const tableNum = orderType === "DINE_IN" && selectedTable ? selectedTable.number : null;
    if (!tableNum) return alert("Select a table first");
    const currentItems = getCurrentOrderItems();
    if (!currentItems.length) return alert("Add items first");
    const total = calculateGrandTotal();
    setLoading(true);
    try {
      await API.post(`/restaurant/bill/${tableNum}/pay`, {
        paymentMethod: payMethod,
        amount: total,
      });
      // Clear local order state
      const tKey = getCurrentTableKey();
      setTableOrderData(prev => { const n = {...prev}; delete n[tKey]; return n; });
      const rawNum = String(selectedTable?.number || "");
      const normNum = rawNum.replace(/^[TGRP]/, "");
      setOccupiedTableData(prev => { const n = {...prev}; delete n[normNum]; delete n[rawNum]; return n; });
      setKotHistory(prev => prev.filter(k => {
        const kRaw = String(k.table || "");
        const kNorm = kRaw.replace(/^[TGRP]/, "");
        return kRaw !== rawNum && kNorm !== normNum;
      }));
      setTables(prev => prev.map(t => t.id === selectedTable?.id ? { ...t, status: "Available" } : t));
      setOrderIdByTable(prev => { const n = {...prev}; delete n[tableNum]; return n; });
      setSelectedTable(null);
      fetchBills();
      alert("Payment successful!");
    } catch (err) {
      console.error("Pay bill error:", err);
      alert(err.response?.data?.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  /** Charge the bill to a room */
  const handleChargeToRoom = async (roomNum) => {
    if (!roomNum) return;
    const tableNum = orderType === "DINE_IN" && selectedTable ? selectedTable.number : null;
    if (!tableNum) return alert("Select a table first");
    const total = calculateGrandTotal();
    setLoading(true);
    try {
      await API.post(`/restaurant/bill/charge-to-room`, {
        roomNumber: roomNum,
        tableNumber: tableNum,
        amount: total,
      });
      alert(`Bill charged to Room ${roomNum}`);
    } catch (err) {
      console.error("Charge to room error:", err);
      alert(err.response?.data?.message || "Failed to charge to room");
    } finally {
      setLoading(false);
    }
  };

  // ============== SPLIT BILL (REAL API) ==============

  const handleSplitBillConfirm = async () => {
    const tableNum = orderType === "DINE_IN" && selectedTable ? selectedTable.number : null;
    const currentItems = getCurrentOrderItems();
    if (!currentItems.length) return alert("Add items first");
    const subtotal = calculateTotal();
    const tax = calculateTax();
    const total = calculateGrandTotal();
    setLoading(true);
    try {
      // Create all split parts
      const perPart = total / splitBillData.parts;
      const promises = Array.from({ length: splitBillData.parts }, (_, i) =>
        API.post("/restaurant/split-bills", {
          tableNumber: tableNum,
          entityType: orderType,
          splitLabel: `Part ${i + 1}`,
          splitNo: i + 1,
          splitCount: splitBillData.parts,
          subtotal,
          gst: tax,
          total: perPart,
          paymentMethod: "Cash",
          items: currentItems.map(it => ({ name: it.name, price: it.price, quantity: it.quantity })),
        })
      );
      await Promise.allSettled(promises);
      alert(`Bill split into ${splitBillData.parts} parts`);
      setShowSplitBill(false);
      setSplitBillData({ parts: 2 });
    } catch (err) {
      console.error("Split bill error:", err);
      // Fall back to modal calculation
      const perPerson = (calculateGrandTotal() / splitBillData.parts).toFixed(2);
      alert(`Bill split into ${splitBillData.parts} parts\nAmount per person: ₹${perPerson}`);
      setShowSplitBill(false);
      setSplitBillData({ parts: 2 });
    } finally {
      setLoading(false);
    }
  };

  // ============== ITEM ACTION REQUESTS (VOID / TRANSFER) ==============

  const handleVoidItem = async (kotId, item) => {
    if (!confirm(`Void item "${item.name}" qty ${item.quantity}?`)) return;
    try {
      await API.post("/restaurant/item-action-requests", {
        tokenItemId: item.id || item._orderItemId || Date.now(),
        tableNumber: kotHistory.find(k => k.id === kotId)?.table || "",
        actionType: "void",
        reason: "Voided from KOT modal",
        requestedBy: localStorage.getItem("name") || "admin",
      });
      alert("Void request submitted.");
    } catch (err) {
      console.error("Void failed:", err);
      alert(err.response?.data?.message || "Failed to void item");
    }
  };

  const handleTransferKot = async (kot) => {
    const newTable = prompt("Enter target table number:");
    if (!newTable) return;
    try {
      await API.post("/restaurant/item-action-requests", {
        tokenItemId: kot.id,
        tableNumber: kot.table,
        actionType: "transfer",
        reason: `Transferred to table ${newTable}`,
        requestedBy: localStorage.getItem("name") || "admin",
      });
      alert(`Transfer request for KOT ${kot.kotNo} to Table ${newTable} submitted.`);
    } catch (err) {
      console.error("Transfer failed:", err);
      alert(err.response?.data?.message || "Failed to transfer KOT");
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
            <span className="pos-logo-icon">M</span>
            <span>Maa Baglamukhi</span>
          </button>
          <button className={`pos-tab ${activeTab === "dashboard" ? "active" : ""}`} onClick={() => setActiveTab("dashboard")}>Dashboard</button>
          <button className={`pos-tab ${activeTab === "pos" ? "active-green" : ""}`} onClick={() => setActiveTab("pos")}>New Order</button>
          <button className={`pos-tab ${activeTab === "quick" ? "active" : ""}`} onClick={() => setActiveTab("quick")}>Quick Bill</button>
          <button className={`pos-tab ${activeTab === "kds" ? "active" : ""}`} onClick={() => setActiveTab("kds")}>KDS</button>
          <button className={`pos-tab ${activeTab === "transaction" ? "active" : ""}`} onClick={() => setActiveTab("transaction")}>Daily Transaction</button>
          <div className="pos-nav-dropdown">
            <button className="pos-tab">Manage⌄</button>
            <div className="pos-nav-menu">
              {["Manage KOT", "Manage Invoice", "Edit Invoice", "Manage Settlement"].map((item) => (
                <button key={item} onClick={() => {
                  if (item === "Manage KOT") { setSelectedManageKot(null); setActiveTab("manageKot"); }
                  else if (item === "Manage Settlement") { setSelectedSettlement(null); setActiveTab("manageSettlement"); }
                  else setActiveTab("transaction");
                }}>{item}</button>
              ))}
            </div>
          </div>
          <div className="pos-nav-dropdown">
            <button className="pos-tab">Master⌄</button>
            <div className="pos-nav-menu">
              {["Item Group Master", "Item Master", "Guest Master", "Modifiers Master", "Print Group Master", "Table Group Master", "Table Master", "Captain Master", "Print Settings"].map((item) => <button key={item} onClick={() => { if (item === "Item Group Master") { setEditingItemGroup(false); setActiveTab("itemGroupMaster"); } }}>{item}</button>)}
            </div>
          </div>
          <div className="pos-nav-dropdown">
            <button className="pos-tab">Reports⌄</button>
            <div className="pos-nav-menu pos-nav-menu--reports">
              {["Collection Report", "Item Group Wise Report", "Invoice Group Wise Summary", "Sales Summary Report", "Sales Summary By Guest", "Sales Summary By Order Type", "Due List", "Top Selling Items", "Table Wise Sale Summary", "NC Sale Summary", "Parcel Sale Summary", "Void KOT History", "Refund Item Summary", "PAX Summary", "General Ledger", "Cashbook Summary", "Day End Summary", "Feedback Analysis", "Full Screen"].map((item) => <button key={item}>{item}</button>)}
            </div>
          </div>
          <button className="pos-tab">Data Backup</button>
        </div>
        <div className="pos-topbar-right">
          <span>{localStorage.getItem("userName") || localStorage.getItem("name") || "User"}⌄</span>
        </div>
      </div>

      {/* ORDER TYPE BAR — hidden while an inside-table order is open */}
      {activeTab === "pos" && !(orderType === "DINE_IN" && selectedTable) && orderType !== "DELIVERY" && (
      <div className="pos-ordertype-bar">
        {['DINE_IN', 'TAKEAWAY', 'DELIVERY'].map(type => (
          <button
            key={type}
            className={`ordertype-btn ${orderType === type ? 'active' : ''}`}
            onClick={() => handleOrderTypeChange(type)}
          >
            {type === 'DINE_IN' ? 'Dine In' : type === 'TAKEAWAY' ? 'Take Away' : 'Delivery'}
          </button>
        ))}
        <div className="ordertype-right-controls">
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
        <button className="ordertype-icon-btn" title="User">♟</button>
        <button className="ordertype-icon-btn" title="Area">▣</button>
        <button className="ordertype-icon-btn" title="Currency">₹</button>
        <button className="ordertype-icon-btn" title="Table Transfer">↔</button>
        <button className="ordertype-icon-btn" style={{ background: '#e3f2fd', color: '#1976d2', border: '1px solid #90caf9' }}>R</button>
        <button className="ordertype-icon-btn" style={{ background: '#ffebee', color: '#c62828', border: '1px solid #ef9a9a' }}>↻</button>
        </div>
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
                          <td className="kot-item-name-cell"><button className="kot-row-delete" onClick={() => handleRemoveItem(item.id)} title="Remove item">▣</button><span>{item.name}</span></td>
                          <td><button className="kot-modifier-btn" title="Add modifier">＋</button></td>
                          <td className="kot-row-qty">
                            <button className="qty-btn" onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}>−</button>
                            <input value={item.quantity} onChange={(e) => handleUpdateQuantity(item.id, Math.max(1, Number(e.target.value) || 1))} />
                            <button className="qty-btn" onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}>+</button>
                          </td>
                          <td>₹{item.price.toFixed(2)}</td>
                          <td>
                            ₹{(item.price * item.quantity).toFixed(2)}
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
                <button className="np-red" onClick={handleSaveKOT} disabled={loading}>Save KOT</button>

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
                <button className="pos-inside-menu-add" title="Add new item" onClick={openAddMenuItem}>+</button>
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

      {activeTab === "pos" && orderType === "DELIVERY" && !deliveryNewOrder && (
        <div className="delivery-running-page">
          <div className="delivery-running-head">
            <strong>Running Orders</strong>
            <div>
              <button className="delivery-new-btn" onClick={() => setDeliveryNewOrder(true)}>New Order</button>
              <button className="delivery-kot-btn" onClick={() => setShowKOTModal(true)}>Table KOT</button>
              <button className="delivery-return-btn" onClick={() => handleOrderTypeChange("DINE_IN")}>Return</button>
            </div>
          </div>
          <div className="delivery-running-empty">No Orders Found</div>
        </div>
      )}

      {/* === NEW ORDER === fallback layout when no inside-table view is open */}
      {activeTab === "pos" && !(orderType === "DINE_IN" && selectedTable) && !(orderType === "DELIVERY" && !deliveryNewOrder) && (
        <div className={`pos-content ${orderType === "DINE_IN" && !selectedTable ? "pos-content--tables-only" : ""} ${orderType === "TAKEAWAY" ? "pos-content--takeaway" : ""}`}>
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
                const rawNum = String(table.number || table.tableNumber || "");
                const normNum = rawNum.replace(/^[TGRP]/, "");
                const tableData = occupiedTableData[normNum] || occupiedTableData[rawNum];
                const occ = table.status === "Occupied" || !!tableData;
                const baseTableLabel = String(table.number || table.tableNumber || "").toUpperCase();
                const tableLabel = selectedSection === "GARDEN" && !baseTableLabel.startsWith("GARDEN")
                  ? `GARDEN ${baseTableLabel.replace(/^G\s*/, "")}`
                  : baseTableLabel;
                const parcelNumber = Number(baseTableLabel.replace(/^P\s*/, ""));
                const displayTableLabel = selectedSection === "PARSAL" && Number.isFinite(parcelNumber)
                  ? parcelNumber <= 3
                    ? `PARSAL\nDELIVERY\n${parcelNumber}`
                    : parcelNumber <= 6
                      ? `PARSAL\nPICK UP ${parcelNumber - 3}`
                      : baseTableLabel
                  : selectedSection === "ROOM DINING" && !baseTableLabel.startsWith("ROOM")
                    ? `ROOM ${baseTableLabel.replace(/^R\s*/, "")}`
                    : tableLabel;
                const elapsedMinutes = tableData?.timestamp ? Math.max(0, Math.floor((Date.now() - new Date(tableData.timestamp).getTime()) / 60000)) : 0;
                const attention = occ && !!tableData?.billing;
                const tableTime = `${Math.floor(elapsedMinutes / 60)}:${String(elapsedMinutes % 60).padStart(2, "0")}`;
                const stop = (e) => e.stopPropagation();
                return (
                  <div
                    key={getTableKey(table)}
                    className={`table-card ${occ ? 'occupied' : ''} ${attention ? 'attention' : ''} ${sel ? 'selected' : ''}`}
                    onClick={undefined}
                  >
                    <div className="table-card-top">
                      <span className={`table-num ${selectedSection === "PARSAL" ? "table-num--parcel" : ""}`}>{displayTableLabel}</span>
                      {occ && tableData ? (
                        <>
                          <div className="table-card-runinfo">
                            <span className="reception">{tableData.captain || 'RECEPTION'}</span>
                            <span className="amount">{formatAmount(tableData.amount)}</span>
                          </div>
                          <span className="table-guest-pill">{tableData.guests || 1}</span>
                          {attention && <span className="table-alert-time">{tableTime}</span>}
                        </>
                      ) : null}
                    </div>
                    <div className="table-card-bottom">
                      <button
                        className="table-card-icon-btn"
                        title="KOT"
                        onClick={(e) => { stop(e); openTableSetup(table); }}
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
                            onClick={(e) => { stop(e); setSelectedTable(table); setInvoiceTable(table); setActiveTab("tableInvoice"); }}
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
                            title="KOT Details"
                            onClick={(e) => { stop(e); setKotDetailsTable(table); }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                              <line x1="4" y1="7" x2="20" y2="7" />
                              <line x1="4" y1="12" x2="20" y2="12" />
                              <line x1="4" y1="17" x2="20" y2="17" />
                            </svg>
                          </button>
                          {attention && <button className="table-card-icon-btn" title="Settlement" onClick={(e) => { stop(e); setGeneratedBill(tableData.bill || { id: tableData.orderId, billNo: tableData.orderId, tableNumber: tableLabel, total: tableData.amount, created_at: tableData.timestamp, paymentMethod: "Cash" }); }}>₹</button>}
                          {attention && <button className="table-card-icon-btn" title="View Invoice" onClick={(e) => { stop(e); setKotDetailsTable(table); }}>▤</button>}
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
                {selectedTable && (
                  <>
                    <button className="action-btn pink" onClick={() => handlePayBill("Cash")} disabled={loading}>Pay</button>
                    <button className="action-btn indigo" onClick={() => {
                      const roomNum = prompt("Enter room number:");
                      if (roomNum) handleChargeToRoom(roomNum);
                    }} disabled={loading}>Charge Room</button>
                  </>
                )}
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
                <input type="date" value={dashboardDateFrom} onChange={e => setDashboardDateFrom(e.target.value)} style={{ border: '1px solid #ccc', padding: '4px 6px', fontSize: '11px', borderRadius: '3px' }} />
                <input type="date" value={dashboardDateTo} onChange={e => setDashboardDateTo(e.target.value)} style={{ border: '1px solid #ccc', padding: '4px 6px', fontSize: '11px', borderRadius: '3px' }} />
                <button onClick={() => { fetchDashboardSummary(dashboardDateFrom, dashboardDateTo); fetchTopSellingItems(dashboardDateFrom, dashboardDateTo); }} style={{ background: '#3498db', color: '#fff', border: 'none', padding: '4px 10px', fontSize: '11px', borderRadius: '3px', cursor: 'pointer' }}>Search</button>
              </div>
            </div>
          </div>
          <div className="pos-kpi-grid">
            {(() => {
              const totalSales = dashboardSummary ? (dashboardSummary.totalTableSale || 0) : invoiceGroups.reduce((s, inv) => s + Number(inv.amount || 0), 0);
              const totalTax = dashboardSummary ? (dashboardSummary.totalGST || 0) : invoiceGroups.reduce((s, inv) => s + Number(inv.gst || 0), 0);
              const totalDiscount = dashboardSummary ? (dashboardSummary.totalDiscount || 0) : invoiceGroups.reduce((s, inv) => s + Number(inv.discountAmount || 0), 0);
              const counterSale = dashboardSummary ? (dashboardSummary.totalCounterSale || 0) : invoiceGroups.filter(inv => inv.entityType === 'Quick' || inv.entityType === 'Counter').reduce((s, inv) => s + Number(inv.amount || 0), 0);
              const parcelCharges = dashboardSummary ? (dashboardSummary.totalParcelSale || 0) : invoiceGroups.filter(inv => inv.entityType === 'Parcel' || inv.entityType === 'PARCEL').reduce((s, inv) => s + Number(inv.amount || 0), 0);
              const totalBillCount = dashboardSummary ? (dashboardSummary.totalBillCount || 0) : invoiceGroups.length;
              const kitchenOrdersCount = dashboardSummary ? (dashboardSummary.kitchenOrdersCount || 0) : 0;
              const avgOrder = dashboardSummary ? (dashboardSummary.averageOrderValue || 0) : (totalBillCount > 0 ? totalSales / totalBillCount : 0);

              const kpis = [
                { label: 'Table Sale', value: `₹ ${totalSales.toFixed(2)}`, sub: `Invoices: ${totalBillCount}` },
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
                  {topSellingItems.length > 0 ? topSellingItems.map((item, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td><td>{item.itemName || item.name || '—'}</td><td>{item.quantity || 0}</td><td>₹ {(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  )) : <tr><td colSpan="4" style={{ textAlign: 'center', color: '#999' }}>No data for selected date range</td></tr>}
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
        <div className="pos-content quick-bill-workspace">
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
      {activeTab === "tableInvoice" && invoiceTable && (() => {
        const tableKey = getTableKey(invoiceTable);
        const localItems = tableOrderData[tableKey]?.items || [];
        const relatedKots = kotHistory.filter(kot => String(kot.table) === String(invoiceTable.number));
        const items = localItems.length ? localItems : relatedKots.flatMap(kot => kot.items || []);
        const itemTotal = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
        const serviceCharge = itemTotal * .05;
        const subTotal = itemTotal + serviceCharge;
        const netTotal = Math.round(subTotal);
        return <div className="table-invoice-page">
          <div className="table-invoice-head"><span>Table No {invoiceTable.number}</span><span>Invoice # (New)</span><span>Date {new Date().toLocaleDateString("en-GB")}</span><button onClick={() => { setInvoiceTable(null); setSelectedTable(null); setActiveTab("pos"); }}>Back To Table List</button></div>
          <div className="table-invoice-main">
            <div className="table-invoice-left">
              <div className="table-invoice-meta"><span>Captain <strong>{tableOrderData[tableKey]?.captain || "RECEPTION"}</strong></span><span>No Of Person <strong>{tableOrderData[tableKey]?.pax || 1}</strong></span></div>
              <table><thead><tr><th>Item Name</th><th>Quantity</th><th>Rate</th><th>Disc</th><th>Amount</th></tr></thead><tbody>{items.map((item, i) => <tr key={`${item.id || item.name}-${i}`}><td>{item.name}</td><td>{Number(item.quantity || 0).toFixed(3)}</td><td>{Number(item.price || 0).toFixed(2)}</td><td>0.00</td><td>{(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)}</td></tr>)}</tbody></table>
              <div className="table-invoice-count">Total Items: {items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)}</div>
              <div className="table-invoice-bottom">
                <div className="invoice-keypad">{["7","8","9","","4","5","6","Clear","1","2","3","−","0",".","Discount","Rate"].map((key, i) => <button key={`${key}-${i}`}>{key}</button>)}</div>
                <div className="invoice-totals"><div><span>Food</span><strong>{itemTotal.toFixed(2)}</strong></div><div><span>Ser.Charges on Food @5.00%</span><strong>{serviceCharge.toFixed(2)}</strong></div><div><span>Sub Total</span><strong>{subTotal.toFixed(2)}</strong></div><div className="invoice-charge-row"><span>Del. Ch.</span><input defaultValue="0" /><span>Cont. Ch.</span><input defaultValue="0" /></div><div className="invoice-net"><span>Round Off.</span><strong>{(netTotal - subTotal).toFixed(2)}</strong><span>Net Total</span><strong>{netTotal.toFixed(2)}</strong></div></div>
              </div>
            </div>
          </div>
          <div className="table-invoice-actions"><div><button>◆ Parcel</button><button>◆ NC</button><button>▣</button><label><input type="checkbox" /> No Ser. Charge?</label><label><input type="checkbox" /> Tax Exemption?</label></div><div><button onClick={handleSaveBill}>▣ Save</button><button onClick={handleSaveBillAndSendWhatsApp}>▣ Save &amp; Print</button><button>▣ Guest</button><button>◆ Discount</button></div></div>
        </div>;
      })()}

      {activeTab === "itemGroupMaster" && (
        <div className="item-group-page">
          <div className="item-group-title">Manage Item Groups <div><button>⟳ Refresh</button><button onClick={() => setEditingItemGroup({ name: "", invoiceGroup: "Food", printGroup1: "Kitchen KOT", printGroup2: "None", category: "BEVERAGES", active: true })}>＋ New</button></div></div>
          {editingItemGroup ? (
            <div className="item-group-form">
              <h3>Add/Edit Item Group <button onClick={() => setEditingItemGroup(false)}>×</button></h3>
              <div className="item-group-form-grid">
                <div className="item-group-main-fields">
                  <div className="group-radio-row"><label><input type="radio" checked readOnly /> Main Group</label><label><input type="radio" /> Sub Group</label></div>
                  <label>Group Name<input value={editingItemGroup.name} onChange={(e) => setEditingItemGroup({ ...editingItemGroup, name: e.target.value })} /></label>
                  <div className="group-select-row"><label>Invoice Group<select value={editingItemGroup.invoiceGroup} onChange={(e) => setEditingItemGroup({ ...editingItemGroup, invoiceGroup: e.target.value })}><option>Food</option><option>Beverage</option></select></label><label>Print Group 1<select value={editingItemGroup.printGroup1} onChange={(e) => setEditingItemGroup({ ...editingItemGroup, printGroup1: e.target.value })}><option>Kitchen KOT</option><option>None</option></select></label><label>Print Group 2<select value={editingItemGroup.printGroup2} onChange={(e) => setEditingItemGroup({ ...editingItemGroup, printGroup2: e.target.value })}><option>None</option><option>Kitchen KOT</option></select></label></div>
                  <label>Category<select value={editingItemGroup.category} onChange={(e) => setEditingItemGroup({ ...editingItemGroup, category: e.target.value })}>{categories.filter(c => c !== "All").map(c => <option key={c}>{c}</option>)}</select></label>
                  <label className="group-active"><input type="checkbox" checked={editingItemGroup.active} onChange={(e) => setEditingItemGroup({ ...editingItemGroup, active: e.target.checked })} /> Active</label>
                  <div><button className="group-save" onClick={() => setEditingItemGroup(false)}>Save</button><button className="group-back" onClick={() => setEditingItemGroup(false)}>Back To List</button></div>
                </div>
                <div className="group-show-box"><span>Show This Group In</span><label><input type="checkbox" /> All</label><label><input type="checkbox" defaultChecked /> QSR</label></div>
              </div>
            </div>
          ) : (
            <div className="item-group-list"><h3>List of Item Groups</h3><div className="item-group-search"><label>Group Name</label><input placeholder="Enter item group name" /><button>Search</button></div><table><thead><tr><th>#</th><th>Item Group Name</th><th>Invoice Group</th><th>Print Group</th><th>Active</th><th></th></tr></thead><tbody>
              {categories.filter(c => c !== "All").map((group, i) => <tr key={group}><td>{i + 1}</td><td>{String(group).toUpperCase()}</td><td>Food</td><td>Kitchen KOT</td><td><input type="checkbox" checked readOnly /></td><td><button className="group-edit" onClick={() => setEditingItemGroup({ name: String(group).toUpperCase(), invoiceGroup: "Food", printGroup1: "Kitchen KOT", printGroup2: "None", category: group, active: true })}>↗</button><button className="group-delete">▣</button></td></tr>)}
            </tbody></table></div>
          )}
        </div>
      )}

      {activeTab === "manageSettlement" && (
        <div className="settlement-page">
          <div className="settlement-title">Manage Settlements {selectedSettlement && <button onClick={() => setSelectedSettlement(null)}>Return To List</button>}</div>
          {selectedSettlement ? (() => {
            const total = Number(selectedSettlement.total || selectedSettlement.amount || selectedSettlement.grandTotal || 0);
            const received = Number(selectedSettlement.amountReceived || selectedSettlement.paidAmount || 0);
            return <div className="settlement-detail">
              <h3>Invoice Detail <strong>Grand Total : {total.toFixed(2)}</strong></h3>
              <div className="settlement-detail-grid">
                <table><tbody>
                  <tr><th>Invoice No.</th><td>{selectedSettlement.invoiceNo || selectedSettlement.billNo || selectedSettlement.id}</td></tr>
                  <tr><th>Invoice Date.</th><td>{new Date(selectedSettlement.created_at || selectedSettlement.createdAt || Date.now()).toLocaleString("en-IN")}</td></tr>
                  <tr><th>Table No/Customer</th><td>{selectedSettlement.tableNumber || selectedSettlement.table || selectedSettlement.customerName || "-"}</td></tr>
                  <tr><th>Captain</th><td>{selectedSettlement.captain || "RECEPTION"}</td></tr>
                </tbody></table>
                <table><tbody><tr><th>NET AMOUNT</th><td>Rs. {total.toFixed(2)}</td></tr><tr><th>Amount Received</th><td>{received.toFixed(2)}</td></tr><tr className="balance"><th>Balance</th><td>Rs. {(total - received).toFixed(2)}</td></tr></tbody></table>
              </div>
              <div className="settlement-payment-note">{received ? `Payment received: ${received.toFixed(2)}` : "Payment not received yet."}</div>
              <button className="settlement-add-payment" onClick={() => setGeneratedBill(selectedSettlement)}>＋ Add Payment</button>
            </div>;
          })() : <div className="settlement-list">
            <h3>Search Invoice</h3>
            <div className="settlement-filters"><input placeholder="Enter Invoice No" /><input type="date" value={settlementDateFrom} onChange={e => setSettlementDateFrom(e.target.value)} /><input type="date" value={settlementDateTo} onChange={e => setSettlementDateTo(e.target.value)} /><input placeholder="Enter table no or customer name" /><button onClick={() => fetchFilteredBills(settlementDateFrom, settlementDateTo)}>⌕ Search</button><button onClick={() => { setSettlementDateFrom(new Date().toISOString().slice(0,10)); setSettlementDateTo(new Date().toISOString().slice(0,10)); fetchFilteredBills(settlementDateFrom, settlementDateTo); }}>↻ Clear</button></div>
            <table><thead><tr><th>Action</th><th>Invoice#</th><th>Date</th><th>Table/Parcel No</th><th>Customer Name</th><th>Captain</th><th>Invoice Type</th><th>Bill Amount</th><th>Payment Mode</th><th>Settled?</th></tr></thead><tbody>
              {filteredBills.map((inv) => { const total = Number(inv.total || inv.grandTotal || inv.amount || 0); const paid = Number(inv.amountReceived || inv.paidAmount || 0); return <tr key={inv.id || inv.invoiceNo || inv.billNo}><td><button onClick={() => setSelectedSettlement(inv)}>↗</button><button onClick={() => window.print()}>▣</button></td><td>{inv.invoiceNo || inv.billNo || inv.id}</td><td>{new Date(inv.created_at || inv.createdAt || Date.now()).toLocaleString("en-IN")}</td><td>{inv.tableNumber || inv.table || "-"}</td><td>{inv.customerName || ""}</td><td>{inv.captain || "RECEPTION"}</td><td>{inv.invoiceType || "Table"}</td><td>{total.toFixed(2)}</td><td>{inv.paymentMethod || inv.paymentMode || ""}</td><td><input type="checkbox" checked={paid >= total && total > 0} readOnly /></td></tr>; })}
            </tbody></table>
          </div>}
        </div>
      )}

      {activeTab === "manageKot" && (
        <div className="manage-kot-page">
          <div className="manage-kot-title">MKOT List <button onClick={() => { fetchFilteredKots(kotDateFrom, kotDateTo); setActiveTab("manageKot"); }}>⟳ Refresh</button></div>
          {selectedManageKot ? (
            <div className="manage-kot-detail">
              <h3>Edit KOT</h3>
              <table><tbody>
                <tr><th>Table No/Customer</th><td>{selectedManageKot.table || selectedManageKot.tableNumber || selectedManageKot.roomNumber || "-"}</td><th>KOT #</th><td>{selectedManageKot.kotNo || selectedManageKot.id}</td></tr>
                <tr><th>Date</th><td>{new Date(selectedManageKot.timestamp || selectedManageKot.createdAt || Date.now()).toLocaleString("en-IN")}</td><th>Captain</th><td>{selectedManageKot.captain || "RECEPTION"}</td></tr>
                <tr><th>No of Person</th><td colSpan="3">{selectedManageKot.guests || selectedManageKot.pax || 1}</td></tr>
              </tbody></table>
              <table className="manage-kot-items"><thead><tr><th>Item Name</th><th>Description</th><th>Quantity</th><th>Rate</th><th>Amount</th></tr></thead><tbody>
                {(selectedManageKot.items || []).map((item, i) => <tr key={i}><td>{item.name}</td><td>{item.description || ""}</td><td>{Number(item.quantity || 0).toFixed(3)}</td><td>{Number(item.price || item.rate || 0).toFixed(2)}</td><td>{(Number(item.quantity || 0) * Number(item.price || item.rate || 0)).toFixed(2)}</td></tr>)}
              </tbody></table>
              <div className="manage-kot-detail-footer">
                <strong>Total Items: {(selectedManageKot.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0)} &nbsp; Sub Total: {(selectedManageKot.items || []).reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.price || item.rate || 0), 0).toFixed(2)}</strong>
                <div><button className="reprint" onClick={() => window.print()}>Re-Print</button><button onClick={() => setSelectedManageKot(null)}>List</button></div>
              </div>
            </div>
          ) : (
            <div className="manage-kot-list">
              <h3>Search KOT</h3>
              <div className="manage-kot-filters"><label>KOT No<input placeholder="Enter KOT No" /></label><label>KOT Date From<input type="date" value={kotDateFrom} onChange={e => setKotDateFrom(e.target.value)} /></label><label>KOT Date To<input type="date" value={kotDateTo} onChange={e => setKotDateTo(e.target.value)} /></label><label>Table No<input placeholder="Enter Table No" /></label><label>KOT Type<select><option>Table / Take Away</option></select></label><button onClick={() => fetchFilteredKots(kotDateFrom, kotDateTo)}>⌕ Search</button><button onClick={() => { setKotDateFrom(new Date().toISOString().slice(0,10)); setKotDateTo(new Date().toISOString().slice(0,10)); fetchFilteredKots(kotDateFrom, kotDateTo); }}>↻ Clear</button></div>
              <table><thead><tr><th>KOT#</th><th>Date</th><th>Table/Parcel No</th><th>Captain</th><th>Total Items</th><th>Grand Total</th><th>Action</th></tr></thead><tbody>
                {filteredKots.length > 0 ? filteredKots.map((kot) => <tr key={kot.id}><td>{kot.kotNo || kot.id}</td><td>{new Date(kot.timestamp || kot.created_at || Date.now()).toLocaleString("en-IN")}</td><td>{kot.tableNumber || kot.table || kot.roomNumber || "-"}</td><td>{kot.waiter_name || kot.captain || "RECEPTION"}</td><td>{(kot.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0)}</td><td>{(kot.items || []).reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.price || item.rate || 0), 0).toFixed(2)}</td><td><button className="manage-kot-edit" onClick={() => setSelectedManageKot(kot)}>↗</button></td></tr>) : <tr><td colSpan="7" style={{ textAlign: 'center', color: '#999', padding: '20px' }}>No KOTs found for selected date range</td></tr>}
              </tbody></table>
            </div>
          )}
        </div>
      )}

      {activeTab === "kds" && (
        <KDSView
          kotHistory={kotHistory}
          onMarkReady={(kotId, itemIdx) => {
            const kot = kotHistory.find(k => k.id === kotId);
            if (!kot) return;
            const items = [...(kot.items || [])];
            items[itemIdx] = { ...items[itemIdx], status: items[itemIdx].status === "Ready" ? "Pending" : "Ready" };
            setKotHistory(prev => prev.map(k => k.id === kotId ? { ...k, items } : k));
            API.put(`/kitchen/orders/${kotId}`).catch(() => {});
          }}
          onDeliver={(kotId) => {
            API.put(`/kitchen/orders/${kotId}`, { status: "Served" }).then(() => {
              setKotHistory(prev => prev.filter(k => k.id !== kotId));
            }).catch(() => {});
          }}
        />
      )}

      {/* === DAILY TRANSACTION === */}
      {activeTab === "transaction" && (
        <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
          <div className="simple-card">
            <div className="simple-page-header">
              <h2 className="simple-page-title">Daily Transaction</h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input type="date" value={transactionDateFrom} onChange={e => setTransactionDateFrom(e.target.value)} style={{ border: '1px solid #ccc', padding: '4px 6px', fontSize: '11px', borderRadius: '3px' }} />
                <input type="date" value={transactionDateTo} onChange={e => setTransactionDateTo(e.target.value)} style={{ border: '1px solid #ccc', padding: '4px 6px', fontSize: '11px', borderRadius: '3px' }} />
                <button onClick={() => fetchFilteredBills(transactionDateFrom, transactionDateTo)} style={{ background: '#3498db', color: '#fff', border: 'none', padding: '4px 10px', fontSize: '11px', borderRadius: '3px', cursor: 'pointer' }}>Search</button>
              </div>
            </div>
            <table className="trans-table">
              <thead><tr><th>#</th><th>Invoice No</th><th>Table</th><th>Date</th><th>Amount</th><th>Payment</th><th>Status</th></tr></thead>
              <tbody>
                {filteredBills.length > 0 ? filteredBills.map((inv, idx) => (
                  <tr key={inv.id || idx}>
                    <td>{idx + 1}</td><td>{inv.invoiceNo || inv.id}</td><td>{inv.tableNumber || inv.table || '-'}</td>
                    <td>{inv.created_at ? new Date(inv.created_at).toLocaleDateString() : '-'}</td>
                    <td>₹{Number(inv.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td>{inv.paymentMethod || '-'}</td>
                    <td><span className="trans-status success">{inv.invoiceStatus || inv.status || 'PAID'}</span></td>
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
        const rawTableNo = String(kotDetailsTable.number || kotDetailsTable.tableNumber || "");
        const normTableNo = rawTableNo.replace(/^[TGRP]/, "");
        const kotsForTable = kotHistory.filter((k) => {
          const kRaw = String(k.table || "");
          const kNorm = kRaw.replace(/^[TGRP]/, "");
          return kRaw === rawTableNo || kNorm === normTableNo;
        });
        const fmtTs = (ts) => {
          const d = ts ? new Date(ts) : new Date();
          return d.toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }).replace(",", "");
        };
        const closeModal = () => setKotDetailsTable(null);
        const handleGenerateBillFromModal = () => {
          // Build a preview bill from the KOT items and open the modal
          const rawTableNo = String(kotDetailsTable.number || kotDetailsTable.tableNumber || "");
          const kotsForTable = kotHistory.filter(k => {
            const kRaw = String(k.table || "");
            const kNorm = kRaw.replace(/^[TGRP]/, "");
            return kRaw === rawTableNo || kNorm === rawTableNo.replace(/^[TGRP]/, "");
          });
          const allItems = kotsForTable.flatMap(k => k.items || []);
          if (!allItems.length) { alert("No KOT items to bill."); return; }
          const menuPrices = {};
          menuItems.forEach(m => { menuPrices[m.name.toLowerCase()] = Number(m.price); });
          const items = allItems.map(it => ({
            name: it.name,
            quantity: Number(it.quantity || 0),
            price: Number(it.price || menuPrices[it.name.toLowerCase()] || 0),
            amount: Number(it.quantity || 0) * Number(it.price || menuPrices[it.name.toLowerCase()] || 0),
          }));
          const subtotal = items.reduce((s, it) => s + it.amount, 0);
          const gst = subtotal * 0.05;
          const total = subtotal + gst;
          setGeneratedBill({
            id: null, billNo: null,
            tableNumber: rawTableNo,
            customerName: "",
            phone: "",
            subtotal, gst, total,
            items,
            entityType: "DINE_IN",
            paymentMethod: "Cash",
            waiter_name: "",
            created_at: new Date().toISOString(),
          });
          closeModal();
        };
        const handleNewKotFromModal = () => {
          setActiveTab("pos");
          setOrderType("DINE_IN");
          setSelectedTable(kotDetailsTable);
          closeModal();
        };
        return (
          <div className="kot-modal-overlay" onClick={closeModal}>
            <div className="kot-modal" onClick={(e) => e.stopPropagation()}>
              <div className="kot-modal-head">
                <span>KOT Details - Table No. {rawTableNo.toUpperCase()}</span>
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
                            <button className="kot-modal-btn kot-modal-btn--void" onClick={() => handleVoidItem(kot.id, kot.items[0] || {})}>⊘ Void Items</button>
                            <button className="kot-modal-btn kot-modal-btn--transfer" onClick={() => handleTransferKot(kot)}>↔ Transfer KOT</button>
                          </div>
                        </div>
                        <table className="kot-modal-items-table">
                          <thead>
                            <tr>
                              <th style={{ width: 40 }}>#</th>
                              <th>Item Name</th>
                              <th style={{ width: 70, textAlign: "right" }}>Qty</th>
                              <th style={{ width: 80, textAlign: "right" }}>Rate</th>
                              <th style={{ width: 80, textAlign: "right" }}>Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(kot.items || []).map((it, i) => (
                              <tr key={i}>
                                <td>{i + 1}</td>
                                <td><span className="kot-item-name">{it.name}</span></td>
                                <td style={{ textAlign: "right" }}>{Number(it.quantity || 0).toFixed(2)}</td>
                                <td style={{ textAlign: "right" }}>₹{Number(it.price || 0).toFixed(2)}</td>
                                <td style={{ textAlign: "right" }}>₹{((Number(it.quantity || 0)) * (Number(it.price || 0))).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="kot-modal-card-foot">
                          KOT Total: ₹{(kot.items || []).reduce((s, it) => s + (Number(it.quantity || 0)) * (Number(it.price || 0)), 0).toFixed(2)} &nbsp;|&nbsp; Items: {totalItems}
                        </div>
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

      {generatedBill && (
        <RestaurantBillModal
          bill={generatedBill}
          onClose={() => setGeneratedBill(null)}
        />
      )}

      {tableSetupTarget && (
        <div className="table-setup-overlay">
          <div className="table-setup-modal">
            <div className="table-setup-head">Select PAX and CAPTAIN <button onClick={() => setTableSetupTarget(null)}>×</button></div>
            <div className="table-setup-body">
              <h4>SELECT PAX</h4>
              <div className="pax-options">{Array.from({ length: 20 }, (_, i) => i + 1).map((pax) => <button key={pax} className={tableSetupPax === pax ? "selected" : ""} onClick={() => setTableSetupPax(pax)}>{pax}</button>)}</div>
              <h4>SELECT CAPTAIN</h4>
              <div className="captain-options">
                <button disabled={!tableSetupPax} onClick={() => finishTableSetup("RECEPTION")}>RECEPTION</button>
                {captains.map((captain) => <button key={captain.id} disabled={!tableSetupPax} onClick={() => finishTableSetup(captain.name)}>{captain.name}</button>)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Customer Modal */}
      {showSaveCustomerModal && (
        <div className="modal-overlay" onClick={() => setShowSaveCustomerModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-title">Customer Details</div>
            <div className="simple-form-group">
              <label className="simple-label">Customer Name *</label>
              <input
                className="simple-input"
                value={saveCustomerInfo.customerName}
                onChange={(e) => setSaveCustomerInfo(prev => ({ ...prev, customerName: e.target.value }))}
                placeholder="Enter customer name"
              />
            </div>
            <div className="simple-form-group">
              <label className="simple-label">Phone Number *</label>
              <input
                className="simple-input"
                value={saveCustomerInfo.phone}
                onChange={(e) => setSaveCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Enter phone number"
              />
            </div>
            <div className="modal-actions">
              <button className="simple-btn simple-btn-secondary" onClick={() => setShowSaveCustomerModal(false)}>Cancel</button>
              <button className="simple-btn simple-btn-primary" onClick={() => {
                setShowSaveCustomerModal(false);
                proceedSaveBill();
              }}>Save &amp; Proceed</button>
            </div>
          </div>
        </div>
      )}

      {editingMenuItem && (
        <div className="modal-overlay" onClick={() => setEditingMenuItem(null)}>
          <div className="modal-box add-item-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{editingMenuItem.id ? "Edit Item" : "Add Item"}<button onClick={() => setEditingMenuItem(null)}>×</button></div>
            <div className="simple-form-group add-item-group-row">
              <label className="simple-label">Item Group</label>
              <select className="simple-input" value={editingMenuItem.category} onChange={(e) => setEditingMenuItem((p) => ({ ...p, category: e.target.value }))}>
                <option value="">Select Parent</option>
                {categories.filter((c) => c !== "All").map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="add-item-three-grid">
              <div className="simple-form-group"><label className="simple-label">Item Code</label><input className="simple-input" value={editingMenuItem.itemCode || ""} onChange={(e) => setEditingMenuItem((p) => ({ ...p, itemCode: e.target.value }))} placeholder="835" /></div>
              <div className="simple-form-group"><label className="simple-label">Shortcut Key</label><input className="simple-input" value={editingMenuItem.shortcutKey || ""} onChange={(e) => setEditingMenuItem((p) => ({ ...p, shortcutKey: e.target.value }))} placeholder="Enter shortcut key" /></div>
              <div className="simple-form-group"><label className="simple-label">Bar Code</label><input className="simple-input" value={editingMenuItem.barcode || ""} onChange={(e) => setEditingMenuItem((p) => ({ ...p, barcode: e.target.value }))} placeholder="Enter bar code" /></div>
            </div>
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
              <label className="simple-label">Item Display Name</label>
              <input className="simple-input" value={editingMenuItem.displayName || ""} onChange={(e) => setEditingMenuItem((p) => ({ ...p, displayName: e.target.value }))} placeholder="Enter item display name" />
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
            <div className="add-item-options">
              <label>Unit<select value={editingMenuItem.unit || ""} onChange={(e) => setEditingMenuItem((p) => ({ ...p, unit: e.target.value }))}><option value="">Select Unit</option><option>PCS</option><option>PLATE</option><option>GLASS</option></select></label>
              <label><input type="checkbox" checked={editingMenuItem.status === "Available"} onChange={(e) => setEditingMenuItem((p) => ({ ...p, status: e.target.checked ? "Available" : "Out of Stock" }))} /> Active</label>
              <label><input type="checkbox" checked={!!editingMenuItem.favourite} onChange={(e) => setEditingMenuItem((p) => ({ ...p, favourite: e.target.checked }))} /> Add To Favourite</label>
              <label><input type="checkbox" checked={editingMenuItem.foodType === "Non Veg"} onChange={(e) => setEditingMenuItem((p) => ({ ...p, foodType: e.target.checked ? "Non Veg" : "Veg" }))} /> Is Non-Veg?</label>
            </div>
            <div className="modal-actions" style={{ justifyContent: "flex-end" }}>
              <button className="simple-btn simple-btn-primary" onClick={handleSaveMenuItem}>Save</button>
              <button className="simple-btn simple-btn-gray" onClick={() => setEditingMenuItem(null)}>Close</button>
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
              <label className="simple-label">Assigned Waiter</label>
              <select
                className="simple-input"
                value={editingTable.waiter_name || ""}
                onChange={(e) => setEditingTable((prev) => ({ ...prev, waiter_name: e.target.value }))}
              >
                <option value="">— Unassigned —</option>
                {(usersRes?.data || []).filter(u => u.role === 'waiter').map(u => (
                  <option key={u.id || u._id} value={u.name || u.userName}>{u.name || u.userName}</option>
                ))}
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

      {/* === WAITER PERFORMANCE === */}
      {activeTab === "waiters" && (
        <div className="pos-management-view">
          <div className="simple-card">
            <div className="simple-page-header">
              <h2 className="simple-page-title">Waiter Performance</h2>
            </div>
            {waiterPerformance.length === 0 ? (
              <div className="empty-order">No performance data available yet.</div>
            ) : (
              <table className="simple-table">
                <thead>
                  <tr>
                    <th>Waiter Name</th>
                    <th>Total Orders</th>
                    <th>Total Amount (₹)</th>
                    <th>Avg Order Value (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {waiterPerformance.map((wp, idx) => {
                    const totalAmt = Number(wp.totalAmount || wp.total_amount || 0);
                    const totalOrders = Number(wp.orderCount || wp.total_orders || 0);
                    const avg = totalOrders > 0 ? totalAmt / totalOrders : 0;
                    return (
                      <tr key={idx}>
                        <td className="font-medium">{wp.waiterName || wp.waiter_name || "—"}</td>
                        <td>{totalOrders}</td>
                        <td>₹{totalAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td>₹{avg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
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

// ── KDS Component ──────────────────────────────────────────────────────────────
function KDSView({ kotHistory, onMarkReady, onDeliver }) {
  const [filter, setFilter] = useState("all"); // all | veg | nonveg
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const fmtTime = (ts) => {
    if (!ts) return "0:00";
    const diff = Math.floor((tick - new Date(ts).getTime()) / 1000);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const getDestination = (kot) => {
    if (!kot) return "Table --";
    const num = String(kot.table || "");
    if (num.startsWith("R")) return `ROOM ${num.replace(/^R/, "")}`;
    if (num.startsWith("T")) return `TABLE ${num.replace(/^T/, "")}`;
    if (/^\d+$/.test(num)) return `TABLE ${num}`;
    return num.toUpperCase() || "Table --";
  };

  const foodTypeOf = (itemName) => {
    // Check if item has food type indicator in items (KOT doesn't have it, use Veg default for safety)
    if (!itemName) return "veg";
    const n = itemName.toLowerCase();
    if (["chicken", "mutton", "egg", "fish", "prawn", "meat", "pork", "beef"].some(w => n.includes(w))) return "nonveg";
    return "veg";
  };

  const filteredKots = kotHistory.filter(kot => {
    if (filter === "all") return true;
    return kot.items?.some(it => foodTypeOf(it.name) === filter);
  });

  return (
    <div className="kds-page">
      {/* header bar */}
      <div className="kds-header">
        <span>KDS (KITCHEN DISPLAY SYSTEM)</span>
        <div style={{ display: "flex", gap: 4 }}>
          {[["all", "All"], ["veg", "Veg"], ["nonveg", "Non-Veg"]].map(([val, lbl]) => (
            <button
              key={val}
              className="kds-toggle"
              style={filter === val ? { background: "#fff", color: "#222" } : {}}
              onClick={() => setFilter(val)}
            >{lbl}</button>
          ))}
        </div>
      </div>

      <div className="kds-scroll">
        {filteredKots.length === 0 ? (
          <div className="empty-order">No orders in kitchen.</div>
        ) : filteredKots.map((kot) => (
          <div key={kot.id} className="kds-card">
            {/* two-tone header: dark left = KOT#, yellow right = destination */}
            <div className="kds-card-header">
              <div className="kds-card-header-kot">
                <span>KOT# -- {kot.kotNo ? String(kot.kotNo).replace(/^KOT-?/i, "") : kot.id}</span>
              </div>
              <div className="kds-card-header-dest">
                <span>Table# -- {getDestination(kot)}</span>
              </div>
            </div>

            {/* items table */}
            <table className="kds-items-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>#</th>
                  <th>Item Name</th>
                  <th style={{ width: 70, textAlign: "center" }}>Qty</th>
                  <th style={{ width: 120 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {(kot.items || []).map((item, i) => {
                  const isReady = item.status === "Ready";
                  return (
                    <tr key={i} className={isReady ? "kds-item-ready" : ""}>
                      <td>{i + 1}</td>
                      <td><span className="kds-item-name">{item.name}</span></td>
                      <td style={{ textAlign: "center" }}>{Number(item.quantity || 0).toFixed(2)}</td>
                      <td>
                        <button
                          className="kds-status-btn"
                          data-ready={isReady ? "true" : "false"}
                          onClick={() => onMarkReady(kot.id, i)}
                        >
                          {isReady ? "✓ Ready" : "Preparing..."}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* footer: elapsed + delivered */}
            <div className="kds-card-footer">
              <span className="kds-time-elapsed">Time Elapsed: {fmtTime(kot.timestamp)}</span>
              <button className="kds-delivered-btn" onClick={() => onDeliver(kot.id)}>✓ DELIVERED</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
