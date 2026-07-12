"use client";

import { useState } from "react";

export default function CopyTrackingLink({ refNo }: { refNo: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}/track/${refNo}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copy this tracking link:", url);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      onClick={copy}
      className="inline-flex items-center rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
      title="Copy the public customer tracking link"
    >
      {copied ? "Copied! ✓" : "🔗 Tracking link"}
    </button>
  );
}
