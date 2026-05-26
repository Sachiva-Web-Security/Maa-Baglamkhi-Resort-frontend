import { useEffect, useRef, useState } from "react";
import API from "../api";
import "./Profile.css";

const SERVER_BASE = (API.defaults.baseURL || "").replace(/\/api\/?$/, "");

const emptyForm = {
  hotel_name: "",
  address_line1: "",
  address_line2: "",
  district: "",
  pincode: "",
  landline1: "",
  landline2: "",
  mobile1: "",
  mobile2: "",
  email: "",
  website: "",
  gst_number: "",
  pan_card: "",
  cheque_payable_to: "",
  invoice_note: "",
  logo_url: "",
};

const Profile = () => {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const noteRef = useRef(null);

  const loadInfo = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await API.get("/hotel-info");
      const merged = { ...emptyForm, ...data };
      Object.keys(emptyForm).forEach((k) => {
        if (merged[k] === null || merged[k] === undefined) merged[k] = "";
      });
      setForm(merged);
      if (noteRef.current) {
        noteRef.current.innerHTML = data.invoice_note || "";
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load hotel info");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInfo();
  }, []);

  const onChange = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const onLogoSelect = (e) => {
    const file = e.target.files?.[0];
    setLogoFile(file || null);
  };

  const uploadLogo = async () => {
    if (!logoFile) {
      setError("Please choose a logo file first.");
      return;
    }
    setUploading(true);
    setError("");
    setMessage("");
    try {
      const fd = new FormData();
      fd.append("logo", logoFile);
      const { data } = await API.post("/hotel-info/logo", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm((prev) => ({ ...prev, logo_url: data.logo_url || "" }));
      setLogoFile(null);
      setMessage("Logo uploaded.");
    } catch (err) {
      setError(err.response?.data?.message || "Logo upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        ...form,
        invoice_note: noteRef.current ? noteRef.current.innerHTML : form.invoice_note,
      };
      const { data } = await API.put("/hotel-info", payload);
        const merged = { ...emptyForm, ...data };
        Object.keys(emptyForm).forEach((k) => {
          if (merged[k] === null || merged[k] === undefined) merged[k] = "";
        });
        setForm(merged);
      setMessage("Hotel information saved.");
    } catch (err) {
      setError(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const fmtCmd = (cmd, value = null) => {
    document.execCommand(cmd, false, value);
    if (noteRef.current) noteRef.current.focus();
  };

  const logoSrc = form.logo_url
    ? form.logo_url.startsWith("http")
      ? form.logo_url
      : `${SERVER_BASE}${form.logo_url}`
    : "";

  return (
    <div className="hotel-info-page">
      <div className="hotel-info-topbar">
        <h2 className="hotel-info-title">Hotel Information</h2>
        <button type="button" className="hotel-info-refresh" onClick={loadInfo}>
          ⟳ Refresh
        </button>
      </div>

      <div className="hotel-info-subtitle">Edit Your Hotel Information</div>

      {error && <div className="hotel-info-alert error">{error}</div>}
      {message && <div className="hotel-info-alert success">{message}</div>}

      <form className="hotel-info-grid" onSubmit={onSave}>
        {/* Left column */}
        <div className="hotel-info-col">
          <Field label="Hotel Name">
            <input value={form.hotel_name} onChange={onChange("hotel_name")} />
          </Field>

          <Field label="Address Line 1">
            <input value={form.address_line1} onChange={onChange("address_line1")} />
          </Field>

          <Field label="Address Line 2">
            <input value={form.address_line2} onChange={onChange("address_line2")} />
          </Field>

          <div className="hotel-info-row">
            <Field label="">
              <input
                value={form.district}
                onChange={onChange("district")}
                placeholder="District"
              />
            </Field>
            <Field label="Pincode">
              <input value={form.pincode} onChange={onChange("pincode")} />
            </Field>
          </div>

          <div className="hotel-info-row">
            <Field label="Landline Number 1">
              <input
                value={form.landline1}
                onChange={onChange("landline1")}
                placeholder="Enter landline number 1"
              />
            </Field>
            <Field label="Landline Number 2">
              <input
                value={form.landline2}
                onChange={onChange("landline2")}
                placeholder="Enter landline number 2"
              />
            </Field>
          </div>

          <div className="hotel-info-row">
            <Field label="Mobile Number 1">
              <input value={form.mobile1} onChange={onChange("mobile1")} />
            </Field>
            <Field label="Mobile Number 2">
              <input value={form.mobile2} onChange={onChange("mobile2")} />
            </Field>
          </div>

          <div className="hotel-info-row">
            <Field label="Email Id">
              <input
                type="email"
                value={form.email}
                onChange={onChange("email")}
              />
            </Field>
            <Field label="Website">
              <input value={form.website} onChange={onChange("website")} />
            </Field>
          </div>

          <Field label="GST Numbers">
            <input
              value={form.gst_number}
              onChange={onChange("gst_number")}
              placeholder="Enter hotel GST no."
            />
          </Field>

          <div className="hotel-info-actions">
            <button type="submit" className="btn btn-save" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              className="btn btn-return"
              onClick={() => window.history.back()}
            >
              Return
            </button>
          </div>
        </div>

        {/* Right column */}
        <div className="hotel-info-col">
          <Field label="Hotel Logo">
            <div className="hotel-info-file">
              <label className="file-input">
                <span className="file-btn">Choose file</span>
                <span className="file-name">
                  {logoFile ? logoFile.name : "No file chosen"}
                </span>
                <input type="file" accept="image/*" onChange={onLogoSelect} />
              </label>
            </div>
            {logoSrc && (
              <img
                src={logoSrc}
                alt="Hotel logo"
                className="hotel-info-logo-preview"
              />
            )}
            <button
              type="button"
              className="btn btn-upload"
              onClick={uploadLogo}
              disabled={uploading || !logoFile}
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </Field>

          <div className="hotel-info-row">
            <Field label="Pan card Number">
              <input
                value={form.pan_card}
                onChange={onChange("pan_card")}
                placeholder="Enter pan card number"
              />
            </Field>
            <Field label="Cheque Payable To">
              <input
                value={form.cheque_payable_to}
                onChange={onChange("cheque_payable_to")}
                placeholder="Enter cheque payable to"
              />
            </Field>
          </div>

          <Field label="Invoice Note">
            <div className="rt-toolbar">
              <button type="button" onClick={() => fmtCmd("bold")} title="Bold">
                <b>B</b>
              </button>
              <button type="button" onClick={() => fmtCmd("italic")} title="Italic">
                <i>I</i>
              </button>
              <button type="button" onClick={() => fmtCmd("strikeThrough")} title="Strikethrough">
                <s>S</s>
              </button>
              <button type="button" onClick={() => fmtCmd("underline")} title="Underline">
                <u>U</u>
              </button>
              <span className="rt-sep" />
              <button type="button" onClick={() => fmtCmd("insertOrderedList")} title="Numbered list">
                1.
              </button>
              <button type="button" onClick={() => fmtCmd("insertUnorderedList")} title="Bullet list">
                •
              </button>
              <span className="rt-sep" />
              <button type="button" onClick={() => fmtCmd("justifyLeft")} title="Align left">
                ⯇
              </button>
              <button type="button" onClick={() => fmtCmd("justifyCenter")} title="Align center">
                ≡
              </button>
              <button type="button" onClick={() => fmtCmd("justifyRight")} title="Align right">
                ⯈
              </button>
              <span className="rt-sep" />
              <button
                type="button"
                onClick={() => {
                  const url = prompt("Link URL");
                  if (url) fmtCmd("createLink", url);
                }}
                title="Insert link"
              >
                🔗
              </button>
              <button type="button" onClick={() => fmtCmd("unlink")} title="Remove link">
                ⊘
              </button>
              <span className="rt-sep" />
              <button type="button" onClick={() => fmtCmd("undo")} title="Undo">
                ↶
              </button>
              <button type="button" onClick={() => fmtCmd("redo")} title="Redo">
                ↷
              </button>
              <button
                type="button"
                onClick={() => fmtCmd("removeFormat")}
                title="Clear formatting"
              >
                Tx
              </button>
            </div>
            <div
              ref={noteRef}
              className="rt-editor"
              contentEditable
              suppressContentEditableWarning
            />
          </Field>
        </div>
      </form>

      {loading && <div className="hotel-info-loading">Loading...</div>}
    </div>
  );
};

const Field = ({ label, children }) => (
  <div className="hotel-info-field">
    {label && <label className="hotel-info-label">{label}</label>}
    {children}
  </div>
);

export default Profile;
