import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { FiArrowRight, FiClipboard, FiCoffee, FiMapPin, FiUser } from "react-icons/fi";
import API from "../../api";

const TokenPage = () => {
  const navigate = useNavigate();
  const { table } = useParams();
  const location = useLocation();
  const entityType = location.state?.entityType || "Table";
  const roomData = location.state?.roomData || null;

  const [items, setItems] = useState([]);
  const [tokenId, setTokenId] = useState(null);
  const [loading, setLoading] = useState(true);
  const waiterName = "Waiter";

  useEffect(() => {
    const loadToken = async () => {
      try {
        setLoading(true);

        const tokenRes = await API.get(`/token/table/${table}`);
        const activeToken = tokenRes.data?.id ? tokenRes.data : null;

        if (!activeToken) {
          setTokenId(null);
          setItems([]);
          return;
        }

        setTokenId(activeToken.id);

        const itemsRes = await API.get(`/token/items/${activeToken.id}`);
        setItems(itemsRes.data || []);
      } catch (error) {
        console.log("Error loading token:", error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadToken();
  }, [table]);

  const ensureTokenAndOpenMenu = async () => {
    try {
      let resolvedTokenId = tokenId;

      if (!resolvedTokenId) {
        const res = await API.post("/token/create", {
          tableNumber: String(table),
          waiter: waiterName,
        });
        resolvedTokenId = res.data?.tokenId;
        setTokenId(resolvedTokenId);
      }

      navigate(`/restaurant/menu/${table}`, {
        state: { entityType, roomData },
      });
    } catch (error) {
      alert(error.response?.data?.message || "Token create nahi ho paaya.");
    }
  };

  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.rate || 0), 0),
    [items],
  );

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#eef6ff_0%,#f8fbff_38%,#fff8ef_100%)] p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="overflow-hidden rounded-[30px] border border-white/70 bg-[linear-gradient(125deg,#111827_0%,#1d4ed8_48%,#0f766e_100%)] px-6 py-7 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_320px] lg:items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-cyan-200">Restaurant Token</p>
              <h1 className="mt-3 text-3xl font-black sm:text-4xl">Create and manage room token beautifully</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-100/85 sm:text-base">
                Room token, menu flow aur live item summary ko ek hi cleaner premium workspace me manage kariye.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-[22px] border border-white/15 bg-white/10 p-4 backdrop-blur">
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-100/80">Reference</div>
                <div className="mt-2 text-2xl font-black">{table}</div>
              </div>
              <div className="rounded-[22px] border border-white/15 bg-white/10 p-4 backdrop-blur">
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-100/80">Token ID</div>
                <div className="mt-2 text-2xl font-black">{tokenId || "Pending"}</div>
              </div>
              <div className="rounded-[22px] border border-white/15 bg-white/10 p-4 backdrop-blur">
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-100/80">Items</div>
                <div className="mt-2 text-2xl font-black">{items.length}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
          <div className="rounded-[28px] border border-slate-200/70 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700">Token Details</p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">Ready to open room order</h2>
              </div>
              <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">{entityType}</div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <FiClipboard /> Token Type
                </div>
                <div className="mt-3 text-lg font-black text-slate-900">{entityType}</div>
              </div>

              <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <FiUser /> Waiter
                </div>
                <div className="mt-3 text-lg font-black text-slate-900">{waiterName}</div>
              </div>

              <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <FiMapPin /> Reference
                </div>
                <div className="mt-3 text-lg font-black text-slate-900">{table}</div>
                <div className="mt-1 text-xs text-slate-500">Table No / Room No / Phone No.</div>
              </div>

              <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <FiCoffee /> POS
                </div>
                <div className="mt-3 text-lg font-black text-slate-900">Foods of Heaven</div>
              </div>
            </div>

            {roomData ? (
              <div className="mt-5 rounded-[24px] border border-sky-200 bg-[linear-gradient(135deg,#eff6ff_0%,#f8fbff_100%)] p-5">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">Room No</div>
                    <div className="mt-2 text-lg font-black text-slate-900">{roomData.roomNo || table}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">Room Type</div>
                    <div className="mt-2 text-lg font-black text-slate-900">{roomData.categoryName || "Room"}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">Room ID</div>
                    <div className="mt-2 text-lg font-black text-slate-900">{roomData.roomId || "--"}</div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                className="inline-flex items-center gap-2 rounded-[18px] bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(16,185,129,0.24)]"
                onClick={ensureTokenAndOpenMenu}
              >
                Add Item
                <FiArrowRight />
              </button>

              <button
                className="inline-flex items-center gap-2 rounded-[18px] bg-gradient-to-r from-rose-500 to-orange-500 px-5 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(244,63,94,0.22)]"
                onClick={ensureTokenAndOpenMenu}
              >
                Menu Card
                <FiArrowRight />
              </button>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200/70 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-violet-600">Live Summary</p>
            <h3 className="mt-2 text-2xl font-black text-slate-900">Token item snapshot</h3>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] bg-slate-950 p-4 text-white">
                <div className="text-xs uppercase tracking-[0.18em] text-white/65">Active Token</div>
                <div className="mt-2 text-2xl font-black">{tokenId || "Not created"}</div>
              </div>
              <div className="rounded-[22px] bg-amber-50 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-amber-700">Total Amount</div>
                <div className="mt-2 text-2xl font-black text-amber-900">Rs. {totalAmount.toLocaleString("en-IN")}</div>
              </div>
            </div>

            <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">Current items</div>
                <div className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500">{items.length} rows</div>
              </div>

              <div className="mt-4 space-y-3">
                {loading ? (
                  <div className="rounded-[18px] border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                    Loading token items...
                  </div>
                ) : !items.length ? (
                  <div className="rounded-[18px] border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                    No items added yet
                  </div>
                ) : (
                  items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-[18px] border border-slate-200 bg-white px-4 py-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-black text-slate-900">{item.item_name}</div>
                          <div className="mt-1 text-xs text-slate-500">Qty {item.qty} | Rate Rs. {item.rate}</div>
                        </div>
                        <div className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
                          Rs. {(Number(item.qty) * Number(item.rate)).toLocaleString("en-IN")}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                className="rounded-[18px] bg-gradient-to-r from-emerald-500 to-green-600 px-5 py-3 text-sm font-bold text-white"
                onClick={ensureTokenAndOpenMenu}
              >
                Submit
              </button>

              <button
                className="rounded-[18px] border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700"
                onClick={() => navigate("/restaurant")}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TokenPage;
