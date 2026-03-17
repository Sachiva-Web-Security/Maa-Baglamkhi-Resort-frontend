import API from "../api";

export const reportService = {
  async getDaywiseFood(startDate, endDate) {
    // backend is mounted at /api/report/daywise-food
    const response = await API.get("/report/daywise-food", {
      params: { startDate, endDate },
    });
    return response.data;
  },

  async getDailyRoomFood(date) {
    const response = await API.get("/report/daily-room-food", {
      params: { date },
    });
    return response.data;
  },
};

export default reportService;
