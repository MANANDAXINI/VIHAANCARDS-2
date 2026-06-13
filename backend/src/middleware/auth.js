const { prisma, publicAccount } = require("../lib/prisma");

function isAdminRole(role) {
  return role === "ADMIN" || role === "BOTH";
}

function isCustomerRole(role) {
  return role === "CUSTOMER" || role === "BOTH";
}

async function authSession(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.replace(/^Bearer\s+/i, "");

  if (!token) {
    return res.status(401).json({ error: "Login required." });
  }

  const session = await prisma.session.findUnique({
    where: { token },
    include: { account: true },
  });

  if (!session || !session.account) {
    return res.status(401).json({ error: "Invalid or expired session." });
  }

  if (session.account.status === "REJECTED") {
    return res.status(403).json({ error: "Your account was rejected." });
  }

  req.account = session.account;
  req.token = token;
  next();
}

async function authCustomer(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.replace(/^Bearer\s+/i, "");

  if (!token) {
    return res.status(401).json({ error: "Login required." });
  }

  const session = await prisma.session.findUnique({
    where: { token },
    include: { account: true },
  });

  if (!session || !session.account) {
    return res.status(401).json({ error: "Invalid or expired session." });
  }

  if (!isCustomerRole(session.account.role)) {
    return res.status(403).json({ error: "Customer access only." });
  }

  if (session.account.status !== "APPROVED") {
    return res.status(403).json({ error: "Account pending admin approval." });
  }

  req.account = session.account;
  req.token = token;
  next();
}

async function authAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.replace(/^Bearer\s+/i, "");

  if (!token) {
    return res.status(401).json({ error: "Login required." });
  }

  const session = await prisma.session.findUnique({
    where: { token },
    include: { account: true },
  });

  if (!session || !session.account) {
    return res.status(401).json({ error: "Invalid or expired session." });
  }

  if (!isAdminRole(session.account.role)) {
    return res.status(403).json({ error: "Admin access only." });
  }

  // BOTH role needs approval before admin access
  if (session.account.role === "BOTH" && session.account.status !== "APPROVED") {
    return res.status(403).json({ error: "Account pending approval." });
  }

  req.account = session.account;
  req.token = token;
  next();
}

module.exports = {
  authCustomer,
  authSession,
  authAdmin,
  publicAccount,
  isAdminRole,
  isCustomerRole,
};
