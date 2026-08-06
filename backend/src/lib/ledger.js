const { prisma } = require("./prisma");

function pendingOrderTotal(pendingPayments = []) {
  return pendingPayments.reduce((sum, request) => {
    const amount = Number(request.pendingOrderData?.amount || request.amount || 0);
    return Number.isFinite(amount) && amount > 0 ? sum + amount : sum;
  }, 0);
}

function summarizeAccountLedger(ledgerEntries = [], account = null, pendingPayments = []) {
  const totalBilled = ledgerEntries.reduce((sum, entry) => sum + Number(entry.debit || 0), 0);
  const totalReceived = ledgerEntries.reduce((sum, entry) => sum + Number(entry.credit || 0), 0);
  const previousOutstanding = Number(account?.previousOutstanding || 0);
  const pendingOrderAmount = pendingOrderTotal(pendingPayments);
  // Negative previousOutstanding = advance credit still on the account.
  const receivableBalance = previousOutstanding + pendingOrderAmount;
  const lastAfter = ledgerEntries.length
    ? Number(ledgerEntries[ledgerEntries.length - 1].outstandingAfter || 0)
    : previousOutstanding;

  return {
    totalBilled,
    totalReceived,
    previousOutstanding,
    pendingOrderAmount,
    receivableBalance,
    currentOutstanding: receivableBalance,
    // Keep in sync with account outstanding (supports advance credit < 0).
    ledgerNetOutstanding: previousOutstanding,
    // Backward-compatible aliases (lifetime totals, not current due)
    totalJobOutstanding: totalBilled,
    totalPaymentReceived: totalReceived,
    finalBalance: lastAfter,
    advanceBalance: previousOutstanding < 0 ? Math.abs(previousOutstanding) : 0,
  };
}

function sortLedgerEntriesAsc(entries = []) {
  return [...entries].sort((a, b) => {
    const dateDelta = new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime();
    if (dateDelta !== 0) return dateDelta;
    const createdDelta = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    if (createdDelta !== 0) return createdDelta;
    return String(a.id).localeCompare(String(b.id));
  });
}

function isAdvanceOrOutstandingCreditLabel(label) {
  const text = String(label || "");
  if (/^Payment Received against\s+PD-/i.test(text)) return false;
  return /advance payment|wallet top-?up|outstanding payment|payment received receipt/i.test(text);
}

function findMatchingWalletCredit(entries, request) {
  const amount = Number(request.amount || 0);
  if (!(amount > 0)) return null;
  const approvedAt = new Date(request.updatedAt || request.createdAt || 0).getTime();
  const candidates = entries.filter(
    (entry) =>
      Number(entry.credit || 0) === amount
      && Number(entry.debit || 0) === 0
      && isAdvanceOrOutstandingCreditLabel(entry.label)
  );
  if (!candidates.length) return null;
  candidates.sort((a, b) => {
    const da = Math.abs(new Date(a.entryDate || a.createdAt).getTime() - approvedAt);
    const db = Math.abs(new Date(b.entryDate || b.createdAt).getTime() - approvedAt);
    return da - db;
  });
  return candidates[0];
}

function walletCreditLabel(request, receiptNumber) {
  if (request.type === "OUTSTANDING_PAYMENT") {
    return receiptNumber
      ? `Outstanding Payment Receipt No: ${receiptNumber}`
      : "Outstanding Payment";
  }
  return receiptNumber
    ? `Advance Payment Receipt No: ${receiptNumber}`
    : "Advance Payment";
}

// Opening balance must come from the earliest entry's recorded "before" value.
// Deriving it as previousOutstanding - Σ(debit-credit) breaks after clamped
// advances/overpayments and creates phantom outstanding when those rows are deleted.
function computeLedgerOpening(account, entries) {
  const sorted = sortLedgerEntriesAsc(entries);
  if (!sorted.length) {
    return Number(account?.previousOutstanding || 0);
  }
  return Number(sorted[0].oldOutstandingBefore || 0);
}

// Recomputes running outstanding for every ledger entry, then syncs account.
// Running balance may go negative = customer advance / credit on account.
async function recomputeLedgerFromOpening(tx, accountId, opening) {
  const account = await tx.account.findUnique({ where: { id: accountId } });
  if (!account) return 0;

  const entries = await tx.ledgerEntry.findMany({
    where: { accountId },
    orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }],
  });

  let running = Number(opening) || 0;
  const updates = [];
  for (const entry of entries) {
    const before = running;
    running += Number(entry.debit || 0) - Number(entry.credit || 0);
    updates.push(
      tx.ledgerEntry.update({
        where: { id: entry.id },
        data: { oldOutstandingBefore: before, outstandingAfter: running },
      })
    );
  }
  if (updates.length) await Promise.all(updates);

  const finalOutstanding = running;
  const data = {
    previousOutstanding: finalOutstanding,
    oldOutstanding: finalOutstanding,
  };
  if (Number(account.creditLimit) > 0) {
    data.usedCredit = Math.max(0, Math.min(account.creditLimit, Math.max(0, finalOutstanding)));
  }
  await tx.account.update({ where: { id: accountId }, data });
  return finalOutstanding;
}

