import React, { useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { RestaurantContext } from "../../Context/RestaurantContext";
import API, { getBackendBaseURL } from "../../api";
import { restaurantService } from "../../services/restaurantService";
import AddMenuItemModal from "./AddMenuItemModal";

const normalizeCategory = (value) => (value || "Other").trim().toLowerCase();
const normalizeItemName = (value) => String(value || "").trim().toLowerCase();

const pickPreferredMenuItem = (current, candidate) => {
  const currentCategory = normalizeCategory(current?.category);
  const candidateCategory = normalizeCategory(candidate?.category);
  const currentScore =
    (currentCategory !== "other" ? 2 : 0) +
    (current?.image_url || current?.imageUrl ? 1 : 0);
  const candidateScore =
    (candidateCategory !== "other" ? 2 : 0) +
    (candidate?.image_url || candidate?.imageUrl ? 1 : 0);

  if (candidateScore !== currentScore) {
    return candidateScore > currentScore ? candidate : current;
  }

  return Number(candidate?.id || 0) > Number(current?.id || 0) ? candidate : current;
};

const normalizeOrderItem = (item) => {
  const qty = Number(item?.qty || item?.quantity || 0);
  const rate = Number(item?.rate || item?.price || 0);
  const amount = Number(item?.amount ?? qty * rate);
  const taxAmount = Number(item?.taxAmount || 0);
  const total = Number(item?.total ?? amount + taxAmount);

  return {
    ...item,
    qty,
    rate,
    amount,
    taxAmount,
    total,
  };
};

const MenuPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { table } = useParams();
  const banquetMenuPicker = Boolean(location.state?.banquetMenuPicker);
  const banquetReturnPath = location.state?.returnTo || "/banquet";
  const entityType = location.state?.entityType || "Table";
  const roomData = location.state?.roomData || null;
  const { menuItems, setSelectedTable } = useContext(RestaurantContext);

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [qty, setQty] = useState({});
  const [order, setOrder] = useState(
    Array.isArray(location.state?.existingItems)
      ? location.state.existingItems.map(normalizeOrderItem)
      : [],
  );
  const [menu, setMenu] = useState(menuItems);
  const [menuCatalog, setMenuCatalog] = useState([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);
  const [menuError, setMenuError] = useState(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingMenuItem, setIsSavingMenuItem] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    price: "",
    category: "Other",
    tax: 5,
    happyHourPrice: "",
    happyHourStart: "",
    happyHourEnd: "",
  });
  const [newItemImage, setNewItemImage] = useState(null);
  const [newItemImagePreview, setNewItemImagePreview] = useState("");
  const [expandedCategory, setExpandedCategory] = useState("Other");
  const [taxByItem, setTaxByItem] = useState({});
  const [prepTimeMinutes, setPrepTimeMinutes] = useState(20);

  useEffect(() => {
    if (banquetMenuPicker) return;
    setSelectedTable(table);
    setSelectedCategory("All");
  }, [banquetMenuPicker, setSelectedTable, table]);

  useEffect(() => {
    let mounted = true;
    const loadMenu = async () => {
      setIsLoadingMenu(true);
      setMenuError(null);
      try {
        const data = banquetMenuPicker
          ? (await API.get("/restaurant/menu")).data
          : await restaurantService.getMenu(table);
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
  }, [banquetMenuPicker, table]);

  useEffect(() => {
    if (banquetMenuPicker) return;
    setMenu(menuItems);
  }, [banquetMenuPicker, menuItems]);

  const visibleMenu = useMemo(() => {
    const deduped = new Map();

    (Array.isArray(menu) ? menu : []).forEach((item) => {
      const key = normalizeItemName(item?.name);
      if (!key) return;

      if (!deduped.has(key)) {
        deduped.set(key, item);
        return;
      }

      deduped.set(key, pickPreferredMenuItem(deduped.get(key), item));
    });

    return Array.from(deduped.values());
  }, [menu]);

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

  useEffect(() => {
    if (!newItemImage) {
      setNewItemImagePreview("");
      return undefined;
    }

    const previewUrl = URL.createObjectURL(newItemImage);
    setNewItemImagePreview(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [newItemImage]);

  const categories = useMemo(() => {
    const set = new Map();
    visibleMenu.forEach((item) => {
      const label = (item.category || "Other").trim() || "Other";
      const key = normalizeCategory(label);
      if (!set.has(key)) set.set(key, label);
    });
    return ["All", ...Array.from(set.values())];
  }, [visibleMenu]);

  const filteredItems = useMemo(() => {
    if (selectedCategory === "All") return visibleMenu;
    return visibleMenu.filter(
      (item) => normalizeCategory(item.category) === normalizeCategory(selectedCategory),
    );
  }, [visibleMenu, selectedCategory]);

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
    const effectivePriceValue =
      item.effectivePrice ?? item.effective_price ?? item.price ?? 0;
    const effectiveRate = Number(effectivePriceValue);
    const amount = effectiveRate * quantity;
    const taxValue = taxByItem[item.id] ?? item.tax ?? 5;
    const taxPercent = Number(taxValue);
    const taxAmount = (amount * taxPercent) / 100;
    setOrder((prev) => [
      ...prev,
      {
        id: Date.now(),
        menuItemId: item.id,
        name: item.name,
        qty: quantity,
        rate: effectiveRate,
        baseRate: Number(item.price || 0),
        amount,
        taxAmount,
        total: amount + taxAmount,
        category: item.category || "Other",
      },
    ]);
    setQty((prev) => ({ ...prev, [item.id]: "" }));
  };

  const handleTaxChange = (itemId, value) => {
    setTaxByItem((prev) => ({ ...prev, [itemId]: value }));
  };

  const buildMenuImageSrc = (imagePath) => {
    if (!imagePath) return "";
    if (/^https?:\/\//i.test(imagePath)) return imagePath;
    return `${getBackendBaseURL()}${imagePath}`;
  };

  const handleNewItemImageChange = (event) => {
    const file = event.target.files?.[0];
    setNewItemImage(file || null);
  };

  const subtotal = order.reduce((sum, item) => sum + item.amount, 0);
  const taxTotal = order.reduce((sum, item) => sum + item.taxAmount, 0);
  const grandTotal = subtotal + taxTotal;

  const handleSubmit = async () => {
    if (!order.length) return alert("Please add items");

    if (banquetMenuPicker) {
      const selectedRestaurantMenuItems = order.map((item) => ({
        name: item.name,
        qty: Number(item.qty || 0),
        rate: Number(item.rate || 0),
        amount: Number(item.amount || 0),
        taxAmount: Number(item.taxAmount || 0),
        total: Number(item.total || 0),
      }));
      const selectedCustomMenuItems = Array.from(
        new Set(selectedRestaurantMenuItems.map((item) => item.name).filter(Boolean)),
      );
      navigate(banquetReturnPath, {
        state: {
          banquetMenuSelection: {
            selectedCustomMenuItems,
            selectedRestaurantMenuItems,
          },
        },
      });
      return;
    }

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
      localStorage.setItem(`entityType:${table}`, entityType);
      await restaurantService.createKitchenOrder({
        table,
        waiter: entityType === "Room" ? "Room Service" : "Waiter",
        entityType,
        prepTimeMinutes,
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
      setIsSavingMenuItem(true);
      const payload = new FormData();
      payload.append("name", newItem.name);
      payload.append("price", newItem.price);
      payload.append("category", newItem.category);
      payload.append("tableNumber", table);
      payload.append("tax", String(newItem.tax ?? 5));
      payload.append("happyHourPrice", newItem.happyHourPrice || "");
      payload.append("happyHourStart", newItem.happyHourStart || "");
      payload.append("happyHourEnd", newItem.happyHourEnd || "");
      if (newItemImage) {
        payload.append("image", newItemImage);
      }

      await restaurantService.addMenuItem(payload);
      const response = await API.get("/restaurant/menu");
      setMenuCatalog(Array.isArray(response.data) ? response.data : []);
      setNewItem({
        name: "",
        price: "",
        category: "Other",
        tax: 5,
        happyHourPrice: "",
        happyHourStart: "",
        happyHourEnd: "",
      });
      setNewItemImage(null);
      setExpandedCategory("Other");
      setShowAddMenu(false);
    } catch {
      alert("Failed to add menu item");
    } finally {
      setIsSavingMenuItem(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#19253c_0%,#1f2d47_100%)] p-6">
      <div className="mx-auto max-w-[1320px] rounded-[26px] border border-white/10 bg-white/95 p-5 shadow-[0_30px_80px_rgba(15,23,42,0.28)]">
        <div className="mb-5 rounded-[22px] bg-[linear-gradient(135deg,#111827_0%,#1d4ed8_50%,#0f766e_100%)] px-5 py-5 text-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-200">
                {banquetMenuPicker ? "Banquet Menu Picker" : "Restaurant Menu Card"}
              </div>
              <div className="mt-2 text-3xl font-black">
                {banquetMenuPicker ? "Select Restaurant Menu For Banquet" : `Room ${table} Menu Dashboard`}
              </div>
              <div className="mt-2 text-sm text-white/80">
                {banquetMenuPicker
                  ? "Items select karke seedha banquet reservation form mein wapas laut sakte hain."
                  : roomData
                  ? `${roomData.categoryName || "Room"} | ID ${roomData.roomId || "--"}`
                  : "Category-wise item selection"}
              </div>
            </div>
            {!banquetMenuPicker ? (
              <button onClick={() => setShowAddMenu(true)} className="rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-lg">
                + Add Item
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_290px]">
          <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-[84px_minmax(0,1.6fr)_96px_72px_120px_110px] bg-slate-100 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-600">
              <div>Image</div>
              <div>Item</div>
              <div className="text-center">Rate</div>
              <div className="text-center">Tax</div>
              <div className="text-center">Qty</div>
              <div className="text-center">Amount</div>
            </div>
            <div className="max-h-[620px] overflow-auto">
              <div className="min-w-[920px]">
                {isLoadingMenu ? <div className="p-6 text-center text-slate-500">Loading menu...</div> : null}
                {menuError ? <div className="p-6 text-center text-rose-600">{menuError}</div> : null}
                {!isLoadingMenu && !menuError && !filteredItems.length ? <div className="p-6 text-center text-slate-500">No items in this category.</div> : null}
                {!isLoadingMenu && !menuError && filteredItems.map((item, index) => {
                const quantity = Number(qty[item.id] || 0);
                const effectivePrice = Number(
                  item.effectivePrice ?? item.effective_price ?? item.price ?? 0,
                );
                const amount = effectivePrice * quantity;
                const itemImageSrc = buildMenuImageSrc(item.image_url || item.imageUrl);
                return (
                  <div key={item.id} className={`grid grid-cols-[84px_minmax(0,1.6fr)_96px_72px_120px_110px] items-center gap-3 border-t border-slate-100 px-4 py-3 ${index % 2 ? "bg-slate-50/70" : "bg-white"}`}>
                    <div className="flex justify-center">
                      {itemImageSrc ? (
                        <img
                          src={itemImageSrc}
                          alt={item.name}
                          className="h-16 w-16 rounded-[18px] border border-slate-200 object-cover shadow-sm"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-[18px] border border-dashed border-slate-300 bg-slate-50 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                          No Image
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-bold leading-5 text-slate-900">{item.name}</div>
                      <div className="mt-1 truncate text-xs text-slate-500">
                        {item.category || "Other"}
                        {item.happyHourActive ? ` | Happy hour ${item.happy_hour_start?.slice(0, 5)}-${item.happy_hour_end?.slice(0, 5)}` : ""}
                      </div>
                    </div>
                    <div className="text-center font-semibold text-slate-700">
                      {item.happyHourActive ? (
                        <div>
                          <div className="text-emerald-600">Rs. {effectivePrice}</div>
                          <div className="text-[11px] line-through text-slate-400">Rs. {item.price}</div>
                        </div>
                      ) : (
                        `Rs. ${item.price}`
                      )}
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={taxByItem[item.id] ?? item.tax ?? 5}
                        onChange={(e) => handleTaxChange(item.id, e.target.value)}
                        className="w-14 rounded-xl border border-slate-200 px-2 py-2 text-center text-sm"
                      />
                      <span className="text-sm text-slate-600">%</span>
                    </div>
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
                {order.map((item) => {
                  const itemTotal = Number(item.total ?? item.amount ?? Number(item.qty || 0) * Number(item.rate || 0));
                  return (
                  <div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3">
                    <div className="font-semibold text-slate-700">{item.name} x {item.qty}</div>
                    <div className="font-bold text-slate-900">Rs. {itemTotal.toFixed(2)}</div>
                  </div>
                )})}
              </div>
              <div className="mt-4 space-y-2 rounded-[18px] bg-[linear-gradient(135deg,#eff6ff_0%,#f0fdf4_100%)] p-4">
                <div className="flex justify-between text-sm"><span>Subtotal</span><span>Rs. {subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm"><span>Tax</span><span>Rs. {taxTotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-lg font-black"><span>Total</span><span>Rs. {grandTotal.toFixed(2)}</span></div>
              </div>
              <div className="mt-4 rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Kitchen ETA</div>
                <select
                  value={prepTimeMinutes}
                  onChange={(event) => setPrepTimeMinutes(Number(event.target.value))}
                  className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700"
                >
                  {[10, 15, 20, 30, 45, 60].map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {minutes} minutes
                    </option>
                  ))}
                </select>
                <div className="mt-2 text-xs text-slate-500">
                  Ye time kitchen card par dikhega aur ready countdown isi se chalega.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          {submitError ? <div className="mr-auto text-sm text-rose-600">{submitError}</div> : null}
          <button
            onClick={() =>
              banquetMenuPicker
                ? navigate(banquetReturnPath, { state: { banquetMenuCancelled: true } })
                : navigate("/restaurant")
            }
            className="rounded-xl bg-rose-500 px-4 py-3 text-sm font-bold text-white"
          >
            {banquetMenuPicker ? "Back To Banquet" : "Cancel"}
          </button>
          <button onClick={handleSubmit} disabled={isSubmitting} className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-60">
            {banquetMenuPicker ? "Use In Banquet" : isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>

      <AddMenuItemModal
        open={showAddMenu && !banquetMenuPicker}
        onClose={() => {
          setShowAddMenu(false);
          setNewItem({
            name: "",
            price: "",
            category: "Other",
            tax: 5,
            happyHourPrice: "",
            happyHourStart: "",
            happyHourEnd: "",
          });
          setNewItemImage(null);
          setExpandedCategory("Other");
        }}
        onSubmit={handleAddMenuItem}
        form={newItem}
        setForm={setNewItem}
        categories={addCategories}
        catalogByCategory={catalogByCategory}
        expandedCategory={expandedCategory}
        setExpandedCategory={setExpandedCategory}
        imagePreview={newItemImagePreview}
        imageFileName={newItemImage?.name || ""}
        onImageChange={handleNewItemImageChange}
        loading={isSavingMenuItem}
      />
    </div>
  );
};

export default MenuPage;
