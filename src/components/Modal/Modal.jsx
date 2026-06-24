import { useEffect, useRef } from "react";
import "./Modal.css";

/**
 * Modal — accessible dialog with focus trap and Escape to close.
 *
 * Props:
 *   open        boolean          show/hide
 *   onClose     fn()             required (Escape + overlay + close button all call this)
 *   title       string           header text (also used as aria-label)
 *   children    node             body
 *   footer      node             optional footer
 *   maxWidth    number|string    max-width CSS (default 520)
 *   closeOnBackdrop boolean     default true
 */
const Modal = ({
  open,
  onClose,
  title,
  children,
  footer,
  maxWidth = 520,
  closeOnBackdrop = true,
}) => {
  const dialogRef = useRef(null);
  const lastFocusedRef = useRef(null);

  // Manage focus + Escape + body scroll lock while open.
  useEffect(() => {
    if (!open) return undefined;

    lastFocusedRef.current = document.activeElement;
    document.body.style.overflow = "hidden";

    // Move focus into the dialog after it renders.
    const t = setTimeout(() => {
      dialogRef.current?.focus();
    }, 0);

    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose?.();
      }
      // Simple focus trap
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      // Restore focus to whatever opened the dialog.
      if (lastFocusedRef.current?.focus) lastFocusedRef.current.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const onBackdropClick = (e) => {
    if (!closeOnBackdrop) return;
    if (e.target === e.currentTarget) onClose?.();
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={onBackdropClick}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title || "Dialog"}
        tabIndex={-1}
        style={{ maxWidth }}
      >
        {title && (
          <div className="modal-header">
            <h3 className="modal-title">{title}</h3>
            <button
              type="button"
              className="modal-close"
              aria-label="Close dialog"
              onClick={onClose}
            >
              ×
            </button>
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

export default Modal;