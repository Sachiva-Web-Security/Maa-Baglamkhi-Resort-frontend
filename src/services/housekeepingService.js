// src/services/housekeepingService.js
// Centralised API calls for the Housekeeping module

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function request(method, path, body) {
  const token = localStorage.getItem("token");
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  };
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── ROOMS ──────────────────────────────────────────────────────
export const getAllRooms     = ()             => request("GET",    "/housekeeping");
export const createRoom      = (data)        => request("POST",   "/housekeeping", {
  ...data,
  roomNumber: data?.roomNumber ?? data?.roomNo,
});
export const updateStatus    = (id, status)  => request("PUT",    `/housekeeping/status/${id}`, { status });
export const updateAssignee  = (id, assignee)=> request("PUT",    `/housekeeping/assignee/${id}`, { assignee });
export const deleteRoom      = (id)          => request("DELETE", `/housekeeping/${id}`);

// ── PARAMETERS ─────────────────────────────────────────────────
export const getParameters   = ()       => request("GET",  "/housekeeping/parameters");
export const saveParameters  = (data)   => request("POST", "/housekeeping/parameters", data);

// ── MESSAGES ───────────────────────────────────────────────────
export const sendMessage = (roomId, roomNo, message) =>
  request("POST", "/housekeeping/message", { roomId, roomNo, message });

// ── AMENITIES ──────────────────────────────────────────────────
export const getAmenities   = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request("GET", `/housekeeping/amenities${qs ? "?" + qs : ""}`);
};
export const logAmenity     = (data)   => request("POST",   "/housekeeping/amenities", data);
export const deleteAmenity  = (id)     => request("DELETE", `/housekeeping/amenities/${id}`);

// ── INSPECTIONS ────────────────────────────────────────────────
export const getInspections     = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request("GET", `/housekeeping/inspections${qs ? "?" + qs : ""}`);
};
export const createInspection   = (data)   => request("POST", "/housekeeping/inspections", data);
export const getInspectionById  = (id)     => request("GET",  `/housekeeping/inspections/${id}`);

// ── LOST & FOUND ───────────────────────────────────────────────
export const getLostFound     = ()            => request("GET",    "/housekeeping/lost-found");
export const createLostFound  = (data)        => request("POST",   "/housekeeping/lost-found", data);
export const updateLostFound  = (id, data)    => request("PUT",    `/housekeeping/lost-found/${id}`, data);
export const deleteLostFound  = (id)          => request("DELETE", `/housekeeping/lost-found/${id}`);

// ── SHIFT ROSTER ───────────────────────────────────────────────
export const getRoster  = (weekStart)   => request("GET",  `/housekeeping/roster?weekStart=${weekStart}`);
export const saveRoster = (entries)     => request("POST", "/housekeeping/roster", { entries });

// ── ROOM COSTING ───────────────────────────────────────────────
export const getCostingLogs = ()       => request("GET",  "/housekeeping/costing");
export const logCost        = (data)   => request("POST", "/housekeeping/costing", data);

// ── CHECKOUT REPORT ────────────────────────────────────────────
export const getCheckoutReport = (date) =>
  request("GET", `/housekeeping/checkout-report?date=${date}`);

export const getCompletedCleaningLogs = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request("GET", `/housekeeping/completed-cleaning${qs ? "?" + qs : ""}`);
};
export const createCompletedCleaningLog = (data) =>
  request("POST", "/housekeeping/completed-cleaning", data);

// ── ASSIGNMENTS ────────────────────────────────────────────────
export const getAssignments    = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request("GET", `/assignments${qs ? "?" + qs : ""}`);
};
export const createAssignment  = (data)    => request("POST",   "/assignments", data);
export const updateAssignment  = (id, data)=> request("PUT",    `/assignments/${id}`, data);
export const deleteAssignment  = (id)      => request("DELETE", `/assignments/${id}`);
export const getAssignmentStats = ()       => request("GET",    "/assignments/stats");

export const updateRoomStatus = updateStatus;

export const housekeepingService = {
  getAllRooms,
  createRoom,
  updateStatus,
  updateRoomStatus,
  updateAssignee,
  deleteRoom,
  getParameters,
  saveParameters,
  sendMessage,
  getAmenities,
  logAmenity,
  deleteAmenity,
  getInspections,
  createInspection,
  getInspectionById,
  getLostFound,
  createLostFound,
  updateLostFound,
  deleteLostFound,
  getRoster,
  saveRoster,
  getCostingLogs,
  logCost,
  getCheckoutReport,
  getCompletedCleaningLogs,
  createCompletedCleaningLog,
  getAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getAssignmentStats,
};

export default housekeepingService;
