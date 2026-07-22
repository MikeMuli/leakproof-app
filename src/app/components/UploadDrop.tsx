"use client";

import { useRef, useState } from "react";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Real drag-and-drop dropzone with a selected-file chip, replacing a bare
 * <input type=file> — this is the single most-repeated action in the product
 * (every settlement upload, every seller, every period), so it earns real craft.
 */
export default function UploadDrop({
  onFile, disabled = false, accept = ".xlsx,.csv",
}: {
  onFile: (file: File) => void;
  disabled?: boolean;
  accept?: string;
}) {
  const [dragging, setDragging] = useState(false);
  const [selected, setSelected] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setSelected(file);
    onFile(file);
  }

  return (
    <div>
      <div
        className={`lp-drop ${dragging ? "hot" : ""}`}
        onDragEnter={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
        onDrop={(e) => { e.preventDefault(); setDragging(false); if (!disabled) handleFiles(e.dataTransfer.files); }}
      >
        <div className="lp-drop-title">{dragging ? "Drop it" : "Drag your settlement file here"}</div>
        <p className="sub">or click to browse — XLSX or CSV</p>
        <input
          ref={inputRef} type="file" accept={accept} disabled={disabled}
          onChange={(e) => handleFiles(e.target.files)}
          aria-label="Upload settlement file"
        />
      </div>

      {selected && (
        <div className="lp-filechip" style={{ marginTop: 12 }}>
          <span className="dot" style={{ width: 7, height: 7, borderRadius: 99, background: "var(--settled)" }} />
          <b>{selected.name}</b>
          <span style={{ color: "var(--ink-3)" }}>{formatSize(selected.size)}</span>
        </div>
      )}
    </div>
  );
}
