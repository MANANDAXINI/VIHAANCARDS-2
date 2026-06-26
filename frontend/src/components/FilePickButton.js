"use client";

import { useRef } from "react";
import { btnClass, ui } from "@/lib/ui";

function UploadIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 16V4m0 0L7 9m5-5 5 5M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FolderIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 7a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function FilePickButton({
  mode = "file",
  accept,
  buttonLabel,
  title,
  description,
  selectedText,
  onChange,
  disabled = false,
  variant = "primary",
  className = "",
  inputRef,
}) {
  const internalRef = useRef(null);
  const fileInputRef = inputRef || internalRef;
  const isFolder = mode === "folder";
  const label = buttonLabel || (isFolder ? "Choose Folder to Upload" : "Choose File to Upload");
  const Icon = isFolder ? FolderIcon : UploadIcon;

  return (
    <div
      className={`rounded-xl border-2 border-dashed border-blue-300 bg-gradient-to-b from-blue-50 to-white p-4 sm:p-5 ${className}`}
    >
      {title ? <p className="text-sm font-semibold text-slate-900">{title}</p> : null}
      {description ? <p className={`${ui.small} mt-1 text-slate-600`}>{description}</p> : null}

      <input
        ref={fileInputRef}
        type="file"
        className="sr-only"
        accept={accept}
        multiple={isFolder}
        {...(isFolder ? { webkitdirectory: "", directory: "" } : {})}
        onChange={onChange}
        disabled={disabled}
      />

      <button
        type="button"
        className={`${btnClass(variant)} mt-3 w-full sm:w-auto`}
        disabled={disabled}
        onClick={() => fileInputRef.current?.click()}
      >
        <Icon />
        {label}
      </button>

      {selectedText ? (
        <div className="mt-3 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900">
          <span className="font-semibold">Selected:</span> {selectedText}
        </div>
      ) : (
        <p className={`${ui.small} mt-3 ${ui.muted}`}>
          {isFolder ? "No folder selected yet." : "No file selected yet."}
        </p>
      )}
    </div>
  );
}
