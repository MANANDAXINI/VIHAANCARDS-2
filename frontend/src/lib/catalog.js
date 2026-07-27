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
