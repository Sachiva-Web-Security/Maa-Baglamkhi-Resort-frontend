import { useEffect, useMemo, useState } from "react";
import API from "../api";

const emptyForm = {
  id: null,
  item_group_id: "",
  parent_item_id: "",
  item_code: "",
  shortcut_key: "",
  bar_code: "",
  name: "",
  display_name: "",
  description: "",
  default_quantity: "1.0000",
  gst_item_type: "",
  gst_hsn_code: "",
  qty_decimal: "3",
  spicy: "NA",
  calories: "NA",
  hot_or_cold: "NA",
  prepare_time: "NA",
  current_rate: "0",
  unit_id: "",
  is_favourite: false,
  apply_discount: false,
  is_stock: false,
  is_active: true,
  is_non_veg: false,
};

const TABS = ["Item Basic", "Item Rate", "Item Recipes", "Stock Info", "Discount"];

const Items = () => {
  const [view, setView] = useState("list"); // "list" | "form"
  const [activeTab, setActiveTab] = useState("Item Basic");

  const [rows, setRows] = useState([]);
  const [groups, setGroups] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [filters, setFilters] = useState({
    item_group_id: "",
    item_code: "",
    name: "",
  });

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Tab-specific state
  const [rateHistory, setRateHistory] = useState([]);
  const [newRate, setNewRate] = useState({ effective_date: "", rate: "" });
  const [discount, setDiscount] = useState({
    discount_type: "pct",
    discount_value: "",
    date_from: "",
    date_to: "",
  });
  const [stockForm, setStockForm] = useState({ is_stock: false, unit_id: "" });

  const load = async (q = filters) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await API.get("/fb-items", {
        params: {
          item_group_id: q.item_group_id || "",
          item_code: q.item_code || "",
          name: q.name || "",
        },
      });
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load items");
    } finally {
      setLoading(false);
    }
  };

  const loadLookups = async () => {
    try {
      const [g, u] = await Promise.all([
        API.get("/fb-item-groups"),
        API.get("/fb-units"),
      ]);
      setGroups(Array.isArray(g.data) ? g.data : []);
      setUnits(Array.isArray(u.data) ? u.data : []);
    } catch {
      setGroups([]);
      setUnits([]);
    }
  };

  useEffect(() => {
    load();
    loadLookups();
  }, []);

  const groupOptions = useMemo(
    () => groups.filter((g) => g.is_active !== false),
    [groups],
  );

  const goList = () => {
    setView("list");
    setActiveTab("Item Basic");
    setForm(emptyForm);
    setRateHistory([]);
    setDiscount({ discount_type: "pct", discount_value: "", date_from: "", date_to: "" });
    setStockForm({ is_stock: false, unit_id: "" });
  };

  const openAdd = () => {
    setForm({ ...emptyForm });
    setRateHistory([]);
    setDiscount({ discount_type: "pct", discount_value: "", date_from: "", date_to: "" });
    setStockForm({ is_stock: false, unit_id: "" });
    setActiveTab("Item Basic");
    setView("form");
  };

  const openEdit = async (row) => {
    setForm({
      id: row.id,
      item_group_id: row.item_group_id ? String(row.item_group_id) : "",
      parent_item_id: row.parent_item_id ? String(row.parent_item_id) : "",
      item_code: row.item_code || "",
      shortcut_key: row.shortcut_key || "",
      bar_code: row.bar_code || "",
      name: row.name || "",
      display_name: row.display_name || row.name || "",
      description: row.description || row.name || "",
      default_quantity: String(row.default_quantity ?? "1.0000"),
      gst_item_type: row.gst_item_type || "",
      gst_hsn_code: row.gst_hsn_code || "",
      qty_decimal: String(row.qty_decimal ?? "3"),
      spicy: row.spicy || "NA",
      calories: row.calories || "NA",
      hot_or_cold: row.hot_or_cold || "NA",
      prepare_time: row.prepare_time || "NA",
      current_rate: String(row.current_rate ?? "0"),
      unit_id: row.unit_id ? String(row.unit_id) : "",
      is_favourite: !!row.is_favourite,
      apply_discount: !!row.apply_discount,
      is_stock: !!row.is_stock,
      is_active: row.is_active !== false,
      is_non_veg: !!row.is_non_veg,
    });
    setStockForm({
      is_stock: !!row.is_stock,
      unit_id: row.unit_id ? String(row.unit_id) : "",
    });
    setActiveTab("Item Basic");
    setView("form");
    // Load rate history + discount for edit
    try {
      const [rateRes, discRes] = await Promise.all([
        API.get(`/fb-items/${row.id}/rates`),
        API.get(`/fb-items/${row.id}/discount`),
      ]);
      setRateHistory(Array.isArray(rateRes.data) ? rateRes.data : []);
      if (discRes.data) {
        setDiscount({
          discount_type: discRes.data.discount_type || "pct",
          discount_value: String(discRes.data.discount_value ?? ""),
          date_from: discRes.data.date_from ? String(discRes.data.date_from).slice(0, 10) : "",
          date_to: discRes.data.date_to ? String(discRes.data.date_to).slice(0, 10) : "",
        });
      } else {
        setDiscount({ discount_type: "pct", discount_value: "", date_from: "", date_to: "" });
      }
    } catch {
      setRateHistory([]);
    }
  };

  const setField = (key) => (e) => {
    const v = e?.target?.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [key]: v }));
  };

  const onSaveBasic = async () => {
    setError("");
    setMessage("");
    if (!form.name?.trim()) {
      setError("Item name is required");
      return;
    }
    const payload = {
      item_group_id: form.item_group_id ? Number(form.item_group_id) : null,
      parent_item_id: form.parent_item_id ? Number(form.parent_item_id) : null,
      item_code: form.item_code?.trim() || null,
      shortcut_key: form.shortcut_key?.trim() || null,
      bar_code: form.bar_code?.trim() || null,
      name: form.name.trim(),
      display_name: form.display_name?.trim() || null,
      description: form.description || "",
      default_quantity: Number(form.default_quantity) || 1,
      gst_item_type: form.gst_item_type?.trim() || null,
      gst_hsn_code: form.gst_hsn_code?.trim() || null,
      qty_decimal: Number(form.qty_decimal) || 3,
      spicy: form.spicy,
      calories: form.calories,
      hot_or_cold: form.hot_or_cold,
      prepare_time: form.prepare_time,
      current_rate: Number(form.current_rate) || 0,
      unit_id: form.unit_id ? Number(form.unit_id) : null,
      is_favourite: form.is_favourite ? 1 : 0,
      apply_discount: form.apply_discount ? 1 : 0,
      is_stock: form.is_stock ? 1 : 0,
      is_active: form.is_active ? 1 : 0,
      is_non_veg: form.is_non_veg ? 1 : 0,
    };
    setSaving(true);
    try {
      if (form.id) {
        await API.put(`/fb-items/${form.id}`, payload);
        setMessage("Item updated.");
      } else {
        const { data } = await API.post("/fb-items", payload);
        setForm((p) => ({ ...p, id: data.id }));
        setMessage("Item added.");
      }
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onAddRate = async () => {
    setError("");
    if (!form.id) {
      setError("Save the item first before adding rate history.");
      return;
    }
    if (!newRate.effective_date || newRate.rate === "") {
      setError("Effective date and rate are required");
      return;
    }
    try {
      const { data } = await API.post(`/fb-items/${form.id}/rates`, {
        effective_date: newRate.effective_date,
        rate: Number(newRate.rate),
      });
      setRateHistory(Array.isArray(data) ? data : []);
      setNewRate({ effective_date: "", rate: "" });
      setForm((p) => ({ ...p, current_rate: String(Number(newRate.rate) || 0) }));
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add rate");
    }
  };

  const onDeleteRate = async (rateId) => {
    if (!form.id) return;
    if (!confirm("Delete this rate entry?")) return;
    try {
      const { data } = await API.delete(`/fb-items/${form.id}/rates/${rateId}`);
      setRateHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete rate");
    }
  };

  const onSaveStock = async () => {
    setError("");
    if (!form.id) {
      setError("Save the item first.");
      return;
    }
    try {
      await API.put(`/fb-items/${form.id}`, {
        item_group_id: form.item_group_id ? Number(form.item_group_id) : null,
        item_code: form.item_code || null,
        bar_code: form.bar_code || null,
        name: form.name,
        display_name: form.display_name || null,
        current_rate: Number(form.current_rate) || 0,
        unit_id: stockForm.unit_id ? Number(stockForm.unit_id) : null,
        is_favourite: form.is_favourite ? 1 : 0,
        apply_discount: form.apply_discount ? 1 : 0,
        is_stock: stockForm.is_stock ? 1 : 0,
        is_active: form.is_active ? 1 : 0,
      });
      setForm((p) => ({
        ...p,
        is_stock: stockForm.is_stock,
        unit_id: stockForm.unit_id,
      }));
      setMessage("Stock info updated.");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save stock info");
    }
  };

  const onSaveDiscount = async () => {
    setError("");
    if (!form.id) {
      setError("Save the item first.");
      return;
    }
    if (!discount.date_from || !discount.date_to) {
      setError("Date range is required");
      return;
    }
    try {
      const { data } = await API.post(`/fb-items/${form.id}/discount`, {
        discount_type: discount.discount_type,
        discount_value: Number(discount.discount_value) || 0,
        date_from: discount.date_from,
        date_to: discount.date_to,
      });
      if (data) {
        setDiscount({
          discount_type: data.discount_type,
          discount_value: String(data.discount_value),
          date_from: String(data.date_from).slice(0, 10),
          date_to: String(data.date_to).slice(0, 10),
        });
      }
      setMessage("Discount saved.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save discount");
    }
  };

  const onDelete = async (row) => {
    if (!confirm(`Delete item "${row.name}"?`)) return;
    setError("");
    try {
      await API.delete(`/fb-items/${row.id}`);
      setMessage("Item deleted.");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed");
    }
  };

  const onSearch = () => load(filters);
  const onClearFilters = () => {
    const empty = { item_group_id: "", item_code: "", name: "" };
    setFilters(empty);
    load(empty);
  };

  const toggleQuick = async (row, field) => {
    try {
      await API.put(`/fb-items/${row.id}`, {
        item_group_id: row.item_group_id,
        item_code: row.item_code,
        bar_code: row.bar_code,
        name: row.name,
        display_name: row.display_name,
        current_rate: row.current_rate,
        unit_id: row.unit_id,
        is_favourite: field === "is_favourite" ? (row.is_favourite ? 0 : 1) : (row.is_favourite ? 1 : 0),
        apply_discount: field === "apply_discount" ? (row.apply_discount ? 0 : 1) : (row.apply_discount ? 1 : 0),
        is_stock: field === "is_stock" ? (row.is_stock ? 0 : 1) : (row.is_stock ? 1 : 0),
        is_active: field === "is_active" ? (row.is_active ? 0 : 1) : (row.is_active ? 1 : 0),
      });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Update failed");
    }
  };

  // -------- Renders --------
  const renderListView = () => (
    <>
      <div style={styles.topbar}>
        <h2 style={styles.title}>Manage Items</h2>
        <div style={styles.btnRow}>
          <button type="button" style={styles.refreshBtn} onClick={() => load()}>⟳ Refresh</button>
          <button type="button" style={styles.refreshBtn} disabled title="Coming soon">Import Items</button>
          <button type="button" style={styles.refreshBtn} disabled title="Coming soon">Export Items</button>
          <button type="button" style={styles.editRateBtn} disabled title="Coming soon">Edit Rate</button>
          <button type="button" style={styles.newBtn} onClick={openAdd}>+ New</button>
        </div>
      </div>

      <div style={styles.filterBar}>
        <div style={styles.filterField}>
          <label style={styles.filterLabel}>Item Group</label>
          <select
            style={styles.input}
            value={filters.item_group_id}
            onChange={(e) => setFilters((p) => ({ ...p, item_group_id: e.target.value }))}
          >
            <option value="">Select Parent</option>
            {groupOptions.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
        <div style={styles.filterField}>
          <label style={styles.filterLabel}>Item Code</label>
          <input style={styles.input} value={filters.item_code}
            onChange={(e) => setFilters((p) => ({ ...p, item_code: e.target.value }))} />
        </div>
        <div style={styles.filterField}>
          <label style={styles.filterLabel}>Item Name</label>
          <input style={styles.input} value={filters.name}
            onChange={(e) => setFilters((p) => ({ ...p, name: e.target.value }))} />
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
          <button type="button" style={styles.searchBtn} onClick={onSearch}>Search</button>
          <button type="button" style={styles.clearBtn} onClick={onClearFilters}>Clear</button>
        </div>
      </div>

      <div style={styles.subtitle}>List of Items</div>

      {error && <div style={{ ...styles.alert, ...styles.alertError }}>{error}</div>}
      {message && <div style={{ ...styles.alert, ...styles.alertSuccess }}>{message}</div>}

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: 40 }}>#</th>
              <th style={styles.th}>Item Group</th>
              <th style={styles.th}>Item Code</th>
              <th style={styles.th}>Bar Code</th>
              <th style={styles.th}>Item Name</th>
              <th style={styles.th}>Display Name</th>
              <th style={{ ...styles.th, textAlign: "right" }}>Current Rate</th>
              <th style={styles.th}>Unit</th>
              <th style={styles.th}>Favourite?</th>
              <th style={styles.th}>Apply Discount?</th>
              <th style={{ ...styles.th, textAlign: "center" }}>Stock Item?</th>
              <th style={{ ...styles.th, textAlign: "center" }}>Active</th>
              <th style={{ ...styles.th, width: 90, textAlign: "right" }} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={13} style={styles.empty}>
                  No items yet. Click <b>+ New</b> to add one.
                </td>
              </tr>
            )}
            {rows.map((row, idx) => (
              <tr key={row.id} style={idx % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                <td style={styles.td}>{idx + 1}</td>
                <td style={styles.td}>{row.item_group_name || "—"}</td>
                <td style={styles.td}>{row.item_code || ""}</td>
                <td style={styles.td}>{row.bar_code || ""}</td>
                <td style={styles.td}>{row.name}</td>
                <td style={styles.td}>{row.display_name || row.name}</td>
                <td style={{ ...styles.td, textAlign: "right" }}>{Number(row.current_rate).toFixed(2)}</td>
                <td style={styles.td}>{row.unit_name || ""}</td>
                <td style={styles.td}>
                  <div style={styles.yesNoCell}>
                    <span style={styles.yesNoText}>{row.is_favourite ? "Yes" : "No"}</span>
                    <button type="button" style={styles.miniEdit} onClick={() => toggleQuick(row, "is_favourite")} title="Toggle">✎</button>
                  </div>
                </td>
                <td style={styles.td}>
                  <div style={styles.yesNoCell}>
                    <span style={styles.yesNoText}>{row.apply_discount ? "Yes" : "No"}</span>
                    <button type="button" style={styles.miniEdit} onClick={() => toggleQuick(row, "apply_discount")} title="Toggle">✎</button>
                  </div>
                </td>
                <td style={{ ...styles.td, textAlign: "center" }}>
                  <input type="checkbox" checked={!!row.is_stock} onChange={() => toggleQuick(row, "is_stock")} />
                </td>
                <td style={{ ...styles.td, textAlign: "center" }}>
                  <input type="checkbox" checked={!!row.is_active} onChange={() => toggleQuick(row, "is_active")} />
                </td>
                <td style={{ ...styles.td, textAlign: "right" }}>
                  <button type="button" style={styles.editBtn} onClick={() => openEdit(row)} title="Edit">✎</button>
                  <button type="button" style={styles.deleteBtn} onClick={() => onDelete(row)} title="Delete">🗑</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {loading && <div style={styles.loading}>Loading...</div>}
    </>
  );

  const renderTabs = () => (
    <div style={styles.tabs}>
      {TABS.map((t) => (
        <button
          key={t}
          type="button"
          style={{ ...styles.tab, ...(activeTab === t ? styles.tabActive : {}) }}
          onClick={() => setActiveTab(t)}
        >
          {t}
        </button>
      ))}
    </div>
  );

  const renderItemBasic = () => (
    <div style={styles.formCard}>
      <div style={styles.field}>
        <label style={styles.label}>Item Group</label>
        <select style={styles.input} value={form.item_group_id} onChange={setField("item_group_id")}>
          <option value="">— Select —</option>
          {groupOptions.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>
      <div style={styles.field}>
        <label style={styles.label}>Parent Item</label>
        <select style={styles.input} value={form.parent_item_id} onChange={setField("parent_item_id")}>
          <option value="">None</option>
          {rows.filter((r) => r.id !== form.id).map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>

      <div style={styles.row3}>
        <div style={styles.field}>
          <label style={styles.label}>Item Code</label>
          <input style={styles.input} value={form.item_code} onChange={setField("item_code")} />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Shortcut Key</label>
          <input style={styles.input} value={form.shortcut_key} onChange={setField("shortcut_key")} />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Bar Code</label>
          <input style={styles.input} value={form.bar_code} placeholder="Enter bar code" onChange={setField("bar_code")} />
        </div>
      </div>

      <div style={styles.row2}>
        <div style={styles.field}>
          <label style={styles.label}>Item Name</label>
          <input style={styles.input} value={form.name} onChange={setField("name")} />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Item Display Name</label>
          <input style={styles.input} value={form.display_name} onChange={setField("display_name")} />
        </div>
      </div>

      <div style={styles.row2}>
        <div style={styles.field}>
          <label style={styles.label}>Item Description</label>
          <input style={styles.input} value={form.description} onChange={setField("description")} />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Default Quantity</label>
          <input type="number" step="0.0001" style={styles.input} value={form.default_quantity} onChange={setField("default_quantity")} />
        </div>
      </div>

      <div style={styles.row2}>
        <div style={styles.field}>
          <label style={styles.label}>GST Item Type</label>
          <select style={styles.input} value={form.gst_item_type} onChange={setField("gst_item_type")}>
            <option value=""> </option>
            <option value="Goods">Goods</option>
            <option value="Services">Services</option>
          </select>
        </div>
        <div style={styles.field}>
          <label style={styles.label}>GST Item HSN/SAC Code</label>
          <input style={styles.input} placeholder="Enter item opening stock" value={form.gst_hsn_code} onChange={setField("gst_hsn_code")} />
        </div>
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Item Qty Decimal</label>
        <input type="number" style={{ ...styles.input, maxWidth: 200 }} value={form.qty_decimal} onChange={setField("qty_decimal")} />
      </div>

      <div style={styles.row4}>
        <div style={styles.field}>
          <label style={styles.label}>Spicy?</label>
          <div style={styles.radioRow}>
            {["NA", "Yes", "No"].map((v) => (
              <label key={v} style={styles.radio}>
                <input type="radio" checked={form.spicy === v} onChange={() => setForm((p) => ({ ...p, spicy: v }))} /> {v}
              </label>
            ))}
          </div>
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Calories</label>
          <input style={styles.input} value={form.calories} onChange={setField("calories")} />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Hot Or Cold?</label>
          <div style={styles.radioRow}>
            {["NA", "Hot", "Cold"].map((v) => (
              <label key={v} style={styles.radio}>
                <input type="radio" checked={form.hot_or_cold === v} onChange={() => setForm((p) => ({ ...p, hot_or_cold: v }))} /> {v}
              </label>
            ))}
          </div>
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Prepare Time</label>
          <input style={styles.input} value={form.prepare_time} onChange={setField("prepare_time")} />
        </div>
      </div>

      <div style={{ ...styles.checkRow, justifyContent: "center", marginTop: 14, marginBottom: 6 }}>
        <label style={styles.checkLabel}>
          <input type="checkbox" checked={!!form.is_active} onChange={setField("is_active")} /> Active
        </label>
        <label style={styles.checkLabel}>
          <input type="checkbox" checked={!!form.is_favourite} onChange={setField("is_favourite")} /> Add To Favourite
        </label>
        <label style={styles.checkLabel}>
          <input type="checkbox" checked={!!form.is_non_veg} onChange={setField("is_non_veg")} /> Is Non-Veg?
        </label>
      </div>

      <div style={styles.actionRow}>
        <button type="button" style={styles.saveBtnDark} onClick={onSaveBasic} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </button>
        <button type="button" style={styles.backBtn} onClick={goList}>Back To List</button>
      </div>
    </div>
  );

  const renderItemRate = () => (
    <div style={styles.formCard}>
      {!form.id && (
        <div style={{ ...styles.alert, ...styles.alertError }}>
          Save Item Basic first to manage rate history.
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto auto", gap: 8, alignItems: "end", marginBottom: 12 }}>
        <div style={styles.field}>
          <label style={styles.label}>Effective Date</label>
          <input
            type="date"
            style={styles.input}
            value={newRate.effective_date}
            onChange={(e) => setNewRate((p) => ({ ...p, effective_date: e.target.value }))}
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Rate</label>
          <input
            type="number"
            step="0.01"
            style={styles.input}
            value={newRate.rate}
            onChange={(e) => setNewRate((p) => ({ ...p, rate: e.target.value }))}
          />
        </div>
        <button type="button" style={styles.saveBtnGreen} onClick={onAddRate} disabled={!form.id}>+ Add</button>
        <button type="button" style={styles.backBtn} onClick={goList}>Back To List</button>
      </div>
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Effective Date</th>
              <th style={{ ...styles.th, textAlign: "right" }}>Rate</th>
              <th style={{ ...styles.th, width: 90, textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {rateHistory.length === 0 && (
              <tr><td colSpan={3} style={styles.empty}>No rate history yet.</td></tr>
            )}
            {rateHistory.map((r, idx) => (
              <tr key={r.id} style={idx % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                <td style={styles.td}>{String(r.effective_date).slice(0, 10).split("-").reverse().join("/")}</td>
                <td style={{ ...styles.td, textAlign: "right" }}>{Number(r.rate).toFixed(2)}</td>
                <td style={{ ...styles.td, textAlign: "right" }}>
                  <button type="button" style={styles.editBtn} title="Use this rate"
                    onClick={() => setForm((p) => ({ ...p, current_rate: String(r.rate) }))}>✎</button>
                  <button type="button" style={styles.deleteBtn} title="Delete"
                    onClick={() => onDeleteRate(r.id)}>🗑</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderItemRecipes = () => (
    <div style={styles.formCard}>
      <div style={{ color: "#5b6b7c", fontSize: 13, marginBottom: 12 }}>
        Item Recipes will be wired to inventory recipes. Coming next.
      </div>
      <div style={styles.actionRow}>
        <button type="button" style={styles.backBtn} onClick={goList}>Back To List</button>
      </div>
    </div>
  );

  const renderStockInfo = () => (
    <div style={styles.formCard}>
      {!form.id && (
        <div style={{ ...styles.alert, ...styles.alertError }}>
          Save Item Basic first to set stock info.
        </div>
      )}
      <label style={{ ...styles.checkLabel, marginBottom: 12 }}>
        <input
          type="checkbox"
          checked={!!stockForm.is_stock}
          onChange={(e) => setStockForm((p) => ({ ...p, is_stock: e.target.checked }))}
        /> Is Stock Item?
      </label>
      <div style={styles.field}>
        <label style={styles.label}>Unit</label>
        <select
          style={{ ...styles.input, maxWidth: 360 }}
          value={stockForm.unit_id}
          onChange={(e) => setStockForm((p) => ({ ...p, unit_id: e.target.value }))}
        >
          <option value=""></option>
          {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>
      <div style={{ ...styles.actionRow, marginTop: 20 }}>
        <button type="button" style={styles.saveBtnDark} onClick={onSaveStock} disabled={!form.id}>Save</button>
        <button type="button" style={styles.backBtn} onClick={goList}>Back To List</button>
      </div>
    </div>
  );

  const renderDiscount = () => (
    <div style={styles.formCard}>
      {!form.id && (
        <div style={{ ...styles.alert, ...styles.alertError }}>
          Save Item Basic first to set discount.
        </div>
      )}
      <div style={styles.row2}>
        <div style={styles.field}>
          <label style={styles.label}>Discount Type *</label>
          <div style={styles.radioRow}>
            <label style={styles.radio}>
              <input type="radio" checked={discount.discount_type === "pct"}
                onChange={() => setDiscount((p) => ({ ...p, discount_type: "pct" }))} /> (%)
            </label>
            <label style={styles.radio}>
              <input type="radio" checked={discount.discount_type === "amt"}
                onChange={() => setDiscount((p) => ({ ...p, discount_type: "amt" }))} /> Amt.
            </label>
          </div>
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Discount Value *</label>
          <input type="number" step="0.01" style={styles.input}
            value={discount.discount_value}
            onChange={(e) => setDiscount((p) => ({ ...p, discount_value: e.target.value }))} />
        </div>
      </div>
      <div style={styles.row2}>
        <div style={styles.field}>
          <label style={styles.label}>Date Range From *</label>
          <input type="date" style={styles.input} value={discount.date_from}
            onChange={(e) => setDiscount((p) => ({ ...p, date_from: e.target.value }))} />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>To *</label>
          <input type="date" style={styles.input} value={discount.date_to}
            onChange={(e) => setDiscount((p) => ({ ...p, date_to: e.target.value }))} />
        </div>
      </div>
      <div style={{ ...styles.actionRow, marginTop: 20 }}>
        <button type="button" style={styles.saveBtnDark} onClick={onSaveDiscount} disabled={!form.id}>Save</button>
        <button type="button" style={styles.backBtn} onClick={goList}>Back To List</button>
      </div>
    </div>
  );

  const renderFormView = () => (
    <>
      <div style={{ ...styles.topbar, alignItems: "flex-start" }}>
        <div>
          <h2 style={styles.title}>Manage Items</h2>
          <div style={{ fontSize: 13, color: "#1f2d3d", marginTop: 6 }}>
            <b>Add/Edit Item Details</b>
            {form.name && <span style={{ marginLeft: 10, color: "#5b6b7c" }}>{form.name}</span>}
          </div>
        </div>
        <div style={styles.btnRow}>
          <button type="button" style={styles.refreshBtn} onClick={() => load()}>⟳ Refresh</button>
          <button type="button" style={styles.refreshBtn} disabled>Import Items</button>
          <button type="button" style={styles.refreshBtn} disabled>Export Items</button>
          <button type="button" style={styles.editRateBtn} disabled>Edit Rate</button>
          <button type="button" style={styles.newBtn} onClick={openAdd}>+ New</button>
        </div>
      </div>

      {error && <div style={{ ...styles.alert, ...styles.alertError }}>{error}</div>}
      {message && <div style={{ ...styles.alert, ...styles.alertSuccess }}>{message}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 280px", gap: 16, alignItems: "flex-start" }}>
        <div>
          {renderTabs()}
          {activeTab === "Item Basic" && renderItemBasic()}
          {activeTab === "Item Rate" && renderItemRate()}
          {activeTab === "Item Recipes" && renderItemRecipes()}
          {activeTab === "Stock Info" && renderStockInfo()}
          {activeTab === "Discount" && renderDiscount()}
        </div>
        <div style={styles.imagePanel}>
          <button onClick={goList} style={styles.imagePanelClose} title="Close">×</button>
          <div style={styles.label}>Item Image</div>
          <input type="file" style={{ fontSize: 13 }} disabled />
          <button type="button" style={{ ...styles.saveBtnGreen, marginTop: 12 }} disabled>Upload</button>
        </div>
      </div>
    </>
  );

  return (
    <div style={styles.page}>
      {view === "list" ? renderListView() : renderFormView()}
    </div>
  );
};

const styles = {
  page: {
    padding: "20px 28px 40px",
    background: "#fff",
    minHeight: "100%",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: "#2c3e50",
  },
  topbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid #e6e8eb",
    paddingBottom: 8,
    marginBottom: 12,
    flexWrap: "wrap",
    gap: 8,
  },
  title: { margin: 0, fontSize: 18, fontWeight: 600, color: "#1f2d3d" },
  btnRow: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  refreshBtn: {
    background: "#fff", border: "1px solid #ccc", color: "#333",
    padding: "5px 12px", borderRadius: 3, fontSize: 13, cursor: "pointer",
  },
  editRateBtn: {
    background: "#5bc0de", border: "1px solid #46b8da", color: "#fff",
    padding: "5px 12px", borderRadius: 3, fontSize: 13, fontWeight: 500, cursor: "pointer", opacity: 0.85,
  },
  newBtn: {
    background: "#5bc0de", border: "1px solid #46b8da", color: "#fff",
    padding: "5px 12px", borderRadius: 3, fontSize: 13, fontWeight: 500, cursor: "pointer",
  },
  searchBtn: {
    background: "#f0ad4e", border: "1px solid #eea236", color: "#fff",
    padding: "6px 16px", borderRadius: 3, fontSize: 13, fontWeight: 500, cursor: "pointer", height: 34,
  },
  clearBtn: {
    background: "#f7d046", border: "1px solid #e5be2c", color: "#5a4500",
    padding: "6px 16px", borderRadius: 3, fontSize: 13, fontWeight: 500, cursor: "pointer", height: 34,
  },
  filterBar: {
    display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 12,
    padding: 12, background: "#fafbfc", border: "1px solid #e6e8eb",
    borderRadius: 3, marginBottom: 12,
  },
  filterField: { display: "flex", flexDirection: "column" },
  filterLabel: { fontSize: 12, fontWeight: 600, color: "#1f2d3d", marginBottom: 4 },
  subtitle: { fontSize: 13, color: "#5b6b7c", marginBottom: 8 },
  alert: { padding: "8px 12px", borderRadius: 4, fontSize: 13, marginBottom: 10 },
  alertError: { background: "#fdecea", color: "#b94a48", border: "1px solid #f3c2bd" },
  alertSuccess: { background: "#e6f4ea", color: "#2c7a3d", border: "1px solid #bfe2c8" },

  tableWrap: { border: "1px solid #e6e8eb", borderRadius: 3, overflow: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 600 },
  th: {
    background: "#f7f7f7", borderBottom: "1px solid #e6e8eb",
    padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#1f2d3d", whiteSpace: "nowrap",
  },
  td: { padding: "10px 12px", borderBottom: "1px solid #f0f0f0", color: "#2c3e50", whiteSpace: "nowrap" },
  rowEven: { background: "#fff" },
  rowOdd: { background: "#fafbfc" },
  yesNoCell: { display: "flex", alignItems: "center", gap: 8 },
  yesNoText: { color: "#5b6b7c", minWidth: 24 },
  miniEdit: {
    background: "#5bc0de", border: "1px solid #46b8da", color: "#fff",
    width: 24, height: 22, borderRadius: 3, fontSize: 11, cursor: "pointer",
  },
  editBtn: {
    background: "#5bc0de", border: "1px solid #46b8da", color: "#fff",
    width: 28, height: 26, borderRadius: 3, fontSize: 13, marginRight: 4, cursor: "pointer",
  },
  deleteBtn: {
    background: "#d9534f", border: "1px solid #d43f3a", color: "#fff",
    width: 28, height: 26, borderRadius: 3, fontSize: 13, cursor: "pointer",
  },
  empty: { padding: 20, textAlign: "center", color: "#999", fontStyle: "italic" },
  loading: { marginTop: 12, color: "#6c757d", fontSize: 13 },

  // Tabs
  tabs: {
    display: "flex",
    gap: 2,
    borderBottom: "1px solid #e6e8eb",
    marginBottom: 0,
  },
  tab: {
    background: "#bdbdbd",
    color: "#fff",
    border: "none",
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  tabActive: {
    background: "#f0ad4e",
    color: "#fff",
  },

  formCard: {
    border: "1px solid #e6e8eb",
    borderTop: "none",
    background: "#fff",
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  field: { display: "flex", flexDirection: "column" },
  label: { fontSize: 12, fontWeight: 600, color: "#1f2d3d", marginBottom: 4 },
  input: {
    height: 34, border: "1px solid #ced4da", borderRadius: 3, padding: "4px 8px",
    fontSize: 13, background: "#fff", color: "#2c3e50", outline: "none",
  },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  row3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 },
  row4: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 },
  checkRow: { display: "flex", gap: 24, flexWrap: "wrap" },
  checkLabel: {
    display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#1f2d3d", cursor: "pointer",
  },
  radioRow: { display: "flex", gap: 12, alignItems: "center", height: 34 },
  radio: { display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "#1f2d3d", cursor: "pointer" },

  actionRow: { display: "flex", gap: 8, marginTop: 12 },
  saveBtnDark: {
    background: "#337ab7", color: "#fff", border: "1px solid #2e6da4",
    padding: "6px 22px", borderRadius: 3, fontSize: 13, fontWeight: 500, cursor: "pointer",
  },
  saveBtnGreen: {
    background: "#5cb85c", color: "#fff", border: "1px solid #4cae4c",
    padding: "6px 18px", borderRadius: 3, fontSize: 13, fontWeight: 500, cursor: "pointer",
  },
  backBtn: {
    background: "#5bc0de", color: "#fff", border: "1px solid #46b8da",
    padding: "6px 14px", borderRadius: 3, fontSize: 13, fontWeight: 500, cursor: "pointer",
  },

  imagePanel: {
    position: "relative",
    border: "1px solid #e6e8eb",
    borderRadius: 3,
    background: "#fff",
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  imagePanelClose: {
    position: "absolute", top: 6, right: 8,
    background: "transparent", border: "none", fontSize: 18, cursor: "pointer", color: "#888",
  },
};

export default Items;
