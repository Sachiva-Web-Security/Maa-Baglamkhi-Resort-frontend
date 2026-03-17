import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import API from "../api";
import { restaurantService } from "../services/restaurantService";

export const RestaurantContext = createContext();

export const RestaurantProvider = ({ children }) => {
  const [tables, setTables] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [tableStatusByNo, setTableStatusByNo] = useState({});
  const [selectedTable, setSelectedTable] = useState(null);

  /* ================ LOAD TABLES ================= */
  const loadTables = useCallback(async () => {
    try {
      const res = await API.get("/restaurant/tables");

      const rows = (res.data || []).map((table) => ({
        id: table.id,
        name: String(table.number),
      }));

      setTables(rows);

      const statuses = {};

      await Promise.all(
        rows.map(async (t) => {
          let occupied = false;
          try {
            const orderRes = await API.get(`/restaurant/order/${t.name}`);
            if (orderRes.data) occupied = true;
          } catch {}

          statuses[t.name] = occupied ? "Occupied" : "Available";
        })
      );

      setTableStatusByNo(statuses);
    } catch (err) {
      console.log("Error loading tables:", err);
      setTables([]);
    }
  }, []);

  /* ================ LOAD MENU ================= */
  const loadMenu = useCallback(
    async (tableNo = selectedTable) => {
      if (!tableNo) {
        setMenuItems([]);
        return;
      }

      try {
        const backendRows = await restaurantService.getMenu(tableNo);
        setMenuItems(backendRows || []);
      } catch (err) {
        console.log("Error loading menu:", err);
        setMenuItems([]);
      }
    },
    [selectedTable]
  );

  useEffect(() => {
    loadTables();
  }, [loadTables]);

  useEffect(() => {
    if (!selectedTable) {
      setMenuItems([]);
      return;
    }
    loadMenu(selectedTable);
  }, [selectedTable, loadMenu]);

  useEffect(() => {
    const refresh = () => loadTables();
    window.addEventListener("tokenUpdated", refresh);
    return () => window.removeEventListener("tokenUpdated", refresh);
  }, [loadTables]);

  /* ================ ADD TABLE ================= */
  const addTable = async (tableNumber) => {
    const normalized = String(tableNumber || "").trim();
    if (!normalized) throw new Error("Table number is required");

    const existing = tables.find((t) => String(t.name) === normalized);
    if (existing) return existing;

    const tempId = `tmp-${Date.now()}`;
    const optimistic = { id: tempId, name: normalized };

    setTables((prev) => [...prev, optimistic]);
    setTableStatusByNo((prev) => ({ ...prev, [normalized]: "Available" }));

    try {
      const res = await API.post("/restaurant/tables", { number: normalized });
      const data = res.data || {};
      const persisted = { id: data.id || tempId, name: normalized };

      setTables((prev) =>
        prev.map((table) => (table.id === tempId ? persisted : table)),
      );

      return persisted;
    } catch (err) {
      console.log("Error adding table:", err);
      return optimistic;
    }
  };

  /* ================ ADD MENU ITEM ================= */
  const addMenuItem = async (name, price, category, tableNoParam) => {
    const resolvedTable = tableNoParam || selectedTable;
    const tableNumber = resolvedTable ? String(resolvedTable) : null;

    if (!tableNumber) {
      throw new Error("Select a table before adding menu items.");
    }

    const res = await restaurantService.addMenuItem({
      name,
      price: Number(price),
      category: category || "Others",
      tableNumber,
    });

    const persistedItem = {
      id: res?.id,
      name,
      price: Number(price),
      category: category || "Others",
      table_number: tableNumber,
    };

    await loadMenu(resolvedTable);
    setTableStatusByNo((prev) => ({
      ...prev,
      [tableNumber]: "Occupied",
    }));

    return persistedItem;
  };

  /* ================ ORDER HELPERS ================= */
  const getOrderItemsForTable = useCallback(async (tableNo) => {
    const order = await restaurantService.getPendingOrder(tableNo);
    if (!order?.id) return [];

    const items = await restaurantService.getOrderItems(order.id);
    return items.map((item) => ({
      orderItemId: item.id,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.price,
      category: item.category,
    }));
  }, []);

  const createOrder = useCallback(
    async ({ waiterName, tableNo, items }) => {
      let payloadItems = items || [];
      if (payloadItems.length === 0) {
        payloadItems = await getOrderItemsForTable(tableNo);
        payloadItems = payloadItems.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          price: i.unitPrice,
        }));
      }
      if (payloadItems.length === 0) return;

      await restaurantService.createOrder(tableNo, payloadItems);
      await restaurantService.createKitchenOrder({
        table: tableNo,
        waiter: waiterName || "Waiter",
        items: payloadItems,
      });
      await loadTables();
    },
    [getOrderItemsForTable, loadTables]
  );

  const removeItemFromOrder = async () => {
    // Backend does not expose delete; no-op to keep UI stable.
    console.warn("removeItemFromOrder not supported by backend");
  };

  const updateOrderItem = async () => {
    // Backend does not expose update; no-op to keep UI stable.
    console.warn("updateOrderItem not supported by backend");
  };

  const clearOrder = async (tableNo = selectedTable) => {
    setTableStatusByNo((prev) => ({ ...prev, [tableNo]: "Available" }));
  };

  const generateBill = async (billData) => {
    const res = await API.post("/restaurant/bill", billData);
    await loadTables();
    window.dispatchEvent(new Event("tokenUpdated"));
    return res.data;
  };

  const getTableStatus = (tableNo) => {
    const key = String(tableNo || "");
    return tableStatusByNo[key] || "Available";
  };

  const orderItems = useMemo(() => [], []);

  return (
    <RestaurantContext.Provider
      value={{
        tables,
        menuItems,
        addTable,
        addMenuItem,
        orderItems,
        setSelectedTable,
        selectedTable,
        clearOrder,
        generateBill,
        getTableStatus,
        getOrderItemsForTable,
        removeItemFromOrder,
        updateOrderItem,
        createOrder,
        loadMenu,
      }}
    >
      {children}
    </RestaurantContext.Provider>
  );
};
