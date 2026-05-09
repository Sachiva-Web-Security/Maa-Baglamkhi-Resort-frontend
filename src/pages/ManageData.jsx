import React, { useState, useEffect } from "react";
import API from "../api";
import "./ManageData.css";

const ManageData = () => {
  const [tab, setTab] = useState("rooms");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const tabs = [
    { id: "rooms", label: "Room Data" },
    { id: "bookings", label: "Booking Data" },
    { id: "inventory", label: "Inventory Data" },
    { id: "attendance", label: "Attendance Data" },
    { id: "transactions", label: "Transactions" },
    { id: "menu", label: "Menu Items" },
  ];

  useEffect(() => { fetchData(); }, [tab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let res;
      if (tab === "rooms") res = await API.get("/hotel/rooms/setup");
      else if (tab === "bookings") res = await API.get("/hotel/all-bookings");
      else if (tab === "inventory") res = await API.get("/inventory");
      else if (tab === "attendance") res = await API.get("/attendance");
      else if (tab === "transactions") res = await API.get("/accounts/transactions");
      else if (tab === "menu") res = await API.get("/restaurant/menu");
      setData(res?.data || []);
    } catch (err) {
      console.error("Error fetching data:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!data.length) return alert("No data to export");
    const headers = Object.keys(data[0] || {});
    const csv = [headers.join(","), ...data.map(row => headers.map(h => `"${row[h] ?? ""}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `manage-data-${tab}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const summary = {
    rooms: data.length,
    bookings: data.length,
    inventory: data.length,
    attendance: data.length,
    transactions: data.length,
    menu: data.length,
  };

  return (
    <div className="md-page">
      <div className="simple-page-header">
        <h1 className="simple-page-title">Manage Data</h1>
        <button className="simple-btn simple-btn-primary" onClick={exportCSV}>Export CSV</button>
      </div>

      <div className="md-tabs">
        {tabs.map(t => (
          <button key={t.id} className={`md-tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="simple-card">
        <div className="md-summary-bar">
          <span className="simple-text-muted">{summary[tab]} record(s) found</span>
          <button className="simple-btn simple-btn-outline" onClick={fetchData} disabled={loading}>{loading ? "Loading..." : "Refresh"}</button>
        </div>
        <div className="simple-table-wrapper">
          <table className="simple-table">
            <thead>
              <tr>
                {data[0] && Object.keys(data[0]).map(key => <th key={key}>{key}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i}>
                  {Object.values(row).map((val, j) => <td key={j}>{String(val ?? "")}</td>)}
                </tr>
              ))}
              {data.length === 0 && !loading && (
                <tr><td colSpan="10" className="text-center p-6 text-gray-400">No data found for this category</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManageData;