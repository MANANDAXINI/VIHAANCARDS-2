const express = require("express");
const { prisma, publicAccount, publicOrder, nextOrderNumber, nextReceiptNumber } = require("../lib/prisma");
const { authAdmin } = require("../middleware/auth");

const router = express.Router();

router.get("/accounts/pending", authAdmin, async (_req, res) => {
  const accounts = await prisma.account.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
  res.json({ accounts: accounts.map(publicAccount) });
});

router.get("/accounts", authAdmin, async (_req, res) => {
  const accounts = await prisma.account.findMany({
    orderBy: { createdAt: "desc" },
  });
  res.json({ accounts: accounts.map(publicAccount) });
});

router.put("/accounts/:id/role", authAdmin, async (req, res) => {
  const { role } = req.body;
  if (!["CUSTOMER", "ADMIN", "BOTH"].includes(role)) {
    return res.status(400).json({ error: "Role must be CUSTOMER, ADMIN, or BOTH." });
  }

  const account = await prisma.account.update({
    where: { id: req.params.id },
    data: { role },
  });
  res.json({ account: publicAccount(account) });
});

router.put("/accounts/:id/approve", authAdmin, async (req, res) => {
  const account = await prisma.account.update({
    where: { id: req.params.id },
    data: { status: "APPROVED" },
  });
  res.json({ account: publicAccount(account) });
});

router.put("/accounts/:id/credit", authAdmin, async (req, res) => {
  const { creditLimit, previousOutstanding, balance } = req.body;
  const account = await prisma.account.update({
    where: { id: req.params.id },
    data: {
      creditLimit: creditLimit !== undefined ? Number(creditLimit) : undefined,
      previousOutstanding: previousOutstanding !== undefined ? Number(previousOutstanding) : undefined,
      oldOutstanding: previousOutstanding !== undefined ? Number(previousOutstanding) : undefined,
      balance: balance !== undefined ? Number(balance) : undefined,
    },
  });
  res.json({ account: publicAccount(account) });
});

router.post("/accounts/:id/payment", authAdmin, async (req, res) => {
  const { amount, label, receivedDate } = req.body;
  const payment = Number(amount);
  if (!Number.isFinite(payment) || payment <= 0) {
    return res.status(400).json({ error: "Valid payment amount required." });
  }

  const account = await prisma.account.findUnique({ where: { id: req.params.id } });
  if (!account) return res.status(404).json({ error: "Account not found." });

  const receiptNumber = await nextReceiptNumber();
  const newBalance = account.balance + payment;
  const newOutstanding = Math.max(0, account.previousOutstanding - payment);

  const [updated, entry] = await prisma.$transaction([
    prisma.account.update({
      where: { id: account.id },
      data: {
        balance: newBalance,
        previousOutstanding: newOutstanding,
      },
    }),
    prisma.ledgerEntry.create({
      data: {
        accountId: account.id,
        label: label || "Payment Received",
        amount: payment,
        credit: payment,
        oldOutstandingBefore: account.oldOutstanding,
        outstandingAfter: newOutstanding,
        balanceAfter: newBalance,
        receiptNumber,
        entryDate: receivedDate ? new Date(receivedDate) : new Date(),
      },
    }),
  ]);

  res.json({ account: publicAccount(updated), entry });
});

