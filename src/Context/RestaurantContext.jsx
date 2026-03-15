import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import API from "../api";

export const RestaurantContext = createContext();

const LOCAL_KEY_PREFIX = "restaurant_menu_table_";

export const RestaurantProvider = ({ children }) => {

  const [tables, setTables] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [ordersByTable, setOrdersByTable] = useState({});
  const [tableStatusByNo, setTableStatusByNo] = useState({});
  const [selectedTable, setSelectedTable] = useState(null);

  const getLocalMenuKey = useCallback(
    (tableNo) => `${LOCAL_KEY_PREFIX}${String(tableNo)}`,
    []
  );

  const readLocalTableMenu = useCallback(
    (tableNo) => {
      if (!tableNo || typeof window === "undefined") return [];
      try {
        const raw = localStorage.getItem(getLocalMenuKey(tableNo));
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    },
    [getLocalMenuKey]
  );

  const writeLocalTableMenu = useCallback(
    (tableNo, rows) => {
      if (!tableNo || typeof window === "undefined") return;
      try {
        localStorage.setItem(
          getLocalMenuKey(tableNo),
          JSON.stringify(rows || [])
        );
      } catch {}
    },
    [getLocalMenuKey]
  );

  // LOAD TABLES
  const loadTables = useCallback(async () => {

    try {

      const res = await API.get("/restaurant/tables");

      const rows = (res.data || []).map((t) => ({
        id: t.id,
        name: String(t.number),
      }));

      setTables(rows);

      const statuses = {};

      await Promise.all(
        rows.map(async (t) => {

          let occupied = false;

          // 🔹 backend order check
          try {
            const orderRes = await API.get(`/restaurant/order/${t.name}`);
            if (orderRes.data) {
              occupied = true;
            }
          } catch {}

          // 🔹 token localStorage check
          try {
            const token = localStorage.getItem(`token-${t.name}`);
            if (token && JSON.parse(token).length > 0) {
              occupied = true;
            }
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

  // LOAD MENU
  const loadMenu = useCallback(
    async (tableNo = selectedTable) => {

      if (!tableNo) {
        setMenuItems([]);
        return;
      }

      try {

        const res = await API.get("/restaurant/menu", {
          params: { tableNumber: String(tableNo) },
        });

        const backendRows = res.data || [];

        const localRows = readLocalTableMenu(tableNo);

        const merged = [...backendRows];

        localRows.forEach((lr) => {

          const exists = merged.some(
            (r) =>
              String(r.name).toLowerCase() ===
                String(lr.name).toLowerCase() &&
              Number(r.price) === Number(lr.price) &&
              String(r.category || "Others") ===
                String(lr.category || "Others")
          );

          if (!exists) merged.push(lr);

        });

        setMenuItems(merged);

      } catch (err) {

        console.log("Error loading menu:", err);
        setMenuItems(readLocalTableMenu(tableNo));

      }

    },
    [readLocalTableMenu, selectedTable]
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

  // 🔴 TOKEN CHANGE LISTENER (Live table status)
  useEffect(() => {

    const refresh = () => loadTables();

    window.addEventListener("tokenUpdated", refresh);

    return () => window.removeEventListener("tokenUpdated", refresh);

  }, [loadTables]);

  // ADD TABLE
  const addTable = async (tableNumber) => {

    const normalized = String(tableNumber || "").trim();

    if (!normalized) throw new Error("Table number is required");

    const existing = tables.find(
      (t) => String(t.name) === normalized
    );

    if (existing) return existing;

    const tempId = `tmp-${Date.now()}`;

    const optimistic = {
      id: tempId,
      name: normalized,
    };

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

  // ADD MENU ITEM
  const addMenuItem = async (name, price, category, tableNoParam) => {

    const resolvedTable = tableNoParam || selectedTable;

    const tableNumber = resolvedTable
      ? String(resolvedTable)
      : null;

    const localItem = {
      id: Date.now(),
      name,
      price: Number(price),
      category: category || "Others",
      table_number: tableNumber,
      _localOnly: true,
    };

    setMenuItems((prev) => [...prev, localItem]);

    if (tableNumber) {

      writeLocalTableMenu(
        tableNumber,
        [...readLocalTableMenu(tableNumber), localItem]
      );

      setTableStatusByNo((prev) => ({
        ...prev,
        [tableNumber]: "Occupied",
      }));

      // 🔴 live dashboard refresh
      window.dispatchEvent(new Event("tokenUpdated"));

    }

    try {

      const res = await API.post("/restaurant/menu", {
        name,
        price: Number(price),
        category: category || "Others",
        tableNumber,
      });

      const persistedItem = {
        id: res.data?.id || localItem.id,
        name,
        price: Number(price),
        category: category || "Others",
        table_number: tableNumber,
      };

      setMenuItems((prev) =>
        prev.map((item) =>
          item.id === localItem.id ? persistedItem : item
        )
      );

      await loadMenu(resolvedTable);

      return persistedItem;

    } catch (err) {

      console.log("Error adding menu item:", err);

      return localItem;

    }

  };

  const clearOrder = (tableNo = selectedTable) => {

    if (!tableNo) return;

    const key = String(tableNo);

    setOrdersByTable((prev) => ({
      ...prev,
      [key]: [],
    }));

    setTableStatusByNo((prev) => ({
      ...prev,
      [key]: "Available",
    }));

  };

  const generateBill = async (billData) => {

    const res = await API.post("/restaurant/bill", billData);

    clearOrder(selectedTable);

    window.dispatchEvent(new Event("tokenUpdated"));

    return res.data;

  };

  const getTableStatus = (tableNo) => {

    const key = String(tableNo || "");

    return tableStatusByNo[key] || "Available";

  };

  const orderItems = useMemo(() => {

    if (!selectedTable) return [];

    return ordersByTable[String(selectedTable)] || [];

  }, [ordersByTable, selectedTable]);

  return (
    <RestaurantContext.Provider
      value={{
        tables,
        menuItems,
        addTable,
        addMenuItem,
        orderItems,
        ordersByTable,
        setSelectedTable,
        selectedTable,
        clearOrder,
        generateBill,
        getTableStatus,
      }}
    >
      {children}
    </RestaurantContext.Provider>
  );

};