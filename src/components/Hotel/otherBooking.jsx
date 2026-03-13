import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Country, State, City } from "country-state-city";

const OtherBooking = () => {

  const navigate = useNavigate();

  const [countries] = useState(Country.getAllCountries());
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");

  // Country Change
  const handleCountryChange = (e) => {

    const countryCode = e.target.value;

    setSelectedCountry(countryCode);

    const statesList = State.getStatesOfCountry(countryCode);

    setStates(statesList);

    setCities([]);
  };

  // State Change
  const handleStateChange = (e) => {

    const stateCode = e.target.value;

    setSelectedState(stateCode);

    const cityList = City.getCitiesOfState(selectedCountry, stateCode);

    setCities(cityList);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-center p-6">

      <div className="w-full max-w-3xl bg-white shadow-lg rounded-xl p-6">

        {/* Title */}
        <h2 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-4">
          Other Booking Details »
        </h2>

        <div className="grid grid-cols-2 gap-4">

          {/* Booking Type */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Booking Type *
            </label>

            <select className="w-full border rounded-md p-2">
              <option>FIT</option>
              <option>Group</option>
              <option>Corporate</option>
            </select>
          </div>

          {/* Booking Source */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Booking Source *
            </label>

            <select className="w-full border rounded-md p-2">
              <option>Front Office</option>
              <option>Walk in </option>
              <option>Agent</option>
              <option >office</option>
              <option >Go ibibo</option>
              <option >Makemytrip</option>
            </select>
          </div>

          {/* Booking Reference */}
          <div className="col-span-2">
            <label className="block text-sm text-gray-600 mb-1">
              Booking Reference
            </label>

            <input
              type="text"
              className="w-full border rounded-md p-2"
            />
          </div>
        </div>

        {/* Address Section */}
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
              className="w-full border rounded-md p-2"
            />
          </div>

          {/* Country */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Country
            </label>

            <select
              value={selectedCountry}
              onChange={handleCountryChange}
              className="w-full border rounded-md p-2"
            >

              <option>Select Country</option>

              {countries.map((country) => (

                <option
                  key={country.isoCode}
                  value={country.isoCode}
                >
                  {country.name}

                </option>

              ))}

            </select>
          </div>

          {/* State */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              State
            </label>

            <select
              value={selectedState}
              onChange={handleStateChange}
              className="w-full border rounded-md p-2"
            >

              <option>Select State</option>

              {states.map((state) => (

                <option
                  key={state.isoCode}
                  value={state.isoCode}
                >
                  {state.name}

                </option>

              ))}

            </select>
          </div>

          {/* City */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              City
            </label>

            <select
              value={selectedCity}
              onChange={(e)=>setSelectedCity(e.target.value)}
              className="w-full border rounded-md p-2"
            >

              <option>Select City</option>

              {cities.map((city) => (

                <option
                  key={city.name}
                  value={city.name}
                >
                  {city.name}

                </option>

              ))}

            </select>
          </div>

          {/* Pincode */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              PIN Code
            </label>

            <input
              type="text"
              className="w-full border rounded-md p-2"
            />
          </div>

        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-6">

          <button
            onClick={() => navigate("/hotel/guest")}
            className="bg-gray-300 text-gray-700 px-5 py-2 rounded-lg"
          >
            ← Go Back
          </button>

          <button
            onClick={() => navigate("/hotel/reference")}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg"
          >
            Next →
          </button>

        </div>

      </div>

    </div>
  );
};

export default OtherBooking;