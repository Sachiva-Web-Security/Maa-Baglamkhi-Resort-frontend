import React, { useContext, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { RestaurantContext } from "../../Context/RestaurantContext";
import AddMenuItemModal from "./AddMenuItemModal";
import OrderSummaryPage from "./OrderSummaryPage";
import { useEffect } from "react";
const MenuPage = () => {
    const { id } = useParams();
    const { setSelectedTable } = useContext(RestaurantContext);

useEffect(() => {
    setSelectedTable(id);
}, [id]);
    const navigate = useNavigate();
    const { menuItems, addItemToOrder, addMenuItem } = useContext(RestaurantContext);
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [isModalOpen, setIsModalOpen] = useState(false);

    const categories = ["All", ...new Set(menuItems.map((item) => item.category))];

    const filteredItems =
        selectedCategory === "All"
            ? menuItems
            : menuItems.filter((item) => item.category === selectedCategory);

    return (
        <div className="p-4 md:p-6 bg-slate-900 min-h-screen text-white">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate("/restaurant")}
                        className="p-2 hover:bg-slate-800 rounded-full transition-colors"
                    >
                        ⬅️
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold">Table No: {id}</h2>
                        <p className="text-slate-400 text-sm">Select items from the menu</p>
                    </div>
                </div>

                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 transform active:scale-95"
                >
                    ➕ Add New Dish
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Menu Section */}
                <div className="lg:col-span-2">
                    {/* Categories */}
                    <div className="flex gap-2 overflow-x-auto pb-4 mb-6 no-scrollbar">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-4 py-2 rounded-xl border whitespace-nowrap transition-all ${selectedCategory === cat
                                        ? "bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-600/30"
                                        : "bg-slate-800 border-slate-700 hover:border-slate-500"
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Items Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {filteredItems.map((item) => (
                            <div
                                key={item.id}
                                className="bg-slate-800 border border-slate-700/50 p-4 rounded-2xl flex justify-between items-center group hover:border-indigo-500 transition-all"
                            >
                                <div>
                                    <h4 className="font-bold text-lg group-hover:text-indigo-400 transition-colors">{item.name}</h4>
                                    <p className="text-emerald-400 font-bold">₹{item.price}</p>
                                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{item.category}</span>
                                </div>
                                <button
                                    onClick={() => addItemToOrder(item)}
                                    className="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white w-10 h-10 rounded-xl flex items-center justify-center transition-all font-bold text-xl active:scale-90"
                                >
                                    +
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Order Summary Section */}
                <div className="lg:col-span-1">
                    <div className="sticky top-24">
                        <OrderSummaryPage />
                    </div>
                </div>
            </div>

            {/* Add Item Modal */}
            <AddMenuItemModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onAdd={addMenuItem}
            />
        </div>
    );
};

export default MenuPage;