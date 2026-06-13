const express = require("express");
const { prisma, publicAccount, nextOrderNumber, nextReceiptNumber } = require("../lib/prisma");
const { authCustomer } = require("../middleware/auth");

const router = express.Router();

router.get("/ledger", authCustomer, async (req, res) => {
  try {
    const entries = await prisma.ledgerEntry.findMany({
      where: { accountId: req.account.id },
      orderBy: { entryDate: "desc" },
    });

    const orders = await prisma.order.findMany({
      where: { accountId: req.account.id },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      account: publicAccount(req.account),
      ledgerEntries: entries,
      orders,
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
