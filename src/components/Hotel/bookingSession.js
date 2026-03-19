const BOOKING_ID_KEY = "hotel_active_booking_id";
const BOOKING_DRAFT_KEY = "hotel_booking_step_draft";

export const getStoredBookingId = () => {
  try {
    return sessionStorage.getItem(BOOKING_ID_KEY) || "";
  } catch (_error) {
    return "";
  }
};

export const setStoredBookingId = (bookingId) => {
  if (!bookingId) return;
  try {
    sessionStorage.setItem(BOOKING_ID_KEY, String(bookingId));
  } catch (_error) {
    // ignore
  }
};

export const getBookingDraft = (step) => {
  try {
    const raw = sessionStorage.getItem(BOOKING_DRAFT_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return step ? parsed[step] || null : parsed;
  } catch (_error) {
    return step ? null : {};
  }
};

export const setBookingDraft = (step, value) => {
  try {
    const current = getBookingDraft();
    const next = { ...current, [step]: value };
    sessionStorage.setItem(BOOKING_DRAFT_KEY, JSON.stringify(next));
  } catch (_error) {
    // ignore
  }
};
