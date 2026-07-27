"use client";

import { useCallback, useRef, useState } from "react";
import { cn, formatBytes } from "@/lib/utils";

interface DropzoneProps {
  file: File | null;
  onFileSelected: (file: File) => void;
  onFileRemoved: () => void;
  disabled?: boolean;
}

export function Dropzone({ file, onFileSelected, onFileRemoved, disabled }: DropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptFile = useCallback(
    (candidate: File | undefined) => {
      if (!candidate) return;
      if (candidate.type !== "application/pdf" && !candidate.name.toLowerCase().endsWith(".pdf")) {
        return;
      }
      onFileSelected(candidate);
    },
    [onFileSelected]
  );

  if (file) {
    return (
      <div className="relative flex items-center justify-between rounded-md border border-paper-line bg-white px-5 py-4 animate-tape-in">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-ledger-green-soft font-mono text-xs font-semibold text-ledger-green">
            PDF
          </div>
          <div className="min-w-0">
            <p className="truncate font-mono text-sm text-ink">{file.name}</p>
            <p className="text-xs text-slate">{formatBytes(file.size)}</p>
          </div>
        </div>
        <button
          onClick={onFileRemoved}
          disabled={disabled}
          className="focus-ring shrink-0 font-mono text-xs font-medium text-slate underline decoration-paper-line decoration-2 underline-offset-4 hover:text-ink hover:decoration-ink disabled:opacity-40"
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        acceptFile(e.dataTransfer.files?.[0]);
      }}
      className={cn(
        "focus-ring group relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed px-6 py-14 text-center transition-colors",
        isDragging
          ? "border-ledger-green bg-ledger-green-soft"
          : "border-paper-line bg-white hover:border-slate"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        onChange={(e) => acceptFile(e.target.files?.[0])}
      />
      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-paper-line bg-paper font-mono text-lg text-slate group-hover:border-ink group-hover:text-ink">
        ↓
      </div>
      <p className="font-mono text-sm font-medium text-ink">
        Drop a bank statement, or click to browse
      </p>
      <p className="text-xs text-slate">PDF only, up to 15MB</p>
    </div>
  );
}
