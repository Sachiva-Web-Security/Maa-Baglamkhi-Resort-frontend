import { useCallback, useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import API from '../../../api';

const FoodSalesChart = () => {
  const [data, setData] = useState([]);

  const fetchCharts = useCallback(async () => {
    try {
      const res = await API.get("/dashboard/charts");
      if (res.data && res.data.foodSales) {
        const mappedData = res.data.foodSales.map((item) => ({
          day: item.name,
          sales: Number(item.value || 0),
        }));
        setData(mappedData);
      }
    } catch (err) {
      console.error("Error fetching food sales chart data:", err);
    }
  }, []);

  useEffect(() => {
    fetchCharts();
  }, [fetchCharts]);

  useEffect(() => {
    const refresh = () => fetchCharts();
    const handleVisibilityChange = () => {
      if (!document.hidden) refresh();
    };

    const intervalId = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchCharts]);

  return (
    <div className="w-full min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300">
        Dining Trend
      </p>
      <h3 className="mt-2 text-base font-bold text-slate-900">
        Food sales this week
      </h3>
      <div className="mt-4 h-[190px] w-full">
        <ResponsiveContainer width="100%" height={190}>
          <LineChart data={data}>
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#64748b" }} />
            <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
            <Tooltip />

            <Line
              type="monotone"
              dataKey="sales"
              stroke="#06b6d4"
              strokeWidth={3}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default FoodSalesChart;
