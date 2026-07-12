"use client";

import ActionForm from "@/components/ActionForm";
import EditModal from "@/components/EditModal";
import { updateVehicle } from "@/lib/actions/vehicles";
import { inputCls, btnPrimary } from "@/components/ui";

export type EditableVehicle = {
  id: string;
  registrationNo: string;
  name: string;
  type: string;
  region: string;
  maxLoadKg: number;
  odometerKm: number;
  acquisitionCost: number;
};

const TYPES = ["Truck", "Mini Truck", "Pickup", "Van", "Trailer"];
const REGIONS = ["North", "South", "East", "West", "Central"];

export default function EditVehicleForm({ vehicle }: { vehicle: EditableVehicle }) {
  const types = TYPES.includes(vehicle.type) ? TYPES : [vehicle.type, ...TYPES];
  const regions = REGIONS.includes(vehicle.region) ? REGIONS : [vehicle.region, ...REGIONS];

  return (
    <EditModal title={`Edit ${vehicle.registrationNo}`}>
      {(close) => (
        <ActionForm action={updateVehicle} onSuccess={close}>
          <input type="hidden" name="id" value={vehicle.id} />
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Registration No (unique)</label>
              <input name="registrationNo" required defaultValue={vehicle.registrationNo} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Vehicle name / model</label>
              <input name="name" required defaultValue={vehicle.name} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Type</label>
                <select name="type" defaultValue={vehicle.type} className={inputCls}>
                  {types.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Region</label>
                <select name="region" defaultValue={vehicle.region} className={inputCls}>
                  {regions.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Max load (kg)</label>
                <input name="maxLoadKg" type="number" step="any" min="1" required defaultValue={vehicle.maxLoadKg} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Odometer (km)</label>
                <input name="odometerKm" type="number" step="any" min="0" defaultValue={vehicle.odometerKm} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Acquisition cost (₹)</label>
              <input name="acquisitionCost" type="number" step="any" min="0" defaultValue={vehicle.acquisitionCost} className={inputCls} />
            </div>
            <button className={`${btnPrimary} w-full`}>Save Changes</button>
            <p className="text-xs text-zinc-400">
              Status is managed automatically by trips, maintenance and retirement.
            </p>
          </div>
        </ActionForm>
      )}
    </EditModal>
  );
}
