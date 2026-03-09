import React, { useState, useEffect } from "react";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import CategoryInventory from "./CategoryInventory";

const API = "http://localhost:5002/api/inventory";

export default function InventoryDashboard() {

  const [items, setItems] = useState([]);
  const [categories] = useState([
    "Raw Ingredients",
    "Housekeeping",
    "Beverages"
  ]);

  const [activeView, setActiveView] = useState("dashboard");
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [filterCategory, setFilterCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const token = localStorage.getItem("token");

  // LOAD INVENTORY
  useEffect(() => {
    fetch(API, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => setItems(data));
  }, []);

  // ADD ITEM
  const addItem = async (e) => {
    e.preventDefault();
    const form = e.target;

    const newItem = {
      name: form.name.value,
      category: form.category.value,
      stock: Number(form.stock.value),
      unit: form.unit.value,
      price: Number(form.price.value),
      expiry: form.expiry.value,
      branch: form.branch.value
    };

    const res = await fetch(API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(newItem)
    });

    const data = await res.json();

    setItems([
      ...items,
      { id: data.id, ...newItem }
    ]);

    setShowItemModal(false);
    form.reset();
  };

  // UPDATE ITEM
  const handleUpdateItem = async (id, updatedItem) => {

    await fetch(`${API}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(updatedItem)
    });

    setItems(items.map(i => i.id === id ? { ...i, ...updatedItem } : i));
  };

  // DELETE ITEM
  const handleDeleteItem = async (id) => {

    await fetch(`${API}/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    setItems(items.filter(i => i.id !== id));
  };

  const displayedItems = items.filter(i => {
    const categoryMatch = filterCategory === "All" || i.category === filterCategory;
    const searchMatch = i.name.toLowerCase().includes(searchQuery.toLowerCase());
    return categoryMatch && searchMatch;
  });

  if (activeView !== "dashboard") {
    return (
      <CategoryInventory
        categoryName={activeView}
        items={items}
        onBack={() => setActiveView("dashboard")}
        onAddItem={(item) => setItems([...items, item])}
        onUpdateItem={handleUpdateItem}
        onDeleteItem={handleDeleteItem}
      />
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gray-900 text-white">

      <h1 className="text-3xl font-bold mb-6">
        Inventory Dashboard
      </h1>

      <button
        onClick={() => setShowItemModal(true)}
        className="bg-blue-500 px-4 py-2 rounded mb-4"
      >
        <FaPlus /> Add Item
      </button>

      <input
        placeholder="Search..."
        className="border p-2 mb-4 text-black"
        value={searchQuery}
        onChange={(e)=>setSearchQuery(e.target.value)}
      />

      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th>Name</th>
            <th>Category</th>
            <th>Stock</th>
            <th>Expiry</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>

          {displayedItems.map(item => (

            <tr key={item.id} className="border-b">

              <td>{item.name}</td>
              <td>{item.category}</td>
              <td>{item.stock}</td>
              <td>{item.expiry?.split("T")[0]}</td>

              <td className="flex gap-3">

                <button
                  onClick={()=>setEditingItem(item)}
                >
                  <FaEdit/>
                </button>

                <button
                  onClick={()=>handleDeleteItem(item.id)}
                >
                  <FaTrash/>
                </button>

              </td>

            </tr>

          ))}

        </tbody>
      </table>

      {showItemModal && (

        <div className="fixed inset-0 flex justify-center items-center bg-black/50">

          <form
            onSubmit={addItem}
            className="bg-white text-black p-6 rounded"
          >

            <input name="name" placeholder="Name" className="border p-2 mb-2"/>

            <select name="category" className="border p-2 mb-2">
              {categories.map(c=>(
                <option key={c}>{c}</option>
              ))}
            </select>

            <input name="stock" type="number" placeholder="Stock" className="border p-2 mb-2"/>
            <input name="unit" placeholder="Unit" className="border p-2 mb-2"/>
            <input name="price" type="number" placeholder="Price" className="border p-2 mb-2"/>
            <input name="expiry" type="date" className="border p-2 mb-2"/>

            <select name="branch" className="border p-2 mb-2">
              <option>Main</option>
              <option>Branch 2</option>
            </select>

            <button className="bg-blue-500 text-white px-4 py-2 rounded">
              Save
            </button>

          </form>

        </div>

      )}

    </div>
  );
}