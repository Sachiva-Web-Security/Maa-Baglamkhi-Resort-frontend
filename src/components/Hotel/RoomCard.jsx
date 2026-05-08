import { useState } from 'react';

const statusColor = {
  Available: 'bg-green-100 text-green-700 border-green-200',
  Occupied:  'bg-red-100 text-red-700 border-red-200',
  Cleaning:  'bg-yellow-100 text-yellow-700 border-yellow-200',
};

const RoomCard = ({ room, onRoomClick, onCheckIn, onCheckOut, onMarkCleaning, onMarkAvailable }) => {
  const [showActions, setShowActions] = useState(false);

  const handleCardClick = () => {
    if (onRoomClick) onRoomClick(room);
    setShowActions(!showActions);
  };

  const handleActionClick = (e, action) => {
    e.stopPropagation();
    if (action === 'checkIn' && onCheckIn) onCheckIn(room);
    else if (action === 'checkOut' && onCheckOut) onCheckOut(room);
    else if (action === 'cleaning' && onMarkCleaning) onMarkCleaning(room);
    setShowActions(false);
  };

  return (
    <div
      onClick={handleCardClick}
      className="w-full max-w-xs bg-white border border-gray-200 rounded-xl shadow-sm p-4 hover:shadow-md hover:scale-[1.02] transition duration-200 cursor-pointer"
    >
      <div className="overflow-hidden rounded-lg mb-2">
        <img
          src={room.image || "https://images.unsplash.com/photo-1566665797739-1674de7a421a"}
          alt="room"
          className="w-full h-24 object-cover rounded-lg"
        />
      </div>

      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-gray-800">Room {room.number}</h3>
        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${statusColor[room.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
          {room.status}
        </span>
        {room.guest && <p className="text-xs text-gray-500">Guest: {room.guest}</p>}
        {room.checkIn && <p className="text-xs text-gray-500">In: {room.checkIn}</p>}
        {room.checkOut && <p className="text-xs text-gray-500">Out: {room.checkOut}</p>}
      </div>

      {showActions && (
        <div className="mt-2 space-y-1" onClick={(e) => e.stopPropagation()}>
          {room.status === 'Available' && (
            <button className="w-full simple-btn simple-btn-primary simple-btn-sm" onClick={(e) => handleActionClick(e, 'checkIn')}>
              Check-In
            </button>
          )}
          {room.status === 'Occupied' && (
            <>
              <button className="w-full simple-btn simple-btn-danger simple-btn-sm" onClick={(e) => handleActionClick(e, 'checkOut')}>
                Check-Out
              </button>
              <button className="w-full simple-btn simple-btn-warning simple-btn-sm" onClick={(e) => handleActionClick(e, 'cleaning')}>
                Cleaning
              </button>
            </>
          )}
          {room.status === 'Cleaning' && (
            <button
              className="w-full simple-btn simple-btn-success simple-btn-sm"
              onClick={(e) => { e.stopPropagation(); if (onMarkAvailable) onMarkAvailable(room); setShowActions(false); }}
            >
              Available
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default RoomCard;
