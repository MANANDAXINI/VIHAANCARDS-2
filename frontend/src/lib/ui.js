export const ui = {
  page: "min-h-screen bg-slate-50 pt-32 pb-safe text-slate-900 max-[900px]:pt-40 max-[560px]:pt-[11rem]",
  pageAdminShell: "min-h-screen bg-slate-50 pt-28 pb-safe text-slate-900 sm:pt-32",
  pageNarrow: "mx-auto grid w-full max-w-3xl gap-4 px-4 sm:px-5",
  pageAdmin: "mx-auto grid w-full max-w-[90rem] gap-3 px-3 sm:px-4 lg:px-6",
  adminH1: "text-xl font-semibold tracking-tight text-slate-900",
  adminH3: "text-sm font-semibold text-slate-900",
  adminCard: "grid gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4",
  container: "mx-auto w-full max-w-6xl px-4 sm:px-5",
  card: "grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6",
  cardFlat: "rounded-xl border border-slate-200 bg-white shadow-sm",
  muted: "text-slate-500",
  small: "text-sm",
  h1: "text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl",
  h3: "text-base font-semibold text-slate-900",
  btn:
    "inline-flex min-h-[44px] touch-manipulation items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55",
  field: "grid gap-1.5",
  label: "text-sm font-semibold text-slate-900",
  input:
    "min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100",
  inputCompact:
    "min-h-[34px] w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 outline-none transition focus:border-blue-600 focus:ring-1 focus:ring-blue-100 sm:text-sm",
  inputError: "border-red-500 focus:border-red-500 focus:ring-red-100",
  fieldError: "text-xs font-medium text-red-600",
  grid2: "grid gap-4 md:grid-cols-2",
  tableWrap: "-mx-1 overflow-x-auto rounded-lg border border-slate-200 bg-white sm:mx-0",
  table: "w-full min-w-[36rem] border-collapse text-sm",
  th: "border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-[0.72rem] font-semibold uppercase tracking-wide text-slate-500 sm:px-3.5 sm:py-3",
  td: "border-b border-slate-200 px-3 py-2.5 text-left text-slate-800 sm:px-3.5 sm:py-3",
  pill: "inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.72rem] font-semibold",
  statGrid: "grid gap-3 sm:grid-cols-3",
  statCard: "rounded-lg border border-slate-200 bg-white px-4 py-4",
  navTabs: "flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1",
  navTabsScroll: "flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1",
  priceBox:
    "flex flex-col gap-2 rounded-lg bg-blue-50 px-4 py-3.5 font-semibold text-slate-900 sm:flex-row sm:items-center sm:justify-between",
  pageOrder: "mx-auto w-full max-w-5xl px-4 sm:px-5",
  orderLayout:
    "grid overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:grid-cols-[12rem_1fr] lg:grid-cols-[14rem_1fr]",
  paperSidebar: "border-b border-slate-200 bg-slate-50 p-3 md:border-b-0 md:border-r md:p-4",
  paperSidebarTitle: "mb-2 text-sm font-bold text-slate-900",
  paperNavItem:
    "block w-full rounded-md px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100",
  paperNavItemActive: "bg-sky-100 font-semibold text-sky-900",
  orderFormBody: "grid gap-4 p-4 sm:p-6",
  orderTotalBar:
    "flex items-center justify-between rounded-lg bg-amber-400 px-4 py-3 font-bold text-slate-900",
  mobileCardList: "grid gap-3 md:hidden",
  mobileCard: "grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm",
  mobileCardRow: "flex items-start justify-between gap-3",
  divider:
    "flex items-center gap-3 text-xs text-slate-500 before:h-px before:flex-1 before:bg-slate-200 after:h-px after:flex-1 after:bg-slate-200",
};

export function btnClass(variant = "primary", small = false) {
  const size = small ? "px-3 text-xs" : "";
  if (variant === "ghost") {
    return `${ui.btn} ${size} border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 hover:text-slate-900`;
  }
  if (variant === "secondary") {
    return `${ui.btn} ${size} border border-slate-300 bg-white text-slate-800 hover:bg-slate-50`;
  }
  if (variant === "amber") {
    return `${ui.btn} ${size} bg-amber-400 font-bold text-slate-900 hover:bg-amber-500`;
  }
  if (variant === "teal") {
    return `${ui.btn} ${size} bg-teal-600 text-white hover:bg-teal-700`;
  }
  return `${ui.btn} ${size} bg-blue-600 text-white hover:bg-blue-700`;
}

/** Mutually exclusive — avoids text-color class conflicts */
export function chipClass(active) {
  if (active) {
    return "rounded-md border border-blue-700 bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";
  }
  return "rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500";
}

export function tabClass(active) {
  if (active) {
    return "inline-flex shrink-0 min-h-9 items-center whitespace-nowrap rounded-md bg-white px-3 text-sm font-semibold text-blue-700 shadow-sm ring-1 ring-slate-200 sm:px-3.5";
  }
  return "inline-flex shrink-0 min-h-9 items-center whitespace-nowrap rounded-md px-3 text-sm font-medium text-slate-600 hover:bg-white/70 hover:text-slate-900 sm:px-3.5";
}

export function heroBtnPrimary() {
  return `${ui.btn} bg-white text-blue-700 shadow-lg shadow-slate-900/25 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-blue-50 hover:shadow-xl hover:shadow-slate-900/30 active:translate-y-0`;
}

export function heroBtnSecondary() {
  return `${ui.btn} border-2 border-white/60 bg-white/10 text-white backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-white hover:bg-white/20 hover:shadow-lg hover:shadow-slate-900/25 active:translate-y-0`;
}

export function accountStatusClass(status) {
  const s = String(status || "").toUpperCase();
  if (s === "APPROVED") return `${ui.pill} bg-emerald-100 text-emerald-800`;
  if (s === "REJECTED") return `${ui.pill} bg-red-100 text-red-800`;
  return `${ui.pill} bg-amber-100 text-amber-800`;
}

export function pendingCountClass() {
  return "font-semibold text-red-600";
}

export function pendingSectionTitleClass(hasPending) {
  return hasPending ? "text-sm font-semibold text-red-600" : ui.adminH3;
}

export function pendingRowClass(isPending) {
  return isPending ? "bg-red-50/80" : "";
}

export function orderStatusClass(status) {
  const s = String(status || "").toUpperCase();
  if (s === "DISPATCHED") return `${ui.pill} bg-indigo-100 text-indigo-800`;
  if (s === "PRINTING_PROCESS_STARTED") return `${ui.pill} bg-teal-100 text-teal-800`;
  if (s === "COMPLETED") return `${ui.pill} bg-emerald-100 text-emerald-800`;
  if (s === "PAYMENT_VERIFIED" || s === "IN_PRINTING") return `${ui.pill} bg-blue-100 text-blue-800`;
  if (s === "PAYMENT_SUBMITTED" || s === "ORDER_CREATED") return `${ui.pill} bg-amber-100 text-amber-800`;
  if (s === "REJECTED") return `${ui.pill} bg-red-100 text-red-800`;
  return `${ui.pill} bg-slate-100 text-slate-700`;
}

export function formatOrderStatus(status) {
  const s = String(status || "").toUpperCase();
  if (s === "COMPLETED") return "Delivered";
  return String(status || "").replace(/_/g, " ");
}

export function isOrderPending(status) {
  return String(status || "").toUpperCase() !== "COMPLETED";
}
