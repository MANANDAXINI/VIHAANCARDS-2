"use client";

import { useState } from "react";
import { API_URL } from "@/lib/api";
import { ui } from "@/lib/ui";

export default function TapToRevealQr({ imageUrl }) {
  const [revealed, setRevealed] = useState(false);

  if (!imageUrl) {
    return (
      <div className={`grid min-h-[200px] place-items-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm ${ui.muted}`}>
        Payment QR not set yet. Contact admin.
      </div>
    );
  }

  const src = imageUrl.startsWith("http") ? imageUrl : `${API_URL}${imageUrl}`;

  return (
    <button
      type="button"
      className={`relative mx-auto mb-4 block w-full max-w-[280px] overflow-hidden rounded-lg border-0 bg-transparent p-0 ${revealed ? "cursor-default" : "cursor-pointer"}`}
      onClick={() => setRevealed(true)}
      aria-label={revealed ? "UPI QR code" : "Tap to reveal UPI QR code"}
    >
      <img
        src={src}
        alt="UPI payment QR"
        className={`block w-full rounded-lg transition ${revealed ? "" : "blur-[18px] brightness-[0.85]"}`}
      />
      {!revealed && (
        <span className="absolute inset-0 grid place-items-center bg-slate-900/35 text-sm font-semibold text-white">
          Tap to reveal QR
        </span>
      )}
    </button>
  );
}
