import React, { useState } from "react";
import { reportService } from "../../services/reportService";

const Daywisefood = () => {

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reportData, setReportData] = useState([]);

  const generateReport = async () => {
    try {
      const rows = await reportService.getDaywiseFood(startDate, endDate);
      setReportData(rows);
    } catch (err) {
      console.error(err);
      alert("Failed to load report");
      setReportData([]);
    }
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

                  <td className="p-2">{row.bill_date || row.date}</td>

                  <td className="p-2 text-right">
                    ₹{Number(row.restaurant_sales || row.restaurant || 0).toFixed(2)}
                  </td>

                  <td className="p-2 text-right">
                    ₹{Number(row.gst_amount || row.gst3 || 0).toFixed(2)}
                  </td>

                  <td className="p-2 text-right font-semibold">
                    ₹{Number(row.total_sales || row.total || 0).toFixed(2)}
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
