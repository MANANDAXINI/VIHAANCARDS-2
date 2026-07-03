const express = require("express");
const multer = require("multer");
const { prisma, publicAccount, publicOrder, nextOrderNumber, nextReceiptNumber } = require("../lib/prisma");
const { pendingOrderTotal, summarizeAccountLedger } = require("../lib/ledger");
const { parseParcelRowsFromWorkbook, buildDispatchUpdateData, parseExcelDate } = require("../lib/parcel-import");
const { normalizeOrderNumber } = require("../lib/job-folder-parse");
const { authAdmin } = require("../middleware/auth");

const router = express.Router();
const secureOrder = (order) => publicOrder(order, { secureFiles: true });

function adminOrderPayload(order) {
  const account = order.account;
  return {
    ...secureOrder(order),
    customerName: account?.name,
    business: account?.business,
    customerCity: account?.address,
    customerPhone: account?.phone,
  };
}
const parcelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const name = String(file.originalname || "").toLowerCase();
    const allowed =
      name.endsWith(".xlsx")
      || name.endsWith(".xls")
      || name.endsWith(".csv")
      || file.mimetype.includes("spreadsheet")
      || file.mimetype.includes("excel")
      || file.mimetype === "text/csv";
    if (!allowed) {
      cb(new Error("Upload an Excel file (.xlsx, .xls) or CSV."));
      return;
    }
    cb(null, true);
  },
});

function computeLedgerOpening(account, entries) {
  const net = entries.reduce(
    (sum, entry) => sum + Number(entry.debit || 0) - Number(entry.credit || 0),
    0
  );
  return Number(account?.previousOutstanding || 0) - net;
}

// Recomputes running outstanding balances for every ledger entry of an account
// (ordered by date) starting from a fixed opening balance, then syncs the
// account's outstanding + used credit to the final running balance.
async function recomputeLedgerFromOpening(tx, accountId, opening) {
  const account = await tx.account.findUnique({ where: { id: accountId } });
  if (!account) return 0;

  const entries = await tx.ledgerEntry.findMany({
    where: { accountId },
    orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }],
  });

  let running = Number(opening) || 0;
  for (const entry of entries) {
    const before = running;
    running += Number(entry.debit || 0) - Number(entry.credit || 0);
    await tx.ledgerEntry.update({
      where: { id: entry.id },
      data: { oldOutstandingBefore: before, outstandingAfter: running },
    });
  }

  const finalOutstanding = running;
  const data = {
    previousOutstanding: finalOutstanding,
    oldOutstanding: finalOutstanding,
  };
  if (Number(account.creditLimit) > 0) {
    data.usedCredit = Math.max(0, Math.min(account.creditLimit, finalOutstanding));
  }
  await tx.account.update({ where: { id: accountId }, data });
  return finalOutstanding;
}

router.get("/nav-counts", authAdmin, async (_req, res) => {
  const now = new Date();
  const [pendingAccounts, pendingPayments, pendingPasswordResets, orders] = await Promise.all([
    prisma.account.count({ where: { status: "PENDING" } }),
    prisma.walletRequest.count({ where: { status: "PENDING" } }),
    prisma.passwordReset.count({
      where: { usedAt: null, expiresAt: { gt: now } },
    }),
    prisma.order.findMany({ select: { status: true } }),
  ]);

  const pendingOrders = orders.filter((order) => !["DISPATCHED", "COMPLETED"].includes(order.status)).length;
  const completedOrders = orders.filter((order) => ["DISPATCHED", "COMPLETED"].includes(order.status)).length;

  res.json({
    counts: {
      accounts: pendingAccounts,
      payments: pendingPayments,
      orders: pendingOrders,
      completedOrders,
      wallet: pendingAccounts + pendingPayments + pendingPasswordResets,
      passwordResets: pendingPasswordResets,
    },
  });
});

