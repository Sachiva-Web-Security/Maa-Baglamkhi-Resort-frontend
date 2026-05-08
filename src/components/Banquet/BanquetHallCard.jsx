const BanquetHallCard = ({ hall, selected, onSelect }) => {
  return (
    <button
      type="button"
      className={`rounded-xl p-3.5 text-left cursor-pointer transition-all shadow-sm border w-full ${
        selected
          ? 'border-blue-500 bg-blue-50 shadow-blue-100'
          : 'border-gray-200 bg-white hover:bg-gray-50'
      }`}
      onClick={onSelect}
    >
      <div className="text-sm font-bold text-gray-800 mb-2">{hall.name}</div>
      <div className="grid gap-1.5 text-gray-600 text-xs font-semibold mb-2.5">
        <span><strong className="text-gray-700">Capacity:</strong> {hall.capacity}</span>
        <span><strong className="text-gray-700">Rate:</strong> ₹{hall.ratePerHour}/hr</span>
      </div>
      <div className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${
        hall.status === 'Available'
          ? 'bg-green-100 text-green-700'
          : 'bg-red-100 text-red-700'
      }`}>
        {hall.status}
      </div>
    </button>
  );
};

export default BanquetHallCard;
