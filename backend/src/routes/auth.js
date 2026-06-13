const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { prisma, publicAccount } = require("../lib/prisma");
const { authCustomer, authSession, isAdminRole } = require("../middleware/auth");
const { verifyGoogleIdToken } = require("../lib/firebase");
const {
  normalizeBusiness,
  businessPickSummary,
  findMatchingAccounts,
  canLoginAccount,
  passwordMatches,
} = require("../lib/account-auth");

const router = express.Router();

async function createSession(accountId) {
  const token = crypto.randomBytes(32).toString("hex");
  await prisma.session.create({ data: { token, accountId } });
  return token;
}

function sessionResponse(account, token, extra = {}) {
  return { token, account: publicAccount(account), ...extra };
}

async function finishLogin(account, res, extra = {}) {
  const access = canLoginAccount(account);
  if (!access.ok) {
    return res.status(access.status).json({ error: access.error });
  }

  const token = await createSession(account.id);
  return res.json(
    sessionResponse(account, token, {
      ...(access.pendingApproval ? { message: access.message, pendingApproval: true } : {}),
      ...extra,
    })
  );
}

function isAdminEmail(email) {
  const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase();
  return adminEmail && email.toLowerCase() === adminEmail;
}

router.post("/register", async (req, res) => {
  try {
    const { name, business, phone, email, address, password } = req.body;
    const cleanName = String(name || "").trim();
    const cleanBusiness = String(business || "").trim();
    const cleanPhone = String(phone || "").trim().replace(/\D/g, "");
    const cleanPassword = String(password || "");

    if (!cleanName || !cleanBusiness || !cleanPhone || !cleanPassword) {
      return res.status(400).json({ error: "Name, business, mobile, and password are required." });
    }

    if (!/^[0-9]{10}$/.test(cleanPhone)) {
      return res.status(400).json({ error: "Enter a valid 10-digit mobile number." });
    }

    if (cleanPassword.length < 4) {
      return res.status(400).json({ error: "Password must be at least 4 characters." });
    }

    const existing = await prisma.account.findFirst({
      where: {
        phone: cleanPhone,
        business: { equals: cleanBusiness, mode: "insensitive" },
      },
    });
    if (existing) {
      return res.status(409).json({
        error: "This business is already registered with this mobile number. Login and select it, or use a different business name.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const account = await prisma.account.create({
      data: {
        name: cleanName,
        business: cleanBusiness,
        phone: cleanPhone,
        email: email || "",
        address: address || "",
        passwordHash,
        status: "PENDING",
        role: "CUSTOMER",
        authProvider: "PHONE",
      },
    });

    res.status(201).json({
      account: publicAccount(account),
      message: "Done! Admin will approve your account soon.",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { phone, password, accountId } = req.body;
    const cleanPhone = String(phone || "").trim().replace(/\D/g, "");
    const cleanPassword = String(password || "");

    if (!cleanPhone || !cleanPassword) {
      return res.status(400).json({ error: "Mobile number and password are required." });
    }

    if (!/^[0-9]{10}$/.test(cleanPhone)) {
      return res.status(400).json({ error: "Enter a valid 10-digit mobile number." });
    }

    if (cleanPassword.length < 4) {
      return res.status(400).json({ error: "Password must be at least 4 characters." });
    }

    const accounts = await prisma.account.findMany({ where: { phone: cleanPhone } });
    if (!accounts.length) {
      return res.status(401).json({ error: "Wrong mobile or password." });
    }

    if (accountId) {
      const account = accounts.find((item) => item.id === accountId);
      if (!account) {
        return res.status(401).json({ error: "Wrong mobile or password." });
      }

      if (account.authProvider === "GOOGLE" && !isAdminRole(account.role)) {
        return res.status(400).json({ error: "Please use Google Sign-In for this account." });
      }

      const valid = await passwordMatches(account, cleanPassword);
      if (!valid) {
        return res.status(401).json({ error: "Wrong mobile or password." });
      }

      return finishLogin(account, res);
    }

    const phoneAccounts = accounts.filter(
      (account) => account.authProvider !== "GOOGLE" || isAdminRole(account.role)
    );
    const matching = await findMatchingAccounts(phoneAccounts, cleanPassword);

    if (!matching.length) {
      const googleOnly = accounts.some((account) => account.authProvider === "GOOGLE");
      if (googleOnly) {
        return res.status(400).json({ error: "Please use Google Sign-In for this mobile number." });
      }
      return res.status(401).json({ error: "Wrong mobile or password." });
    }

    if (matching.length === 1) {
      return finishLogin(matching[0], res);
    }

    return res.json({
      needsBusinessPick: true,
      message: "This mobile has multiple businesses. Select one to continue.",
      accounts: matching.map(businessPickSummary),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/google", async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken || typeof idToken !== "string") {
      return res.status(400).json({ error: "Google sign-in failed. Please try again." });
    }

    const decoded = await verifyGoogleIdToken(idToken);
    const googleId = decoded.uid;
    const email = decoded.email || "";
    const name = decoded.name || email.split("@")[0] || "User";
    const isAdmin = isAdminEmail(email);

    let account = await prisma.account.findUnique({ where: { googleId } });

    if (!account && email) {
      account = await prisma.account.findFirst({ where: { email } });
      if (account) {
        account = await prisma.account.update({
          where: { id: account.id },
          data: { googleId, authProvider: "GOOGLE" },
        });
      }
    }

    if (!account) {
      const placeholderPhone = `g-${googleId.slice(0, 20)}`;
      const passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 10);
      account = await prisma.account.create({
        data: {
          name,
          business: name,
          phone: placeholderPhone,
          email,
          passwordHash,
          googleId,
          authProvider: "GOOGLE",
          role: isAdmin ? "ADMIN" : "CUSTOMER",
          status: isAdmin ? "APPROVED" : "PENDING",
        },
      });

      const token = await createSession(account.id);
      return res.status(201).json(
        sessionResponse(account, token, {
          message: isAdmin ? "Admin logged in." : "Account created. Wait for admin approval.",
          isNewUser: true,
        })
      );
    }

    if (isAdmin && account.role === "CUSTOMER") {
      account = await prisma.account.update({
        where: { id: account.id },
        data: { role: "ADMIN", status: "APPROVED" },
      });
    }

    if (account.role === "ADMIN") {
      const token = await createSession(account.id);
      return res.json(sessionResponse(account, token));
    }

    if (account.role === "BOTH" && account.status === "APPROVED") {
      const token = await createSession(account.id);
      return res.json(sessionResponse(account, token));
    }

    if (account.role === "BOTH" && account.status === "PENDING") {
      const token = await createSession(account.id);
      return res.json(sessionResponse(account, token, { message: "Waiting for admin approval.", pendingApproval: true }));
    }

    if (account.status === "REJECTED") {
      return res.status(403).json({ error: "Account rejected." });
    }

    const token = await createSession(account.id);
    res.json(sessionResponse(account, token));
  } catch (error) {
    console.error("Google auth error:", error);
    const message = error?.message || "";
    if (message.includes("FIREBASE_SERVICE_ACCOUNT_JSON") || message.includes("FIREBASE_PROJECT_ID")) {
      return res.status(503).json({
        error: "Google sign-in is not configured on the server. Set Firebase env vars on Render.",
      });
    }
    if (message.includes("Decoding Firebase ID token failed") || message.includes("verifyIdToken")) {
      return res.status(401).json({ error: "Google sign-in verification failed. Try again." });
    }
    res.status(401).json({ error: message || "Google sign-in failed." });
  }
});

router.post("/logout", authSession, async (req, res) => {
  try {
    await prisma.session.deleteMany({ where: { token: req.token } });
    res.json({ message: "Logged out." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/me", authSession, (req, res) => {
  res.json({ account: publicAccount(req.account) });
});

router.put("/account", authCustomer, async (req, res) => {
  try {
    const { name, business, phone, email, address } = req.body;
    const rawPhone = phone !== undefined ? String(phone).trim() : req.account.phone;
    const cleanPhone = rawPhone.replace(/\D/g, "");

    if (!/^[0-9]{10}$/.test(cleanPhone)) {
      return res.status(400).json({ error: "Enter a valid 10-digit mobile number." });
    }

    const cleanBusiness = normalizeBusiness(business || req.account.business);

    const duplicate = await prisma.account.findFirst({
      where: {
        phone: cleanPhone,
        business: { equals: cleanBusiness, mode: "insensitive" },
        NOT: { id: req.account.id },
      },
    });
    if (duplicate) {
      return res.status(409).json({ error: "Another account already uses this mobile and business name." });
    }

    const account = await prisma.account.update({
      where: { id: req.account.id },
      data: {
        name: name || req.account.name,
        business: cleanBusiness,
        phone: cleanPhone,
        email: email ?? "",
        address: address ?? "",
      },
    });

    res.json({ account: publicAccount(account) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
