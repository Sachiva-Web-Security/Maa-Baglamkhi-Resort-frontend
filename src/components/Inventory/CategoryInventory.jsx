import React from "react";

export default function CategoryInventory({
  categoryName,
  items,
  onBack,
  onDeleteItem
}) {

  const filtered = items.filter(i => i.category === categoryName);

  return (

    <div className="p-6 bg-gray-900 text-white min-h-screen">

      <button onClick={onBack}>Back</button>

      <h1 className="text-2xl mb-4">{categoryName}</h1>

      <table className="w-full">

        <thead>

          <tr>
            <th>Name</th>
            <th>Stock</th>
            <th>Price</th>
            <th>Action</th>
          </tr>

        </thead>

        <tbody>

          {filtered.map(item => (

            <tr key={item.id}>

              <td>{item.name}</td>
              <td>{item.stock}</td>
              <td>{item.price}</td>

              <td>

                <button onClick={()=>onDeleteItem(item.id)}>
                  Delete
                </button>

              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>
  );
}