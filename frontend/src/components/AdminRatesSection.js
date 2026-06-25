"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminSearchBar } from "@/components/AdminTableTools";
import { adminCatalogApi, formatRupees } from "@/lib/api";
import { filterItems } from "@/lib/admin-table";
import { toast } from "@/lib/toast";
import { btnClass, ui } from "@/lib/ui";

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
        Edit Rate
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

  async function editRate(rule) {
    const next = window.prompt(
      `New rate (Rs.) for ${rule.paperType?.name} | ${rule.size?.name} | ${rule.quantity} | ${rule.printingSide?.name}`,
      String(rule.amount)
    );
    if (next === null) return;

    const amount = Number(next);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }

    setSavingId(rule.id);
    try {
      await adminCatalogApi.updatePriceRule(rule.id, { amount });
      await load();
      toast.success("Rate updated.");
    } catch (e) {
      toast.error(e.message);
    } finally {
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
              Every paper GSM + size + quantity + printing side combination with a saved price.
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
        grouped.map((group) => (
          <section key={group.paper?.id || group.paper?.name} className={ui.adminCard}>
            <h3 className="text-base font-semibold text-slate-900">
              {group.paper?.name || "Unknown paper"}
            </h3>
            <p className={`${ui.muted} ${ui.small} mb-3`}>
              {group.rules.length} combination{group.rules.length === 1 ? "" : "s"}
            </p>

            <div className={ui.tableWrap}>
              <table className={ui.table}>
                <thead>
                  <tr>
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
                          onEdit={editRate}
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
                    onEdit={editRate}
                    onDelete={deleteRate}
                    saving={savingId === rule.id}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
