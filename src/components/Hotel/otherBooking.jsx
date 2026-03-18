import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Select } from "antd";
import { GetCity, GetState, GetCountries } from "react-country-state-city";

const OtherBooking = () => {
  const navigate = useNavigate();

  const [countries, setCountries] = useState([]);
  const [state, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  const getData = (values) => {
    console.log(values);
  };

  // Load Countries
  const loadCountries = async () => {
    const countriesData = await GetCountries();
    const options = countriesData.map((country) => ({
      label: country.name,
      value: country.id,
    }));
    setCountries(options);
  };

  // Country Select
  const onCountrySelect = async (countryId) => {
    const statesData = await GetState(countryId);
    const options = statesData.map((state) => ({
      label: state.name,
      value: state.id,
      countryId: countryId,
    }));
    setStates(options);
    setCities([]);
  };

  // State Select
  const onStateSelect = async (stateId, option) => {
    const citiesData = await GetCity(option.countryId, stateId);
    const options = citiesData.map((city) => ({
      label: city.name,
      value: city.name,
    }));
    setCities(options);
  };

  useEffect(() => {
    loadCountries();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-center p-6">
      <div className="w-full max-w-3xl bg-white shadow-lg rounded-xl p-6">

        <h2 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-4">
          Other Booking Details »
        </h2>

        <div className="grid grid-cols-2 gap-4">

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

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Booking Source *
            </label>
            <select className="w-full border rounded-md p-2">
              <option>Front Office</option>
              <option>Walk in </option>
              <option>Agent</option>
              <option>office</option>
              <option>Go ibibo</option>
              <option>Makemytrip</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-sm text-gray-600 mb-1">
              Booking Reference
            </label>
            <input type="text" className="w-full border rounded-md p-2" />
          </div>
        </div>

        <h2 className="text-lg font-semibold text-gray-700 border-b pb-2 mt-6 mb-4">
          Address Details »
        </h2>

        <div className="grid grid-cols-2 gap-4">

          <div className="col-span-2">
            <label className="block text-sm text-gray-600 mb-1">
              Address
            </label>
            <textarea rows="3" className="w-full border rounded-md p-2" />
          </div>

          {/* FORM */}
          <div>
            <Form onFinish={getData} layout="vertical">

              {/* Country */}
              <Form.Item label="Country" name="country" rules={[{ required: true }]}>
                <Select
                  size="large"
                  placeholder="Choose country"
                  options={countries}
                  showSearch
                  onChange={onCountrySelect}
                  filterOption={(input, option) =>
                    option?.label?.toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>

              {/* State */}
              <Form.Item label="State" name="state" rules={[{ required: true }]}>
                <Select
                  size="large"
                  placeholder="Choose state"
                  options={state}
                  showSearch
                  onChange={onStateSelect}
                  filterOption={(input, option) =>
                    option?.label?.toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>

              {/* City */}
              <Form.Item label="City" name="city" rules={[{ required: true }]}>
                <Select
                  size="large"
                  placeholder="Choose city"
                  options={cities}
                  showSearch
                  filterOption={(input, option) =>
                    option?.label?.toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>

              <Form.Item>
                <button
                  type="submit"
                  className="bg-red-500 text-white px-4 py-2 rounded"
                >
                  submit
                </button>
              </Form.Item>

            </Form>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              PIN Code
            </label>
            <input type="text" className="w-full border rounded-md p-2" />
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