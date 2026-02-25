const ReportTypeSelector = ({ value, onChange, types }) => {
  return (
    <div className="flex flex-wrap gap-2">
      {types.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`px-4 py-2 rounded-lg font-extrabold text-sm border transition-colors ${
            t.id === value
              ? 'bg-white/10 text-white ring-1 ring-white/10'
              : 'bg-white/3 text-gray-300 hover:bg-white/5'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
};

export default ReportTypeSelector;


