import React, { useState } from "react";

const Daywisefood = () => {

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reportData, setReportData] = useState([]);

  const generateReport = () => {

    const invoices =
      JSON.parse(localStorage.getItem("invoices")) || [];

    const result = {};

    invoices.forEach((inv) => {

      // safer date conversion
      const dateObj = new Date(inv.date);

      const dateKey =
        dateObj.getFullYear() +
        "-" +
        String(dateObj.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(dateObj.getDate()).padStart(2, "0");

      // date filter
      if (startDate && dateKey < startDate) return;
      if (endDate && dateKey > endDate) return;

      if (!result[dateKey]) {

        result[dateKey] = {
          date: dateKey,
          advance: 0,
          gst1: 0,
          inroom: 0,
          gst2: 0,
          restaurant: 0,
          gst3: 0,
          total: 0
        };

      }

      const subtotal = inv.total / 1.05;
      const gst = inv.total - subtotal;

      result[dateKey].restaurant += subtotal;
      result[dateKey].gst3 += gst;
      result[dateKey].total += inv.total;

    });

    setReportData(Object.values(result));

  };

  return (

    <div className="bg-gray-100 min-h-screen p-6">

      <div className="text-sm text-gray-500 mb-2">
        Home &gt; Daywise Food Report
      </div>

      <div className="bg-blue-600 text-white px-4 py-2 rounded-t">
        Daywise Food Report
      </div>

      <div className="bg-yellow-200 border p-4 flex flex-wrap gap-4 items-center">

        <div>
          <label className="text-sm">Start Date</label>
          <input
            type="date"
            className="border p-2 rounded ml-2"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm">End Date</label>
          <input
            type="date"
            className="border p-2 rounded ml-2"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <button
          onClick={generateReport}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Submit
        </button>

        <button
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Print
        </button>

      </div>

      <div className="bg-white border mt-3 overflow-x-auto">

        <table className="w-full text-sm">

          <thead className="bg-blue-200">

            <tr>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-right">Restaurant</th>
              <th className="p-2 text-right">GST</th>
              <th className="p-2 text-right">Total</th>
            </tr>

          </thead>

          <tbody>

            {reportData.length === 0 ? (

              <tr>
                <td colSpan="4" className="text-center p-4">
                  No Data Found
                </td>
              </tr>

            ) : (

              reportData.map((row, index) => (

                <tr key={index} className="border-b">

                  <td className="p-2">{row.date}</td>

                  <td className="p-2 text-right">
                    ₹{row.restaurant.toFixed(2)}
                  </td>

                  <td className="p-2 text-right">
                    ₹{row.gst3.toFixed(2)}
                  </td>

                  <td className="p-2 text-right font-semibold">
                    ₹{row.total.toFixed(2)}
                  </td>

                </tr>

              ))

            )}

          </tbody>

        </table>

      </div>

    </div>

  );

};

export default Daywisefood;