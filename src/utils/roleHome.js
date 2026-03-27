export const ROLE_HOME = {
  admin: "/dashboard",
  manager: "/manager-dashboard",
  receptionist: "/reception-dashboard",
  housekeeping: "/housekeeping-dashboard",
  accountant: "/accounts-dashboard",
  kitchen: "/kitchen-dashboard",
  waiter: "/restaurant-dashboard",
  staff: "/staff-dashboard",
};

export const ROLE_LABELS = {
  admin: "Admin",
  manager: "Manager",
  receptionist: "Receptionist",
  housekeeping: "Housekeeping",
  accountant: "Accountant",
  kitchen: "Kitchen",
  waiter: "Waiter",
  staff: "Staff",
};

export function normalizeRole(role) {
  return String(role || "").toLowerCase().trim();
}

export function getRoleHome(role) {
  return ROLE_HOME[normalizeRole(role)] || "/login";
}

export function getRoleLabel(role) {
  return ROLE_LABELS[normalizeRole(role)] || "User";
}
