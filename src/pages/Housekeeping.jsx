import React, { useState, useEffect } from 'react';
import { FaSearch, FaFilePdf, FaTimes, FaExclamationCircle, FaBroom, FaCheck, FaBed } from 'react-icons/fa';
import HousekeepingRow from '../components/Housekeeping/HousekeepingRow';
import API from '../api';

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

function Housekeeping() {
  const [rooms, setRooms] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [housekeeperFilter, setHousekeeperFilter] = useState('All Housekeeper');
  const [roomTypeTab, setRoomTypeTab] = useState('Accommodation Rooms');
  const [showColumns, setShowColumns] = useState(true);
  const [visibleColumns, setVisibleColumns] = useState(
    allColumns.map(col => col.key)
  );
  const [loading, setLoading] = useState(true);

  const role = localStorage.getItem("role");
  const selectedCount = rooms.filter(item => item.selected).length;

  // Load rooms from backend
  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const res = await API.get('/housekeeping');
      const backendRooms = res.data?.rooms || res.data || [];
      setRooms(backendRooms.map(r => ({
        id: r.id || r._id,
        selected: false,
        type: r.type || 'Accommodation',
        roomNo: r.roomNumber || r.roomNo || r.name || '',
        building: r.building || '',
        floor: r.floor || '',
        section: r.section || '',
        guestStatus: r.guestStatus || '',
        roomType: r.roomType || '',
        status: r.status || 'Vacant Dirty',
        assignee: r.assignee || 'No Housekeeper',
        layout: r.layout || '',
        articles: r.articles || '',
        services: r.services || '',
        notes: r.notes || false,
      })));
    } catch (err) {
      console.error('Error loading housekeeping rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChange = (id, checked) => {
    setRooms(prev =>
      prev.map(item => (item.id === id ? { ...item, selected: checked } : item))
    );
  };

  const handleSelectAll = checked => {
    setSelectAll(checked);
    setRooms(prev => prev.map(item => ({ ...item, selected: checked })));
  };

  const handleStatusChange = async (id, status) => {
    try {
      await API.put(`/housekeeping/status/${id}`, { status });
      setRooms(prev =>
        prev.map(item => (item.id === id ? { ...item, status } : item))
      );
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status');
    }
  };

  const handleAssigneeChange = async (id, assignee) => {
    try {
      await API.put(`/housekeeping/assignee/${id}`, { assignee });
      setRooms(prev =>
        prev.map(item => (item.id === id ? { ...item, assignee } : item))
      );
    } catch (err) {
      console.error('Error updating assignee:', err);
      alert('Failed to update assignee');
    }
  };

  const toggleColumn = (columnKey) => {
    const column = allColumns.find(col => col.key === columnKey);
    if (column && column.required) return;

    setVisibleColumns(prev =>
      prev.includes(columnKey)
        ? prev.filter(key => key !== columnKey)
        : [...prev, columnKey]
    );
  };

  const filteredData = rooms.filter(item => {
    const matchesSearch = searchQuery === '' ||
      item.roomNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.roomType.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesHousekeeper = housekeeperFilter === 'All Housekeeper' ||
      item.assignee === housekeeperFilter;

    return matchesSearch && matchesHousekeeper;
  });

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
    <div>
      <div className="simple-page-header">
        <h1 className="simple-page-title">Housekeeping</h1>
        <button className="simple-btn simple-btn-success flex items-center gap-2">
          <FaFilePdf /> Export PDF
        </button>
      </div>

      <div className="simple-card mb-4">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(240px,1fr)_auto_260px] gap-3 items-center mb-3">
          <div className="relative w-full">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search rooms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="simple-input pl-10 w-full"
            />
          </div>

          <button
            onClick={() => setShowColumns(!showColumns)}
            className="simple-btn simple-btn-outline"
          >
            {showColumns ? 'Hide Columns' : 'Show Columns'}
          </button>

          <select
            value={housekeeperFilter}
            onChange={(e) => setHousekeeperFilter(e.target.value)}
            className="simple-select w-full"
          >
            <option>All Housekeeper</option>
          </select>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <span className="text-sm text-gray-500">Selected: {selectedCount}</span>
          <div className="simple-tabs">
            <button
              onClick={() => setRoomTypeTab('Accommodation Rooms')}
              className={`simple-tab${roomTypeTab === 'Accommodation Rooms' ? ' simple-tab-active' : ''}`}
            >
              Accommodation Rooms
            </button>
            <button
              onClick={() => setRoomTypeTab('Event Rooms')}
              className={`simple-tab${roomTypeTab === 'Event Rooms' ? ' simple-tab-active' : ''}`}
            >
              Event Rooms
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="simple-metric-tile tile-orange">
            <div className="flex items-center gap-2 mb-1">
              <FaBroom />
              <span className="simple-metric-tile-label">Rooms to Clean</span>
            </div>
            <div className="simple-metric-tile-value">{roomsToClean}</div>
          </div>
          <div className="simple-metric-tile tile-green">
            <div className="flex items-center gap-2 mb-1">
              <FaCheck />
              <span className="simple-metric-tile-label">Rooms Inspected</span>
            </div>
            <div className="simple-metric-tile-value">{roomsInspected}</div>
          </div>
          <div className="simple-metric-tile tile-purple" style={{background:'#6a1b9a'}}>
            <div className="flex items-center gap-2 mb-1">
              <FaBed />
              <span className="simple-metric-tile-label">Occupied Rooms</span>
            </div>
            <div className="simple-metric-tile-value">{occupiedRooms}</div>
          </div>
        </div>
      </div>

      {showColumns && (
        <div className="mb-4 bg-white rounded-lg shadow-sm border border-gray-200 p-3 flex items-center gap-2 flex-wrap">
          <div className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-medium">
            Columns
          </div>
          {allColumns.map((column) => (
            <div
              key={column.key}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm border ${
                visibleColumns.includes(column.key)
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-gray-50 text-gray-400 border-gray-200'
              }`}
            >
              {column.required && <span className="text-blue-500">*</span>}
              <span>{column.label}</span>
              {!column.required && (
                <button
                  onClick={() => toggleColumn(column.key)}
                  className="ml-1 hover:text-red-500 text-gray-400"
                >
                  <FaTimes className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center p-8 text-gray-400">Loading rooms...</div>
      ) : (
        <div className="simple-table-wrapper">
          <table className="simple-table">
            <thead>
              <tr>
                {visibleColumns.includes('type') && (
                  <th>
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
                {visibleColumns.includes('roomNo') && <th>Room No. / Name</th>}
                {visibleColumns.includes('building') && <th>Building</th>}
                {visibleColumns.includes('floor') && <th>Floor</th>}
                {visibleColumns.includes('section') && <th>Section</th>}
                {visibleColumns.includes('guestStatus') && <th>Guest Status</th>}
                {visibleColumns.includes('roomType') && <th>Room Type</th>}
                {visibleColumns.includes('status') && <th>Status</th>}
                {visibleColumns.includes('assignee') && <th>Assignee</th>}
                {visibleColumns.includes('layout') && <th>Layout</th>}
                {visibleColumns.includes('articles') && <th>Articles</th>}
                {visibleColumns.includes('services') && <th>Services</th>}
                {visibleColumns.includes('notes') && <th>Notes</th>}
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
                />
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={visibleColumns.length} className="p-8 text-center text-gray-400">
                    No rooms found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Housekeeping;
