import React, { useState } from "react";
import API from "../api";
import "./RestaurantSettings.css";

const RestaurantSettings = () => {
  const [tab, setTab] = useState("general");
  const [settings, setSettings] = useState({
    restaurantName: "Maa Bhagwati Resort",
    address: "",
    phone: "",
    email: "",
    taxPercent: 5,
    serviceChargePercent: 0,
    decimalPlaces: 0,
    currency: "INR",
    orderPrefix: "ORD",
    invoicePrefix: "INV",
    autoKOT: true,
    printKOT: true,
    allowDiscount: true,
    minOrderAmount: 0,
    tableSync: true,
  });

  const [saved, setSaved] = useState(false);

  const handleChange = (key, val) => {
    setSettings(prev => ({ ...prev, [key]: val }));
    setSaved(false);
  };

  const handleSave = () => {
    // In production: POST to /restaurant/settings
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    if (confirm("Reset all settings to default?")) {
      setSettings({
        restaurantName: "Maa Bhagwati Resort",
        address: "",
        phone: "",
        email: "",
        taxPercent: 5,
        serviceChargePercent: 0,
        decimalPlaces: 0,
        currency: "INR",
        orderPrefix: "ORD",
        invoicePrefix: "INV",
        autoKOT: true,
        printKOT: true,
        allowDiscount: true,
        minOrderAmount: 0,
        tableSync: true,
      });
    }
  };

  return (
    <div className="rs-page">
      <div className="simple-page-header">
        <h1 className="simple-page-title">Restaurant Settings</h1>
      </div>

      {saved && (
        <div className="rs-saved-banner">Settings saved successfully.</div>
      )}

      <div className="rs-tabs">
        {["general", "billing", "order", "display"].map(t => (
          <button key={t} className={`rs-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="simple-card">
        {tab === "general" && (
          <div className="rs-form">
            <div className="rs-form-row">
              <div className="simple-form-group">
                <label className="simple-label">Restaurant Name</label>
                <input className="simple-input" value={settings.restaurantName}
                  onChange={e => handleChange("restaurantName", e.target.value)} />
              </div>
              <div className="simple-form-group">
                <label className="simple-label">Phone</label>
                <input className="simple-input" value={settings.phone}
                  onChange={e => handleChange("phone", e.target.value)} placeholder="+91..." />
              </div>
            </div>
            <div className="rs-form-row">
              <div className="simple-form-group">
                <label className="simple-label">Email</label>
                <input className="simple-input" value={settings.email}
                  onChange={e => handleChange("email", e.target.value)} type="email" />
              </div>
              <div className="simple-form-group">
                <label className="simple-label">Address</label>
                <input className="simple-input" value={settings.address}
                  onChange={e => handleChange("address", e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {tab === "billing" && (
          <div className="rs-form">
            <div className="rs-form-row">
              <div className="simple-form-group">
                <label className="simple-label">Tax (GST) %</label>
                <input type="number" className="simple-input" value={settings.taxPercent}
                  onChange={e => handleChange("taxPercent", Number(e.target.value))} min="0" max="100" />
              </div>
              <div className="simple-form-group">
                <label className="simple-label">Service Charge %</label>
                <input type="number" className="simple-input" value={settings.serviceChargePercent}
                  onChange={e => handleChange("serviceChargePercent", Number(e.target.value))} min="0" max="100" />
              </div>
            </div>
            <div className="rs-form-row">
              <div className="simple-form-group">
                <label className="simple-label">Decimal Places</label>
                <select className="simple-select" value={settings.decimalPlaces}
                  onChange={e => handleChange("decimalPlaces", Number(e.target.value))}>
                  <option value="0">0 (No decimals)</option>
                  <option value="1">1 decimal</option>
                  <option value="2">2 decimals</option>
                </select>
              </div>
              <div className="simple-form-group">
                <label className="simple-label">Currency</label>
                <select className="simple-select" value={settings.currency}
                  onChange={e => handleChange("currency", e.target.value)}>
                  <option value="INR">INR (Indian Rupee)</option>
                </select>
              </div>
            </div>
            <div className="rs-form-row">
              <div className="simple-form-group">
                <label className="simple-label">Order Prefix</label>
                <input className="simple-input" value={settings.orderPrefix}
                  onChange={e => handleChange("orderPrefix", e.target.value)} />
              </div>
              <div className="simple-form-group">
                <label className="simple-label">Invoice Prefix</label>
                <input className="simple-input" value={settings.invoicePrefix}
                  onChange={e => handleChange("invoicePrefix", e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {tab === "order" && (
          <div className="rs-form">
            <div className="rs-toggle-group">
              {[
                ["Auto KOT on Order", "autoKOT"],
                ["Print KOT Automatically", "printKOT"],
                ["Allow Discount", "allowDiscount"],
                ["Sync Tables with Hotel", "tableSync"],
              ].map(([label, key]) => (
                <div key={key} className="rs-toggle-row">
                  <span>{label}</span>
                  <label className="rs-toggle">
                    <input type="checkbox" checked={settings[key]}
                      onChange={e => handleChange(key, e.target.checked)} />
                    <span className="rs-toggle-slider"></span>
                  </label>
                </div>
              ))}
            </div>
            <div className="simple-form-group" style={{ maxWidth: 200, marginTop: 16 }}>
              <label className="simple-label">Minimum Order Amount</label>
              <input type="number" className="simple-input" value={settings.minOrderAmount}
                onChange={e => handleChange("minOrderAmount", Number(e.target.value))} min="0" />
            </div>
          </div>
        )}

        {tab === "display" && (
          <div className="rs-form">
            <div className="rs-info-box">
              <p className="simple-text-muted">Display settings coming soon — theme, colors, logo, and screen resolution options will appear here.</p>
            </div>
          </div>
        )}

        <div className="simple-btn-row" style={{ marginTop: 16, justifyContent: "flex-end" }}>
          <button className="simple-btn simple-btn-gray" onClick={handleReset}>Reset</button>
          <button className="simple-btn simple-btn-primary" onClick={handleSave}>Save Settings</button>
        </div>
      </div>
    </div>
  );
};

export default RestaurantSettings;