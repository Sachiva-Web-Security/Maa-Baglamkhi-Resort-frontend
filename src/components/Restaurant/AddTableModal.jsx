import React from "react";

const AddTableModal = ({
  open,
  onClose,
  onSubmit,
  value,
  setValue,
  loading = false,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/45 p-4">
      <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.32)]">
        <div className="text-[11px] uppercase tracking-[0.26em] text-blue-700">Add Table</div>
        <div className="mt-2 text-3xl font-black text-slate-900">Create a new table</div>

        <div className="mt-5 grid gap-4">
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Enter Table No"
            className="rounded-[18px] border-2 border-slate-200 px-4 py-4 text-lg outline-none focus:border-blue-400"
          />
          <div className="rounded-[20px] bg-slate-50 px-4 py-4 text-sm text-slate-600">
            Table number only. Backend me direct create hoga.
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-3 font-bold text-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={loading}
            className="rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white disabled:opacity-60"
          >
            {loading ? "Saving..." : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddTableModal;
