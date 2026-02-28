import {
  FaBed,
  FaKey,
  FaRupeeSign,
  FaCheckCircle,
} from "react-icons/fa";


import { useNavigate, useLocation } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useEffect, useState } from "react";
import "./Dashboard.css"; 

import MetricCard from "../components/Dashboard/MetricCard/MetricCard";
import MonthlyRevenueChart from "../components/Dashboard/Charts/MonthlyRevenueChart";
import RoomOccupancyChart from "../components/Dashboard/Charts/RoomOccupancyChart";
import FoodSalesChart from "../components/Dashboard/Charts/FoodSalesChart";
import HomePage from "../components/HomePage/HomePage";

const Dashboard = () => {
  const navigate = useNavigate();
   const location = useLocation();

   // ✅ Blur state
  const [blurBg, setBlurBg] = useState(false);

  // ✅ Show toast after login
  useEffect(() => {
    if (location.state?.loginSuccess) {
      setBlurBg(true);

      toast.success("✅ Login Successful", {
        position: "top-center",
        autoClose: 0,
      });

      setTimeout(() => {
        setBlurBg(false);
      }, 500);
    }
  }, [location]);

  const metrics = [
    {
      title: "Total Rooms",
      value: "120",
      icon: FaBed,
      gradient: "bg-gradient-to-r from-blue-500 to-cyan-400",
      route: "/hotel",
    },
    {
      title: "Occupied Rooms",
      value: "85",
      icon: FaKey,
      gradient: "bg-gradient-to-r from-green-400 to-emerald-500",
      route: "/hotel",
    },
    {
      title: "Today's Revenue",
      value: "₹75,000",
      icon: FaRupeeSign,
      gradient: "bg-gradient-to-r from-orange-400 to-yellow-400",
      route: "/accounts",
    },
    {
      title: "Today's Check-ins",
      value: "25",
      icon: FaCheckCircle,
      gradient: "bg-gradient-to-r from-rose-400 to-pink-500",
      route: "/hotel",
    },
  ];

  return (
     <>
      {/* ✅ Toast Container */}
      <ToastContainer theme="dark" />

    <div className={`min-h-screen bg-slate-900 space-y-20 ${blurBg ? "blur-bg" : ""}`}>

      {/* ===== TOP METRICS ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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

      {/* ===== MAIN CHART ===== */}
      <div className="">
        <h2 className="text-white font-semibold mb-4">
          Reservation Statistic
        </h2>
        <MonthlyRevenueChart />
      </div>

      {/* ===== SMALL CHARTS ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <div  className="bg-slate-900 ">
          <RoomOccupancyChart />
        </div>

        <div >
          <FoodSalesChart />
        </div>

      </div>

      {/* ===== HOME PAGE FULL WIDTH (BOTTOM) ===== */}
      <div className="">
        <HomePage />
      </div>

    </div>

    </>
  );
};

export default Dashboard;