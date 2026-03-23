import React, { useEffect, useMemo, useState } from "react";
import { restaurantService } from "../../services/restaurantService";

const defaultIngredient = {
  name: "",
  unit: "gm",
  costPerUnit: "",
  openingStock: "",
  reorderLevel: "",
  outlet: "Main Kitchen",
  branch: "Main Branch",
};

const RecipeMaster = () => {
  const [bootstrap, setBootstrap] = useState({ menuItems: [], ingredients: [], outlets: [] });
  const [selectedMenuItemId, setSelectedMenuItemId] = useState("");
  const [recipeLines, setRecipeLines] = useState([]);
  const [versionLabel, setVersionLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [ingredientForm, setIngredientForm] = useState(defaultIngredient);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedMenu = useMemo(
    () => bootstrap.menuItems.find((item) => String(item.id) === String(selectedMenuItemId)),
    [bootstrap.menuItems, selectedMenuItemId],
  );

  const loadBootstrap = async () => {
    try {
      setLoading(true);
      const data = await restaurantService.getConsumptionBootstrap();
      setBootstrap(data || { menuItems: [], ingredients: [], outlets: [] });
    } catch (error) {
      console.log(error);
      setBootstrap({ menuItems: [], ingredients: [], outlets: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBootstrap();
  }, []);

  useEffect(() => {
    const loadRecipe = async () => {
      if (!selectedMenuItemId) {
        setRecipeLines([]);
        return;
      }
      try {
        const response = await restaurantService.getRecipe(selectedMenuItemId);
        setRecipeLines(
          (response?.lines || []).map((line) => ({
            ingredientId: line.ingredient_id,
            quantityPerItem: line.quantity_per_item,
            unit: line.unit,
            wastagePercent: line.wastage_percent,
          })),
        );
      } catch {
        setRecipeLines([]);
      }
    };
    loadRecipe();
  }, [selectedMenuItemId]);

  const addRecipeLine = () => {
    setRecipeLines((current) => [
      ...current,
      { ingredientId: "", quantityPerItem: "", unit: "gm", wastagePercent: 0 },
    ]);
  };

  const updateRecipeLine = (index, field, value) => {
    setRecipeLines((current) =>
      current.map((line, idx) => (idx === index ? { ...line, [field]: value } : line)),
    );
  };

  const removeRecipeLine = (index) => {
    setRecipeLines((current) => current.filter((_, idx) => idx !== index));
  };

  const saveIngredient = async () => {
    if (!ingredientForm.name || !ingredientForm.openingStock) {
      return alert("Ingredient name and opening stock required");
    }
    try {
      await restaurantService.saveIngredient(ingredientForm);
      setIngredientForm(defaultIngredient);
      await loadBootstrap();
      alert("Ingredient saved");
    } catch (error) {
      alert(error.response?.data?.message || "Ingredient save failed");
    }
  };

  const saveRecipe = async () => {
    if (!selectedMenuItemId || !recipeLines.length) {
      return alert("Menu item aur recipe lines required");
    }
    try {
      setSaving(true);
      await restaurantService.saveRecipe({
        menuItemId: Number(selectedMenuItemId),
        versionLabel: versionLabel || undefined,
        notes,
        createdBy: "system",
        lines: recipeLines.map((line) => ({
          ingredientId: Number(line.ingredientId),
          quantityPerItem: Number(line.quantityPerItem || 0),
          unit: line.unit,
          wastagePercent: Number(line.wastagePercent || 0),
        })),
      });
      alert("Recipe saved successfully");
    } catch (error) {
      alert(error.response?.data?.message || "Recipe save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#19253c_0%,#1f2d47_100%)] p-4 sm:p-6">
      <div className="mx-auto max-w-[1380px] space-y-6">
        <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_50%,#0f766e_100%)] px-6 py-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.25)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200">Recipe Master</p>
          <h1 className="mt-2 text-3xl font-black">BOM setup for auto item consumption</h1>
          <p className="mt-2 text-sm text-white/80">
            Menu item ko ingredient recipe se map kariye. Sale complete hote hi stock auto-deduct hoga.
          </p>
        </section>

        <section className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <div className="space-y-6">
            <div className="rounded-[26px] border border-slate-200/70 bg-white/95 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.1)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">Ingredient Master</p>
              <div className="mt-4 grid gap-3">
                <input value={ingredientForm.name} onChange={(e) => setIngredientForm({ ...ingredientForm, name: e.target.value })} placeholder="Ingredient name" className="rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-3" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input value={ingredientForm.openingStock} onChange={(e) => setIngredientForm({ ...ingredientForm, openingStock: e.target.value })} placeholder="Opening stock" className="rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-3" />
                  <select value={ingredientForm.unit} onChange={(e) => setIngredientForm({ ...ingredientForm, unit: e.target.value })} className="rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-3">
                    <option value="gm">gm</option>
                    <option value="kg">kg</option>
                    <option value="ml">ml</option>
                    <option value="liter">liter</option>
                    <option value="pcs">pcs</option>
                  </select>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input value={ingredientForm.costPerUnit} onChange={(e) => setIngredientForm({ ...ingredientForm, costPerUnit: e.target.value })} placeholder="Cost per unit" className="rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-3" />
                  <input value={ingredientForm.reorderLevel} onChange={(e) => setIngredientForm({ ...ingredientForm, reorderLevel: e.target.value })} placeholder="Reorder level" className="rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-3" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input value={ingredientForm.outlet} onChange={(e) => setIngredientForm({ ...ingredientForm, outlet: e.target.value })} placeholder="Outlet" className="rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-3" />
                  <input value={ingredientForm.branch} onChange={(e) => setIngredientForm({ ...ingredientForm, branch: e.target.value })} placeholder="Branch" className="rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-3" />
                </div>
                <button onClick={saveIngredient} className="rounded-[18px] bg-emerald-600 px-4 py-3 text-sm font-bold text-white">
                  Save Ingredient
                </button>
              </div>
            </div>

            <div className="rounded-[26px] border border-slate-200/70 bg-white/95 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.1)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-600">Ingredient List</p>
              <div className="mt-4 max-h-[420px] space-y-3 overflow-auto">
                {loading ? (
                  <div className="text-sm text-slate-500">Loading ingredients...</div>
                ) : (
                  bootstrap.ingredients.map((ingredient) => (
                    <div key={ingredient.id} className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="font-black text-slate-900">{ingredient.name}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        Stock {ingredient.currentStock} {ingredient.unit} | Cost {ingredient.costPerUnit}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="rounded-[26px] border border-slate-200/70 bg-white/95 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.1)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-600">Recipe BOM</p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">Menu item recipe mapping</h2>
              </div>
              <button onClick={addRecipeLine} className="rounded-[18px] bg-blue-600 px-4 py-3 text-sm font-bold text-white">
                Add Ingredient Line
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <select value={selectedMenuItemId} onChange={(e) => setSelectedMenuItemId(e.target.value)} className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                <option value="">Select menu item</option>
                {bootstrap.menuItems.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              <input value={versionLabel} onChange={(e) => setVersionLabel(e.target.value)} placeholder="Recipe version label" className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3" />
            </div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Recipe notes" className="mt-4 min-h-[90px] w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3" />

            {selectedMenu ? (
              <div className="mt-4 rounded-[18px] bg-[linear-gradient(135deg,#eff6ff_0%,#f8fafc_100%)] px-4 py-4 text-sm text-slate-700">
                Selected item: <span className="font-black text-slate-900">{selectedMenu.name}</span> | Category {selectedMenu.category || "Other"}
              </div>
            ) : null}

            <div className="mt-5 space-y-4">
              {recipeLines.map((line, index) => (
                <div key={index} className="grid gap-3 rounded-[20px] border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[minmax(0,1.4fr)_120px_110px_120px_90px]">
                  <select value={line.ingredientId} onChange={(e) => updateRecipeLine(index, "ingredientId", e.target.value)} className="rounded-[14px] border border-slate-200 bg-white px-3 py-3">
                    <option value="">Select ingredient</option>
                    {bootstrap.ingredients.map((ingredient) => (
                      <option key={ingredient.id} value={ingredient.id}>{ingredient.name}</option>
                    ))}
                  </select>
                  <input value={line.quantityPerItem} onChange={(e) => updateRecipeLine(index, "quantityPerItem", e.target.value)} placeholder="Qty / item" className="rounded-[14px] border border-slate-200 bg-white px-3 py-3" />
                  <select value={line.unit} onChange={(e) => updateRecipeLine(index, "unit", e.target.value)} className="rounded-[14px] border border-slate-200 bg-white px-3 py-3">
                    <option value="gm">gm</option>
                    <option value="kg">kg</option>
                    <option value="ml">ml</option>
                    <option value="liter">liter</option>
                    <option value="pcs">pcs</option>
                  </select>
                  <input value={line.wastagePercent} onChange={(e) => updateRecipeLine(index, "wastagePercent", e.target.value)} placeholder="Wastage %" className="rounded-[14px] border border-slate-200 bg-white px-3 py-3" />
                  <button onClick={() => removeRecipeLine(index)} className="rounded-[14px] bg-rose-500 px-3 py-3 text-sm font-bold text-white">
                    Remove
                  </button>
                </div>
              ))}

              {!recipeLines.length ? (
                <div className="rounded-[18px] border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
                  Recipe lines add kijiye.
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex justify-end">
              <button onClick={saveRecipe} disabled={saving} className="rounded-[18px] bg-emerald-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-60">
                {saving ? "Saving..." : "Save Recipe"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default RecipeMaster;
