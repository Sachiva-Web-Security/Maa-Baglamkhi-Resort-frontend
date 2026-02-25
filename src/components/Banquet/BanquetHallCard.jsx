const BanquetHallCard = ({ hall, selected, onSelect }) => {
  return (
    <button
      type="button"
      className={`rounded-xl p-3.5 text-left cursor-pointer transition-all shadow-sm border ${
        selected
          ? 'border-blue-500 bg-gradient-to-br from-[#062e54] to-[#0b1730] shadow-[0_8px_30px_rgba(59,130,246,0.12)]'
          : 'border-white/5 bg-transparent hover:bg-white/2'
      }`}
      onClick={onSelect}
    >
      <div className="text-sm font-black text-white mb-2">{hall.name}</div>
      <div className="grid gap-1.5 text-gray-300 text-xs font-bold mb-2.5">
        <span>
          <strong className="text-gray-200">Capacity:</strong> {hall.capacity}
        </span>
        <span>
          <strong className="text-gray-200">Rate:</strong> ₹{hall.ratePerHour}/hr
        </span>
      </div>
      <div
        className={`inline-flex px-2.5 py-1.5 rounded-full text-xs font-black border ${
          hall.status === 'Available'
            ? 'bg-green-900 text-green-200 border-green-700'
            : 'bg-red-900 text-red-200 border-red-700'
        }`}
      >
        {hall.status}
      </div>
    </button>
  );
};

export default BanquetHallCard;


