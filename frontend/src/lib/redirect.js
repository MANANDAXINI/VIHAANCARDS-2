/** Where to send user after login */
export function getHomeForUser(user) {
  if (!user) return "/";
  if (user.role === "ADMIN") return "/admin";
  if (user.status === "PENDING") return "/?pending=1";
  return "/order";
}

/** Pure ADMIN always; BOTH only when approved */
export function isAdmin(user) {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  if (user.role === "BOTH" && user.status === "APPROVED") return true;
  return false;
}

export function isCustomer(user) {
  if (!user) return false;
  if (user.role === "CUSTOMER" && user.status === "APPROVED") return true;
  if (user.role === "BOTH" && user.status === "APPROVED") return true;
  return false;
}

export function roleLabel(role) {
  if (role === "ADMIN") return "Admin";
  if (role === "BOTH") return "Customer + Admin";
  return "Customer";
}

/** After logout — admins stay on admin login, customers go home */
export function getLogoutRedirect(user) {
  if (isAdmin(user)) return "/admin";
  return "/";
}