router.get("/alert-feed", authAdmin, async (req, res) => {
  const serverTime = new Date();
  const sinceRaw = String(req.query.since || "").trim();
  const hasSince = sinceRaw && !Number.isNaN(Date.parse(sinceRaw));
  const since = hasSince ? new Date(sinceRaw) : null;

  if (!hasSince) {
    return res.json({ serverTime: serverTime.toISOString(), alerts: [] });
  }

  const [orders, paymentRequests] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gt: since } },
      include: { account: { select: { business: true, name: true, phone: true } } },
      orderBy: { createdAt: "asc" },
      take: 50,
    }),
    prisma.walletRequest.findMany({
      where: {
        createdAt: { gt: since },
        status: "PENDING",
        type: "ORDER_PAYMENT",
      },
      include: { account: { select: { business: true, name: true, phone: true } } },
      orderBy: { createdAt: "asc" },
      take: 50,
    }),
  ]);

  const alerts = [
    ...orders.map((order) => {
      const customer = order.account?.business || order.account?.name || "Customer";
      const amount = Number(order.amount || 0).toLocaleString("en-IN");
      return {
        id: `order-${order.id}`,
        type: "NEW_ORDER",
        createdAt: order.createdAt,
        orderNumber: order.orderNumber,
        customer,
        message: `New order ${order.orderNumber} from ${customer} — Rs. ${amount}`,
      };
    }),
    ...paymentRequests.map((request) => {
      const customer = request.account?.business || request.account?.name || "Customer";
      const amount = Number(request.amount || 0).toLocaleString("en-IN");
      const product = request.pendingOrderData?.product || "Order";
      return {
        id: `wallet-${request.id}`,
        type: "ORDER_PAYMENT_PENDING",
        createdAt: request.createdAt,
        customer,
        message: `New job submitted by ${customer} — ${product}, Rs. ${amount} (payment pending approval)`,
      };
    }),
  ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  res.json({
    serverTime: serverTime.toISOString(),
    alerts,
  });
});

