import React, { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { RestaurantContext } from "../../Context/RestaurantContext";
import AddMenuItemModal from "./AddMenuItemModal";
import OrderSummaryPage from "./OrderSummaryPage";

const MenuPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { menuItems, addItemToOrder, addMenuItem, setSelectedTable } =
    useContext(RestaurantContext);

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setSelectedTable(id);
  }, [id, setSelectedTable]);

  const tableMenuItems = useMemo(() => {
    const tableKey = String(id);

    return (menuItems || []).filter((item) => {
      const itemTable = item.table_number ?? item.tableNumber ?? null;
      return String(itemTable || "") === tableKey;
    });
  }, [menuItems, id]);

  const categories = useMemo(
    () => ["All", ...new Set(tableMenuItems.map((item) => item.category))],
    [tableMenuItems]
  );

  const filteredItems = useMemo(() => {
    const byCategory =
      selectedCategory === "All"
        ? tableMenuItems
        : tableMenuItems.filter((item) => item.category === selectedCategory);

    const q = search.trim().toLowerCase();
    if (!q) return byCategory;

    return byCategory.filter((item) =>
      `${item.name} ${item.category}`.toLowerCase().includes(q)
    );
  }, [tableMenuItems, selectedCategory, search]);

  const handleAddDish = async (name, price, category) => {
    await addMenuItem(name, price, category, id);
    setSelectedCategory(category || "All");
    setSearch("");
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">

      <div className="flex justify-between mb-6">

        <h2 className="text-2xl font-bold">
          Table {id} Menu
        </h2>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Add Dish
        </button>

      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search dish..."
        className="border p-2 mb-4 rounded w-60"
      />

      <div className="flex gap-2 mb-4">

        {categories.map((cat) => (

          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-2 rounded ${
              selectedCategory === cat
                ? "bg-blue-600 text-white"
                : "bg-gray-200"
            }`}
          >
            {cat}
          </button>

        ))}

      </div>

      <div className="grid grid-cols-3 gap-4">

        {filteredItems.map((item) => (

          <div
            key={item.id}
            className="border p-4 rounded bg-white"
          >

            <h4 className="font-semibold">
              {item.name}
            </h4>

            <p className="text-green-600">
              ₹{item.price}
            </p>

            <button
              onClick={() => addItemToOrder(item, id)}
              className="mt-2 bg-black text-white px-3 py-1 rounded"
            >
              Add
            </button>

          </div>

        ))}

      </div>

      <OrderSummaryPage tableNo={id} />

      <AddMenuItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddDish}
      />

    </div>
  );
};

export default MenuPage;