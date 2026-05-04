const ReportTypeSelector = ({ value, onChange, types }) => {
  return (
    <div className="simple-tabs">
      {types.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`simple-tab${t.id === value ? ' simple-tab-active' : ''}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
};

export default ReportTypeSelector;


