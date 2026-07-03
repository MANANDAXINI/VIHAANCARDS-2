"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { adminApi } from "@/lib/api";
import {
  isAdminAlertsMuted,
  playAdminAlertSound,
  setAdminAlertsMuted,
  speakAdminAlert,
  unlockAdminAlertAudio,
} from "@/lib/admin-alert-sound";
import { toast } from "@/lib/toast";
import { btnClass } from "@/lib/ui";

const POLL_MS = 15000;
const SEEN_KEY = "pd_admin_alerts_seen";

function getSeenSet() {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(sessionStorage.getItem(SEEN_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function markSeen(ids) {
  if (typeof window === "undefined" || !ids.length) return;
  const set = getSeenSet();
  ids.forEach((id) => set.add(id));
  sessionStorage.setItem(SEEN_KEY, JSON.stringify([...set].slice(-300)));
}

function showBrowserNotification(title, body) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, tag: "pd-admin-order-alert" });
  } catch {
    // ignore notification errors
  }
}

export default function AdminAlertWatcher({ enabled, onNewActivity }) {
  const sinceRef = useRef(null);
  const initializedRef = useRef(false);
  const [audioReady, setAudioReady] = useState(false);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setMuted(isAdminAlertsMuted());
  }, []);

  const handleEnableAudio = useCallback(() => {
    const ready = unlockAdminAlertAudio();
    setAudioReady(ready);
    if (ready) {
      playAdminAlertSound();
      speakAdminAlert("Order alerts enabled");
      toast.success("Order alerts enabled.");
    }
  }, []);

  const toggleMute = useCallback(() => {
    const next = !muted;
    setMuted(next);
    setAdminAlertsMuted(next);
    if (!next) {
      unlockAdminAlertAudio();
      toast.success("Order alert sound turned on.");
    } else {
      toast.info("Order alert sound muted.");
    }
  }, [muted]);

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;
    let timer;

    async function poll() {
      try {
        const isFirst = !initializedRef.current;
        const data = await adminApi.alertFeed(
          isFirst ? undefined : sinceRef.current || undefined
        );
        if (cancelled) return;

        sinceRef.current = data.serverTime;

        if (isFirst) {
          initializedRef.current = true;
          markSeen((data.alerts || []).map((alert) => alert.id));
          return;
        }

        const seen = getSeenSet();
        const fresh = (data.alerts || []).filter((alert) => !seen.has(alert.id));
        if (!fresh.length) return;

        markSeen(fresh.map((alert) => alert.id));
        playAdminAlertSound();
        speakAdminAlert(
          fresh.length === 1
            ? "New order received"
            : `${fresh.length} new orders received`
        );

        for (const alert of fresh) {
          toast.info(alert.message, { duration: 10000 });
          showBrowserNotification("PIXEL DIGITAL Admin", alert.message);
        }

        onNewActivity?.(fresh);
      } catch {
        // silent poll failure
      }
    }

    poll();
    timer = setInterval(poll, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [enabled, onNewActivity]);

  useEffect(() => {
    if (!enabled || audioReady) return undefined;

    function onFirstInteraction() {
      if (unlockAdminAlertAudio()) {
        setAudioReady(true);
      }
    }

    window.addEventListener("pointerdown", onFirstInteraction, { once: true });
    window.addEventListener("keydown", onFirstInteraction, { once: true });

    return () => {
      window.removeEventListener("pointerdown", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
    };
  }, [enabled, audioReady]);

  if (!enabled) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
      <span className="font-semibold">Order alerts</span>
      {!audioReady ? (
        <button type="button" className={btnClass("amber", true)} onClick={handleEnableAudio}>
          Enable ring sound
        </button>
      ) : (
        <span className="text-xs text-amber-800">Sound active — checks every 15 sec</span>
      )}
      <button type="button" className={btnClass("ghost", true)} onClick={toggleMute}>
        {muted ? "Unmute" : "Mute"}
      </button>
      {typeof window !== "undefined" && "Notification" in window && Notification.permission === "default" ? (
        <button
          type="button"
          className={btnClass("ghost", true)}
          onClick={() => Notification.requestPermission()}
        >
          Desktop notify
        </button>
      ) : null}
    </div>
  );
}
