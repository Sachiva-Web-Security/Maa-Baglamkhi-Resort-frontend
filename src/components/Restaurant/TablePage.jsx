import React, { useContext, useState } from "react";
import { RestaurantContext } from "../../Context/RestaurantContext";
import TableCard from "./TableCard";
import AddTableModal from "./AddTableModal";

const TablePage = () => {
    const { tables, addItem } = useContext(RestaurantContext);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleAddTable = (tableNumber) => {
        addItem(tableNumber, "table");
    };

    return (
        <div className="p-6 bg-slate-900 min-h-screen">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-3xl font-extrabold text-white tracking-tight">
                        Restaurant Tables
                    </h2>
                    <p className="text-slate-400 mt-1">
                        Manage your restaurant tables and orders
                    </p>
                </div>

                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 group transform active:scale-95"
                >
                    <span className="text-xl group-hover:rotate-90 transition-transform duration-300">
                        ➕
                    </span>
                    Add New Table
                </button>
            </div>

            {/* Grid Section */}
            {tables.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-800/30 border-2 border-dashed border-slate-700 rounded-3xl">
                    <div className="text-6xl mb-4">🍽️</div>
                    <p className="text-slate-400 text-lg font-medium">No Tables Added Yet</p>
                    <p className="text-slate-500 text-sm mt-1">Click the button above to add your first table</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {tables.map((table) => (
                        <TableCard key={table.id} table={table} />
                    ))}
                </div>
            )}

            {/* Modal */}
            <AddTableModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onAdd={handleAddTable}
            />
        </div>
    );
};

export default TablePage;