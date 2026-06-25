const express = require("express");
const { prisma } = require("../lib/prisma");
const { calcOrderAmount } = require("../lib/catalog");

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const [paperTypes, sizes, printingSides, priceRules, qr] = await Promise.all([
      prisma.paperType.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
      prisma.paperSize.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
      prisma.printingSideOption.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
      prisma.priceRule.findMany(),
      prisma.paymentQr.findUnique({ where: { id: 1 } }),
    ]);

    let quantities = [];
    try {
      quantities = await prisma.quantityOption.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { value: "asc" }],
      });
    } catch (quantityError) {
      console.warn("QuantityOption unavailable:", quantityError.message);
    }

    res.json({
      paperTypes,
      sizes,
      printingSides,
      quantities,
      priceRules,
      hasQr: Boolean(qr?.imagePath),
      qrImageUrl: qr?.imagePath ? `/uploads/${qr.imagePath}` : null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/quote", async (req, res) => {
  try {
    const { paperTypeId, sizeId, printingSideId, quantity } = req.body;
    const paperType = await prisma.paperType.findUnique({ where: { id: paperTypeId } });
    const priceRule = await prisma.priceRule.findFirst({
      where: { paperTypeId, sizeId, printingSideId },
    });
    const amount = calcOrderAmount(paperType, priceRule, quantity);
    res.json({ amount, availableQuantity: paperType?.availableQuantity || 0 });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