router.get("/password-resets", authAdmin, async (_req, res) => {
  const now = new Date();
  const resets = await prisma.passwordReset.findMany({
    where: { usedAt: null, expiresAt: { gt: now } },
    include: {
      account: {
        select: { id: true, name: true, business: true, phone: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  res.json({
    resets: resets.map((reset) => ({
      id: reset.id,
      code: reset.code,
      expiresAt: reset.expiresAt,
      createdAt: reset.createdAt,
      account: reset.account,
    })),
  });
});

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

router.post("/accounts/:id/outstanding", authAdmin, async (req, res) => {
  const amount = Number(req.body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: "Valid outstanding amount required." });
  }

  const account = await prisma.account.findUnique({ where: { id: req.params.id } });
  if (!account) return res.status(404).json({ error: "Account not found." });

  const newOutstanding = account.previousOutstanding + amount;

  const updateData = {
    previousOutstanding: newOutstanding,
    oldOutstanding: newOutstanding,
  };
  if (Number(account.creditLimit) > 0) {
    updateData.usedCredit = account.usedCredit + amount;
  }

  const [updated, entry] = await prisma.$transaction([
    prisma.account.update({
      where: { id: account.id },
      data: updateData,
    }),
    prisma.ledgerEntry.create({
      data: {
        accountId: account.id,
        label: req.body.label || "Outstanding Added",
        amount,
        debit: amount,
        outstandingAfter: newOutstanding,
        balanceAfter: account.balance,
        oldOutstandingBefore: account.oldOutstanding,
      },
    }),
  ]);

  res.json({ account: publicAccount(updated), entry });
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
  const newOutstanding = Math.max(0, account.previousOutstanding - payment);
  const updateData = {
    previousOutstanding: newOutstanding,
  };
  if (Number(account.creditLimit) > 0) {
    updateData.usedCredit = Math.max(0, account.usedCredit - payment);
  }

  const [updated, entry] = await prisma.$transaction([
    prisma.account.update({
      where: { id: account.id },
      data: updateData,
    }),
    prisma.ledgerEntry.create({
      data: {
        accountId: account.id,
        label: label || "Payment Received",
        amount: payment,
        credit: payment,
        oldOutstandingBefore: account.oldOutstanding,
        outstandingAfter: newOutstanding,
        balanceAfter: account.balance,
        receiptNumber,
        entryDate: receivedDate ? new Date(receivedDate) : new Date(),
      },
    }),
  ]);

  res.json({ account: publicAccount(updated), entry });
});

router.post("/accounts/:id/other-charge", authAdmin, async (req, res) => {
  const amount = Number(req.body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: "Valid charge amount required." });
  }

  const account = await prisma.account.findUnique({ where: { id: req.params.id } });
  if (!account) return res.status(404).json({ error: "Account not found." });

  const description = String(req.body.label || "").trim();
  const narration = description ? `Other Charges: ${description}` : "Other Charges";
  const newOutstanding = Number(account.previousOutstanding || 0) + amount;

  const updateData = {
    previousOutstanding: newOutstanding,
    oldOutstanding: newOutstanding,
  };
  if (Number(account.creditLimit) > 0) {
    updateData.usedCredit = account.usedCredit + amount;
  }

  const [updated, entry] = await prisma.$transaction([
    prisma.account.update({ where: { id: account.id }, data: updateData }),
    prisma.ledgerEntry.create({
      data: {
        accountId: account.id,
        label: narration,
        amount,
        debit: amount,
        oldOutstandingBefore: account.previousOutstanding,
        outstandingAfter: newOutstanding,
        balanceAfter: account.balance,
        entryDate: req.body.date ? new Date(req.body.date) : new Date(),
      },
    }),
  ]);

  res.json({ account: publicAccount(updated), entry });
});

router.put("/ledger-entry/:id", authAdmin, async (req, res) => {
  const entry = await prisma.ledgerEntry.findUnique({ where: { id: req.params.id } });
  if (!entry) return res.status(404).json({ error: "Ledger entry not found." });

  const { label, entryDate, debit, credit } = req.body;
  const newDebit = debit !== undefined ? Number(debit) : Number(entry.debit || 0);
  const newCredit = credit !== undefined ? Number(credit) : Number(entry.credit || 0);
  if (!Number.isFinite(newDebit) || newDebit < 0 || !Number.isFinite(newCredit) || newCredit < 0) {
    return res.status(400).json({ error: "Debit and credit must be valid non-negative amounts." });
  }

  const account = await prisma.account.findUnique({ where: { id: entry.accountId } });
  const allEntries = await prisma.ledgerEntry.findMany({ where: { accountId: entry.accountId } });
  const opening = computeLedgerOpening(account, allEntries);

  await prisma.$transaction(async (tx) => {
    await tx.ledgerEntry.update({
      where: { id: entry.id },
      data: {
        label: label !== undefined ? String(label) : undefined,
        entryDate: entryDate ? new Date(entryDate) : undefined,
        debit: newDebit,
        credit: newCredit,
        amount: newDebit || newCredit,
      },
    });
    await recomputeLedgerFromOpening(tx, entry.accountId, opening);
  });

  const updated = await prisma.account.findUnique({ where: { id: entry.accountId } });
  res.json({ account: publicAccount(updated) });
});

router.delete("/ledger-entry/:id", authAdmin, async (req, res) => {
  const entry = await prisma.ledgerEntry.findUnique({ where: { id: req.params.id } });
  if (!entry) return res.status(404).json({ error: "Ledger entry not found." });

  const account = await prisma.account.findUnique({ where: { id: entry.accountId } });
  const allEntries = await prisma.ledgerEntry.findMany({ where: { accountId: entry.accountId } });
  const opening = computeLedgerOpening(account, allEntries);

  await prisma.$transaction(async (tx) => {
    await tx.ledgerEntry.delete({ where: { id: entry.id } });
    await recomputeLedgerFromOpening(tx, entry.accountId, opening);
  });

  const updated = await prisma.account.findUnique({ where: { id: entry.accountId } });
  res.json({ account: publicAccount(updated) });
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

  if (request.type === "ORDER_PAYMENT" && request.pendingOrderData) {
    const data = request.pendingOrderData;
    const orderNumber = await nextOrderNumber();
    const receiptNumber = await nextReceiptNumber();
    const qty = Number(data.quantity);

    if (data.paperTypeId && Number.isFinite(qty) && qty > 0) {
      const paperType = await prisma.paperType.findUnique({ where: { id: data.paperTypeId } });
      if (!paperType || qty > paperType.availableQuantity) {
        return res.status(400).json({ error: "Insufficient paper stock for this order." });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
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

      let runningOutstanding = Number(account.previousOutstanding || 0);
      const openingOutstanding = runningOutstanding;

      runningOutstanding += Number(order.amount);
      await tx.ledgerEntry.create({
        data: {
          accountId: account.id,
          label: `Order ${orderNumber} - ${order.product}`,
          amount: order.amount,
          debit: order.amount,
          credit: 0,
          oldOutstandingBefore: openingOutstanding,
          outstandingAfter: runningOutstanding,
          balanceAfter: account.balance,
        },
      });

      const outstandingAfterJob = runningOutstanding;
      runningOutstanding = Math.max(0, runningOutstanding - Number(request.amount));
      await tx.ledgerEntry.create({
        data: {
          accountId: account.id,
          label: `Payment Received against ${orderNumber} Receipt No: ${receiptNumber}`,
          amount: request.amount,
          debit: 0,
          credit: request.amount,
          oldOutstandingBefore: outstandingAfterJob,
          outstandingAfter: runningOutstanding,
          balanceAfter: account.balance,
          receiptNumber,
        },
      });

      const updatedAccount = await tx.account.update({
        where: { id: account.id },
        data: { previousOutstanding: runningOutstanding },
      });

      const updatedRequest = await tx.walletRequest.update({
        where: { id: request.id },
        data: { status: "APPROVED" },
      });

      return { order, updatedAccount, updatedRequest };
    });

    return res.json({
      request: result.updatedRequest,
      account: publicAccount(result.updatedAccount),
      order: secureOrder(result.order),
    });
  }

  const receiptNumber = await nextReceiptNumber();
  const newOutstanding =
    request.type === "OUTSTANDING_PAYMENT" || request.type === "WALLET_TOPUP"
      ? Math.max(0, account.previousOutstanding - request.amount)
      : account.previousOutstanding;

  const paymentLabel =
    request.type === "ORDER_PAYMENT"
      ? `Payment Received Receipt No: ${receiptNumber}`
      : request.type === "OUTSTANDING_PAYMENT"
        ? `Outstanding Payment Receipt No: ${receiptNumber}`
        : `Wallet Top-up Receipt No: ${receiptNumber}`;

  const accountUpdate = { previousOutstanding: newOutstanding };
  if (Number(account.creditLimit) > 0 && request.type !== "ORDER_PAYMENT") {
    accountUpdate.usedCredit = Math.max(0, account.usedCredit - request.amount);
  }

  const [updatedAccount, updatedRequest] = await prisma.$transaction([
    prisma.account.update({
      where: { id: account.id },
      data: accountUpdate,
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
        oldOutstandingBefore: account.previousOutstanding,
        outstandingAfter: newOutstanding,
        balanceAfter: account.balance,
        receiptNumber,
      },
    }),
  ]);

  res.json({
    request: updatedRequest,
    account: publicAccount(updatedAccount),
    order: null,
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
      ...secureOrder(order),
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
  res.json({ order: secureOrder(order) });
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
  res.json({ order: secureOrder(order) });
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
  res.json({ order: secureOrder(order) });
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
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        lrNumber: lr,
        transportDetails: String(transportDetails || "").trim(),
        dispatchDate: dispatchDate ? new Date(dispatchDate) : existing.dispatchDate || new Date(),
      },
      include: { account: true },
    });
    return res.json({ order: adminOrderPayload(order) });
  }

  if (existing.status === "PRINTING_PROCESS_STARTED") {
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        lrNumber: lr,
        transportDetails: String(transportDetails || "").trim(),
        dispatchDate: dispatchDate ? new Date(dispatchDate) : new Date(),
        status: "DISPATCHED",
      },
      include: { account: true },
    });
    return res.json({ order: adminOrderPayload(order) });
  }

  if (!["IN_PRINTING", "PAYMENT_VERIFIED", "DISPATCHED", "PRINTING_PROCESS_STARTED"].includes(existing.status)) {
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
    include: { account: true },
  });
  res.json({ order: adminOrderPayload(order) });
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
  res.json({ order: secureOrder(order) });
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
      ...secureOrder(order),
      customerName: order.account.name,
      business: order.account.business,
    })),
  });
});

