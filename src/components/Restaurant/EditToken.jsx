import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import API from "../../api";

const EditToken = () => {
  const { table } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const entityType =
    location.state?.entityType ||
    localStorage.getItem(`entityType:${table}`) ||
    "Table";

  const [tokenId, setTokenId] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTokenItems = async () => {
      try {
        setLoading(true);

        const tokenRes = await API.get(`/token/table/${table}`);
        const activeTokenId = tokenRes.data?.id || null;
        setTokenId(activeTokenId);

        if (!activeTokenId) {
          setItems([]);
          return;
        }

        const itemsRes = await API.get(`/token/items/${activeTokenId}`);
        setItems(itemsRes.data || []);
      } catch (error) {
        console.log("Error loading edit token:", error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadTokenItems();
  }, [table]);

  const handleChange = (id, field, value) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const deleteItem = async (id) => {
    try {
      await API.delete(`/token/item/${id}`);
      setItems((current) => current.filter((item) => item.id !== id));
    } catch (error) {
      alert(error.response?.data?.message || "Item delete nahi ho paaya.");
    }
  };

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + Number(item.qty || 0) * Number(item.rate || 0),
        0,
      ),
    [items],
  );

  const tax = subtotal * 0.05;
  const total = subtotal + tax;

  const handleUpdate = async () => {
    if (!items.length) {
      alert("No items to update");
      return;
    }

    try {
      await Promise.all(
        items.map((item) =>
          API.put("/token/item", {
            id: item.id,
            qty: Number(item.qty),
            rate: Number(item.rate),
          }),
        ),
      );

      alert("Token updated successfully");
    } catch (error) {
      alert(error.response?.data?.message || "Token update nahi ho paaya.");
    }
  };

  const handleInvoice = () => {
    const invoiceData = {
      table,
      tokenId,
      items: items.map((item) => ({
        id: item.id,
        name: item.item_name,
        qty: Number(item.qty),
        rate: Number(item.rate),
      })),
      subtotal,
      gst: tax,
      total,
      date: new Date().toISOString(),
      entityType,
    };

    localStorage.setItem("currentInvoice", JSON.stringify(invoiceData));
    navigate("/restaurant/payment", { state: invoiceData });
  };

  if (loading) {
    return <div className="bg-gray-100 min-h-screen p-6">Loading token...</div>;
  }

  return (
    <div className="bg-gray-100 min-h-screen p-6">
      <div className="text-sm text-gray-500 mb-3">Home &gt; Restaurant Tokens</div>

      <div className="bg-blue-700 text-white px-4 py-2 rounded-t">Edit Token</div>

      <div className="bg-white border p-5">
        <div className="bg-gray-100 p-4 rounded mb-4 grid grid-cols-3 text-sm">
          <div>
            <strong>Token Code:</strong> {tokenId || "Not Created"}
          </div>

          <div>
            <strong>Token Reference:</strong> Table / Table-{table}
          </div>

          <div>
            <strong>Waiter:</strong> {localStorage.getItem("name") || "Waiter"}
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => navigate(`/restaurant/menu/${table}`)}
            className="bg-red-500 text-white px-4 py-2 rounded text-sm"
          >
            Menu Card
          </button>
        </div>

        <div className="grid grid-cols-5 font-semibold text-sm border-b pb-2">
          <div>Item</div>
          <div>Quantity</div>
          <div>Rate</div>
          <div>Amount</div>
          <div></div>
        </div>

        {items.map((item) => (
          <div
            key={item.id}
            className="grid grid-cols-5 items-center py-2 border-b text-sm gap-2"
          >
            <input
              value={item.item_name}
              readOnly
              className="border p-1 rounded bg-gray-50"
            />

            <input
              type="number"
              value={item.qty}
              className="border p-1 w-20 rounded"
              onChange={(event) => handleChange(item.id, "qty", event.target.value)}
            />

            <input
              type="number"
              value={item.rate}
              className="border p-1 w-24 rounded"
              onChange={(event) => handleChange(item.id, "rate", event.target.value)}
            />

            <div>Rs. {Number(item.qty) * Number(item.rate)}</div>

            <button
              onClick={() => deleteItem(item.id)}
              className="bg-red-500 text-white px-2 py-1 rounded"
            >
              Delete
            </button>
          </div>
        ))}

        {!items.length && (
          <div className="py-6 text-sm text-gray-400">No token items found.</div>
        )}

        <div className="mt-6 border-t pt-4">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>Rs. {subtotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span>Tax (5%)</span>
            <span>Rs. {tax.toFixed(2)}</span>
          </div>

          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>Rs. {total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          onClick={handleUpdate}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Update
        </button>

        <button
          onClick={handleInvoice}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Create Invoice
        </button>

        <button
          onClick={() => navigate("/restaurant")}
          className="bg-gray-400 text-white px-4 py-2 rounded"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default EditToken;
