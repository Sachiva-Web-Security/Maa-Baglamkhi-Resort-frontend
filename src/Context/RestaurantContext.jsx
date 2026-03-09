import React, { createContext, useState, useEffect } from "react";

export const RestaurantContext = createContext();

export const RestaurantProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);

  const API = "http://localhost:5002/api/restaurant";

  // LOAD TABLES
  const loadTables = async () => {
    try {
      const res = await fetch(`${API}/tables`);
      const data = await res.json();
      const tables = data.map((t) => ({
        id: t.id,
        name: t.number,
        type: "table"
      }));
      setItems(tables);
    } catch (err) {
      console.log("Error loading tables:", err);
    }
  };

  // LOAD MENU
  const loadMenu = async () => {
    try {
      const res = await fetch(`${API}/menu`);
      const data = await res.json();
      setMenuItems(data);
    } catch (err) {
      console.log("Error loading menu:", err);
    }
  };

  useEffect(() => {
    loadTables();
    loadMenu();
  }, []);

  // ADD TABLE
  const addItem = async (name, type) => {
    if (type !== "table") return;
    try {
      const res = await fetch(`${API}/tables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: name })
      });
      const data = await res.json();
      const newItem = {
        id: data.id || Date.now(),
        name,
        type: "table"
      };
      setItems((prev) => [...prev, newItem]);
    } catch (err) {
      console.log("Error adding table:", err);
    }
  };

  // ADD MENU ITEM
  const addMenuItem = async (name, price, category) => {
    try {
      const res = await fetch(`${API}/menu`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, price, category })
      });
      const data = await res.json();
      const newItem = {
        id: data.id || Date.now(),
        name,
        price: parseFloat(price),
        category
      };
      setMenuItems((prev) => [...prev, newItem]);
    } catch (err) {
      console.log("Error adding menu item:", err);
    }
  };

  // ORDER
  const addItemToOrder = async (item) => {
    const newItem = { ...item, orderItemId: Date.now() };
    setOrderItems((prev) => [...prev, newItem]);

    if (!selectedTable) return;

    try {
      await fetch(`${API}/order/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableNumber: selectedTable,
          item: item // passing the whole item as expected by backend
        })
      });
    } catch (err) {
      console.log("Error adding order item:", err);
    }
  };

  // BILLING
  const generateBill = async (billData) => {
    try {
      const res = await fetch(`${API}/bill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(billData)
      });
      const data = await res.json();
      clearOrder();
      return data;
    } catch (err) {
      console.log("Error generating bill:", err);
      throw err;
    }
  };

  const removeItemFromOrder = (orderItemId) => {
    setOrderItems((prev) => prev.filter((item) => item.orderItemId !== orderItemId));
  };

  const clearOrder = () => {
    setOrderItems([]);
  };

  return (
    <RestaurantContext.Provider
      value={{
        items,
        tables: items.filter((i) => i.type === "table"),
        menuItems,
        addItem,
        addMenuItem,
        orderItems,
        addItemToOrder,
        removeItemFromOrder,
        clearOrder,
        selectedTable,
        setSelectedTable,
        generateBill
      }}
    >
      {children}
    </RestaurantContext.Provider>
  );
};