"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminSearchBar } from "@/components/AdminTableTools";
import { adminCatalogApi, formatRupees } from "@/lib/api";
import { filterItems } from "@/lib/admin-table";
import { normalizeArtworkFormats } from "@/lib/artwork-formats";
import { toast } from "@/lib/toast";
import { btnClass, ui } from "@/lib/ui";

function paperFormatFlags(paper) {
  const formats = normalizeArtworkFormats(paper?.allowedFormats || "jpg");
  return {
    jpg: formats.includes("jpg") || !formats.includes("cdr"),
    cdr: formats.includes("cdr"),
  };
}

function formatsToStorage({ jpg, cdr }) {
  const parts = [];
  if (jpg) parts.push("jpg");
  if (cdr) parts.push("cdr");
  return parts.length ? parts.join(",") : "jpg";
}

function sortRules(a, b) {
  const sizeCmp = (a.size?.name || "").localeCompare(b.size?.name || "");
  if (sizeCmp !== 0) return sizeCmp;
  const qtyCmp = Number(a.quantity) - Number(b.quantity);
  if (qtyCmp !== 0) return qtyCmp;
  return (a.printingSide?.name || "").localeCompare(b.printingSide?.name || "");
}

function RateActions({ rule, onEdit, onDelete, saving }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className={btnClass("secondary", true)}
        disabled={saving}
        onClick={() => onEdit(rule)}
      >
        Edit
      </button>
      <button
        type="button"
        className={btnClass("ghost", true)}
        disabled={saving}
        onClick={() => onDelete(rule)}
      >
        Delete Rate
      </button>
    </div>
  );
}

