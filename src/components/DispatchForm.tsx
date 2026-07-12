"use client";

import { useState } from "react";
import ActionForm from "@/components/ActionForm";
import { dispatchTrip } from "@/lib/actions/trips";
import { CHECKLIST_ITEMS } from "@/lib/checklist";
import { btnPrimary, btnGhost } from "@/components/ui";

export default function DispatchForm({ tripId }: { tripId: string }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className={btnPrimary}>
        Dispatch
      </button>
    );
  }

  return (
    <ActionForm action={dispatchTrip}>
      <input type="hidden" name="id" value={tripId} />
      <div className="space-y-2">
        <div className="text-xs font-semibold text-zinc-500">Pre-dispatch vehicle check</div>
        {CHECKLIST_ITEMS.map((item) => (
          <label key={item} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="checklist" value={item} className="h-4 w-4 rounded" />
            {item}
          </label>
        ))}
        <div className="flex gap-2 pt-1">
          <button type="submit" className={btnPrimary}>Confirm & Dispatch</button>
          <button type="button" onClick={() => setOpen(false)} className={btnGhost}>Back</button>
        </div>
      </div>
    </ActionForm>
  );
}
