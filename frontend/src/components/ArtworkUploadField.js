"use client";

import { useEffect, useRef, useState } from "react";
import FilePickButton from "@/components/FilePickButton";
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
    <div className={`${ui.field} w-full`}>
      <label className={ui.label}>
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
        {hint ? <span className={`${ui.muted} font-normal`}> {hint}</span> : null}
      </label>

      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept={accept}
        onChange={handleFileChange}
        required={required && !file}
      />

      {!file ? (
        <FilePickButton
          inputRef={inputRef}
          buttonLabel="Choose Artwork File"
          title="Upload artwork"
          description="PDF, JPG, PNG or WEBP — tap the button to browse files on your device."
          onChange={handleFileChange}
        />
      ) : null}

      {file ? (
        <div className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 p-3">
          {previewUrl ? (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group block w-full"
              title="Click to view full size"
            >
              <img
                src={previewUrl}
                alt={`${label} preview`}
                className="mx-auto max-h-40 w-full max-w-sm rounded-md border border-slate-200 object-contain shadow-sm transition group-hover:opacity-90"
              />
              <p className={`${ui.small} ${ui.muted} mt-1.5 text-center`}>Click thumbnail to open full size</p>
            </a>
          ) : (
            <div className="flex w-full items-start gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-xs font-bold uppercase text-red-600">
                {isPdf ? "PDF" : "File"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{file.name}</p>
                <p className={`${ui.small} ${ui.muted}`}>
                  {(file.size / 1024).toFixed(0)} KB
                  {isPdf ? " — PDF preview not available" : ""}
                </p>
              </div>
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className={btnClass("secondary", true)}
              onClick={() => inputRef.current?.click()}
            >
              Replace file
            </button>
            <button
              type="button"
              className={btnClass("ghost", true)}
              onClick={clearFile}
            >
              Remove file
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
