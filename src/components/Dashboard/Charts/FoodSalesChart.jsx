import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

const FoodSalesChart = ({ data = [] }) => {
  const mappedData = data.map((item) => ({
    day: item.name,
    sales: item.value,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={mappedData}>
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