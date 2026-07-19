const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const { prisma, publicOrder, nextOrderNumber } = require("../lib/prisma");
const { saveUpload } = require("../lib/storage");
const { authCustomer } = require("../middleware/auth");
const { resolveCatalogSelection } = require("../lib/catalog");

const router = express.Router();

const ALLOWED_ARTWORK_MIMES = ["application/pdf", "image/jpeg"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_ARTWORK_MIMES.includes(file.mimetype)) return cb(null, true);
    cb(new Error("INVALID_ARTWORK_TYPE"));
  },
});

const uploadArtworkFields = upload.fields([
  { name: "artwork", maxCount: 1 },
  { name: "artworkBack", maxCount: 1 },
]);

// Runs the artwork upload middleware and converts multer errors (wrong file
// type, too large) into clean JSON responses instead of generic 500s.
function handleArtworkUpload(req, res, next) {
  uploadArtworkFields(req, res, (err) => {
    if (!err) return next();
    if (err.message === "INVALID_ARTWORK_TYPE") {
      return res.status(400).json({ error: "Uploaded file must be a PDF or JPG only." });
    }
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File too large. Maximum size is 25 MB." });
    }
    return res.status(400).json({ error: "File upload failed. Please try again." });
  });
}

function buildUniqueFilename(originalName) {
  const safe = String(originalName || "artwork").replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${Date.now()}_${crypto.randomBytes(4).toString("hex")}_${safe}`;
}

async function persistUploadedFile(file) {
  const filename = buildUniqueFilename(file.originalname);
  await saveUpload({
    buffer: file.buffer,
    filename,
    mime: file.mimetype,
  });
  file.filename = filename;
  return filename;
}

async function persistOrderArtwork(files) {
  const frontFile = files?.artwork?.[0];
  const backFile = files?.artworkBack?.[0];

  if (frontFile) await persistUploadedFile(frontFile);
  if (backFile) await persistUploadedFile(backFile);
}

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
    cutting: String(req.body.cutting || "").trim(),
    printingSide: selection.printingSide.name,
    amount: orderAmount,
    notes: req.body.notes || "",
    transportDetails: String(req.body.transportDetails || "").trim(),
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
    res.json({ orders: orders.map((order) => publicOrder(order, { secureFiles: true })) });
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
    res.json({ order: publicOrder(order, { secureFiles: true }) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", authCustomer, handleArtworkUpload, async (req, res) => {
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

    await persistOrderArtwork(req.files);

    // Superfast +₹400 ONLY when catalog/base price is above ₹3000.
    // Below/equal ₹3000 → never add the charge, even if the flag is sent.
    const SUPERFAST_MIN = 3000;
    const SUPERFAST_CHARGE = 400;
    const wantSuperfast = req.body.superfastDelivery === "true" || req.body.superfastDelivery === true;
    const baseAmount = Number(selection.amount) || 0;
    const superfastEligible = baseAmount > SUPERFAST_MIN;
    const superfastApplied = Boolean(wantSuperfast) && superfastEligible;
    const orderAmount = superfastApplied ? baseAmount + SUPERFAST_CHARGE : baseAmount;

    const clientAmount = Number(amount);
    if (Number.isFinite(clientAmount) && Math.abs(clientAmount - orderAmount) > 1) {
      return res.status(400).json({ error: "Price changed. Please refresh and try again." });
    }

    const account = req.account;
    const hasCreditFromAdmin = Number(account.creditLimit) > 0;
    const availableCredit = hasCreditFromAdmin
      ? Math.max(0, account.creditLimit - account.usedCredit)
      : 0;
    const canUseCredit = useCredit === "true" || useCredit === true;
    const hasEnoughFunds = hasCreditFromAdmin && canUseCredit && availableCredit >= orderAmount;

    const orderFields = buildOrderPayload(selection, req, orderAmount);
    if (superfastApplied) {
      const note = String(orderFields.notes || "").trim();
      orderFields.notes = note
        ? `${note} | SUPERFAST DELIVERY (+₹${SUPERFAST_CHARGE})`
        : `SUPERFAST DELIVERY (+₹${SUPERFAST_CHARGE})`;
    }

    if (!hasEnoughFunds) {
      const shortfall = hasCreditFromAdmin
        ? Math.max(0, orderAmount - availableCredit)
        : orderAmount;
      return res.status(402).json({
        error: hasCreditFromAdmin
          ? "Insufficient credit. Payment required."
          : "Payment required for this order.",
        shortfall,
        availableCredit,
        totalAvailable: availableCredit,
        orderAmount,
        hasCreditFromAdmin,
        pendingOrderData: {
          ...orderFields,
          paperTypeId,
          sizeId,
          printingSideId,
        },
      });
    }

    const newOutstanding = account.previousOutstanding + orderAmount;

    const orderNumber = await nextOrderNumber();
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          accountId: account.id,
          orderNumber,
          ...orderFields,
          status: "PAYMENT_VERIFIED",
          paymentStatus: "VERIFIED",
          paidWithCredit: true,
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
          previousOutstanding: newOutstanding,
        },
      });

      await tx.ledgerEntry.create({
        data: {
          accountId: account.id,
          label: `Order ${orderNumber} - ${orderFields.product}`,
          amount: orderAmount,
          debit: orderAmount,
          credit: 0,
          outstandingAfter: newOutstanding,
          balanceAfter: account.balance,
          oldOutstandingBefore: account.oldOutstanding,
        },
      });

      return created;
    });

    res.status(201).json({
      order: publicOrder(order, { secureFiles: true }),
      message: `Order confirmed. ₹${orderAmount.toLocaleString("en-IN")} has been utilized from your available credit limit.`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
