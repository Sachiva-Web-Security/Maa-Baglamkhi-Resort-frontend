import React, { useContext, useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { RestaurantContext } from "../../Context/RestaurantContext";

/* ===============================
   SEND ORDER TO KITCHEN
================================ */

const sendToKitchen = (table, items) => {

  const orders =
    JSON.parse(localStorage.getItem("kitchenOrders")) || [];

  // format items for kitchen display
  const formattedItems = items.map((item) => ({
    item_name: item.name,
    quantity: item.qty,
    price: item.rate,
    total: item.total
  }));

  const newOrder = {
    id: Date.now(),
    waiter_name: localStorage.getItem("name") || "Waiter",
    table_no: table,
    items: formattedItems,
    status: "Pending",
    created_at: new Date().toISOString(),
    time: new Date().toLocaleTimeString()
  };

  orders.push(newOrder);

  localStorage.setItem(
    "kitchenOrders",
    JSON.stringify(orders)
  );

  // kitchen screen refresh
  window.dispatchEvent(new Event("kitchenUpdated"));

};


/* ===============================
   MENU PAGE
================================ */

const MenuPage = () => {

  const navigate = useNavigate();
  const location = useLocation();
  const { table } = useParams();

  const { menuItems, addMenuItem } = useContext(RestaurantContext);

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [qty, setQty] = useState({});
  const [order, setOrder] = useState(location.state?.existingItems || []);

  const [showAddMenu, setShowAddMenu] = useState(false);

  const [newItem, setNewItem] = useState({
    name: "",
    price: "",
    category: "Other",
    tax: 5
  });

  /* ===============================
     RESET CATEGORY WHEN MENU CHANGE
  =============================== */

  useEffect(() => {
    setSelectedCategory("All");
  }, [menuItems]);


  /* ===============================
     CATEGORY LIST
  =============================== */

  const categories = useMemo(() => {
    return ["All", ...new Set(menuItems.map((i) => i.category || "Other"))];
  }, [menuItems]);


  /* ===============================
     FILTER MENU ITEMS
  =============================== */

  const filteredItems = useMemo(() => {

    if (selectedCategory === "All") return menuItems;

    return menuItems.filter(
      (item) => item.category === selectedCategory
    );

  }, [menuItems, selectedCategory]);


  /* ===============================
     QTY CHANGE
  =============================== */

  const handleQtyChange = (id, value) => {

    setQty(prev => ({
      ...prev,
      [id]: value
    }));

  };


  /* ===============================
     ADD ITEM TO ORDER
  =============================== */

  const handleAdd = (item) => {

    const quantity = Number(qty[item.id] || 0);
    if (quantity <= 0) return;

    const amount = item.price * quantity;
    const taxAmount = amount * (item.tax || 5) / 100;

    const orderItem = {
      id: Date.now(),
      name: item.name,
      qty: quantity,
      rate: item.price,
      amount,
      taxAmount,
      total: amount + taxAmount
    };

    setOrder(prev => [...prev, orderItem]);

    setQty(prev => ({
      ...prev,
      [item.id]: ""
    }));

  };


  /* ===============================
     BILL CALCULATION
  =============================== */

  const subtotal = order.reduce((sum, item) => sum + item.amount, 0);
  const taxTotal = order.reduce((sum, item) => sum + item.taxAmount, 0);
  const grandTotal = subtotal + taxTotal;


  /* ===============================
     SUBMIT ORDER
  =============================== */

  const handleSubmit = () => {

    if (order.length === 0) {
      alert("Please add items");
      return;
    }

    // SAVE TOKEN
    localStorage.setItem(`token-${table}`, JSON.stringify(order));

    // SEND ORDER TO KITCHEN
    sendToKitchen(table, order);

    // DASHBOARD REFRESH
    window.dispatchEvent(new Event("tokenUpdated"));

    navigate(`/restaurant/edit-token/${table}`, {
      state: { items: order }
    });

    // clear local order
    setOrder([]);

  };


  /* ===============================
     CANCEL ORDER
  =============================== */

  const handleCancel = () => {
    setOrder([]);
    navigate("/restaurant");
  };


  /* ===============================
     ADD NEW MENU ITEM
  =============================== */

  const handleAddMenuItem = async () => {

    if (!newItem.name || !newItem.price) {
      alert("Enter item name and price");
      return;
    }

    try {

      await addMenuItem(
        newItem.name,
        newItem.price,
        newItem.category,
        table
      );

      setNewItem({
        name: "",
        price: "",
        category: "Other",
        tax: 5
      });

      setShowAddMenu(false);

    } catch (err) {
      console.log(err);
      alert("Failed to add menu item");
    }

  };


  /* ===============================
     UI
  =============================== */

  return (

    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">

      <div className="bg-white w-[1000px] h-[620px] rounded shadow flex flex-col">

        {/* HEADER */}

        <div className="p-3 font-semibold border-b flex justify-between">

          <span>Restaurant Menu Card</span>

          <button
            onClick={() => setShowAddMenu(true)}
            className="bg-blue-600 text-white px-3 py-1 rounded"
          >
            + Add Item
          </button>

        </div>


        <div className="flex flex-1 overflow-hidden">


          {/* ================= MENU TABLE ================= */}

          <div className="w-2/3 border-r overflow-auto">

            <table className="w-full text-sm">

              <thead className="bg-gray-100">

                <tr>
                  <th className="p-2 text-left">Item</th>
                  <th className="p-2 text-center">Rate</th>
                  <th className="p-2 text-center">Tax</th>
                  <th className="p-2 text-center">Qty</th>
                  <th className="p-2 text-center">Amount</th>
                </tr>

              </thead>

              <tbody>

                {filteredItems.map((item) => {

                  const quantity = Number(qty[item.id] || 0);
                  const amount = item.price * quantity;

                  return (

                    <tr key={item.id} className="border-b">

                      <td className="p-2">{item.name}</td>

                      <td className="p-2 text-center">
                        ₹ {item.price}
                      </td>

                      <td className="p-2 text-center">
                        {item.tax || 5}%
                      </td>

                      <td className="p-2 text-center">

                        <input
                          type="number"
                          min="1"
                          value={qty[item.id] || ""}
                          onChange={(e) =>
                            handleQtyChange(item.id, e.target.value)
                          }
                          className="w-14 border rounded p-1"
                        />

                        <button
                          onClick={() => handleAdd(item)}
                          className="ml-2 bg-green-600 text-white px-2 py-1 rounded"
                        >
                          +
                        </button>

                      </td>

                      <td className="p-2 text-center">
                        ₹ {amount || 0}
                      </td>

                    </tr>

                  );

                })}

              </tbody>

            </table>

          </div>


          {/* ================= RIGHT SIDE ================= */}

          <div className="w-1/3 flex flex-col">

            {/* CATEGORY */}

            <div className="p-3 border-b overflow-auto">

              <h4 className="font-semibold mb-3">
                Categories
              </h4>

              <div className="space-y-2">

                {categories.map((cat) => (

                  <div
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`cursor-pointer p-2 rounded ${
                      selectedCategory === cat
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200"
                    }`}
                  >
                    {cat}
                  </div>

                ))}

              </div>

            </div>


            {/* ================= BILL ================= */}

            <div className="p-3 flex-1 overflow-auto">

              <h4 className="font-semibold mb-2">
                Order Summary
              </h4>

              {order.map((item, index) => (

                <div
                  key={index}
                  className="flex justify-between text-sm mb-1"
                >
                  <span>
                    {item.name} × {item.qty}
                  </span>

                  <span>
                    ₹ {item.total.toFixed(2)}
                  </span>

                </div>

              ))}

              <hr className="my-2" />

              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>₹ {subtotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span>Tax</span>
                <span>₹ {taxTotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>₹ {grandTotal.toFixed(2)}</span>
              </div>

            </div>

          </div>

        </div>


        {/* ================= FOOTER ================= */}

        <div className="flex justify-end gap-3 p-3 border-t">

          <button
            onClick={handleCancel}
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Submit
          </button>

        </div>

      </div>


      {/* ================= ADD ITEM MODAL ================= */}

      {showAddMenu && (

        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">

          <div className="bg-white p-6 rounded w-80">

            <h3 className="font-bold mb-4">
              Add Menu Item
            </h3>

            <input
              placeholder="Item Name"
              value={newItem.name}
              onChange={(e) =>
                setNewItem({ ...newItem, name: e.target.value })
              }
              className="border p-2 w-full mb-2"
            />

            <input
              placeholder="Price"
              value={newItem.price}
              onChange={(e) =>
                setNewItem({ ...newItem, price: e.target.value })
              }
              className="border p-2 w-full mb-2"
            />

            <select
              value={newItem.category}
              onChange={(e) =>
                setNewItem({ ...newItem, category: e.target.value })
              }
              className="border p-2 w-full mb-2"
            >
              <option>Beverages</option>
              <option>Breakfast</option>
              <option>Paneer</option>
              <option>Rice</option>
              <option>Starter</option>
              <option>Chicken</option>
              <option>Chinese</option>
              <option>Soup</option>
              <option>Dessert</option>
              <option>Other</option>
            </select>

            <div className="flex justify-end gap-2 mt-3">

              <button
                onClick={() => setShowAddMenu(false)}
                className="bg-gray-400 text-white px-3 py-1 rounded"
              >
                Cancel
              </button>

              <button
                onClick={handleAddMenuItem}
                className="bg-green-600 text-white px-3 py-1 rounded"
              >
                Add
              </button>

            </div>

          </div>

        </div>

      )}

    </div>

  );

};

export default MenuPage;