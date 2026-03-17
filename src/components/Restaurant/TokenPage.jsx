import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../../api";

const TokenPage = () => {
  const navigate = useNavigate();
  const { table } = useParams();

  const [items, setItems] = useState([]);
  const [tokenId, setTokenId] = useState(null);
  const [loading, setLoading] = useState(true);
  const waiterName = localStorage.getItem("name") || "Waiter";

  useEffect(() => {
    const loadToken = async () => {
      try {
        setLoading(true);

        const tokenRes = await API.get(`/token/table/${table}`);
        const activeToken = tokenRes.data?.id ? tokenRes.data : null;

        if (!activeToken) {
          setTokenId(null);
          setItems([]);
          return;
        }

        setTokenId(activeToken.id);

        const itemsRes = await API.get(`/token/items/${activeToken.id}`);
        setItems(itemsRes.data || []);
      } catch (error) {
        console.log("Error loading token:", error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadToken();
  }, [table]);

  const ensureTokenAndOpenMenu = async () => {
    try {
      let resolvedTokenId = tokenId;

      if (!resolvedTokenId) {
        const res = await API.post("/token/create", {
          tableNumber: String(table),
          waiter: waiterName,
        });
        resolvedTokenId = res.data?.tokenId;
        setTokenId(resolvedTokenId);
      }

      navigate(`/restaurant/menu/${table}`);
    } catch (error) {
      alert(error.response?.data?.message || "Token create nahi ho paaya.");
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen p-6">
      <div className="text-sm text-gray-500 mb-3">Home &gt; Restaurant Tokens</div>

      <div className="bg-blue-600 text-white px-4 py-2 rounded-t">Add Token</div>

      <div className="bg-white border p-6">
        <h3 className="text-sm font-semibold mb-4">Token Details</h3>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium">Token Type *</label>
            <select className="w-full border p-2 rounded mt-1" value="Table" readOnly>
              <option>Table</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Waiter *</label>
            <input value={waiterName} readOnly className="w-full border p-2 rounded mt-1" />
          </div>

          <div>
            <label className="text-sm font-medium">Reference *</label>
            <select className="w-full border p-2 rounded mt-1" value={table} readOnly>
              <option>{table}</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Table No / Room No / Phone No.</p>
          </div>

          <div>
            <label className="text-sm font-medium">POS *</label>
            <input value="Foods of Heaven" readOnly className="w-full border p-2 rounded mt-1" />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            className="bg-green-500 text-white px-4 py-2 rounded text-sm"
            onClick={ensureTokenAndOpenMenu}
          >
            Add Item +
          </button>

          <button
            className="bg-red-500 text-white px-4 py-2 rounded text-sm"
            onClick={ensureTokenAndOpenMenu}
          >
            Menu Card
          </button>
        </div>

        <div className="mt-6 border-t pt-4">
          <div className="grid grid-cols-5 text-sm font-semibold text-gray-600">
            <div>Item</div>
            <div>Quantity</div>
            <div>Rate</div>
            <div>Amount</div>
            <div>Notes</div>
          </div>

          {loading ? (
            <div className="text-gray-400 text-sm mt-3">Loading token items...</div>
          ) : !items.length ? (
            <div className="text-gray-400 text-sm mt-3">No items added yet</div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="grid grid-cols-5 text-sm mt-2">
                <div>{item.item_name}</div>
                <div>{item.qty}</div>
                <div>Rs. {item.rate}</div>
                <div>Rs. {Number(item.qty) * Number(item.rate)}</div>
                <div>-</div>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 flex gap-2">
          <button
            className="bg-green-600 text-white px-6 py-2 rounded"
            onClick={ensureTokenAndOpenMenu}
          >
            Submit
          </button>

          <button
            className="bg-gray-300 px-6 py-2 rounded"
            onClick={() => navigate("/restaurant")}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default TokenPage;
