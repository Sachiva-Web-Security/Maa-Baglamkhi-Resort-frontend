import API from "../api";

export const housekeepingService = {
  getAllRooms: async () => {
    const response = await API.get("/housekeeping");
    return response.data;
  },

  createRoom: async (data) => {
    const response = await API.post("/housekeeping", data);
    return response.data;
  },

  updateRoomStatus: async (id, status) => {
    const response = await API.put(`/housekeeping/status/${id}`, { status });
    return response.data;
  },

  updateRoomAssignee: async (id, assignee) => {
    const response = await API.put(`/housekeeping/assignee/${id}`, { assignee });
    return response.data;
  }
};
