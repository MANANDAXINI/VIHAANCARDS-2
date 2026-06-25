const { prisma } = require("../lib/prisma");

function calcOrderAmount(paperType, priceRule, quantity) {
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) return 0;
  if (priceRule && Number(priceRule.amount) > 0) {
    return Math.round(Number(priceRule.amount));
  }
  return 0;
}

async function findPriceRule(paperTypeId, sizeId, printingSideId, quantity) {
  if (!paperTypeId || !sizeId || !printingSideId) return null;
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) return null;
  return prisma.priceRule.findFirst({
    where: { paperTypeId, sizeId, printingSideId, quantity: qty },
  });
}

async function resolveCatalogSelection({ paperTypeId, sizeId, printingSideId, quantity }) {
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error("Enter a valid quantity.");
  }

  const paperType = await prisma.paperType.findFirst({
    where: { id: paperTypeId, active: true },
  });
  if (!paperType) throw new Error("Paper type not found.");

  const size = await prisma.paperSize.findFirst({
    where: { id: sizeId, active: true },
  });
  if (!size) throw new Error("Size not found.");

  const printingSide = await prisma.printingSideOption.findFirst({
    where: { id: printingSideId, active: true },
  });
  if (!printingSide) throw new Error("Printing side not found.");

  if (qty > paperType.availableQuantity) {
    throw new Error(`Only ${paperType.availableQuantity} available for ${paperType.name}.`);
  }

  const priceRule = await findPriceRule(paperTypeId, sizeId, printingSideId, qty);
  const amount = calcOrderAmount(paperType, priceRule, qty);

  if (amount <= 0) {
    throw new Error("Price not set for this combination. Contact admin.");
  }

  return { paperType, size, printingSide, priceRule, quantity: qty, amount };
}

module.exports = { calcOrderAmount, findPriceRule, resolveCatalogSelection };
