"use client";

import { useEffect, useRef, useState } from "react";
import FilePickButton from "@/components/FilePickButton";
import { toast } from "@/lib/toast";
import { btnClass, ui } from "@/lib/ui";

const ALLOWED_ARTWORK_MIMES = ["application/pdf", "image/jpeg"];
const ALLOWED_ARTWORK_EXT = /\.(pdf|jpe?g)$/i;

function isAllowedArtworkFile(file) {
  if (!file) return false;
  if (ALLOWED_ARTWORK_MIMES.includes(file.type)) return true;
  return !file.type && ALLOWED_ARTWORK_EXT.test(file.name || "");
}

function FilePreviewRow({ label, file }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const isImage = Boolean(file?.type?.startsWith("image/"));
  const isPdf = file?.type === "application/pdf";

  useEffect(() => {
    if (!file || !isImage) {
      setPreviewUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isImage]);

  if (!file) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      {previewUrl ? (
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group block"
          title="Click to view full size"
        >
          <img
            src={previewUrl}
            alt={`${label} preview`}
            className="mx-auto max-h-28 w-full max-w-xs rounded-md border border-slate-200 object-contain shadow-sm transition group-hover:opacity-90"
          />
        </a>
      ) : (
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-xs font-bold uppercase text-red-600">
            {isPdf ? "PDF" : "File"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{file.name}</p>
            <p className={`${ui.small} ${ui.muted}`}>
              {(file.size / 1024).toFixed(0)} KB
              {isPdf ? " — PDF" : ""}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Single upload control for Front + Back (select 2 files in one go).
 * 1st file = Front, 2nd file = Back.
 */
export default function ArtworkDualUploadField({
  frontFile,
  backFile,
  onChange,
  required = false,
  accept = ".pdf,.jpg,.jpeg",
}) {
  const inputRef = useRef(null);
  const bothReady = Boolean(frontFile && backFile);

  function applyFiles(list) {
    const files = Array.from(list || []);
    if (!files.length) {
      onChange({ front: null, back: null });
      return;
    }

    if (files.length !== 2) {
      toast.error("Select exactly 2 files — Front and Back (PDF or JPG).");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    for (const file of files) {
      if (!isAllowedArtworkFile(file)) {
        toast.error("Both files must be PDF or JPG only.");
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
    }

    onChange({ front: files[0], back: files[1] });
  }

  function handleFileChange(event) {
    applyFiles(event.target.files);
  }

  function clearFiles() {
    onChange({ front: null, back: null });
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className={`${ui.field} w-full`}>
      <label className={ui.label}>
        Upload Design
        {required ? <span className="text-red-600"> *</span> : null}
      </label>
      <p className={`${ui.small} mb-2 text-slate-600`}>
        Front Back की दोनों फाइलें एक साथ select करें और यहाँ upload करें। (1st = Front, 2nd = Back)
      </p>

      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept={accept}
        multiple
        onChange={handleFileChange}
        required={required && !bothReady}
      />

      {!bothReady ? (
        <FilePickButton
          inputRef={inputRef}
          multiple
          buttonLabel="Choose Design Files"
          title="Upload Design (Front + Back)"
          description="Front Back की दोनों फाइलें एक साथ select करें और यहाँ upload करें। PDF या JPG only।"
          accept={accept}
          onChange={handleFileChange}
        />
      ) : null}

      {bothReady ? (
        <div className="mt-2 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
          <FilePreviewRow label="Front" file={frontFile} />
          <FilePreviewRow label="Back" file={backFile} />
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button
              type="button"
              className={btnClass("secondary", true)}
              onClick={() => inputRef.current?.click()}
            >
              Replace both files
            </button>
            <button type="button" className={btnClass("ghost", true)} onClick={clearFiles}>
              Remove files
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
