import React, { useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const Communication = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const printRef = useRef();

  const bookingId = location.state?.bookingId;
  const totalAmount = location.state?.totalAmount;
  const paidAmount = location.state?.paidAmount;
  const remainingAmount = location.state?.remainingAmount;
  const rooms = location.state?.rooms || [];

  if (!bookingId) return <div>No Data ❌</div>;

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const body = document.body.innerHTML;

    document.body.innerHTML = content;
    window.print();
    document.body.innerHTML = body;
    window.location.reload();
  };

  return (
    <div className="p-6">

      <h2>Booking ID: {bookingId}</h2>

      <p>Total: {totalAmount}</p>
      <p>Paid: {paidAmount}</p>
      <p>Remaining: {remainingAmount}</p>

      <button onClick={handlePrint}>Print</button>

      <div ref={printRef} className="hidden">
        <h1>Invoice</h1>
        <p>{bookingId}</p>
      </div>

      <button onClick={()=>navigate("/hotel/guest")}>
        New Booking
      </button>

    </div>
  );
};

export default Communication;