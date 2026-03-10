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

  const getLocalMenuKey = useCallback((tableNo) => `${LOCAL_KEY_PREFIX}${String(tableNo)}`, []);

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
        localStorage.setItem(getLocalMenuKey(tableNo), JSON.stringify(rows || []));
      } catch {
        // ignore local storage failures
      }
    },
    [getLocalMenuKey]
  );

  const loadTables = useCallback(async () => {
    try {
      const res = await API.get("/restaurant/tables");
      const rows = (res.data || []).map((t) => ({ id: t.id, name: String(t.number) }));
      setTables(rows);

      const statuses = {};
      await Promise.all(
        rows.map(async (t) => {
          try {
            const orderRes = await API.get(`/restaurant/order/${t.name}`);
            statuses[t.name] = orderRes.data ? "Occupied" : "Available";
          } catch {
            statuses[t.name] = "Available";
          }
        })
      );
      setTableStatusByNo(statuses);
    } catch (err) {
      console.log("Error loading tables:", err);
      setTables([]);
    }
  }, []);

  const loadMenu = useCallback(
    async (tableNo = selectedTable) => {
      if (!tableNo) {
        setMenuItems([]);
        return;
      }

      try {
        const res = await API.get("/restaurant/menu", { params: { tableNumber: String(tableNo) } });
        const backendRows = res.data || [];
        const localRows = readLocalTableMenu(tableNo);

        const merged = [...backendRows];
        localRows.forEach((lr) => {
          const exists = merged.some(
            (r) =>
              String(r.name).toLowerCase() === String(lr.name).toLowerCase() &&
              Number(r.price) === Number(lr.price) &&
              String(r.category || "Others") === String(lr.category || "Others")
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
      setTables((prev) => prev.map((t) => (t.id === tempId ? persisted : t)));
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
      writeLocalTableMenu(tableNumber, [...readLocalTableMenu(tableNumber), localItem]);
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

      setMenuItems((prev) => prev.map((item) => (item.id === localItem.id ? persistedItem : item)));
      if (tableNumber) {
        writeLocalTableMenu(
          tableNumber,
          readLocalTableMenu(tableNumber).map((item) => (item.id === localItem.id ? persistedItem : item))
        );
      }

      await loadMenu(resolvedTable);
      return persistedItem;
    } catch (err) {
      console.log("Error adding menu item:", err);
      return localItem;
    }
  };

  const setCurrentTableOrder = (updater, tableNo = selectedTable) => {
    if (!tableNo) return;
    const key = String(tableNo);
    setOrdersByTable((prev) => {
      const existing = prev[key] || [];
      const next = typeof updater === "function" ? updater(existing) : updater;
      setTableStatusByNo((statusPrev) => ({ ...statusPrev, [key]: next.length ? "Occupied" : "Available" }));
      return { ...prev, [key]: next };
    });
  };

  const getOrderItemsForTable = (tableNo) => {
    if (!tableNo) return [];
    return ordersByTable[String(tableNo)] || [];
  };

  const addItemToOrder = (item, tableNoParam) => {
    const tableNo = String(tableNoParam || selectedTable || "");
    if (!tableNo) return;

    const newOrderItemId = Date.now() + Math.floor(Math.random() * 1000);
    setCurrentTableOrder((existing) => {
      const found = existing.find((i) => i.id === item.id || i.name === item.name);
      if (!found) {
        return [
          ...existing,
          {
            orderItemId: newOrderItemId,
            id: item.id,
            name: item.name,
            category: item.category || "Others",
            quantity: 1,
            unitPrice: Number(item.price) || 0,
          },
        ];
      }
      return existing.map((i) =>
        i.orderItemId === found.orderItemId ? { ...i, quantity: Math.max(1, Number(i.quantity || 1) + 1) } : i
      );
    }, tableNo);
  };

  const updateOrderItem = (orderItemId, patch, tableNoParam) => {
    const tableNo = String(tableNoParam || selectedTable || "");
    if (!tableNo) return;

    setCurrentTableOrder(
      (existing) =>
        existing.map((i) => {
          if (i.orderItemId !== orderItemId) return i;
          const next = { ...i, ...patch };
          return {
            ...next,
            quantity: Math.max(1, Number(next.quantity) || 1),
            unitPrice: Math.max(0, Number(next.unitPrice) || 0),
          };
        }),
      tableNo
    );
  };

  const removeItemFromOrder = (orderItemId, tableNoParam) => {
    const tableNo = String(tableNoParam || selectedTable || "");
    if (!tableNo) return;
    setCurrentTableOrder((existing) => existing.filter((i) => i.orderItemId !== orderItemId), tableNo);
  };

  const clearOrder = (tableNo = selectedTable) => {
    if (!tableNo) return;
    const key = String(tableNo);
    setOrdersByTable((prev) => ({ ...prev, [key]: [] }));
    setTableStatusByNo((prev) => ({ ...prev, [key]: "Available" }));
  };

  const createOrder = async ({ waiterName, tableNo: tableNoParam }) => {
    const tableNo = String(tableNoParam || selectedTable || "");
    if (!tableNo) throw new Error("No table selected");

    const items = getOrderItemsForTable(tableNo);
    if (!items.length) throw new Error("Order is empty");

    const normalizedItems = items.map((i) => ({
      id: i.id,
      name: i.name,
      category: i.category || "Others",
      quantity: Math.max(1, Number(i.quantity) || 1),
      price: Math.max(0, Number(i.unitPrice) || 0),
    }));

    for (const item of normalizedItems) {
      await API.post("/restaurant/order/add", {
        tableNumber: tableNo,
        item,
      });
    }

    await API.post("/kitchen/order", {
      table: tableNo,
      waiter: waiterName || "Waiter",
      items: normalizedItems,
    });

    setTableStatusByNo((prev) => ({ ...prev, [tableNo]: "Occupied" }));
    return { message: "Order sent to kitchen successfully" };
  };

  const generateBill = async (billData) => {
    const res = await API.post("/restaurant/bill", billData);
    clearOrder(selectedTable);
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
        getOrderItemsForTable,
        addItemToOrder,
        updateOrderItem,
        removeItemFromOrder,
        clearOrder,
        selectedTable,
        setSelectedTable,
        createOrder,
        generateBill,
        getTableStatus,
      }}
    >
      {children}
    </RestaurantContext.Provider>
  );
};
