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
  const [selectedFolders, setSelectedFolders] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState(null);
  const [results, setResults] = useState([]);

  const businessFolders = useMemo(() => {
    const map = new Map();
    for (const file of parsedFiles) {
      const key = file.businessFolder || "—";
      if (!map.has(key)) {
        map.set(key, { folder: key, files: [], orderNumbers: new Set() });
      }
      const entry = map.get(key);
      entry.files.push(file);
      entry.orderNumbers.add(file.orderNumber);
    }
    return [...map.values()].map((entry) => ({
      folder: entry.folder,
      fileCount: entry.files.length,
      orderNumbers: [...entry.orderNumbers],
      jobCount: entry.orderNumbers.size,
    }));
  }, [parsedFiles]);

  const selectedOrderNumbers = useMemo(() => {
    const selected = new Set(selectedFolders);
    const nums = new Set();
    for (const group of businessFolders) {
      if (!selected.has(group.folder)) continue;
      for (const n of group.orderNumbers) nums.add(n);
    }
    return [...nums];
  }, [businessFolders, selectedFolders]);

  function handleFolderSelect(event) {
    const fileList = Array.from(event.target.files || []);
    inputKeyRef.current += 1;

    if (!fileList.length) {
      setParsedFiles([]);
      setFolderName("");
      setSelectedFolders([]);
      setSummary(null);
      setResults([]);
      return;
    }

    const rootName =
      String(fileList[0].webkitRelativePath || "").split(/[/\\]/)[0] || "Selected folder";
    const parsed = parseJobFolderFiles(fileList);
    const folders = [
      ...new Set(parsed.files.map((f) => f.businessFolder || "—")),
    ];

    setFolderName(rootName);
    setParsedFiles(parsed.files);
    setSelectedFolders(folders);
    setSummary(null);
    setResults([]);

    if (!parsed.orderNumbers.length) {
      toast.error("No PD job IDs found in folder filenames.");
    } else {
      toast.success(
        `Found ${parsed.orderNumbers.length} job(s) in ${folders.length} folder(s). Select folders, then click Order Completed.`
      );
    }
  }

  function toggleFolder(folder) {
    setSelectedFolders((prev) =>
      prev.includes(folder) ? prev.filter((f) => f !== folder) : [...prev, folder]
    );
  }

  function selectAllFolders() {
    setSelectedFolders(businessFolders.map((g) => g.folder));
  }

  function clearFolderSelection() {
    setSelectedFolders([]);
  }

  async function handleOrderCompleted(event) {
    event.preventDefault();
    if (!selectedOrderNumbers.length) {
      toast.error("Select at least one folder with PD job files.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await adminApi.completeJobsFromFolder(
        { orderNumbers: selectedOrderNumbers },
        { silent: true }
      );
      setSummary({
        totalJobs: data.totalJobs,
        updatedCount: data.updatedCount,
        failedCount: data.failedCount,
        skippedCount: data.skippedCount,
      });
      setResults(data.results || []);
      toast.success(
        `Order Completed for ${data.updatedCount} job(s) — customer panel updated.`
      );

      try {
        window.dispatchEvent(
          new CustomEvent("pd-job-completed", {
            detail: { orderNumbers: selectedOrderNumbers, source: "job-update" },
          })
        );
      } catch {
        // ignore
      }

      onRefresh?.();
    } catch (error) {
      toast.error(error.message || "Order Completed update failed.");
    } finally {
      setSubmitting(false);
    }
  }

  const folderSummary = folderName
    ? `${folderName} · ${parsedFiles.length} file(s) · ${businessFolders.length} folder(s)`
    : "";

  return (
    <div className="grid gap-4">
      <div>
        <h2 className={ui.adminH1}>Order Completed</h2>
        <p className={ui.muted}>
          Folder select karo — andar jitni PD files hongi, unke orders customer panel pe{" "}
          <strong>ORDER COMPLETED</strong> dikhenge.
        </p>
      </div>

      <section className={ui.adminCard}>
        <h3 className={ui.adminH3}>1. Select Folders</h3>
        <p className={`${ui.small} ${ui.muted}`}>
          Expected: <strong>ParentFolder / BusinessName / PD-00019_....pdf</strong>
        </p>

        <div className="mt-4">
          <FilePickButton
            key={inputKeyRef.current}
            mode="folder"
            buttonLabel="Choose Folders"
            title="Select completed jobs folder"
            description="Parent folder choose karo jisme business folders + PD job files hain."
            selectedText={folderSummary || undefined}
            onChange={handleFolderSelect}
            disabled={submitting}
            variant="amber"
          />
        </div>
      </section>

      {businessFolders.length > 0 ? (
        <section className={ui.adminCard}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className={ui.adminH3}>2. Choose which folders to complete</h3>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnClass("ghost", true)} onClick={selectAllFolders}>
                Select all
              </button>
              <button type="button" className={btnClass("ghost", true)} onClick={clearFolderSelection}>
                Clear
              </button>
            </div>
          </div>

          <div className="mt-3 grid gap-2">
            {businessFolders.map((group) => {
              const checked = selectedFolders.includes(group.folder);
              return (
                <label
                  key={group.folder}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 ${
                    checked ? "border-orange-300 bg-orange-50" : "border-slate-200 bg-white"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={checked}
                    onChange={() => toggleFolder(group.folder)}
                    disabled={submitting}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-slate-900">{group.folder}</span>
                    <span className={`${ui.small} ${ui.muted}`}>
                      {group.fileCount} file(s) · {group.jobCount} job(s):{" "}
                      {group.orderNumbers.join(", ")}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>

          <form className="mt-4" onSubmit={handleOrderCompleted}>
            <button
              type="submit"
              className={`${btnClass("success")} w-full sm:w-auto`}
              disabled={submitting || selectedOrderNumbers.length === 0}
            >
              {submitting
                ? "Updating..."
                : `Order Completed (${selectedOrderNumbers.length} job${
                    selectedOrderNumbers.length === 1 ? "" : "s"
                  })`}
            </button>
          </form>
        </section>
      ) : null}

      {parsedFiles.length > 0 ? (
        <section className={ui.adminCard}>
          <h3 className={ui.adminH3}>Files in selected folders</h3>
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
                {parsedFiles
                  .filter((file) => selectedFolders.includes(file.businessFolder || "—"))
                  .map((file) => (
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
            <p>
              <strong>Jobs found:</strong> {summary.totalJobs}
            </p>
            <p className="text-teal-700">
              <strong>Order Completed:</strong> {summary.updatedCount}
            </p>
            <p className="text-amber-700">
              <strong>Skipped:</strong> {summary.skippedCount}
            </p>
            <p className="text-red-700">
              <strong>Failed:</strong> {summary.failedCount}
            </p>
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