export default function AdminRatesSection() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [savingHsnId, setSavingHsnId] = useState(null);
  const [savingPaperId, setSavingPaperId] = useState(null);
  const [editRule, setEditRule] = useState(null);
  const [editForm, setEditForm] = useState({
    paperName: "",
    sizeName: "",
    printingSideName: "",
    amount: "",
    formatJpg: true,
    formatCdr: false,
  });
  const [editSaving, setEditSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await adminCatalogApi.priceRules();
      const priced = (data.items || [])
        .filter((r) => Number(r.amount) > 0)
        .sort(sortRules);
      setRules(priced);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function editHsn(paper) {
    if (!paper?.id) return;
    const next = window.prompt(
      `HSN CODE for ${paper.name || "this paper"}`,
      String(paper.hsnCode || "")
    );
    if (next === null) return;

    setSavingHsnId(paper.id);
    try {
      await adminCatalogApi.updatePaperType(paper.id, { hsnCode: String(next).trim() });
      await load();
      toast.success("HSN CODE saved for all rates of this paper.");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSavingHsnId(null);
    }
  }

  async function editPaperName(paper) {
    if (!paper?.id) return;
    const next = window.prompt(
      `Item / Paper name for "${paper.name || "this item"}"`,
      String(paper.name || "")
    );
    if (next === null) return;
    const name = String(next).trim();
    if (!name) {
      toast.error("Item name cannot be empty.");
      return;
    }

    setSavingPaperId(paper.id);
    try {
      await adminCatalogApi.updatePaperType(paper.id, { name });
      await load();
      toast.success("Item name updated.");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSavingPaperId(null);
    }
  }

  function openEdit(rule) {
    const flags = paperFormatFlags(rule.paperType);
    setEditRule(rule);
    setEditForm({
      paperName: rule.paperType?.name || "",
      sizeName: rule.size?.name || "",
      printingSideName: rule.printingSide?.name || "",
      amount: String(rule.amount ?? ""),
      formatJpg: flags.jpg,
      formatCdr: flags.cdr,
    });
  }

  function closeEdit() {
    if (editSaving) return;
    setEditRule(null);
  }

  async function saveEdit(event) {
    event.preventDefault();
    if (!editRule) return;

    const paperName = editForm.paperName.trim();
    const sizeName = editForm.sizeName.trim();
    const printingSideName = editForm.printingSideName.trim();
    const amount = Number(editForm.amount);

    if (!paperName) {
      toast.error("Item name is required.");
      return;
    }
    if (!sizeName) {
      toast.error("Size / option name is required.");
      return;
    }
    if (!printingSideName) {
      toast.error("Printing side name is required.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid rate amount.");
      return;
    }
    if (!editForm.formatJpg && !editForm.formatCdr) {
      toast.error("Select at least JPG or CDR.");
      return;
    }

    const nextFormats = formatsToStorage({
      jpg: editForm.formatJpg,
      cdr: editForm.formatCdr,
    });
    const prevFormats = formatsToStorage(paperFormatFlags(editRule.paperType));

    setEditSaving(true);
    setSavingId(editRule.id);
    try {
      const tasks = [];

      if (editRule.paperType?.id) {
        const paperPatch = {};
        if (paperName !== (editRule.paperType?.name || "")) {
          paperPatch.name = paperName;
        }
        if (nextFormats !== prevFormats) {
          paperPatch.allowedFormats = nextFormats;
        }
        if (Object.keys(paperPatch).length) {
          tasks.push(adminCatalogApi.updatePaperType(editRule.paperType.id, paperPatch));
        }
      }
      if (editRule.size?.id && sizeName !== (editRule.size?.name || "")) {
        tasks.push(adminCatalogApi.updateSize(editRule.size.id, { name: sizeName }));
      }
      if (
        editRule.printingSide?.id
        && printingSideName !== (editRule.printingSide?.name || "")
      ) {
        tasks.push(
          adminCatalogApi.updatePrintingSide(editRule.printingSide.id, {
            name: printingSideName,
          })
        );
      }
      if (Number(editRule.amount) !== amount) {
        tasks.push(adminCatalogApi.updatePriceRule(editRule.id, { amount }));
      }

      if (!tasks.length) {
        toast.info("No changes to save.");
        setEditRule(null);
        return;
      }

      await Promise.all(tasks);
      await load();
      toast.success("Item / rate / upload format updated.");
      setEditRule(null);
    } catch (e) {
      toast.error(e.message || "Could not save changes.");
    } finally {
      setEditSaving(false);
      setSavingId(null);
    }
  }

  async function deleteRate(rule) {
    const label = `${rule.paperType?.name} | ${rule.size?.name} | ${Number(rule.quantity).toLocaleString("en-IN")} | ${rule.printingSide?.name}`;
    if (!window.confirm(`Delete rate ${formatRupees(rule.amount)} for ${label}?`)) return;

    setSavingId(rule.id);
    try {
      await adminCatalogApi.deletePriceRule(rule.id);
      await load();
      toast.success("Rate deleted.");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSavingId(null);
    }
  }

  const filtered = useMemo(
    () =>
      filterItems(rules, search, [
        "paperType.name",
        "paperType.hsnCode",
        "size.name",
        "quantity",
        "printingSide.name",
        "amount",
      ]),
    [rules, search]
  );

  const grouped = useMemo(() => {
    const map = new Map();
    for (const rule of filtered) {
      const key = rule.paperTypeId;
      if (!map.has(key)) {
        map.set(key, { paper: rule.paperType, rules: [] });
      }
      map.get(key).rules.push(rule);
    }

    return [...map.values()]
      .map((group) => ({
        ...group,
        rules: [...group.rules].sort(sortRules),
      }))
      .sort((a, b) => {
        const orderCmp = (a.paper?.sortOrder ?? 0) - (b.paper?.sortOrder ?? 0);
        if (orderCmp !== 0) return orderCmp;
        return (a.paper?.name || "").localeCompare(b.paper?.name || "");
      });
  }, [filtered]);

  const totalCombos = filtered.length;
  const totalPapers = grouped.length;

  return (
    <div className="grid gap-4">
      <section className={ui.adminCard}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className={ui.adminH3}>All Saved Rates</h3>
            <p className={`${ui.muted} ${ui.small} mt-1`}>
              Edit item name, size, printing side, and rate from here.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={btnClass("ghost", true)} onClick={load} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
            <div className="w-full sm:w-64">
              <AdminSearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search paper, size, qty..."
              />
            </div>
          </div>
        </div>

        <div className={`${ui.statGrid} mt-3`}>
          <div className={ui.statCard}>
            <span className={`block ${ui.small} ${ui.muted}`}>Paper types</span>
            <strong className="text-lg font-semibold text-slate-900">{totalPapers}</strong>
          </div>
          <div className={ui.statCard}>
            <span className={`block ${ui.small} ${ui.muted}`}>Priced combinations</span>
            <strong className="text-lg font-semibold text-slate-900">{totalCombos}</strong>
          </div>
        </div>
      </section>

      {loading ? (
        <p className={ui.muted}>Loading rates...</p>
      ) : grouped.length === 0 ? (
        <section className={ui.adminCard}>
          <p className={ui.muted}>
            {search
              ? "No rates match your search."
              : "No rates saved yet. Add rates in Order Catalog."}
          </p>
        </section>
      ) : (
        grouped.map((group) => {
          const hsn = group.paper?.hsnCode || group.rules[0]?.paperType?.hsnCode || "";
          return (
          <section key={group.paper?.id || group.paper?.name} className={ui.adminCard}>
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  {group.paper?.name || "Unknown paper"}
                </h3>
                <p className={`${ui.muted} ${ui.small}`}>
                  HSN CODE: <strong className="text-slate-800">{hsn || "—"}</strong>
                  {" · "}
                  {group.rules.length} combination{group.rules.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={btnClass("secondary", true)}
                  disabled={!group.paper?.id || savingPaperId === group.paper?.id}
                  onClick={() => editPaperName(group.paper)}
                >
                  {savingPaperId === group.paper?.id ? "Saving..." : "Edit Item Name"}
                </button>
                <button
                  type="button"
                  className={btnClass("secondary", true)}
                  disabled={!group.paper?.id || savingHsnId === group.paper?.id}
                  onClick={() => editHsn(group.paper)}
                >
                  {savingHsnId === group.paper?.id ? "Saving..." : hsn ? "Update HSN" : "Add HSN CODE"}
                </button>
              </div>
            </div>

            <div className={ui.tableWrap}>
              <table className={ui.table}>
                <thead>
                  <tr>
                    <th className={ui.th}>HSN CODE</th>
                    <th className={ui.th}>Size</th>
                    <th className={ui.th}>Quantity</th>
                    <th className={ui.th}>Printing Side</th>
                    <th className={ui.th}>Rate (Rs.)</th>
                    <th className={ui.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {group.rules.map((rule) => (
                    <tr key={rule.id}>
                      <td className={`${ui.td} font-medium`}>
                        {rule.paperType?.hsnCode || hsn || "—"}
                      </td>
                      <td className={ui.td}>{rule.size?.name || "—"}</td>
                      <td className={ui.td}>
                        {Number(rule.quantity).toLocaleString("en-IN")}
                      </td>
                      <td className={ui.td}>{rule.printingSide?.name || "—"}</td>
                      <td className={`${ui.td} font-semibold text-slate-900`}>
                        {formatRupees(rule.amount)}
                      </td>
                      <td className={ui.td}>
                        <RateActions
                          rule={rule}
                          onEdit={openEdit}
                          onDelete={deleteRate}
                          saving={savingId === rule.id}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className={`${ui.mobileCardList} mt-3`}>
              {group.rules.map((rule) => (
                <li key={`m-${rule.id}`} className={ui.mobileCard}>
                  <div className={ui.mobileCardRow}>
                    <span className={ui.muted}>HSN CODE</span>
                    <strong>{rule.paperType?.hsnCode || hsn || "—"}</strong>
                  </div>
                  <div className={ui.mobileCardRow}>
                    <span className={ui.muted}>Size</span>
                    <strong>{rule.size?.name || "—"}</strong>
                  </div>
                  <div className={ui.mobileCardRow}>
                    <span className={ui.muted}>Quantity</span>
                    <strong>{Number(rule.quantity).toLocaleString("en-IN")}</strong>
                  </div>
                  <div className={ui.mobileCardRow}>
                    <span className={ui.muted}>Printing side</span>
                    <strong>{rule.printingSide?.name || "—"}</strong>
                  </div>
                  <div className={ui.mobileCardRow}>
                    <span className={ui.muted}>Rate</span>
                    <strong>{formatRupees(rule.amount)}</strong>
                  </div>
                  <RateActions
                    rule={rule}
                    onEdit={openEdit}
                    onDelete={deleteRate}
                    saving={savingId === rule.id}
                  />
                </li>
              ))}
            </ul>
          </section>
          );
        })
      )}

      {editRule ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-3"
          role="dialog"
          aria-modal="true"
          aria-label="Edit rate item"
          onClick={closeEdit}
        >
          <form
            className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-2xl sm:p-5"
            onClick={(e) => e.stopPropagation()}
            onSubmit={saveEdit}
          >
            <h3 className={ui.adminH3}>Edit Item / Rate</h3>
            <p className={`mt-1 ${ui.small} ${ui.muted}`}>
              Qty {Number(editRule.quantity).toLocaleString("en-IN")} — item name aur rate yahan se change karo.
            </p>

            <div className="mt-4 grid gap-3">
              <label className={ui.field}>
                <span className={ui.label}>Item / Paper name</span>
                <input
                  className={ui.input}
                  value={editForm.paperName}
                  onChange={(e) => setEditForm((f) => ({ ...f, paperName: e.target.value }))}
                  placeholder="e.g. 350 gsm Art Paper"
                  required
                />
              </label>
              <label className={ui.field}>
                <span className={ui.label}>Size / Option name</span>
                <input
                  className={ui.input}
                  value={editForm.sizeName}
                  onChange={(e) => setEditForm((f) => ({ ...f, sizeName: e.target.value }))}
                  placeholder="e.g. Matt Lamination"
                  required
                />
              </label>
              <label className={ui.field}>
                <span className={ui.label}>Printing side</span>
                <input
                  className={ui.input}
                  value={editForm.printingSideName}
                  onChange={(e) => setEditForm((f) => ({ ...f, printingSideName: e.target.value }))}
                  placeholder="e.g. Front Back"
                  required
                />
              </label>
              <label className={ui.field}>
                <span className={ui.label}>Rate (Rs.)</span>
                <input
                  className={ui.input}
                  type="number"
                  min="1"
                  step="1"
                  value={editForm.amount}
                  onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))}
                  required
                />
              </label>

              <div className={ui.field}>
                <span className={ui.label}>Design upload format (Place Order)</span>
                <p className={`${ui.small} ${ui.muted} mb-2`}>
                  By default <strong>JPG</strong>. CDR tick karo tab us paper pe CDR bhi allow hoga.
                </p>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
                    <input
                      type="checkbox"
                      checked={Boolean(editForm.formatJpg)}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, formatJpg: e.target.checked }))
                      }
                      disabled={editSaving}
                    />
                    JPG (default)
                  </label>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
                    <input
                      type="checkbox"
                      checked={Boolean(editForm.formatCdr)}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, formatCdr: e.target.checked }))
                      }
                      disabled={editSaving}
                    />
                    CDR
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className={btnClass("ghost")}
                onClick={closeEdit}
                disabled={editSaving}
              >
                Cancel
              </button>
              <button type="submit" className={btnClass("primary")} disabled={editSaving}>
                {editSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
