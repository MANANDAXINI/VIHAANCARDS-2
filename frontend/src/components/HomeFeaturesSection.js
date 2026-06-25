"use client";

import { ui } from "@/lib/ui";

const FEATURES = [
  {
    title: "Leaflets & Pamphlets",
    desc: "Upload artwork, choose paper GSM and size, and place bulk print orders online.",
    accent: "bg-blue-600",
  },
  {
    title: "Visiting Cards",
    desc: "Premium card finishes with fast turnaround for agencies and businesses.",
    accent: "bg-indigo-600",
  },
  {
    title: "Track & Pay",
    desc: "UPI payments, wallet credit, and live order status — all in one portal.",
    accent: "bg-sky-600",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Register",
    desc: "Add your business details and create your B2B account.",
  },
  {
    step: "02",
    title: "Get approved",
    desc: "Admin verifies your account so you can start ordering.",
  },
  {
    step: "03",
    title: "Place order",
    desc: "Pick paper, upload artwork, and confirm your print job.",
  },
  {
    step: "04",
    title: "Track delivery",
    desc: "Pay online and follow order status in My Account.",
  },
];

export default function HomeFeaturesSection() {
  return (
    <section className="relative z-10 -mt-8 bg-slate-50 pb-4 pt-2 sm:-mt-10 lg:-mt-12">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-5">
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-lg shadow-slate-900/5 sm:rounded-3xl">
          <div className="border-b border-slate-100 px-5 py-10 sm:px-8 sm:py-12 lg:px-10">
            <div className="mx-auto max-w-3xl text-center lg:mx-0 lg:max-w-2xl lg:text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
                Our services
              </p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Everything you need to print and manage orders
              </h2>
              <p className={`mt-3 text-sm leading-relaxed sm:text-base ${ui.muted}`}>
                Built for printers and advertising agencies — from leaflets to visiting cards.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
              {FEATURES.map((item) => (
                <article
                  key={item.title}
                  className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-slate-50/80 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:bg-white hover:shadow-md hover:shadow-blue-900/5 sm:p-6"
                >
                  <span
                    className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl ${item.accent} text-sm font-bold text-white shadow-sm transition-transform duration-300 group-hover:scale-105`}
                    aria-hidden
                  >
                    {item.title.charAt(0)}
                  </span>
                  <h3 className="text-base font-semibold text-slate-900 sm:text-lg">{item.title}</h3>
                  <p className={`mt-2 flex-1 text-sm leading-relaxed ${ui.muted}`}>{item.desc}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="bg-slate-50/80 px-5 py-10 sm:px-8 sm:py-12 lg:px-10">
            <div className="mx-auto max-w-3xl text-center lg:mx-0 lg:max-w-2xl lg:text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
                Simple process
              </p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                How it works
              </h2>
              <p className={`mt-3 text-sm leading-relaxed sm:text-base ${ui.muted}`}>
                Four quick steps from registration to delivery tracking.
              </p>
            </div>

            <ol className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
              {STEPS.map((item, index) => (
                <li
                  key={item.step}
                  className="relative flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-md hover:shadow-blue-900/5 sm:p-6"
                >
                  {index < STEPS.length - 1 && (
                    <span
                      className="pointer-events-none absolute -right-2 top-1/2 hidden h-px w-4 bg-slate-200 lg:block xl:-right-3 xl:w-5"
                      aria-hidden
                    />
                  )}
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                    Step {item.step}
                  </span>
                  <h3 className="mt-2 text-base font-semibold text-slate-900">{item.title}</h3>
                  <p className={`mt-2 flex-1 text-sm leading-relaxed ${ui.muted}`}>{item.desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
