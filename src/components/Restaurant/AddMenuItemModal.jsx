import React from "react";
import { FiChevronDown } from "react-icons/fi";

const AddMenuItemModal = ({
  open,
  onClose,
  onSubmit,
  form,
  setForm,
  categories,
  catalogByCategory,
  expandedCategory,
  setExpandedCategory,
  imagePreview,
  imageFileName,
  onImageChange,
  loading = false,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/45 p-4">
      <div className="w-full max-w-xl rounded-[28px] bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.32)]">
        <div className="text-[11px] uppercase tracking-[0.26em] text-blue-700">Add Menu Item</div>
        <div className="mt-2 text-3xl font-black text-slate-900">Create a new menu option</div>

        <div className="mt-5 grid gap-4">
          <input
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Item Name"
            className="rounded-[18px] border-2 border-slate-200 px-4 py-4 text-lg outline-none focus:border-blue-400"
          />
          <input
            type="number"
            value={form.price}
            onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
            placeholder="Price"
            className="rounded-[18px] border-2 border-slate-200 px-4 py-4 text-lg outline-none focus:border-blue-400"
          />

          <label className="block cursor-pointer rounded-[20px] border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-blue-300 hover:bg-blue-50/40">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-sm">
                {imagePreview ? (
                  <img src={imagePreview} alt="Selected preview" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-center text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Preview
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-slate-900">Upload Image</div>
                <div className="mt-1 text-xs text-slate-500">
                  JPG, PNG or WEBP. This image will show on the menu card.
                </div>
                <div className="mt-3 inline-flex rounded-full bg-blue-600 px-4 py-2 text-xs font-bold text-white">
                  Choose File
                </div>
                <div className="mt-2 text-xs text-slate-500">{imageFileName || "No file selected"}</div>
                <input type="file" accept="image/*" onChange={onImageChange} className="hidden" />
              </div>
            </div>
          </label>

          <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-3">
            <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Categories</div>
            <div className="max-h-[320px] space-y-3 overflow-auto pr-1">
              {categories.map((category) => {
                const expanded = expandedCategory === category;
                const items = catalogByCategory[category] || [];
                const selected = form.category === category;

                return (
                  <div key={category} className="overflow-hidden rounded-[18px] border border-slate-200 bg-white">
                    <button
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({ ...prev, category }));
                        setExpandedCategory(expanded ? "" : category);
                      }}
                      className={`flex w-full items-center justify-between px-4 py-4 text-left ${
                        selected ? "bg-blue-600 text-white" : "text-slate-800"
                      }`}
                    >
                      <div>
                        <div className="font-black">{category}</div>
                        <div className={`text-xs ${selected ? "text-white/80" : "text-slate-500"}`}>
                          {items.length} items
                        </div>
                      </div>
                      <FiChevronDown className={`text-xl transition ${expanded ? "rotate-180" : ""}`} />
                    </button>

                    {expanded ? (
                      <div className="border-t border-slate-100 bg-slate-50 px-3 py-3">
                        {items.length ? (
                          items.map((item) => (
                            <div key={`${category}-${item.id}`} className="mb-2 flex items-center justify-between rounded-xl bg-white px-3 py-3 text-sm">
                              <span className="font-semibold text-slate-700">{item.name}</span>
                              <span className="font-bold text-slate-900">Rs. {item.price}</span>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-xl bg-white px-3 py-3 text-sm text-slate-500">
                            Is category me abhi koi item nahi hai.
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
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

export default AddMenuItemModal;
