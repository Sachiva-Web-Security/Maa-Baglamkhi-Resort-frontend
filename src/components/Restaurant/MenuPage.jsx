import React, { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { RestaurantContext } from "../../Context/RestaurantContext";
import AddMenuItemModal from "./AddMenuItemModal";
import OrderSummaryPage from "./OrderSummaryPage";

const MenuPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { menuItems, addItemToOrder, addMenuItem, setSelectedTable } = useContext(RestaurantContext);

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
      // On table page, only show records explicitly tied to this table.
      return String(itemTable || "") === tableKey;
    });
  }, [menuItems, id]);

  const categories = useMemo(
    () => ["All", ...new Set(tableMenuItems.map((item) => item.category))],
    [tableMenuItems]
  );

  const filteredItems = useMemo(() => {
    const byCategory = selectedCategory === "All"
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
    <div className="min-h-screen bg-gradient-to-br from-[#071226] via-[#071b2d] to-[#061a2a] text-white p-4 md:p-6">
      <div className="bg-gradient-to-r from-cyan-900/40 to-blue-900/30 border border-cyan-700/30 rounded-3xl p-5 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              onClick={() => navigate("/restaurant")}
              className="mt-1 px-3 py-1.5 rounded-lg bg-slate-900/70 border border-slate-700 hover:bg-slate-800"
            >
              Back
            </button>
            <div>
              <h2 className="text-2xl md:text-3xl font-black">Table {id} Menu</h2>
              <p className="text-slate-300 text-sm">Add dishes, edit dish charges, then create order for kitchen.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate("/kitchen")}
              className="px-4 py-2 rounded-xl border border-cyan-400/40 text-cyan-200 hover:bg-cyan-500/10 font-semibold"
            >
              Open Kitchen Section
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 font-bold"
            >
              Add New Dish
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <div className="bg-white rounded-3xl border border-slate-200/40 p-4 md:p-5 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search dish..."
                className="w-full md:max-w-xs px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800"
              />
              <div className="flex gap-2 overflow-x-auto pb-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-2 rounded-xl text-sm font-semibold whitespace-nowrap border ${
                      selectedCategory === cat
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-700 border-slate-200 hover:border-blue-300"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {filteredItems.length === 0 ? (
              <div className="h-[320px] rounded-2xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-center px-6">
                <div>
                  <div className="text-4xl mb-2">??</div>
                  <p className="text-slate-700 font-bold">No dish found</p>
                  <p className="text-slate-500 text-sm">Try another category or add a new menu item.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4 hover:shadow-lg transition"
                  >
                    <div className="text-[11px] uppercase tracking-wide text-blue-500 font-bold">{item.category}</div>
                    <h4 className="text-slate-900 font-extrabold text-lg mt-1">{item.name}</h4>
                    <p className="text-emerald-600 font-black mt-1">Rs {Number(item.price || 0).toFixed(2)}</p>
                    <button
                      onClick={() => addItemToOrder(item, id)}
                      className="w-full mt-3 py-2 rounded-xl bg-slate-900 text-white font-semibold hover:bg-blue-700"
                    >
                      Add to Order
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="sticky top-24">
            <OrderSummaryPage tableNo={id} />
          </div>
        </div>
      </div>

      <AddMenuItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddDish}
      />
    </div>
  );
};

export default MenuPage;
