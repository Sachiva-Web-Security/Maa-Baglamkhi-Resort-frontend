import React, { useState, useEffect, useMemo } from "react";
import { housekeepingService } from "../services/housekeepingService";
import { userService } from "../services/userService";

import {
  FaSearch,
  FaFilePdf,
  FaTimes,
  FaBroom,
  FaCheck,
  FaBed,
} from "react-icons/fa";

import HousekeepingRow from "../components/Housekeeping/HousekeepingRow";

const initialData = [
  {
    id: 1,
    selected: false,
    type: "Accommodation",
    roomNo: "100",
    guestStatus: "",
    roomType: "Executive King Room",
    status: "Vacant Dirty",
    assignee: "No Housekeeper",
    notes: false,
  },
];

const allColumns = [
  { key: "type", label: "Type", required: true },
  { key: "roomNo", label: "Room No. / Name", required: true },
  { key: "guestStatus", label: "Guest Status" },
  { key: "roomType", label: "Room Type" },
  { key: "status", label: "Status" },
  { key: "assignee", label: "Assignee" },
  { key: "notes", label: "Notes" },
];

const todayISO = () => new Date().toISOString().slice(0, 10);

function Housekeeping() {
  const [data, setData] = useState(initialData);
  const [housekeepers, setHousekeepers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRoomNo, setNewRoomNo] = useState("");
  const [selectAll, setSelectAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleColumns, setVisibleColumns] = useState(
    allColumns.map((col) => col.key)
  );

  useEffect(() => {
    fetchRooms();
    fetchHousekeepers();
  }, []);

  const handleAddRoom = () => {
    if (!newRoomNo.trim()) return;

    const newRoom = {
      id: Date.now(),
      selected: false,
      type: "Accommodation",
      roomNo: newRoomNo.trim(),
      guestStatus: "-",
      roomType: "Standard Room",
      status: "Vacant Dirty",
      assignee: "No Housekeeper",
      notes: false,
    };

    setData((prev) => [...prev, newRoom]);
    setNewRoomNo("");
    setShowAddModal(false);
  };

  const fetchHousekeepers = async () => {
    try {
      const users = await userService.getAllUsers();
      const hk = users.filter(
        (u) => u.role && u.role.toLowerCase().includes("housekeeping")
      );
      setHousekeepers((hk.length ? hk : users).map((u) => u.name));
    } catch (err) {
      console.error("Housekeeper load error", err);
    }
  };

  const fetchRooms = async () => {
    try {
      const rooms = await housekeepingService.getAllRooms();
      const today = todayISO();

      const mapped = rooms.map((room) => {
        let guestStatus = "-";

        if (room.hotelStatus === "occupied") {
          if (room.checkOut === today) guestStatus = "Departs today";
          else if (room.checkIn === today) guestStatus = "Arrives today";
          else guestStatus = "Occupied";
        }

        return {
          id: room.id,
          selected: false,
          type: "Accommodation",
          roomNo: room.roomNo,
          guestStatus,
          roomType: room.roomType || "Standard Room",
          status: room.status || "Vacant Dirty",
          assignee: room.assignee || "No Housekeeper",
          notes: false,
        };
      });

      setData(mapped.length ? mapped : initialData);
    } catch (err) {
      console.error("Room load error", err);
    }
  };

  const handleSelectChange = (id, checked) => {
    setData((prev) =>
      prev.map((r) => (r.id === id ? { ...r, selected: checked } : r))
    );
  };

  const handleSelectAll = (checked) => {
    setSelectAll(checked);
    setData((prev) => prev.map((r) => ({ ...r, selected: checked })));
  };

  const handleStatusChange = async (id, status) => {
    try {
      await housekeepingService.updateRoomStatus(id, status);
      setData((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssigneeChange = async (id, assignee) => {
    try {
      await housekeepingService.updateRoomAssignee(id, assignee);
      setData((prev) =>
        prev.map((r) => (r.id === id ? { ...r, assignee } : r))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const filteredData = data.filter((r) =>
    r.roomNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const roomsToClean = filteredData.filter((r) =>
    r.status.toLowerCase().includes("dirty")
  ).length;

  const roomsInspected = filteredData.filter((r) =>
    r.status.toLowerCase().includes("inspected")
  ).length;

  const occupiedRooms = filteredData.filter((r) =>
    r.status.toLowerCase().includes("occupied")
  ).length;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">

      <h1 className="text-2xl font-bold mb-4">Housekeeping</h1>

      {/* Search */}
      <div className="flex gap-3 mb-4">
        <div className="relative w-full">
          <FaSearch className="absolute left-3 top-3 text-gray-400" />
          <input
            className="w-full pl-10 py-2 rounded bg-slate-800"
            placeholder="Search room..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-teal-600 px-4 py-2 rounded"
        >
          + Add Room
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-orange-900 p-4 rounded">
          <FaBroom /> Rooms to Clean: {roomsToClean}
        </div>

        <div className="bg-green-900 p-4 rounded">
          <FaCheck /> Inspected: {roomsInspected}
        </div>

        <div className="bg-purple-900 p-4 rounded">
          <FaBed /> Occupied: {occupiedRooms}
        </div>
      </div>

      {/* Table */}
      <table className="w-full bg-slate-800 rounded">
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={selectAll}
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
            </th>

            {visibleColumns.map((col) => (
              <th key={col} className="p-3 text-left">
                {col}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {filteredData.map((room) => (
            <HousekeepingRow
              key={room.id}
              item={room}
              visibleColumns={visibleColumns}
              onSelectChange={handleSelectChange}
              onStatusChange={handleStatusChange}
              onAssigneeChange={handleAssigneeChange}
              assigneeOptions={["No Housekeeper", ...housekeepers]}
            />
          ))}
        </tbody>
      </table>

      {/* Add Room Modal */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70">
          <div className="bg-slate-800 p-6 rounded w-96">

            <h2 className="text-lg mb-4">Add Room</h2>

            <input
              className="w-full p-2 rounded bg-slate-700 mb-4"
              placeholder="Room Number"
              value={newRoomNo}
              onChange={(e) => setNewRoomNo(e.target.value)}
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="bg-gray-600 px-4 py-2 rounded"
              >
                Cancel
              </button>

              <button
                onClick={handleAddRoom}
                className="bg-teal-600 px-4 py-2 rounded"
              >
                Add
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default Housekeeping;