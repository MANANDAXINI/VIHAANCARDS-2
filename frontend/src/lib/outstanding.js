export function sumPendingOutstandingPayments(requests = []) {
  return requests.reduce((sum, request) => {
    if (String(request?.type || "").toUpperCase() !== "OUTSTANDING_PAYMENT") return sum;
    if (String(request?.status || "").toUpperCase() !== "PENDING") return sum;
    const amount = Number(request.amount || 0);
    return Number.isFinite(amount) && amount > 0 ? sum + amount : sum;
  }, 0);
}

export function computePayableOutstanding(account, pendingOutstandingPayments = []) {
  const outstanding = Number(account?.previousOutstanding || 0);
  const pending = sumPendingOutstandingPayments(pendingOutstandingPayments);
  return Math.max(0, outstanding - pending);
}
