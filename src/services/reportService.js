import API from "../api";

export const reportService = {
  async getDaywiseFood(startDate, endDate) {
    // build params only when provided to avoid filtering out data
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await API.get("/report/daywise-food", { params });
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
