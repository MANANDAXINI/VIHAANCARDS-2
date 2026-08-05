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
    data.usedCredit = Math.max(0, Math.min(account.creditLimit, Math.max(0, finalOutstanding)));
  }
  await tx.account.update({ where: { id: accountId }, data });
  return finalOutstanding;
}

async function syncAccountLedger(accountId) {
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) return null;
  const entries = await prisma.ledgerEntry.findMany({ where: { accountId } });
  const opening = computeLedgerOpening(account, entries);
  await prisma.$transaction(async (tx) => {
    await recomputeLedgerFromOpening(tx, accountId, opening);
  });
  return prisma.account.findUnique({ where: { id: accountId } });
}

module.exports = {
  pendingOrderTotal,
  summarizeAccountLedger,
  sortLedgerEntriesAsc,
  computeLedgerOpening,
  recomputeLedgerFromOpening,
  syncAccountLedger,
};
