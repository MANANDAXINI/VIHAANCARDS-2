const express = require("express");
const { authCustomer } = require("../middleware/auth");
const { feedbackEmailTo, sendMail, smtpConfigured } = require("../lib/mail");

const router = express.Router();

const TYPES = new Set(["complaint", "suggestion"]);

router.post("/complaint", authCustomer, async (req, res) => {
  try {
    if (!smtpConfigured()) {
      return res.status(503).json({
        error: "Email is not configured on the server. Please contact admin by phone.",
      });
    }

    const type = String(req.body?.type || "complaint").trim().toLowerCase();
    const message = String(req.body?.message || "").trim();
    const jobDetails = String(req.body?.jobDetails || req.body?.orderNumber || "").trim();

    if (!TYPES.has(type)) {
      return res.status(400).json({ error: "Type must be complaint or suggestion." });
    }
    if (message.length < 5) {
      return res.status(400).json({ error: "Please write at least a short message." });
    }
    if (message.length > 4000) {
      return res.status(400).json({ error: "Message is too long (max 4000 characters)." });
    }
    if (jobDetails.length > 500) {
      return res.status(400).json({ error: "Job / order details are too long." });
    }

    const account = req.account;
    const label = type === "suggestion" ? "Suggestion" : "Complaint";
    const to = feedbackEmailTo();
    const subject = `[PIXEL DIGITAL] ${label} from ${account.business || account.name || "Customer"}`;

    const lines = [
      `PIXEL DIGITAL — Customer ${label}`,
      "",
      `Type: ${label}`,
      `Business: ${account.business || "—"}`,
      `Name: ${account.name || "—"}`,
      `Phone: ${account.phone || "—"}`,
      `Email: ${account.email || "—"}`,
      `Account ID: ${account.id}`,
      `Job / Order: ${jobDetails || "—"}`,
      "",
      "Message:",
      message,
      "",
      `Sent at (IST): ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`,
    ];

    await sendMail({
      to,
      subject,
      text: lines.join("\n"),
    });

    res.status(201).json({
      ok: true,
      message: `${label} sent successfully. We will get back to you soon.`,
    });
  } catch (error) {
    console.error("[feedback]", error);
    res.status(500).json({ error: error.message || "Could not send message." });
  }
});

module.exports = router;
