const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { prisma, publicOrder } = require("../lib/prisma");
const { authAdmin } = require("../middleware/auth");

const router = express.Router();
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, "../../uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, _file, cb) => cb(null, `payment-qr-${Date.now()}.jpg`),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files allowed."));
  },
});

function crudRoutes(modelName, label) {
  const model = prisma[modelName];

  router.get(`/${label}`, authAdmin, async (_req, res) => {
    const items = await model.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
    res.json({ items });
  });

  router.post(`/${label}`, authAdmin, async (req, res) => {
    const { name, availableQuantity, ratePerThousand, active, sortOrder } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Name is required." });

    const data = {
      name: name.trim(),
      active: active !== false,
      sortOrder: Number(sortOrder) || 0,
    };

    if (modelName === "paperType") {
      data.availableQuantity = Number(availableQuantity) || 0;
      data.ratePerThousand = Number(ratePerThousand) || 0;
    }

    const item = await model.create({ data });
    res.status(201).json({ item });
  });

  router.put(`/${label}/:id`, authAdmin, async (req, res) => {
    const { name, availableQuantity, ratePerThousand, active, sortOrder } = req.body;
    const data = {
      ...(name !== undefined && { name: name.trim() }),
      ...(active !== undefined && { active }),
      ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
    };

    if (modelName === "paperType") {
      if (availableQuantity !== undefined) data.availableQuantity = Number(availableQuantity);
      if (ratePerThousand !== undefined) data.ratePerThousand = Number(ratePerThousand);
    }

    const item = await model.update({ where: { id: req.params.id }, data });
    res.json({ item });
  });

  router.delete(`/${label}/:id`, authAdmin, async (req, res) => {
    await model.delete({ where: { id: req.params.id } });
    res.json({ message: "Deleted." });
  });
}

crudRoutes("paperType", "paper-types");
crudRoutes("paperSize", "sizes");
crudRoutes("printingSideOption", "printing-sides");

router.get("/paper-types/:id/history", authAdmin, async (req, res) => {
  const paper = await prisma.paperType.findUnique({ where: { id: req.params.id } });
  if (!paper) return res.status(404).json({ error: "Paper type not found." });

  const orders = await prisma.order.findMany({
    where: { paperGsm: paper.name },
    include: { account: true },
    orderBy: { createdAt: "desc" },
  });

  const totalQuantityIssued = orders.reduce((sum, order) => sum + (Number(order.quantity) || 0), 0);

  res.json({
    paperType: paper,
    totalOrders: orders.length,
    totalQuantityIssued,
    history: orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      customerName: order.account.name,
      business: order.account.business,
      phone: order.account.phone?.startsWith("g-") ? "" : order.account.phone,
      quantity: order.quantity,
      size: order.size,
      printingSide: order.printingSide,
      amount: order.amount,
      status: order.status,
    })),
  });
});

// Price rules
router.get("/price-rules", authAdmin, async (_req, res) => {
  const items = await prisma.priceRule.findMany({
    include: { paperType: true, size: true, printingSide: true },
  });
  res.json({ items });
});

router.post("/price-rules", authAdmin, async (req, res) => {
  const { paperTypeId, sizeId, printingSideId, ratePerThousand } = req.body;
  const item = await prisma.priceRule.create({
    data: {
      paperTypeId,
      sizeId,
      printingSideId,
      ratePerThousand: Number(ratePerThousand) || 0,
    },
  });
  res.status(201).json({ item });
});

router.put("/price-rules/:id", authAdmin, async (req, res) => {
  const item = await prisma.priceRule.update({
    where: { id: req.params.id },
    data: { ratePerThousand: Number(req.body.ratePerThousand) || 0 },
  });
  res.json({ item });
});

router.delete("/price-rules/:id", authAdmin, async (req, res) => {
  await prisma.priceRule.delete({ where: { id: req.params.id } });
  res.json({ message: "Deleted." });
});

// QR CRUD
router.get("/qr", authAdmin, async (_req, res) => {
  const qr = await prisma.paymentQr.findUnique({ where: { id: 1 } });
  res.json({
    qr: qr
      ? { ...qr, imageUrl: qr.imagePath ? `/uploads/${qr.imagePath}` : null }
      : null,
  });
});

router.post("/qr", authAdmin, upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Image file required." });

  const existing = await prisma.paymentQr.findUnique({ where: { id: 1 } });
  if (existing?.imagePath) {
    const oldPath = path.join(uploadDir, existing.imagePath);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  const qr = await prisma.paymentQr.upsert({
    where: { id: 1 },
    update: { imagePath: req.file.filename, updatedAt: new Date() },
    create: { id: 1, imagePath: req.file.filename },
  });

  res.json({ qr: { ...qr, imageUrl: `/uploads/${qr.imagePath}` } });
});

router.delete("/qr", authAdmin, async (_req, res) => {
  const existing = await prisma.paymentQr.findUnique({ where: { id: 1 } });
  if (existing?.imagePath) {
    const oldPath = path.join(uploadDir, existing.imagePath);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }
  await prisma.paymentQr.upsert({
    where: { id: 1 },
    update: { imagePath: "", updatedAt: new Date() },
    create: { id: 1, imagePath: "" },
  });
  res.json({ message: "QR removed." });
});

module.exports = router;
