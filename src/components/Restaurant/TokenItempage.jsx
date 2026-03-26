import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import API from "../../api";

const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;

const TokenItemsPage = () => {
  const { table } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const entityType = location.state?.entityType || "Table";
  const roomData = location.state?.roomData || null;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadItems = async () => {
      try {
        setLoading(true);
        const tokenRes = await API.get(`/token/table/${table}`);
        const tokenId = tokenRes.data?.id;

        if (!tokenId) {
          setItems([]);
          return;
        }

        const itemsRes = await API.get(`/token/items/${tokenId}`);
        setItems(itemsRes.data || []);
      } catch (error) {
        console.log("Error loading token items:", error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadItems();
  }, [table]);

  const normalizedItems = items.map((item) => ({
    ...item,
    name: item.item_name || item.name || "Menu Item",
    qty: Number(item.qty || item.quantity || 0),
    rate: Number(item.rate || item.price || 0),
    amount: Number(item.qty || item.quantity || 0) * Number(item.rate || item.price || 0),
  }));

  const subtotal = normalizedItems.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] shadow-[0_30px_80px_rgba(15,23,42,0.24)]">
        <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_48%,#0f766e_100%)] px-5 py-5 text-white sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200">Token Snapshot</p>
              <h3 className="mt-2 text-2xl font-black">
                {entityType} {table}
              </h3>
              <p className="mt-2 text-sm text-white/80">
                {roomData
                  ? `Room ${roomData.roomNo || table} | ${roomData.categoryName || "Room"} | ID ${roomData.roomId || "--"}`
                  : "Live token items ready for billing or editing"}
              </p>
            </div>
            <div className="rounded-[20px] border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.18em] text-cyan-100/85">Subtotal</div>
              <div className="mt-2 text-2xl font-black">{formatCurrency(subtotal)}</div>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-lg font-black text-slate-900">All Token Items</h4>
              <p className="mt-1 text-sm text-slate-500">Non-invoiced items with live quantity and pricing.</p>
            </div>
            <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-600">
              {normalizedItems.length} items
            </div>
          </div>

          <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-[minmax(0,1.7fr)_110px_120px_130px] border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
              <div>Item Name</div>
              <div className="text-center">Quantity</div>
              <div className="text-right">Unit Price</div>
              <div className="text-right">Amount</div>
            </div>

            {loading ? (
              <div className="px-4 py-10 text-center text-sm text-slate-400">Loading items...</div>
            ) : !normalizedItems.length ? (
              <div className="px-4 py-10 text-center text-sm text-slate-400">No items added yet.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {normalizedItems.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[minmax(0,1.7fr)_110px_120px_130px] items-center px-4 py-4 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900">{item.name}</div>
                      <div className="mt-1 text-xs text-slate-500">Token item #{item.id}</div>
                    </div>
                    <div className="text-center font-semibold text-slate-700">{item.qty}</div>
                    <div className="text-right font-semibold text-slate-700">{formatCurrency(item.rate)}</div>
                    <div className="text-right font-black text-slate-900">{formatCurrency(item.amount)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[22px] border border-emerald-100 bg-emerald-50/70 px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">Current Total</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{formatCurrency(subtotal)}</div>
              </div>
              <div className="text-sm text-slate-600">
                Add more menu items or edit current token before invoice.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <button
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              onClick={() => navigate("/restaurant")}
            >
              Close
            </button>

            <button
              className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
              onClick={() =>
                navigate(`/restaurant/menu/${table}`, {
                  state: {
                    entityType,
                    roomData,
                    existingItems: normalizedItems.map((item) => ({
                      id: item.id,
                      name: item.name,
                      qty: item.qty,
                      rate: item.rate,
                      amount: item.amount,
                    })),
                  },
                })
              }
            >
              Add More Item
            </button>

            <button
              className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
              onClick={() =>
                navigate(`/restaurant/edit-token/${table}`, {
                  state: { entityType, roomData },
                })
              }
            >
              Edit Token
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenItemsPage;
