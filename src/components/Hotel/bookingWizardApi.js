import API from "../../api";

export const fetchBookingWizard = async (bookingId) => {
  if (!bookingId) return null;
  const response = await API.get(`/hotel/wizard/${bookingId}`);
  return response.data || null;
};
