const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { prisma, publicCustomerAccount } = require("../lib/prisma");
const { authCustomer, authSession, isAdminRole } = require("../middleware/auth");
const { verifyGoogleIdToken } = require("../lib/firebase");
const {
  normalizeBusiness,
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
  return { token, account: publicCustomerAccount(account), ...extra };
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
    const { name, business, phone, email, address, courierName, password } = req.body;
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

    const existingPhone = await prisma.account.findFirst({
      where: { phone: cleanPhone },
    });
    if (existingPhone) {
      return res.status(409).json({
        error: "This mobile number is already registered. Login or use forgot password.",
      });
    }

    const existingBusiness = await prisma.account.findFirst({
      where: { business: { equals: cleanBusiness, mode: "insensitive" } },
    });
    if (existingBusiness) {
      return res.status(409).json({
        error: "This business name is already registered. Use a different business name.",
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
        courierName: String(courierName || "").trim(),
        passwordHash,
        status: "PENDING",
        role: "CUSTOMER",
        authProvider: "PHONE",
      },
    });

    res.status(201).json({
      account: publicCustomerAccount(account),
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

    if (matching.length > 1) {
      return res.status(409).json({
        error: "This mobile number has multiple accounts. Contact admin — only one business is allowed per mobile number.",
      });
    }

    if (matching.length === 1) {
      return finishLogin(matching[0], res);
    }

    return res.status(401).json({ error: "Wrong mobile or password." });
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

const RESET_CODE_MINUTES = 30;

function resetRequestMessage() {
  return "If this mobile is registered, a reset code has been generated.";
}

function resetCodeResponse(code) {
  return {
    message: "Enter the code below to set a new password.",
    code,
    expiresInMinutes: RESET_CODE_MINUTES,
  };
}

async function findPhoneAccounts(cleanPhone) {
  return prisma.account.findMany({ where: { phone: cleanPhone } });
}

async function createPasswordResetForAccount(account) {
  if (account.authProvider === "GOOGLE" && !isAdminRole(account.role)) {
    return { error: "This account uses Google Sign-In. Please login with Google." };
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + RESET_CODE_MINUTES * 60 * 1000);

  await prisma.passwordReset.updateMany({
    where: { accountId: account.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  await prisma.passwordReset.create({
    data: {
      accountId: account.id,
      codeHash,
      code,
      expiresAt,
    },
  });

  return { ok: true, code };
}

router.post("/forgot-password", async (req, res) => {
  try {
    const cleanPhone = String(req.body.phone || "").trim().replace(/\D/g, "");
    const cleanBusiness = String(req.body.business || "").trim();
    const accountId = String(req.body.accountId || "").trim();

    if (!/^[0-9]{10}$/.test(cleanPhone)) {
      return res.status(400).json({ error: "Enter a valid 10-digit mobile number." });
    }

    const accounts = await findPhoneAccounts(cleanPhone);
    if (!accounts.length) {
      return res.json({ message: resetRequestMessage() });
    }

    if (accountId) {
      const account = accounts.find((item) => item.id === accountId);
      if (!account) {
        return res.json({ message: resetRequestMessage() });
      }
      const result = await createPasswordResetForAccount(account);
      if (result.error) {
        return res.status(400).json({ error: result.error });
      }
      return res.json(resetCodeResponse(result.code));
    }

    const phoneAccounts = accounts.filter(
      (account) => account.authProvider !== "GOOGLE" || isAdminRole(account.role)
    );

    if (!phoneAccounts.length) {
      return res.status(400).json({ error: "Please use Google Sign-In for this mobile number." });
    }

    if (cleanBusiness) {
      const account = phoneAccounts.find(
        (item) => item.business.toLowerCase() === cleanBusiness.toLowerCase()
      );
      if (!account) {
        return res.json({ message: resetRequestMessage() });
      }
      const result = await createPasswordResetForAccount(account);
      if (result.error) {
        return res.status(400).json({ error: result.error });
      }
      return res.json(resetCodeResponse(result.code));
    }

    if (phoneAccounts.length > 1) {
      return res.status(409).json({
        error: "This mobile number has multiple accounts. Contact admin — only one business is allowed per mobile number.",
      });
    }

    const result = await createPasswordResetForAccount(phoneAccounts[0]);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    return res.json(resetCodeResponse(result.code));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const cleanPhone = String(req.body.phone || "").trim().replace(/\D/g, "");
    const cleanBusiness = String(req.body.business || "").trim();
    const accountId = String(req.body.accountId || "").trim();
    const code = String(req.body.code || "").trim();
    const cleanPassword = String(req.body.password || "");

    if (!/^[0-9]{10}$/.test(cleanPhone)) {
      return res.status(400).json({ error: "Enter a valid 10-digit mobile number." });
    }
    if (!/^[0-9]{6}$/.test(code)) {
      return res.status(400).json({ error: "Enter the 6-digit reset code." });
    }
    if (cleanPassword.length < 4) {
      return res.status(400).json({ error: "Password must be at least 4 characters." });
    }

    const accounts = await findPhoneAccounts(cleanPhone);
    let account = null;

    if (accountId) {
      account = accounts.find((item) => item.id === accountId) || null;
    } else if (cleanBusiness) {
      account = accounts.find(
        (item) => item.business.toLowerCase() === cleanBusiness.toLowerCase()
      ) || null;
    } else if (accounts.length === 1) {
      account = accounts[0];
    }

    if (!account) {
      return res.status(400).json({ error: "Invalid reset request. Check mobile and business." });
    }

    if (account.authProvider === "GOOGLE" && !isAdminRole(account.role)) {
      return res.status(400).json({ error: "Please use Google Sign-In for this account." });
    }

    const reset = await prisma.passwordReset.findFirst({
      where: {
        accountId: account.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!reset) {
      return res.status(400).json({ error: "Reset code expired or not found. Request a new code." });
    }

    const validCode = await bcrypt.compare(code, reset.codeHash);
    if (!validCode) {
      return res.status(400).json({ error: "Invalid reset code." });
    }

    const passwordHash = await bcrypt.hash(cleanPassword, 10);
    await prisma.$transaction([
      prisma.account.update({
        where: { id: account.id },
        data: { passwordHash },
      }),
      prisma.passwordReset.update({
        where: { id: reset.id },
        data: { usedAt: new Date() },
      }),
      prisma.passwordReset.updateMany({
        where: { accountId: account.id, usedAt: null, NOT: { id: reset.id } },
        data: { usedAt: new Date() },
      }),
    ]);

    res.json({ message: "Password updated. You can login with your new password." });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
  res.json({ account: publicCustomerAccount(req.account) });
});

router.put("/account", authCustomer, async (req, res) => {
  try {
    const { name, business, phone, email, address, courierName } = req.body;
    const rawPhone = phone !== undefined ? String(phone).trim() : req.account.phone;
    const cleanPhone = rawPhone.replace(/\D/g, "");

    if (!/^[0-9]{10}$/.test(cleanPhone)) {
      return res.status(400).json({ error: "Enter a valid 10-digit mobile number." });
    }

    const cleanBusiness = normalizeBusiness(business || req.account.business);

    const duplicate = await prisma.account.findFirst({
      where: {
        phone: cleanPhone,
        NOT: { id: req.account.id },
      },
    });
    if (duplicate) {
      return res.status(409).json({ error: "Another account already uses this mobile number." });
    }

    const duplicateBusiness = await prisma.account.findFirst({
      where: {
        business: { equals: cleanBusiness, mode: "insensitive" },
        NOT: { id: req.account.id },
      },
    });
    if (duplicateBusiness) {
      return res.status(409).json({ error: "Another account already uses this business name." });
    }

    const account = await prisma.account.update({
      where: { id: req.account.id },
      data: {
        name: name || req.account.name,
        business: cleanBusiness,
        phone: cleanPhone,
        email: email ?? "",
        address: address ?? "",
        courierName: courierName !== undefined ? String(courierName).trim() : req.account.courierName,
      },
    });

    res.json({ account: publicCustomerAccount(account) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
