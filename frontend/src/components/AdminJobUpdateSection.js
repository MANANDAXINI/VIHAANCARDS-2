"use client";

import { useMemo, useRef, useState } from "react";
import FilePickButton from "@/components/FilePickButton";
import { adminApi } from "@/lib/api";
import { parseJobFolderFiles } from "@/lib/job-folder-parse";
import { toast } from "@/lib/toast";
import { btnClass, ui } from "@/lib/ui";

export default function AdminJobUpdateSection({ onRefresh }) {
  const inputKeyRef = useRef(0);
  const [folderName, setFolderName] = useState("");
  const [parsedFiles, setParsedFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState(null);
  const [results, setResults] = useState([]);

  const orderNumbers = useMemo(
    () => [...new Set(parsedFiles.map((file) => file.orderNumber))],
    [parsedFiles]
  );

  function handleFolderSelect(event) {
    const fileList = Array.from(event.target.files || []);
    inputKeyRef.current += 1;

    if (!fileList.length) {
      setParsedFiles([]);
      setFolderName("");
      setSummary(null);
      setResults([]);
      return;
    }

    const rootName = String(fileList[0].webkitRelativePath || "").split(/[/\\]/)[0] || "Selected folder";
    const parsed = parseJobFolderFiles(fileList);

    setFolderName(rootName);
    setParsedFiles(parsed.files);
    setSummary(null);
    setResults([]);

    if (!parsed.orderNumbers.length) {
      toast.error("No PD job IDs found in folder filenames.");
    }
  }

  async function handleCompleteJobs(event) {
    event.preventDefault();
    if (!orderNumbers.length) {
      toast.error("Select a folder with PD job files first.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await adminApi.completeJobsFromFolder(
        { orderNumbers },
        { silent: true }
      );
      setSummary({
        totalJobs: data.totalJobs,
        updatedCount: data.updatedCount,
        failedCount: data.failedCount,
        skippedCount: data.skippedCount,
      });
      setResults(data.results || []);
      toast.success(`Marked ${data.updatedCount} job(s) as completed.`);
      onRefresh?.();
    } catch (error) {
      toast.error(error.message || "Job update failed.");
    } finally {
      setSubmitting(false);
    }
  }

  const folderSummary = folderName
    ? `${folderName} · ${parsedFiles.length} file(s) · ${orderNumbers.length} job(s)`
    : "";

  return (
    <div className="grid gap-4">
      <div>
        <h2 className={ui.adminH1}>Job Update</h2>
        <p className={ui.muted}>
          Select the parent folder that contains business folders with job files starting with PD order numbers.
        </p>
      </div>

      <section className={ui.adminCard}>
        <h3 className={ui.adminH3}>Upload Job Folder</h3>
        <p className={`${ui.small} ${ui.muted}`}>
          Expected: <strong>ParentFolder / BusinessName / PD-00019_....pdf</strong>
        </p>

        <form className="mt-4 grid gap-4" onSubmit={handleCompleteJobs}>
          <FilePickButton
            key={inputKeyRef.current}
            mode="folder"
            buttonLabel="Choose Job Folder"
            title="Upload completed jobs folder"
            description="Pick the main folder that contains business subfolders and PD job files."
            selectedText={folderSummary || undefined}
            onChange={handleFolderSelect}
            disabled={submitting}
            variant="amber"
          />

          <button
            type="submit"
            className={`${btnClass("primary")} w-full sm:w-auto`}
            disabled={submitting || orderNumbers.length === 0}
          >
            {submitting ? "Updating..." : `Mark ${orderNumbers.length || 0} Job(s) Completed`}
          </button>
        </form>
      </section>

      {parsedFiles.length > 0 ? (
        <section className={ui.adminCard}>
          <h3 className={ui.adminH3}>Detected Jobs From Folder</h3>
          <div className={ui.tableWrap}>
            <table className={`${ui.table} min-w-[48rem]`}>
              <thead>
                <tr>
                  <th className={ui.th}>Business Folder</th>
                  <th className={ui.th}>Job ID</th>
                  <th className={ui.th}>File Name</th>
                </tr>
              </thead>
              <tbody>
                {parsedFiles.map((file) => (
                  <tr key={file.relativePath}>
                    <td className={ui.td}>{file.businessFolder}</td>
                    <td className={`${ui.td} font-semibold`}>{file.orderNumber}</td>
                    <td className={`${ui.td} break-all`}>{file.fileName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {summary ? (
        <section className={ui.adminCard}>
          <div className="flex flex-wrap gap-4 text-sm">
            <p><strong>Jobs found:</strong> {summary.totalJobs}</p>
            <p className="text-teal-700"><strong>Completed:</strong> {summary.updatedCount}</p>
            <p className="text-amber-700"><strong>Skipped:</strong> {summary.skippedCount}</p>
            <p className="text-red-700"><strong>Failed:</strong> {summary.failedCount}</p>
          </div>
        </section>
      ) : null}

      {results.length > 0 ? (
        <section className={ui.adminCard}>
          <h3 className={ui.adminH3}>Update Results</h3>
          <div className={ui.tableWrap}>
            <table className={`${ui.table} min-w-[40rem]`}>
              <thead>
                <tr>
                  <th className={ui.th}>Order No.</th>
                  <th className={ui.th}>Customer</th>
                  <th className={ui.th}>Result</th>
                </tr>
              </thead>
              <tbody>
                {results.map((row) => (
                  <tr
                    key={`${row.orderNumber}-${row.status}`}
                    className={
                      row.status === "updated"
                        ? "bg-teal-50/50"
                        : row.status === "skipped"
                          ? "bg-amber-50/50"
                          : "bg-red-50/50"
                    }
                  >
                    <td className={ui.td}>{row.orderNumber}</td>
                    <td className={ui.td}>{row.customer || "—"}</td>
                    <td className={ui.td}>{row.message || row.status}</td>
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
