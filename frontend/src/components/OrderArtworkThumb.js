"use client";

import { memo, useEffect, useRef, useState } from "react";
import { fetchArtworkBlobUrl, uploadAssetUrl } from "@/lib/api";
import { fetchArtworkBlob } from "@/lib/artwork-save";
import { isPdfArtwork, renderPdfFirstPageDataUrl } from "@/lib/pdf-preview";
import { ui } from "@/lib/ui";

function isImageArtwork(mime, name) {
  if (mime?.startsWith("image/")) return true;
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(name || "");
}

function runWhenIdle(fn, timeout = 2500) {
  if (typeof window === "undefined") return () => {};
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(() => fn(), { timeout });
    return () => window.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(fn, Math.min(800, timeout));
  return () => window.clearTimeout(id);
}

function SecureArtworkThumb({ url, mime, name, label, className = "h-14 w-14" }) {
  const rootRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [src, setSrc] = useState(null);
  const [openUrl, setOpenUrl] = useState(null);
  const [failed, setFailed] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [wantPdfPreview, setWantPdfPreview] = useState(false);
  const isPdf = isPdfArtwork(mime, name);
  const showRaster = isImageArtwork(mime, name);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || visible) return undefined;

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "80px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  // Images: fetch only when visible, and only during browser idle so typing stays smooth.
  useEffect(() => {
    let objectUrl;
    let cancelled = false;
    let cancelIdle = () => {};

    setFailed(false);
    if (!url || !visible || isPdf || !showRaster) return undefined;

    setSrc(null);
    setOpenUrl(null);

    cancelIdle = runWhenIdle(async () => {
      try {
        const blobUrl = await fetchArtworkBlobUrl(url);
        if (cancelled) {
          if (blobUrl) URL.revokeObjectURL(blobUrl);
          return;
        }
        if (!blobUrl) {
          setFailed(true);
          return;
        }
        objectUrl = blobUrl;
        setOpenUrl(blobUrl);
        setSrc(blobUrl);
      } catch {
        if (!cancelled) setFailed(true);
      }
    }, 2000);

    return () => {
      cancelled = true;
      cancelIdle();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, visible, isPdf, showRaster]);

  // PDFs: only render first page after explicit click — pdf.js is too heavy for typing.
  useEffect(() => {
    let objectUrl;
    let cancelled = false;
    let cancelIdle = () => {};

    if (!url || !isPdf || !wantPdfPreview) return undefined;

    setPdfLoading(true);
    setFailed(false);

    cancelIdle = runWhenIdle(async () => {
      try {
        const blob = await fetchArtworkBlob(url);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setOpenUrl(objectUrl);
        const preview = await renderPdfFirstPageDataUrl(blob, {
          maxWidth: 220,
          cacheKey: `thumb:${url}`,
        });
        if (cancelled) return;
        if (!preview) {
          setFailed(true);
          return;
        }
        setSrc(preview);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setPdfLoading(false);
      }
    }, 500);

    return () => {
      cancelled = true;
      cancelIdle();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, isPdf, wantPdfPreview]);

  async function handleOpen(event) {
    if (openUrl || (src && !isPdf)) return;
    if (isPdf && !openUrl) {
      event.preventDefault();
      try {
        const blob = await fetchArtworkBlob(url);
        const blobUrl = URL.createObjectURL(blob);
        setOpenUrl(blobUrl);
        window.open(blobUrl, "_blank", "noopener,noreferrer");
      } catch {
        setFailed(true);
      }
      return;
    }
    event.preventDefault();
    try {
      const blobUrl = await fetchArtworkBlobUrl(url);
      if (!blobUrl) {
        setFailed(true);
        return;
      }
      window.open(blobUrl, "_blank", "noopener,noreferrer");
    } catch {
      setFailed(true);
    }
  }

  if (!url) return null;

  const linkProps = {
    href: openUrl || undefined,
    target: "_blank",
    rel: "noreferrer",
    onClick: handleOpen,
    ...(openUrl && isPdf && name ? { download: name } : {}),
  };

  return (
    <div ref={rootRef} className="flex w-full flex-col gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2">
      {label ? <span className={`${ui.small} font-semibold text-slate-700`}>{label}</span> : null}
      {failed ? (
        <div className={`${className} mx-auto grid w-full max-w-[8rem] place-items-center rounded border border-dashed border-slate-300 bg-white px-2 text-center text-[0.65rem] font-medium text-slate-500`}>
          {isPdf ? "PDF unavailable" : "File unavailable"}
        </div>
      ) : isPdf && !src ? (
        <button
          type="button"
          className={`${className} mx-auto grid w-full max-w-[8rem] place-items-center rounded border border-slate-200 bg-slate-100 px-1 text-center text-[0.65rem] font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-200`}
          disabled={pdfLoading}
          onClick={() => setWantPdfPreview(true)}
        >
          {pdfLoading ? "Loading…" : "PDF — tap preview"}
        </button>
      ) : showRaster || src ? (
        <a {...linkProps} className="block w-full">
          {src ? (
            <img
              src={src}
              alt={name || "Artwork"}
              decoding="async"
              loading="lazy"
              className={`${className} mx-auto w-full max-w-[8rem] rounded border border-slate-200 object-contain bg-white`}
            />
          ) : (
            <div className={`${className} mx-auto max-w-[8rem] animate-pulse rounded border border-slate-200 bg-slate-100`} />
          )}
        </a>
      ) : (
        <a
          {...linkProps}
          className={`${className} mx-auto grid w-full max-w-[8rem] place-items-center rounded border border-slate-200 bg-slate-100 px-1 text-center text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500`}
        >
          File
        </a>
      )}
      {name ? <p className={`${ui.small} break-all text-slate-600`}>{name}</p> : null}
    </div>
  );
}

function PublicArtworkThumb({ url, mime, name, label, className = "h-14 w-14" }) {
  const fullUrl = uploadAssetUrl(url);
  const isPdf = isPdfArtwork(mime, name);
  const [pdfSrc, setPdfSrc] = useState(null);
  const [wantPdfPreview, setWantPdfPreview] = useState(false);
  const showImage = fullUrl && (isImageArtwork(mime, name) || (isPdf && pdfSrc));

  useEffect(() => {
    let cancelled = false;
    if (!fullUrl || !isPdf || !wantPdfPreview) return undefined;

    const cancelIdle = runWhenIdle(() => {
      fetch(fullUrl)
        .then((res) => (res.ok ? res.blob() : null))
        .then((blob) =>
          blob ? renderPdfFirstPageDataUrl(blob, { maxWidth: 220, cacheKey: `pub:${url}` }) : null
        )
        .then((preview) => {
          if (!cancelled && preview) setPdfSrc(preview);
        })
        .catch(() => {});
    }, 500);

    return () => {
      cancelled = true;
      cancelIdle();
    };
  }, [fullUrl, isPdf, url, wantPdfPreview]);

  return (
    <div className="flex w-full flex-col gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2">
      {label ? <span className={`${ui.small} font-semibold text-slate-700`}>{label}</span> : null}
      {showImage ? (
        <a href={fullUrl} target="_blank" rel="noreferrer" className="block w-full">
          <img
            src={isPdf ? pdfSrc : fullUrl}
            alt={name || "Artwork"}
            className={`${className} mx-auto w-full max-w-[8rem] rounded border border-slate-200 object-contain bg-white`}
          />
        </a>
      ) : isPdf ? (
        <button
          type="button"
          className={`${className} mx-auto grid w-full max-w-[8rem] place-items-center rounded border border-slate-200 bg-slate-100 px-1 text-center text-[0.65rem] font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-200`}
          onClick={() => setWantPdfPreview(true)}
        >
          PDF — tap preview
        </button>
      ) : (
        <a
          href={fullUrl || undefined}
          target={fullUrl ? "_blank" : undefined}
          rel={fullUrl ? "noreferrer" : undefined}
          className={`${className} mx-auto grid w-full max-w-[8rem] place-items-center rounded border border-slate-200 bg-slate-100 px-1 text-center text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500`}
        >
          {fullUrl ? "File" : "—"}
        </a>
      )}
      {name ? <p className={`${ui.small} break-all text-slate-600`}>{name}</p> : null}
    </div>
  );
}

const ArtworkThumb = memo(function ArtworkThumb({ url, mime, name, label, className, secure = false }) {
  if (secure) {
    return <SecureArtworkThumb url={url} mime={mime} name={name} label={label} className={className} />;
  }
  return <PublicArtworkThumb url={url} mime={mime} name={name} label={label} className={className} />;
});

function useSecureArtwork(url) {
  return String(url || "").includes("/api/files/");
}

export default function OrderArtworkThumb({ order, className = "h-16 w-16", secure = true }) {
  const url = order?.artworkUrl;
  const useSecure = secure || useSecureArtwork(url);

  if (!url) {
    return <span className={ui.muted}>—</span>;
  }

  if (useSecure) {
    return (
      <SecureArtworkThumb
        url={url}
        mime={order.artworkMime}
        name={order.artworkName}
        className={className}
      />
    );
  }

  return (
    <PublicArtworkThumb
      url={url}
      mime={order.artworkMime}
      name={order.artworkName}
      className={className}
    />
  );
}

export function OrderArtworkCell({ order, secure = true }) {
  const frontUrl = order?.artworkUrl;
  const backUrl = order?.artworkBackUrl;
  const hasBack = Boolean(backUrl || order?.artworkBackName);
  const useSecure = secure || useSecureArtwork(frontUrl) || useSecureArtwork(backUrl);

  if (!frontUrl && !backUrl) {
    return <span className={ui.muted}>—</span>;
  }

  return (
    <div className="grid w-full max-w-[10rem] gap-2">
      {frontUrl ? (
        <ArtworkThumb
          url={frontUrl}
          mime={order.artworkMime}
          name={order.artworkName}
          label="Front"
          className="h-14 w-14"
          secure={useSecure}
        />
      ) : null}
      {hasBack ? (
        <ArtworkThumb
          url={backUrl}
          mime={order.artworkBackMime}
          name={order.artworkBackName}
          label="Back"
          className="h-14 w-14"
          secure={useSecure}
        />
      ) : null}
    </div>
  );
}

export function OrderMetaLine({ label, value }) {
  return (
    <p className={ui.small}>
      <span className={ui.muted}>{label}: </span>
      <strong>{value || "—"}</strong>
    </p>
  );
}

export { ArtworkThumb };
