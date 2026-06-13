const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function isPlaceholderPhone(phone) {
  return String(phone || "").startsWith("g-");
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

function publicOrder(order) {
  return {
    ...order,
    artworkUrl: order.artworkPath ? `/uploads/${order.artworkPath}` : null,
  };
}

module.exports = {
  prisma,
  publicAccount,
  publicOrder,
  formatOrderNumber,
  formatReceiptNumber,
  nextOrderNumber,
  nextReceiptNumber,
};
