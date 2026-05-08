const tileMap = {
  green: "simple-metric-tile tile-green",
  red: "simple-metric-tile tile-red",
  yellow: "simple-metric-tile tile-orange",
  blue: "simple-metric-tile tile-blue",
};

const SummaryCard = ({ label, value, color }) => {
  return (
    <div className={tileMap[color] || "simple-metric-tile tile-blue"}>
      <div className="simple-metric-tile-label">{label}</div>
      <div className="simple-metric-tile-value">{value}</div>
    </div>
  );
};

export default SummaryCard;
