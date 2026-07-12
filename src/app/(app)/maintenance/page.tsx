import { prisma } from "@/lib/db";
import { requireSession, canWrite } from "@/lib/auth";
import { createMaintenance, closeMaintenance } from "@/lib/actions/maintenance";
import ActionForm from "@/components/ActionForm";
import { PageHeader, StatusBadge, Table, Th, Td, Card, inputCls, btnPrimary, btnGhost } from "@/components/ui";
import { fmtDate, inr } from "@/lib/format";

export const metadata = { title: "Maintenance — TransitOps" };

export default async function MaintenancePage() {
  const session = await requireSession();
  const writable = canWrite(session.role, "maintenance");

  const [logs, serviceableVehicles] = await Promise.all([
    prisma.maintenanceLog.findMany({
      orderBy: [{ status: "asc" }, { openedAt: "desc" }],
      include: { vehicle: true },
    }),
    // Vehicles on a trip or retired cannot be sent to the shop
    prisma.vehicle.findMany({
      where: { status: { in: ["AVAILABLE", "IN_SHOP"] } },
      orderBy: { registrationNo: "asc" },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Maintenance"
        subtitle="Opening a log moves the vehicle to In Shop; closing it restores availability"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Table>
            <thead>
              <tr>
                <Th>Vehicle</Th>
                <Th>Work</Th>
                <Th>Cost</Th>
                <Th>Opened</Th>
                <Th>Closed</Th>
                <Th>Status</Th>
                {writable && <Th>Actions</Th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {logs.map((m) => (
                <tr key={m.id}>
                  <Td className="font-mono text-xs font-semibold">{m.vehicle.registrationNo}</Td>
                  <Td>
                    <div className="font-medium">{m.title}</div>
                    {m.description && <div className="text-xs text-zinc-500">{m.description}</div>}
                  </Td>
                  <Td>{inr.format(m.cost)}</Td>
                  <Td className="text-xs">{fmtDate(m.openedAt)}</Td>
                  <Td className="text-xs">{fmtDate(m.closedAt)}</Td>
                  <Td><StatusBadge status={m.status} /></Td>
                  {writable && (
                    <Td>
                      {m.status === "OPEN" && (
                        <ActionForm action={closeMaintenance}>
                          <input type="hidden" name="id" value={m.id} />
                          <button className={btnGhost}>Close & Release</button>
                        </ActionForm>
                      )}
                    </Td>
                  )}
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><Td className="text-zinc-400">No maintenance records yet.</Td></tr>
              )}
            </tbody>
          </Table>
        </div>

        {writable && (
          <Card className="h-fit">
            <h2 className="mb-4 text-lg font-semibold">Open Maintenance Log</h2>
            <ActionForm action={createMaintenance} resetOnSuccess>
              <div className="space-y-3">
                <select name="vehicleId" required className={inputCls} defaultValue="">
                  <option value="" disabled>Select vehicle</option>
                  {serviceableVehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.registrationNo} — {v.name}
                    </option>
                  ))}
                </select>
                <input name="title" required placeholder="Work title (e.g. Oil Change)" className={inputCls} />
                <textarea name="description" placeholder="Description (optional)" rows={3} className={inputCls} />
                <input name="cost" type="number" step="any" min="0" placeholder="Estimated cost (₹)" className={inputCls} />
                <button className={`${btnPrimary} w-full`}>Open Log — moves vehicle In Shop</button>
              </div>
            </ActionForm>
          </Card>
        )}
      </div>
    </>
  );
}
