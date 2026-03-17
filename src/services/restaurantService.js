import API from "../api";

/**
 * Restaurant service encapsulates all REST calls to the backend.
 * Keep component code clean by re‑using these helpers.
 */
export const restaurantService = {
  // GET /restaurant/menu?tableNumber=:tableNumber
  async getMenu(tableNumber) {
    const response = await API.get("/restaurant/menu", {
      params: { tableNumber: String(tableNumber) },
    });
    return response.data;
  },

  /**
   * Create / append items to the pending order for a table.
   * Backend creates the order on the first call and returns orderId.
   * We push items one-by-one because the API accepts a single item per request.
   */
  async createOrder(tableNumber, items) {
    let orderId = null;
    for (const item of items) {
      const res = await API.post("/restaurant/order/add", {
        tableNumber,
        item,
      });
      orderId = res.data?.orderId || orderId;
    }
    return { orderId };
  },

  // GET /restaurant/order/:tableNumber
  async getPendingOrder(tableNumber) {
    const response = await API.get(`/restaurant/order/${tableNumber}`);
    return response.data;
  },

  // GET /restaurant/order-items/:orderId
  async getOrderItems(orderId) {
    const response = await API.get(`/restaurant/order-items/${orderId}`);
    return response.data;
  },

  // PUT /restaurant/order/:orderId
  async updateOrder(orderId, payload) {
    const response = await API.put(`/restaurant/order/${orderId}`, payload);
    return response.data;
  },

  // DELETE /restaurant/order/:orderId
  async deleteOrder(orderId) {
    const response = await API.delete(`/restaurant/order/${orderId}`);
    return response.data;
  },

  // GET /restaurant/order
  async getOrders() {
    const response = await API.get("/restaurant/order");
    return response.data;
  },

  // POST /restaurant/menu
  async addMenuItem(payload) {
    const response = await API.post("/restaurant/menu", payload);
    return response.data;
  },

  // POST /kitchen/order
  async createKitchenOrder(payload) {
    const response = await API.post("/kitchen/order", payload);
    return response.data;
  },

  // GET /kitchen/orders
  async getKitchenOrders() {
    const response = await API.get("/kitchen/orders");
    return response.data;
  },

  // PUT /kitchen/orders/:id
  async updateKitchenOrderStatus(id, status) {
    const response = await API.put(`/kitchen/orders/${id}`, { status });
    return response.data;
  },
};

export default restaurantService;
