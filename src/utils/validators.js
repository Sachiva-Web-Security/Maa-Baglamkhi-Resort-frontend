// utils/validators.js
// Tiny synchronous form validators. Each returns null on success
// or a string error message. Use as: `const e = required(name); if (e) ...`
//
// Pair with HTML5 input attributes for keyboard UX, and the
// `aria-invalid`/`aria-describedby` pattern for screen readers.

export const required = (label) => (v) => {
  if (v === undefined || v === null) return `${label} is required`;
  if (typeof v === "string" && v.trim() === "") return `${label} is required`;
  return null;
};

export const minLength = (label, n) => (v) => {
  if (v == null) return null;
  if (String(v).length < n) return `${label} must be at least ${n} characters`;
  return null;
};

export const maxLength = (label, n) => (v) => {
  if (v == null) return null;
  if (String(v).length > n)
    return `${label} must be no more than ${n} characters`;
  return null;
};

export const isEmail = (label = "Email") => (v) => {
  if (v == null || v === "") return null;
  // Pragmatic, not RFC 5322 — matches what users actually type.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim()))
    return `${label} is not a valid email`;
  return null;
};

export const isPhone = (label = "Phone") => (v) => {
  if (v == null || v === "") return null;
  const digits = String(v).replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15)
    return `${label} is not a valid phone number`;
  return null;
};

export const isPositiveNumber = (label) => (v) => {
  if (v === "" || v == null) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return `${label} must be a positive number`;
  return null;
};

export const isInteger = (label) => (v) => {
  if (v === "" || v == null) return null;
  if (!/^-?\d+$/.test(String(v).trim()))
    return `${label} must be a whole number`;
  return null;
};

export const isDate = (label = "Date") => (v) => {
  if (v == null || v === "") return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return `${label} is not a valid date`;
  return null;
};

/**
 * Compose validators left-to-right. Returns the first error message
 * or null when all pass.
 *   const err = compose(required("Name"), minLength("Name", 2))(value);
 */
export const compose =
  (...validators) =>
  (v) => {
    for (const fn of validators) {
      if (!fn) continue;
      const e = fn(v);
      if (e) return e;
    }
    return null;
  };

/**
 * Validate an object's fields with a `{ fieldName: validatorFn }` map.
 * Returns `{ fieldName: errorMessage }` for any field that fails;
 * an empty object means the form is valid.
 */
export const validateAll = (values, schema) => {
  const out = {};
  for (const [k, fn] of Object.entries(schema || {})) {
    const e = fn ? fn(values?.[k]) : null;
    if (e) out[k] = e;
  }
  return out;
};
