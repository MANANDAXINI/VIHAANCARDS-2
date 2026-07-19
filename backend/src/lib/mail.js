const nodemailer = require("nodemailer");

const DEFAULT_FEEDBACK_TO = "whatsapptogmail@gmail.com";

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function feedbackEmailTo() {
  return (
    String(process.env.FEEDBACK_EMAIL_TO || process.env.BACKUP_EMAIL_TO || DEFAULT_FEEDBACK_TO).trim()
    || DEFAULT_FEEDBACK_TO
  );
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

async function sendMail({ to, subject, text, html }) {
  const transporter = createMailer();
  const from = String(process.env.BACKUP_EMAIL_FROM || process.env.SMTP_USER || "").trim() || to;
  return transporter.sendMail({
    from,
    to: to || feedbackEmailTo(),
    subject,
    text,
    html,
  });
}

module.exports = {
  smtpConfigured,
  feedbackEmailTo,
  sendMail,
};
