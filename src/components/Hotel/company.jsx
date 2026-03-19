import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

const Company = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const bookingId = location.state?.bookingId;

  // ✅ FORM DATA
  const [formData, setFormData] = useState({
    companyName: "",
    gst: "",
  });

  // UI state (same as before)
  const [companies, setCompanies] = useState([
    "Tata",
    "Infosys",
    "Reliance",
  ]);

  const [selectedCompany, setSelectedCompany] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [newCompany, setNewCompany] = useState("");

  // ✅ Add new company
  const handleAddCompany = () => {
    if (newCompany.trim() === "") return;

    setCompanies([...companies, newCompany]);
    setSelectedCompany(newCompany);

    // 👉 formData में भी डालो
    setFormData({ ...formData, companyName: newCompany });

    setNewCompany("");
    setShowInput(false);
  };

  // ✅ API CALL
  const handleSubmit = async () => {
    try {
      await axios.post(
        `http://localhost:5002/api/hotel/company/${bookingId}`,
        formData
      );

      alert("Company Saved ✅");

      navigate("/hotel/room", {
        state: { bookingId },
      });

    } catch (err) {
      console.error(err);
      alert("Error saving company ❌");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-center p-6">
      <div className="w-full max-w-3xl bg-white shadow-lg rounded-xl p-6">

        <h2 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-6">
          Company Details »
        </h2>

        <div className="grid grid-cols-2 gap-4">

          {/* Company Name */}
          <div className="col-span-2">
            <label className="block text-sm text-gray-600 mb-1">
              Company Name
            </label>

            <div className="flex gap-3 items-center">
              <select
                value={selectedCompany}
                onChange={(e) => {
                  setSelectedCompany(e.target.value);
                  setFormData({
                    ...formData,
                    companyName: e.target.value,
                  });
                }}
                className="flex-1 border rounded-md p-2"
              >
                <option value="">Select</option>
                {companies.map((comp, index) => (
                  <option key={index} value={comp}>
                    {comp}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setShowInput(true)}
                className="text-blue-500 text-sm hover:underline"
              >
                + Add New
              </button>
            </div>

            {/* Add New Company */}
            {showInput && (
              <div className="flex gap-2 mt-3">
                <input
                  type="text"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  placeholder="Enter company name"
                  className="border rounded-md p-2 flex-1"
                />

                <button
                  onClick={handleAddCompany}
                  className="bg-green-500 text-white px-3 rounded-md"
                >
                  Add
                </button>
              </div>
            )}
          </div>

          {/* GSTIN */}
          <div className="col-span-2">
            <label className="block text-sm text-gray-600 mb-1">
              GSTIN
            </label>

            <input
              type="text"
              value={formData.gst}
              onChange={(e) =>
                setFormData({ ...formData, gst: e.target.value })
              }
              className="w-full border rounded-md p-2"
              placeholder="Enter GSTIN"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-6">

          <button
            onClick={() => navigate("/hotel/reference")}
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

export default Company;