import API from "../api";

export const chefService = {
  async getOrders() {
    const response = await API.get("/chef/orders");
    return response.data;
  },

  async updateOrderStatus(id, payload) {
    const response = await API.put(`/chef/orders/${id}/status`, payload);
    return response.data;
  },

  async getNotifications() {
    const response = await API.get("/chef/notifications");
    return response.data;
  },

  async markNotificationRead(id) {
    const response = await API.post(`/chef/notifications/${id}/read`);
    return response.data;
  },

  async markAllNotificationsRead() {
    const response = await API.post("/chef/notifications/mark-all-read");
    return response.data;
  },

  async createNotification(payload) {
    const response = await API.post("/chef/notifications", payload);
    return response.data;
  },

  async deleteNotification(id) {
    const response = await API.delete(`/chef/notifications/${id}`);
    return response.data;
  },
};

export default chefService;
