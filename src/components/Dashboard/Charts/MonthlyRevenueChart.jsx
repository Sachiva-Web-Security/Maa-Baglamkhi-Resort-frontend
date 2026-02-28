import { useEffect, useState } from "react";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";
import API from "../../../api";

const MonthlyRevenueChart = () => {
  const [data, setData] = useState([
    { month: "Jan", revenue: 85000 },
    { month: "Feb", revenue: 92000 },
    { month: "Mar", revenue: 105000 },
    { month: "Apr", revenue: 98000 },
    { month: "May", revenue: 115000 },
    { month: "Jun", revenue: 125000 },
  ]);

  useEffect(() => {
    const fetchCharts = async () => {
      try {
        const res = await API.get("/dashboard/charts");
        if (res.data && res.data.monthlyRevenue) {
          // Backend returns {name: 'Jan', Online: 4000, Offline: 2400} type data
          // We map it to { month, revenue } for this chart
          const mappedData = res.data.monthlyRevenue.map(item => ({
            month: item.name,
            revenue: (item.Online || 0) + (item.Offline || 0)
          }));
          setData(mappedData);
        }
      } catch (err) {
        console.error("Error fetching monthly revenue chart data:", err);
      }
    };
    fetchCharts();
  }, []);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />

        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#6366f1"
          strokeWidth={3}
          fill="url(#colorRevenue)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default MonthlyRevenueChart;