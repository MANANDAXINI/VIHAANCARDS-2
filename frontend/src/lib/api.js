const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function loadToast() {
  const { toast } = await import("@/lib/toast");
  return toast;
}

function getToken(key = "pd_token") {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(key);
}

function setToken(token, key = "pd_token") {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(key, token);
  else localStorage.removeItem(key);
}

async function api(path, options = {}) {
  const { body, headers = {}, silent, ...rest } = options;
  const token = getToken();

  const isFormData = body instanceof FormData;
  const config = {
    ...rest,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  };

  const response = await fetch(`${API_URL}${path}`, config).catch((error) => {
    const networkError = new Error(
      API_URL.includes("localhost")
        ? "Cannot reach API. Set NEXT_PUBLIC_API_URL on Vercel to your Render backend URL."
        : `Cannot reach API at ${API_URL}. Check Render is running and CORS allows your site.`
    );
    networkError.cause = error;
    throw networkError;
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || "Request failed");
    error.status = response.status;
    error.data = data;
    if (!silent && response.status !== 402 && typeof window !== "undefined") {
      const toast = await loadToast();
      toast.error(data.error || "Request failed");
    }
    throw error;
  }

  return data;
}

export const authApi = {
  register: (body, options) => api("/api/auth/register", { method: "POST", body, ...options }),
  login: (body, options) => api("/api/auth/login", { method: "POST", body, ...options }),
  googleLogin: (body, options) => api("/api/auth/google", { method: "POST", body, ...options }),
  logout: (options) => api("/api/auth/logout", { method: "POST", ...options }),
  me: (options) => api("/api/auth/me", options),
  updateAccount: (body, options) => api("/api/auth/account", { method: "PUT", body, ...options }),
};

export const orderApi = {
  list: () => api("/api/orders/my-orders"),
  create: (formData, options) => api("/api/orders", { method: "POST", body: formData, ...options }),
};

export const walletApi = {
  ledger: () => api("/api/wallet/ledger"),
  request: (body, options) => api("/api/wallet/wallet-request", { method: "POST", body, ...options }),
};

export const adminApi = {
  pendingAccounts: () => api("/api/admin/accounts/pending"),
  accounts: () => api("/api/admin/accounts"),
  approveAccount: (id, options) => api(`/api/admin/accounts/${id}/approve`, { method: "PUT", ...options }),
  updateRole: (id, role) => api(`/api/admin/accounts/${id}/role`, { method: "PUT", body: { role } }),
  updateCredit: (id, body) => api(`/api/admin/accounts/${id}/credit`, { method: "PUT", body }),
  walletRequests: () => api("/api/admin/wallet-requests"),
  approveWallet: (id) => api(`/api/admin/wallet-requests/${id}/approve`, { method: "PUT" }),
  rejectWallet: (id) => api(`/api/admin/wallet-requests/${id}/reject`, { method: "PUT" }),
  orders: () => api("/api/admin/orders"),
  dispatch: (id, body) => api(`/api/admin/orders/${id}/dispatch`, { method: "PUT", body }),
  deliver: (id) => api(`/api/admin/orders/${id}/deliver`, { method: "PUT" }),
};

export const catalogApi = {
  get: () => api("/api/catalog"),
  quote: (body) => api("/api/catalog/quote", { method: "POST", body }),
};

export const adminCatalogApi = {
  paperTypes: () => api("/api/admin/catalog/paper-types"),
  createPaperType: (body) => api("/api/admin/catalog/paper-types", { method: "POST", body }),
  updatePaperType: (id, body) => api(`/api/admin/catalog/paper-types/${id}`, { method: "PUT", body }),
  deletePaperType: (id) => api(`/api/admin/catalog/paper-types/${id}`, { method: "DELETE" }),
  sizes: () => api("/api/admin/catalog/sizes"),
  createSize: (body) => api("/api/admin/catalog/sizes", { method: "POST", body }),
  updateSize: (id, body) => api(`/api/admin/catalog/sizes/${id}`, { method: "PUT", body }),
  deleteSize: (id) => api(`/api/admin/catalog/sizes/${id}`, { method: "DELETE" }),
  printingSides: () => api("/api/admin/catalog/printing-sides"),
  createPrintingSide: (body) => api("/api/admin/catalog/printing-sides", { method: "POST", body }),
  updatePrintingSide: (id, body) => api(`/api/admin/catalog/printing-sides/${id}`, { method: "PUT", body }),
  deletePrintingSide: (id) => api(`/api/admin/catalog/printing-sides/${id}`, { method: "DELETE" }),
  priceRules: () => api("/api/admin/catalog/price-rules"),
  createPriceRule: (body) => api("/api/admin/catalog/price-rules", { method: "POST", body }),
  updatePriceRule: (id, body) => api(`/api/admin/catalog/price-rules/${id}`, { method: "PUT", body }),
  deletePriceRule: (id) => api(`/api/admin/catalog/price-rules/${id}`, { method: "DELETE" }),
  qr: () => api("/api/admin/catalog/qr"),
  uploadQr: (formData) => api("/api/admin/catalog/qr", { method: "POST", body: formData }),
  deleteQr: () => api("/api/admin/catalog/qr", { method: "DELETE" }),
};

export function formatRupees(value) {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
}

export function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export { API_URL, getToken, setToken };
