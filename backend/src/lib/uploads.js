const path = require("path");
const fs = require("fs");

const uploadDir = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, "../../uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

function safeFilename(filename) {
  return path.basename(String(filename || ""));
}

function uploadFilePath(filename) {
  const safe = safeFilename(filename);
  if (!safe) return null;
  return path.join(uploadDir, safe);
}

function uploadPublicPath(filename) {
  const safe = safeFilename(filename);
  return safe ? `/uploads/${safe}` : null;
}

module.exports = {
  uploadDir,
  safeFilename,
  uploadFilePath,
  uploadPublicPath,
};
