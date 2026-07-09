import { uploadAssetUrl } from "@/lib/api";

const INVALID_CHARS = /[\\/:*?"<>|]/g;

function sanitizePart(value, maxLen = 96) {
  return String(value || "")
    .trim()
    .replace(INVALID_CHARS, "_")
    .replace(/\s+/g, " ")
    .slice(0, maxLen);
}

export function sanitizeBusinessFolderName(businessName) {
  return sanitizePart(businessName, 120) || "Customer";
}

function fileExtension(originalName, mime) {
  const fromName = String(originalName || "").match(/(\.[a-z0-9]+)$/i)?.[1];
  if (fromName) return fromName.toLowerCase();
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/png") return ".png";
  if (mime === "image/gif") return ".gif";
  if (mime === "image/webp") return ".webp";
  if (mime === "application/pdf") return ".pdf";
  return ".file";
}

export function buildArtworkSaveFilename(order, side, originalName, mime) {
  // Filename format: ORDERNO_PAPERGSM_SIZE_QTY_SIDE[.BACK].ext
  const parts = [
    order?.orderNumber || "ORDER",
    order?.paperGsm,
    order?.size,
    order?.quantity,
    String(order?.printingSide || "").toUpperCase(),
  ];

  if (side === "back") parts.push("BACK");

  const ext = fileExtension(originalName, mime);
  const filename = parts
    .map((part) => sanitizePart(part))
    .filter(Boolean)
    .join("_");

  return `${filename}${ext}`;
}

export async function fetchArtworkBlob(url) {
  const fullUrl = uploadAssetUrl(url);
  if (!fullUrl) throw new Error("Artwork file URL missing.");

  const token = typeof window !== "undefined" ? localStorage.getItem("pd_token") : null;
  const response = await fetch(fullUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    let message = "Could not load artwork file.";
    try {
      const data = await response.json();
      if (data.error === "File not found.") {
        message = "Artwork file is missing on the server. It may have been uploaded before cloud storage was enabled — ask the customer to re-upload, or upload again from admin.";
      } else if (data.error === "Login required.") {
        message = "Session expired. Please log out and log in again, then retry.";
      } else if (data.error) {
        message = data.error;
      }
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(message);
  }

  return response.blob();
}

function triggerBrowserDownload(blob, filename) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

// Writes a blob into an already-opened directory handle (File System Access API).
export async function writeFileToDir(dirHandle, filename, blob) {
  const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

/**
 * Saves the artwork file. If `businessDir` (a directory handle already opened
 * inside the user gesture) is provided, the file is written into that folder.
 * Otherwise it falls back to a normal browser download.
 *
 * NOTE: `showDirectoryPicker` must be called by the caller up front (inside the
 * click gesture) and the resulting business folder handle passed in here —
 * calling it after awaits throws "Must be handling a user gesture".
 */
export async function saveArtworkToBusinessFolder({ order, side, url, originalName, mime, businessDir = null }) {
  const blob = await fetchArtworkBlob(url);
  const businessFolder = sanitizeBusinessFolderName(order?.business || order?.customerName);
  const filename = buildArtworkSaveFilename(order, side, originalName, mime);

  if (businessDir) {
    await writeFileToDir(businessDir, filename, blob);
    return {
      method: "folder",
      businessFolder,
      filename,
      displayPath: `${businessFolder}\\${filename}`,
    };
  }

  triggerBrowserDownload(blob, filename);
  return {
    method: "download",
    businessFolder,
    filename,
    displayPath: filename,
  };
}
