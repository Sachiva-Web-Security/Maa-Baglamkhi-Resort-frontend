import React from "react";

const MenuPage = () => {

  const menu = [
    {name:"Paneer Pakoda",price:150},
    {name:"Jeera Rice",price:100},
    {name:"Egg Curry",price:120}
  ];

  return (

    <div>

      <h2 className="text-2xl mb-4">
        Menu
      </h2>

      <div className="grid grid-cols-3 gap-4">

        {menu.map((item,i)=>(
          <div key={i} className="bg-white p-4 rounded shadow">

            <h3>{item.name}</h3>
            <p>₹{item.price}</p>

            <button className="bg-blue-500 text-white px-3 py-1 mt-2 rounded">
              Add
            </button>

          </div>
        ))}

      </div>

    </div>

  );

};

export default MenuPage;