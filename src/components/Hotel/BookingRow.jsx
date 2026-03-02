import { useState } from "react";
import InvoiceForm from '../Accounts/forms/InvoiceForm';

const BookingRow = ({ booking, onExtend, onShiftRoom, onCheckOut }) => {
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
const [isBillGenerated, setIsBillGenerated] = useState(false);
  const handleViewInvoice = () => {
    const data = {
      customerName: booking.guestName,
      phone: booking.phone || "",
      roomNo: booking.room || "",
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      pricePerDay: booking.pricePerDay || "",
      foodCharge: booking.foodCharge || "0",
      extraCharge: booking.extraCharge || "0",
      gst: booking.gst || "18",
      discount: booking.discount || "0",
      paymentMode: booking.paymentMode || "UPI",
      status: booking.status || "Paid",
      notes: booking.notes || ""
    };

    setInvoiceData(data);
    setShowInvoice(true);
    setIsBillGenerated(true); 
  };

  const handleCloseInvoice = () => {
    setShowInvoice(false);
    setInvoiceData(null);
  };

  return (
    <>
      <tr className="bg-white hover:bg-indigo-50 transition duration-200 shadow-sm rounded-xl">
        <td className="px-4 py-4 font-semibold text-gray-800">{booking.guestName}</td>
        <td className="px-4 py-4">
          <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
            Room {booking.room}
          </span>
        </td>
        <td className="px-4 py-4 text-gray-600">{booking.checkIn}</td>
        <td className="px-4 py-4 text-gray-600">{booking.checkOut}</td>
        <td className="px-4 py-4">
          <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-sm font-semibold shadow-sm">
            {booking.status}
          </span>
        </td>
        <td className="px-4 py-4">
         <div className="flex gap-2 flex-wrap">
  {!isBillGenerated ? (
    <button
      className="px-3 py-1 text-sm rounded-full 
                 bg-gradient-to-r from-purple-500 to-indigo-600 
                 text-white shadow-md hover:scale-105 
                 transition transform duration-200"
      onClick={handleViewInvoice}
    >
      Generate Bill
    </button>
  ) : (
    <button
      className="px-3 py-1 text-sm rounded-full 
                 bg-gradient-to-r from-green-500 to-teal-500 
                 text-white shadow-md hover:scale-105 
                 transition transform duration-200"
      onClick={handleViewInvoice}
    >
      View Bill
    </button>
  )}

  <button
    className="px-3 py-1 text-sm rounded-full 
               bg-gradient-to-r from-blue-500 to-indigo-500 
               text-white shadow-md hover:scale-105 
               transition transform duration-200"
    onClick={() => onExtend(booking)}
  >
    Extend
  </button>

  <button
    className="px-3 py-1 text-sm rounded-full 
               bg-gradient-to-r from-yellow-400 to-orange-500 
               text-white shadow-md hover:scale-105 
               transition transform duration-200"
    onClick={() => onShiftRoom(booking)}
  >
    Shift
  </button>

  <button
    className="px-3 py-1 text-sm rounded-full 
               bg-gradient-to-r from-red-500 to-pink-500 
               text-white shadow-md hover:scale-105 
               transition transform duration-200"
    onClick={() => onCheckOut(booking)}
  >
    Check-Out
  </button>
</div>
        </td>
      </tr>

      {/* Modal for InvoiceForm */}
      {showInvoice && invoiceData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-3xl">
            <InvoiceForm
              initialData={invoiceData}
              onCancel={handleCloseInvoice}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default BookingRow;