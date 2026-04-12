export const normalizeActorName = (value) => String(value || "").trim().toLowerCase();
export const normalizeActorRole = (value) => String(value || "").trim().toLowerCase();

export const getCurrentActor = () => {
  const name = String(localStorage.getItem("name") || "").trim();
  const role = normalizeActorRole(localStorage.getItem("role"));

  return {
    name,
    role,
    normalizedName: normalizeActorName(name),
    isWaiter: role === "waiter",
    isManager: role === "manager",
    isAdmin: role === "admin",
  };
};

export const namesMatch = (left, right) => {
  const normalizedLeft = normalizeActorName(left);
  const normalizedRight = normalizeActorName(right);
  if (!normalizedLeft || !normalizedRight) return false;
  return normalizedLeft === normalizedRight;
};
