const path = require("path");
const fs = require("fs");

const BACKEND_ROOT = path.join(__dirname, "../..");

function resolveUploadDir() {
  const configured = String(process.env.UPLOAD_DIR || "").trim();
  if (!configured) return path.join(BACKEND_ROOT, "uploads");
  if (path.isAbsolute(configured)) return configured;
  return path.join(BACKEND_ROOT, configured.replace(/^\.\//, ""));
}

const uploadDir = resolveUploadDir();

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

function safeFilename(filename) {
  return path.basename(String(filename || ""));
}

function candidateUploadPaths(filename) {
  const safe = safeFilename(filename);
  if (!safe) return [];

  const dirs = new Set([
    uploadDir,
    path.join(BACKEND_ROOT, "uploads"),
    path.join(process.cwd(), "uploads"),
    path.join(process.cwd(), "backend", "uploads"),
  ]);

  return [...dirs].map((dir) => path.join(dir, safe));
}

function findUploadFile(filename) {
  for (const filePath of candidateUploadPaths(filename)) {
    if (fs.existsSync(filePath)) return filePath;
  }
  return null;
}

function uploadFilePath(filename) {
  const safe = safeFilename(filename);
  if (!safe) return null;
  return findUploadFile(safe) || path.join(uploadDir, safe);
}

function uploadPublicPath(filename) {
  const safe = safeFilename(filename);
  return safe ? `/uploads/${safe}` : null;
}

function mimeFromFilename(filename) {
  const ext = path.extname(String(filename || "")).toLowerCase();
  const map = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
  };
  return map[ext] || "application/octet-stream";
}

module.exports = {
  BACKEND_ROOT,
  uploadDir,
  safeFilename,
  uploadFilePath,
  findUploadFile,
  uploadPublicPath,
  mimeFromFilename,
  candidateUploadPaths,
};
