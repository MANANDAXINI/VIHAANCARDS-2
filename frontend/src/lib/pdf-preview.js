/**
 * Render the first page of a PDF blob to a PNG data URL / canvas image.
 * Used by admin artwork thumbs and packing-slip preview.
 */

const previewCache = new Map();

export function isPdfArtwork(mime, name) {
  if (String(mime || "").toLowerCase() === "application/pdf") return true;
  return /\.pdf$/i.test(String(name || ""));
}

async function getPdfjs() {
  const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    // Same-version worker from the installed package (bundled by Next).
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
  }
  return pdfjs;
}

/**
 * @param {Blob|ArrayBuffer} source
 * @param {{ maxWidth?: number, cacheKey?: string }} [options]
 * @returns {Promise<string|null>} PNG data URL
 */
export async function renderPdfFirstPageDataUrl(source, options = {}) {
  const maxWidth = Number(options.maxWidth) || 720;
  const cacheKey = options.cacheKey || null;

  if (cacheKey && previewCache.has(cacheKey)) {
    return previewCache.get(cacheKey);
  }

  if (typeof window === "undefined") return null;

  try {
    const pdfjs = await getPdfjs();
    const data =
      source instanceof ArrayBuffer
        ? source
        : await source.arrayBuffer();

    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(data) });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);

    const unscaled = page.getViewport({ scale: 1 });
    const scale = Math.min(2.5, maxWidth / Math.max(1, unscaled.width));
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport }).promise;

    const dataUrl = canvas.toDataURL("image/png");
    if (cacheKey) previewCache.set(cacheKey, dataUrl);

    try {
      await pdf.destroy();
    } catch {
      // ignore
    }

    return dataUrl;
  } catch (error) {
    console.warn("[pdf-preview] Could not render PDF first page:", error?.message || error);
    return null;
  }
}

/**
 * Load an Image from a PDF blob (first page).
 * @returns {Promise<HTMLImageElement|null>}
 */
export async function loadPdfAsImage(blob, options = {}) {
  const dataUrl = await renderPdfFirstPageDataUrl(blob, options);
  if (!dataUrl) return null;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}