router.get("/wallet-requests", authAdmin, async (_req, res) => {
  const requests = await prisma.walletRequest.findMany({
    include: { account: true, pendingOrder: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ requests });
});

router.put("/wallet-requests/:id/approve", authAdmin, async (req, res) => {
  const request = await prisma.walletRequest.findUnique({
    where: { id: req.params.id },
    include: { account: true },
  });
  if (!request || request.status !== "PENDING") {
    return res.status(404).json({ error: "Pending request not found." });
  }

  const account = request.account;
  let createdOrder = null;

  if (request.type === "ORDER_PAYMENT" && request.pendingOrderData) {
    const data = request.pendingOrderData;
    const orderNumber = await nextOrderNumber();
    const qty = Number(data.quantity);

    if (data.paperTypeId && Number.isFinite(qty) && qty > 0) {
      const paperType = await prisma.paperType.findUnique({ where: { id: data.paperTypeId } });
      if (!paperType || qty > paperType.availableQuantity) {
        return res.status(400).json({ error: "Insufficient paper stock for this order." });
      }
    }

    createdOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          accountId: account.id,
          orderNumber,
          title: data.title || "",
          product: data.product || "LEAFLET / PAMPLET",
          paperGsm: data.paperGsm,
          size: data.size,
          quantity: data.quantity,
          finish: data.finish || "",
          printingSide: data.printingSide,
          amount: Number(data.amount),
          notes: data.notes || "",
          artworkName: data.artworkName,
          artworkPath: data.artworkPath,
          artworkMime: data.artworkMime,
          artworkBackName: data.artworkBackName || null,
          artworkBackPath: data.artworkBackPath || null,
          artworkBackMime: data.artworkBackMime || null,
          status: "PAYMENT_VERIFIED",
          paymentStatus: "VERIFIED",
        },
      });

      if (data.paperTypeId && Number.isFinite(qty) && qty > 0) {
        await tx.paperType.update({
          where: { id: data.paperTypeId },
          data: { availableQuantity: { decrement: qty } },
        });
      }

      await tx.account.update({
        where: { id: account.id },
        data: { usedCredit: { increment: Number(data.amount) } },
      });

      await tx.ledgerEntry.create({
        data: {
          accountId: account.id,
          label: `Order ${orderNumber} - ${order.product}`,
          amount: order.amount,
          debit: order.amount,
          outstandingAfter: account.previousOutstanding + order.amount,
          balanceAfter: account.balance,
          oldOutstandingBefore: account.oldOutstanding,
        },
      });

      return order;
    });
  }

  const afterOrderOutstanding =
    createdOrder ? account.previousOutstanding + Number(createdOrder.amount) : account.previousOutstanding;
  const newBalance = account.balance + request.amount;
  const newOutstanding =
    request.type === "OUTSTANDING_PAYMENT"
      ? Math.max(0, account.previousOutstanding - request.amount)
      : createdOrder
        ? Math.max(0, afterOrderOutstanding - request.amount)
        : account.previousOutstanding;

  const receiptNumber = await nextReceiptNumber();

  const paymentLabel =
    createdOrder?.orderNumber
      ? `Payment Received against ${createdOrder.orderNumber} Receipt No: ${receiptNumber}`
      : request.type === "ORDER_PAYMENT"
        ? `Payment Received Receipt No: ${receiptNumber}`
        : request.type === "OUTSTANDING_PAYMENT"
          ? `Outstanding Payment Receipt No: ${receiptNumber}`
          : `Wallet Top-up Receipt No: ${receiptNumber}`;

  const [updatedAccount, updatedRequest] = await prisma.$transaction([
    prisma.account.update({
      where: { id: account.id },
      data: {
        balance: newBalance,
        previousOutstanding: newOutstanding,
      },
    }),
    prisma.walletRequest.update({
      where: { id: request.id },
      data: { status: "APPROVED" },
    }),
    prisma.ledgerEntry.create({
      data: {
        accountId: account.id,
        label: paymentLabel,
        amount: request.amount,
        credit: request.amount,
        oldOutstandingBefore: account.oldOutstanding,
        outstandingAfter: newOutstanding,
        balanceAfter: newBalance,
        receiptNumber,
      },
    }),
  ]);

  res.json({
    request: updatedRequest,
    account: publicAccount(updatedAccount),
    order: createdOrder ? publicOrder(createdOrder) : null,
  });
});

router.put("/wallet-requests/:id/reject", authAdmin, async (req, res) => {
  const request = await prisma.walletRequest.update({
    where: { id: req.params.id },
    data: { status: "REJECTED" },
  });
  res.json({ request });
});

router.get("/orders", authAdmin, async (_req, res) => {
  const orders = await prisma.order.findMany({
    include: { account: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({
    orders: orders.map((order) => ({
      ...publicOrder(order),
      customerName: order.account.name,
      business: order.account.business,
      customerCity: order.account.address,
      customerPhone: order.account.phone,
    })),
  });
});

router.put("/orders/:id/proceed-printing", authAdmin, async (req, res) => {
  const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Order not found." });
  if (existing.status !== "PAYMENT_VERIFIED") {
    return res.status(400).json({ error: "Only payment-verified orders can proceed to printing." });
  }

  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { status: "IN_PRINTING" },
  });
  res.json({ order: publicOrder(order) });
});

router.put("/orders/:id/mark-artwork", authAdmin, async (req, res) => {
  const { side } = req.body;
  if (!["front", "back"].includes(side)) {
    return res.status(400).json({ error: "Side must be front or back." });
  }

  const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Order not found." });

  const data = side === "back" ? { artworkBackDownloaded: true } : { artworkDownloaded: true };
  const order = await prisma.order.update({
    where: { id: req.params.id },
    data,
  });
  res.json({ order: publicOrder(order) });
});

router.put("/orders/:id/status", authAdmin, async (req, res) => {
  const { status, paymentStatus } = req.body;
  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: {
      status: status || undefined,
      paymentStatus: paymentStatus || undefined,
    },
  });
  res.json({ order: publicOrder(order) });
});

