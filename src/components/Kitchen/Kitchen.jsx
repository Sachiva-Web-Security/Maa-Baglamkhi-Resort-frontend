import React, { useState, useEffect } from "react";
import axios from "axios";

const Kitchen = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchOrders = async () => {
        try {
            const response = await axios.get("http://localhost:5002/api/orders");
            setOrders(response.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching orders:", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 10000); // Poll every 10 seconds
        return () => clearInterval(interval);
    }, []);

    const handleGenerateBill = async (orderId) => {
        try {
            await axios.post(`http://localhost:5002/api/bills/${orderId}`);
            alert("Bill Generated Successfully!");
            fetchOrders(); // Refresh to see updated status
        } catch (error) {
            console.error("Error generating bill:", error);
            alert("Failed to generate bill");
        }
    };

    const handlePrint = (order) => {
        const printContent = `
      <html>
        <head>
          <title>Bill - Order #${order.id}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            .total { font-weight: bold; font-size: 1.2em; margin-top: 20px; }
          </style>
        </head>
        <body>
          <h1>Maa Baglamukhi Resort</h1>
          <p>Order ID: ${order.id}</p>
          <p>Room/Table: ${order.room_no || order.table_no}</p>
          <p>Date: ${new Date(order.created_at).toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map(item => `
                <tr>
                  <td>${item.item_name}</td>
                  <td>${item.quantity}</td>
                  <td>\u20b9${item.price}</td>
                  <td>\u20b9${item.total}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <p class="total">Grand Total: \u20b9${order.items.reduce((sum, i) => sum + parseFloat(i.total), 0)}</p>
          <script>window.print();</script>
        </body>
      </html>
    `;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
    };

    if (loading) return <div className="p-10 text-white">Loading Kitchen Orders...</div>;

    return (
        <div className="p-10 bg-slate-900 min-h-screen text-white">
            <h1 className="text-3xl font-bold mb-8">Kitchen Orders</h1>

            <div className="grid gap-6">
                {orders.length === 0 ? (
                    <p>No pending orders</p>
                ) : (
                    orders.map((order) => (
                        <div key={order.id} className={`p-6 rounded-xl border ${order.status === 'completed' ? 'border-green-500 bg-green-900/20' : 'border-blue-500 bg-blue-900/20'}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h2 className="text-xl font-semibold">Order #${order.id}</h2>
                                    <p className="text-slate-400">
                                        {order.room_no ? `Room: ${order.room_no}` : `Table: ${order.table_no}`}
                                    </p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${order.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'}`}>
                                    {order.status}
                                </span>
                            </div>

                            <table className="w-full text-left mb-6">
                                <thead>
                                    <tr className="border-b border-slate-700">
                                        <th className="py-2">Item</th>
                                        <th className="py-2">Qty</th>
                                        <th className="py-2">Price</th>
                                        <th className="py-2">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {order.items.map((item, idx) => (
                                        <tr key={idx} className="border-b border-slate-800/50">
                                            <td className="py-2">{item.item_name}</td>
                                            <td className="py-2">{item.quantity}</td>
                                            <td className="py-2">\u20b9{item.price}</td>
                                            <td className="py-2">\u20b9{item.total}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className="flex gap-4">
                                {order.status !== 'completed' && (
                                    <button
                                        onClick={() => handleGenerateBill(order.id)}
                                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition"
                                    >
                                        Generate Bill
                                    </button>
                                )}
                                <button
                                    onClick={() => handlePrint(order)}
                                    className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition"
                                >
                                    Print Bill
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Kitchen;
