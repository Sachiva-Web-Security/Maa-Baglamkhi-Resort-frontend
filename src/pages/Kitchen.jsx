import React, { useEffect, useState } from "react";
import API from "../api";

const Kitchen = () => {

const [orders,setOrders] = useState([]);

useEffect(()=>{
  fetchOrders();
},[]);


// ================= FETCH ORDERS =================
const fetchOrders = async ()=>{
  try{
    const res = await API.get("/kitchen/orders");
    setOrders(res.data);
  }catch(err){
    console.log(err);
  }
}


// ================= MARK READY =================
const markReady = async(id)=>{
  try{

    await API.put(`/kitchen/orders/${id}`,{
      status:"Ready"
    });

    fetchOrders();

  }catch(err){
    console.log(err);
  }
}


return (

<div className=" min-h-screen w-290  bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pl-0.3">

{/* HEADER */}

<div className="bg-slate-1000 w-full pl-110 text-white p-4 rounded-2xl shadow-lg mb-6 ">
<h2 className="text-2xl font-bold ">Kitchen Orders</h2>
<p className="text-sm opacity-90">
Manage restaurant food orders
</p>
</div>


{/* TABLE */}

<div className="bg-slate-850 rounded-2xl shadow-md p-6">

<h3 className="text-lg font-extrabold mb-4">Kitchen Orders</h3>

<div className="overflow-x-auto ">

<table className="w-full border-collapse ">

<thead>

<tr className="bg-slate-900 text-white text-left ">
<th className="p-3">Waiter</th>
<th className="p-3">Table</th>
<th className="p-3">Item</th>
<th className="p-3">Status</th>
<th className="p-3">Action</th>
</tr>

</thead>

<tbody>

{orders.map((o)=>(

<tr key={o.id} className=" group border-b transition-all duration-200 hover:bg-blue-900 hover:text-white">

<td className="p-3 ">{o.waiter_name}</td>
<td className="p-3">{o.table_number}</td>

<td className="p-3">
{o.items?.map((item,i)=>(
<div key={i}>
{item.name} x {item.quantity}
</div>
))}
</td>

<td className="p-3">

<span
className={`px-3 py-1 rounded-full text-xs font-semibold
${
o.status === "Ready"
? "bg-green-100 text-green-700"
: "bg-yellow-100 text-yellow-700"
}`}
>

{o.status}

</span>

</td>

<td className="p-3">

{o.status !== "Ready" && (

<button
onClick={()=>markReady(o.id)}
className="bg-blue-500 hover:bg-green-600 text-blue px-3 py-1 rounded-lg text-sm"
>

Ready

</button>

)}

</td>

</tr>

))}

{orders.length === 0 && (

<tr>
<td colSpan="5" className="text-center p-4 text-gray-500">
No orders yet
</td>
</tr>

)}

</tbody>

</table>

</div>

</div>

</div>

);

};

export default Kitchen;