/** Main Paper Type buttons on Place Order (D59 / D60). */
export const PAPER_CATEGORIES = [
  "MAPLITHO",
  "ART PAPER",
  "STICKER",
  "BOND",
  "ENVELOPE",
  "DIGITAL PRINTOUT",
  "DIE CUT STICKER",
];

export const PAPER_CATEGORY_OTHER = "OTHER";

/** Older category labels → current ones. */
const LEGACY_CATEGORY_MAP = {
  "100 BOND": "BOND",
  "DIGITAL DIE CUT STICKER": "DIE CUT STICKER",
};

/**
 * Resolve main category for a paper GSM.
 * Uses saved `category` when set; otherwise infers from the GSM name.
 */
export function resolvePaperCategory(paper) {
  let stored = String(paper?.category || "").trim().toUpperCase();
  if (LEGACY_CATEGORY_MAP[stored]) stored = LEGACY_CATEGORY_MAP[stored];
  if (PAPER_CATEGORIES.includes(stored) || stored === PAPER_CATEGORY_OTHER) {
    return stored;
  }

  const n = String(paper?.name || "").toLowerCase();
  if (/envelope/.test(n)) return "ENVELOPE";
  if (/\bbond\b/.test(n)) return "BOND";
  if (/die\s*cut|diecut/.test(n)) return "DIE CUT STICKER";
  if (/\bsticker\b/.test(n)) return "STICKER";
  if (/digital\s*print|printout|\bdigital\b/.test(n)) return "DIGITAL PRINTOUT";
  if (/mapl|maplitho/.test(n)) return "MAPLITHO";
  if (/art\s*paper|\bart\b/.test(n)) return "ART PAPER";
  if (/\b(250|300|350)\s*gsm/.test(n)) return "ART PAPER";
  return PAPER_CATEGORY_OTHER;
}

/** Main categories in fixed sequence; OTHER only when leftover papers exist. */
export function listPaperCategories(papers = []) {
  const hasOther = papers.some((p) => resolvePaperCategory(p) === PAPER_CATEGORY_OTHER);
  return hasOther ? [...PAPER_CATEGORIES, PAPER_CATEGORY_OTHER] : [...PAPER_CATEGORIES];
}

export function filterPapersByCategory(papers = [], category) {
  if (!category) return papers;
  return sortPapersByGsm(papers.filter((p) => resolvePaperCategory(p) === category));
}

/** Pull first GSM / weight number from a paper name (e.g. "120 gsm. Mapl." → 120). */
export function extractGsmNumber(paper) {
  const name = String(paper?.name || "");
  const match = name.match(/(\d+(?:\.\d+)?)\s*(?:gsm)?/i);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

/**
 * Serial order by GSM: increasing (70 → 80 → 100 → 120 …).
 * Papers without a number stay at the end, A–Z.
 */
export function sortPapersByGsm(papers = []) {
  return [...papers].sort((a, b) => {
    const ga = extractGsmNumber(a);
    const gb = extractGsmNumber(b);
    if (ga != null && gb != null && ga !== gb) return ga - gb;
    if (ga != null && gb == null) return -1;
    if (ga == null && gb != null) return 1;
    return String(a?.name || "").localeCompare(String(b?.name || ""), undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });
}

export function findPriceRule(catalog, paperTypeId, sizeId, printingSideId, quantity) {
  const qty = Number(quantity);
  if (!catalog?.priceRules || !Number.isFinite(qty) || qty <= 0) return null;
  return catalog.priceRules.find(
    (r) =>
      r.paperTypeId === paperTypeId &&
      r.sizeId === sizeId &&
      r.printingSideId === printingSideId &&
      Number(r.quantity) === qty &&
      Number(r.amount) > 0
  );
}

export function calcOrderAmount(catalog, paperTypeId, sizeId, printingSideId, quantity) {
  const rule = findPriceRule(catalog, paperTypeId, sizeId, printingSideId, quantity);
  if (rule) return Math.round(Number(rule.amount));
  return 0;
}

export function getPricedSizes(catalog, paperTypeId) {
  if (!catalog?.sizes?.length || !paperTypeId) return [];
  const sizeIds = new Set(
    (catalog.priceRules || [])
      .filter((r) => r.paperTypeId === paperTypeId && Number(r.amount) > 0)
      .map((r) => r.sizeId)
  );
  return catalog.sizes.filter((s) => sizeIds.has(s.id));
}

export function getPricedPrintingSides(catalog, paperTypeId, sizeId) {
  if (!catalog?.printingSides?.length || !paperTypeId || !sizeId) return [];
  const sideIds = new Set(
    (catalog.priceRules || [])
      .filter(
        (r) =>
          r.paperTypeId === paperTypeId &&
          r.sizeId === sizeId &&
          Number(r.amount) > 0
      )
      .map((r) => r.printingSideId)
  );
  return catalog.printingSides.filter((s) => sideIds.has(s.id));
}

export function getPricedQuantities(catalog, paperTypeId, sizeId, printingSideId) {
  const qtyValues = new Set(
    (catalog?.priceRules || [])
      .filter(
        (r) =>
          r.paperTypeId === paperTypeId &&
          r.sizeId === sizeId &&
          r.printingSideId === printingSideId &&
          Number(r.amount) > 0
      )
      .map((r) => Number(r.quantity))
  );

  if (catalog?.quantities?.length) {
    return catalog.quantities.filter((q) => qtyValues.has(Number(q.value)));
  }

  return [...qtyValues].sort((a, b) => a - b).map((value) => ({
    id: `qty-${value}`,
    value,
    label: String(value),
  }));
}

export function needsBackUpload(sideName) {
  const n = String(sideName || "").toLowerCase();
  return (n.includes("front") && n.includes("back")) || n.includes("both") || n.includes("double");
}

export function formatOrderDate(value = new Date()) {
  const d = value instanceof Date ? value : new Date(value);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export function isValidIndianMobile(phone) {
  return /^[0-9]{10}$/.test(String(phone || "").replace(/\D/g, ""));
}

/**
 * Superfast delivery surcharge by base order value:
 * < ₹2000 → ₹200 | ₹2000–₹5000 → ₹300 | > ₹5000 → ₹400
 */
export function getSuperfastCharge(orderAmount) {
  const amount = Number(orderAmount) || 0;
  if (amount <= 0) return 0;
  if (amount < 2000) return 200;
  if (amount <= 5000) return 300;
  return 400;
}