/**
 * Recreate missing ledger credit rows for APPROVED advance / outstanding
 * payments (e.g. admin deleted the ledger line while testing).
 */
async function reconcileApprovedWalletCredits(accountId, tx = prisma) {
  const requests = await tx.walletRequest.findMany({
    where: {
      accountId,
      status: "APPROVED",
      type: { in: ["WALLET_TOPUP", "OUTSTANDING_PAYMENT"] },
    },
    orderBy: [{ updatedAt: "asc" }, { createdAt: "asc" }],
  });
  if (!requests.length) return 0;

  let entries = await tx.ledgerEntry.findMany({ where: { accountId } });
  let created = 0;

  for (const request of requests) {
    const existing = findMatchingWalletCredit(entries, request);
    if (existing) continue;

    const amount = Number(request.amount || 0);
    if (!(amount > 0)) continue;

    const entryDate = new Date(request.updatedAt || request.createdAt || Date.now());
    const createdEntry = await tx.ledgerEntry.create({
      data: {
        accountId,
        label: walletCreditLabel(request, null),
        amount,
        debit: 0,
        credit: amount,
        // Temporary before/after; recompute will rewrite correctly.
        oldOutstandingBefore: 0,
        outstandingAfter: -amount,
        entryDate,
      },
    });
    entries = [...entries, createdEntry];
    created += 1;
  }

  return created;
}

/**
 * If the earliest entry still carries a phantom opening equal to approved
 * advances that were missing from the ledger, reset opening to 0 so
 * advances count as credit instead of inherited debt.
 */
function resolveOpeningAfterReconcile(account, entries, approvedAdvanceTotal) {
  const sorted = sortLedgerEntriesAsc(entries);
  if (!sorted.length) {
    // Only approved advances on books → opening 0, then credits make it negative.
    return 0;
  }

  let opening = Number(sorted[0].oldOutstandingBefore || 0);
  const advanceTotal = Number(approvedAdvanceTotal || 0);

  // Classic bug: deleted advance credit left previousOutstanding / first
  // oldOutstandingBefore == advance amount with no debit that created it.
  if (
    advanceTotal > 0
    && opening === advanceTotal
    && Number(sorted[0].credit || 0) === 0
  ) {
    opening = 0;
  }

  // If first row is the restored advance credit, trust its before (usually 0).
  if (isAdvanceOrOutstandingCreditLabel(sorted[0].label) && Number(sorted[0].credit || 0) > 0) {
    opening = Number(sorted[0].oldOutstandingBefore || 0);
  }

  return opening;
}

async function syncAccountLedger(accountId) {
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) return null;

  // Reconcile outside a long interactive transaction (remote DB timeouts).
  await reconcileApprovedWalletCredits(accountId, prisma);

  const entries = await prisma.ledgerEntry.findMany({ where: { accountId } });
  const approved = await prisma.walletRequest.findMany({
    where: {
      accountId,
      status: "APPROVED",
      type: { in: ["WALLET_TOPUP", "OUTSTANDING_PAYMENT"] },
    },
    select: { amount: true },
  });
  const approvedAdvanceTotal = approved.reduce(
    (sum, row) => sum + Number(row.amount || 0),
    0
  );
  const opening = resolveOpeningAfterReconcile(account, entries, approvedAdvanceTotal);

  await prisma.$transaction(
    async (tx) => {
      await recomputeLedgerFromOpening(tx, accountId, opening);
    },
    { maxWait: 10000, timeout: 30000 }
  );

  return prisma.account.findUnique({ where: { id: accountId } });
}

async function reverseApprovedWalletRequest(requestId) {
  const request = await prisma.walletRequest.findUnique({
    where: { id: requestId },
    include: { account: true },
  });
  if (!request) return { error: "Payment request not found.", status: 404 };

  if (request.status === "PENDING") {
    const updated = await prisma.walletRequest.update({
      where: { id: request.id },
      data: { status: "REJECTED" },
    });
    return { request: updated };
  }

  if (request.status === "REJECTED") {
    return { error: "Payment request already cancelled.", status: 400 };
  }

  if (request.type === "ORDER_PAYMENT") {
    return {
      error: "Approved order payments cannot be cancelled here. Delete the order from ledger/orders instead.",
      status: 400,
    };
  }

  const entries = await prisma.ledgerEntry.findMany({ where: { accountId: request.accountId } });
  const match = findMatchingWalletCredit(entries, request);
  if (match) {
    await prisma.ledgerEntry.delete({ where: { id: match.id } });
  }

  await prisma.walletRequest.update({
    where: { id: request.id },
    data: { status: "REJECTED" },
  });

  await syncAccountLedger(request.accountId);

  const updated = await prisma.walletRequest.findUnique({ where: { id: request.id } });
  const account = await prisma.account.findUnique({ where: { id: request.accountId } });
  return { request: updated, account };
}

module.exports = {
  pendingOrderTotal,
  summarizeAccountLedger,
  sortLedgerEntriesAsc,
  computeLedgerOpening,
  recomputeLedgerFromOpening,
  reconcileApprovedWalletCredits,
  syncAccountLedger,
  reverseApprovedWalletRequest,
  findMatchingWalletCredit,
  isAdvanceOrOutstandingCreditLabel,
};
