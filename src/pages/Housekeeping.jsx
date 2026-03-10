import React, { useState, useEffect, useMemo } from 'react';
import { housekeepingService } from '../services/housekeepingService';
import { userService } from '../services/userService';
import { hotelService } from '../services/hotelService';
import { FaSearch, FaFilePdf, FaChevronUp, FaTimes, FaExclamationCircle, FaBroom, FaCheck, FaBed } from 'react-icons/fa';
import HousekeepingRow from '../components/Housekeeping/HousekeepingRow';

const initialData = [
  {
    id: 1,
    selected: false,
    type: 'Accommodation',
    roomNo: '100',
    building: '',
    floor: '',
    section: '',
    guestStatus: '',
    roomType: 'Executive King Room',
    status: 'Vacant Dirty',
    assignee: 'No Housekeeper',
    layout: '',
    articles: '',
    services: '',
    notes: false,
  },
  {
    id: 2,
    selected: false,
    type: 'Accommodation',
    roomNo: '3',
    building: '',
    floor: '',
    section: '',
    guestStatus: '',
    roomType: 'King Room with seaview',
    status: 'Vacant Clean Inspected',
    assignee: 'No Housekeeper',
    layout: '',
    articles: '',
    services: '',
    notes: false,
  },
  {
    id: 3,
    selected: false,
    type: 'Accommodation',
    roomNo: '4',
    building: '',
    floor: '',
    section: '',
    guestStatus: 'Arrives today',
    roomType: 'Suite',
    status: 'Occupied Dirty',
    assignee: 'No Housekeeper',
    layout: '',
    articles: '',
    services: '',
    notes: true,
  },
  {
    id: 4,
    selected: false,
    type: 'Accommodation',
    roomNo: '5',
    building: '',
    floor: '',
    section: '',
    guestStatus: '',
    roomType: 'Executive King Room',
    status: 'Vacant Dirty',
    assignee: 'No Housekeeper',
    layout: '',
    articles: '',
    services: '',
    notes: false,
  },
  {
    id: 5,
    selected: false,
    type: 'Accommodation',
    roomNo: '6',
    building: '',
    floor: '',
    section: '',
    guestStatus: 'Arrives today',
    roomType: 'Standard Room',
    status: 'Occupied Clean',
    assignee: 'No Housekeeper',
    layout: '',
    articles: '',
    services: '',
    notes: true,
  },
  {
    id: 6,
    selected: false,
    type: 'Accommodation',
    roomNo: '7',
    building: '',
    floor: '',
    section: '',
    guestStatus: '',
    roomType: 'Standard Room',
    status: 'Vacant Dirty',
    assignee: 'No Housekeeper',
    layout: '',
    articles: '',
    services: '',
    notes: false,
  },
];

const allColumns = [
  { key: 'type', label: 'Type', required: true },
  { key: 'roomNo', label: 'Room No. / Name', required: true },
  { key: 'building', label: 'Building', required: false },
  { key: 'floor', label: 'Floor', required: false },
  { key: 'section', label: 'Section', required: false },
  { key: 'guestStatus', label: 'Guest Status', required: false },
  { key: 'roomType', label: 'Room Type', required: false },
  { key: 'status', label: 'Status', required: false },
  { key: 'assignee', label: 'Assignee', required: false },
  { key: 'layout', label: 'Layout', required: false },
  { key: 'articles', label: 'Articles', required: false },
  { key: 'services', label: 'Services', required: false },
  { key: 'notes', label: 'Notes', required: false },
];

const todayISO = () => new Date().toISOString().slice(0, 10);

