"use client";

import { useEffect, useState } from "react";
import { fetchArtworkBlobUrl, uploadAssetUrl } from "@/lib/api";
import { ui } from "@/lib/ui";

function isImageArtwork(mime, name) {
  if (mime?.startsWith("image/")) return true;
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(name || "");
}

function SecureArtworkThumb({ url, mime, name, label, className = "h-14 w-14" }) {
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);
  const showImage = isImageArtwork(mime, name);

  useEffect(() => {
    let objectUrl;
    setFailed(false);
    setSrc(null);

    if (!url) return undefined;

    fetchArtworkBlobUrl(url)
      .then((blobUrl) => {
        if (!blobUrl) {
          setFailed(true);
          return;
        }
        objectUrl = blobUrl;
        setSrc(blobUrl);
      })
      .catch(() => setFailed(true));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  async function handleOpen(event) {
    if (src) return;
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
    href: src || undefined,
    target: "_blank",
    rel: "noreferrer",
    onClick: handleOpen,
    ...(src && !showImage && name ? { download: name } : {}),
  };

  return (
    <div className="flex w-full flex-col gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2">
      {label ? <span className={`${ui.small} font-semibold text-slate-700`}>{label}</span> : null}
      {failed ? (
        <div className={`${className} mx-auto grid w-full max-w-[8rem] place-items-center rounded border border-dashed border-slate-300 bg-white px-2 text-center text-[0.65rem] font-medium text-slate-500`}>
          File unavailable
        </div>
      ) : showImage ? (
        <a {...linkProps} className="block w-full">
          {src ? (
            <img
              src={src}
              alt={name || "Artwork"}
              className={`${className} mx-auto w-full max-w-[8rem] rounded border border-slate-200 object-contain`}
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
          {src || !failed ? "File" : "—"}
        </a>
      )}
      {name ? <p className={`${ui.small} break-all text-slate-600`}>{name}</p> : null}
    </div>
  );
}

function PublicArtworkThumb({ url, mime, name, label, className = "h-14 w-14" }) {
  const fullUrl = uploadAssetUrl(url);
  const showImage = fullUrl && isImageArtwork(mime, name);

  return (
    <div className="flex w-full flex-col gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2">
      {label ? <span className={`${ui.small} font-semibold text-slate-700`}>{label}</span> : null}
      {showImage ? (
        <a href={fullUrl} target="_blank" rel="noreferrer" className="block w-full">
          <img
            src={fullUrl}
            alt={name || "Artwork"}
            className={`${className} mx-auto w-full max-w-[8rem] rounded border border-slate-200 object-contain`}
          />
        </a>
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

function ArtworkThumb({ url, mime, name, label, className, secure = false }) {
  if (secure) {
    return <SecureArtworkThumb url={url} mime={mime} name={name} label={label} className={className} />;
  }
  return <PublicArtworkThumb url={url} mime={mime} name={name} label={label} className={className} />;
}

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

  const fullUrl = uploadAssetUrl(url);
  const showImage = fullUrl && isImageArtwork(order.artworkMime, order.artworkName);

  if (showImage) {
    return (
      <a href={fullUrl} target="_blank" rel="noreferrer" className="shrink-0">
        <img
          src={fullUrl}
          alt={order.artworkName || "Order artwork"}
          className={`${className} rounded-lg border border-slate-200 object-cover`}
        />
      </a>
    );
  }

  return (
    <a
      href={fullUrl || undefined}
      target={fullUrl ? "_blank" : undefined}
      rel={fullUrl ? "noreferrer" : undefined}
      className={`${className} grid shrink-0 place-items-center rounded-lg border border-slate-200 bg-slate-100 px-1 text-center text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500`}
    >
      {fullUrl ? "File" : "—"}
    </a>
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
