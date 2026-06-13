const bcrypt = require("bcryptjs");

function normalizeBusiness(value) {
  return String(value || "").trim();
}

function businessPickSummary(account) {
  return {
    id: account.id,
    business: account.business,
    name: account.name,
    status: account.status,
    role: account.role,
  };
}

async function passwordMatches(account, password) {
  return bcrypt.compare(password, account.passwordHash);
}

async function findMatchingAccounts(accounts, password) {
  const matching = [];
  for (const account of accounts) {
    if (await passwordMatches(account, password)) {
      matching.push(account);
    }
  }
  return matching;
}

function canLoginAccount(account) {
  if (account.role === "ADMIN") return { ok: true };
  if (account.role === "BOTH" && account.status === "APPROVED") return { ok: true };
  if (account.role === "BOTH" && account.status === "PENDING") {
    return { ok: true, pendingApproval: true, message: "Waiting for admin approval." };
  }
  if (account.status === "PENDING") {
    return { ok: false, status: 403, error: "Waiting for admin approval." };
  }
  if (account.status === "REJECTED") {
    return { ok: false, status: 403, error: "Account rejected." };
  }
  return { ok: true };
}

module.exports = {
  normalizeBusiness,
  businessPickSummary,
  findMatchingAccounts,
  canLoginAccount,
  passwordMatches,
};
