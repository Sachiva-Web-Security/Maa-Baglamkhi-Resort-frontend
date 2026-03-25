import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import API from "../../api";
import { restaurantService } from "../../services/restaurantService";
import AddMenuItemModal from "./AddMenuItemModal";

const normalizeCategory = (value) => (value || "Other").trim().toLowerCase();

const AddMenuItemPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const table = searchParams.get("table") || "";
  const [menuCatalog, setMenuCatalog] = useState([]);
  const [form, setForm] = useState({ name: "", price: "", category: "Other", tax: 5 });
  const [expandedCategory, setExpandedCategory] = useState("Other");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(false);

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
    if (!imageFile) {
      setImagePreview("");
      return undefined;
    }

    const previewUrl = URL.createObjectURL(imageFile);
    setImagePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [imageFile]);

  const categories = useMemo(() => {
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
      categories.reduce((acc, category) => {
        acc[category] = menuCatalog.filter(
          (item) => normalizeCategory(item.category) === normalizeCategory(category),
        );
        return acc;
      }, {}),
    [categories, menuCatalog],
  );

  const handleSubmit = async () => {
    if (!form.name || !form.price) {
      alert("Enter item name and price");
      return;
    }

    try {
      setLoading(true);
      const payload = new FormData();
      payload.append("name", form.name);
      payload.append("price", form.price);
      payload.append("category", form.category);
      payload.append("tableNumber", table || "");
      payload.append("tax", String(form.tax ?? 5));
      if (imageFile) payload.append("image", imageFile);

      await restaurantService.addMenuItem(payload);
      navigate("/restaurant", { replace: true });
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Failed to add menu item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#19253c_0%,#1f2d47_100%)] p-4 sm:p-6">
      <div className="mx-auto max-w-3xl rounded-[30px] border border-white/10 bg-white/95 p-5 shadow-[0_30px_80px_rgba(15,23,42,0.28)]">
        <div className="mb-4 rounded-[22px] bg-[linear-gradient(135deg,#111827_0%,#1d4ed8_50%,#0f766e_100%)] px-5 py-5 text-white">
          <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-200">Restaurant Menu Card</div>
          <div className="mt-2 text-3xl font-black">Add Menu Item</div>
          <div className="mt-1 text-sm text-white/80">
            {table ? `Connected table: ${table}` : "No table selected"}
          </div>
        </div>

        <AddMenuItemModal
          open
          onClose={() => navigate("/restaurant", { replace: true })}
          onSubmit={handleSubmit}
          form={form}
          setForm={setForm}
          categories={categories}
          catalogByCategory={catalogByCategory}
          expandedCategory={expandedCategory}
          setExpandedCategory={setExpandedCategory}
          imagePreview={imagePreview}
          imageFileName={imageFile?.name || ""}
          onImageChange={(event) => setImageFile(event.target.files?.[0] || null)}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default AddMenuItemPage;
