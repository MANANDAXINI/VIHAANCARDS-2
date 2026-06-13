export function calcOrderAmount(catalog, paperTypeId, sizeId, printingSideId, quantity) {
  const qty = Number(quantity);
  if (!catalog || !Number.isFinite(qty) || qty <= 0) return 0;

  const paperType = catalog.paperTypes?.find((p) => p.id === paperTypeId);
  const rule = catalog.priceRules?.find(
    (r) => r.paperTypeId === paperTypeId && r.sizeId === sizeId && r.printingSideId === printingSideId
  );
  const rate = rule?.ratePerThousand || paperType?.ratePerThousand || 0;
  return Math.round((qty / 1000) * rate);
}

export function isValidIndianMobile(phone) {
  return /^[0-9]{10}$/.test(String(phone || "").replace(/\D/g, ""));
}
