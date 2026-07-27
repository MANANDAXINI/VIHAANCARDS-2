/** Main Paper Type buttons on Place Order (D53). */
export const PAPER_CATEGORIES = [
  "MAPLITHO",
  "ART PAPER",
  "DIGITAL DIE CUT STICKER",
  "STICKER",
];

export const PAPER_CATEGORY_OTHER = "OTHER";

/**
 * Resolve main category for a paper GSM.
 * Uses saved `category` when set; otherwise infers from the GSM name.
 */
export function resolvePaperCategory(paper) {
  const stored = String(paper?.category || "").trim().toUpperCase();
  if (PAPER_CATEGORIES.includes(stored) || stored === PAPER_CATEGORY_OTHER) {
    return stored;
  }

  const n = String(paper?.name || "").toLowerCase();
  if (/die\s*cut|diecut/.test(n)) return "DIGITAL DIE CUT STICKER";
  if (/\bsticker\b/.test(n)) return "STICKER";
  if (/mapl|maplitho/.test(n)) return "MAPLITHO";
  if (/art\s*paper|\bart\b/.test(n)) return "ART PAPER";
  if (/\b(250|300|350)\s*gsm/.test(n)) return "ART PAPER";
  return PAPER_CATEGORY_OTHER;
}

/** Categories that have at least one paper in the list (4 mains always, then OTHER if needed). */
export function listPaperCategories(papers = []) {
  const hasOther = papers.some((p) => resolvePaperCategory(p) === PAPER_CATEGORY_OTHER);
  return hasOther ? [...PAPER_CATEGORIES, PAPER_CATEGORY_OTHER] : [...PAPER_CATEGORIES];
}

export function filterPapersByCategory(papers = [], category) {
  if (!category) return papers;
  return papers.filter((p) => resolvePaperCategory(p) === category);
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
