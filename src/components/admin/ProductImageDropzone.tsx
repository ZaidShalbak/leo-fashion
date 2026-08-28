"use client";

import { useRef, useState } from "react";
import { motion } from "motion/react";
import { UploadCloudIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Multi-file drag-and-drop zone for admin image uploads — replaces a
 * plain single-file <input type="file"> that gave no visual affordance
 * for drag-and-drop and couldn't select more than one photo at a time.
 *
 * Interaction pattern (large dropzone, drag states, animated reveal)
 * inspired by kokonutui.com's file-upload component — restyled to this
 * app's own black/white branding rather than its blue-accented look, and
 * substantially rewritten: that component only ever accepted one file
 * and faked its "progress" with a setInterval timer with no real upload
 * behind it. This one is deliberately just the *selection* surface —
 * multi-file, with quick client-side type/size validation for immediate
 * feedback — and leaves the actual upload (one file at a time,
 * sequential, real progress) to the caller, which already owns the
 * color-tagging and server-action logic (see ImageManager.tsx).
 */
export function ProductImageDropzone({
  accept,
  maxFileSizeBytes,
  disabled = false,
  onFilesSelected,
  onFilesRejected,
  label,
  hint,
  browseLabel,
  dragActiveLabel,
}: {
  accept: string;
  maxFileSizeBytes: number;
  disabled?: boolean;
  onFilesSelected: (files: File[]) => void;
  onFilesRejected: (rejections: { file: File; reason: string }[]) => void;
  label: string;
  hint: string;
  browseLabel: string;
  dragActiveLabel: string;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const acceptedTypes = accept.split(",").map((t) => t.trim());

  function partitionFiles(files: FileList | File[]) {
    const accepted: File[] = [];
    const rejected: { file: File; reason: string }[] = [];
    for (const file of Array.from(files)) {
      if (!acceptedTypes.includes(file.type)) {
        rejected.push({ file, reason: "type" });
      } else if (file.size > maxFileSizeBytes) {
        rejected.push({ file, reason: "size" });
      } else {
        accepted.push(file);
      }
    }
    return { accepted, rejected };
  }

  function handleFiles(files: FileList | File[]) {
    const { accepted, rejected } = partitionFiles(files);
    if (accepted.length > 0) onFilesSelected(accepted);
    if (rejected.length > 0) onFilesRejected(rejected);
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={() => !disabled && fileInputRef.current?.click()}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          fileInputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (disabled) return;
        if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        "border-input relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center transition-colors",
        isDragging ? "border-foreground bg-muted" : "hover:border-foreground/40",
        disabled && "pointer-events-none opacity-50"
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={accept}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <motion.div
        animate={{ scale: isDragging ? 1.02 : 1 }}
        transition={{ duration: 0.15 }}
        className="flex flex-col items-center gap-2"
      >
        <UploadCloudIcon className="text-muted-foreground size-6" aria-hidden="true" />
        {/* Plain conditional, not an AnimatePresence exit/enter swap —
            tried that first (mode="wait", then a default-mode crossfade)
            and both left the old label stuck in the DOM alongside the
            new container styling, confirmed by testing, not just in
            theory: dragover fires continuously during a real drag, and
            the exit animation's completion never reliably resolved.
            Correctness matters more than an animated label here; the
            icon scale and border/background transitions below still
            animate fine on their own. */}
        <p className="text-sm font-medium">{isDragging ? dragActiveLabel : label}</p>
        <p className="text-muted-foreground text-xs">{hint}</p>
        <span className="text-foreground mt-1 text-xs underline underline-offset-2">
          {browseLabel}
        </span>
      </motion.div>
    </div>
  );
}
