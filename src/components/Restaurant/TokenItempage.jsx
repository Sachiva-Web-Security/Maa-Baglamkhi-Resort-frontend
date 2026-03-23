import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import API from "../../api";

const TokenItemsPage = () => {
  const { table } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const entityType = location.state?.entityType || "Table";
  const roomData = location.state?.roomData || null;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadItems = async () => {
      try {
        setLoading(true);
        const tokenRes = await API.get(`/token/table/${table}`);
        const tokenId = tokenRes.data?.id;

        if (!tokenId) {
          setItems([]);
          return;
        }

        const itemsRes = await API.get(`/token/items/${tokenId}`);
        setItems(itemsRes.data || []);
      } catch (error) {
        console.log("Error loading token items:", error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadItems();
  }, [table]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white w-[600px] rounded shadow">
        <div className="p-3 border-b font-semibold">
          {entityType} - {table}
          {roomData ? ` | ${roomData.categoryName || "Room"} | ID ${roomData.roomId || "--"}` : ""}
        </div>

        <div className="p-4">
          <h4 className="font-semibold mb-3">All Token Items (Non-Invoiced)</h4>

          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Item Name</th>
                <th className="p-2 text-center">Quantity</th>
                <th className="p-2 text-right">Amount</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="3" className="text-center p-3 text-gray-400">
                    Loading items...
                  </td>
                </tr>
              ) : !items.length ? (
                <tr>
                  <td colSpan="3" className="text-center p-3 text-gray-400">
                    No items added
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="p-2">{item.item_name}</td>
                    <td className="p-2 text-center">{item.qty}</td>
                    <td className="p-2 text-right">
                      Rs. {Number(item.qty) * Number(item.rate)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="mt-4 text-right space-x-2">
            <button
              className="bg-red-500 text-white px-4 py-2 rounded"
              onClick={() => navigate("/restaurant")}
            >
              Close
            </button>

            <button
              className="bg-blue-600 text-white px-4 py-2 rounded"
              onClick={() =>
                navigate(`/restaurant/edit-token/${table}`, {
                  state: { entityType, roomData },
                })
              }
            >
              Edit Token
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenItemsPage;
