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

  /* ================= LOAD TABLES ================= */
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
            const tokenRes = await API.get(`/token/table/${t.name}`);
            const tokenId = tokenRes.data?.id || null;
            const tokenItemsRes = tokenId
              ? await API.get(`/token/items/${tokenId}`)
              : { data: [] };
            const hasTokenItems =
              Array.isArray(tokenItemsRes.data) && tokenItemsRes.data.length > 0;

            occupied = hasTokenItems;
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

  /* ================= LOAD MENU ================= */
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

  /* ================= ADD TABLE ================= */
  const addTable = async (tableNumber) => {
    const normalized = String(tableNumber || "").trim();
    if (!normalized) throw new Error("Table number is required");

    const existing = tables.find((t) => String(t.name) === normalized);
    if (existing) return existing;

    const tempId = `tmp-${Date.now()}`;
    const optimistic = { id: tempId, name: normalized };

    setTables((prev) => [...prev, optimistic]);
    setTableStatusByNo((prev) => ({
      ...prev,
      [normalized]: "Available",
    }));

    try {
      const res = await API.post("/restaurant/tables", {
        number: normalized,
      });

      const data = res.data || {};
      const persisted = {
        id: data.id || tempId,
        name: normalized,
      };

      setTables((prev) =>
        prev.map((t) => (t.id === tempId ? persisted : t))
      );

      return persisted;
    } catch (err) {
      console.log("Error adding table:", err);
      return optimistic;
    }
  };

  /* ================= ADD MENU ITEM ================= */
  const addMenuItem = async (name, price, category, tableNoParam) => {
    const resolvedTable = tableNoParam || selectedTable;
    const tableNumber = resolvedTable ? String(resolvedTable) : null;

    if (!tableNumber) {
      throw new Error("Select table first");
    }

    const res = await restaurantService.addMenuItem({
      name,
      price: Number(price),
      category: category || "Others",
      tableNumber,
    });

    await loadMenu(resolvedTable);

    setTableStatusByNo((prev) => ({
      ...prev,
      [tableNumber]: "Occupied",
    }));

    return res;
  };

  /* ================= ORDER ================= */
  const getOrderItemsForTable = useCallback(async (tableNo) => {
    const order = await restaurantService.getPendingOrder(tableNo);
    if (!order?.id) return [];

    const items = await restaurantService.getOrderItems(order.id);

    return items.map((i) => ({
      orderItemId: i.id,
      name: i.name,
      quantity: i.quantity,
      unitPrice: i.price,
      category: i.category,
    }));
  }, []);

  const createOrder = useCallback(
    async ({ waiterName, tableNo, items, prepTimeMinutes, entityType = "Table" }) => {
      let payload = items || [];

      if (payload.length === 0) {
        payload = await getOrderItemsForTable(tableNo);
        payload = payload.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          price: i.unitPrice,
        }));
      }

      if (payload.length === 0) return;

      await restaurantService.createOrder(tableNo, payload);

      await restaurantService.createKitchenOrder({
        table: tableNo,
        waiter: waiterName || "Waiter",
        entityType,
        prepTimeMinutes,
        items: payload,
      });

      await loadTables();
    },
    [getOrderItemsForTable, loadTables]
  );

  const clearOrder = async (tableNo = selectedTable) => {
    setTableStatusByNo((prev) => ({
      ...prev,
      [tableNo]: "Available",
    }));
  };

  const generateBill = async (billData) => {
    const res = await API.post("/restaurant/bill", billData);
    await loadTables();
    window.dispatchEvent(new Event("tokenUpdated"));
    return res.data;
  };

  const getTableStatus = (tableNo) => {
    return tableStatusByNo[String(tableNo)] || "Available";
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
        createOrder,
        loadMenu,
      }}
    >
      {children}
    </RestaurantContext.Provider>
  );
};
