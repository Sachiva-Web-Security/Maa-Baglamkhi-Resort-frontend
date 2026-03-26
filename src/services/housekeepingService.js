import API from "../api";

export const housekeepingService = {
  getAllRooms: async () => {
    const response = await API.get("/housekeeping");
    return response.data;
  },

  getLogs: async () => {
    const response = await API.get("/housekeeping/logs");
    return response.data;
  },

  createRoom: async (data) => {
    const response = await API.post("/housekeeping", data);
    return response.data;
  },

  updateRoom: async (id, data) => {
    const response = await API.put(`/housekeeping/${id}`, data);
    return response.data;
  },

  updateRoomStatus: async (id, status) => {
    const response = await API.put(`/housekeeping/status/${id}`, { status });
    return response.data;
  },

  updateRoomAssignee: async (id, assignee) => {
    const response = await API.put(`/housekeeping/assignee/${id}`, { assignee });
    return response.data;
  },

  deleteRoom: async (id) => {
    const response = await API.delete(`/housekeeping/${id}`);
    return response.data;
  },
};