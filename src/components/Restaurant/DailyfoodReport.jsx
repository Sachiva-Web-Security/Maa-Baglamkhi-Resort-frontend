import React, { useEffect, useMemo, useState } from "react";
import { reportService } from "../../services/reportService";

const formatCurrency = (value) => `Rs. ${Number(value || 0).toFixed(2)}`;

const DailyfoodReport = () => {
  const [date, setDate] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const totalFood = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.food || 0), 0),
    [rows],
  );
  const occupiedRooms = useMemo(
    () => rows.filter((row) => String(row.status || "").toLowerCase() !== "unknown").length,
    [rows],
  );
  const totalGuests = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.adult || 0) + Number(row.child || 0), 0),
    [rows],
  );

  const load = async () => {
    try {
      setLoading(true);
      setAttempted(true);
      setErrorMessage("");
      const data = await reportService.getDailyRoomFood(date || undefined);
      setRows(data || []);
      setSelectedRow((data || [])[0] || null);
      if (!date && data?.[0]?.reportDate) {
        setDate(String(data[0].reportDate).slice(0, 10));
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Report abhi load nahi hua. Backend restart karke dobara try kijiye.");
      setRows([]);
      setSelectedRow(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialLoad = async () => {
      try {
        setLoading(true);
        setAttempted(true);
        setErrorMessage("");
        const data = await reportService.getDailyRoomFood(undefined);
        setRows(data || []);
        setSelectedRow((data || [])[0] || null);
        if (data?.[0]?.reportDate) {
          setDate(String(data[0].reportDate).slice(0, 10));
        }
      } catch (err) {
        console.error(err);
        setErrorMessage("Report abhi load nahi hua. Backend restart karke dobara try kijiye.");
        setRows([]);
        setSelectedRow(null);
      } finally {
        setLoading(false);
      }
    };

    initialLoad();
  }, []);

  const printReport = () => {
    const body = (rows || [])
      .map(
        (r) => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${r.room || "-"}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${r.status || "-"}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${r.guest || "-"}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${r.checkin || "-"}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${r.checkout || "-"}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0; text-align:center;">${r.adult ?? "-"}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0; text-align:center;">${r.child ?? "-"}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0; text-align:center;">${r.meal || "-"}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0; text-align:right;">${formatCurrency(r.food || 0)}</td>
        </tr>`,
      )
      .join("");

    const win = window.open("", "_blank");
    win.document.write(`
      <html>
        <head>
          <title>Daily Roomwise Food Sale Report</title>
          <style>
            body { font-family: "Segoe UI", sans-serif; color:#0f172a; padding:16px; }
            h2 { margin:0 0 8px 0; }
            .meta { color:#64748b; font-size:12px; margin-bottom:12px; }
            table { width:100%; border-collapse:collapse; font-size:13px; }
            th { text-align:left; padding:8px; background:#f8fafc; border-bottom:1px solid #e2e8f0; color:#475569; letter-spacing:0.02em; }
          </style>
        </head>
        <body>
          <h2>Daily Roomwise Food Sale Report</h2>
          <div class="meta">Date: ${date || "-"}</div>
          <table>
            <thead>
              <tr>
                <th>Room No.</th><th>Guest Status</th><th>Guest Name</th><th>Check In</th><th>Check Out</th><th>Adult</th><th>Child</th><th>Meal Plan</th><th style="text-align:right;">Food</th>
              </tr>
            </thead>
            <tbody>
              ${body || `<tr><td colspan="9" style="padding:12px;text-align:center;color:#94a3b8;">No data</td></tr>`}
            </tbody>
          </table>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#19253c_0%,#1f2d47_100%)] p-4 sm:p-6">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_50%,#0f766e_100%)] px-6 py-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.25)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200">
                Daily Roomwise Food Sale Report
              </p>
              <h1 className="mt-2 text-3xl font-black">Track room food billing with a cleaner report view</h1>
              <p className="mt-2 text-sm text-white/80">
                Room no, guest stay, meal plan aur food amount ko row-wise analyze kijiye.
              </p>
            </div>
            <button onClick={printReport} className="rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-lg">
              Print Report
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[22px] border border-slate-200/70 bg-white/95 px-5 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.1)]">
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Rooms in Report</div>
            <div className="mt-2 text-3xl font-black text-slate-900">{rows.length}</div>
          </div>
          <div className="rounded-[22px] border border-slate-200/70 bg-white/95 px-5 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.1)]">
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Occupied Rooms</div>
            <div className="mt-2 text-3xl font-black text-slate-900">{occupiedRooms}</div>
          </div>
          <div className="rounded-[22px] border border-slate-200/70 bg-white/95 px-5 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.1)]">
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Total Food Sale</div>
            <div className="mt-2 text-3xl font-black text-slate-900">{formatCurrency(totalFood)}</div>
          </div>
        </section>

        <section className="rounded-[26px] border border-slate-200/70 bg-white/95 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.1)]">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_140px_120px] md:items-end">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Report Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-2 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>
            <button onClick={load} disabled={loading} className="rounded-[18px] bg-emerald-600 px-4 py-3 text-sm font-bold text-white">
              {loading ? "Loading..." : "Submit"}
            </button>
            <button onClick={printReport} className="rounded-[18px] bg-blue-600 px-4 py-3 text-sm font-bold text-white">
              Print
            </button>
          </div>
          {errorMessage ? (
            <div className="mt-4 rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              {errorMessage}
            </div>
          ) : null}
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="rounded-[26px] border border-slate-200/70 bg-white/95 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.1)]">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">Report Rows</p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">Roomwise food sale data</h2>
              </div>
              <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600">
                Guests {totalGuests}
              </div>
            </div>

            {attempted && rows.length === 0 && !loading ? (
              <div className="py-14 text-center text-sm text-slate-500">No Data Found</div>
            ) : null}

            {loading ? (
              <div className="py-14 text-center text-sm text-slate-500">Loading...</div>
            ) : null}

            {!loading && rows.length > 0 ? (
              <div className="mt-5 overflow-hidden rounded-[22px] border border-slate-200">
                <div className="grid grid-cols-[100px_130px_minmax(0,1.2fr)_120px_120px_100px_120px] bg-slate-100 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-600">
                  <div>Room</div>
                  <div>Status</div>
                  <div>Guest</div>
                  <div>Check In</div>
                  <div>Check Out</div>
                  <div className="text-center">Pax</div>
                  <div className="text-right">Food</div>
                </div>
                <div className="max-h-[640px] overflow-auto">
                  {rows.map((row, index) => (
                    <button
                      key={`${row.room}-${index}`}
                      type="button"
                      onClick={() => setSelectedRow(row)}
                      className={`grid w-full grid-cols-[100px_130px_minmax(0,1.2fr)_120px_120px_100px_120px] items-center gap-2 border-t border-slate-100 px-4 py-4 text-left ${selectedRow?.room === row.room ? "bg-blue-50" : "bg-white hover:bg-slate-50"}`}
                    >
                      <div className="font-black text-slate-900">{row.room}</div>
                      <div className="text-sm text-slate-700">{row.status}</div>
                      <div className="text-sm font-semibold text-rose-600">{row.guest}</div>
                      <div className="text-sm text-slate-600">{row.checkin || "-"}</div>
                      <div className="text-sm text-slate-600">{row.checkout || "-"}</div>
                      <div className="text-center text-sm font-bold text-slate-700">
                        {Number(row.adult || 0) + Number(row.child || 0)}
                      </div>
                      <div className="text-right text-sm font-black text-slate-900">
                        {formatCurrency(row.food || 0)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-[26px] border border-slate-200/70 bg-white/95 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.1)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-600">Details Panel</p>
            <h3 className="mt-2 text-2xl font-black text-slate-900">Selected room summary</h3>

            {selectedRow ? (
              <div className="mt-5 space-y-3">
                {[
                  ["Room No", selectedRow.room],
                  ["Guest Status", selectedRow.status],
                  ["Guest Name", selectedRow.guest],
                  ["Check In", selectedRow.checkin],
                  ["Check Out", selectedRow.checkout],
                  ["Adult", selectedRow.adult],
                  ["Child", selectedRow.child],
                  ["Meal Plan", selectedRow.meal],
                  ["Food Amount", formatCurrency(selectedRow.food || 0)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[18px] bg-slate-50 px-4 py-4">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</div>
                    <div className="mt-1 text-sm font-black text-slate-900">{value || "-"}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-[18px] bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                Kisi row par click karke room detail dekhiye.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default DailyfoodReport;
