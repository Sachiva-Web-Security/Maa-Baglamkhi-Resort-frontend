import React, { createContext, useState, useEffect } from "react";

export const RestaurantContext = createContext();

export const RestaurantProvider = ({ children }) => {
  // --- Tables/Rooms State ---
  const [items, setItems] = useState(
    JSON.parse(localStorage.getItem("restaurantItems")) || []
  );

  // --- Menu Items State ---
  const defaultMenu = [
    { id: 1, name: "Margherita Pizza", price: 299, category: "Main Course" },
    { id: 2, name: "Paneer Tikka", price: 250, category: "Starters" },
    { id: 3, name: "Veg Hakka Noodles", price: 180, category: "Main Course" },
    { id: 4, name: "Cold Coffee", price: 120, category: "Beverages" },
    { id: 5, name: "Gulab Jamun (2pcs)", price: 80, category: "Desserts" },
    { id: 6, name: "Chicken Momos (6pcs)", price: 210, category: "Starters" },
    { id: 7, name: "Butter Chicken", price: 450, category: "Main Course" },
    { id: 8, name: "Masala Chai", price: 40, category: "Beverages" },
  ];

  const [menuItems, setMenuItems] = useState(
    JSON.parse(localStorage.getItem("menuItems")) || defaultMenu
  );

  const [selectedTable, setSelectedTable] = useState(null);
  const [orderItems, setOrderItems] = useState([]);

  useEffect(() => {
    localStorage.setItem("restaurantItems", JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem("menuItems", JSON.stringify(menuItems));
  }, [menuItems]);

  // --- Actions ---
  const addItem = (name, type) => {
    const newItem = {
      id: Date.now(),
      name,
      type // "table" or "room"
    };
    setItems((prev) => [...prev, newItem]);
  };

  const addMenuItem = (name, price, category) => {
    const newItem = {
      id: Date.now(),
      name,
      price: parseFloat(price),
      category
    };
    setMenuItems((prev) => [...prev, newItem]);
  };

  const removeMenuItem = (id) => {
    setMenuItems((prev) => prev.filter(item => item.id !== id));
  };

  const addItemToOrder = (item) => {
    setOrderItems((prev) => [...prev, { ...item, orderItemId: Date.now() }]);
  };

  const removeItemFromOrder = (orderItemId) => {
    setOrderItems((prev) => prev.filter(item => item.orderItemId !== orderItemId));
  };

  const clearOrder = () => {
    setOrderItems([]);
  };

  return (
    <RestaurantContext.Provider
      value={{
        items,
        addItem,
        tables: items.filter((item) => item.type === "table"),
        rooms: items.filter((item) => item.type === "room"),
        menuItems,
        addMenuItem,
        removeMenuItem,
        selectedTable,
        setSelectedTable,
        orderItems,
        addItemToOrder,
        removeItemFromOrder,
        clearOrder
      }}
    >
      {children}
    </RestaurantContext.Provider>
  );
};