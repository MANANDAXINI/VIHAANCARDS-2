const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function isPlaceholderPhone(phone) {
  return String(phone || "").startsWith("g-");
}

function publicCustomerAccount(account) {
  if (!account) return null;
  const phone = account.phone || "";
  return {
    id: account.id,
    name: account.name,
    business: account.business,
    phone: isPlaceholderPhone(phone) ? "" : phone,
    email: account.email,
    address: account.address,
    courierName: account.courierName || "",
    status: account.status,
    role: account.role,
    previousOutstanding: account.previousOutstanding,
    profileNeedsPhone: isPlaceholderPhone(phone),
  };
}

function publicAccount(account) {
  if (!account) return null;
  const phone = account.phone || "";
  return {
    id: account.id,
    name: account.name,
    business: account.business,
    phone: isPlaceholderPhone(phone) ? "" : phone,
    email: account.email,
    address: account.address,
    courierName: account.courierName || "",
    status: account.status,
    role: account.role,
    balance: account.balance,
    creditLimit: account.creditLimit,
    usedCredit: account.usedCredit,
    previousOutstanding: account.previousOutstanding,
    availableCredit: Math.max(0, account.creditLimit - account.usedCredit),
    profileNeedsPhone: isPlaceholderPhone(phone),
  };
}

function formatOrderNumber(value) {
  return `PD-${String(value).padStart(5, "0")}`;
}

function formatReceiptNumber(value) {
  return `RCPT-${String(value).padStart(5, "0")}`;
}

async function nextOrderNumber() {
  const counter = await prisma.orderCounter.upsert({
    where: { id: 1 },
    update: { value: { increment: 1 } },
    create: { id: 1, value: 2 },
  });
  return formatOrderNumber(counter.value - 1);
}

async function nextReceiptNumber() {
  const counter = await prisma.receiptCounter.upsert({
    where: { id: 1 },
    update: { value: { increment: 1 } },
    create: { id: 1, value: 2 },
  });
  return formatReceiptNumber(counter.value - 1);
}

function publicOrder(order, options = {}) {
  const secure = options.secureFiles === true;
  const toUrl = (filePath) => {
    if (!filePath) return null;
    return secure ? `/api/files/${filePath}` : `/uploads/${filePath}`;
  };

  return {
    ...order,
    artworkUrl: toUrl(order.artworkPath),
    artworkBackUrl: toUrl(order.artworkBackPath),
  };
}

module.exports = {
  prisma,
  publicAccount,
  publicCustomerAccount,
  publicOrder,
  formatOrderNumber,
  formatReceiptNumber,
  nextOrderNumber,
  nextReceiptNumber,
};
