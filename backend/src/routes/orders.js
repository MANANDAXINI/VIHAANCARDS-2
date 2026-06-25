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

function needsBackUpload(sideName) {
  const n = String(sideName || "").toLowerCase();
  return (n.includes("front") && n.includes("back")) || n.includes("both") || n.includes("double");
}

function buildOrderPayload(selection, req, orderAmount) {
  const frontFile = req.files?.artwork?.[0] || req.file;
  const backFile = req.files?.artworkBack?.[0];

  const payload = {
    title: req.body.title || "",
    product: req.body.product || "LEAFLET / PAMPLET",
    paperGsm: selection.paperType.name,
    size: selection.size.name,
    quantity: String(selection.quantity),
    finish: req.body.finish || "",
    printingSide: selection.printingSide.name,
    amount: orderAmount,
    notes: req.body.notes || "",
    artworkName: frontFile.originalname,
    artworkPath: frontFile.filename,
    artworkMime: frontFile.mimetype,
  };

  if (backFile) {
    payload.artworkBackName = backFile.originalname;
    payload.artworkBackPath = backFile.filename;
    payload.artworkBackMime = backFile.mimetype;
  }

  return payload;
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

router.post("/", authCustomer, upload.fields([
  { name: "artwork", maxCount: 1 },
  { name: "artworkBack", maxCount: 1 },
]), async (req, res) => {
  try {
    const { paperTypeId, sizeId, printingSideId, quantity, amount, useCredit } = req.body;
    const frontFile = req.files?.artwork?.[0];

    if (!frontFile) {
      return res.status(400).json({ error: "Front artwork file is required." });
    }

    let selection;
    try {
      selection = await resolveCatalogSelection({ paperTypeId, sizeId, printingSideId, quantity });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    if (needsBackUpload(selection.printingSide.name) && !req.files?.artworkBack?.[0]) {
      return res.status(400).json({ error: "Back artwork file is required for double-sided printing." });
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
        data: {
          usedCredit: { increment: orderAmount },
          previousOutstanding: { increment: orderAmount },
        },
      });

      await tx.ledgerEntry.create({
        data: {
          accountId: account.id,
          label: `Order ${orderNumber} - ${orderFields.product}`,
          amount: orderAmount,
          debit: orderAmount,
          outstandingAfter: account.previousOutstanding + orderAmount,
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
