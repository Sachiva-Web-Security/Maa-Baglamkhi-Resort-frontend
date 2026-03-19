import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Form, Select } from "antd";
import axios from "axios";
import { GetCity, GetState, GetCountries } from "react-country-state-city";

const OtherBooking = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const bookingId = location.state?.bookingId;

  // ✅ FORM STATE
  const [formData, setFormData] = useState({
    bookingType: "",
    bookingSource: "",
    bookingReference: "",
    address: "",
    country: "",
    state: "",
    city: "",
    pincode: "",
  });

  // ✅ COUNTRY STATE CITY
  const [countries, setCountries] = useState([]);
  const [state, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  // Load Countries
  const loadCountries = async () => {
    const countriesData = await GetCountries();
    const options = countriesData.map((country) => ({
      label: country.name,
      value: country.id,
    }));
    setCountries(options);
  };

  const onCountrySelect = async (countryId, option) => {
    const statesData = await GetState(countryId);

    setFormData({ ...formData, country: option.label });

    const options = statesData.map((state) => ({
      label: state.name,
      value: state.id,
      countryId: countryId,
    }));

    setStates(options);
    setCities([]);
  };

  const onStateSelect = async (stateId, option) => {
    const citiesData = await GetCity(option.countryId, stateId);

    setFormData({ ...formData, state: option.label });

    const options = citiesData.map((city) => ({
      label: city.name,
      value: city.name,
    }));

    setCities(options);
  };

  useEffect(() => {
    loadCountries();
  }, []);

  // ✅ FINAL SUBMIT (API CALL)
  const handleSubmit = async () => {
    try {
      await axios.post(
        `http://localhost:5002/api/hotel/other-booking/${bookingId}`,
        formData
      );

      alert("Other Booking Saved ✅");

      navigate("/hotel/reference", {
        state: { bookingId },
      });

    } catch (err) {
      console.error(err);
      alert("Error saving other booking ❌");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-center p-6">
      <div className="w-full max-w-3xl bg-white shadow-lg rounded-xl p-6">

        <h2 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-4">
          Other Booking Details »
        </h2>

        <div className="grid grid-cols-2 gap-4">

          {/* Booking Type */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Booking Type *
            </label>
            <select
              value={formData.bookingType}
              onChange={(e) =>
                setFormData({ ...formData, bookingType: e.target.value })
              }
              className="w-full border rounded-md p-2"
            >
              <option value="">Select</option>
              <option value="FIT">FIT</option>
              <option value="Group">Group</option>
              <option value="Corporate">Corporate</option>
            </select>
          </div>

          {/* Booking Source */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Booking Source *
            </label>
            <select
              value={formData.bookingSource}
              onChange={(e) =>
                setFormData({ ...formData, bookingSource: e.target.value })
              }
              className="w-full border rounded-md p-2"
            >
              <option value="">Select</option>
              <option value="Front Office">Front Office</option>
              <option value="Walk in">Walk in</option>
              <option value="Agent">Agent</option>
              <option value="office">office</option>
              <option value="Go ibibo">Go ibibo</option>
              <option value="Makemytrip">Makemytrip</option>
            </select>
          </div>

          {/* Booking Reference */}
          <div className="col-span-2">
            <label className="block text-sm text-gray-600 mb-1">
              Booking Reference
            </label>
            <input
              type="text"
              value={formData.bookingReference}
              onChange={(e) =>
                setFormData({ ...formData, bookingReference: e.target.value })
              }
              className="w-full border rounded-md p-2"
            />
          </div>
        </div>

        <h2 className="text-lg font-semibold text-gray-700 border-b pb-2 mt-6 mb-4">
          Address Details »
        </h2>

        <div className="grid grid-cols-2 gap-4">

          {/* Address */}
          <div className="col-span-2">
            <label className="block text-sm text-gray-600 mb-1">
              Address
            </label>
            <textarea
              rows="3"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              className="w-full border rounded-md p-2"
            />
          </div>

          {/* Country */}
          <div>
            <label>Country</label>
            <Select
              options={countries}
              onChange={onCountrySelect}
              placeholder="Select country"
            />
          </div>

          {/* State */}
          <div>
            <label>State</label>
            <Select
              options={state}
              onChange={onStateSelect}
              placeholder="Select state"
            />
          </div>

          {/* City */}
          <div>
            <label>City</label>
            <Select
              options={cities}
              onChange={(value) =>
                setFormData({ ...formData, city: value })
              }
              placeholder="Select city"
            />
          </div>

          {/* Pincode */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              PIN Code
            </label>
            <input
              type="text"
              value={formData.pincode}
              onChange={(e) =>
                setFormData({ ...formData, pincode: e.target.value })
              }
              className="w-full border rounded-md p-2"
            />
          </div>

        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => navigate("/hotel/guest")}
            className="bg-gray-300 text-gray-700 px-5 py-2 rounded-lg"
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

export default OtherBooking;