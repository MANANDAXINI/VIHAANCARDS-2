"use client";

import { API_URL } from "@/lib/api";
import { ui } from "@/lib/ui";

function isImageArtwork(order, side = "front") {
  const mime = side === "back" ? order?.artworkBackMime : order?.artworkMime;
  const name = side === "back" ? order?.artworkBackName : order?.artworkName;
  if (mime?.startsWith("image/")) return true;
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(name || "");
}

function ArtworkThumb({ url, mime, name, label, className = "h-14 w-14" }) {
  const showImage =
    url && (mime?.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp)/i.test(name || url));

  if (showImage) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="inline-flex flex-col items-start gap-1">
        {label ? <span className={`${ui.small} font-semibold text-slate-700`}>{label}</span> : null}
        <img
          src={url}
          alt={name || "Artwork"}
          className={`${className} rounded border border-slate-200 object-cover`}
        />
      </a>
    );
  }

  return (
    <div className="inline-flex flex-col gap-1">
      {label ? <span className={`${ui.small} font-semibold text-slate-700`}>{label}</span> : null}
      <a
        href={url || undefined}
        target={url ? "_blank" : undefined}
        rel={url ? "noreferrer" : undefined}
        className={`${className} grid place-items-center rounded border border-slate-200 bg-slate-100 px-1 text-center text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500`}
      >
        {url ? "File" : "—"}
      </a>
    </div>
  );
}

export default function OrderArtworkThumb({ order, className = "h-16 w-16" }) {
  const frontUrl = order?.artworkUrl ? `${API_URL}${order.artworkUrl}` : null;
  const showImage = frontUrl && isImageArtwork(order);

  if (showImage) {
    return (
      <a href={frontUrl} target="_blank" rel="noreferrer" className="shrink-0">
        <img
          src={frontUrl}
          alt={order.artworkName || "Order artwork"}
          className={`${className} rounded-lg border border-slate-200 object-cover`}
        />
      </a>
    );
  }

  return (
    <a
      href={frontUrl || undefined}
      target={frontUrl ? "_blank" : undefined}
      rel={frontUrl ? "noreferrer" : undefined}
      className={`${className} grid shrink-0 place-items-center rounded-lg border border-slate-200 bg-slate-100 px-1 text-center text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500`}
    >
      {frontUrl ? "File" : "—"}
    </a>
  );
}

export function OrderArtworkCell({ order }) {
  const frontUrl = order?.artworkUrl ? `${API_URL}${order.artworkUrl}` : null;
  const backUrl = order?.artworkBackUrl ? `${API_URL}${order.artworkBackUrl}` : null;
  const hasBack = Boolean(backUrl || order?.artworkBackName);

  if (!frontUrl && !backUrl) {
    return <span className={ui.muted}>—</span>;
  }

  return (
    <div className="flex flex-wrap items-start gap-3">
      {frontUrl && (
        <ArtworkThumb
          url={frontUrl}
          mime={order.artworkMime}
          name={order.artworkName}
          label={hasBack ? "Front:" : null}
          className="h-12 w-12 sm:h-14 sm:w-14"
        />
      )}
      {hasBack && (
        <ArtworkThumb
          url={backUrl}
          mime={order.artworkBackMime}
          name={order.artworkBackName}
          label="Back:"
          className="h-12 w-12 sm:h-14 sm:w-14"
        />
      )}
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
