import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import API from "../../api";

const ACTIVE_INVOICE_KEY = "restaurant-active-invoice";
const SAVED_INVOICE_KEY = "restaurant-saved-invoice";

const EditToken = () => {
  const { table } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const entityType = location.state?.entityType || localStorage.getItem(`entityType:${table}`) || "Table";
  const roomData = location.state?.roomData || null;

  const [tokenId, setTokenId] = useState(null);
  const [items, setItems] = useState([]);
  const [kitchenOrder, setKitchenOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const readySound = useRef(null);
  const lastReadyKey = useRef("");

  useEffect(() => {
    readySound.current = new Audio("/order.mp3");
  }, []);

  useEffect(() => {
    const loadTokenItems = async () => {
      try {
        setLoading(true);
        const tokenRes = await API.get(`/token/table/${table}`);
        const activeTokenId = tokenRes.data?.id || null;
        setTokenId(activeTokenId);

        if (!activeTokenId) {
          setItems([]);
          return;
        }

        const itemsRes = await API.get(`/token/items/${activeTokenId}`);
        setItems(itemsRes.data || []);
      } catch (error) {
        console.log("Error loading edit token:", error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadTokenItems();
  }, [table]);

  useEffect(() => {
    let active = true;

    const loadKitchenOrder = async () => {
      try {
        const response = await API.get("/kitchen/orders");
        const rows = Array.isArray(response.data) ? response.data : [];
        const match = rows.find((order) => {
          const orderRef = String(order.table || order.table_number || order.table_no || "");
          const orderEntityType = String(order.entityType || "").trim() || "Table";
          return (
            orderRef === String(table) &&
            orderEntityType.toLowerCase() === String(entityType).toLowerCase() &&
            String(order.status || "").toLowerCase() !== "cancelled"
          );
        });

        if (!active) return;

        setKitchenOrder(match || null);

        if (match && String(match.status || "").toLowerCase() === "ready") {
          const readyKey = `${match.id}:${match.readyAt || match.expectedReadyAt || "ready"}`;
          if (lastReadyKey.current !== readyKey) {
            lastReadyKey.current = readyKey;
            readySound.current?.play().catch(() => {});
          }
        }
      } catch (error) {
        if (active) {
          console.log("Kitchen status load failed:", error);
          setKitchenOrder(null);
        }
      }
    };

    loadKitchenOrder();
    const interval = setInterval(loadKitchenOrder, 4000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [entityType, table]);

  const handleChange = (id, field, value) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const deleteItem = async (id) => {
    try {
      await API.delete(`/token/item/${id}`);
      setItems((current) => current.filter((item) => item.id !== id));
    } catch (error) {
      alert(error.response?.data?.message || "Item delete nahi ho paaya.");
    }
  };

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.rate || 0), 0),
    [items],
  );

  const tax = subtotal * 0.05;
  const total = subtotal + tax;

  const handleUpdate = async () => {
    if (!items.length) {
      alert("No items to update");
      return;
    }

    try {
      await Promise.all(
        items.map((item) =>
          API.put("/token/item", {
            id: item.id,
            qty: Number(item.qty),
            rate: Number(item.rate),
          }),
        ),
      );

      alert("Token updated successfully");
    } catch (error) {
      alert(error.response?.data?.message || "Token update nahi ho paaya.");
    }
  };

  const handleInvoice = () => {
    const invoicePayload = {
      table,
      tokenId,
      items: items.map((item) => ({
        id: item.id,
        name: item.item_name,
        qty: Number(item.qty),
        rate: Number(item.rate),
      })),
      subtotal,
      gst: tax,
      total,
      date: new Date().toISOString(),
      entityType,
      roomData,
    };

    localStorage.setItem(ACTIVE_INVOICE_KEY, JSON.stringify(invoicePayload));
    localStorage.setItem(SAVED_INVOICE_KEY, JSON.stringify(invoicePayload));
    navigate("/restaurant/payment", { state: invoicePayload });
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-100 p-6">Loading token...</div>;
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#19253c_0%,#1f2d47_100%)] p-4 sm:p-6">
      <div className="mx-auto max-w-[1320px] space-y-6">
        <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_50%,#0f766e_100%)] px-6 py-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.25)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200">Edit Token</p>
              <h1 className="mt-2 text-3xl font-black">Manage room token with cleaner billing view</h1>
              <p className="mt-2 text-sm text-white/80">
                Token #{tokenId || "Not Created"} | {entityType} / {table}
              </p>
            </div>
            <button
              onClick={() => navigate(`/restaurant/menu/${table}`, { state: { entityType, roomData } })}
              className="rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-lg"
            >
              Open Menu Card
            </button>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-[26px] border border-slate-200/70 bg-white/95 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.1)]">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-[20px] bg-slate-50 px-4 py-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Token Code</div>
                <div className="mt-2 text-lg font-black text-slate-900">{tokenId || "Not Created"}</div>
              </div>
              <div className="rounded-[20px] bg-slate-50 px-4 py-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Reference</div>
                <div className="mt-2 text-lg font-black text-slate-900">{entityType} / {table}</div>
              </div>
              <div className="rounded-[20px] bg-slate-50 px-4 py-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Waiter</div>
                <div className="mt-2 text-lg font-black text-slate-900">Waiter</div>
              </div>
            </div>

            {roomData ? (
              <div className="mt-4 rounded-[18px] bg-[linear-gradient(135deg,#eff6ff_0%,#f8fafc_100%)] px-4 py-4 text-sm text-slate-700">
                Room {table} | {roomData.categoryName || "Room"} | ID {roomData.roomId || "--"}
              </div>
            ) : null}

            {kitchenOrder ? (
              <div
                className={`mt-4 rounded-[18px] border px-4 py-4 text-sm ${
                  String(kitchenOrder.status || "").toLowerCase() === "ready"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-amber-200 bg-amber-50 text-amber-800"
                }`}
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em]">
                  Kitchen Status
                </div>
                <div className="mt-2 text-lg font-black">
                  {kitchenOrder.status || "Pending"}
                </div>
                <div className="mt-1">
                  {String(kitchenOrder.status || "").toLowerCase() === "ready"
                    ? kitchenOrder.readyMessage || `${entityType} ${table} order ready hai.`
                    : `ETA ${kitchenOrder.prepTimeMinutes || 20} min | Ready by ${new Date(
                        kitchenOrder.expectedReadyAt || Date.now(),
                      ).toLocaleTimeString("en-IN", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}`}
                </div>
              </div>
            ) : null}

            <div className="mt-5 overflow-hidden rounded-[22px] border border-slate-200">
              <div className="grid grid-cols-[minmax(0,1.3fr)_120px_140px_120px_110px] bg-slate-100 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-600">
                <div>Item</div>
                <div className="text-center">Quantity</div>
                <div className="text-center">Rate</div>
                <div className="text-center">Amount</div>
                <div className="text-center">Action</div>
              </div>

              {items.map((item, index) => (
                <div
                  key={item.id}
                  className={`grid grid-cols-[minmax(0,1.3fr)_120px_140px_120px_110px] items-center gap-2 border-t border-slate-100 px-4 py-3 ${index % 2 ? "bg-slate-50/70" : "bg-white"}`}
                >
                  <input value={item.item_name} readOnly className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700" />
                  <div className="flex justify-center">
                    <input
                      type="number"
                      value={item.qty}
                      className="w-20 rounded-xl border border-slate-200 px-3 py-2 text-center text-sm"
                      onChange={(event) => handleChange(item.id, "qty", event.target.value)}
                    />
                  </div>
                  <div className="flex justify-center">
                    <input
                      type="number"
                      value={item.rate}
                      className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-center text-sm"
                      onChange={(event) => handleChange(item.id, "rate", event.target.value)}
                    />
                  </div>
                  <div className="text-center font-bold text-slate-900">Rs. {Number(item.qty) * Number(item.rate)}</div>
                  <div className="flex justify-center">
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-bold text-white"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}

              {!items.length ? (
                <div className="px-4 py-10 text-center text-sm text-slate-400">No token items found.</div>
              ) : null}
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[26px] border border-slate-200/70 bg-white/95 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.1)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-emerald-600">Billing</p>
              <h3 className="mt-2 text-xl font-black text-slate-900">Token totals</h3>

              <div className="mt-5 space-y-3 rounded-[22px] bg-[linear-gradient(135deg,#f8fbff_0%,#f3f9f5_100%)] p-5">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-bold text-slate-900">Rs. {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Tax (5%)</span>
                  <span className="font-bold text-slate-900">Rs. {tax.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-lg font-black text-slate-900">
                  <span>Total</span>
                  <span>Rs. {total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-[26px] border border-slate-200/70 bg-white/95 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.1)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-sky-700">Actions</p>
              <div className="mt-4 grid gap-3">
                <button
                  onClick={handleUpdate}
                  className="rounded-[18px] bg-emerald-600 px-4 py-3 text-sm font-bold text-white"
                >
                  Update Token
                </button>
                <button
                  onClick={handleInvoice}
                  disabled={!items.length}
                  className="rounded-[18px] bg-blue-600 px-4 py-3 text-sm font-bold text-white"
                >
                  Create Invoice
                </button>
                <button
                  onClick={() => navigate("/restaurant")}
                  className="rounded-[18px] border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default EditToken;