router.put("/orders/:id/dispatch", authAdmin, async (req, res) => {
  const { lrNumber, transportDetails, dispatchDate } = req.body;
  const lr = String(lrNumber || "").trim();
  if (!lr) {
    return res.status(400).json({ error: "LR number is required." });
  }

  const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Order not found." });
  if (existing.status === "COMPLETED") {
    return res.status(400).json({ error: "Completed orders cannot be updated." });
  }
  if (!["IN_PRINTING", "PAYMENT_VERIFIED", "DISPATCHED"].includes(existing.status)) {
    return res.status(400).json({ error: "Order must proceed to printing before dispatch." });
  }

  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: {
      lrNumber: lr,
      transportDetails: String(transportDetails || "").trim(),
      dispatchDate: dispatchDate ? new Date(dispatchDate) : new Date(),
      status: "DISPATCHED",
    },
  });
  res.json({ order: publicOrder(order) });
});

router.put("/orders/:id/deliver", authAdmin, async (req, res) => {
  const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Order not found." });
  if (existing.status !== "DISPATCHED") {
    return res.status(400).json({ error: "Only dispatched orders can be marked delivered." });
  }

  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { status: "COMPLETED" },
  });
  res.json({ order: publicOrder(order) });
});

function istDateString(date = new Date()) {
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function istDayRange(dateStr) {
  const start = new Date(`${dateStr}T00:00:00+05:30`);
  const end = new Date(`${dateStr}T23:59:59.999+05:30`);
  return { start, end };
}

router.get("/day-book", authAdmin, async (req, res) => {
  const dateStr = String(req.query.date || "").trim() || istDateString();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return res.status(400).json({ error: "Invalid date. Use YYYY-MM-DD." });
  }

  const { start, end } = istDayRange(dateStr);
  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: start, lte: end } },
    include: { account: true },
    orderBy: { createdAt: "desc" },
  });

  const totalAmount = orders.reduce((sum, order) => sum + (order.amount || 0), 0);
  const totalQuantity = orders.reduce((sum, order) => sum + (Number(order.quantity) || 0), 0);

  res.json({
    date: dateStr,
    orderCount: orders.length,
    totalAmount,
    totalQuantity,
    orders: orders.map((order) => ({
      ...publicOrder(order),
      customerName: order.account.name,
      business: order.account.business,
    })),
  });
});

router.get("/ledger/:accountId", authAdmin, async (req, res) => {
  const account = await prisma.account.findUnique({ where: { id: req.params.accountId } });
  if (!account) return res.status(404).json({ error: "Account not found." });

  const fromDate = String(req.query.fromDate || "").trim();
  const toDate = String(req.query.toDate || "").trim();
  const where = { accountId: account.id };

  if (fromDate || toDate) {
    where.entryDate = {};
    if (/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) {
      where.entryDate.gte = new Date(`${fromDate}T00:00:00+05:30`);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
      where.entryDate.lte = new Date(`${toDate}T23:59:59.999+05:30`);
    }
  }

  const entries = await prisma.ledgerEntry.findMany({
    where,
    orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }],
  });

  const totalJobOutstanding = entries.reduce((sum, entry) => sum + (entry.debit || 0), 0);
  const totalPaymentReceived = entries.reduce((sum, entry) => sum + (entry.credit || 0), 0);
  const finalBalance = entries.length
    ? entries[entries.length - 1].outstandingAfter
    : account.previousOutstanding;

  res.json({
    account: publicAccount(account),
    ledgerEntries: entries,
    summary: {
      totalJobOutstanding,
      totalPaymentReceived,
      finalBalance,
    },
  });
});

module.exports = router;
