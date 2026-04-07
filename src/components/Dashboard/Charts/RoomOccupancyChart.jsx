import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import API from "../../../api";

const STATUS_CONFIG = {
  Occupied: { color: "#5B5CE2", label: "Occupied" },
  Available: { color: "#22C55E", label: "Available" },
  Cleaning: { color: "#F59E0B", label: "Cleaning" },
  Maintenance: { color: "#EF4444", label: "Maintenance" },
};

const STATUS_ORDER = ["Occupied", "Available", "Cleaning", "Maintenance"];

const RoomOccupancyChart = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchCharts = async () => {
      try {
        const res = await API.get("/dashboard/charts");
        if (res.data && res.data.roomOccupancy) {
          setData(res.data.roomOccupancy);
        }
      } catch (err) {
        console.error("Error fetching room occupancy chart data:", err);
      }
    };
    fetchCharts();
  }, []);

  const normalizedData = data
    .map((item) => {
      const normalizedName =
        STATUS_ORDER.find(
          (status) => status.toLowerCase() === String(item.name).toLowerCase()
        ) || item.name;

      return {
        name: normalizedName,
        label: STATUS_CONFIG[normalizedName]?.label || normalizedName,
        value: Number(item.value) || 0,
        color: STATUS_CONFIG[normalizedName]?.color || "#94A3B8",
      };
    })
    .sort((a, b) => {
      const aIndex = STATUS_ORDER.indexOf(a.name);
      const bIndex = STATUS_ORDER.indexOf(b.name);

      if (aIndex === -1 && bIndex === -1) return b.value - a.value;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

  const total = normalizedData.reduce((acc, item) => acc + item.value, 0);
  const occupiedRooms =
    normalizedData.find((item) => item.name === "Occupied")?.value || 0;
  const percentage =
    total > 0
      ? Math.round((occupiedRooms / total) * 100)
      : 0;

  return (
    <div className="flex h-full w-full min-w-0 flex-col">
      <div className="flex h-full min-h-0 flex-1 flex-col rounded-[24px] bg-white/45 p-4 backdrop-blur-md">
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-[minmax(0,120px)_minmax(0,1fr)] min-[420px]:items-center sm:grid-cols-[minmax(0,128px)_minmax(0,1fr)] sm:gap-4">
          <div className="relative mx-auto h-[128px] w-full max-w-[128px] min-w-0 sm:h-[140px] sm:max-w-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={normalizedData}
                  innerRadius="68%"
                  outerRadius="88%"
                  paddingAngle={3}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  stroke="#F8FAFC"
                  strokeWidth={4}
                >
                  {normalizedData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <p className="text-[30px] font-black leading-none text-slate-900 sm:text-[34px]">
                {percentage}%
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 sm:text-[11px]">
                Occupied
              </p>
              <p className="mt-1.5 max-w-[104px] text-[11px] leading-5 text-slate-500 sm:text-[12px]">
                {occupiedRooms} of {total} rooms in use
              </p>
            </div>
          </div>

          <div className="grid min-w-0 gap-2">
            {normalizedData.map((item) => {
              const itemPercentage =
                total > 0 ? Math.round((item.value / total) * 100) : 0;

              return (
                <div
                  key={item.name}
                  className="flex min-w-0 items-center justify-between gap-2.5 rounded-[18px] border border-white/70 bg-white/70 px-3.5 py-3 shadow-[0_10px_26px_rgba(15,23,42,0.06)] backdrop-blur-md"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800 sm:text-[15px]">
                        {item.label}
                      </p>
                      <p className="text-[11px] text-slate-400 sm:text-xs">
                        {itemPercentage}% of total
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[18px] font-black leading-none text-slate-900 sm:text-[20px]">
                      {item.value}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-slate-400">rooms</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomOccupancyChart;
