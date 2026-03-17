import React, { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RestaurantContext } from "../../Context/RestaurantContext";

const formatMoney = (value) => `Rs ${Number(value || 0).toFixed(2)}`;

const OrderSummaryPage = ({ tableNo }) => {
  const navigate = useNavigate();
  const {
    getOrderItemsForTable,
    removeItemFromOrder,
    clearOrder,
    updateOrderItem,
    createOrder,
  } = useContext(RestaurantContext);

  const [waiterName, setWaiterName] = useState("Waiter");
  const [sending, setSending] = useState(false);
  const [orderItems, setOrderItems] = useState([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const items = await getOrderItemsForTable(tableNo);
        if (active) setOrderItems(items);
      } catch (err) {
        console.error(err);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [getOrderItemsForTable, tableNo]);

  const totals = useMemo(() => {
    const subtotal = orderItems.reduce((acc, item) => {
      const qty = Math.max(1, Number(item.quantity) || 1);
      const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
      return acc + qty * unitPrice;
    }, 0);
    const gst = subtotal * 0.05;
    const serviceCharge = subtotal * 0.02;
    const total = subtotal + gst + serviceCharge;
    return { subtotal, gst, serviceCharge, total };
  }, [orderItems]);

  const onSendToKitchen = async () => {
    try {
      setSending(true);
      await createOrder({ waiterName, tableNo });
      alert("Order sent to kitchen successfully");
      navigate("/kitchen");
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || err.message || "Failed to send order to kitchen");
    } finally {
      setSending(false);
    }
  };

  if (orderItems.length === 0) {
    return (
      <div className="bg-slate-900/80 border border-cyan-900/30 rounded-3xl p-8 text-center">
        <div className="text-4xl mb-3 text-cyan-300">[Order]</div>
        <h3 className="text-lg font-extrabold text-white">Create Order</h3>
        <p className="text-slate-400 text-sm mt-2">Add dishes from the menu for table {tableNo}.</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-cyan-950/30 border border-cyan-900/30 rounded-3xl p-5 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-extrabold text-white">Create Order</h3>
        <button
          onClick={() => clearOrder(tableNo)}
          className="text-rose-300 text-xs font-semibold hover:text-rose-200"
        >
          Clear Cart
        </button>
      </div>

      <div className="mb-4">
        <label className="block text-xs text-slate-400 mb-1">Waiter Name</label>
        <input
          value={waiterName}
          onChange={(e) => setWaiterName(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
          placeholder="Enter waiter name"
        />
      </div>

      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
        {orderItems.map((item) => {
          const qty = Math.max(1, Number(item.quantity) || 1);
          const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
          const lineTotal = qty * unitPrice;
          return (
            <div key={item.orderItemId} className="bg-slate-800/80 border border-slate-700 rounded-2xl p-3">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <p className="font-bold text-white text-sm">{item.name}</p>
                  <p className="text-[11px] text-cyan-300 uppercase tracking-wider">{item.category || "Others"}</p>
                </div>
                <button
                  onClick={() => removeItemFromOrder(item.orderItemId, tableNo)}
                  className="text-slate-400 hover:text-rose-300 text-xs"
                >
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Dish Charge</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={unitPrice}
                    onChange={(e) => updateOrderItem(item.orderItemId, { unitPrice: e.target.value }, tableNo)}
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Quantity</label>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateOrderItem(item.orderItemId, { quantity: qty - 1 }, tableNo)}
                      className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={qty}
                      onChange={(e) => updateOrderItem(item.orderItemId, { quantity: e.target.value }, tableNo)}
                      className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white text-center"
                    />
                    <button
                      onClick={() => updateOrderItem(item.orderItemId, { quantity: qty + 1 }, tableNo)}
                      className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-2 text-right text-sm font-bold text-cyan-300">{formatMoney(lineTotal)}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-700 space-y-1 text-sm">
        <div className="flex justify-between text-slate-300">
          <span>Subtotal</span>
          <span>{formatMoney(totals.subtotal)}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>GST (5%)</span>
          <span>{formatMoney(totals.gst)}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>Service (2%)</span>
          <span>{formatMoney(totals.serviceCharge)}</span>
        </div>
        <div className="flex justify-between text-white text-lg font-black mt-1">
          <span>Total</span>
          <span>{formatMoney(totals.total)}</span>
        </div>
      </div>

      <button
        onClick={onSendToKitchen}
        disabled={sending || !waiterName.trim()}
        className="w-full mt-4 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-95 text-white font-extrabold disabled:opacity-60"
      >
        {sending ? "Sending..." : "Create Order & Send To Kitchen"}
      </button>
    </div>
  );
};

export default OrderSummaryPage;
