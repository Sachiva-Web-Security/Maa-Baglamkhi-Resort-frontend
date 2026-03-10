const BanquetBill = ({ booking, halls, menuPackages, formatINR }) => {
  const hall = halls.find((h) => h.id === booking.hallId);
  const menuPackage = menuPackages.find((p) => p.id === booking.menuPackageId);

  const calculateTotals = () => {
    const startTime = booking.startTime || "18:00";
    const endTime = booking.endTime || "22:00";

    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);

    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;

    const diff = endMin - startMin;
    const hours = Math.max(1, Math.ceil(diff / 60));

    const hallCharge = hall ? hall.ratePerHour * hours : 0;
    const foodCharge = (booking.guests || 0) * (menuPackage?.perGuest || 0);
    const decoration = booking.decorationFee || 0;

    const subTotal = hallCharge + foodCharge + decoration;
    const gst = Math.round(subTotal * 0.05);

    const grandTotal = subTotal + gst;
    const advance = booking.advance || 0;
    const balance = grandTotal - advance;

    return {
      hallCharge,
      foodCharge,
      decoration,
      subTotal,
      gst,
      grandTotal,
      advance,
      balance,
      hours
    };
  };

  const totals = calculateTotals();

  return (
    <div className="p-6 bg-white rounded-lg">

      <div className="flex justify-between mb-6">
        <div>
          <div className="text-2xl font-bold">Banquet Invoice</div>
          <div className="text-sm text-gray-500">
            Invoice No: {booking.invoiceNo || "Pending"}
          </div>
        </div>

        <div className="text-sm text-gray-500">
          Date: {new Date().toLocaleDateString()}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">

        <div>
          <div className="font-bold mb-2">Customer</div>
          <div>{booking.customerName}</div>
          <div>{booking.phone}</div>
          <div>{booking.eventType}</div>
        </div>

        <div>
          <div className="font-bold mb-2">Event</div>
          <div>{booking.hallName}</div>
          <div>{booking.date}</div>
          <div>
            {booking.startTime} - {booking.endTime}
          </div>
        </div>

      </div>

      <table className="w-full border">

        <thead className="bg-gray-100">
          <tr>
            <th className="text-left p-2">Description</th>
            <th className="text-right p-2">Amount</th>
          </tr>
        </thead>

        <tbody>

          <tr>
            <td className="p-2">Hall Charges ({totals.hours} hrs)</td>
            <td className="text-right p-2">
              {formatINR(totals.hallCharge)}
            </td>
          </tr>

          <tr>
            <td className="p-2">Food Charges</td>
            <td className="text-right p-2">
              {formatINR(totals.foodCharge)}
            </td>
          </tr>

          <tr>
            <td className="p-2">Decoration</td>
            <td className="text-right p-2">
              {formatINR(totals.decoration)}
            </td>
          </tr>

          <tr>
            <td className="p-2">Subtotal</td>
            <td className="text-right p-2">
              {formatINR(totals.subTotal)}
            </td>
          </tr>

          <tr>
            <td className="p-2">GST (5%)</td>
            <td className="text-right p-2">
              {formatINR(totals.gst)}
            </td>
          </tr>

          <tr>
            <td className="p-2 font-bold">Grand Total</td>
            <td className="text-right p-2 font-bold">
              {formatINR(totals.grandTotal)}
            </td>
          </tr>

          <tr>
            <td className="p-2">Advance Paid</td>
            <td className="text-right p-2 text-green-600">
              {formatINR(totals.advance)}
            </td>
          </tr>

          <tr className="bg-gray-100">
            <td className="p-2 font-bold">Balance</td>
            <td className="text-right p-2 font-bold text-red-600">
              {formatINR(totals.balance)}
            </td>
          </tr>

        </tbody>

      </table>

    </div>
  );
};

export default BanquetBill;