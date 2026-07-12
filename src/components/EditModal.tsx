"use client";

import { useState } from "react";
import { btnGhost } from "@/components/ui";

// Shared modal shell: renders an Edit button; children (the form) mount
// fresh on every open via the key, so stale action state never leaks in.
export default function EditModal({
  title,
  children,
}: {
  title: string;
  children: (close: () => void) => React.ReactNode;
}) {
  const [openCount, setOpenCount] = useState(0);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => {
          setOpenCount((c) => c + 1);
          setOpen(true);
        }}
        className={btnGhost}
      >
        Edit
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            key={openCount}
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{title}</h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-lg px-2 py-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                ✕
              </button>
            </div>
            {children(() => setOpen(false))}
          </div>
        </div>
      )}
    </>
  );
}
