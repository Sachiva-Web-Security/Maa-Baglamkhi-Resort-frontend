import React, { useEffect, useState, useRef } from "react";

const Kitchen = () => {

  const [orders, setOrders] = useState([]);


  const orderSound = useRef(null);
  const soundCount = useRef(0);
  const prevOrderCount = useRef(0);

  const getLocalOrders = () => {
    return JSON.parse(localStorage.getItem("kitchenOrders")) || [];
  };

  const getOrderTime = (time) => {

    if(!time) return "0:00";

    const diff = Math.floor((clock - new Date(time)) / 1000);

    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;

    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;

  };

  const fetchOrders = () => {

    const localOrders = getLocalOrders();

    if (localOrders.length > prevOrderCount.current) {

      if (soundCount.current < 2 && orderSound.current) {

        orderSound.current.currentTime = 0;
        orderSound.current.play().catch(()=>{});

        soundCount.current++;

      }

    }

    prevOrderCount.current = localOrders.length;

    setOrders(localOrders);

  };

  useEffect(() => {

    orderSound.current = new Audio("/order.mp3");

    fetchOrders();

    const interval = setInterval(fetchOrders, 2000);

    window.addEventListener("kitchenUpdated", fetchOrders);

    return () => {

      clearInterval(interval);
      window.removeEventListener("kitchenUpdated", fetchOrders);

    };

  }, []);

  

  const markReady = (id) => {

    const localOrders = getLocalOrders();

    const updated = localOrders.map((o)=>
      o.id === id ? {...o,status:"Ready"} : o
    );

    localStorage.setItem(
      "kitchenOrders",
      JSON.stringify(updated)
    );

    fetchOrders();

  };

  const printBill = (order) => {

    const total = order.items.reduce(
      (sum,item)=>sum + item.price * item.quantity,
      0
    );

    const printWindow = window.open();

    const itemsHTML = order.items.map(item=>`
      <tr>
        <td>${item.item_name}</td>
        <td>${item.quantity}</td>
        <td>₹${item.price}</td>
        <td>₹${item.price * item.quantity}</td>
      </tr>
    `).join("");

    printWindow.document.write(`
      <h2>Restaurant Bill</h2>
      <p>Table: ${order.table_no}</p>
      <table border="1" style="width:100%">
        <tr>
          <th>Item</th>
          <th>Qty</th>
          <th>Price</th>
          <th>Total</th>
        </tr>
        ${itemsHTML}
      </table>
      <h3>Total: ₹${total}</h3>
    `);

    printWindow.print();

    const localOrders = getLocalOrders();

    const updatedOrders =
      localOrders.filter(o => o.id !== order.id);

    localStorage.setItem(
      "kitchenOrders",
      JSON.stringify(updatedOrders)
    );

    localStorage.removeItem(`token-${order.table_no}`);

    fetchOrders();

  };

  return (

    <div className="min-h-screen bg-slate-900 p-6 text-white">

      <h2 className="text-2xl font-bold mb-6">
        Kitchen Orders
      </h2>

      <div className="grid md:grid-cols-3 gap-4">

        {orders.map((order)=>(

          <div
            key={order.id}
            className="p-4 bg-slate-800 rounded-lg shadow"
          >

            <h3 className="text-xl font-bold">
              Table {order.table_no}
            </h3>



            <div className="mt-2">

              {order.items?.map((item,i)=>(
                <div key={i}>
                  {item.item_name} x {item.quantity}
                </div>
              ))}

            </div>

            <div className="flex gap-2 mt-3">

              {order.status !== "Ready" && (

                <button
                  onClick={()=>markReady(order.id)}
                  className="bg-green-600 px-3 py-1 rounded"
                >
                  Ready
                </button>

              )}

              <button
                onClick={()=>printBill(order)}
                className="bg-purple-600 px-3 py-1 rounded"
              >
                Print
              </button>

            </div>

          </div>

        ))}

      </div>

    </div>

  );

};

export default Kitchen;