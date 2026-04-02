import API from "../api";

export async function fetchInventoryMasterSections() {
  const response = await API.get("/inventory-masters/sections");
  return Array.isArray(response.data) ? response.data : [];
}

export async function fetchInventoryMasterRecords(sectionKey) {
  const response = await API.get(`/inventory-masters/${sectionKey}`);
  return Array.isArray(response.data) ? response.data : [];
}

export async function fetchInventoryMasterRecord(sectionKey, id) {
  const response = await API.get(`/inventory-masters/${sectionKey}/${id}`);
  return response.data;
}

export async function createInventoryMasterRecord(sectionKey, payload) {
  const response = await API.post(`/inventory-masters/${sectionKey}`, payload);
  return response.data;
}

export async function updateInventoryMasterRecord(sectionKey, id, payload) {
  const response = await API.put(`/inventory-masters/${sectionKey}/${id}`, payload);
  return response.data;
}

export async function deleteInventoryMasterRecord(sectionKey, id) {
  const response = await API.delete(`/inventory-masters/${sectionKey}/${id}`);
  return response.data;
}
