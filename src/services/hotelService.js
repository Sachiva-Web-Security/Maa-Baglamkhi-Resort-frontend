import API from "../api";

export const hotelService = {
  getRoomsAndBookings: async () => {
    const response = await API.get("/hotel");
    return response.data;
  },

  addRoom: async (roomNumber) => {
    const response = await API.post("/hotel/room", { roomNumber });
    return response.data;
  },
};
