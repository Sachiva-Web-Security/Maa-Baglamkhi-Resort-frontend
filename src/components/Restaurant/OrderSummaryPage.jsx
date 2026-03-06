import React, { useContext } from "react";
import { RestaurantContext } from "../../Context/RestaurantContext";

const OrderSummaryPage = () => {
    const { orderItems, removeItemFromOrder, clearOrder } = useContext(RestaurantContext);

    const subtotal = orderItems.reduce((acc, item) => acc + item.price, 0);
    const gst = subtotal * 0.05;
    const total = subtotal + gst;

    if (orderItems.length === 0) {
        return (
            <div className="bg-slate-800/50 border border-slate-700 rounded-3xl p-8 flex flex-col items-center justify-center text-center">
                <div className="text-4xl mb-4 opacity-30 text-slate-400">📝</div>
                <p className="text-slate-400 font-medium">Cart is Empty</p>
                <p className="text-slate-500 text-xs mt-1">Select dishes from the menu to start ordering</p>
            </div>
        );
    }

    return (
        <div className="bg-slate-850 border border-slate-700 rounded-3xl p-6 shadow-2xl flex flex-col h-full max-h-[70vh]">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Order Summary</h3>
                <button
                    onClick={clearOrder}
                    className="text-red-400 hover:text-red-300 text-xs font-bold uppercase tracking-wider"
                >
                    Clear
                </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-2 no-scrollbar">
                {orderItems.map((item) => (
                    <div
                        key={item.orderItemId}
                        className="flex justify-between items-center bg-slate-800/40 p-3 rounded-xl border border-slate-700/30 group animate-in fade-in slide-in-from-right-4"
                    >
                        <div>
                            <p className="font-bold text-slate-200">{item.name}</p>
                            <p className="text-xs text-indigo-400 font-bold">₹{item.price}</p>
                        </div>
                        <button
                            onClick={() => removeItemFromOrder(item.orderItemId)}
                            className="text-slate-500 hover:text-red-400 transition-colors p-2"
                        >
                            🗑️
                        </button>
                    </div>
                ))}
            </div>

            <div className="pt-6 border-t border-slate-700 space-y-2">
                <div className="flex justify-between text-slate-400 text-sm">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400 text-sm">
                    <span>GST (5%)</span>
                    <span>₹{gst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-white font-bold text-xl mt-2">
                    <span>Total</span>
                    <span className="text-indigo-400">₹{total.toFixed(2)}</span>
                </div>

                <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-600/20 transition-all mt-6 transform active:scale-95">
                    Proceed to Billing
                </button>
            </div>
        </div>
    );
};

export default OrderSummaryPage;