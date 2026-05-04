import { useState } from 'react';

const PaymentSection = ({ totalAmount, selectedTable, onGenerateBill, onTransferToRoom, onSplitBill }) => {
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  return (
    <div className="simple-card">
      <div className="simple-card-title">Payment</div>
      <div className="simple-form-group" style={{ marginBottom: 10 }}>
        <label className="simple-label">Payment Method</label>
        <select className="simple-select" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
          <option value="Cash">Cash</option>
          <option value="Card">Card</option>
          <option value="UPI">UPI</option>
          <option value="Online">Online</option>
        </select>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button className="simple-btn simple-btn-success w-full" style={{ justifyContent: "center" }}
          onClick={() => { if (!totalAmount) return alert('Add items first'); onGenerateBill({ paymentMethod, totalAmount }); }}>
          Generate Bill
        </button>
        <button className="simple-btn simple-btn-primary w-full" style={{ justifyContent: "center" }}
          onClick={() => { if (!totalAmount) return alert('Add items first'); if (!selectedTable) return alert('Select a table'); onTransferToRoom({ paymentMethod, totalAmount, table: selectedTable }); }}>
          Transfer to Room
        </button>
        <button className="simple-btn simple-btn-warning w-full" style={{ justifyContent: "center" }}
          onClick={() => { if (!totalAmount) return alert('Add items first'); onSplitBill({ totalAmount }); }}>
          Split Bill
        </button>
      </div>
    </div>
  );
};

export default PaymentSection;
