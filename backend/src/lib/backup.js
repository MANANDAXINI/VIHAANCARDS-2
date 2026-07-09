const zlib = require("zlib");
const { promisify } = require("util");
const nodemailer = require("nodemailer");
const { prisma } = require("./prisma");

const gzip = promisify(zlib.gzip);

const DEFAULT_BACKUP_TO = "whatsapptogmail@gmail.com";

function backupEmailTo() {
  return String(process.env.BACKUP_EMAIL_TO || DEFAULT_BACKUP_TO).trim() || DEFAULT_BACKUP_TO;
}

function smtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST
    && process.env.SMTP_USER
    && process.env.SMTP_PASS
  );
}

function todayStamp(date = new Date()) {
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

async function collectBackupPayload() {
  const [
    accounts,
    orders,
    ledgerEntries,
    walletRequests,
    sessions,
    passwordResets,
    orderCounters,
    receiptCounters,
    paperTypes,
    paperSizes,
    printingSideOptions,
    quantityOptions,
    priceRules,
    paymentQrs,
  ] = await Promise.all([
    prisma.account.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.order.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.ledgerEntry.findMany({ orderBy: { entryDate: "asc" } }),
    prisma.walletRequest.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.session.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.passwordReset.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.orderCounter.findMany(),
    prisma.receiptCounter.findMany(),
    prisma.paperType.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.paperSize.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.printingSideOption.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.quantityOption.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.priceRule.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.paymentQr.findMany(),
  ]);

  const counts = {
    accounts: accounts.length,
    orders: orders.length,
    ledgerEntries: ledgerEntries.length,
    walletRequests: walletRequests.length,
    sessions: sessions.length,
    passwordResets: passwordResets.length,
    orderCounters: orderCounters.length,
    receiptCounters: receiptCounters.length,
    paperTypes: paperTypes.length,
    paperSizes: paperSizes.length,
    printingSideOptions: printingSideOptions.length,
    quantityOptions: quantityOptions.length,
    priceRules: priceRules.length,
    paymentQrs: paymentQrs.length,
  };

  return {
    meta: {
      app: "PIXEL DIGITAL",
      generatedAt: new Date().toISOString(),
      generatedAtIst: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      date: todayStamp(),
      counts,
    },
    data: {
      accounts,
      orders,
      ledgerEntries,
      walletRequests,
      sessions,
      passwordResets,
      orderCounters,
      receiptCounters,
      paperTypes,
      paperSizes,
      printingSideOptions,
      quantityOptions,
      priceRules,
      paymentQrs,
    },
  };
}

function createMailer() {
  if (!smtpConfigured()) {
    throw new Error(
      "SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS (Gmail App Password) on the server."
    );
  }

  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function runDailyBackup({ trigger = "manual" } = {}) {
  const payload = await collectBackupPayload();
  const json = JSON.stringify(payload, null, 2);
  const compressed = await gzip(Buffer.from(json, "utf8"));
  const date = payload.meta.date;
  const filename = `pixel-digital-backup-${date}.json.gz`;
  const to = backupEmailTo();
  const from = String(process.env.BACKUP_EMAIL_FROM || process.env.SMTP_USER || "").trim();

  const countsLine = Object.entries(payload.meta.counts)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");

  const transporter = createMailer();
  const info = await transporter.sendMail({
    from: from || to,
    to,
    subject: `PIXEL DIGITAL daily backup — ${date}`,
    text: [
      "PIXEL DIGITAL automatic database backup.",
      "",
      `Date (IST): ${date}`,
      `Generated: ${payload.meta.generatedAtIst}`,
      `Trigger: ${trigger}`,
      "",
      "Record counts:",
      countsLine,
      "",
      `Attachment: ${filename} (gzipped JSON).`,
      "Unzip with any .gz tool, then open as JSON.",
      "",
      "This email contains sensitive account data. Keep it private.",
    ].join("\n"),
    attachments: [
      {
        filename,
        content: compressed,
        contentType: "application/gzip",
      },
    ],
  });

  return {
    ok: true,
    to,
    date,
    filename,
    bytes: compressed.length,
    counts: payload.meta.counts,
    messageId: info.messageId,
    trigger,
  };
}

module.exports = {
  backupEmailTo,
  smtpConfigured,
  collectBackupPayload,
  runDailyBackup,
  todayStamp,
};
