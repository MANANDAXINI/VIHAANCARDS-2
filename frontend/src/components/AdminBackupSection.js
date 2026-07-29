"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { toast } from "@/lib/toast";
import { btnClass, ui } from "@/lib/ui";

export default function AdminBackupSection() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.backupStatus();
      setStatus(data);
    } catch (error) {
      toast.error(error.message || "Could not load backup status.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  async function handleRunBackup() {
    setRunning(true);
    try {
      const data = await adminApi.runBackup({ silent: true });
      setLastResult(data.result || null);
      toast.success(data.message || `Backup emailed to ${data.result?.to || "mailbox"}.`);
      await loadStatus();
    } catch (error) {
      toast.error(error.message || "Backup failed.");
    } finally {
      setRunning(false);
    }
  }

  const emailTo = status?.emailTo || "whatsapptogmail@gmail.com";

  return (
    <div className="grid gap-4">
      <section className={ui.adminCard}>
        <h2 className={ui.adminH1}>Auto Back-up of Data</h2>
        <p className={`mt-1 ${ui.muted}`}>
          Daily database backup is emailed as a gzipped JSON file.
        </p>

        {loading && !status ? (
          <p className={`mt-4 ${ui.muted}`}>Loading status...</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className={`${ui.small} ${ui.muted}`}>Backup email</p>
              <p className="mt-1 break-all text-sm font-semibold text-slate-900">{emailTo}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className={`${ui.small} ${ui.muted}`}>Schedule (IST)</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {status?.cronEnabled === false
                  ? "Disabled"
                  : `${status?.cronSchedule || "0 23 * * *"} · Asia/Kolkata (11:00 PM)`}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className={`${ui.small} ${ui.muted}`}>SMTP</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {status?.smtpConfigured ? "Configured" : "Not configured — set SMTP on server"}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className={`${ui.small} ${ui.muted}`}>What is backed up</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                Accounts, orders, ledger, catalog, rates, payments
              </p>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={btnClass("primary")}
            disabled={running || status?.smtpConfigured === false}
            onClick={handleRunBackup}
          >
            {running ? "Sending backup..." : "Send Backup Now"}
          </button>
          <button type="button" className={btnClass("ghost")} disabled={loading} onClick={loadStatus}>
            Refresh Status
          </button>
        </div>

        {lastResult ? (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <p>
              Last sent to <strong>{lastResult.to}</strong> — {lastResult.filename} (
              {Number(lastResult.bytes || 0).toLocaleString("en-IN")} bytes)
            </p>
          </div>
        ) : null}

        <p className={`mt-4 ${ui.small} ${ui.muted}`}>
          Recipient is fixed to <strong>whatsapptogmail@gmail.com</strong> unless{" "}
          <code className="rounded bg-slate-100 px-1">BACKUP_EMAIL_TO</code> is changed on the server.
          Gmail SMTP needs an App Password on{" "}
          <code className="rounded bg-slate-100 px-1">SMTP_PASS</code>.
        </p>
      </section>
    </div>
  );
}
