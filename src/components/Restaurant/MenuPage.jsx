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

const getOrderItemKey = (item) =>
  String(item?.menuItemId || item?.id || `${item?.name || ""}-${item?.rate || item?.price || 0}`);

const createOrderEntry = (item, quantity, taxValue) => {
  const effectivePriceValue =
    item.effectivePrice ?? item.effective_price ?? item.price ?? item.rate ?? 0;
  const effectiveRate = Number(effectivePriceValue);
  const qty = Number(quantity || 0);
  const amount = effectiveRate * qty;
  const taxPercent = Number(taxValue ?? item.tax ?? 5);
  const taxAmount = (amount * taxPercent) / 100;

  return {
    id: item.id || Date.now(),
    menuItemId: item.menuItemId || item.id || null,
    name: item.name,
    qty,
    rate: effectiveRate,
    baseRate: Number(item.price ?? item.baseRate ?? item.rate ?? 0),
    amount,
    taxAmount,
    total: amount + taxAmount,
    category: item.category || "Other",
    tax: taxPercent,
  };
};

const buildMenuPlaceholder = (item) => {
  const category = (item?.category || "Menu").trim();
  const name = (item?.name || category).trim();
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "MI";

  return {
    initials,
    category,
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
  const [quickAddQuery, setQuickAddQuery] = useState("");
  const [quickAddQty, setQuickAddQty] = useState("1");
  const [quickAddItemId, setQuickAddItemId] = useState("");
  const [showQuickAddSuggestions, setShowQuickAddSuggestions] = useState(false);

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

  const quickAddMatches = useMemo(() => {
    const query = quickAddQuery.trim().toLowerCase();
    if (!query) return visibleMenu.slice(0, 8);
    return visibleMenu
      .filter((item) => {
        const name = String(item?.name || "").toLowerCase();
        const category = String(item?.category || "").toLowerCase();
        return name.includes(query) || category.includes(query);
      })
      .slice(0, 8);
  }, [quickAddQuery, visibleMenu]);

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

  const handleAdd = (item, quantityOverride = null) => {
    const quantity = Number((quantityOverride ?? qty[item.id]) || 0);
    if (quantity <= 0) return;
    const taxValue = taxByItem[item.id] ?? item.tax ?? 5;
    setOrder((prev) => {
      const existingIndex = prev.findIndex(
        (entry) =>
          String(entry.menuItemId || entry.id) === String(item.id) &&
          Number(entry.rate || 0) === Number(item.effectivePrice ?? item.effective_price ?? item.price ?? 0),
      );

      if (existingIndex === -1) {
        return [...prev, createOrderEntry(item, quantity, taxValue)];
      }

      return prev.map((entry, index) =>
        index === existingIndex
          ? createOrderEntry(
              {
                ...item,
                id: entry.id,
                menuItemId: entry.menuItemId || item.id,
              },
              Number(entry.qty || 0) + quantity,
              entry.tax ?? taxValue,
            )
          : entry,
      );
    });
    setQty((prev) => ({ ...prev, [item.id]: "" }));
  };

  const handleQuickAdd = () => {
    const normalizedQuery = quickAddQuery.trim().toLowerCase();
    const selectedItem =
      visibleMenu.find((item) => String(item.id) === String(quickAddItemId)) ||
      visibleMenu.find((item) => String(item.name || "").trim().toLowerCase() === normalizedQuery) ||
      quickAddMatches[0];
    const quantity = Math.max(1, Number(quickAddQty || 1));

    if (!selectedItem) {
      alert("Item search karke select karo.");
      return;
    }

    handleAdd(selectedItem, quantity);
    setQuickAddQuery("");
    setQuickAddQty("1");
    setQuickAddItemId("");
  };

  const handleTaxChange = (itemId, value) => {
    setTaxByItem((prev) => ({ ...prev, [itemId]: value }));
  };

  const handleOrderQtyAdjust = (orderItem, delta) => {
    setOrder((prev) =>
      prev.flatMap((entry) => {
        if (getOrderItemKey(entry) !== getOrderItemKey(orderItem)) {
          return [entry];
        }

        const nextQty = Number(entry.qty || 0) + delta;
        if (nextQty <= 0) {
          return [];
        }

        return [
          createOrderEntry(
            {
              ...entry,
              id: entry.id,
              menuItemId: entry.menuItemId,
              price: entry.baseRate ?? entry.rate,
            },
            nextQty,
            entry.tax,
          ),
        ];
      }),
    );
  };

  const handleOrderItemRemove = (orderItem) => {
    setOrder((prev) => prev.filter((entry) => getOrderItemKey(entry) !== getOrderItemKey(orderItem)));
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

  const dashboardTitle = banquetMenuPicker
    ? "Select Restaurant Menu For Banquet"
    : `${entityType === "Room" ? "Room" : "Table"} ${table} Menu Dashboard`;

  const dashboardSubtitle = banquetMenuPicker
    ? "Items select karke seedha banquet reservation form mein wapas laut sakte hain."
    : roomData
    ? `${roomData.categoryName || "Room"} | ID ${roomData.roomId || "--"}`
    : "Category-wise item selection";

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#19253c_0%,#1f2d47_100%)] p-4 lg:p-6">
      <div className="mx-auto max-w-[1580px] rounded-[26px] border border-white/10 bg-white/95 p-4 shadow-[0_30px_80px_rgba(15,23,42,0.28)] lg:p-5">
        <div className="mb-4 rounded-[22px] bg-[linear-gradient(135deg,#111827_0%,#1d4ed8_50%,#0f766e_100%)] px-4 py-4 text-white lg:px-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-200">
                {banquetMenuPicker ? "Banquet Menu Picker" : "Restaurant Menu Card"}
              </div>
              <div className="mt-1.5 text-xl font-black leading-tight sm:text-2xl">
                {dashboardTitle}
              </div>
              <div className="mt-1 text-sm text-white/80">
                {dashboardSubtitle}
              </div>
              {!banquetMenuPicker ? (
                <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-md">
                  <span className="rounded-full bg-white/15 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-cyan-100">
                    {entityType}
                  </span>
                  <span className="truncate">Active service for {entityType === "Room" ? "room" : "table"} {table}</span>
                </div>
              ) : null}
            </div>

            {!banquetMenuPicker ? (
              <div className="w-full xl:max-w-[640px] rounded-[20px] border border-white/15 bg-white/10 p-3 backdrop-blur-md">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
                  Quick Add Item
                </div>
                <div className="grid gap-2 lg:grid-cols-[minmax(0,1.9fr)_120px_120px]">
                  <div className="relative">
                    <input
                      type="text"
                      value={quickAddQuery}
                      onFocus={() => setShowQuickAddSuggestions(true)}
                      onBlur={() => {
                        window.setTimeout(() => setShowQuickAddSuggestions(false), 120);
                      }}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        setQuickAddQuery(nextValue);
                        const matchedItem = visibleMenu.find(
                          (item) => String(item.name || "").trim().toLowerCase() === nextValue.trim().toLowerCase(),
                        );
                        setQuickAddItemId(matchedItem ? String(matchedItem.id) : "");
                      }}
                      placeholder="Search item or category"
                      className="h-10 w-full rounded-xl border border-white/20 bg-white px-3 text-sm font-medium text-slate-800 outline-none ring-0"
                    />
                    {showQuickAddSuggestions && quickAddMatches.length ? (
                      <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]">
                        <div className="max-h-56 overflow-y-auto py-1">
                          {quickAddMatches.map((item) => {
                            const effectivePrice = Number(
                              item.effectivePrice ?? item.effective_price ?? item.price ?? 0,
                            );
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                  setQuickAddQuery(item.name || "");
                                  setQuickAddItemId(String(item.id));
                                  setShowQuickAddSuggestions(false);
                                }}
                                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                              >
                                <span className="truncate font-medium text-slate-900">{item.name}</span>
                                <span className="shrink-0 text-xs font-semibold text-slate-500">
                                  Rs. {effectivePrice}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <input
                    type="number"
                    min="1"
                    value={quickAddQty}
                    onChange={(event) => setQuickAddQty(event.target.value.replace(/\D/g, "").slice(0, 2) || "1")}
                    className="h-10 rounded-xl border border-white/20 bg-white px-3 text-sm font-bold text-slate-800 outline-none ring-0"
                    placeholder="Qty"
                  />
                  <button
                    type="button"
                    onClick={handleQuickAdd}
                    className="h-10 rounded-xl bg-white px-4 text-sm font-bold text-slate-900 shadow-lg"
                  >
                    Add Item
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-start">
                  <span className="text-[11px] text-white/75">
                    Fast add without opening the full side panel.
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
            <div className="hidden bg-slate-100 px-3 py-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-600 xl:grid xl:grid-cols-[64px_minmax(180px,1.4fr)_96px_82px_118px_96px]">
              <div>Image</div>
              <div>Item</div>
              <div className="text-center">Rate</div>
              <div className="text-center">Tax</div>
              <div className="text-center">Qty</div>
              <div className="text-center">Amount</div>
            </div>
            <div className="max-h-[640px] overflow-y-auto">
              <div>
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
                  const placeholder = buildMenuPlaceholder(item);
                  return (
                    <div
                      key={item.id}
                      className={`border-t border-slate-100 ${index % 2 ? "bg-slate-50/70" : "bg-white"}`}
                    >
                      <div className="grid gap-3 px-4 py-4 xl:hidden">
                        <div className="flex items-start gap-3">
                          <div className="flex shrink-0 justify-center">
                            {itemImageSrc ? (
                              <img
                                src={itemImageSrc}
                                alt={item.name}
                                className="h-14 w-14 rounded-2xl border border-slate-200 object-cover shadow-sm"
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex h-14 w-14 flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-200 bg-[linear-gradient(135deg,#ecfeff_0%,#eff6ff_55%,#f8fafc_100%)] px-1 text-center shadow-sm">
                                <span className="text-xs font-black leading-none text-cyan-700">
                                  {placeholder.initials}
                                </span>
                                <span className="mt-1 line-clamp-2 text-[8px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                  {placeholder.category}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[15px] font-bold leading-5 text-slate-900">{item.name}</div>
                            <div className="mt-1 text-xs text-slate-500">
                              {item.category || "Other"}
                              {item.happyHourActive
                                ? ` | Happy hour ${item.happy_hour_start?.slice(0, 5)}-${item.happy_hour_end?.slice(0, 5)}`
                                : ""}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="rounded-xl bg-slate-50 px-3 py-2">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Rate</div>
                            <div className="mt-1 font-semibold text-slate-700">
                              {item.happyHourActive ? (
                                <div>
                                  <div className="text-emerald-600">Rs. {effectivePrice}</div>
                                  <div className="text-[11px] line-through text-slate-400">Rs. {item.price}</div>
                                </div>
                              ) : (
                                `Rs. ${item.price}`
                              )}
                            </div>
                          </div>
                          <div className="rounded-xl bg-slate-50 px-3 py-2">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Amount</div>
                            <div className="mt-1 font-bold text-slate-800">Rs. {(amount || 0).toFixed(2)}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
                          <label className="space-y-1">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Tax %</span>
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={taxByItem[item.id] ?? item.tax ?? 5}
                              onChange={(e) => handleTaxChange(item.id, e.target.value)}
                              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-center text-sm"
                            />
                          </label>
                          <label className="space-y-1">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Qty</span>
                            <input
                              type="number"
                              min="1"
                              value={qty[item.id] || ""}
                              onChange={(e) => handleQtyChange(item.id, e.target.value)}
                              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-center text-sm"
                            />
                          </label>
                        </div>

                        <button
                          onClick={() => handleAdd(item)}
                          className="h-11 rounded-xl bg-emerald-500 px-4 text-sm font-bold text-white shadow-sm"
                        >
                          Add Item
                        </button>
                      </div>

                      <div className="hidden xl:grid xl:grid-cols-[64px_minmax(180px,1.4fr)_96px_82px_118px_96px] xl:items-center xl:gap-2.5 xl:px-3 xl:py-3">
                        <div className="flex justify-center">
                          {itemImageSrc ? (
                            <img
                              src={itemImageSrc}
                              alt={item.name}
                              className="h-12 w-12 rounded-2xl border border-slate-200 object-cover shadow-sm"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-12 w-12 flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-200 bg-[linear-gradient(135deg,#ecfeff_0%,#eff6ff_55%,#f8fafc_100%)] px-1 text-center shadow-sm">
                              <span className="text-xs font-black leading-none text-cyan-700">
                                {placeholder.initials}
                              </span>
                              <span className="mt-1 line-clamp-2 text-[8px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                {placeholder.category}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 pr-1">
                          <div className="truncate text-[14px] font-bold leading-5 text-slate-900">{item.name}</div>
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
                            className="w-14 rounded-xl border border-slate-200 px-1.5 py-2 text-center text-sm"
                          />
                          <span className="text-sm text-slate-600">%</span>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <input type="number" min="1" value={qty[item.id] || ""} onChange={(e) => handleQtyChange(item.id, e.target.value)} className="w-16 rounded-xl border border-slate-200 px-1.5 py-2 text-center text-sm" />
                          <button onClick={() => handleAdd(item)} className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-bold text-white shadow-sm">Add</button>
                        </div>
                        <div className="text-center font-bold text-slate-800">Rs. {(amount || 0).toFixed(2)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 text-sm font-black text-slate-900">Categories</div>
              <div className="max-h-[320px] space-y-2 overflow-auto pr-1">
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
              <div className="max-h-[260px] overflow-auto pr-1 text-sm">
                {order.map((item) => {
                  const itemTotal = Number(item.total ?? item.amount ?? Number(item.qty || 0) * Number(item.rate || 0));
                  return (
                  <div key={getOrderItemKey(item)} className="border-b border-slate-100 py-3 last:border-b-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-700">{item.name}</div>
                        <div className="mt-1 text-xs text-slate-500">Qty {item.qty} x Rs. {Number(item.rate || 0).toFixed(2)}</div>
                      </div>
                      <div className="shrink-0 font-bold text-slate-900">Rs. {itemTotal.toFixed(2)}</div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOrderQtyAdjust(item, -1)}
                        className="h-8 min-w-8 rounded-lg border border-slate-200 bg-white px-2 text-sm font-bold text-slate-700"
                      >
                        -1
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOrderQtyAdjust(item, 1)}
                        className="h-8 min-w-8 rounded-lg border border-slate-200 bg-white px-2 text-sm font-bold text-slate-700"
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOrderItemRemove(item)}
                        className="h-8 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )})}
              </div>
              <div className="mt-4 space-y-2 rounded-[18px] bg-[linear-gradient(135deg,#eff6ff_0%,#f0fdf4_100%)] p-4">
                <div className="flex justify-between text-sm"><span>Subtotal</span><span>Rs. {subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm"><span>Tax</span><span>Rs. {taxTotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-lg font-black"><span>Total</span><span>Rs. {grandTotal.toFixed(2)}</span></div>
              </div>

              {submitError ? <div className="mt-4 text-sm text-rose-600">{submitError}</div> : null}
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 text-sm font-black text-slate-900">Kitchen & Actions</div>
              <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
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

              <div className="mt-4 grid gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm disabled:opacity-60"
                >
                  {banquetMenuPicker ? "Use In Banquet" : isSubmitting ? "Submitting..." : "Submit"}
                </button>
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
              </div>
            </div>
          </div>
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
