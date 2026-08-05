export const DEFAULT_ARTWORK_FORMATS = ["pdf", "jpg"];
export const ALL_ARTWORK_FORMATS = ["pdf", "jpg", "cdr"];

export function normalizeArtworkFormats(value) {
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

  const unique = [...new Set(mapped.filter((part) => ALL_ARTWORK_FORMATS.includes(part)))];
  return unique.length ? unique : [...DEFAULT_ARTWORK_FORMATS];
}

export function artworkFormatsLabel(formats) {
  return normalizeArtworkFormats(formats)
    .map((f) => (f === "jpg" ? "JPG" : f.toUpperCase()))
    .join(", ");
}

export function artworkAcceptAttr(formats) {
  const list = normalizeArtworkFormats(formats);
  const parts = [];
  if (list.includes("pdf")) parts.push(".pdf", "application/pdf");
  if (list.includes("jpg")) parts.push(".jpg", ".jpeg", "image/jpeg");
  if (list.includes("cdr")) parts.push(".cdr");
  return parts.join(",");
}

export function isAllowedArtworkFile(file, formats = DEFAULT_ARTWORK_FORMATS) {
  if (!file) return false;
  const allowed = normalizeArtworkFormats(formats);
  const name = String(file.name || "");
  const ext = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
  const mime = String(file.type || "").toLowerCase();

  if (allowed.includes("pdf") && (ext === "pdf" || mime === "application/pdf")) return true;
  if (
    allowed.includes("jpg")
    && (ext === "jpg" || ext === "jpeg" || mime === "image/jpeg" || mime === "image/jpg")
  ) {
    return true;
  }
  if (
    allowed.includes("cdr")
    && (ext === "cdr" || mime.includes("cdr") || mime.includes("corel"))
  ) {
    return true;
  }
  // Some browsers leave MIME empty — allow by extension only.
  if (!mime && allowed.includes(ext === "jpeg" ? "jpg" : ext)) return true;
  return false;
}

export function isCdrArtwork(mime, name) {
  return isAllowedArtworkFile({ type: mime, name }, ["cdr"]);
}
