const path = require("path");

const DEFAULT_FORMATS = ["pdf", "jpg"];
const ALL_FORMATS = ["pdf", "jpg", "cdr"];

const MIME_BY_FORMAT = {
  pdf: ["application/pdf"],
  jpg: ["image/jpeg", "image/jpg"],
  cdr: [
    "application/cdr",
    "application/x-cdr",
    "image/cdr",
    "image/x-cdr",
    "application/x-coreldraw",
    "application/coreldraw",
    "application/vnd.corel-draw",
  ],
};

function normalizeFormats(value) {
  const raw = Array.isArray(value)
    ? value
    : String(value || "")
        .split(/[,|/\s]+/)
        .map((part) => part.trim().toLowerCase())
        .filter(Boolean);

  const mapped = raw.map((part) => {
    if (part === "jpeg" || part === "image/jpeg") return "jpg";
    if (part === "pdf" || part === "application/pdf") return "pdf";
    if (part === "cdr") return "cdr";
    return part;
  });

  const unique = [...new Set(mapped.filter((part) => ALL_FORMATS.includes(part)))];
  return unique.length ? unique : [...DEFAULT_FORMATS];
}

function formatsToStorage(formats) {
  return normalizeFormats(formats).join(",");
}

function fileExtension(filename) {
  return path.extname(String(filename || "")).toLowerCase().replace(".", "");
}

function formatFromFile(file) {
  if (!file) return null;
  const ext = fileExtension(file.originalname || file.name || "");
  if (ext === "jpeg") return "jpg";
  if (ALL_FORMATS.includes(ext)) return ext;

  const mime = String(file.mimetype || "").toLowerCase();
  for (const [format, mimes] of Object.entries(MIME_BY_FORMAT)) {
    if (mimes.includes(mime)) return format;
  }
  return null;
}

function isPotentiallyArtworkFile(file) {
  return Boolean(formatFromFile(file));
}

function fileMatchesFormats(file, allowedFormats) {
  const format = formatFromFile(file);
  if (!format) return false;
  return normalizeFormats(allowedFormats).includes(format);
}

function formatsLabel(formats) {
  return normalizeFormats(formats)
    .map((f) => (f === "jpg" ? "JPG" : f.toUpperCase()))
    .join(", ");
}

function acceptAttr(formats) {
  const list = normalizeFormats(formats);
  const parts = [];
  if (list.includes("pdf")) parts.push(".pdf", "application/pdf");
  if (list.includes("jpg")) parts.push(".jpg", ".jpeg", "image/jpeg");
  if (list.includes("cdr")) parts.push(".cdr");
  return parts.join(",");
}

function isCdrMimeOrName(mime, name) {
  const format = formatFromFile({ mimetype: mime, originalname: name, name });
  return format === "cdr";
}

module.exports = {
  DEFAULT_FORMATS,
  ALL_FORMATS,
  normalizeFormats,
  formatsToStorage,
  formatFromFile,
  isPotentiallyArtworkFile,
  fileMatchesFormats,
  formatsLabel,
  acceptAttr,
  isCdrMimeOrName,
};
