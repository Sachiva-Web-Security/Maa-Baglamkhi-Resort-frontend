import React from "react";
import { createPortal } from "react-dom";
import "./RestaurantBillModal.css";

const money = (value) => Number(value || 0).toFixed(2);
const billDate = (value) => new Date(value || Date.now()).toLocaleString("en-GB", {
  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
});

const RestaurantBillModal = ({ bill, onClose }) => {
  if (!bill) return null;

  const items = Array.isArray(bill.items) ? bill.items : [];
  const foodTotal = Number(bill.subtotal || bill.subTotal || items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.price || item.rate || 0), 0));
  const serviceCharge = Number(bill.serviceCharge ?? foodTotal * 0.05);
  const taxable = foodTotal + serviceCharge;
  const sgst = Number(bill.sgst ?? taxable * 0.025);
  const cgst = Number(bill.cgst ?? taxable * 0.025);
  const grossTotal = Number(bill.grandTotal || taxable + sgst + cgst);
  const netTotal = Math.round(grossTotal);
  const billNo = bill.billNo || bill.invoiceNo || bill.id || bill.invoice_no || "";
  const table = bill.tableNumber || bill.table || bill.table_no || "";

  return createPortal(
    <div className="rbm-backdrop" onClick={onClose}>
      <div className="rbm-modal" onClick={(event) => event.stopPropagation()}>
        <div className="rbm-header"><span>Invoice</span><button onClick={onClose}>×</button></div>
        <div className="rbm-body" id="rbm-print-area">
          <section className="rbm-resort-head">
            <strong>MAA BAGLAMUKHI RESORT</strong>
            <span>Maa Baglamukhi Mandir Road, Nalkheda, District Agar Malwa</span>
            <span>465445</span>
            <span>Landline:  Mob.: 9522827277</span>
            <span>Website: www.maabaglamukhiresort.com &nbsp; Email Id:</span>
            <span>maabaglamukhiresort@gmail.com</span>
            <span>GSTIN: 23AVDPR0298J1ZG</span>
          </section>

          <div className="rbm-duplicate">DUPLICATE INVOICE</div>
          <div className="rbm-meta">
            <span>Invoice # &nbsp; {billNo}</span><span>Date &nbsp; {billDate(bill.created_at || bill.date)}</span>
            <span>Table No. &nbsp; {table}</span><span>PAX &nbsp; {bill.guests || bill.pax || 1}</span>
          </div>

          <table className="rbm-items-table">
            <thead><tr><th>Item Name</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
            <tbody>{items.map((item, index) => <tr key={`${item.id || item.name}-${index}`}><td>{item.name}</td><td>{Number(item.quantity || 0).toFixed(3)}</td><td>{money(item.price || item.rate)}</td><td>{money(item.amount || Number(item.quantity || 0) * Number(item.price || item.rate || 0))}</td></tr>)}</tbody>
          </table>

          <div className="rbm-item-count">Total Items: {items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)}</div>
          <div className="rbm-dots" />
          <div className="rbm-totals">
            <div><span>Total</span><strong>{money(foodTotal)}</strong></div>
            <div><span>Ser.Charges on Food @5.00%</span><span>{money(serviceCharge)}</span></div>
            <div><span>Sub Total</span><span>{money(taxable)}</span></div>
            <div><span>SGST ON FOOD @ 2.50%</span><span>{money(sgst)}</span></div>
            <div><span>CGST ON FOOD @ 2.50%</span><span>{money(cgst)}</span></div>
            <div><span>Grand Total</span><span>{money(grossTotal)}</span></div>
          </div>
          <div className="rbm-net"><span>Net Total</span><strong>{money(netTotal)}</strong></div>
          <div className="rbm-thanks">Thanks Pl Visit Again!!</div>
          <div className="rbm-rule" />
          <div className="rbm-powered">Powered By UrbanPOS</div>
          <div className="rbm-rule" />
        </div>
      </div>
    </div>,
    document.body
  );
};

export default RestaurantBillModal;
