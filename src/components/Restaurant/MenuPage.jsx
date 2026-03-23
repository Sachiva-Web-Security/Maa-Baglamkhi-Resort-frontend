import React, { useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { FiChevronDown, FiPlus } from "react-icons/fi";

import { RestaurantContext } from "../../Context/RestaurantContext";
import API from "../../api";
import { restaurantService } from "../../services/restaurantService";

const normalizeCategory = (value) => (value || "Other").trim().toLowerCase();

const MenuPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { table } = useParams();
  const entityType = location.state?.entityType || "Table";
  const roomData = location.state?.roomData || null;
  const { menuItems, addMenuItem, setSelectedTable } = useContext(RestaurantContext);

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [qty, setQty] = useState({});
  const [order, setOrder] = useState(location.state?.existingItems || []);
  const [menu, setMenu] = useState(menuItems);
  const [menuCatalog, setMenuCatalog] = useState([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);
  const [menuError, setMenuError] = useState(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", price: "", category: "Other", tax: 5 });
  const [expandedCategory, setExpandedCategory] = useState("Other");

  useEffect(() => {
    setSelectedTable(table);
    setSelectedCategory("All");
  }, [setSelectedTable, table]);

  useEffect(() => {
    let mounted = true;
    const loadMenu = async () => {
      setIsLoadingMenu(true);
      setMenuError(null);
      try {
        const data = await restaurantService.getMenu(table);
        if (mounted) setMenu(data || []);
      } catch (err) {
        if (mounted) {
          setMenu([]);
          setMenuError(err.response?.data?.message || "Unable to load menu.");
        }
      } finally {
        if (mounted) setIsLoadingMenu(false);
      }
    };
    loadMenu();
    return () => {
      mounted = false;
    };
  }, [table]);

  useEffect(() => {
    setMenu(menuItems);
  }, [menuItems]);

  useEffect(() => {
    let mounted = true;
    const loadCatalog = async () => {
      try {
        const response = await API.get("/restaurant/menu");
        if (mounted) setMenuCatalog(Array.isArray(response.data) ? response.data : []);
      } catch {
        if (mounted) setMenuCatalog([]);
      }
    };
    loadCatalog();
    return () => {
      mounted = false;
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Map();
    menu.forEach((item) => {
      const label = (item.category || "Other").trim() || "Other";
      const key = normalizeCategory(label);
      if (!set.has(key)) set.set(key, label);
    });
    return ["All", ...Array.from(set.values())];
  }, [menu]);

  const filteredItems = useMemo(() => {
    if (selectedCategory === "All") return menu;
    return menu.filter(
      (item) => normalizeCategory(item.category) === normalizeCategory(selectedCategory),
    );
  }, [menu, selectedCategory]);

  const addCategories = useMemo(() => {
    const defaults = ["Beverages", "Breakfast", "Paneer", "Salad", "Rice", "Starter", "Chicken", "Chinese", "Soup", "Dessert", "Other"];
    const extra = menuCatalog
      .map((item) => (item.category || "Other").trim() || "Other")
      .filter((value, index, arr) => arr.findIndex((v) => normalizeCategory(v) === normalizeCategory(value)) === index);
    return [...defaults, ...extra].filter(
      (value, index, arr) => arr.findIndex((v) => normalizeCategory(v) === normalizeCategory(value)) === index,
    );
  }, [menuCatalog]);

  const catalogByCategory = useMemo(
    () =>
      addCategories.reduce((acc, category) => {
        acc[category] = menuCatalog.filter(
          (item) => normalizeCategory(item.category) === normalizeCategory(category),
        );
        return acc;
      }, {}),
    [addCategories, menuCatalog],
  );

  const handleQtyChange = (id, value) => {
    setQty((prev) => ({ ...prev, [id]: value }));
  };

  const handleAdd = (item) => {
    const quantity = Number(qty[item.id] || 0);
    if (quantity <= 0) return;
    const amount = item.price * quantity;
    const taxAmount = (amount * (item.tax || 5)) / 100;
    setOrder((prev) => [
      ...prev,
      { id: Date.now(), name: item.name, qty: quantity, rate: item.price, amount, taxAmount, total: amount + taxAmount },
    ]);
    setQty((prev) => ({ ...prev, [item.id]: "" }));
  };

  const subtotal = order.reduce((sum, item) => sum + item.amount, 0);
  const taxTotal = order.reduce((sum, item) => sum + item.taxAmount, 0);
  const grandTotal = subtotal + taxTotal;

  const handleSubmit = async () => {
    if (!order.length) return alert("Please add items");
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      let tokenId = null;
      try {
        const tokenRes = await API.get(`/token/table/${table}`);
        tokenId = tokenRes.data?.id || null;
      } catch {
        tokenId = null;
      }
      if (!tokenId) {
        const createRes = await API.post("/token/create", { tableNumber: String(table), waiter: "Waiter" });
        tokenId = createRes.data?.tokenId;
      }
      if (tokenId) {
        await Promise.all(
          order.map((item) => API.post("/token/item", { tokenId, name: item.name, qty: item.qty, rate: item.rate })),
        );
      }
      await restaurantService.createOrder(
        table,
        order.map(({ name, qty: quantity, rate: price }) => ({ name, quantity, price })),
      );
      await restaurantService.createKitchenOrder({
        table,
        waiter: "Waiter",
        items: order.map(({ name, qty: quantity, rate: price }) => ({ name, quantity, price })),
      });
      window.dispatchEvent(new Event("tokenUpdated"));
      navigate(`/restaurant/edit-token/${table}`, { state: { items: order, entityType, roomData } });
      setOrder([]);
    } catch (err) {
      setSubmitError(err.response?.data?.message || "Failed to submit order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddMenuItem = async () => {
    if (!newItem.name || !newItem.price) return alert("Enter item name and price");
    try {
      await addMenuItem(newItem.name, newItem.price, newItem.category, table);
      const response = await API.get("/restaurant/menu");
      setMenuCatalog(Array.isArray(response.data) ? response.data : []);
      setNewItem({ name: "", price: "", category: "Other", tax: 5 });
      setExpandedCategory("Other");
      setShowAddMenu(false);
    } catch {
      alert("Failed to add menu item");
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#19253c_0%,#1f2d47_100%)] p-6">
      <div className="mx-auto max-w-[1320px] rounded-[26px] border border-white/10 bg-white/95 p-5 shadow-[0_30px_80px_rgba(15,23,42,0.28)]">
        <div className="mb-5 rounded-[22px] bg-[linear-gradient(135deg,#111827_0%,#1d4ed8_50%,#0f766e_100%)] px-5 py-5 text-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-200">Restaurant Menu Card</div>
              <div className="mt-2 text-3xl font-black">Room {table} Menu Dashboard</div>
              <div className="mt-2 text-sm text-white/80">{roomData ? `${roomData.categoryName || "Room"} | ID ${roomData.roomId || "--"}` : "Category-wise item selection"}</div>
            </div>
            <button onClick={() => setShowAddMenu(true)} className="rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-lg">
              + Add Item
            </button>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_290px]">
          <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-[minmax(0,1.3fr)_100px_70px_120px_120px] bg-slate-100 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-600">
              <div>Item</div>
              <div className="text-center">Rate</div>
              <div className="text-center">Tax</div>
              <div className="text-center">Qty</div>
              <div className="text-center">Amount</div>
            </div>
            <div className="max-h-[620px] overflow-auto">
              {isLoadingMenu ? <div className="p-6 text-center text-slate-500">Loading menu...</div> : null}
              {menuError ? <div className="p-6 text-center text-rose-600">{menuError}</div> : null}
              {!isLoadingMenu && !menuError && !filteredItems.length ? <div className="p-6 text-center text-slate-500">No items in this category.</div> : null}
              {!isLoadingMenu && !menuError && filteredItems.map((item, index) => {
                const quantity = Number(qty[item.id] || 0);
                const amount = item.price * quantity;
                return (
                  <div key={item.id} className={`grid grid-cols-[minmax(0,1.3fr)_100px_70px_120px_120px] items-center gap-2 border-t border-slate-100 px-4 py-3 ${index % 2 ? "bg-slate-50/70" : "bg-white"}`}>
                    <div>
                      <div className="font-bold text-slate-900">{item.name}</div>
                      <div className="text-xs text-slate-500">{item.category || "Other"}</div>
                    </div>
                    <div className="text-center font-semibold text-slate-700">Rs. {item.price}</div>
                    <div className="text-center text-slate-600">{item.tax || 5}%</div>
                    <div className="flex items-center justify-center gap-2">
                      <input type="number" min="1" value={qty[item.id] || ""} onChange={(e) => handleQtyChange(item.id, e.target.value)} className="w-16 rounded-xl border border-slate-200 px-2 py-2 text-center text-sm" />
                      <button onClick={() => handleAdd(item)} className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-bold text-white">+</button>
                    </div>
                    <div className="text-center font-bold text-slate-800">Rs. {amount || 0}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 text-sm font-black text-slate-900">Categories</div>
              <div className="max-h-[340px] space-y-2 overflow-auto pr-1">
                {categories.map((cat) => (
                  <button key={cat} onClick={() => setSelectedCategory(cat)} className={`flex w-full items-center justify-between rounded-[16px] border px-4 py-3 text-left text-sm font-bold transition ${selectedCategory === cat ? "border-blue-300 bg-blue-600 text-white" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"}`}>
                    <span>{cat}</span>
                    <span className={`rounded-full px-2 py-1 text-[10px] ${selectedCategory === cat ? "bg-white/15" : "bg-white text-slate-500"}`}>
                      {cat === "All" ? menu.length : filteredItems.filter((item) => normalizeCategory(item.category) === normalizeCategory(cat)).length}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 text-sm font-black text-slate-900">Order Summary</div>
              <div className="space-y-2 text-sm">
                {order.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3">
                    <div className="font-semibold text-slate-700">{item.name} x {item.qty}</div>
                    <div className="font-bold text-slate-900">Rs. {item.total.toFixed(2)}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2 rounded-[18px] bg-[linear-gradient(135deg,#eff6ff_0%,#f0fdf4_100%)] p-4">
                <div className="flex justify-between text-sm"><span>Subtotal</span><span>Rs. {subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm"><span>Tax</span><span>Rs. {taxTotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-lg font-black"><span>Total</span><span>Rs. {grandTotal.toFixed(2)}</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          {submitError ? <div className="mr-auto text-sm text-rose-600">{submitError}</div> : null}
          <button onClick={() => navigate("/restaurant")} className="rounded-xl bg-rose-500 px-4 py-3 text-sm font-bold text-white">Cancel</button>
          <button onClick={handleSubmit} disabled={isSubmitting} className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{isSubmitting ? "Submitting..." : "Submit"}</button>
        </div>
      </div>

      {showAddMenu ? (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-xl rounded-[28px] bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.32)]">
            <div className="text-[11px] uppercase tracking-[0.26em] text-blue-700">Add Menu Item</div>
            <div className="mt-2 text-3xl font-black text-slate-900">Create a new menu option</div>
            <div className="mt-5 grid gap-4">
              <input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} placeholder="Item Name" className="rounded-[18px] border-2 border-slate-200 px-4 py-4 text-lg outline-none focus:border-blue-400" />
              <input type="number" value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} placeholder="Price" className="rounded-[18px] border-2 border-slate-200 px-4 py-4 text-lg outline-none focus:border-blue-400" />
              <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-3">
                <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Categories</div>
                <div className="max-h-[320px] space-y-3 overflow-auto pr-1">
                  {addCategories.map((category) => {
                    const expanded = normalizeCategory(expandedCategory) === normalizeCategory(category);
                    const items = catalogByCategory[category] || [];
                    const selected = normalizeCategory(newItem.category) === normalizeCategory(category);
                    return (
                      <div key={category} className="overflow-hidden rounded-[18px] border border-slate-200 bg-white">
                        <button
                          type="button"
                          onClick={() => {
                            setNewItem({ ...newItem, category });
                            setExpandedCategory(expanded ? "" : category);
                          }}
                          className={`flex w-full items-center justify-between px-4 py-4 text-left ${selected ? "bg-blue-600 text-white" : "text-slate-800"}`}
                        >
                          <div>
                            <div className="font-black">{category}</div>
                            <div className={`text-xs ${selected ? "text-white/80" : "text-slate-500"}`}>{items.length} items</div>
                          </div>
                          <FiChevronDown className={`text-xl transition ${expanded ? "rotate-180" : ""}`} />
                        </button>
                        {expanded ? (
                          <div className="border-t border-slate-100 bg-slate-50 px-3 py-3">
                            {items.length ? items.map((item) => (
                              <div key={`${category}-${item.id}`} className="mb-2 flex items-center justify-between rounded-xl bg-white px-3 py-3 text-sm">
                                <span className="font-semibold text-slate-700">{item.name}</span>
                                <span className="font-bold text-slate-900">Rs. {item.price}</span>
                              </div>
                            )) : <div className="rounded-xl bg-white px-3 py-3 text-sm text-slate-500">Is category me abhi koi item nahi hai.</div>}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowAddMenu(false)} className="rounded-xl border border-slate-200 px-5 py-3 font-bold text-slate-700">Cancel</button>
              <button onClick={handleAddMenuItem} className="rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white">Add</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default MenuPage;
