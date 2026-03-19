import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

const Reference = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const bookingId = location.state?.bookingId;

  // ✅ FORM STATE
  const [formData, setFormData] = useState({
    guestType: "",
    guestNotes: "",
    internalNotes: "",
  });

  // ✅ SUBMIT API
  const handleSubmit = async () => {
    try {
      await axios.post(
        `http://localhost:5002/api/hotel/reference/${bookingId}`,
        formData
      );

      alert("Reference Saved ✅");

      navigate("/hotel/company", {
        state: { bookingId },
      });

    } catch (err) {
      console.error(err);
      alert("Error saving reference ❌");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-center p-6">

      <div className="w-full max-w-3xl bg-white shadow-lg rounded-xl p-6">

        <h2 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-4">
          Reference Notes »
        </h2>

        <div className="grid grid-cols-2 gap-4">

          {/* Guest Type */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Guest Type *
            </label>

            <select
              value={formData.guestType}
              onChange={(e) =>
                setFormData({ ...formData, guestType: e.target.value })
              }
              className="w-full border rounded-md p-2"
            >
              <option value="">Select</option>
              <option value="General">General</option>
              <option value="VIP Guest">VIP Guest</option>
              <option value="VVIP Guest">VVIP Guest</option>
              <option value="Scanty Baggage">Scanty Baggage</option>
            </select>
          </div>

          {/* Guest Notes */}
          <div className="col-span-2">
            <label className="block text-sm text-gray-600 mb-1">
              Guest Notes
            </label>

            <textarea
              rows="3"
              value={formData.guestNotes}
              onChange={(e) =>
                setFormData({ ...formData, guestNotes: e.target.value })
              }
              className="w-full border rounded-md p-2"
            ></textarea>
          </div>

          {/* Internal Notes */}
          <div className="col-span-2">
            <label className="block text-sm text-red-500 mb-1">
              Internal Notes
            </label>

            <textarea
              rows="3"
              value={formData.internalNotes}
              onChange={(e) =>
                setFormData({ ...formData, internalNotes: e.target.value })
              }
              className="w-full border rounded-md p-2"
            ></textarea>
          </div>

        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-6">

          <button
            onClick={() => navigate("/hotel/other-booking")}
            className="bg-gray-300 px-5 py-2 rounded-lg"
          >
            ← Go Back
          </button>

          <button
            onClick={handleSubmit}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg"
          >
            Save & Next →
          </button>

        </div>

      </div>
    </div>
  );
};

export default Reference;