import { useEffect, useState } from 'react';
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

  const [data, setData] = useState([
    { day: 'Mon', sales: 12000 },
    { day: 'Tue', sales: 15000 },
    { day: 'Wed', sales: 18000 },
    { day: 'Thu', sales: 22000 },
    { day: 'Fri', sales: 28000 },
  ]);

  useEffect(() => {
    const fetchCharts = async () => {
      try {
        const res = await API.get("/dashboard/charts");
        if (res.data && res.data.foodSales) {
          // Assuming backend returns an array like { name: 'Main Course', value: 45 }
          // We map it to { day, sales } just so the line chart works
          const mappedData = res.data.foodSales.map(item => ({
            day: item.name,
            sales: item.value
          }));
          setData(mappedData);
        }
      } catch (err) {
        console.error("Error fetching food sales chart data:", err);
      }
    };
    fetchCharts();
  }, []);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <XAxis dataKey="day" />
        <YAxis />
        <Tooltip />

        <Line
          type="monotone"
          dataKey="sales"
          stroke="#06b6d4"
          strokeWidth={3}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default FoodSalesChart;