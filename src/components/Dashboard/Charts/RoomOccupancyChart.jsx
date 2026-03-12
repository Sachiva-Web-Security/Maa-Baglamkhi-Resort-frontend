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
  const [data, setData] = useState([
    { name: "Occupied", value: 85 },
    { name: "Available", value: 28 },
    { name: "Cleaning", value: 7 },
  ]);

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
  const availableRooms =
    normalizedData.find((item) => item.name === "Available")?.value || 0;

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(160px,0.9fr)_minmax(0,1fr)] xl:items-center">
        <div className="relative mx-auto aspect-square w-full max-w-[220px]">
            <ResponsiveContainer width="100%" height="100%" aspect={1}>
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
              <p className="text-[30px] font-bold leading-none text-slate-900">
                {percentage}%
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Occupied
              </p>
              <p className="mt-2 max-w-[110px] text-[11px] leading-4 text-slate-400">
                {occupiedRooms} of {total} rooms in use
              </p>
            </div>
          </div>

        <div className="grid gap-3">
          {normalizedData.map((item) => {
            const itemPercentage =
              total > 0 ? Math.round((item.value / total) * 100) : 0;

            return (
              <div
                key={item.name}
                className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 shadow-sm ring-1 ring-slate-100"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {item.label}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {itemPercentage}% of total
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-slate-900">{item.value}</p>
                  <p className="text-[11px] text-slate-400">rooms</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RoomOccupancyChart;
