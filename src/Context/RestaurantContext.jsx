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
    [],
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
    [getLocalMenuKey],
  );

  const writeLocalTableMenu = useCallback(
    (tableNo, rows) => {
      if (!tableNo || typeof window === "undefined") return;

      try {
        localStorage.setItem(getLocalMenuKey(tableNo), JSON.stringify(rows || []));
      } catch {
        // Ignore local fallback cache failures.
      }
    },
    [getLocalMenuKey],
  );

  const fetchActiveTokenByTable = useCallback(async (tableNo) => {
    if (!tableNo) return null;

    try {
      const res = await API.get(`/token/table/${tableNo}`);
      return res.data?.id ? res.data : null;
    } catch {
      return null;
    }
  }, []);

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
        rows.map(async (table) => {
          let occupied = false;

          try {
            const orderRes = await API.get(`/restaurant/order/${table.name}`);
            if (orderRes.data?.id) {
              occupied = true;
            }
          } catch {
            // Order may not exist yet for this table.
          }

          const activeToken = await fetchActiveTokenByTable(table.name);
          if (activeToken) {
            occupied = true;
          }

          statuses[table.name] = occupied ? "Occupied" : "Available";
        }),
      );

      setTableStatusByNo(statuses);
    } catch (err) {
      console.log("Error loading tables:", err);
      setTables([]);
    }
  }, [fetchActiveTokenByTable]);

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

        localRows.forEach((localRow) => {
          const exists = merged.some(
            (row) =>
              String(row.name).toLowerCase() ===
                String(localRow.name).toLowerCase() &&
              Number(row.price) === Number(localRow.price) &&
              String(row.category || "Others") ===
                String(localRow.category || "Others"),
          );

          if (!exists) {
            merged.push(localRow);
          }
        });

        setMenuItems(merged);
      } catch (err) {
        console.log("Error loading menu:", err);
        setMenuItems(readLocalTableMenu(tableNo));
      }
    },
    [readLocalTableMenu, selectedTable],
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

  const addTable = async (tableNumber) => {
    const normalized = String(tableNumber || "").trim();
    if (!normalized) throw new Error("Table number is required");

    const existing = tables.find((table) => String(table.name) === normalized);
    if (existing) return existing;

    const tempId = `tmp-${Date.now()}`;
    const optimistic = { id: tempId, name: normalized };

    setTables((prev) => [...prev, optimistic]);
    setTableStatusByNo((prev) => ({
      ...prev,
      [normalized]: "Available",
    }));

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

  const addMenuItem = async (name, price, category, tableNoParam) => {
    const resolvedTable = tableNoParam || selectedTable;
    const tableNumber = resolvedTable ? String(resolvedTable) : null;

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
      writeLocalTableMenu(tableNumber, [
        ...readLocalTableMenu(tableNumber),
        localItem,
      ]);
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
        prev.map((item) => (item.id === localItem.id ? persistedItem : item)),
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
