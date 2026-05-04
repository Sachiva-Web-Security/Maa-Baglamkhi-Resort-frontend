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

  const getStatusBadgeClass = (status) => {
    if (status === 'Vacant Clean Inspected') return 'simple-badge badge-green';
    if (status === 'Occupied Clean') return 'simple-badge badge-green';
    if (status === 'Occupied Dirty') return 'simple-badge badge-orange';
    if (status === 'Vacant Dirty') return 'simple-badge badge-orange';
    if (status === 'Out of Service') return 'simple-badge badge-red';
    return 'simple-badge badge-gray';
  };

  return (
    <tr>
      {visibleColumns.includes('type') && (
        <td>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={item.selected || false}
              onChange={(e) => onSelectChange(item.id, e.target.checked)}
              className="cursor-pointer"
            />
            <span>{item.type}</span>
          </div>
        </td>
      )}
      {visibleColumns.includes('roomNo') && <td className="font-medium">{item.roomNo}</td>}
      {visibleColumns.includes('building') && <td>{item.building || '-'}</td>}
      {visibleColumns.includes('floor') && <td>{item.floor || '-'}</td>}
      {visibleColumns.includes('section') && <td>{item.section || '-'}</td>}
      {visibleColumns.includes('guestStatus') && (
        <td>
          {item.guestStatus ? (
            <div className="flex items-center gap-1 text-sm text-amber-600">
              <FaExclamationCircle className="w-4 h-4" />
              <span>{item.guestStatus}</span>
            </div>
          ) : '-'}
        </td>
      )}
      {visibleColumns.includes('roomType') && <td>{item.roomType}</td>}
      {visibleColumns.includes('status') && (
        <td>
          <select
            value={item.status}
            onChange={(e) => onStatusChange(item.id, e.target.value)}
            className="simple-select min-w-45"
          >
            {statusOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </td>
      )}
      {visibleColumns.includes('assignee') && (
        <td>
          <select
            value={item.assignee}
            onChange={(e) => onAssigneeChange(item.id, e.target.value)}
            className="simple-select min-w-37.5"
          >
            {assigneeOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </td>
      )}
      {visibleColumns.includes('layout') && <td>{item.layout || '-'}</td>}
      {visibleColumns.includes('articles') && <td>{item.articles || '-'}</td>}
      {visibleColumns.includes('services') && <td>{item.services || '-'}</td>}
      {visibleColumns.includes('notes') && (
        <td>
          {item.notes ? (
            <button className="simple-btn simple-btn-success simple-btn-sm">Notes</button>
          ) : '-'}
        </td>
      )}
    </tr>
  );
}

export default HousekeepingRow;
