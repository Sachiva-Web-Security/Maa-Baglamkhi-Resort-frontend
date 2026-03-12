import React, { createContext, useState } from "react";

export const RestaurantContext = createContext();

export const RestaurantProvider = ({ children }) => {

  const [tables, setTables] = useState([
    { id: 1, name: "1", occupied: false },
    { id: 2, name: "2", occupied: false },
    { id: 3, name: "3", occupied: false }
  ]);

  const addTable = (name) => {
    setTables([...tables, { id: Date.now(), name, occupied: false }]);
  };

  return (
    <RestaurantContext.Provider
      value={{
        tables,
        addTable
      }}
    >
      {children}
    </RestaurantContext.Provider>
  );
};