router.get("/accounts/:id/details", authAdmin, async (req, res) => {
  const account = await prisma.account.findUnique({ where: { id: req.params.id } });
  if (!account) return res.status(404).json({ error: "Account not found." });

  const [ledgerEntries, orders, pendingPayments, walletRequests] = await Promise.all([
    prisma.ledgerEntry.findMany({
      where: { accountId: account.id },
      orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }],
    }),
    prisma.order.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.walletRequest.findMany({
      where: {
        accountId: account.id,
        type: "ORDER_PAYMENT",
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.walletRequest.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const summary = summarizeAccountLedger(ledgerEntries, account, pendingPayments);

  res.json({
    account: publicAccount(account),
    ledgerEntries,
    orders: orders.map((order) => secureOrder(order)),
    pendingPayments,
    walletRequests,
    summary,
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

  const summary = summarizeAccountLedger(entries, account);

  res.json({
    account: publicAccount(account),
    ledgerEntries: entries,
    summary,
  });
});

router.get("/outstanding-receivable", authAdmin, async (_req, res) => {
  const accounts = await prisma.account.findMany({
    where: {
      status: "APPROVED",
      role: { in: ["CUSTOMER", "BOTH"] },
    },
    orderBy: [{ business: "asc" }, { name: "asc" }],
  });

  const pendingPayments = await prisma.walletRequest.findMany({
    where: {
      type: "ORDER_PAYMENT",
      status: "PENDING",
    },
    select: {
      accountId: true,
      amount: true,
      pendingOrderData: true,
    },
  });

  const pendingByAccount = pendingPayments.reduce((map, request) => {
    const orderAmount = Number(request.pendingOrderData?.amount || request.amount || 0);
    if (!Number.isFinite(orderAmount) || orderAmount <= 0) return map;
    map.set(request.accountId, (map.get(request.accountId) || 0) + orderAmount);
    return map;
  }, new Map());

  const rows = accounts.map((account) => {
    const pendingAmount = pendingByAccount.get(account.id) || 0;
    const balance = Number(account.previousOutstanding || 0) + pendingAmount;
    return {
      accountId: account.id,
      account: account.business || account.name || "—",
      mobile: account.phone || "",
      balance,
    };
  });

  const grandTotal = rows.reduce((sum, row) => sum + row.balance, 0);
  const asOn = new Date();

  res.json({
    asOn: asOn.toISOString(),
    rows,
    grandTotal,
    totalEntries: rows.length,
  });
});

router.post("/parcel-update/upload", authAdmin, parcelUpload.single("file"), async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ error: "Excel file is required." });
    }

    const rows = parseParcelRowsFromWorkbook(req.file.buffer);
    if (!rows.length) {
      return res.status(400).json({ error: "No parcel rows found in the uploaded file." });
    }

    const results = [];
    let updatedCount = 0;
    let failedCount = 0;

    for (const row of rows) {
      if (!row.orderNumber) {
        failedCount += 1;
        results.push({
          rowNumber: row.rowNumber,
          orderNumber: "",
          status: "failed",
          message: "Order number is missing.",
        });
        continue;
      }

      const order = await prisma.order.findFirst({
        where: { orderNumber: row.orderNumber },
        include: { account: true },
      });

      if (!order) {
        failedCount += 1;
        results.push({
          rowNumber: row.rowNumber,
          orderNumber: row.orderNumber,
          status: "failed",
          message: "Order not found.",
        });
        continue;
      }

      const built = buildDispatchUpdateData(order, row);
      if (built.error) {
        failedCount += 1;
        results.push({
          rowNumber: row.rowNumber,
          orderNumber: row.orderNumber,
          status: "failed",
          message: built.error,
        });
        continue;
      }

      const updated = await prisma.order.update({
        where: { id: order.id },
        data: built.data,
      });

      updatedCount += 1;
      results.push({
        rowNumber: row.rowNumber,
        orderNumber: updated.orderNumber,
        status: "updated",
        customer: order.account?.business || order.account?.name || "—",
        lrNumber: updated.lrNumber,
        transportDetails: updated.transportDetails,
        dispatchDate: updated.dispatchDate,
        orderStatus: updated.status,
      });
    }

    res.json({
      fileName: req.file.originalname,
      totalRows: rows.length,
      updatedCount,
      failedCount,
      results,
    });
  } catch (error) {
    console.error("Parcel upload error:", error);
    res.status(400).json({ error: error.message || "Could not process Excel file." });
  }
});

