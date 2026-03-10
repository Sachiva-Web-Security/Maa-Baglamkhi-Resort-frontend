import { useEffect, useState } from "react";

const SummaryCard = ({
  label,
  value,
  valueColor = "default",
  onClick,
}) => {
  const valueColorClasses = {
    green: "text-green-400",
    red: "text-red-400",
    blue: "text-blue-400",
    purple: "text-purple-400",
    default: "text-slate-100",
  };

  const [displayValue, setDisplayValue] = useState(0);

  const numericValue = parseInt(String(value).replace(/[^\d]/g, ""), 10) || 0;

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

  const trendUp = numericValue % 2 === 0;
  const trendPercent = (numericValue % 15) + 5;

  return (
    <div
      className={`
        relative overflow-hidden
        bg-white/5 backdrop-blur-xl
        border border-white/10
        rounded-2xl p-6
        shadow-xl
        transition-all duration-300
        hover:shadow-2xl hover:-translate-y-1
        ${onClick ? "cursor-pointer hover:bg-white/10" : ""}
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
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-green-500/10 opacity-0 hover:opacity-100 transition duration-500 pointer-events-none"></div>

      <p className="text-sm text-slate-400 tracking-wide mb-2">
        {label}
      </p>

      <h2
        className={`text-2xl font-bold tracking-tight ${valueColorClasses[valueColor] || valueColorClasses.default
          }`}
      >
        ₹{displayValue.toLocaleString("en-IN")}
      </h2>

      <div className="flex items-center justify-between mt-3">
        <span
          className={`text-xs font-medium ${trendUp ? "text-green-400" : "text-red-400"
            }`}
        >
          {trendUp ? "▲" : "▼"} {trendPercent}% this month
        </span>

        <span className="text-xs text-slate-500">
          Updated now
        </span>
      </div>

      <div className="mt-3 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${trendUp ? "bg-green-400" : "bg-red-400"
            }`}
          style={{ width: `${Math.min(trendPercent * 5, 100)}%` }}
        ></div>
      </div>
    </div>
  );
};

export default SummaryCard;