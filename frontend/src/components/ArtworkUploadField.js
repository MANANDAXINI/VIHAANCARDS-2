"use client";

import { useEffect, useRef, useState } from "react";
import { btnClass, ui } from "@/lib/ui";

export default function ArtworkUploadField({
  label,
  hint,
  file,
  onChange,
  required = false,
  accept = ".pdf,.jpg,.jpeg,.png,.webp",
}) {
  const inputRef = useRef(null);
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

  function handleFileChange(event) {
    onChange(event.target.files?.[0] || null);
  }

  function clearFile() {
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className={ui.field}>
      <label className={ui.label}>
        {label}
        {hint ? <span className={`${ui.muted} font-normal`}> {hint}</span> : null}
      </label>
      <input
        ref={inputRef}
        className={ui.input}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        required={required && !file}
      />

      {file && (
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          {previewUrl ? (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-block"
              title="Click to view full size"
            >
              <img
                src={previewUrl}
                alt={`${label} preview`}
                className="max-h-36 w-auto max-w-full rounded-md border border-slate-200 object-contain shadow-sm transition group-hover:opacity-90"
              />
              <p className={`${ui.small} ${ui.muted} mt-1.5`}>Click thumbnail to open full size</p>
            </a>
          ) : (
            <div className="flex items-start gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-xs font-bold uppercase text-red-600">
                {isPdf ? "PDF" : "File"}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{file.name}</p>
                <p className={`${ui.small} ${ui.muted}`}>
                  {(file.size / 1024).toFixed(0)} KB
                  {isPdf ? " — PDF preview not available" : ""}
                </p>
              </div>
            </div>
          )}
          <button
            type="button"
            className={`${btnClass("ghost", true)} mt-2`}
            onClick={clearFile}
          >
            Remove file
          </button>
        </div>
      )}
    </div>
  );
}
