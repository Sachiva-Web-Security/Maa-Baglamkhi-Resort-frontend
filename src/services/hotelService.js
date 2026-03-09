import API from "../api";

export const hotelService = {
  getRoomsAndBookings: async () => {
    const response = await API.get("/hotel");
    return response.data;
  }
};
