"use client";

import { API_URL } from "@/lib/api";
import { ui } from "@/lib/ui";

function isImageArtwork(order) {
  if (order?.artworkMime?.startsWith("image/")) return true;
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(order?.artworkName || "");
}

export default function OrderArtworkThumb({ order, className = "h-16 w-16" }) {
  const url = order?.artworkUrl ? `${API_URL}${order.artworkUrl}` : null;
  const showImage = url && isImageArtwork(order);

  if (showImage) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="shrink-0">
        <img
          src={url}
          alt={order.artworkName || "Order artwork"}
          className={`${className} rounded-lg border border-slate-200 object-cover`}
        />
      </a>
    );
  }

  return (
    <a
      href={url || undefined}
      target={url ? "_blank" : undefined}
      rel={url ? "noreferrer" : undefined}
      className={`${className} grid shrink-0 place-items-center rounded-lg border border-slate-200 bg-slate-100 px-1 text-center text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500`}
    >
      {url ? "File" : "—"}
    </a>
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
