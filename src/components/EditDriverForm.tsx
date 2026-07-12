"use client";

import ActionForm from "@/components/ActionForm";
import EditModal from "@/components/EditModal";
import { updateDriver } from "@/lib/actions/drivers";
import { inputCls, btnPrimary } from "@/components/ui";

export type EditableDriver = {
  id: string;
  name: string;
  licenseNo: string;
  licenseCategory: string;
  licenseExpiry: string; // YYYY-MM-DD
  phone: string;
  safetyScore: number;
};

const CATEGORIES = ["LMV", "HMV", "MCWG", "Trailer"];

export default function EditDriverForm({ driver }: { driver: EditableDriver }) {
  const categories = CATEGORIES.includes(driver.licenseCategory)
    ? CATEGORIES
    : [driver.licenseCategory, ...CATEGORIES];

  return (
    <EditModal title={`Edit ${driver.name}`}>
      {(close) => (
        <ActionForm action={updateDriver} onSuccess={close}>
          <input type="hidden" name="id" value={driver.id} />
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Full name</label>
              <input name="name" required defaultValue={driver.name} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">License number (unique)</label>
              <input name="licenseNo" required defaultValue={driver.licenseNo} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Category</label>
                <select name="licenseCategory" defaultValue={driver.licenseCategory} className={inputCls}>
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Safety score (0–100)</label>
                <input name="safetyScore" type="number" min="0" max="100" defaultValue={driver.safetyScore} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">License expiry</label>
              <input name="licenseExpiry" type="date" required defaultValue={driver.licenseExpiry} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Contact number</label>
              <input name="phone" required defaultValue={driver.phone} className={inputCls} />
            </div>
            <button className={`${btnPrimary} w-full`}>Save Changes</button>
            <p className="text-xs text-zinc-400">
              Status is managed from the drivers list (Activate / Off Duty / Suspend) and by trips.
            </p>
          </div>
        </ActionForm>
      )}
    </EditModal>
  );
}
