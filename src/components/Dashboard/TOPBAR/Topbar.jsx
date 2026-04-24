import { HiOutlineBell, HiOutlineClipboardDocumentList } from "react-icons/hi2";
import { FiSearch } from "react-icons/fi";
import { useState } from "react";

const TopBar = () => {
    const [search, setSearch] = useState("");

    const handleSearch = (e) => {
        if (e.key === "Enter") {
            console.log("Search:", search);
        }
    };

    return (
        <div className="flex w-full flex-col gap-3 rounded-2xl border border-slate-700 bg-slate-900/80 px-3 py-3 shadow-lg backdrop-blur-md sm:px-5 md:flex-row md:items-center md:justify-between">

            {/* Search */}
            <div className="flex w-full min-w-0 items-center rounded-xl bg-slate-800 px-4 py-2 transition-all focus-within:ring-2 focus-within:ring-blue-500 md:max-w-[320px]">

                <FiSearch className="text-gray-400 text-lg mr-3" />

                <input
                    type="text"
                    placeholder="Search anything..."
                    className="bg-transparent outline-none text-white w-full placeholder-gray-400"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={handleSearch}
                />
            </div>

            {/* Icons */}
            <div className="flex items-center justify-end gap-3 text-xl text-white sm:gap-6">

                {/* Notifications */}
                <div className="relative group cursor-pointer">
                    <div className="p-2 rounded-xl bg-slate-800 hover:bg-blue-600 transition-all">
                        <HiOutlineBell />
                    </div>

                    <span className="absolute -top-2 -right-2 text-xs bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full px-1.5 py-0.5">
                        8
                    </span>
                </div>

                {/* Tasks */}
                <div className="relative group cursor-pointer">
                    <div className="p-2 rounded-xl bg-slate-800 hover:bg-purple-600 transition-all">
                        <HiOutlineClipboardDocumentList />
                    </div>

                    <span className="absolute -top-2 -right-2 text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full px-1.5 py-0.5">
                        8
                    </span>
                </div>

            </div>

        </div>
    );
};

export default TopBar;
