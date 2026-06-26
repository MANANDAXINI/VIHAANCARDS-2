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
  const receivableBalance = previousOutstanding + pendingOrderAmount;
  const ledgerNetOutstanding = Math.max(0, totalBilled - totalReceived);

  return {
    totalBilled,
    totalReceived,
    previousOutstanding,
    pendingOrderAmount,
    receivableBalance,
    currentOutstanding: receivableBalance,
    ledgerNetOutstanding,
    // Backward-compatible aliases (lifetime totals, not current due)
    totalJobOutstanding: totalBilled,
    totalPaymentReceived: totalReceived,
    finalBalance: ledgerEntries.length
      ? Number(ledgerEntries[ledgerEntries.length - 1].outstandingAfter || 0)
      : previousOutstanding,
  };
}

module.exports = {
  pendingOrderTotal,
  summarizeAccountLedger,
};
