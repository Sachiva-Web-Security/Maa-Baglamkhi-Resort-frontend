import React, { useState } from "react";
import API from "../api";
import "./ParcelSetting.css";

const ParcelSetting = () => {
  const [settings, setSettings] = useState({
    autoPrint: true,
    packingCharge: 10,
    minOrderValue: 100,
    defaultPaymentMode: "Cash",
    allowPhoneOrders: true,
    notifyKitchen: true,
    defaultWaiter: "Parcel Counter",
  });

  const handleSave = () => {
    // In production: API.post("/restaurant/parcel-settings", settings)
    alert("Parcel settings saved");
  };

  return (
    <div className="ps-page">
      <div className="simple-page-header">
        <h1 className="simple-page-title">Parcel / Takeaway Settings</h1>
      </div>
      <div className="simple-card" style={{ maxWidth: 560 }}>
        <div className="ps-toggle-group">
          {[
            ["Auto-Print KOT", "autoPrint"],
            ["Notify Kitchen", "notifyKitchen"],
            ["Allow Phone Orders", "allowPhoneOrders"],
          ].map(([label, key]) => (
            <div key={key} className="ps-toggle-row">
              <span>{label}</span>
              <label className="ps-toggle">
                <input type="checkbox" checked={settings[key]} onChange={e => setSettings(p => ({ ...p, [key]: e.target.checked }))} />
                <span className="ps-toggle-slider"></span>
              </label>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
          <div className="simple-form-group">
            <label className="simple-label">Packing Charge (₹)</label>
            <input type="number" className="simple-input" value={settings.packingCharge} onChange={e => setSettings(p => ({ ...p, packingCharge: Number(e.target.value) }))} min="0" />
          </div>
          <div className="simple-form-group">
            <label className="simple-label">Min Order Value (₹)</label>
            <input type="number" className="simple-input" value={settings.minOrderValue} onChange={e => setSettings(p => ({ ...p, minOrderValue: Number(e.target.value) }))} min="0" />
          </div>
          <div className="simple-form-group">
            <label className="simple-label">Payment Mode</label>
            <select className="simple-select" value={settings.defaultPaymentMode} onChange={e => setSettings(p => ({ ...p, defaultPaymentMode: e.target.value }))}>
              <option>Cash</option><option>UPI</option><option>Card</option>
            </select>
          </div>
          <div className="simple-form-group">
            <label className="simple-label">Default Waiter</label>
            <input className="simple-input" value={settings.defaultWaiter} onChange={e => setSettings(p => ({ ...p, defaultWaiter: e.target.value }))} />
          </div>
        </div>
        <div className="simple-btn-row" style={{ justifyContent: "flex-end", marginTop: 16 }}>
          <button className="simple-btn simple-btn-primary" onClick={handleSave}>Save Settings</button>
        </div>
      </div>
    </div>
  );
};
export default ParcelSetting;