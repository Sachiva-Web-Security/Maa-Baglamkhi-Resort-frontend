import React, { useContext, useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { RestaurantContext } from "../../Context/RestaurantContext";
import { restaurantService } from "../../services/restaurantService";
import API from "../../api";

/* ===============================
   MENU PAGE
================================ */

const MenuPage = () => {

  const navigate = useNavigate();
  const location = useLocation();
  const { table } = useParams();
  const entityType = location.state?.entityType || localStorage.getItem(`entityType:${table}`) || "Table";

  const { menuItems, addMenuItem, setSelectedTable } = useContext(RestaurantContext);

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [qty, setQty] = useState({});
  const [order, setOrder] = useState(location.state?.existingItems || []);
  const [menu, setMenu] = useState(menuItems);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);
  const [menuError, setMenuError] = useState(null);

  const [showAddMenu, setShowAddMenu] = useState(false);

  const [newItem, setNewItem] = useState({
    name: "",
    price: "",
    category: "Other",
    tax: 5
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // send order items to kitchen service
  const sendToKitchen = (tableNo, items) =>
    restaurantService.createKitchenOrder({
      table: tableNo,
      waiter: "Waiter",
      items: items.map(({ name, qty, rate }) => ({
        name,
        quantity: qty,
        price: rate,
      })),
    });

  /* ===============================
     RESET CATEGORY WHEN MENU CHANGE
  =============================== */

  useEffect(() => {
    setSelectedTable(table);
    setSelectedCategory("All");
  }, [menuItems, setSelectedTable, table]);


  /* ===============================
     CATEGORY LIST
  =============================== */

  const categories = useMemo(() => {
    return ["All", ...new Set(menu.map((i) => i.category || "Other"))];
  }, [menu]);


  /* ===============================
     FILTER MENU ITEMS
  =============================== */

  const filteredItems = useMemo(() => {

    if (selectedCategory === "All") return menu;

    return menu.filter(
      (item) => item.category === selectedCategory
    );

  }, [menu, selectedCategory]);


  /* ===============================
     LOAD MENU FROM BACKEND
  =============================== */

  useEffect(() => {

    let mounted = true;
    const fetchMenu = async () => {
      setIsLoadingMenu(true);
      setMenuError(null);
      try {
        const data = await restaurantService.getMenu(table);
        if (mounted) setMenu(data || []);
      } catch (err) {
        if (mounted) {
          setMenuError(err.response?.data?.message || "Unable to load menu.");
          setMenu([]);
        }
      } finally {
        if (mounted) setIsLoadingMenu(false);
      }
    };

    fetchMenu();
    return () => { mounted = false; };

  }, [table]);

  // keep local menu in sync when context updates (e.g., addMenuItem)
  useEffect(() => {
    setMenu(menuItems);
  }, [menuItems]);


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

  const handleSubmit = async () => {

    if (order.length === 0) {
      alert("Please add items");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {

      // ensure token exists for this table
      let tokenId = null;
      try {
        const tokenRes = await API.get(`/token/table/${table}`);
        tokenId = tokenRes.data?.id || null;
      } catch (err) {
        console.log("token lookup failed (will create):", err);
      }

      if (!tokenId) {
        const createRes = await API.post("/token/create", {
          tableNumber: String(table),
          waiter: localStorage.getItem("name") || "Waiter",
        });
        tokenId = createRes.data?.tokenId;
      }

      // push items into token_items so Edit Token page can read them
      if (tokenId) {
        await Promise.all(
          order.map((item) =>
            API.post("/token/item", {
              tokenId,
              name: item.name,
              qty: item.qty,
              rate: item.rate,
            })
          )
        );
      }

      // CREATE ORDER IN BACKEND
      await restaurantService.createOrder(
        table,
        order.map(({ name, qty, rate }) => ({
          name,
          quantity: qty,
          price: rate,
        }))
      );

      // SEND ORDER TO KITCHEN (DB)
      await sendToKitchen(table, order);

      // DASHBOARD REFRESH
      window.dispatchEvent(new Event("tokenUpdated"));

      navigate(`/restaurant/edit-token/${table}`, {
        state: { items: order, entityType }
      });

      // clear local order
      setOrder([]);

    } catch (err) {

      console.log(err);
      setSubmitError(err.response?.data?.message || "Failed to submit order");

    } finally {
      setIsSubmitting(false);
    }

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

    <div className="space-y-4">

      <div className="bg-white rounded-2xl shadow border overflow-hidden flex flex-col min-h-[70vh]">

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

                {isLoadingMenu && (
                  <tr>
                    <td colSpan="5" className="p-3 text-center text-gray-500">
                      Loading menu...
                    </td>
                  </tr>
                )}

                {menuError && (
                  <tr>
                    <td colSpan="5" className="p-3 text-center text-red-600">
                      {menuError}
                    </td>
                  </tr>
                )}

                {!isLoadingMenu && !menuError && filteredItems.map((item) => {

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

          {submitError && (
            <span className="text-red-600 mr-auto text-sm">
              {submitError}
            </span>
          )}

          <button
            onClick={handleCancel}
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`px-4 py-2 rounded text-white ${
              isSubmitting
                ? "bg-green-400 cursor-not-allowed"
                : "bg-green-600"
            }`}
          >
            {isSubmitting ? "Submitting..." : "Submit"}
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