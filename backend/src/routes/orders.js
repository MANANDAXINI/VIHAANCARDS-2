const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const crypto = require("crypto");
const { prisma, publicOrder, nextOrderNumber } = require("../lib/prisma");
const { authCustomer } = require("../middleware/auth");
const { resolveCatalogSelection } = require("../lib/catalog");

const router = express.Router();
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, "../../uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}_${crypto.randomBytes(4).toString("hex")}_${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
});

function buildOrderPayload(selection, req, orderAmount) {
  return {
    title: req.body.title || "",
    product: req.body.product || "LEAFLET / PAMPLET",
    paperGsm: selection.paperType.name,
    size: selection.size.name,
    quantity: String(selection.quantity),
    finish: req.body.finish || "",
    printingSide: selection.printingSide.name,
    amount: orderAmount,
    notes: req.body.notes || "",
    artworkName: req.file.originalname,
    artworkPath: req.file.filename,
    artworkMime: req.file.mimetype,
  };
}

router.get("/my-orders", authCustomer, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { accountId: req.account.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ orders: orders.map(publicOrder) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", authCustomer, async (req, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, accountId: req.account.id },
    });
    if (!order) return res.status(404).json({ error: "Order not found." });
    res.json({ order: publicOrder(order) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", authCustomer, upload.single("artwork"), async (req, res) => {
  try {
    const { paperTypeId, sizeId, printingSideId, quantity, amount, useCredit } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "Artwork file is required." });
    }

    let selection;
    try {
      selection = await resolveCatalogSelection({ paperTypeId, sizeId, printingSideId, quantity });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    const orderAmount = selection.amount;
    const clientAmount = Number(amount);
    if (Number.isFinite(clientAmount) && Math.abs(clientAmount - orderAmount) > 1) {
      return res.status(400).json({ error: "Price changed. Please refresh and try again." });
    }

    const account = req.account;
    const availableCredit = Math.max(0, account.creditLimit - account.usedCredit);
    const canUseCredit = useCredit === "true" || useCredit === true;
    const hasEnoughCredit = canUseCredit && availableCredit >= orderAmount;

    const orderFields = buildOrderPayload(selection, req, orderAmount);

    if (!hasEnoughCredit) {
      const shortfall = orderAmount - (canUseCredit ? availableCredit : 0);
      return res.status(402).json({
        error: "Insufficient credit. Payment required.",
        shortfall: Math.max(shortfall, orderAmount),
        availableCredit,
        orderAmount,
        pendingOrderData: {
          ...orderFields,
          paperTypeId,
          sizeId,
          printingSideId,
        },
      });
    }

    const orderNumber = await nextOrderNumber();
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          accountId: account.id,
          orderNumber,
          ...orderFields,
          status: "PAYMENT_VERIFIED",
          paymentStatus: "VERIFIED",
        },
      });

      await tx.paperType.update({
        where: { id: paperTypeId },
        data: { availableQuantity: { decrement: selection.quantity } },
      });

      await tx.account.update({
        where: { id: account.id },
        data: { usedCredit: { increment: orderAmount } },
      });

      await tx.ledgerEntry.create({
        data: {
          accountId: account.id,
          label: `Order ${orderNumber}`,
          amount: orderAmount,
          debit: orderAmount,
          outstandingAfter: account.previousOutstanding,
          balanceAfter: account.balance,
          oldOutstandingBefore: account.oldOutstanding,
        },
      });

      return created;
    });

    res.status(201).json({ order: publicOrder(order) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
