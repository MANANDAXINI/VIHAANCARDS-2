"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { logEvent } from "firebase/analytics";
import { getFirebaseAnalytics } from "@/lib/firebase";

function FirebaseAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    getFirebaseAnalytics();
  }, []);

  useEffect(() => {
    async function trackPage() {
      const analytics = await getFirebaseAnalytics();
      if (!analytics) return;

      const query = searchParams.toString();
      const pagePath = query ? `${pathname}?${query}` : pathname;

      logEvent(analytics, "page_view", {
        page_path: pagePath,
        page_title: document.title,
      });
    }

    trackPage();
  }, [pathname, searchParams]);

  return null;
}

export default function FirebaseProvider({ children }) {
  return (
    <>
      <FirebaseAnalytics />
      {children}
    </>
  );
}

export async function trackEvent(name, params = {}) {
  const analytics = await getFirebaseAnalytics();
  if (analytics) logEvent(analytics, name, params);
}
