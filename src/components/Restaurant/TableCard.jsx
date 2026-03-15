import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { RestaurantContext } from "../../Context/RestaurantContext";

const TableCard = ({ table }) => {

    const navigate = useNavigate();

    const { getTableStatus, setSelectedTable } = useContext(RestaurantContext);

    const status = getTableStatus(table.name);

    const statusClasses =
        status === "Occupied"
            ? "bg-rose-500/20 text-rose-300 border-rose-400/40"
            : "bg-emerald-500/20 text-emerald-300 border-emerald-400/40";

    const handleClick = () => {

        setSelectedTable(table.name);

        navigate(`/restaurant/menu/${table.name}`);

    };

    return (
        <div
            onClick={handleClick}
            className="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-xl cursor-pointer hover:bg-indigo-900 transition-all duration-300 transform hover:-translate-y-1 group"
        >
            <div className="flex flex-col items-center justify-center space-y-3">

                <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center group-hover:bg-indigo-500/30 transition-colors">
                    <span className="text-2xl">🍽️</span>
                </div>

                <div className="text-center">
                    <p className="text-slate-400 text-sm font-medium">
                        Table No
                    </p>

                    <h3 className="text-white text-2xl font-bold">
                        {table.name}
                    </h3>

                    <span
                        className={`inline-flex mt-2 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusClasses}`}
                    >
                        {status}
                    </span>
                </div>

            </div>

            <div className="mt-4 pt-4 border-t border-slate-700/50 flex justify-center">

                <span className="text-indigo-400 text-xs font-semibold uppercase tracking-wider group-hover:text-indigo-300">
                    View Menu
                </span>

            </div>
        </div>
    );
};

export default TableCard;