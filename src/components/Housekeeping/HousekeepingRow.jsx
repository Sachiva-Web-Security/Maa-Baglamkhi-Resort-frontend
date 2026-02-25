import React from 'react';
import { FaExclamationCircle } from 'react-icons/fa';

function HousekeepingRow({ item, visibleColumns, onSelectChange, onStatusChange, onAssigneeChange }) {
  const statusOptions = [
    'Vacant Dirty',
    'Vacant Clean Inspected',
    'Occupied Dirty',
    'Occupied Clean',
    'Out of Service',
  ];

  const assigneeOptions = [
    'No Housekeeper',
    'John Doe',
    'Jane Smith',
    'Mike Johnson',
  ];

  const getStatusTextClass = (status) => {
    if (status === 'Vacant Clean Inspected') return 'text-emerald-300';
    if (status === 'Occupied Clean') return 'text-emerald-300';
    if (status === 'Occupied Dirty') return 'text-amber-300';
    if (status === 'Vacant Dirty') return 'text-amber-300';
    if (status === 'Out of Service') return 'text-rose-300';
    return 'text-gray-300';
  };

  return (
    <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
      {visibleColumns.includes('type') && (
        <td className="px-4 py-3 border-r border-white/5">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={item.selected || false}
              onChange={(e) => onSelectChange(item.id, e.target.checked)}
              className="cursor-pointer"
            />
            <span className="text-sm text-white">{item.type}</span>
          </div>
        </td>
      )}
      
      {visibleColumns.includes('roomNo') && (
        <td className="px-4 py-3 border-r border-white/5">
          <span className="text-sm text-white">{item.roomNo}</span>
        </td>
      )}
      
      {visibleColumns.includes('building') && (
        <td className="px-4 py-3 border-r border-white/5">
          <span className="text-sm text-gray-300">{item.building || '-'}</span>
        </td>
      )}
      
      {visibleColumns.includes('floor') && (
        <td className="px-4 py-3 border-r border-white/5">
          <span className="text-sm text-gray-300">{item.floor || '-'}</span>
        </td>
      )}
      
      {visibleColumns.includes('section') && (
        <td className="px-4 py-3 border-r border-white/5">
          <span className="text-sm text-gray-300">{item.section || '-'}</span>
        </td>
      )}
      
      {visibleColumns.includes('guestStatus') && (
        <td className="px-4 py-3 border-r border-white/5">
          {item.guestStatus ? (
            <div className="flex items-center gap-1 text-sm text-amber-300">
              <FaExclamationCircle className="w-4 h-4" />
              <span>{item.guestStatus}</span>
            </div>
          ) : (
            <span className="text-sm text-gray-300">-</span>
          )}
        </td>
      )}
      
      {visibleColumns.includes('roomType') && (
        <td className="px-4 py-3 border-r border-white/5">
          <span className="text-sm text-white">{item.roomType}</span>
        </td>
      )}
      
      {visibleColumns.includes('status') && (
        <td className="px-4 py-3 border-r border-white/5">
          <select
            value={item.status}
            onChange={(e) => onStatusChange(item.id, e.target.value)}
            className={`w-full min-w-[190px] px-3 py-2 border border-white/10 rounded-lg bg-transparent text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-900 ${getStatusTextClass(item.status)}`}
          >
            {statusOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </td>
      )}
      
      {visibleColumns.includes('assignee') && (
        <td className="px-4 py-3 border-r border-white/5">
          <select
            value={item.assignee}
            onChange={(e) => onAssigneeChange(item.id, e.target.value)}
            className="w-full min-w-[160px] px-3 py-2 border border-white/10 rounded-lg bg-transparent text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-900"
          >
            {assigneeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </td>
      )}
      
      {visibleColumns.includes('layout') && (
        <td className="px-4 py-3 border-r border-white/5">
          <span className="text-sm text-gray-300">{item.layout || '-'}</span>
        </td>
      )}
      
      {visibleColumns.includes('articles') && (
        <td className="px-4 py-3 border-r border-white/5">
          <span className="text-sm text-gray-300">{item.articles || '-'}</span>
        </td>
      )}
      
      {visibleColumns.includes('services') && (
        <td className="px-4 py-3 border-r border-white/5">
          <span className="text-sm text-gray-300">{item.services || '-'}</span>
        </td>
      )}
      
      {visibleColumns.includes('notes') && (
        <td className="px-4 py-3">
          {item.notes ? (
            <button className="px-3 py-1 bg-emerald-500 text-black text-sm rounded-md hover:bg-emerald-600 transition-colors">
              Notes
            </button>
          ) : (
            <span className="text-sm text-gray-300">-</span>
          )}
        </td>
      )}
    </tr>
  );
}

export default HousekeepingRow;
