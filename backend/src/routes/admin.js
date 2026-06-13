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

      await tx.ledgerEntry.create({
        data: {
          accountId: account.id,
          label: `Order ${orderNumber}`,
          amount: order.amount,
          debit: order.amount,
          outstandingAfter: account.previousOutstanding,
          balanceAfter: account.balance + request.amount,
          oldOutstandingBefore: account.oldOutstanding,
        },
      });

      return order;
    });
  }

  const newBalance = account.balance + request.amount;
  const newOutstanding =
    request.type === "OUTSTANDING_PAYMENT"
      ? Math.max(0, account.previousOutstanding - request.amount)
      : account.previousOutstanding;

  const receiptNumber = await nextReceiptNumber();

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
        label:
          request.type === "ORDER_PAYMENT"
            ? "Order Payment"
            : request.type === "OUTSTANDING_PAYMENT"
              ? "Outstanding Payment"
              : "Wallet Top-up",
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
    })),
  });
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
    return res.status(400).json({ error: "LR number is required to dispatch." });
  }

  const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Order not found." });
  if (existing.status === "DISPATCHED") {
    return res.status(400).json({ error: "Order is already dispatched." });
  }
  if (existing.status === "COMPLETED") {
    return res.status(400).json({ error: "Completed orders cannot be dispatched again." });
  }

  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: {
      lrNumber: lr,
      transportDetails: transportDetails || "",
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

router.get("/ledger/:accountId", authAdmin, async (req, res) => {
  const account = await prisma.account.findUnique({ where: { id: req.params.accountId } });
  if (!account) return res.status(404).json({ error: "Account not found." });

  const entries = await prisma.ledgerEntry.findMany({
    where: { accountId: account.id },
    orderBy: { entryDate: "desc" },
  });

  const orders = await prisma.order.findMany({
    where: { accountId: account.id },
    orderBy: { createdAt: "desc" },
  });

  res.json({ account: publicAccount(account), ledgerEntries: entries, orders });
});

module.exports = router;
