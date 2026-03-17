import React, { useState } from "react";
import { reportService } from "../../services/reportService";

const DailyfoodReport = () => {

  const [date, setDate] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await reportService.getDailyRoomFood(date);
      setRows(data || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load report");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  return (

    <div className="bg-gray-100 min-h-screen p-6">

      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 mb-2">
        Home &gt; Daily Roomwise Food Sale Report
      </div>

      {/* Header */}
      <div className="bg-blue-600 text-white px-4 py-2 rounded-t">
        Daily Roomwise Food Sale Report
      </div>

      {/* Filter Bar */}
      <div className="bg-yellow-200 border p-4 flex items-center gap-4">

        <label className="text-sm font-medium">
          Start Date
        </label>

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border p-2 rounded"
        />

        <button
          onClick={load}
          className="bg-green-600 text-white px-4 py-2 rounded"
          disabled={loading}
        >
          Submit
        </button>

        <button className="bg-blue-600 text-white px-4 py-2 rounded">
          Print
        </button>

      </div>

      {/* Table */}

      <div className="bg-white border mt-4 overflow-x-auto">

        <table className="w-full text-sm">

          <thead className="bg-blue-200">

            <tr>

              <th className="p-2 text-left">Room No.</th>
              <th className="p-2 text-left">Guest Status</th>
              <th className="p-2 text-left">Guest Name</th>
              <th className="p-2 text-left">Check In</th>
              <th className="p-2 text-left">Check Out</th>
              <th className="p-2 text-center">Pax Adult</th>
              <th className="p-2 text-center">Pax Child</th>
              <th className="p-2 text-center">Meal Plan</th>
              <th className="p-2 text-right">Food</th>

            </tr>

          </thead>

          <tbody>

            {rows.map((row, index) => (

              <tr key={index} className="border-b ">

                <td className="p-2">{row.room}</td>

                <td className="p-2">{row.status}</td>

                <td className="p-2 text-red-600 font-medium">
                  {row.guest}
                </td>

                <td className="p-2">{row.checkin}</td>

                <td className="p-2">{row.checkout}</td>

                <td className="p-2 text-center">
                  {row.adult}
                </td>

                <td className="p-2 text-center">
                  {row.child}
                </td>

                <td className="p-2 text-center">
                  {row.meal}
                </td>

                <td className="p-2 text-right">
                  {row.food.toFixed(2)}
                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>

  );

};

export default DailyfoodReport;
