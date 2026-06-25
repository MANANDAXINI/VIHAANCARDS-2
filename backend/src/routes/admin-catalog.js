const express = require("express");
const multer = require("multer");
const { prisma, publicOrder } = require("../lib/prisma");
const { uploadDir } = require("../lib/uploads");
const { authAdmin } = require("../middleware/auth");

const router = express.Router();

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
    if (label === "sizes") {
      let quantities = [];
      try {
        quantities = await prisma.quantityOption.findMany({ orderBy: [{ sortOrder: "asc" }, { value: "asc" }] });
      } catch (error) {
        console.warn("quantityOption list failed:", error.message);
      }
      return res.json({ items, quantities });
    }
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

router.get("/quantities", authAdmin, async (_req, res) => {
  try {
    const items = await prisma.quantityOption.findMany({ orderBy: [{ sortOrder: "asc" }, { value: "asc" }] });
    res.json({ items });
  } catch (error) {
    console.error("GET /quantities failed:", error.message);
    res.status(500).json({ error: "Quantity options table not ready. Redeploy backend with latest schema." });
  }
});

router.post("/quantities", authAdmin, async (req, res) => {
  const value = Number(req.body.value);
  if (!Number.isFinite(value) || value <= 0) {
    return res.status(400).json({ error: "Valid quantity value is required." });
  }
  const item = await prisma.quantityOption.create({
    data: {
      value,
      label: String(req.body.label || value).trim(),
      active: req.body.active !== false,
      sortOrder: Number(req.body.sortOrder) || 0,
    },
  });
  res.status(201).json({ item });
});

router.put("/quantities/:id", authAdmin, async (req, res) => {
  const data = {};
  if (req.body.value !== undefined) {
    const value = Number(req.body.value);
    if (!Number.isFinite(value) || value <= 0) {
      return res.status(400).json({ error: "Valid quantity value is required." });
    }
    data.value = value;
  }
  if (req.body.label !== undefined) data.label = String(req.body.label).trim();
  if (req.body.active !== undefined) data.active = req.body.active;
  if (req.body.sortOrder !== undefined) data.sortOrder = Number(req.body.sortOrder) || 0;
  const item = await prisma.quantityOption.update({ where: { id: req.params.id }, data });
  res.json({ item });
});

router.delete("/quantities/:id", authAdmin, async (req, res) => {
  await prisma.quantityOption.delete({ where: { id: req.params.id } });
  res.json({ message: "Deleted." });
});

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
  const { paperTypeId, sizeId, printingSideId, quantity, amount } = req.body;
  const qty = Number(quantity);
  const total = Number(amount);
  if (!paperTypeId || !sizeId || !printingSideId || !Number.isFinite(qty) || qty <= 0) {
    return res.status(400).json({ error: "Paper, size, side, and quantity are required." });
  }
  if (!Number.isFinite(total) || total <= 0) {
    return res.status(400).json({ error: "Valid total amount is required." });
  }

  const item = await prisma.priceRule.upsert({
    where: {
      paperTypeId_sizeId_printingSideId_quantity: {
        paperTypeId,
        sizeId,
        printingSideId,
        quantity: qty,
      },
    },
    update: { amount: total },
    create: {
      paperTypeId,
      sizeId,
      printingSideId,
      quantity: qty,
      amount: total,
    },
  });
  res.status(201).json({ item });
});

router.put("/price-rules/:id", authAdmin, async (req, res) => {
  const data = {};
  if (req.body.amount !== undefined) data.amount = Number(req.body.amount) || 0;
  if (req.body.quantity !== undefined) data.quantity = Number(req.body.quantity) || 0;
  if (req.body.ratePerThousand !== undefined) data.ratePerThousand = Number(req.body.ratePerThousand) || 0;
  const item = await prisma.priceRule.update({
    where: { id: req.params.id },
    data,
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
