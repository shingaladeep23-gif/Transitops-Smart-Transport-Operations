import { prisma } from "@/lib/db";
import { requireSession, canWrite } from "@/lib/auth";
import { createTrip, cancelTrip } from "@/lib/actions/trips";
import { CHECKLIST_ITEMS } from "@/lib/checklist";
import DispatchForm from "@/components/DispatchForm";
import CopyTrackingLink from "@/components/CopyTrackingLink";
import ActionForm from "@/components/ActionForm";
import CompleteTripForm from "@/components/CompleteTripForm";
import { PageHeader, StatusBadge, Card, inputCls, btnPrimary, btnGhost, btnDanger } from "@/components/ui";
import { fmtDate, inr } from "@/lib/format";
import { SearchBar } from "@/components/SearchSort";

export const metadata = { title: "Trips — TransitOps" };

export default async function TripsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireSession();
  const writable = canWrite(session.role, "trips");
  const { q } = await searchParams;
  const now = new Date();

  const [trips, availableVehicles, availableDrivers] = await Promise.all([
    prisma.trip.findMany({
      where: q
        ? {
            OR: [
              { refNo: { contains: q, mode: "insensitive" } },
              { source: { contains: q, mode: "insensitive" } },
              { destination: { contains: q, mode: "insensitive" } },
              { vehicle: { registrationNo: { contains: q, mode: "insensitive" } } },
              { driver: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      include: { vehicle: true, driver: true },
    }),
    // Business rule: only Available vehicles appear in the dispatch pool
    prisma.vehicle.findMany({ where: { status: "AVAILABLE" }, orderBy: { registrationNo: "asc" } }),
    // Business rule: only Available drivers with valid licenses appear
    prisma.driver.findMany({
      where: { status: "AVAILABLE", licenseExpiry: { gt: now } },
      orderBy: { name: "asc" },
    }),
  ]);

  const active = trips.filter((t) => t.status === "DISPATCHED");
  const drafts = trips.filter((t) => t.status === "DRAFT");
  const finished = trips.filter((t) => t.status === "COMPLETED" || t.status === "CANCELLED");

  return (
    <>
      <PageHeader title="Trip Management" subtitle="Draft → Dispatched → Completed / Cancelled" />
      <SearchBar placeholder="Search ref, route, vehicle, driver…" q={q} basePath="/trips" />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section>
            <h2 className="mb-3 text-lg font-semibold">Active Trips ({active.length})</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {active.map((t) => (
                <Card key={t.id}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-mono text-xs text-zinc-500">{t.refNo}</div>
                      <div className="mt-0.5 font-semibold">{t.source} → {t.destination}</div>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                    <dt>Vehicle</dt><dd className="text-right font-medium">{t.vehicle.registrationNo}</dd>
                    <dt>Driver</dt><dd className="text-right font-medium">{t.driver.name}</dd>
                    <dt>Cargo</dt><dd className="text-right">{t.cargoWeightKg} / {t.vehicle.maxLoadKg} kg</dd>
                    <dt>Dispatched</dt><dd className="text-right">{fmtDate(t.dispatchedAt)}</dd>
                  </dl>
                  {writable && (
                    <div className="mt-4 space-y-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                      <CompleteTripForm tripId={t.id} startOdometerKm={t.startOdometerKm ?? 0} />
                      <div className="flex flex-wrap gap-2">
                        <ActionForm action={cancelTrip} confirmMessage={`Cancel ${t.refNo}? Vehicle and driver will return to Available.`}>
                          <input type="hidden" name="id" value={t.id} />
                          <button className={btnDanger}>Cancel Trip</button>
                        </ActionForm>
                        <CopyTrackingLink refNo={t.refNo} />
                      </div>
                    </div>
                  )}
                </Card>
              ))}
              {active.length === 0 && <p className="text-sm text-zinc-500">No trips currently on the road.</p>}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">Draft Trips ({drafts.length})</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {drafts.map((t) => (
                <Card key={t.id}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-mono text-xs text-zinc-500">{t.refNo}</div>
                      <div className="mt-0.5 font-semibold">{t.source} → {t.destination}</div>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                    <dt>Vehicle</dt><dd className="text-right font-medium">{t.vehicle.registrationNo}</dd>
                    <dt>Driver</dt><dd className="text-right font-medium">{t.driver.name}</dd>
                    <dt>Cargo</dt><dd className="text-right">{t.cargoWeightKg} / {t.vehicle.maxLoadKg} kg</dd>
                    <dt>Planned</dt><dd className="text-right">{t.plannedKm} km · {inr.format(t.revenue)}</dd>
                  </dl>
                  {writable && (
                    <div className="mt-4 space-y-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                      <DispatchForm tripId={t.id} />
                      <div className="flex flex-wrap gap-2">
                        <ActionForm action={cancelTrip} confirmMessage={`Cancel draft ${t.refNo}?`}>
                          <input type="hidden" name="id" value={t.id} />
                          <button className={btnGhost}>Cancel</button>
                        </ActionForm>
                        <CopyTrackingLink refNo={t.refNo} />
                      </div>
                    </div>
                  )}
                </Card>
              ))}
              {drafts.length === 0 && <p className="text-sm text-zinc-500">No draft trips.</p>}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">History ({finished.length})</h2>
            <div className="space-y-2">
              {finished.map((t) => (
                <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-zinc-500">{t.refNo}</span>
                    <span className="font-medium">{t.source} → {t.destination}</span>
                    <span className="text-xs text-zinc-500">{t.vehicle.registrationNo} · {t.driver.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    {t.status === "COMPLETED" && t.endOdometerKm != null && t.startOdometerKm != null && (
                      <span>{(t.endOdometerKm - t.startOdometerKm).toLocaleString()} km · {t.fuelUsedL} L</span>
                    )}
                    {t.podReceiver && <span title={t.podNote ?? undefined}>POD: {t.podReceiver}</span>}
                    <StatusBadge status={t.status} />
                  </div>
                </div>
              ))}
              {finished.length === 0 && <p className="text-sm text-zinc-500">No completed or cancelled trips yet.</p>}
            </div>
          </section>
        </div>

        {writable && (
          <Card className="h-fit">
            <h2 className="mb-1 text-lg font-semibold">Create Trip</h2>
            <p className="mb-4 text-xs text-zinc-500">
              Only available vehicles and drivers with valid licenses are listed.
            </p>
            <ActionForm action={createTrip} resetOnSuccess>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input name="source" required placeholder="Source" className={inputCls} />
                  <input name="destination" required placeholder="Destination" className={inputCls} />
                </div>
                <select name="vehicleId" required className={inputCls} defaultValue="">
                  <option value="" disabled>Select vehicle</option>
                  {availableVehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.registrationNo} — {v.name} (max {v.maxLoadKg} kg)
                    </option>
                  ))}
                </select>
                <select name="driverId" required className={inputCls} defaultValue="">
                  <option value="" disabled>Select driver</option>
                  {availableDrivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.licenseCategory}, safety {d.safetyScore}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <input name="cargoWeightKg" type="number" step="any" min="1" required placeholder="Cargo (kg)" className={inputCls} />
                  <input name="plannedKm" type="number" step="any" min="1" required placeholder="Distance (km)" className={inputCls} />
                </div>
                <input name="revenue" type="number" step="any" min="0" placeholder="Trip revenue (₹)" className={inputCls} />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="dispatchNow" defaultChecked className="h-4 w-4 rounded" />
                  Dispatch immediately
                </label>
                <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                  <div className="mb-2 text-xs font-semibold text-zinc-500">
                    Pre-dispatch vehicle check (required to dispatch)
                  </div>
                  <div className="space-y-1.5">
                    {CHECKLIST_ITEMS.map((item) => (
                      <label key={item} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="checklist" value={item} className="h-4 w-4 rounded" />
                        {item}
                      </label>
                    ))}
                  </div>
                </div>
                <button className={`${btnPrimary} w-full`}>Create Trip</button>
              </div>
            </ActionForm>
          </Card>
        )}
      </div>
    </>
  );
}
