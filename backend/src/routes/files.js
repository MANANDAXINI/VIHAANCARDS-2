const express = require("express");
const { prisma } = require("../lib/prisma");
const { authSession, isAdminRole } = require("../middleware/auth");
const { findUploadFile, mimeFromFilename, safeFilename } = require("../lib/uploads");

const router = express.Router();

async function canAccessArtwork(account, filename) {
  if (isAdminRole(account.role)) return true;

  const ownedOrder = await prisma.order.findFirst({
    where: {
      accountId: account.id,
      OR: [{ artworkPath: filename }, { artworkBackPath: filename }],
    },
    select: { id: true },
  });
  if (ownedOrder) return true;

  const pendingRequests = await prisma.walletRequest.findMany({
    where: {
      accountId: account.id,
      status: "PENDING",
    },
    select: { pendingOrderData: true },
  });

  return pendingRequests.some((request) => {
    const data = request.pendingOrderData;
    return data?.artworkPath === filename || data?.artworkBackPath === filename;
  });
}

router.get("/:filename", authSession, async (req, res, next) => {
  try {
    const filename = safeFilename(req.params.filename);
    if (!filename) {
      return res.status(400).json({ error: "Invalid filename." });
    }

    const allowed = await canAccessArtwork(req.account, filename);
    if (!allowed) {
      return res.status(403).json({ error: "You do not have access to this file." });
    }

    const filePath = findUploadFile(filename);
    if (!filePath) {
      return res.status(404).json({ error: "File not found.", filename });
    }

    res.type(mimeFromFilename(filename));
    return res.sendFile(filePath, (error) => {
      if (error) next(error);
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
