"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import AuthModal from "@/components/AuthModal";
import SiteHeader from "@/components/SiteHeader";
import HomeHero from "@/components/HomeHero";
import HomeFeaturesSection from "@/components/HomeFeaturesSection";
import { useAuthUser } from "@/context/AuthContext";
import { ui } from "@/lib/ui";

function HomeContent() {
  const user = useAuthUser();
  const router = useRouter();
  const params = useSearchParams();
  const [authModal, setAuthModal] = useState(null);

  const showPending = params.get("pending") === "1" || user?.status === "PENDING";
  const isApprovedCustomer = user && user.role === "CUSTOMER" && user.status === "APPROVED";

  const closeAuthModal = useCallback(() => {
    setAuthModal(null);
    if (params.get("auth") || window.location.hash === "#login") {
      router.replace("/", { scroll: false });
    }
  }, [params, router]);

  const openAuthModal = useCallback((mode) => {
    setAuthModal(mode);
    router.replace(`/?auth=${mode}`, { scroll: false });
  }, [router]);

  useEffect(() => {
    if (user) {
      setAuthModal(null);
      return;
    }
    const auth = params.get("auth");
    if (auth === "login" || auth === "register") {
      setAuthModal(auth);
      return;
    }
    if (typeof window !== "undefined" && window.location.hash === "#login") {
      setAuthModal("login");
    }
  }, [params, user]);

  return (
    <>
      <SiteHeader user={user} />

      <AuthModal
        open={Boolean(authModal) && !user}
        mode={authModal || "login"}
        onClose={closeAuthModal}
        onModeChange={(mode) => {
          setAuthModal(mode);
          router.replace(`/?auth=${mode}`, { scroll: false });
        }}
      />

      <main className="min-h-screen bg-slate-50 text-slate-900">
        <HomeHero
          user={user}
          isApprovedCustomer={isApprovedCustomer}
          onOpenLogin={() => openAuthModal("login")}
          onOpenRegister={() => openAuthModal("register")}
        />
        <HomeFeaturesSection />

        {showPending && user && (
          <section className="py-8">
            <div className={ui.container}>
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Your account is waiting for admin approval. You cannot place orders yet.
              </p>
            </div>
          </section>
        )}

        <section className="pb-12 pt-4 sm:pb-16">
          <div className={ui.container}>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <p className="text-sm sm:text-base">Payment screenshot send to: <strong>7507543214</strong></p>
              <p className={`${ui.muted} ${ui.small} mt-2`}>Need help? Register first — admin will approve your account.</p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
