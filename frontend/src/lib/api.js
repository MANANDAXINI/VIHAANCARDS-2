const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export function uploadAssetUrl(pathOrUrl) {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base = API_URL.replace(/\/$/, "");
  const assetPath = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${base}${assetPath}`;
}

export async function fetchArtworkBlobUrl(pathOrUrl) {
  const fullUrl = uploadAssetUrl(pathOrUrl);
  if (!fullUrl || typeof window === "undefined") return null;

  const token = localStorage.getItem("pd_token");
  const response = await fetch(fullUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) return null;
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

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
  forgotPassword: (body, options) => api("/api/auth/forgot-password", { method: "POST", body, ...options }),
  resetPassword: (body, options) => api("/api/auth/reset-password", { method: "POST", body, ...options }),
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
  navCounts: () => api("/api/admin/nav-counts"),
  alertFeed: (since) => api(`/api/admin/alert-feed${since ? `?since=${encodeURIComponent(since)}` : ""}`),
  passwordResets: () => api("/api/admin/password-resets"),
  pendingAccounts: () => api("/api/admin/accounts/pending"),
  accounts: () => api("/api/admin/accounts"),
  approveAccount: (id, options) => api(`/api/admin/accounts/${id}/approve`, { method: "PUT", ...options }),
  updateAccountProfile: (id, body, options) => api(`/api/admin/accounts/${id}`, { method: "PUT", body, ...options }),
  deleteAccount: (id, options) => api(`/api/admin/accounts/${id}`, { method: "DELETE", ...options }),
  updateRole: (id, role) => api(`/api/admin/accounts/${id}/role`, { method: "PUT", body: { role } }),
  updateCredit: (id, body, options) => api(`/api/admin/accounts/${id}/credit`, { method: "PUT", body, ...options }),
  addOutstanding: (id, body, options) => api(`/api/admin/accounts/${id}/outstanding`, { method: "POST", body, ...options }),
  receivePayment: (id, body, options) => api(`/api/admin/accounts/${id}/payment`, { method: "POST", body, ...options }),
  addOtherCharge: (id, body, options) => api(`/api/admin/accounts/${id}/other-charge`, { method: "POST", body, ...options }),
  updateLedgerEntry: (entryId, body, options) => api(`/api/admin/ledger-entry/${entryId}`, { method: "PUT", body, ...options }),
  deleteLedgerEntry: (entryId, options) => api(`/api/admin/ledger-entry/${entryId}`, { method: "DELETE", ...options }),
  walletRequests: () => api("/api/admin/wallet-requests"),
  approveWallet: (id) => api(`/api/admin/wallet-requests/${id}/approve`, { method: "PUT" }),
  rejectWallet: (id) => api(`/api/admin/wallet-requests/${id}/reject`, { method: "PUT" }),
  orders: () => api("/api/admin/orders"),
  proceedPrinting: (id, options) => api(`/api/admin/orders/${id}/proceed-printing`, { method: "PUT", ...options }),
  markArtworkDownloaded: (id, side, options) => api(`/api/admin/orders/${id}/mark-artwork`, { method: "PUT", body: { side }, ...options }),
  dispatch: (id, body, options) => api(`/api/admin/orders/${id}/dispatch`, { method: "PUT", body, ...options }),
  deliver: (id, options) => api(`/api/admin/orders/${id}/deliver`, { method: "PUT", ...options }),
  cancelOrder: (id, options) => api(`/api/admin/orders/${id}`, { method: "DELETE", ...options }),
  dayBook: (date) => api(`/api/admin/day-book${date ? `?date=${encodeURIComponent(date)}` : ""}`),
  customerLedger: (accountId, { fromDate, toDate } = {}) => {
    const params = new URLSearchParams();
    if (fromDate) params.set("fromDate", fromDate);
    if (toDate) params.set("toDate", toDate);
    const query = params.toString();
    return api(`/api/admin/ledger/${accountId}${query ? `?${query}` : ""}`);
  },
  outstandingReceivable: () => api("/api/admin/outstanding-receivable"),
  customerAccountDetails: (accountId) => api(`/api/admin/accounts/${accountId}/details`),
  uploadParcelUpdate: (formData, options) => api("/api/admin/parcel-update/upload", { method: "POST", body: formData, ...options }),
  updateSingleParcel: (body, options) => api("/api/admin/parcel-update/single", { method: "POST", body, ...options }),
  completeJobsFromFolder: (body, options) => api("/api/admin/job-update/complete", { method: "POST", body, ...options }),
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
  paperTypeHistory: (id) => api(`/api/admin/catalog/paper-types/${id}/history`),
  sizes: () => api("/api/admin/catalog/sizes"),
  createSize: (body) => api("/api/admin/catalog/sizes", { method: "POST", body }),
  updateSize: (id, body) => api(`/api/admin/catalog/sizes/${id}`, { method: "PUT", body }),
  deleteSize: (id) => api(`/api/admin/catalog/sizes/${id}`, { method: "DELETE" }),
  printingSides: () => api("/api/admin/catalog/printing-sides"),
  createPrintingSide: (body) => api("/api/admin/catalog/printing-sides", { method: "POST", body }),
  updatePrintingSide: (id, body) => api(`/api/admin/catalog/printing-sides/${id}`, { method: "PUT", body }),
  deletePrintingSide: (id) => api(`/api/admin/catalog/printing-sides/${id}`, { method: "DELETE" }),
  quantities: () => api("/api/admin/catalog/quantities", { silent: true }),
  createQuantity: (body) => api("/api/admin/catalog/quantities", { method: "POST", body }),
  updateQuantity: (id, body) => api(`/api/admin/catalog/quantities/${id}`, { method: "PUT", body }),
  deleteQuantity: (id) => api(`/api/admin/catalog/quantities/${id}`, { method: "DELETE" }),
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
