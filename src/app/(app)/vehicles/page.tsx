import { prisma } from "@/lib/db";
import { requireSession, canWrite } from "@/lib/auth";
import { createVehicle, setVehicleStatus, deleteVehicle } from "@/lib/actions/vehicles";
import ActionForm from "@/components/ActionForm";
import { PageHeader, StatusBadge, Table, Th, Td, Card, inputCls, btnPrimary, btnGhost, btnDanger } from "@/components/ui";
import { inr } from "@/lib/format";

export const metadata = { title: "Vehicles — TransitOps" };

export default async function VehiclesPage() {
  const session = await requireSession();
  const writable = canWrite(session.role, "vehicles");
  const vehicles = await prisma.vehicle.findMany({ orderBy: { registrationNo: "asc" } });

  return (
    <>
      <PageHeader title="Vehicle Registry" subtitle={`${vehicles.length} vehicles in the fleet`} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Table>
            <thead>
              <tr>
                <Th>Registration</Th>
                <Th>Name / Type</Th>
                <Th>Region</Th>
                <Th>Max Load</Th>
                <Th>Odometer</Th>
                <Th>Acq. Cost</Th>
                <Th>Status</Th>
                {writable && <Th>Actions</Th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {vehicles.map((v) => (
                <tr key={v.id}>
                  <Td className="font-mono text-xs font-semibold">{v.registrationNo}</Td>
                  <Td>
                    <div className="font-medium">{v.name}</div>
                    <div className="text-xs text-zinc-500">{v.type}</div>
                  </Td>
                  <Td>{v.region}</Td>
                  <Td>{v.maxLoadKg.toLocaleString()} kg</Td>
                  <Td>{v.odometerKm.toLocaleString()} km</Td>
                  <Td>{inr.format(v.acquisitionCost)}</Td>
                  <Td><StatusBadge status={v.status} /></Td>
                  {writable && (
                    <Td>
                      <div className="flex flex-wrap gap-1.5">
                        {v.status === "IN_SHOP" || v.status === "ON_TRIP" ? null : v.status === "RETIRED" ? (
                          <ActionForm action={setVehicleStatus}>
                            <input type="hidden" name="id" value={v.id} />
                            <input type="hidden" name="status" value="AVAILABLE" />
                            <button className={btnGhost}>Reactivate</button>
                          </ActionForm>
                        ) : (
                          <ActionForm action={setVehicleStatus} confirmMessage={`Retire ${v.registrationNo}?`}>
                            <input type="hidden" name="id" value={v.id} />
                            <input type="hidden" name="status" value="RETIRED" />
                            <button className={btnGhost}>Retire</button>
                          </ActionForm>
                        )}
                        <ActionForm action={deleteVehicle} confirmMessage={`Delete ${v.registrationNo}? This cannot be undone.`}>
                          <input type="hidden" name="id" value={v.id} />
                          <button className={btnDanger}>Delete</button>
                        </ActionForm>
                      </div>
                    </Td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>
        </div>

        {writable && (
          <Card className="h-fit">
            <h2 className="mb-4 text-lg font-semibold">Register Vehicle</h2>
            <ActionForm action={createVehicle} resetOnSuccess>
              <div className="space-y-3">
                <input name="registrationNo" required placeholder="Registration No (unique)" className={inputCls} />
                <input name="name" required placeholder="Vehicle name / model" className={inputCls} />
                <div className="grid grid-cols-2 gap-3">
                  <select name="type" required className={inputCls} defaultValue="">
                    <option value="" disabled>Type</option>
                    {["Truck", "Mini Truck", "Pickup", "Van", "Trailer"].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                  <select name="region" className={inputCls} defaultValue="Central">
                    {["North", "South", "East", "West", "Central"].map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input name="maxLoadKg" type="number" step="any" min="1" required placeholder="Max load (kg)" className={inputCls} />
                  <input name="odometerKm" type="number" step="any" min="0" placeholder="Odometer (km)" className={inputCls} />
                </div>
                <input name="acquisitionCost" type="number" step="any" min="0" placeholder="Acquisition cost (₹)" className={inputCls} />
                <button className={`${btnPrimary} w-full`}>Add Vehicle</button>
              </div>
            </ActionForm>
          </Card>
        )}
      </div>
    </>
  );
}
