import React, { useState } from "react";

const SettlementReport = () => {

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const data = [
    {
      date: "2024-07-10 16:46:42",
      from: "Table / Table-1",
      to: "Table / Table-2",
      token: "BM5242501167",
      by: "Sujay Roy Chakraborty",
    },
    {
      date: "2024-07-10 06:11:17",
      from: "Room / 204",
      to: "Table / Table-5",
      token: "BM5242501178",
      by: "Sujay Roy Chakraborty",
    },
    {
      date: "2024-07-10 06:09:26",
      from: "Table / Table-4",
      to: "Room / 204",
      token: "BM5242501176",
      by: "Sujay Roy Chakraborty",
    },
  ];

  return (

    <div className="bg-gray-100 min-h-screen p-6">

      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 mb-2">
        Home &gt; Transfer Restaurant Token
      </div>

      {/* Header */}
      <div className="bg-blue-600 text-white px-4 py-2 rounded-t">
        Transferred Restaurant Tokens
      </div>

      {/* Filter Bar */}
      <div className="bg-yellow-200 border p-4 flex items-center gap-4 flex-wrap">

        <div>
          <label className="text-sm">Start Date</label>
          <input
            type="date"
            className="border p-2 ml-2 rounded"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm">End Date</label>
          <input
            type="date"
            className="border p-2 ml-2 rounded"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <button className="bg-green-600 text-white px-4 py-2 rounded">
          Submit
        </button>

        <button className="bg-blue-600 text-white px-4 py-2 rounded">
          Print
        </button>

      </div>

      {/* Transfer Buttons */}

      <div className="flex gap-3 mt-4">

        <button className="bg-green-600 text-white px-4 py-2 rounded text-sm">
          Transfer Token By Table +
        </button>

        <button className="bg-yellow-500 text-white px-4 py-2 rounded text-sm">
          Transfer Token By Token Code +
        </button>

        <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm">
          Transfer Token By Room +
        </button>

      </div>

      {/* Table Controls */}

      <div className="flex justify-between items-center mt-4">

        <button className="bg-blue-500 text-white px-3 py-2 rounded text-sm">
          Excel Export
        </button>

        <div className="flex items-center gap-3">

          <span className="text-sm">Display</span>

          <select className="border p-1 rounded text-sm">
            <option>15</option>
            <option>25</option>
            <option>50</option>
          </select>

          <span className="text-sm">records</span>

        </div>

        <div>

          <input
            type="text"
            placeholder="Search"
            className="border p-2 rounded text-sm"
          />

        </div>

      </div>

      {/* Table */}

      <div className="bg-white border mt-3 overflow-x-auto">

        <table className="w-full text-sm">

          <thead className="bg-blue-200">

            <tr>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Transferred From</th>
              <th className="p-2 text-left">Transferred To</th>
              <th className="p-2 text-left">Tokens</th>
              <th className="p-2 text-left">Transferred By</th>
            </tr>

          </thead>

          <tbody>

            {data.map((row, index) => (

              <tr key={index} className="border-b">

                <td className="p-2">{row.date}</td>

                <td className="p-2">{row.from}</td>

                <td className="p-2">{row.to}</td>

                <td className="p-2 text-blue-600 font-medium">
                  {row.token}
                </td>

                <td className="p-2">{row.by}</td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>

  );

};

export default SettlementReport;