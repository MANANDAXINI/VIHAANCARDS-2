"use client";

import Image from "next/image";
import Link from "next/link";
import { heroBtnPrimary, heroBtnSecondary, ui } from "@/lib/ui";

export default function HomeHero({ user, isApprovedCustomer, onOpenLogin, onOpenRegister }) {
  return (
    <section
      className="relative isolate flex min-h-[min(92vh,880px)] items-center overflow-hidden pt-32 pb-16 text-white max-[900px]:pt-40 max-[560px]:pt-44 max-[560px]:pb-12"
      id="home"
    >
      <Image
        src="/images/herosection.png"
        alt="Professional printing workspace with cards and design samples"
        fill
        priority
        className="object-cover object-[65%_center] sm:object-[70%_center] lg:object-center"
        sizes="100vw"
      />

      <div
        className="absolute inset-0 bg-gradient-to-r from-slate-950/92 via-slate-900/78 to-slate-900/35 lg:from-slate-950/88 lg:via-slate-900/65 lg:to-transparent"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-slate-900/20"
        aria-hidden
      />

      <div className={`${ui.container} relative z-10 w-full`}>
        <div className="mx-auto max-w-3xl text-center lg:mx-0 lg:max-w-2xl lg:text-left">
          <span className="hero-fade-up inline-block rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-white/95 backdrop-blur-sm sm:text-xs">
            B2B Printing Portal
          </span>

          <h1 className="hero-fade-up hero-fade-up-delay-1 mt-5 text-3xl font-bold leading-[1.1] tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
            PIXEL DIGITAL
          </h1>

          <p className="hero-fade-up hero-fade-up-delay-2 mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/90 sm:text-base md:text-lg lg:mx-0">
            Professional print orders for your business — leaflets, visiting cards, and more.
            Register once, get approved, and place orders online.
          </p>

          <div className="hero-fade-up hero-fade-up-delay-3 mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:justify-center lg:justify-start">
            {isApprovedCustomer ? (
              <>
                <Link href="/order" className={`${heroBtnPrimary()} w-full sm:w-auto`}>
                  Place Order
                </Link>
                <Link href="/account" className={`${heroBtnSecondary()} w-full sm:w-auto`}>
                  My Orders
                </Link>
              </>
            ) : !user ? (
              <>
                <button type="button" className={`${heroBtnPrimary()} w-full sm:w-auto`} onClick={onOpenRegister}>
                  Create Account
                </button>
                <button type="button" className={`${heroBtnSecondary()} w-full sm:w-auto`} onClick={onOpenLogin}>
                  Login
                </button>
              </>
            ) : (
              <p className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white/95 backdrop-blur-sm sm:text-base">
                Welcome back, <strong className="font-semibold text-white">{user.business || user.name}</strong>
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
