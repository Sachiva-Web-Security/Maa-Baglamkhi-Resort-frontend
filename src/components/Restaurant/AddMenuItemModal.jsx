import React, { useState } from "react";

const AddMenuItemModal = ({ isOpen, onClose, onAdd }) => {
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [category, setCategory] = useState("Fast Food");

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!name.trim() || !price) return;

        try {
            await onAdd(name, Number(price), category);

            setName("");
            setPrice("");
            setCategory("Fast Food");

            onClose();

        } catch (error) {
            console.error("Error adding menu item:", error);
            alert(
                error?.response?.data?.detail ||
                error?.response?.data?.message ||
                "Dish save failed. Please try again."
            );
        }
    };

    const categories = ["Fast Food", "Curry", "Sabji", "Roti", "Sweets", "Beverages", "Rice", "South Indian", "Others"];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden transform transition-all">
                <div className="p-6">

                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-white">Add New Dish</h3>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            ✖
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1.5">
                                Dish Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                autoFocus
                                required
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white"
                                placeholder="Enter dish name"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1.5">
                                    Price (₹)
                                </label>
                                <input
                                    type="number"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    required
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white"
                                    placeholder="Price"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1.5">
                                    Category
                                </label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white"
                                >
                                    {categories.map((cat) => (
                                        <option key={cat} value={cat}>
                                            {cat}
                                        </option>
                                    ))}
                                </select>
                            </div>

                        </div>

                        <div className="flex gap-3 mt-6">

                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 rounded-xl"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl"
                            >
                                Save Dish
                            </button>

                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddMenuItemModal;
