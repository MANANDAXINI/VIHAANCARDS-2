"use client";

import { btnClass, ui } from "@/lib/ui";

export default function BusinessPickList({ accounts, onSelect, onBack }) {
  return (
    <div className={`${ui.card} business-pick`}>
      <h3 className={ui.h3}>Select business</h3>
      <p className={`${ui.small} ${ui.muted}`}>This mobile number has multiple businesses. Choose one to log in.</p>
      <div className="grid gap-2">
        {accounts.map((account) => (
          <button
            key={account.id}
            type="button"
            className="grid gap-1 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-left transition hover:border-blue-600 hover:bg-blue-50"
            onClick={() => onSelect(account.id)}
          >
            <strong className="text-sm">{account.business}</strong>
            <span className={`${ui.small} ${ui.muted}`}>{account.name} · {account.status}</span>
          </button>
        ))}
      </div>
      <button type="button" className={btnClass("ghost")} onClick={onBack}>Back</button>
    </div>
  );
}
