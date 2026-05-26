import React from "react";
import { createPortal } from "react-dom";

// Safely extract YYYY-MM-DD without timezone shift
const toDate = (val) => {
    if (!val) return null;
    if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) return new Date(val + "T12:00:00");
    const d = new Date(val);
    return isNaN(d) ? null : d;
};

const BillViewModal = ({ invoice, onClose, onEdit }) => {
    if (!invoice) return null;

    // Recalculate all values from stored data (room_charge is not stored in DB)
    const checkIn = toDate(invoice.check_in || invoice.checkIn);
    const checkOut = toDate(invoice.check_out || invoice.checkOut);
    const days = (checkIn && checkOut && checkOut > checkIn)
        ? Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24))
        : 0;

    const pricePerDay = parseFloat(invoice.price_per_day || invoice.pricePerDay || 0);
    const roomCharge = days * pricePerDay;
    const foodCharge = parseFloat(invoice.food_charge || invoice.foodCharge || 0);
    const extraCharge = parseFloat(invoice.extra_charge || invoice.extraCharge || 0);
    const subtotal = roomCharge + foodCharge + extraCharge;
    const gstPct = parseFloat(invoice.gst || 0);
    const gstAmount = subtotal * gstPct / 100;
    const discount = parseFloat(invoice.discount || 0);
    const finalTotal = subtotal + gstAmount - discount;

    const fmt = (v) => parseFloat(v || 0).toFixed(2);

    const handlePrint = () => window.print();

    return createPortal(
        <div style={styles.backdrop} onClick={onClose}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div style={styles.header}>
                    <div>
                        <div style={styles.title}>🏨 Hotel Invoice</div>
                        <div style={styles.invNo}>
                            {invoice.invoice_no || invoice.invoiceNo || "—"}
                        </div>
                    </div>
                    <div style={styles.headerActions}>
                        <button type="button" style={styles.headerBtn} onClick={onEdit} title="Edit Invoice">
                            ✏️ Edit
                        </button>
                        <button type="button" style={styles.headerBtn} onClick={handlePrint}>
                            🖨️ Print
                        </button>
                        <button type="button" style={styles.headerCloseBtn} onClick={onClose}>
                            ✕
                        </button>
                    </div>
                </div>

                <div style={styles.body}>
                    <div style={styles.infoGrid}>
                        <InfoItem label="Guest Name" value={invoice.customer_name || invoice.customerName} />
                        <InfoItem label="Phone" value={invoice.phone || "—"} />
                        <InfoItem label="Room No" value={invoice.room_no || invoice.roomNo} />
                        <InfoItem label="Date" value={invoice.date} />
                        <InfoItem label="Check-In" value={invoice.check_in || invoice.checkIn} />
                        <InfoItem label="Check-Out" value={invoice.check_out || invoice.checkOut} />
                        <InfoItem label="Payment Mode" value={invoice.payment_mode || invoice.paymentMode} />
                        <InfoItem label="Status" value={invoice.status} highlight />
                    </div>

                    <div style={styles.chargesCard}>
                        <div style={styles.sectionLabel}>Charges Breakdown</div>
                        <div style={styles.chargesList}>
                            <Row
                                label={`Room Charge (${days} day${days !== 1 ? "s" : ""} × ₹${fmt(pricePerDay)})`}
                                value={`₹${fmt(roomCharge)}`}
                            />
                            {foodCharge > 0 && <Row label="Food Charge" value={`₹${fmt(foodCharge)}`} />}
                            {extraCharge > 0 && <Row label="Extra Charge" value={`₹${fmt(extraCharge)}`} />}
                            <div style={styles.dashedDivider}>
                                <Row label="Subtotal" value={`₹${fmt(subtotal)}`} />
                                <Row label={`GST (${gstPct}%)`} value={`₹${fmt(gstAmount)}`} />
                                {discount > 0 && (
                                    <Row label="Discount" value={`− ₹${fmt(discount)}`} valueColor="#2c7a3d" />
                                )}
                            </div>
                            <div style={styles.totalRow}>
                                <span style={styles.totalLabel}>Final Total</span>
                                <span style={styles.totalValue}>₹{fmt(finalTotal)}</span>
                            </div>
                        </div>
                    </div>

                    {invoice.notes && (
                        <div>
                            <div style={styles.sectionLabel}>Notes</div>
                            <div style={styles.notesBox}>{invoice.notes}</div>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
};

const InfoItem = ({ label, value, highlight }) => (
    <div>
        <div style={styles.infoLabel}>{label}</div>
        <div
            style={{
                ...styles.infoValue,
                color: highlight ? "#2c7a3d" : "#1f2937",
            }}
        >
            {value || "—"}
        </div>
    </div>
);

const Row = ({ label, value, valueColor }) => (
    <div style={styles.row}>
        <span style={{ color: "#5b6b7c" }}>{label}</span>
        <span style={{ fontWeight: 500, color: valueColor || "#1f2937" }}>{value}</span>
    </div>
);

const styles = {
    backdrop: {
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        padding: 16,
    },
    modal: {
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.25)",
        width: "100%",
        maxWidth: 640,
        maxHeight: "90vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    header: {
        background: "linear-gradient(90deg, #4f46e5 0%, #7c3aed 100%)",
        color: "#fff",
        padding: "18px 22px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
    },
    title: { fontSize: 20, fontWeight: 700, lineHeight: 1.2 },
    invNo: { fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 4 },
    headerActions: { display: "flex", gap: 6, flexWrap: "wrap" },
    headerBtn: {
        background: "rgba(255,255,255,0.18)",
        border: "1px solid rgba(255,255,255,0.25)",
        color: "#fff",
        padding: "6px 12px",
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 500,
        cursor: "pointer",
        whiteSpace: "nowrap",
    },
    headerCloseBtn: {
        background: "rgba(255,255,255,0.18)",
        border: "1px solid rgba(255,255,255,0.25)",
        color: "#fff",
        width: 32,
        height: 32,
        borderRadius: 6,
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
        lineHeight: 1,
    },
    body: {
        padding: "20px 22px",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 18,
    },
    infoGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: "12px 18px",
    },
    infoLabel: {
        fontSize: 10,
        color: "#94a3b8",
        textTransform: "uppercase",
        fontWeight: 600,
        letterSpacing: "0.04em",
    },
    infoValue: { fontSize: 13, fontWeight: 600, marginTop: 2 },
    chargesCard: {
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        padding: "16px 18px",
    },
    sectionLabel: {
        fontSize: 11,
        color: "#64748b",
        textTransform: "uppercase",
        fontWeight: 600,
        letterSpacing: "0.06em",
        marginBottom: 10,
    },
    chargesList: { display: "flex", flexDirection: "column", gap: 4, fontSize: 13 },
    row: {
        display: "flex",
        justifyContent: "space-between",
        padding: "2px 0",
    },
    dashedDivider: {
        borderTop: "1px dashed #cbd5e1",
        paddingTop: 8,
        marginTop: 4,
        display: "flex",
        flexDirection: "column",
        gap: 4,
    },
    totalRow: {
        borderTop: "1px solid #e2e8f0",
        paddingTop: 10,
        marginTop: 8,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
    },
    totalLabel: { fontWeight: 700, color: "#1f2937", fontSize: 15 },
    totalValue: { fontSize: 20, fontWeight: 700, color: "#4338ca" },
    notesBox: {
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        padding: 12,
        color: "#475569",
        fontSize: 13,
        whiteSpace: "pre-wrap",
    },
};

export default BillViewModal;
