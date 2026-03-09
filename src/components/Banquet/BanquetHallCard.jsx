import { getBackendBaseURL } from "../../api";

const BanquetHallCard = ({ hall, selected, onSelect }) => {
  const imgSrc = hall.image
    ? `${getBackendBaseURL()}/uploads/${hall.image}`
    : null;

  return (
    <button
      type="button"
      className={`rounded-xl overflow-hidden text-left cursor-pointer transition-all shadow-sm border ${
        selected
          ? 'border-blue-500 bg-gradient-to-br from-[#062e54] to-[#0b1730] shadow-[0_8px_30px_rgba(59,130,246,0.12)]'
          : 'border-white/5 bg-transparent hover:bg-white/2'
      }`}
      onClick={onSelect}
    >
      {/* Hall Image */}
      {imgSrc ? (
        <img
          src={imgSrc}
          alt={hall.name}
          className="w-full h-36 object-cover"
        />
      ) : (
        <div className="w-full h-36 bg-gradient-to-br from-blue-900/40 to-slate-800 flex items-center justify-center">
          <span className="text-3xl">🏛️</span>
        </div>
      )}

      <div className="p-3.5">
        <div className="text-sm font-black text-white mb-2">{hall.name}</div>
        <div className="grid gap-1.5 text-gray-300 text-xs font-bold mb-2.5">
          <span>
            <strong className="text-gray-200">Capacity:</strong> {hall.capacity}
          </span>
          <span>
            <strong className="text-gray-200">Rate:</strong> ₹{hall.ratePerHour}/hr
          </span>
        </div>

        {/* AC / Non-AC Badge */}
        <div className="flex gap-2 flex-wrap mb-2">
          <span
            className={`inline-flex px-2 py-1 rounded-full text-[10px] font-black border ${
              hall.is_ac
                ? 'bg-cyan-900/60 text-cyan-200 border-cyan-700'
                : 'bg-orange-900/60 text-orange-200 border-orange-700'
            }`}
          >
            {hall.is_ac ? '❄️ AC' : '🌀 Non-AC'}
          </span>
        </div>

        {/* Status */}
        <div
          className={`inline-flex px-2.5 py-1.5 rounded-full text-xs font-black border ${
            hall.status === 'Available'
              ? 'bg-green-900 text-green-200 border-green-700'
              : 'bg-red-900 text-red-200 border-red-700'
          }`}
        >
          {hall.status}
        </div>
      </div>
    </button>
  );
};

export default BanquetHallCard;
