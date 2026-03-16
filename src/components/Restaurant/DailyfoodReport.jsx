import React, { useState } from "react";

const DailyfoodReport = () => {

  const [date, setDate] = useState("");

  // Example Data (baad me API se aayega)
  const data = [
    {
      room: 201,
      status: "Confirmed",
      guest: "Agent Booking",
      checkin: "10-Jul-2024 12:00 PM",
      checkout: "12-Jul-2024 10:00 AM",
      adult: 1,
      child: 0,
      meal: "EP",
      food: 0.0,
    },
    {
      room: 202,
      status: "Confirmed",
      guest: "Palash",
      checkin: "08-Jul-2024 12:00 PM",
      checkout: "11-Jul-2024 10:00 AM",
      adult: 1,
      child: 0,
      meal: "EP",
      food: 0.0,
    },
    {
      room: 202,
      status: "Checked Out",
      guest: "shilto khan",
      checkin: "11-Jul-2024 03:01 PM",
      checkout: "13-Jul-2024 03:26 PM",
      adult: 2,
      child: 1,
      meal: "CP",
      food: 828.0,
    },
    {
      room: 203,
      status: "Checked Out",
      guest: "dtdyfdlufdo67",
      checkin: "10-Jul-2024",
      checkout: "11-Jul-2024",
      adult: 2,
      child: 0,
      meal: "CP",
      food: 2493.75,
    },
  ];

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

        <button className="bg-green-600 text-white px-4 py-2 rounded">
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

            {data.map((row, index) => (

              <tr key={index} className="border-b">

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