function Housekeeping() {
  const [data, setData] = useState([]);
  const [housekeepers, setHousekeepers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRoomNo, setNewRoomNo] = useState('');
  const [selectAll, setSelectAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [housekeeperFilter, setHousekeeperFilter] = useState('All Housekeeper');
  const [roomTypeTab, setRoomTypeTab] = useState('Accommodation Rooms');
  const [showColumns, setShowColumns] = useState(true);
  const [visibleColumns, setVisibleColumns] = useState(
    allColumns.map(col => col.key)
  );

  useEffect(() => {
    fetchRooms();
    fetchHousekeepers();
  }, []);

  useEffect(() => {
    const timer = setInterval(fetchRooms, 15000);
    return () => clearInterval(timer);
  }, []);

  const handleAddRoom = async () => {
    if (!newRoomNo.trim()) return;
    try {
      await hotelService.addRoom(newRoomNo.trim());
      setShowAddModal(false);
      setNewRoomNo('');
      fetchRooms();
    } catch (error) {
      console.error("Error creating room", error);
      if (error?.response?.data?.message) {
        alert(error.response.data.message);
      }
    }
  };

  const fetchHousekeepers = async () => {
    try {
      const users = await userService.getAllUsers();
      // Filter for users with role 'housekeeping' if the role exists, else grab all names to be safe.
      // Assumes the role column might be 'housekeeping' or similar. 
      // If roles aren't strictly used, just map the names.
      const hkUsers = users.filter(u => u.role && u.role.toLowerCase().includes('housekeeping'));

      // Fallback: If no users have the 'housekeeping' role, we just provide all users as an option
      const finalHousekeepers = hkUsers.length > 0 ? hkUsers : users;

      setHousekeepers(finalHousekeepers.map(u => u.name));
    } catch (error) {
      console.error("Error fetching housekeepers", error);
    }
  };

  const fetchRooms = async () => {
    try {
      const rooms = await housekeepingService.getAllRooms();
      const today = todayISO();

      const mappedRooms = rooms.map(room => {
        let guestStatus = '-';
        if (String(room.hotelStatus || '').toLowerCase() === 'occupied') {
          if (room.checkOut === today) guestStatus = 'Departs today';
          else if (room.checkIn === today) guestStatus = 'Arrives today';
          else guestStatus = 'Occupied';
        }
        return {
          id: room.id || room.roomNo,
          selected: false,
          type: 'Accommodation',
          roomNo: room.roomNo || 'N/A',
          building: '-',
          floor: '-',
          section: '-',
          guestStatus: guestStatus || '-',
          roomType: String(room.hotelStatus || '').toLowerCase() === 'occupied' ? 'Occupied Room' : 'Available Room',
          status: room.status || 'Vacant Dirty',
          assignee: room.assignee || 'No Housekeeper',
          layout: '',
          articles: '',
          services: '',
          notes: false,
        };
      });
      setData(mappedRooms);
    } catch (error) {
      console.error("Error fetching rooms", error);
    }
  };

  const selectedCount = data.filter(item => item.selected).length;

  const handleSelectChange = (id, checked) => {
    setData(prev =>
      prev.map(item => (item.id === id ? { ...item, selected: checked } : item))
    );
  };

  const handleSelectAll = checked => {
    setSelectAll(checked);
    setData(prev => prev.map(item => ({ ...item, selected: checked })));
  };

  const handleStatusChange = async (id, status) => {
    try {
      await housekeepingService.updateRoomStatus(id, status);
      setData(prev =>
        prev.map(item => (item.id === id ? { ...item, status } : item))
      );
    } catch (error) {
      console.error("Error updating status", error);
    }
  };

  const handleAssigneeChange = async (id, assignee) => {
    try {
      await housekeepingService.updateRoomAssignee(id, assignee);
      setData(prev =>
        prev.map(item => (item.id === id ? { ...item, assignee } : item))
      );
    } catch (error) {
      console.error("Error updating assignee", error);
    }
  };

  const housekeeperStatuses = useMemo(() => {
    const statuses = {};
    housekeepers.forEach(hk => {
      const hasUncompleted = data.some(room =>
        room.assignee === hk &&
        !room.status.toLowerCase().includes('clean') &&
        room.status !== 'Out of Service'
      );
      statuses[hk] = hasUncompleted ? 'BUSY' : 'AVAILABLE';
    });
    return statuses;
  }, [data, housekeepers]);


  const toggleColumn = (columnKey) => {
    const column = allColumns.find(col => col.key === columnKey);
    if (column && column.required) return; // Don't allow hiding required columns

    setVisibleColumns(prev =>
      prev.includes(columnKey)
        ? prev.filter(key => key !== columnKey)
        : [...prev, columnKey]
    );
  };

  const filteredData = data.filter(item => {
    const matchesSearch = searchQuery === '' ||
      item.roomNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.roomType.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesHousekeeper = housekeeperFilter === 'All Housekeeper' ||
      item.assignee === housekeeperFilter;

    const matchesRoomType = roomTypeTab === 'Accommodation Rooms' ||
      roomTypeTab === 'Event Rooms';

    return matchesSearch && matchesHousekeeper && matchesRoomType;
  });

  // summary counts based on filtered data
  const roomsToClean = filteredData.filter(item =>
    item.status.toLowerCase().includes('dirty')
  ).length;
  const roomsInspected = filteredData.filter(item =>
    item.status.toLowerCase().includes('inspected')
  ).length;
  const occupiedRooms = filteredData.filter(item =>
    item.status.toLowerCase().includes('occupied')
  ).length;

  return (
    <div className="min-h-screen w-280 pt-[100px] px-[30px] pb-[30px] bg-gradient-to-br from-[#071226] via-[#081827] to-[#041019] text-gray-100">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl pl-100 font-semibold text-white mb-1">Housekeeping</h1>
        <div className="text-sm pl-100 text-gray-300">Home / Housekeeping</div>
      </div>

      {/* Top Control Bar */}
      <div className="bg-gradient-to-b from-[#0f1a2b] to-[#0b1622] rounded-lg shadow-lg border border-white/5 p-4 mb-4">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(240px,1fr)_auto_260px_auto] gap-3 items-center">
          {/* Search Bar */}
          <div className="relative w-full">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search rooms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-teal-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400 bg-transparent text-gray-100"
            />
          </div>

          {/* Hide Columns Shortcut */}
          <div className="flex justify-center lg:justify-start">
            <button
              onClick={() => setShowColumns(!showColumns)}
              className="px-4 py-2 bg-transparent border border-white/10 text-white rounded-lg text-sm font-medium hover:bg-white/5 transition-colors"
            >
              {showColumns ? 'Hide Columns' : 'Show Columns'}
            </button>
          </div>

          {/* Housekeeper Filter */}
          <div className="w-full">
            <select
              value={housekeeperFilter}
              onChange={(e) => setHousekeeperFilter(e.target.value)}
              className="w-full px-4 py-2 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-900 bg-transparent text-white"
            >
              <option className="bg-[#071826]" value="All Housekeeper">All Housekeeper</option>
              {housekeepers.map(hk => (
                <option key={hk} className="bg-[#071826]" value={hk}>{hk}</option>
              ))}
            </select>
          </div>

          {/* Export PDF Button */}
          <div className="flex lg:justify-end gap-2 mt-3 lg:mt-0">
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full lg:w-auto flex items-center justify-center gap-2 px-5 py-2 bg-gradient-to-r from-teal-500 to-teal-700 text-white rounded-lg hover:opacity-95 transition"
            >
              <span className="text-sm font-medium">+ Add Room</span>
            </button>
            <button className="w-full lg:w-auto flex items-center justify-center gap-2 px-5 py-2 bg-gradient-to-r from-[#10b981] to-[#06b6d4] text-white rounded-lg hover:opacity-95 transition">
              <FaFilePdf />
              <span className="text-sm font-medium">Export PDF</span>
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-300">Selected: {selectedCount}</span>
          </div>

          {/* Room Type Tabs */}
          <div className="inline-flex rounded-lg border border-white/5 overflow-hidden w-full md:w-auto bg-transparent">
            <button
              onClick={() => setRoomTypeTab('Accommodation Rooms')}
              className={`flex-1 md:flex-none px-4 py-2 text-sm font-medium transition-colors ${roomTypeTab === 'Accommodation Rooms'
                  ? 'bg-white/5 text-white'
                  : 'bg-transparent text-gray-300 hover:bg-white/5'
                }`}
            >
              Accommodation Rooms
            </button>
            <button
              onClick={() => setRoomTypeTab('Event Rooms')}
              className={`flex-1 md:flex-none px-4 py-2 text-sm font-medium transition-colors border-l border-white/5 ${roomTypeTab === 'Event Rooms'
                  ? 'bg-white/5 text-white'
                  : 'bg-transparent text-gray-300 hover:bg-white/5'
                }`}
            >
              Event Rooms
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-[#2b1210] border border-white/5">
            <div className="p-2 bg-orange-500 text-white rounded-full">
              <FaBroom />
            </div>
            <div>
              <div className="text-sm text-orange-300">Rooms to Clean</div>
              <div className="text-xl font-semibold text-white">{roomsToClean}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-[#102214] border border-white/5">
            <div className="p-2 bg-green-500 text-white rounded-full">
              <FaCheck />
            </div>
            <div>
              <div className="text-sm text-emerald-300">Rooms Inspected</div>
              <div className="text-xl font-semibold text-white">{roomsInspected}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-[#21102a] border border-white/5">
            <div className="p-2 bg-purple-500 text-white rounded-full">
              <FaBed />
            </div>
            <div>
              <div className="text-sm text-purple-300">Occupied Rooms</div>
              <div className="text-xl font-semibold text-white">{occupiedRooms}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Column Customization Bar */}
      {showColumns && (
        <div className="mb-4 bg-[#071826] rounded-lg shadow-sm border border-white/5 p-3 flex items-center gap-2 flex-wrap text-white">
          <div className="px-3 py-1 bg-teal-500 text-white rounded-full text-sm font-medium">
            Columns
          </div>
          {allColumns.map((column) => (
            <div
              key={column.key}
              onClick={() => toggleColumn(column.key)}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm cursor-pointer transition-opacity hover:opacity-80 ${visibleColumns.includes(column.key)
                  ? 'bg-white/5 text-white'
                  : 'bg-transparent text-gray-300 border border-white/5'
                }`}
            >
              {column.required && <span className="text-teal-500">*</span>}
              <span>{column.label}</span>
              {!column.required && visibleColumns.includes(column.key) && (
                <button
                  className="ml-1 text-gray-400 hover:text-red-500"
                >
                  <FaTimes className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-[#071826] rounded-lg shadow-md overflow-hidden border border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/5 text-gray-300 text-xs uppercase">
              <tr>
                {visibleColumns.includes('type') && (
                  <th className="px-4 py-3 font-semibold border-r border-white/5 text-gray-300">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="cursor-pointer"
                      />
                      Type
                    </div>
                  </th>
                )}
                {visibleColumns.includes('roomNo') && (
                  <th className="px-4 py-3 font-semibold border-r border-gray-200">Room No. / Name</th>
                )}
                {visibleColumns.includes('building') && (
                  <th className="px-4 py-3 font-semibold border-r border-gray-200">Building</th>
                )}
                {visibleColumns.includes('floor') && (
                  <th className="px-4 py-3 font-semibold border-r border-gray-200">Floor</th>
                )}
                {visibleColumns.includes('section') && (
                  <th className="px-4 py-3 font-semibold border-r border-gray-200">Section</th>
                )}
                {visibleColumns.includes('guestStatus') && (
                  <th className="px-4 py-3 font-semibold border-r border-gray-200">Guest Status</th>
                )}
                {visibleColumns.includes('roomType') && (
                  <th className="px-4 py-3 font-semibold border-r border-gray-200">Room Type</th>
                )}
                {visibleColumns.includes('status') && (
                  <th className="px-4 py-3 font-semibold border-r border-gray-200">Status</th>
                )}
                {visibleColumns.includes('assignee') && (
                  <th className="px-4 py-3 font-semibold border-r border-gray-200">Assignee</th>
                )}
                {visibleColumns.includes('layout') && (
                  <th className="px-4 py-3 font-semibold border-r border-gray-200">Layout</th>
                )}
                {visibleColumns.includes('articles') && (
                  <th className="px-4 py-3 font-semibold border-r border-gray-200">Articles</th>
                )}
                {visibleColumns.includes('services') && (
                  <th className="px-4 py-3 font-semibold border-r border-gray-200">Services</th>
                )}
                {visibleColumns.includes('notes') && (
                  <th className="px-4 py-3 font-semibold">Notes</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredData.map(item => (
                <HousekeepingRow
                  key={item.id}
                  item={item}
                  visibleColumns={visibleColumns}
                  onSelectChange={handleSelectChange}
                  onStatusChange={handleStatusChange}
                  onAssigneeChange={handleAssigneeChange}
                  housekeeperStatuses={housekeeperStatuses}
                  assigneeOptions={['No Housekeeper', ...housekeepers]}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Room Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-[#0b1622] border border-white/10 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Add New Room</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-white transition"
              >
                <FaTimes />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">Room No. / Name</label>
              <input
                type="text"
                value={newRoomNo}
                onChange={(e) => setNewRoomNo(e.target.value)}
                className="w-full px-4 py-2 border border-white/10 rounded-lg bg-[#071226] text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="e.g. 101"
              />
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRoom}
                className="px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-700 hover:opacity-90 text-white rounded-lg transition font-medium"
              >
                Add Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Housekeeping;
