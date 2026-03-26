export default function CleaningLogPanel({ logs = [] }) {
  return (
    <div className="rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-6">
      <div className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-700">Audit Trail</p>
        <h2 className="mt-2 text-2xl font-black text-slate-900">Cleaning Logs</h2>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-[1.6rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
          No logs found
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[1.6rem] border border-slate-200">
          <table className="min-w-full border-collapse overflow-hidden bg-white">
            <thead>
              <tr className="bg-[linear-gradient(135deg,#0f172a_0%,#1e3a8a_100%)] text-left text-white">
                <th className="px-4 py-4 text-xs uppercase tracking-[0.16em]">Room</th>
                <th className="px-4 py-4 text-xs uppercase tracking-[0.16em]">Old Status</th>
                <th className="px-4 py-4 text-xs uppercase tracking-[0.16em]">New Status</th>
                <th className="px-4 py-4 text-xs uppercase tracking-[0.16em]">Assignee</th>
                <th className="px-4 py-4 text-xs uppercase tracking-[0.16em]">Notes</th>
                <th className="px-4 py-4 text-xs uppercase tracking-[0.16em]">Changed At</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-slate-200 bg-white text-sm text-slate-600">
                  <td className="px-4 py-3 font-semibold text-slate-900">{log.roomNo}</td>
                  <td className="px-4 py-3">{log.oldStatus || "-"}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{log.newStatus}</td>
                  <td className="px-4 py-3">{log.assignee || "-"}</td>
                  <td className="px-4 py-3">{log.notes || "-"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {log.changed_at
                      ? new Date(log.changed_at).toLocaleString()
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
