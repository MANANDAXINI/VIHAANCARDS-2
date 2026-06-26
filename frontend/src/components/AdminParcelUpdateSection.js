"use client";

import { useState } from "react";
import { adminApi } from "@/lib/api";
import { formatLedgerTableDate } from "@/lib/order-display";
import { toast } from "@/lib/toast";
import { btnClass, ui } from "@/lib/ui";

export default function AdminParcelUpdateSection({ onRefresh }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [results, setResults] = useState([]);

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
      toast.success(`Updated ${data.updatedCount} of ${data.totalRows} parcel row(s).`);
      onRefresh?.();
    } catch (error) {
      toast.error(error.message || "Parcel upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div>
        <h2 className={ui.adminH1}>Parcel Update</h2>
        <p className={ui.muted}>
          Upload an Excel file to update LR number, transport, and dispatch date for multiple orders at once.
        </p>
      </div>

      <section className={ui.adminCard}>
        <h3 className={ui.adminH3}>Upload Excel</h3>
        <p className={`${ui.small} ${ui.muted}`}>
          Required columns: <strong>orderno</strong>, <strong>lr no</strong>, <strong>transport no</strong>, <strong>date</strong>.
          Column names can vary slightly (e.g. order no, transprt no, dispatch date).
        </p>

        <form className="mt-4 grid gap-4" onSubmit={handleUpload}>
          <label className={ui.field}>
            <span className={ui.label}>Excel file (.xlsx, .xls, .csv)</span>
            <input
              className={ui.input}
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              onChange={(event) => {
                setFile(event.target.files?.[0] || null);
                setSummary(null);
                setResults([]);
              }}
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button type="submit" className={btnClass("primary")} disabled={uploading || !file}>
              {uploading ? "Uploading..." : "Upload & Update Parcels"}
            </button>
            {file ? (
              <span className={`${ui.small} self-center ${ui.muted}`}>{file.name}</span>
            ) : null}
          </div>
        </form>
      </section>

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
