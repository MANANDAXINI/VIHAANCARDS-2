"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import { useAuth, useAuthUser } from "@/context/AuthContext";
import { catalogApi, formatRupees, orderApi } from "@/lib/api";
import { calcOrderAmount } from "@/lib/catalog";
import { toast } from "@/lib/toast";
import { btnClass, chipClass, ui } from "@/lib/ui";

export default function OrderPage() {
  const router = useRouter();
  const { refresh, ready } = useAuth();
  const user = useAuthUser();
  const [catalog, setCatalog] = useState(null);
  const [paperTypeId, setPaperTypeId] = useState("");
  const [sizeId, setSizeId] = useState("");
  const [printingSideId, setPrintingSideId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [artwork, setArtwork] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedPaper = catalog?.paperTypes?.find((p) => p.id === paperTypeId);
  const amount = useMemo(
    () => calcOrderAmount(catalog, paperTypeId, sizeId, printingSideId, quantity),
    [catalog, paperTypeId, sizeId, printingSideId, quantity]
  );

  useEffect(() => {
    if (ready && !user) router.replace("/#login");
    if (ready && user?.role === "ADMIN") router.replace("/admin");
    if (ready && user?.status === "PENDING") router.replace("/?pending=1");
    if (ready && user?.profileNeedsPhone) router.replace("/profile");
  }, [ready, user, router]);

  useEffect(() => {
    catalogApi.get()
      .then((data) => {
        setCatalog(data);
        if (data.paperTypes?.length) setPaperTypeId(data.paperTypes[0].id);
        if (data.sizes?.length) setSizeId(data.sizes[0].id);
        if (data.printingSides?.length) setPrintingSideId(data.printingSides[0].id);
      })
      .catch((e) => toast.error(e.message));
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!artwork) { toast.error("Please upload artwork file."); return; }
    if (!amount) { toast.error("Please select valid options and quantity."); return; }

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error("Enter a valid quantity.");
      return;
    }
    if (selectedPaper && qty > selectedPaper.availableQuantity) {
      toast.error(`Only ${selectedPaper.availableQuantity} available for ${selectedPaper.name}.`);
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append("artwork", artwork);
    formData.append("paperTypeId", paperTypeId);
    formData.append("sizeId", sizeId);
    formData.append("printingSideId", printingSideId);
    formData.append("quantity", String(qty));
    formData.append("amount", String(amount));
    formData.append("useCredit", "true");

    try {
      const data = await orderApi.create(formData, { silent: true });
      await refresh();
      sessionStorage.removeItem("pd_pending_order");
      sessionStorage.setItem("pd_order_review", JSON.stringify({ success: true, order: data.order }));
      router.push("/order/review");
    } catch (error) {
      if (error.status === 402) {
        sessionStorage.setItem("pd_pending_order", JSON.stringify(error.data.pendingOrderData));
        sessionStorage.setItem("pd_order_review", JSON.stringify({
          shortfall: error.data.shortfall,
          orderAmount: error.data.orderAmount,
          availableCredit: error.data.availableCredit,
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
  const sizeName = catalog?.sizes?.find((s) => s.id === sizeId)?.name || "";
  const sideName = catalog?.printingSides?.find((s) => s.id === printingSideId)?.name || "";

  return (
    <>
      <SiteHeader user={user} />
      <main className={ui.page}>
        <div className={ui.pageNarrow}>
          <h1 className={ui.h1}>Place Order — Leaflet / Pamphlet</h1>
          <p className={ui.muted}>Pick paper, size, printing side, and type your quantity.</p>

          {!catalog?.paperTypes?.length && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Catalog not set up yet. Ask admin to add paper types.
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
              <label className={ui.label}>Paper Type (GSM)</label>
              <div className="flex flex-wrap gap-2">
                {catalog?.paperTypes?.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={chipClass(paperTypeId === p.id)}
                    onClick={() => setPaperTypeId(p.id)}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              {selectedPaper && (
                <p className={`${ui.muted} ${ui.small}`}>Available stock: {selectedPaper.availableQuantity.toLocaleString("en-IN")}</p>
              )}
            </div>

            <div className={ui.grid2}>
              <div className={ui.field}>
                <label className={ui.label}>Size</label>
                <select className={ui.input} value={sizeId} onChange={(e) => setSizeId(e.target.value)}>
                  {catalog?.sizes?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className={ui.field}>
                <label className={ui.label}>Quantity (type amount)</label>
                <input
                  className={ui.input}
                  type="number"
                  min="1"
                  placeholder="e.g. 1000"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>
              <div className={ui.field}>
                <label className={ui.label}>Printing Side</label>
                <select className={ui.input} value={printingSideId} onChange={(e) => setPrintingSideId(e.target.value)}>
                  {catalog?.printingSides?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className={ui.field}>
                <label className={ui.label}>Upload Artwork (PDF/JPG)</label>
                <input className={ui.input} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setArtwork(e.target.files?.[0] || null)} required />
              </div>
            </div>

            <div className={ui.priceBox}>
              <div>
                <span className={`${ui.muted} ${ui.small}`}>{paperName} | {sizeName} | {sideName}</span>
                <div>Quantity: <strong>{quantity || "—"}</strong></div>
                <div>Total Price</div>
              </div>
              <strong>{amount ? formatRupees(amount) : "—"}</strong>
            </div>

            <button className={`${btnClass("primary")} w-full sm:w-auto`} type="submit" disabled={submitting || !catalog?.paperTypes?.length}>
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
