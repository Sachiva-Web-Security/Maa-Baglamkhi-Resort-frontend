import { useState, useEffect } from "react";
import API from "../../../api";

const CreditSettlementView = ({ activeTab, onTabChange }) => {
  const [guestCredits, setGuestCredits] = useState([]);
  const [guestFilters, setGuestFilters] = useState({ mobile: "", name: "" });
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(null); // bookingId being paid
  const [paymentForm, setPaymentForm] = useState({ amount: "", paymentMode: "Cash", remarks: "" });

  // Load guest credit data
  const loadGuestCredits = async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/fo-payments/guest-credit", {
        params: { mobile: guestFilters.mobile || undefined, name: guestFilters.name || undefined },
      });
      setGuestCredits(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load guest credits:", err);
      setGuestCredits([]);
    } finally {
      setLoading(false);
    }
  };

  // Load vendor credit data
  const loadVendorCredits = async () => {
    try {
      const { data } = await API.get("/fo-payments/vendor-credit");
      setVendors(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load vendor credits:", err);
      setVendors([]);
    }
  };

  useEffect(() => {
    if (activeTab === "guest") loadGuestCredits();
    else loadVendorCredits();
  }, [activeTab]);

  const handleSearch = () => loadGuestCredits();

  const handleClear = () => {
    setGuestFilters({ mobile: "", name: "" });
    API.get("/fo-payments/guest-credit")
      .then((r) => setGuestCredits(Array.isArray(r.data) ? r.data : []))
      .catch(() => setGuestCredits([]));
  };

  const startPayment = (bookingId) => setPaying(bookingId);

  const cancelPayment = () => {
    setPaying(null);
    setPaymentForm({ amount: "", paymentMode: "Cash", remarks: "" });
  };

  const submitPayment = async (bookingId) => {
    const amount = Number(paymentForm.amount);
    if (!amount || amount <= 0) return alert("Please enter a valid amount");

    try {
      await API.post(`/fo-payments/guest-credit/${bookingId}/pay`, {
        amount,
        paymentMode: paymentForm.paymentMode,
        remarks: paymentForm.remarks,
      });
      alert("Payment recorded");
      cancelPayment();
      await loadGuestCredits();
    } catch (err) {
      alert(err.response?.data?.message || "Payment failed");
    }
  };

  const formatMoney = (v) => Number(v || 0).toFixed(2);

  return (
    <div className="fo-credit-page">
      <div className="fo-credit-title">CREDIT BILL SETTLEMENT</div>
      <section className="fo-credit-panel">
        <div className="fo-credit-tabs">
          <button className={activeTab === "guest" ? "is-active" : ""} onClick={() => onTabChange("guest")}>
            Guest
          </button>
          <button className={activeTab === "vendor" ? "is-active" : ""} onClick={() => onTabChange("vendor")}>
            Vendor
          </button>
        </div>

        {activeTab === "guest" ? (
          <>
            <div className="fo-credit-filters">
              <label>
                Mobile Number
                <input
                  value={guestFilters.mobile}
                  onChange={(e) => setGuestFilters((p) => ({ ...p, mobile: e.target.value }))}
                  placeholder="Mobile No"
                />
              </label>
              <label>
                Guest Name
                <input
                  value={guestFilters.name}
                  onChange={(e) => setGuestFilters((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Guest name"
                />
              </label>
              <div className="fo-credit-filter-actions">
                <button className="fo-credit-search" onClick={handleSearch}>
                  ⌕ Search
                </button>
                <button className="fo-credit-reset" onClick={handleClear}>
                  ↶
                </button>
              </div>
            </div>

            <div className="fo-credit-table-wrap">
              <table className="fo-credit-table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Guest Name</th>
                    <th>Mobile Number</th>
                    <th>Module</th>
                    <th>Total Credit</th>
                    <th>Total Paid</th>
                    <th>Total Received</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {guestCredits.length === 0 ? (
                    <tr>
                      <td colSpan="8">No Receipts Found</td>
                    </tr>
                  ) : (
                    guestCredits.map((row) => (
                      <tr key={row.bookingId}>
                        <td>
                          {paying === row.bookingId ? (
                            <>
                              <button onClick={() => submitPayment(row.bookingId)} className="fo-credit-pay">
                                ✓
                              </button>
                              <button onClick={cancelPayment} className="fo-credit-cancel">
                                ✗
                              </button>
                            </>
                          ) : (
                            <button onClick={() => startPayment(row.bookingId)} className="fo-credit-pay-btn">
                              Pay
                            </button>
                          )}
                        </td>
                        <td>{row.guest_name || "—"}</td>
                        <td>{row.mobile || "—"}</td>
                        <td>Front Office</td>
                        <td>{formatMoney(row.totalAmount)}</td>
                        <td>{formatMoney(row.totalPaid)}</td>
                        <td>{formatMoney(row.totalPaid - (row.refundAmount || 0))}</td>
                        <td>{formatMoney(row.balance)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Payment form overlay when paying */}
              {paying && (
                <div className="fo-credit-pay-overlay">
                  <div className="fo-credit-pay-box">
                    <h4>Record Payment</h4>
                    <label>
                      Amount
                      <input
                        type="number"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))}
                        placeholder="Amount"
                      />
                    </label>
                    <label>
                      Payment Mode
                      <select
                        value={paymentForm.paymentMode}
                        onChange={(e) => setPaymentForm((p) => ({ ...p, paymentMode: e.target.value }))}
                      >
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="Card">Card</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                      </select>
                    </label>
                    <label>
                      Remarks
                      <input
                        value={paymentForm.remarks}
                        onChange={(e) => setPaymentForm((p) => ({ ...p, remarks: e.target.value }))}
                        placeholder="Optional notes"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="fo-vendor-credit">
            <label>Search</label>
            <div className="fo-vendor-search-row">
              <select defaultValue="">
                <option value="" disabled>
                  Select Vendor
                </option>
                {vendors.map((v) => (
                  <option key={v.id || v.name} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
              <button className="fo-credit-search">⌕ Search</button>
              <button className="fo-credit-reset">↶</button>
            </div>
            <div className="fo-vendor-empty">No Receipts Found</div>
          </div>
        )}
      </section>
      <button className="fo-edge-toggle" type="button" aria-label="Collapse side panel">
        ‹
      </button>
    </div>
  );
};

export default CreditSettlementView;
