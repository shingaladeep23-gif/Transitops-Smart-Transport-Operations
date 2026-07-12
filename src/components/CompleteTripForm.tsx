"use client";

import { useState } from "react";
import ActionForm from "@/components/ActionForm";
import { completeTrip } from "@/lib/actions/trips";
import { inputCls, btnPrimary, btnGhost } from "@/components/ui";

export default function CompleteTripForm({ tripId, startOdometerKm }: { tripId: string; startOdometerKm: number }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className={btnPrimary}>
        Complete Trip
      </button>
    );
  }

  return (
    <ActionForm action={completeTrip}>
      <input type="hidden" name="id" value={tripId} />
      <div className="space-y-2">
        <label className="block text-xs text-zinc-500">
          Final odometer (start: {startOdometerKm.toLocaleString()} km)
        </label>
        <input name="endOdometerKm" type="number" step="any" min={startOdometerKm + 1} required placeholder="Final odometer (km)" className={inputCls} />
        <div className="grid grid-cols-2 gap-2">
          <input name="fuelUsedL" type="number" step="any" min="0.1" required placeholder="Fuel used (L)" className={inputCls} />
          <input name="fuelCost" type="number" step="any" min="0" placeholder="Fuel cost (₹)" className={inputCls} />
        </div>
        <label className="block text-xs text-zinc-500">Proof of delivery (optional)</label>
        <input name="podReceiver" placeholder="Received by (name)" className={inputCls} />
        <input name="podNote" placeholder="Delivery note" className={inputCls} />
        <div className="flex gap-2">
          <button type="submit" className={btnPrimary}>Confirm Completion</button>
          <button type="button" onClick={() => setOpen(false)} className={btnGhost}>Back</button>
        </div>
      </div>
    </ActionForm>
  );
}
