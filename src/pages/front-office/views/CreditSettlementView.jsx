const CreditSettlementView = ({ activeTab, onTabChange }) => (
  <div className="fo-credit-page">
    <div className="fo-credit-title">CREDIT BILL SETTLEMENT</div>
    <section className="fo-credit-panel">
      <div className="fo-credit-tabs">
        <button className={activeTab === "guest" ? "is-active" : ""} onClick={() => onTabChange("guest")}>Guest</button>
        <button className={activeTab === "vendor" ? "is-active" : ""} onClick={() => onTabChange("vendor")}>Vendor</button>
      </div>
      {activeTab === "guest" ? <>
        <div className="fo-credit-filters">
          <label>Mobile Number<input placeholder="Mobile No" /></label>
          <label>Guest Name<input placeholder="Guest name" /></label>
          <div className="fo-credit-filter-actions"><button className="fo-credit-search">⌕ Search</button><button className="fo-credit-reset">↶</button></div>
        </div>
        <div className="fo-credit-table-wrap"><table className="fo-credit-table">
          <thead><tr><th>Action</th><th>Guest Name</th><th>Mobile Number</th><th>Module</th><th>Total Credit</th><th>Total Paid</th><th>Total Received</th><th>Balance</th></tr></thead>
          <tbody><tr><td colSpan="8">No Receipts Found</td></tr></tbody>
        </table></div>
      </> : <div className="fo-vendor-credit">
        <label>Search</label>
        <div className="fo-vendor-search-row"><select defaultValue=""><option value="" disabled>Select Vendor</option></select><button className="fo-credit-search">⌕ Search</button><button className="fo-credit-reset">↶</button></div>
        <div className="fo-vendor-empty">No Receipts Found</div>
      </div>}
    </section>
    <button className="fo-edge-toggle" type="button" aria-label="Collapse side panel">‹</button>
  </div>
);

export default CreditSettlementView;