router.post("/parcel-update/single", authAdmin, async (req, res) => {
  try {
    const orderNumber = normalizeOrderNumber(req.body?.orderNumber);
    const lrNumber = String(req.body?.lrNumber || "").trim();
    const transportDetails = String(req.body?.transportDetails || "").trim();
    const dispatchDate = parseExcelDate(req.body?.dispatchDate);

    if (!orderNumber) {
      return res.status(400).json({ error: "Order number is required." });
    }

    const order = await prisma.order.findFirst({
      where: { orderNumber },
      include: { account: true },
    });

    if (!order) {
      return res.status(404).json({ error: `Order ${orderNumber} not found.` });
    }

    const built = buildDispatchUpdateData(order, {
      lrNumber,
      transportDetails,
      dispatchDate,
    });

    if (built.error) {
      return res.status(400).json({ error: built.error });
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: built.data,
      include: { account: true },
    });

    res.json({
      ...adminOrderPayload(updated),
      customer: updated.account?.business || updated.account?.name || "—",
      orderStatus: updated.status,
    });
  } catch (error) {
    console.error("Single parcel update error:", error);
    res.status(400).json({ error: error.message || "Could not update parcel details." });
  }
});

router.post("/job-update/complete", authAdmin, async (req, res) => {
  const rawNumbers = Array.isArray(req.body?.orderNumbers) ? req.body.orderNumbers : [];
  const orderNumbers = [...new Set(rawNumbers.map((value) => normalizeOrderNumber(value)).filter(Boolean))];

  if (!orderNumbers.length) {
    return res.status(400).json({ error: "No valid PD job IDs found to update." });
  }

  const results = [];
  let updatedCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const orderNumber of orderNumbers) {
    const order = await prisma.order.findFirst({
      where: { orderNumber },
      include: { account: true },
    });

    if (!order) {
      failedCount += 1;
      results.push({
        orderNumber,
        status: "failed",
        message: "Order not found.",
      });
      continue;
    }

    if (order.status === "PRINTING_PROCESS_STARTED" || order.status === "COMPLETED") {
      skippedCount += 1;
      results.push({
        orderNumber,
        status: "skipped",
        customer: order.account?.business || order.account?.name || "—",
        message: "Already marked printing & other process started.",
        orderStatus: order.status,
      });
      continue;
    }

    if (!["PAYMENT_VERIFIED", "IN_PRINTING", "DISPATCHED"].includes(order.status)) {
      failedCount += 1;
      results.push({
        orderNumber,
        status: "failed",
        customer: order.account?.business || order.account?.name || "—",
        message: `Order status ${order.status} cannot be updated.`,
        orderStatus: order.status,
      });
      continue;
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: "PRINTING_PROCESS_STARTED" },
    });

    updatedCount += 1;
    results.push({
      orderNumber: updated.orderNumber,
      status: "updated",
      customer: order.account?.business || order.account?.name || "—",
      message: "Printing & other process started.",
      orderStatus: updated.status,
    });
  }

  res.json({
    totalJobs: orderNumbers.length,
    updatedCount,
    failedCount,
    skippedCount,
    results,
  });
});

module.exports = router;
