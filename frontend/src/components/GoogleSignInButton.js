"use client";

import { useState } from "react";
import { trackEvent } from "@/components/FirebaseProvider";
import { useAuth } from "@/context/AuthContext";
import { getFirebaseAuthErrorMessage } from "@/lib/auth-validation";
import { getFirebaseAuth } from "@/lib/firebase";
import { toast } from "@/lib/toast";
import { ui } from "@/lib/ui";

export default function GoogleSignInButton({ onSuccess, onError, label = "Continue with Google" }) {
  const { loginWithGoogle } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const firebaseReady = Boolean(getFirebaseAuth());

  async function handleClick() {
    if (!firebaseReady) {
      const msg = "Google sign-in is not configured. Use mobile login instead.";
      toast.error(msg);
      onError?.(msg);
      return;
    }

    setSubmitting(true);
    try {
      const data = await loginWithGoogle();
      trackEvent("login", { method: "google" });
      toast.success("Signed in with Google.");
      onSuccess?.(data);
    } catch (error) {
      const msg = getFirebaseAuthErrorMessage(error);
      toast.error(msg);
      onError?.(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-1">
      <button
        type="button"
        className={`${ui.btn} w-full border border-slate-200 bg-white text-slate-900 hover:bg-slate-50`}
        onClick={handleClick}
        disabled={submitting || !firebaseReady}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        {submitting ? "Signing in..." : label}
      </button>
      {!firebaseReady && <p className={`${ui.small} text-center ${ui.muted}`}>Google login unavailable — use mobile number instead.</p>}
    </div>
  );
}
