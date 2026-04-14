const ReportTypeSelector = ({ value, onChange, types }) => {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {types.map((type) => {
        const active = type.id === value;

        return (
          <button
            key={type.id}
            type="button"
            onClick={() => onChange(type.id)}
            className={`rounded-[22px] border px-4 py-4 text-left transition ${
              active
                ? "border-cyan-400 bg-[linear-gradient(135deg,#0b2748_0%,#103b4d_55%,#18465a_100%)] text-white shadow-[0_16px_35px_rgba(14,165,233,0.16)]"
                : "border-slate-200/80 bg-white text-slate-900 hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-500 hover:text-white hover:shadow-[0_14px_32px_rgba(59,130,246,0.24)]"
            }`}
          >
            <div className="text-[16px] font-black leading-6">{type.label}</div>
            <div
              className={`mt-2 text-[14px] font-semibold leading-6 ${
                active ? "text-slate-100" : "text-slate-700"
              }`}
            >
              {type.note}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default ReportTypeSelector;
