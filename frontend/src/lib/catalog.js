export function calcOrderAmount(catalog, paperTypeId, sizeId, printingSideId, quantity) {
  const qty = Number(quantity);
  if (!catalog || !Number.isFinite(qty) || qty <= 0) return 0;

  const rule = catalog.priceRules?.find(
    (r) =>
      r.paperTypeId === paperTypeId &&
      r.sizeId === sizeId &&
      r.printingSideId === printingSideId &&
      Number(r.quantity) === qty
  );

  if (rule && Number(rule.amount) > 0) {
    return Math.round(Number(rule.amount));
  }

  const paperType = catalog.paperTypes?.find((p) => p.id === paperTypeId);
  const legacyRule = catalog.priceRules?.find(
    (r) => r.paperTypeId === paperTypeId && r.sizeId === sizeId && r.printingSideId === printingSideId
  );
  const rate = legacyRule?.ratePerThousand || paperType?.ratePerThousand || 0;
  return rate > 0 ? Math.round((qty / 1000) * rate) : 0;
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
