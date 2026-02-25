import React, { useState } from "react";
import API from "../api";
import TableCard from '../components/Restaurant/TableCard';
import MenuItem from '../components/Restaurant/MenuItem';
import OrderSummary from '../components/Restaurant/OrderSummary';
import PaymentSection from '../components/Restaurant/PaymentSection';
import Modal from '../components/Hotel/Modal';
import './RestaurantPOS.css';

const RestaurantPOS = () => {
  const [selectedTable, setSelectedTable] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [showSplitBillModal, setShowSplitBillModal] = useState(false);
  const [splitBillData, setSplitBillData] = useState({ parts: 2 });

  const [tables] = useState([
    { id: 1, number: 1, status: 'Available', guestCount: null },
    { id: 2, number: 2, status: 'Occupied', guestCount: 4 },
    { id: 3, number: 3, status: 'Reserved', guestCount: null },
    { id: 4, number: 4, status: 'Available', guestCount: null },
    { id: 5, number: 5, status: 'Occupied', guestCount: 2 },
    { id: 6, number: 6, status: 'Available', guestCount: null },
    { id: 7, number: 7, status: 'Reserved', guestCount: null },
    { id: 8, number: 8, status: 'Available', guestCount: null },
  ]);

  const [menuItems] = useState([
    { id: 1, name: 'Paneer Butter Masala', price: 250, category: 'Main Course', description: 'Creamy paneer curry', available: true, image: 'https://images.unsplash.com/photo-1631452180519-c014fe4bc15c?w=400&h=300&fit=crop&q=80' },
    { id: 2, name: 'Veg Biryani', price: 180, category: 'Main Course', description: 'Fragrant basmati rice', available: true, image: 'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=400&h=300&fit=crop&q=80' },
    { id: 3, name: 'Cold Drink', price: 60, category: 'Beverages', description: 'Soft drink', available: true, image: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=400&h=300&fit=crop&q=80' },
    { id: 4, name: 'Dal Makhani', price: 200, category: 'Main Course', description: 'Creamy black lentils', available: true, image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop&q=80' },
    { id: 5, name: 'Naan', price: 40, category: 'Bread', description: 'Fresh baked bread', available: true, image: 'https://images.unsplash.com/photo-1601050690597-df0568f70946?w=400&h=300&fit=crop&q=80' },
    { id: 6, name: 'Butter Chicken', price: 280, category: 'Main Course', description: 'Creamy chicken curry', available: true, image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=300&fit=crop&q=80' },
    { id: 7, name: 'Chicken Biryani', price: 220, category: 'Main Course', description: 'Spiced rice with chicken', available: true, image: 'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=400&h=300&fit=crop&q=80' },
    { id: 8, name: 'Mango Lassi', price: 80, category: 'Beverages', description: 'Sweet mango yogurt drink', available: true, image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop&q=80' },
    { id: 9, name: 'Gulab Jamun', price: 90, category: 'Dessert', description: 'Sweet milk dumplings', available: true, image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&h=300&fit=crop&q=80' },
    { id: 10, name: 'Roti', price: 25, category: 'Bread', description: 'Whole wheat flatbread', available: true, image: 'https://images.unsplash.com/photo-1601050690597-df0568f70946?w=400&h=300&fit=crop&q=80' },
    { id: 11, name: 'Rice', price: 50, category: 'Main Course', description: 'Steamed basmati rice', available: true, image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=300&fit=crop&q=80' },
    { id: 12, name: 'Salad', price: 70, category: 'Starter', description: 'Fresh mixed salad', available: true, image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop&q=80' },
  ]);

  const handleTableClick = (table) => {
    setSelectedTable(table);
    // Clear order when switching tables
    if (selectedTable && selectedTable.id !== table.id) {
      if (orderItems.length > 0) {
        if (window.confirm('Switch table? Current order will be cleared.')) {
          setOrderItems([]);
          setSelectedTable(table);
        }
      } else {
        setSelectedTable(table);
      }
    } else {
      setSelectedTable(table);
    }
  };

  const handleAddToOrder = (item) => {
    if (!selectedTable) {
      alert('Please select a table first');
      return;
    }

    if (item.available === false) {
      alert(`${item.name} is currently unavailable`);
      return;
    }

    const existingItem = orderItems.find(orderItem => orderItem.id === item.id);
    
    if (existingItem) {
      setOrderItems(prev => prev.map(orderItem =>
        orderItem.id === item.id
          ? { ...orderItem, quantity: orderItem.quantity + 1 }
          : orderItem
      ));
    } else {
      setOrderItems(prev => [...prev, { ...item, quantity: 1 }]);
    }
  };

  const handleRemoveItem = (itemId) => {
    setOrderItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleUpdateQuantity = (itemId, quantity) => {
    setOrderItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, quantity } : item
    ));
  };

  const calculateTotal = () => {
    const subtotal = orderItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    const gst = subtotal * 0.05;
    return subtotal + gst;
  };

  const handleGenerateBill = async ({ paymentMethod, totalAmount }) => {
    if (!selectedTable) {
      alert('Please select a table');
      return;
    }

    const billData = {
      table: selectedTable.number,
      items: orderItems,
      subtotal: orderItems.reduce((total, item) => total + (item.price * item.quantity), 0),
      gst: totalAmount * 0.05 / 1.05,
      total: totalAmount,
      paymentMethod,
      timestamp: new Date().toLocaleString(),
    };

    try {
      await API.post("/restaurant/bill", billData);

      alert(`Bill Generated!\n\nTable: ${billData.table}\nTotal: ₹${billData.total.toFixed(2)}\nPayment: ${paymentMethod}\n\n${billData.timestamp}`);
      
      // Clear order
      setOrderItems([]);
    } catch (err) {
      console.error("Error saving restaurant bill", err);
      alert("Error saving bill to server");
    }
  };

  const handleTransferToRoom = ({ paymentMethod, totalAmount, table }) => {
    const roomNumber = prompt('Enter room number:');
    if (roomNumber) {
      alert(`Order transferred to Room ${roomNumber}\n\nTable: ${table.number}\nTotal: ₹${totalAmount.toFixed(2)}\nPayment: ${paymentMethod}`);
      setOrderItems([]);
    }
  };

  const handleSplitBill = ({ totalAmount }) => {
    setShowSplitBillModal(true);
    setSplitBillData({ parts: 2, totalAmount });
  };

  const handleSplitBillSubmit = () => {
    const amountPerPerson = (splitBillData.totalAmount / splitBillData.parts).toFixed(2);
    alert(`Bill Split into ${splitBillData.parts} parts\n\nAmount per person: ₹${amountPerPerson}`);
    setShowSplitBillModal(false);
    setOrderItems([]);
  };

  return (
    <div className="restaurant-pos-container">
      {/* Left Section - Tables */}
      <div className="tables-section ">
        <h2 className="section-title">Tables</h2>
        <div className="tables-grid ">
          {tables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              onClick={handleTableClick}
              isSelected={selectedTable?.id === table.id}
            />
          ))}
        </div>
      </div>

      {/* Center Section - Menu Items */}
      <div className="menu-section">
        <h2 className="section-title">Menu</h2>
        {selectedTable && (
          <div className="selected-table-info">
            Selected: Table {selectedTable.number} ({selectedTable.status})
          </div>
        )}
        <div className="menu-grid">
          {menuItems.map((item) => (
            <MenuItem
              key={item.id}
              item={item}
              onAddToOrder={handleAddToOrder}
            />
          ))}
        </div>
      </div>

      {/* Right Section - Billing */}
      <div className="billing-section">
        <OrderSummary
          orderItems={orderItems}
          onRemoveItem={handleRemoveItem}
          onUpdateQuantity={handleUpdateQuantity}
        />
        
        <PaymentSection
          totalAmount={calculateTotal()}
          selectedTable={selectedTable}
          onGenerateBill={handleGenerateBill}
          onTransferToRoom={handleTransferToRoom}
          onSplitBill={handleSplitBill}
        />
      </div>

      {/* Split Bill Modal */}
      <Modal
        isOpen={showSplitBillModal}
        onClose={() => setShowSplitBillModal(false)}
        title="Split Bill"
      >
        <div className="split-bill-form">
          <div className="form-group">
            <label>Number of Parts</label>
            <input
              type="number"
              min="2"
              max="10"
              value={splitBillData.parts}
              onChange={(e) => setSplitBillData({ ...splitBillData, parts: parseInt(e.target.value) || 2 })}
              className="form-input"
            />
          </div>
          <div className="split-bill-info">
            <p>Total Amount: ₹{splitBillData.totalAmount?.toFixed(2)}</p>
            <p>Amount per part: ₹{((splitBillData.totalAmount || 0) / splitBillData.parts).toFixed(2)}</p>
          </div>
          <div className="form-actions">
            <button className="btn-cancel" onClick={() => setShowSplitBillModal(false)}>
              Cancel
            </button>
            <button className="btn-submit" onClick={handleSplitBillSubmit}>
              Confirm Split
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RestaurantPOS;

