"use client";

import { useEffect, useMemo, useState } from "react";
import { adminCatalogApi, formatDate } from "@/lib/api";
import { calcOrderAmount } from "@/lib/catalog";
import { toast } from "@/lib/toast";
import { btnClass, formatOrderStatus, orderStatusClass, ui } from "@/lib/ui";

function formatPhone(phone) {
  return phone?.startsWith("g-") ? "Not set" : phone;
}

function DropdownCrud({
  label,
  items,
  selectedId,
  onSelect,
  getLabel,
  inputValue,
  onInputChange,
  inputPlaceholder,
  onAdd,
  onRename,
  onDelete,
  inputType = "text",
}) {
  return (
    <div className={ui.field}>
      <label className={ui.label}>{label}</label>
      <select
        className={ui.input}
        value={selectedId || ""}
        onChange={(e) => onSelect(e.target.value)}
        disabled={!items.length}
      >
        {items.length === 0 ? (
          <option value="">No options yet</option>
        ) : (
          items.map((item) => (
            <option key={item.id} value={item.id}>
              {getLabel(item)}
            </option>
          ))
        )}
      </select>
      <div className="flex flex-wrap gap-2">
        <input
          className={`${ui.input} min-w-[8rem] flex-1`}
          type={inputType}
          min={inputType === "number" ? "1" : undefined}
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={inputPlaceholder}
        />
        <button type="button" className={btnClass("secondary", true)} onClick={onAdd}>
          Add
        </button>
        <button
          type="button"
          className={btnClass("ghost", true)}
          disabled={!selectedId}
          onClick={onRename}
        >
          Update
        </button>
        <button
          type="button"
          className={btnClass("ghost", true)}
          disabled={!selectedId}
          onClick={onDelete}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default function AdminOrderCatalogSection() {
  const [paperTypes, setPaperTypes] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [printingSides, setPrintingSides] = useState([]);
  const [quantities, setQuantities] = useState([]);
  const [priceRules, setPriceRules] = useState([]);

  const [paperTypeId, setPaperTypeId] = useState("");
  const [sizeId, setSizeId] = useState("");
  const [printingSideId, setPrintingSideId] = useState("");
  const [quantityId, setQuantityId] = useState("");

  const [paperForm, setPaperForm] = useState({ name: "", availableQuantity: "", ratePerThousand: "" });
  const [sizeDraft, setSizeDraft] = useState("");
  const [sideDraft, setSideDraft] = useState("");
  const [qtyDraft, setQtyDraft] = useState("");
  const [ruleRate, setRuleRate] = useState("");

  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [savingPaper, setSavingPaper] = useState(false);
  const [savingRule, setSavingRule] = useState(false);

  const selectedPaper = paperTypes.find((p) => p.id === paperTypeId);
  const selectedQty = quantities.find((q) => q.id === quantityId);

  const catalogPreview = useMemo(
    () => ({ paperTypes, sizes, printingSides, priceRules }),
    [paperTypes, sizes, printingSides, priceRules]
  );

  const previewAmount = useMemo(
    () => calcOrderAmount(catalogPreview, paperTypeId, sizeId, printingSideId, selectedQty?.value),
    [catalogPreview, paperTypeId, sizeId, printingSideId, selectedQty]
  );

  const activeRule = priceRules.find(
    (r) => r.paperTypeId === paperTypeId && r.sizeId === sizeId && r.printingSideId === printingSideId
  );

  async function loadQuantitiesSafe() {
    try {
      const q = await adminCatalogApi.quantities();
      return q.items || [];
    } catch (e) {
      if (e.status === 404) {
        const s = await adminCatalogApi.sizes();
        return s.quantities || [];
      }
      throw e;
    }
  }

  async function loadAll() {
    const [p, s, ps, q, pr] = await Promise.all([
      adminCatalogApi.paperTypes(),
      adminCatalogApi.sizes(),
      adminCatalogApi.printingSides(),
      loadQuantitiesSafe(),
      adminCatalogApi.priceRules(),
    ]);
    setPaperTypes(p.items);
    setSizes(s.items);
    setPrintingSides(ps.items);
    setQuantities(q);
    setPriceRules(pr.items);
    if (q.length === 0) {
      toast.error("No quantity options yet. Redeploy backend on Render if Add Quantity fails.");
    }
    return { paperTypes: p.items, sizes: s.items, printingSides: ps.items, quantities: q };
  }

  useEffect(() => {
    loadAll()
      .then((data) => {
        if (data.paperTypes.length) setPaperTypeId(data.paperTypes[0].id);
        if (data.sizes.length) setSizeId(data.sizes[0].id);
        if (data.printingSides.length) setPrintingSideId(data.printingSides[0].id);
        if (data.quantities.length) setQuantityId(data.quantities[0].id);
      })
      .catch((e) => toast.error(e.message));
  }, []);

  useEffect(() => {
    if (selectedPaper) {
      setPaperForm({
        name: selectedPaper.name,
        availableQuantity: String(selectedPaper.availableQuantity ?? ""),
        ratePerThousand: String(selectedPaper.ratePerThousand ?? ""),
      });
    }
  }, [selectedPaper?.id, selectedPaper?.name, selectedPaper?.availableQuantity, selectedPaper?.ratePerThousand]);

  useEffect(() => {
    if (activeRule) {
      setRuleRate(String(activeRule.ratePerThousand ?? ""));
    } else {
      setRuleRate(selectedPaper ? String(selectedPaper.ratePerThousand ?? "") : "");
    }
  }, [activeRule?.id, activeRule?.ratePerThousand, paperTypeId, sizeId, printingSideId, selectedPaper?.ratePerThousand]);

  async function savePaper() {
    if (!paperForm.name.trim()) {
      toast.error("Paper name is required.");
      return;
    }
    setSavingPaper(true);
    try {
      const body = {
        name: paperForm.name.trim(),
        availableQuantity: Number(paperForm.availableQuantity) || 0,
        ratePerThousand: Number(paperForm.ratePerThousand) || 0,
      };
      if (paperTypeId && selectedPaper) {
        await adminCatalogApi.updatePaperType(paperTypeId, body);
      } else {
        const created = await adminCatalogApi.createPaperType(body);
        setPaperTypeId(created.item.id);
      }
      await loadAll();
      toast.success("Paper saved.");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSavingPaper(false);
    }
  }

  async function deletePaper() {
    if (!paperTypeId) return;
    if (!window.confirm(`Delete paper "${selectedPaper?.name}"?`)) return;
    try {
      await adminCatalogApi.deletePaperType(paperTypeId);
      const data = await loadAll();
      setPaperTypeId(data.paperTypes[0]?.id || "");
      setHistoryData(null);
      toast.success("Paper deleted.");
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function loadHistory() {
    if (!paperTypeId) return;
    setHistoryLoading(true);
    setHistoryData(null);
    try {
      const data = await adminCatalogApi.paperTypeHistory(paperTypeId);
      setHistoryData(data);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function savePriceRule() {
    if (!paperTypeId || !sizeId || !printingSideId) {
      toast.error("Select paper, size, and printing side first.");
      return;
    }
    setSavingRule(true);
    try {
      const ratePerThousand = Number(ruleRate) || 0;
      if (activeRule) {
        await adminCatalogApi.updatePriceRule(activeRule.id, { ratePerThousand });
      } else {
        await adminCatalogApi.createPriceRule({
          paperTypeId,
          sizeId,
          printingSideId,
          ratePerThousand,
        });
      }
      const pr = await adminCatalogApi.priceRules();
      setPriceRules(pr.items);
      toast.success("Rate saved for this combination.");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSavingRule(false);
    }
  }

  function startNewPaper() {
    setPaperTypeId("");
    setPaperForm({ name: "", availableQuantity: "", ratePerThousand: "" });
    setHistoryData(null);
  }

  return (
    <div className="grid gap-4">
      <div className={ui.orderLayout}>
        <aside className={ui.paperSidebar}>
          <h2 className={ui.paperSidebarTitle}>Paper GSM</h2>
          <nav className="grid max-h-[28rem] gap-0.5 overflow-y-auto" aria-label="Paper GSM">
            {paperTypes.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`${ui.paperNavItem} ${paperTypeId === p.id ? ui.paperNavItemActive : ""}`}
                onClick={() => {
                  setPaperTypeId(p.id);
                  setHistoryData(null);
                }}
              >
                {p.name}
                {!p.active && <span className="ml-1 text-xs text-slate-400">(off)</span>}
              </button>
            ))}
          </nav>
          <button type="button" className={`${btnClass("secondary", true)} mt-3 w-full`} onClick={startNewPaper}>
            + Add Paper
          </button>
        </aside>

        <div className={ui.orderFormBody}>
          <h2 className={ui.h3}>Catalog Settings</h2>
          <p className={`${ui.muted} ${ui.small}`}>
            Manage paper stock, dropdown options (size, quantity, printing side), and rates — same layout customers see on orders.
          </p>

          <div className={ui.grid2}>
            <div className={ui.field}>
              <label className={ui.label}>Paper Name</label>
              <input
                className={ui.input}
                value={paperForm.name}
                onChange={(e) => setPaperForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. 90 ART"
              />
            </div>
            <div className={ui.field}>
              <label className={ui.label}>Available Stock</label>
              <input
                className={ui.input}
                type="number"
                min="0"
                value={paperForm.availableQuantity}
                onChange={(e) => setPaperForm((f) => ({ ...f, availableQuantity: e.target.value }))}
              />
            </div>
          </div>

          <div className={ui.field}>
            <label className={ui.label}>Base Rate per 1000 (Rs.)</label>
            <input
              className={ui.input}
              type="number"
              min="0"
              value={paperForm.ratePerThousand}
              onChange={(e) => setPaperForm((f) => ({ ...f, ratePerThousand: e.target.value }))}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnClass("primary")} disabled={savingPaper} onClick={savePaper}>
              {savingPaper ? "Saving..." : paperTypeId ? "Save Paper" : "Create Paper"}
            </button>
            {paperTypeId && (
              <>
                <button type="button" className={btnClass("ghost")} onClick={loadHistory} disabled={historyLoading}>
                  {historyLoading ? "Loading..." : "History"}
                </button>
                <button type="button" className={btnClass("ghost")} onClick={deletePaper}>
                  Delete Paper
                </button>
              </>
            )}
          </div>

          <hr className="border-slate-200" />

          <DropdownCrud
            label="Size"
            items={sizes}
            selectedId={sizeId}
            onSelect={setSizeId}
            getLabel={(item) => item.name}
            inputValue={sizeDraft}
            onInputChange={setSizeDraft}
            inputPlaceholder="New size e.g. 8.5 x 11"
            onAdd={async () => {
              if (!sizeDraft.trim()) return toast.error("Enter a size name.");
              try {
                const created = await adminCatalogApi.createSize({ name: sizeDraft.trim() });
                await loadAll();
                setSizeId(created.item.id);
                setSizeDraft("");
                toast.success("Size added.");
              } catch (e) {
                toast.error(e.message);
              }
            }}
            onRename={async () => {
              if (!sizeId) return;
              const name = sizeDraft.trim() || sizes.find((s) => s.id === sizeId)?.name;
              if (!name) return toast.error("Enter a size name.");
              try {
                await adminCatalogApi.updateSize(sizeId, { name });
                await loadAll();
                setSizeDraft("");
                toast.success("Size updated.");
              } catch (e) {
                toast.error(e.message);
              }
            }}
            onDelete={async () => {
              if (!sizeId || !window.confirm("Delete this size?")) return;
              try {
                await adminCatalogApi.deleteSize(sizeId);
                const data = await loadAll();
                setSizeId(data.sizes[0]?.id || "");
                toast.success("Size deleted.");
              } catch (e) {
                toast.error(e.message);
              }
            }}
          />

          <DropdownCrud
            label="Quantity"
            items={quantities}
            selectedId={quantityId}
            onSelect={setQuantityId}
            getLabel={(item) => item.label || Number(item.value).toLocaleString("en-IN")}
            inputValue={qtyDraft}
            onInputChange={setQtyDraft}
            inputPlaceholder="New quantity e.g. 5000"
            inputType="number"
            onAdd={async () => {
              const value = Number(qtyDraft);
              if (!Number.isFinite(value) || value <= 0) return toast.error("Enter a valid quantity.");
              try {
                const created = await adminCatalogApi.createQuantity({ value, label: String(value) });
                await loadAll();
                setQuantityId(created.item.id);
                setQtyDraft("");
                toast.success("Quantity added.");
              } catch (e) {
                toast.error(e.message);
              }
            }}
            onRename={async () => {
              if (!quantityId) return;
              const value = Number(qtyDraft) || quantities.find((q) => q.id === quantityId)?.value;
              if (!Number.isFinite(value) || value <= 0) return toast.error("Enter a valid quantity.");
              try {
                await adminCatalogApi.updateQuantity(quantityId, { value, label: String(value) });
                await loadAll();
                setQtyDraft("");
                toast.success("Quantity updated.");
              } catch (e) {
                toast.error(e.message);
              }
            }}
            onDelete={async () => {
              if (!quantityId || !window.confirm("Delete this quantity option?")) return;
              try {
                await adminCatalogApi.deleteQuantity(quantityId);
                const data = await loadAll();
                setQuantityId(data.quantities[0]?.id || "");
                toast.success("Quantity deleted.");
              } catch (e) {
                toast.error(e.message);
              }
            }}
          />

          <DropdownCrud
            label="Printing Side"
            items={printingSides}
            selectedId={printingSideId}
            onSelect={setPrintingSideId}
            getLabel={(item) => item.name}
            inputValue={sideDraft}
            onInputChange={setSideDraft}
            inputPlaceholder="e.g. Front Back"
            onAdd={async () => {
              if (!sideDraft.trim()) return toast.error("Enter a printing side name.");
              try {
                const created = await adminCatalogApi.createPrintingSide({ name: sideDraft.trim() });
                await loadAll();
                setPrintingSideId(created.item.id);
                setSideDraft("");
                toast.success("Printing side added.");
              } catch (e) {
                toast.error(e.message);
              }
            }}
            onRename={async () => {
              if (!printingSideId) return;
              const name = sideDraft.trim() || printingSides.find((s) => s.id === printingSideId)?.name;
              if (!name) return toast.error("Enter a printing side name.");
              try {
                await adminCatalogApi.updatePrintingSide(printingSideId, { name });
                await loadAll();
                setSideDraft("");
                toast.success("Printing side updated.");
              } catch (e) {
                toast.error(e.message);
              }
            }}
            onDelete={async () => {
              if (!printingSideId || !window.confirm("Delete this printing side?")) return;
              try {
                await adminCatalogApi.deletePrintingSide(printingSideId);
                const data = await loadAll();
                setPrintingSideId(data.printingSides[0]?.id || "");
                toast.success("Printing side deleted.");
              } catch (e) {
                toast.error(e.message);
              }
            }}
          />

          <div className={ui.field}>
            <label className={ui.label}>Rate per 1000 for selected combo (Rs.)</label>
            <div className="flex flex-wrap gap-2">
              <input
                className={`${ui.input} min-w-[8rem] flex-1`}
                type="number"
                min="0"
                value={ruleRate}
                onChange={(e) => setRuleRate(e.target.value)}
              />
              <button type="button" className={btnClass("secondary")} disabled={savingRule} onClick={savePriceRule}>
                {savingRule ? "Saving..." : "Save Rate"}
              </button>
            </div>
            <p className={`${ui.muted} ${ui.small}`}>
              Overrides base paper rate for this paper + size + printing side combination.
            </p>
          </div>

          <div className={ui.orderTotalBar}>
            <span>Preview Total</span>
            <span>{previewAmount ? `Rs. ${previewAmount.toLocaleString("en-IN")}` : "—"}</span>
          </div>
        </div>
      </div>

      {historyData && (
        <section className={ui.adminCard}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className={ui.adminH3}>
              History — {historyData.paperType?.name} ({historyData.totalOrders} orders,{" "}
              {Number(historyData.totalQuantityIssued || 0).toLocaleString("en-IN")} qty)
            </h3>
            <button type="button" className={btnClass("ghost", true)} onClick={() => setHistoryData(null)}>
              Close
            </button>
          </div>
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th className={ui.th}>Date</th>
                  <th className={ui.th}>Order #</th>
                  <th className={ui.th}>Customer</th>
                  <th className={ui.th}>Business</th>
                  <th className={ui.th}>Phone</th>
                  <th className={ui.th}>Qty</th>
                  <th className={ui.th}>Size</th>
                  <th className={ui.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {historyData.history.length === 0 ? (
                  <tr><td className={ui.td} colSpan="8">No orders yet for this product.</td></tr>
                ) : (
                  historyData.history.map((row) => (
                    <tr key={row.id}>
                      <td className={ui.td}>{formatDate(row.createdAt)}</td>
                      <td className={ui.td}>{row.orderNumber || "—"}</td>
                      <td className={ui.td}>{row.customerName}</td>
                      <td className={ui.td}>{row.business}</td>
                      <td className={ui.td}>{formatPhone(row.phone) || "—"}</td>
                      <td className={ui.td}>{row.quantity || "—"}</td>
                      <td className={ui.td}>{row.size}</td>
                      <td className={ui.td}>
                        <span className={orderStatusClass(row.status)}>{formatOrderStatus(row.status)}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
