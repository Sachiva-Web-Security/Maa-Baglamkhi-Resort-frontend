import { useEffect, useState } from "react";

const SummaryCard = ({
  label,
  value,
  valueColor = "default",
  bg = "default",
  onClick,
}) => {
  const valueColorClasses = {
    green: "text-green-700",
    red: "text-red-600",
    blue: "text-blue-700",
    purple: "text-purple-700",
    default: "text-gray-900",
  };

  const [displayValue, setDisplayValue] = useState(0);

  // Extract numeric value for animation (₹5,000 → 5000)
  const numericValue = parseInt(value.replace(/[^\d]/g, "")) || 0;

  // Count Animation
  useEffect(() => {
    let start = 0;
    const duration = 800;
    const increment = numericValue / (duration / 16);

    const counter = setInterval(() => {
      start += increment;
      if (start >= numericValue) {
        start = numericValue;
        clearInterval(counter);
      }
      setDisplayValue(Math.floor(start));
    }, 16);

    return () => clearInterval(counter);
  }, [numericValue]);

  // Fake trend (demo purpose – no logic change)
  const trendUp = numericValue % 2 === 0;
  const trendPercent = (numericValue % 15) + 5;

  return (
    <div
      className={`
        relative overflow-hidden
        bg-white border border-gray-200
        rounded-2xl p-6
        shadow-sm
        transition-all duration-300
        hover:shadow-md hover:-translate-y-1
        ${onClick ? "cursor-pointer" : ""}
      `}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onClick();
            }
          : undefined
      }
    >
      {/* Glow Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-green-500/10 opacity-0 hover:opacity-100 transition duration-500 pointer-events-none"></div>

      {/* Label */}
      <p className="text-sm text-gray-500 tracking-wide mb-2">
        {label}
      </p>

      {/* Value */}
      <h2
        className={`text-2xl font-bold tracking-tight ${
          valueColorClasses[valueColor] || valueColorClasses.default
        }`}
      >
        ₹{displayValue.toLocaleString("en-IN")}
      </h2>

      {/* Trend */}
      <div className="flex items-center justify-between mt-3">
        <span
          className={`text-xs font-medium ${
            trendUp ? "text-green-400" : "text-red-400"
          }`}
        >
          {trendUp ? "▲" : "▼"} {trendPercent}% this month
        </span>

        <span className="text-xs text-gray-400">
          Updated now
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mt-3 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${
            trendUp ? "bg-green-400" : "bg-red-400"
          }`}
          style={{ width: `${trendPercent * 5}%` }}
        ></div>
      </div>
    </div>
  );
};

export default SummaryCard;