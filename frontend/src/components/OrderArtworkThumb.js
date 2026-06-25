"use client";

import { uploadAssetUrl } from "@/lib/api";
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

  return (
    <div className="flex w-full flex-col gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2">
      {label ? <span className={`${ui.small} font-semibold text-slate-700`}>{label}</span> : null}
      {showImage ? (
        <a href={url} target="_blank" rel="noreferrer" className="block w-full">
          <img
            src={url}
            alt={name || "Artwork"}
            className={`${className} mx-auto w-full max-w-[8rem] rounded border border-slate-200 object-contain`}
          />
        </a>
      ) : (
        <a
          href={url || undefined}
          target={url ? "_blank" : undefined}
          rel={url ? "noreferrer" : undefined}
          className={`${className} mx-auto grid w-full max-w-[8rem] place-items-center rounded border border-slate-200 bg-slate-100 px-1 text-center text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500`}
        >
          {url ? "File" : "—"}
        </a>
      )}
      {name ? <p className={`${ui.small} break-all text-slate-600`}>{name}</p> : null}
    </div>
  );
}

export default function OrderArtworkThumb({ order, className = "h-16 w-16" }) {
  const frontUrl = uploadAssetUrl(order?.artworkUrl);
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
  const frontUrl = uploadAssetUrl(order?.artworkUrl);
  const backUrl = uploadAssetUrl(order?.artworkBackUrl);
  const hasBack = Boolean(backUrl || order?.artworkBackName);

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
        />
      ) : null}
      {hasBack ? (
        <ArtworkThumb
          url={backUrl}
          mime={order.artworkBackMime}
          name={order.artworkBackName}
          label="Back"
          className="h-14 w-14"
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
