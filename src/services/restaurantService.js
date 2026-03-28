import API from "../api";

export const restaurantService = {
  // ── TABLES ─────────────────────────────────────────────────────────
  async getTables() {
    const response = await API.get("/restaurant/tables");
    return response.data;
  },
  async addTable(payload) {
    const response = await API.post("/restaurant/tables", payload);
    return response.data;
  },
  async updateTable(id, payload) {
    const response = await API.put(`/restaurant/tables/${id}`, payload);
    return response.data;
  },
  async deleteTable(id) {
    const response = await API.delete(`/restaurant/tables/${id}`);
    return response.data;
  },

  // ── MENU ────────────────────────────────────────────────────────────
  async getMenu(tableNumber) {
    const response = await API.get("/restaurant/menu", {
      params: { tableNumber: String(tableNumber) },
    });
    return response.data;
  },
  async addMenuItem(payload) {
    // payload can be FormData (with image) or plain object
    const isFormData = payload instanceof FormData;
    const response = await API.post("/restaurant/menu", payload, {
      headers: isFormData ? { "Content-Type": "multipart/form-data" } : {},
    });
    return response.data;
  },
  async updateMenuItem(id, payload) {
    const isFormData = payload instanceof FormData;
    const response = await API.put(`/restaurant/menu/${id}`, payload, {
      headers: isFormData ? { "Content-Type": "multipart/form-data" } : {},
    });
    return response.data;
  },
  async deleteMenuItem(id) {
    const response = await API.delete(`/restaurant/menu/${id}`);
    return response.data;
  },

  // ── ORDERS ──────────────────────────────────────────────────────────
  async createOrder(tableNumber, items) {
    let orderId = null;
    for (const item of items) {
      const res = await API.post("/restaurant/order/add", { tableNumber, item });
      orderId = res.data?.orderId || orderId;
    }
    return { orderId };
  },
  async getPendingOrder(tableNumber) {
    const response = await API.get(`/restaurant/order/${tableNumber}`);
    return response.data;
  },
  async getOrderItems(orderId) {
    const response = await API.get(`/restaurant/order-items/${orderId}`);
    return response.data;
  },
  async updateOrder(orderId, payload) {
    const response = await API.put(`/restaurant/order/${orderId}`, payload);
    return response.data;
  },
  async deleteOrder(orderId) {
    const response = await API.delete(`/restaurant/order/${orderId}`);
    return response.data;
  },
  async getOrders() {
    const response = await API.get("/restaurant/order");
    return response.data;
  },

  // ── BILLS ────────────────────────────────────────────────────────────
  async getBills() {
    const response = await API.get("/restaurant/bills");
    return response.data;
  },
    async createSplitBill(payload) {
    const response = await API.post("/restaurant/split-bills", payload);
    return response.data;
  },

  async createBill(payload) {
    const response = await API.post("/restaurant/bill", payload);
    return response.data;
  },

  async payBill(payload) {
    const billId = payload?.billId;
    const endpoint = billId ? `/restaurant/bill/${billId}/pay` : "/restaurant/bill/pay";
    const response = await API.post(endpoint, payload);
    return response.data;
  },

  // ── KITCHEN ─────────────────────────────────────────────────────────
  async createKitchenOrder(payload) {
    const response = await API.post("/kitchen/order", payload);
    return response.data;
  },
  async getKitchenOrders() {
    const response = await API.get("/kitchen/orders");
    return response.data;
  },
  async updateKitchenOrderStatus(id, payload) {
    const response = await API.put(`/kitchen/orders/${id}`, payload);
    return response.data;
  },
  async cancelKitchenOrder(id) {
    const response = await API.put(`/kitchen/orders/${id}/cancel`);
    return response.data;
  },
  // FIX: was missing in original, caused Kitchen.jsx crash on removeOrder
  async removeKitchenOrder(id) {
    const response = await API.delete(`/kitchen/orders/${id}`);
    return response.data;
  },
  async saveKitchenOrder(id, payload) {
    const response = await API.put(`/kitchen/orders/${id}/save`, payload);
    return response.data;
  },
  // ── WAITER PERFORMANCE ───────────────────────────────────────────────
  // FIX: was missing, caused TablePage to crash on mount (loadWaiterPerformance)
  async getWaiterPerformance() {
    try {
      const response = await API.get("/restaurant/waiter-performance");
      return response.data;
    } catch {
      return []; // non-critical, graceful empty
    }
  },
  // ── ITEM ACTION REQUESTS ────────────────────────────────────────────
  // FIX: was missing, caused EditToken crash on loadActionRequests
  async getItemActionRequests() {
    try {
      const response = await API.get("/restaurant/item-action-requests");
      return Array.isArray(response.data) ? response.data : [];
    } catch {
      return []; // graceful fallback
    }
  },




  async createItemActionRequest(payload) {
    const response = await API.post("/restaurant/item-action-requests", payload);
    return response.data;
  },

  async getItemActionRequests() {
    const response = await API.get("/restaurant/item-action-requests");
    return response.data;
  },

  async reviewItemActionRequest(id, payload) {
    const response = await API.put(`/restaurant/item-action-requests/${id}/review`, payload);
    return response.data;
  },

};

export default restaurantService;
