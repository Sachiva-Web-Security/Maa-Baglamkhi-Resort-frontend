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

    const blurTimer = setTimeout(() => {
      setBlurBg(false);
    }, 500);

    const loaderTimer = setTimeout(() => {
      setLoading(false);
      localStorage.removeItem("freshLogin");
    }, 1000);

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
      subtitle: "Calm inventory overview",
      icon: FaBed,
      gradient:
        "bg-[linear-gradient(135deg,#14978F_0%,#22B4A6_44%,#5ED9CF_100%)]",
      route: "/hotel",
    },
    {
      title: "Occupied Rooms",
      value: apiMetrics.occupiedRooms.toString(),
      subtitle: "Live stay activity",
      icon: FaKey,
      gradient:
        "bg-[linear-gradient(135deg,#2452D6_0%,#2E67E7_50%,#5B9AF1_100%)]",
      route: "/hotel",
    },
    {
      title: "Today's Revenue",
      value: `Rs. ${apiMetrics.todayRevenue.toLocaleString()}`,
      subtitle: "Front office and F&B earnings",
      icon: FaRupeeSign,
      gradient:
        "bg-[linear-gradient(135deg,#C96800_0%,#E18908_48%,#F4BD21_100%)]",
      route: "/accounts",
    },
    {
      title: "Today's Check-ins",
      value: apiMetrics.todayCheckins.toString(),
      subtitle: "Guest arrival momentum",
      icon: FaCheckCircle,
      gradient:
        "bg-[linear-gradient(135deg,#D61B79_0%,#E43288_52%,#EB67AD_100%)]",
      route: "/hotel",
    },
  ];
  const occupancyRate = apiMetrics.totalRooms
    ? `${Math.round((apiMetrics.occupiedRooms / apiMetrics.totalRooms) * 100)}%`
    : "0%";
  const heroStats = [
    { label: "Occupancy", value: occupancyRate },
    {
      label: "Today's Revenue",
      value: `Rs. ${apiMetrics.todayRevenue.toLocaleString()}`,
    },
    { label: "Check-ins", value: apiMetrics.todayCheckins.toString() },
  ];

  return (
    <>
      <ToastContainer theme="dark" />

      {loading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-white/30 border-t-white"></div>
            <p className="text-lg font-semibold text-white">
              Loading Dashboard...
            </p>
          </div>
        </div>
      )}
      

      <div
        className={`relative isolate min-h-screen w-full overflow-x-hidden bg-[linear-gradient(135deg,#f5fbff_0%,#f3f8f4_28%,#fff8f1_58%,#f8fafc_100%)] p-4 transition-all duration-300 sm:p-6 lg:p-8 ${
          blurBg ? "blur-[6px]" : ""
        }`}
      >
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-[-8%] top-[-6%] h-72 w-72 rounded-full bg-cyan-200/45 blur-3xl sm:h-96 sm:w-96" />
          <div className="absolute right-[-10%] top-[8%] h-72 w-72 rounded-full bg-amber-200/45 blur-3xl sm:h-[28rem] sm:w-[28rem]" />
          <div className="absolute bottom-[18%] left-[18%] h-56 w-56 rounded-full bg-emerald-200/30 blur-3xl sm:h-80 sm:w-80" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.55)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.45)_1px,transparent_1px)] bg-[size:72px_72px] opacity-25" />
        </div>

        <div className="mx-auto max-w-[1180px] space-y-7">
          <section className="overflow-hidden rounded-[26px] border border-slate-900/10 bg-[linear-gradient(120deg,#071b34_0%,#0d4a53_52%,#162d45_100%)] px-4 py-5 shadow-[0_22px_55px_rgba(15,23,42,0.12)] sm:px-6 sm:py-6 lg:px-8">
            <div className="relative z-[1] grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.8fr)] lg:items-center">
              <div className="space-y-3">
                <p className="text-[7px] font-semibold uppercase tracking-[0.26em] text-cyan-200 sm:text-[10px]">
                  Resort Command Center
                </p>
                <div className="space-y-1">
                  <h1 className="max-w-l text-[1.25rem] font-black leading-[1.02] text-white sm:text-[2.4rem] xl:text-[0 rem]">
                    Operational snapshot for today
                  </h1>
                  <p className="max-w-3xl text-[12px] leading-5 text-slate-100/88 sm:text-[14px] sm:leading-6">
                    Track rooms, revenue, arrivals, and restaurant activity from
                    one cleaner dashboard built for daily hotel operations.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                {heroStats.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[20px] border border-white/12 bg-white/10 px-4 py-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md"
                  >
                    <span className="text-[11px] text-slate-100/78 sm:text-xs">{item.label}</span>
                    <div className="mt-3 text-[1.55rem] font-bold leading-none sm:text-[1.8rem]">
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric, index) => (
              <MetricCard
                key={index}
                title={metric.title}
                value={metric.value}
                subtitle={metric.subtitle}
                icon={metric.icon}
                gradient={metric.gradient}
                onClick={() => navigate(metric.route)}
              />
            ))}
          </div>

          <div className="grid w-full grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.52fr)_minmax(290px,0.82fr)]">
            <div className="w-full rounded-[24px] border border-white/70 bg-white/82 px-4 py-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:px-5 sm:py-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-emerald-300">
                    Revenue Trend
                  </p>
                  <h2 className="mt-1 text-[1.1rem] font-bold text-slate-900">
                    Reservation statistics
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/accounts")}
                  className="rounded-full bg-gradient-to-r from-teal-600 to-emerald-500 px-4 py-2.5 text-[12px] font-bold text-white shadow-[0_12px_30px_rgba(13,148,136,0.24)] transition hover:-translate-y-0.5"
                >
                  Open Accounts
                </button>
              </div>
              <div className="h-[280px] w-full sm:h-[320px] lg:h-[340px]">
                <MonthlyRevenueChart />
              </div>
            </div>

            <div className="grid gap-4">
              <div className="min-h-[290px] rounded-[24px] border border-white/70 bg-white/82 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-emerald-300">
                  Room Mix
                </p>
                <div className="mb-3 mt-1 text-[1.05rem] font-bold text-slate-900">
                  Occupancy overview
                </div>
                <RoomOccupancyChart />
              </div>

              <div className="flex min-h-[230px] items-center rounded-[24px] border border-white/70 bg-white/82 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5">
                <FoodSalesChart />
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/60 bg-white/72 p-3 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-4">
            <HomePage />
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
