import { FaBed, FaKey, FaRupeeSign, FaCheckCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useEffect, useState } from "react";

import MetricCard from "../components/Dashboard/MetricCard/MetricCard";
import MonthlyRevenueChart from "../components/Dashboard/Charts/MonthlyRevenueChart";
import RoomOccupancyChart from "../components/Dashboard/Charts/RoomOccupancyChart";
import FoodSalesChart from "../components/Dashboard/Charts/FoodSalesChart";
import HomePage from "../components/HomePage/HomePage";
import API from "../api";

const Dashboard = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(
    localStorage.getItem("freshLogin") === "true"
  );
  const [blurBg, setBlurBg] = useState(false);

  const [apiMetrics, setApiMetrics] = useState({
    totalRooms: 0,
    occupiedRooms: 0,
    todayRevenue: 0,
    todayCheckins: 0,
  });

  useEffect(() => {
    const freshLoginFlag = localStorage.getItem("freshLogin");

    if (freshLoginFlag !== "true") {
      setLoading(false);
      return;
    }

    setBlurBg(true);

    toast.success("Login Successful", {
      position: "top-center",
      autoClose: 2000,
    });

    const blurTimer = setTimeout(() => {
      setBlurBg(false);
    }, 500);

    const loaderTimer = setTimeout(() => {
      setLoading(false);
      localStorage.removeItem("freshLogin");
    }, 2000);

    return () => {
      clearTimeout(blurTimer);
      clearTimeout(loaderTimer);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchMetrics = async () => {
      try {
        const res = await API.get("/dashboard/metrics");
        if (isMounted) {
          setApiMetrics({
            totalRooms: res.data.totalRooms || 0,
            occupiedRooms: res.data.occupiedRooms || 0,
            todayRevenue: res.data.todayRevenue || 0,
            todayCheckins: res.data.todayCheckins || 0,
          });
        }
      } catch (err) {
        if (isMounted) {
          toast.error("Failed to load metrics", {
            position: "bottom-right",
          });
        }
      }
    };

    fetchMetrics();

    return () => {
      isMounted = false;
    };
  }, []);

  const metrics = [
    {
      title: "Total Rooms",
      value: apiMetrics.totalRooms.toString(),
      icon: FaBed,
      gradient: "bg-gradient-to-r from-blue-500 to-cyan-400",
      route: "/hotel",
    },
    {
      title: "Occupied Rooms",
      value: apiMetrics.occupiedRooms.toString(),
      icon: FaKey,
      gradient: "bg-gradient-to-r from-green-400 to-emerald-500",
      route: "/hotel",
    },
    {
      title: "Today's Revenue",
      value: `₹${apiMetrics.todayRevenue.toLocaleString()}`,
      icon: FaRupeeSign,
      gradient: "bg-gradient-to-r from-orange-400 to-yellow-400",
      route: "/accounts",
    },
    {
      title: "Today's Check-ins",
      value: apiMetrics.todayCheckins.toString(),
      icon: FaCheckCircle,
      gradient: "bg-gradient-to-r from-rose-400 to-pink-500",
      route: "/hotel",
    },
  ];

  return (
    <>
      <ToastContainer theme="dark" />

      {loading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            <p className="text-lg font-semibold text-white">
              Loading Dashboard...
            </p>
          </div>
        </div>
      )}

      <div
        className={`w-full min-h-screen overflow-x-hidden bg-slate-900 p-4 sm:p-6 lg:p-8 space-y-20 transition-all duration-300 ${
          blurBg ? "blur-[6px]" : ""
        }`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
          {metrics.map((metric, index) => (
            <MetricCard
              key={index}
              title={metric.title}
              value={metric.value}
              icon={metric.icon}
              gradient={metric.gradient}
              onClick={() => navigate(metric.route)}
            />
          ))}
        </div>

        <div className="w-full">
          <h2 className="text-white font-semibold mb-4">
            Reservation Statistic
          </h2>
          <div className="w-full h-96">
            <MonthlyRevenueChart />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <div className="w-full h-80 bg-slate-900">
            <RoomOccupancyChart />
          </div>

          <div className="w-full h-80">
            <FoodSalesChart />
          </div>
        </div>

        <div>
          <HomePage />
        </div>
      </div>
    </>
  );
};

export default Dashboard;