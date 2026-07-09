const express = require("express");
const { prisma, publicCustomerAccount, publicOrder } = require("../lib/prisma");
const { summarizeAccountLedger } = require("../lib/ledger");
const { authCustomer } = require("../middleware/auth");

const router = express.Router();

router.get("/ledger", authCustomer, async (req, res) => {
  try {
    const entries = await prisma.ledgerEntry.findMany({
      where: { accountId: req.account.id },
      orderBy: { entryDate: "asc" },
    });

    const orders = await prisma.order.findMany({
      where: { accountId: req.account.id },
      orderBy: { createdAt: "desc" },
    });

    const pendingPayments = await prisma.walletRequest.findMany({
      where: {
        accountId: req.account.id,
        type: "ORDER_PAYMENT",
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
    });

    const pendingOutstandingPayments = await prisma.walletRequest.findMany({
      where: {
        accountId: req.account.id,
        type: "OUTSTANDING_PAYMENT",
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
    });

    const account = req.account;
    const creditLimit = Number(account.creditLimit || 0);
    const usedCredit = Number(account.usedCredit || 0);
    const summary = {
      ...summarizeAccountLedger(entries, account, pendingPayments),
      creditLimit,
      usedCredit,
      availableCredit: Math.max(0, creditLimit - usedCredit),
    };

    res.json({
      account: publicCustomerAccount(account),
      summary,
      ledgerEntries: entries,
      orders: orders.map((order) => publicOrder(order, { secureFiles: true })),
      pendingPayments,
      pendingOutstandingPayments,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/wallet-request", authCustomer, async (req, res) => {
  try {
    const { amount, type, pendingOrderData, note } = req.body;
    const paymentAmount = Number(amount);

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ error: "Please enter a valid amount." });
    }

    let walletType = "WALLET_TOPUP";
    if (type === "outstanding") walletType = "OUTSTANDING_PAYMENT";
    if (type === "order" || pendingOrderData) walletType = "ORDER_PAYMENT";

    if (walletType === "OUTSTANDING_PAYMENT") {
      const pendingOutstanding = await prisma.walletRequest.findMany({
        where: {
          accountId: req.account.id,
          type: "OUTSTANDING_PAYMENT",
          status: "PENDING",
        },
        select: { amount: true },
      });
      const pendingTotal = pendingOutstanding.reduce(
        (sum, request) => sum + Number(request.amount || 0),
        0
      );
      const payable = Math.max(0, Number(req.account.previousOutstanding || 0) - pendingTotal);
      if (paymentAmount > payable) {
        return res.status(400).json({
          error: `Payment cannot exceed remaining outstanding of Rs. ${payable.toLocaleString("en-IN")}.`,
        });
      }
    }

    const request = await prisma.walletRequest.create({
      data: {
        accountId: req.account.id,
        amount: paymentAmount,
        type: walletType,
        pendingOrderData: pendingOrderData || null,
        note: note || "",
      },
    });

    res.status(201).json({
      request,
      message: "Payment request submitted. Send screenshot to 7507543214 for confirmation.",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/wallet-requests", authCustomer, async (req, res) => {
  try {
    const requests = await prisma.walletRequest.findMany({
      where: { accountId: req.account.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ requests });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
