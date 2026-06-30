"use client";

import { useRef, useState } from "react";
import FilePickButton from "@/components/FilePickButton";
import { adminApi } from "@/lib/api";
import { formatLedgerTableDate } from "@/lib/order-display";
import { toast } from "@/lib/toast";
import { btnClass, ui } from "@/lib/ui";

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function SingleParcelUpdateForm({ onRefresh, onUpdated }) {
  const [orderNumber, setOrderNumber] = useState("");
  const [lrNumber, setLrNumber] = useState("");
  const [transportDetails, setTransportDetails] = useState("");
  const [dispatchDate, setDispatchDate] = useState(todayInputValue());
  const [saving, setSaving] = useState(false);

  function resetForm() {
    setOrderNumber("");
    setLrNumber("");
    setTransportDetails("");
    setDispatchDate(todayInputValue());
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const normalizedOrder = orderNumber.trim();
    if (!normalizedOrder) {
      toast.error("Order number is required.");
      return;
    }
    if (!lrNumber.trim()) {
      toast.error("LR number is required.");
      return;
    }

    setSaving(true);
    try {
      const data = await adminApi.updateSingleParcel(
        {
          orderNumber: normalizedOrder,
          lrNumber: lrNumber.trim(),
          transportDetails: transportDetails.trim(),
          dispatchDate: dispatchDate || todayInputValue(),
        },
        { silent: true }
      );

      toast.success(`Updated ${data.orderNumber}.`);
      onUpdated?.(data);
      onRefresh?.();
      resetForm();
    } catch (error) {
      toast.error(error.message || "Could not update parcel details.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="grid gap-3" onSubmit={handleSubmit}>
      <label className="grid gap-1">
        <span className={`${ui.small} font-semibold text-slate-700`}>Order No.</span>
        <input
          className={ui.inputCompact}
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          placeholder="PD-00033 or 33"
          disabled={saving}
        />
      </label>

      <label className="grid gap-1">
        <span className={`${ui.small} font-semibold text-slate-700`}>LR Number</span>
        <input
          className={ui.inputCompact}
          value={lrNumber}
          onChange={(e) => setLrNumber(e.target.value)}
          placeholder="LR / Bilty no."
          disabled={saving}
        />
      </label>

      <label className="grid gap-1">
        <span className={`${ui.small} font-semibold text-slate-700`}>Transport / Bus Details</span>
        <textarea
          className={`${ui.inputCompact} min-h-[3.5rem] resize-y`}
          value={transportDetails}
          onChange={(e) => setTransportDetails(e.target.value)}
          placeholder="Courier, bus, transport..."
          disabled={saving}
        />
      </label>

      <label className="grid gap-1">
        <span className={`${ui.small} font-semibold text-slate-700`}>Date</span>
        <input
          className={ui.inputCompact}
          type="date"
          value={dispatchDate}
          onChange={(e) => setDispatchDate(e.target.value)}
          disabled={saving}
        />
      </label>

      <button type="submit" className={`${btnClass("amber", true)} w-full`} disabled={saving}>
        {saving ? "Updating..." : "Update"}
      </button>
    </form>
  );
}

export default function AdminParcelUpdateSection({ onRefresh }) {
  const inputKeyRef = useRef(0);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [results, setResults] = useState([]);
  const [singleResult, setSingleResult] = useState(null);

  function handleFilePick(event) {
    const picked = event.target.files?.[0] || null;
    setFile(picked);
    setSummary(null);
    setResults([]);
    inputKeyRef.current += 1;
  }

  async function handleUpload(event) {
    event.preventDefault();
    if (!file) {
      toast.error("Choose an Excel file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      const data = await adminApi.uploadParcelUpdate(formData, { silent: true });
      setSummary({
        fileName: data.fileName,
        totalRows: data.totalRows,
        updatedCount: data.updatedCount,
        failedCount: data.failedCount,
      });
      setResults(data.results || []);
      setSingleResult(null);
      toast.success(`Updated ${data.updatedCount} of ${data.totalRows} parcel row(s).`);
      onRefresh?.();
    } catch (error) {
      toast.error(error.message || "Parcel upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function handleSingleUpdated(data) {
    setSingleResult(data);
    setSummary(null);
    setResults([]);
  }

  return (
    <div className="grid gap-4">
      <div>
        <h2 className={ui.adminH1}>Parcel Update</h2>
        <p className={ui.muted}>
          Upload Excel for bulk updates, or update one order manually when a single job needs LR and transport details.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={ui.adminCard}>
          <h3 className={ui.adminH3}>Upload Excel</h3>
          <p className={`${ui.small} ${ui.muted}`}>
            Required columns: <strong>orderno</strong>, <strong>lr no</strong>, <strong>transport no</strong>, <strong>date</strong>.
          </p>

          <form className="mt-4 grid gap-4" onSubmit={handleUpload}>
            <FilePickButton
              key={inputKeyRef.current}
              buttonLabel="Choose Excel File"
              title="Upload parcel Excel"
              description="Accepted: .xlsx, .xls, .csv"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              selectedText={file?.name}
              onChange={handleFilePick}
              disabled={uploading}
            />

            <button type="submit" className={`${btnClass("primary")} w-full`} disabled={uploading || !file}>
              {uploading ? "Uploading..." : "Upload & Update Parcels"}
            </button>
          </form>
        </section>

        <section className={ui.adminCard}>
          <h3 className={ui.adminH3}>Single Order Update</h3>
          <p className={`${ui.small} ${ui.muted}`}>
            For one job only — enter order number, LR, transport, and dispatch date.
          </p>

          <div className="mt-4">
            <SingleParcelUpdateForm onRefresh={onRefresh} onUpdated={handleSingleUpdated} />
          </div>
        </section>
      </div>

      {singleResult ? (
        <section className={ui.adminCard}>
          <h3 className={ui.adminH3}>Last Single Update</h3>
          <div className="flex flex-wrap gap-4 text-sm">
            <p><strong>Order:</strong> {singleResult.orderNumber}</p>
            <p><strong>Customer:</strong> {singleResult.customer || "—"}</p>
            <p><strong>LR No.:</strong> {singleResult.lrNumber || "—"}</p>
            <p><strong>Transport:</strong> {singleResult.transportDetails || "—"}</p>
            <p>
              <strong>Date:</strong>{" "}
              {singleResult.dispatchDate ? formatLedgerTableDate(singleResult.dispatchDate) : "—"}
            </p>
            <p className="text-teal-700"><strong>Status:</strong> Updated</p>
          </div>
        </section>
      ) : null}

      {summary ? (
        <section className={ui.adminCard}>
          <div className="flex flex-wrap gap-4 text-sm">
            <p><strong>File:</strong> {summary.fileName}</p>
            <p><strong>Rows:</strong> {summary.totalRows}</p>
            <p className="text-teal-700"><strong>Updated:</strong> {summary.updatedCount}</p>
            <p className="text-red-700"><strong>Failed:</strong> {summary.failedCount}</p>
          </div>
        </section>
      ) : null}

      {results.length > 0 ? (
        <section className={ui.adminCard}>
          <h3 className={ui.adminH3}>Upload Results</h3>
          <div className={ui.tableWrap}>
            <table className={`${ui.table} min-w-[48rem]`}>
              <thead>
                <tr>
                  <th className={ui.th}>Row</th>
                  <th className={ui.th}>Order No.</th>
                  <th className={ui.th}>Customer</th>
                  <th className={ui.th}>LR No.</th>
                  <th className={ui.th}>Transport</th>
                  <th className={ui.th}>Date</th>
                  <th className={ui.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {results.map((row) => (
                  <tr
                    key={`${row.rowNumber}-${row.orderNumber}-${row.status}`}
                    className={row.status === "failed" ? "bg-red-50/70" : "bg-teal-50/40"}
                  >
                    <td className={ui.td}>{row.rowNumber}</td>
                    <td className={ui.td}>{row.orderNumber || "—"}</td>
                    <td className={ui.td}>{row.customer || "—"}</td>
                    <td className={ui.td}>{row.lrNumber || "—"}</td>
                    <td className={ui.td}>{row.transportDetails || "—"}</td>
                    <td className={ui.td}>
                      {row.dispatchDate ? formatLedgerTableDate(row.dispatchDate) : "—"}
                    </td>
                    <td className={ui.td}>
                      {row.status === "updated" ? (
                        <span className="font-semibold text-teal-700">Updated</span>
                      ) : (
                        <span className="text-red-700">{row.message || "Failed"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
