"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import ArtworkUploadField from "@/components/ArtworkUploadField";
import ArtworkDualUploadField from "@/components/ArtworkDualUploadField";
import CreditReminderModal, { isCreditReminderDue } from "@/components/CreditReminderModal";
import { useAuth, useAuthUser } from "@/context/AuthContext";
import { catalogApi, formatRupees, orderApi } from "@/lib/api";
import {
  calcOrderAmount,
  filterPapersByCategory,
  getPricedPrintingSides,
  getPricedQuantities,
  getPricedSizes,
  getSuperfastCharge,
  listPaperCategories,
  needsBackUpload,
  resolvePaperCategory,
} from "@/lib/catalog";
import { toast } from "@/lib/toast";
import { btnClass, chipClass, paperTypeChipClass, ui } from "@/lib/ui";

const OTHER_REQUIREMENT_OPTIONS = [
  "CREASING",
  "HALF CUTTING",
  "PERFORATION",
];

const CUTTING_OPTIONS = [
  "Flash Cut",
  "White border",
];

export default function OrderPage() {
  const router = useRouter();
  const { refresh, ready } = useAuth();
  const user = useAuthUser();
  const [catalog, setCatalog] = useState(null);
  const [paperCategory, setPaperCategory] = useState("");
  const [paperTypeId, setPaperTypeId] = useState("");
  const [sizeId, setSizeId] = useState("");
  const [printingSideId, setPrintingSideId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [artworkFront, setArtworkFront] = useState(null);
  const [artworkBack, setArtworkBack] = useState(null);
  const [designFileName, setDesignFileName] = useState("");
  const [transportDetails, setTransportDetails] = useState("");
  const [otherRequirement, setOtherRequirement] = useState("");
  const [cutting, setCutting] = useState("");
  const [superfastDelivery, setSuperfastDelivery] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [quotedAmount, setQuotedAmount] = useState(0);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [showCreditReminder, setShowCreditReminder] = useState(false);

  const pricedPapers = useMemo(() => {
    if (!catalog?.paperTypes?.length) return [];
    const paperIds = new Set(
      (catalog.priceRules || [])
        .filter((r) => Number(r.amount) > 0)
        .map((r) => r.paperTypeId)
    );
    return catalog.paperTypes.filter(
      (p) => p.active !== false && paperIds.has(p.id)
    );
  }, [catalog]);

  const paperList = useMemo(
    () => {
      const active = (catalog?.paperTypes || []).filter((p) => p.active !== false);
      return pricedPapers.length ? pricedPapers : active;
    },
    [pricedPapers, catalog?.paperTypes]
  );

  const paperCategories = useMemo(
    () => listPaperCategories(paperList),
    [paperList]
  );

  const categoryPapers = useMemo(
    () => filterPapersByCategory(paperList, paperCategory),
    [paperList, paperCategory]
  );

  const selectedPaper = paperList.find((p) => p.id === paperTypeId)
    || catalog?.paperTypes?.find((p) => p.id === paperTypeId);

  const pricedSizes = useMemo(
    () => getPricedSizes(catalog, paperTypeId),
    [catalog, paperTypeId]
  );

  const pricedSides = useMemo(
    () => getPricedPrintingSides(catalog, paperTypeId, sizeId),
    [catalog, paperTypeId, sizeId]
  );

  const pricedQuantities = useMemo(
    () => getPricedQuantities(catalog, paperTypeId, sizeId, printingSideId),
    [catalog, paperTypeId, sizeId, printingSideId]
  );

  const localAmount = useMemo(
    () => calcOrderAmount(catalog, paperTypeId, sizeId, printingSideId, quantity),
    [catalog, paperTypeId, sizeId, printingSideId, quantity]
  );

  // Superfast surcharge by base amount: <2k→₹200 | 2k–5k→₹300 | >5k→₹400
  const baseAmount = Number(quotedAmount > 0 ? quotedAmount : localAmount) || 0;
  const superfastCharge = getSuperfastCharge(baseAmount);
  const superfastEligible = baseAmount > 0 && superfastCharge > 0;
  const superfastApplied = Boolean(superfastDelivery) && superfastEligible;
  const amount = superfastApplied ? baseAmount + superfastCharge : baseAmount;

  useEffect(() => {
    if (!superfastEligible && superfastDelivery) {
      setSuperfastDelivery(false);
    }
  }, [superfastEligible, superfastDelivery]);

  const sideName = useMemo(
    () => pricedSides.find((s) => s.id === printingSideId)?.name || "",
    [pricedSides, printingSideId]
  );
  const requiresBackUpload = needsBackUpload(sideName);

  const courierOptions = useMemo(() => {
    const options = [user?.courierName, user?.courierName2, user?.courierName3]
      .map((value) => String(value || "").trim())
      .filter(Boolean);
    return [...new Set(options)];
  }, [user]);

  useEffect(() => {
    if (!requiresBackUpload) {
      setArtworkBack(null);
    }
  }, [requiresBackUpload]);

  useEffect(() => {
    if (!courierOptions.length) {
      setTransportDetails("");
      return;
    }
    setTransportDetails((prev) => (courierOptions.includes(prev) ? prev : courierOptions[0]));
  }, [courierOptions]);

  useEffect(() => {
    if (ready && !user) router.replace("/?auth=login");
    if (ready && user?.role === "ADMIN") router.replace("/admin");
    if (ready && user?.status === "PENDING") router.replace("/?pending=1");
    if (ready && user?.profileNeedsPhone) router.replace("/profile");
  }, [ready, user, router]);

  // Reminder credit limit crossed → show image whenever customer opens Place Order.
  useEffect(() => {
    if (ready && user && isCreditReminderDue(user)) {
      setShowCreditReminder(true);
    }
  }, [ready, user]);

  useEffect(() => {
    catalogApi.get()
      .then((data) => {
        setCatalog(data);
        if (!data.paperTypes?.length) return;

        const papersWithPrices = data.paperTypes.filter(
          (p) =>
            p.active !== false &&
            (data.priceRules || []).some((r) => r.paperTypeId === p.id && Number(r.amount) > 0)
        );
        const activePapers = data.paperTypes.filter((p) => p.active !== false);
        const paperList = papersWithPrices.length ? papersWithPrices : activePapers;
        if (!paperList.length) return;
        const firstPaper = paperList[0];
        const firstPaperId = firstPaper.id;
        setPaperCategory(resolvePaperCategory(firstPaper));
        setPaperTypeId(firstPaperId);

        const sizes = getPricedSizes(data, firstPaperId);
        const firstSize = sizes[0]?.id || "";
        setSizeId(firstSize);

        const sides = getPricedPrintingSides(data, firstPaperId, firstSize);
        const firstSide = sides[0]?.id || "";
        setPrintingSideId(firstSide);

        const qtys = getPricedQuantities(data, firstPaperId, firstSize, firstSide);
        if (qtys[0]) setQuantity(String(qtys[0].value));
      })
      .catch((e) => toast.error(e.message));
  }, []);

  useEffect(() => {
    if (!paperTypeId || !catalog) return;

    const sizes = getPricedSizes(catalog, paperTypeId);
    if (!sizes.some((s) => s.id === sizeId)) {
      const nextSize = sizes[0]?.id || "";
      setSizeId(nextSize);
      const sides = getPricedPrintingSides(catalog, paperTypeId, nextSize);
      const nextSide = sides[0]?.id || "";
      setPrintingSideId(nextSide);
      const qtys = getPricedQuantities(catalog, paperTypeId, nextSize, nextSide);
      setQuantity(qtys[0] ? String(qtys[0].value) : "");
      return;
    }

    const sides = getPricedPrintingSides(catalog, paperTypeId, sizeId);
    if (!sides.some((s) => s.id === printingSideId)) {
      const nextSide = sides[0]?.id || "";
      setPrintingSideId(nextSide);
      const qtys = getPricedQuantities(catalog, paperTypeId, sizeId, nextSide);
      setQuantity(qtys[0] ? String(qtys[0].value) : "");
      return;
    }

    const qtys = getPricedQuantities(catalog, paperTypeId, sizeId, printingSideId);
    if (qtys.length && !qtys.some((q) => String(q.value) === String(quantity))) {
      setQuantity(String(qtys[0].value));
    }
  }, [paperTypeId, sizeId, printingSideId, catalog]);

  useEffect(() => {
    const qty = Number(quantity);
    if (!paperTypeId || !sizeId || !printingSideId || !Number.isFinite(qty) || qty <= 0) {
      setQuotedAmount(0);
      return;
    }

    let cancelled = false;
    setQuoteLoading(true);

    catalogApi
      .quote({ paperTypeId, sizeId, printingSideId, quantity: qty })
      .then((data) => {
        if (!cancelled) setQuotedAmount(Number(data.amount) || 0);
      })
      .catch(() => {
        if (!cancelled) setQuotedAmount(0);
      })
      .finally(() => {
        if (!cancelled) setQuoteLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [paperTypeId, sizeId, printingSideId, quantity]);

  async function handleSubmit(event) {
    event.preventDefault();
    // Every new order attempt: show reminder again if outstanding crossed the limit.
    if (isCreditReminderDue(user)) {
      setShowCreditReminder(true);
    }
    if (!designFileName.trim()) {
      toast.error("Please enter File Name.");
      return;
    }
    if (requiresBackUpload) {
      if (!artworkFront || !artworkBack) {
        toast.error("Please upload front and back design together (select 2 files).");
        return;
      }
    } else if (!artworkFront) {
      toast.error("Please upload design.");
      return;
    }
    if (!amount) {
      toast.error("No price set for this combination. Ask admin to add a rate in Order Catalog.");
      return;
    }
    if (courierOptions.length > 0 && !transportDetails.trim()) {
      toast.error("Please select courier / garaj for transport.");
      return;
    }

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error("Select a valid quantity.");
      return;
    }
    if (selectedPaper && qty > selectedPaper.availableQuantity) {
      toast.error(`Only ${selectedPaper.availableQuantity} available for ${selectedPaper.name}.`);
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append("artwork", artworkFront);
    if (artworkBack) formData.append("artworkBack", artworkBack);
    formData.append("fileName", designFileName.trim());
    formData.append("title", designFileName.trim());
    formData.append("paperTypeId", paperTypeId);
    formData.append("sizeId", sizeId);
    formData.append("printingSideId", printingSideId);
    formData.append("quantity", String(qty));
    formData.append("amount", String(amount));
    formData.append("useCredit", "true");
    if (transportDetails.trim()) {
      formData.append("transportDetails", transportDetails.trim());
    }
    if (otherRequirement.trim()) {
      formData.append("finish", otherRequirement.trim());
    }
    if (cutting.trim()) {
      formData.append("cutting", cutting.trim());
    }
    formData.append("superfastDelivery", superfastApplied ? "true" : "false");
    if (selectedPaper?.name) {
      formData.append("product", selectedPaper.name);
    }

    try {
      const data = await orderApi.create(formData, { silent: true });
      await refresh();
      sessionStorage.removeItem("pd_pending_order");
      sessionStorage.removeItem("pd_order_review");
      toast.success(
        data.message
          || (data.order?.orderNumber
            ? `Order ${data.order.orderNumber} placed successfully.`
            : "Order placed successfully.")
      );
      router.push("/account?tab=both");
    } catch (error) {
      if (error.status === 402) {
        sessionStorage.setItem("pd_pending_order", JSON.stringify(error.data.pendingOrderData));
        sessionStorage.setItem("pd_order_review", JSON.stringify({
          shortfall: error.data.shortfall,
          orderAmount: error.data.orderAmount,
          availableCredit: error.data.availableCredit,
          totalAvailable: error.data.totalAvailable,
          hasCreditFromAdmin: error.data.hasCreditFromAdmin,
        }));
        router.push("/order/review");
        return;
      }
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready || !user) {
    return <div className={`${ui.page} ${ui.container} ${ui.muted}`}>Loading...</div>;
  }

  const paperName = selectedPaper?.name || "";
  const sizeName = pricedSizes.find((s) => s.id === sizeId)?.name || "";
  const hasPricedOptions = pricedSizes.length > 0;

  return (
    <>
      <SiteHeader user={user} />
      <CreditReminderModal
        open={showCreditReminder}
        account={user}
        onClose={() => setShowCreditReminder(false)}
      />
      <main className={ui.page}>
        <div className={ui.pageNarrow}>
          <h1 className={ui.h1}>Place Order — Leaflet / Pamphlet</h1>
          <p className={ui.muted}>Pick paper, size, printing side, and quantity.</p>

          {!catalog?.paperTypes?.length && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Catalog not set up yet. Ask admin to add paper types.
            </p>
          )}

          {catalog?.paperTypes?.length > 0 && !hasPricedOptions && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              No prices set yet. Admin must save rates in Order Catalog for each combination.
            </p>
          )}

          <form className={ui.card} onSubmit={handleSubmit}>
            <p className={`${ui.small} rounded-lg border border-slate-200 bg-slate-50 px-4 py-3`}>
              <span className={ui.muted}>Customer name: </span>
              <strong>{user.name || "—"}</strong>
              {user.business ? (
                <>
                  <span className={ui.muted}> · Business: </span>
                  <strong>{user.business}</strong>
                </>
              ) : null}
            </p>

            <div className={ui.field}>
              <label className={ui.label}>Paper Type</label>
              <div className="flex flex-wrap gap-2.5" role="group" aria-label="Paper type">
                {paperCategories.map((cat) => {
                  const active = paperCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      aria-pressed={active}
                      className={paperTypeChipClass(active)}
                      onClick={() => {
                        setPaperCategory(cat);
                        const nextPapers = filterPapersByCategory(paperList, cat);
                        const nextId = nextPapers[0]?.id || "";
                        setPaperTypeId(nextId);
                      }}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {paperCategory ? (
              <div className={ui.field}>
                <label className={ui.label}>GSM / Subcategory</label>
                <div
                  className="grid max-h-56 grid-cols-2 gap-2.5 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/80 p-3 sm:grid-cols-3"
                  role="group"
                  aria-label="GSM subcategory"
                >
                  {categoryPapers.length === 0 ? (
                    <p className={`${ui.small} col-span-full`}>No papers in this category yet.</p>
                  ) : (
                    categoryPapers.map((p) => {
                      const active = paperTypeId === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          aria-pressed={active}
                          className={`${chipClass(active)} w-full justify-center text-center`}
                          onClick={() => setPaperTypeId(p.id)}
                        >
                          {p.name}
                        </button>
                      );
                    })
                  )}
                </div>
                {selectedPaper ? (
                  <p className="paper-type-selected mt-2 rounded-md border px-3 py-2 text-sm font-semibold">
                    Selected: {paperCategory} → {selectedPaper.name}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className={ui.grid2}>
              <div className={ui.field}>
                <label className={ui.label}>Size</label>
                <select
                  className={ui.input}
                  value={sizeId}
                  onChange={(e) => setSizeId(e.target.value)}
                  disabled={!pricedSizes.length}
                >
                  {pricedSizes.length === 0 ? (
                    <option value="">No priced sizes</option>
                  ) : (
                    pricedSizes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)
                  )}
                </select>
              </div>
              <div className={ui.field}>
                <label className={ui.label}>Quantity</label>
                <select
                  className={ui.input}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  disabled={!pricedQuantities.length}
                  required
                >
                  {pricedQuantities.length === 0 ? (
                    <option value="">No priced quantities</option>
                  ) : (
                    pricedQuantities.map((q) => (
                      <option key={q.id} value={q.value}>
                        {q.label || Number(q.value).toLocaleString("en-IN")}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div className={ui.field}>
                <label className={ui.label}>Printing Side</label>
                <select
                  className={ui.input}
                  value={printingSideId}
                  onChange={(e) => setPrintingSideId(e.target.value)}
                  disabled={!pricedSides.length}
                >
                  {pricedSides.length === 0 ? (
                    <option value="">No priced sides</option>
                  ) : (
                    pricedSides.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)
                  )}
                </select>
              </div>
              <div className={ui.field}>
                <label className={ui.label}>Courier / Garaj (Transport)</label>
                {courierOptions.length > 0 ? (
                  <select
                    className={ui.input}
                    value={transportDetails}
                    onChange={(e) => setTransportDetails(e.target.value)}
                    required
                  >
                    {courierOptions.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    Please add a Courier / Garaj Name in your profile.{" "}
                    <a href="/profile" className="font-semibold underline">Open Profile</a>
                  </div>
                )}
              </div>
              <div className={ui.field}>
                <label className={ui.label}>Other Requirements</label>
                <select
                  className={ui.input}
                  value={otherRequirement}
                  onChange={(e) => setOtherRequirement(e.target.value)}
                >
                  <option value="">None</option>
                  {OTHER_REQUIREMENT_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div className={ui.field}>
                <label className={ui.label}>Cutting</label>
                <select
                  className={ui.input}
                  value={cutting}
                  onChange={(e) => setCutting(e.target.value)}
                >
                  <option value="">None</option>
                  {CUTTING_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4">
              <div className={ui.field}>
                <label className={ui.label}>
                  File Name <span className="text-red-600">*</span>
                </label>
                <input
                  className={ui.input}
                  value={designFileName}
                  onChange={(e) => setDesignFileName(e.target.value)}
                  placeholder="e.g. School Brochure Final"
                  required
                />
                <p className={`${ui.small} ${ui.muted}`}>
                  Ye naam parcel despatch WhatsApp message mein File Name pe aayega.
                </p>
              </div>

              {requiresBackUpload ? (
                <ArtworkDualUploadField
                  frontFile={artworkFront}
                  backFile={artworkBack}
                  onChange={({ front, back }) => {
                    setArtworkFront(front);
                    setArtworkBack(back);
                  }}
                  allowedFormats={selectedPaper?.allowedFormats}
                  required
                />
              ) : (
                <ArtworkUploadField
                  label="Upload Design"
                  file={artworkFront}
                  onChange={setArtworkFront}
                  allowedFormats={selectedPaper?.allowedFormats}
                  required
                />
              )}
            </div>

            <div className={ui.field}>
              <label className={ui.label}>Delivery Speed</label>
              <button
                type="button"
                className={`superfast-btn ${superfastApplied ? "superfast-btn--active" : ""} ${!superfastEligible ? "superfast-btn--disabled" : ""}`}
                onClick={() => {
                  if (!superfastEligible) {
                    toast.error("Select a priced paper combination first.");
                    return;
                  }
                  setSuperfastDelivery((prev) => !prev);
                }}
                aria-pressed={superfastApplied}
              >
                <span className="superfast-btn__bolt" aria-hidden>⚡</span>
                <span className="superfast-btn__text">
                  <strong>Superfast Delivery</strong>
                  <span>
                    {superfastEligible
                      ? `+ ₹${superfastCharge}`
                      : "Select a priced combination first"}
                  </span>
                </span>
                <span className="superfast-btn__badge">
                  {superfastApplied ? "ON" : "OFF"}
                </span>
              </button>
            </div>

            <div className={ui.priceBox}>
              <div>
                <span className={`${ui.muted} ${ui.small}`}>{paperName} | {sizeName} | {sideName}</span>
                <div>Quantity: <strong>{quantity || "—"}</strong></div>
                {superfastApplied ? (
                  <div className={`${ui.small} mt-1 text-orange-700`}>
                    Base {formatRupees(baseAmount)} + Superfast {formatRupees(superfastCharge)}
                  </div>
                ) : null}
                <div>Total Price</div>
                {!baseAmount && !quoteLoading && (
                  <p className={`${ui.small} mt-1 text-amber-700`}>No rate saved for this combination.</p>
                )}
              </div>
              <strong>
                {quoteLoading ? "..." : amount ? formatRupees(amount) : "—"}
              </strong>
            </div>

            <button
              className={`${btnClass("primary")} w-full sm:w-auto`}
              type="submit"
              disabled={submitting || !catalog?.paperTypes?.length || !amount}
            >
              {submitting ? "Submitting..." : (
                <>
                  <span className="sm:hidden">Submit Order{amount ? ` (${formatRupees(amount)})` : ""}</span>
                  <span className="hidden sm:inline">{`Submit Order — ${amount ? formatRupees(amount) : ""}`}</span>
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
