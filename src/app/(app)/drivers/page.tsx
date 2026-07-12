import { prisma } from "@/lib/db";
import { requireSession, canWrite } from "@/lib/auth";
import { createDriver, setDriverStatus, deleteDriver } from "@/lib/actions/drivers";
import ActionForm from "@/components/ActionForm";
import { PageHeader, StatusBadge, Table, Th, Td, Card, inputCls, btnPrimary, btnGhost, btnDanger } from "@/components/ui";
import { fmtDate } from "@/lib/format";

export const metadata = { title: "Drivers — TransitOps" };

export default async function DriversPage() {
  const session = await requireSession();
  const writable = canWrite(session.role, "drivers");
  const drivers = await prisma.driver.findMany({ orderBy: { name: "asc" } });
  const now = new Date();

  return (
    <>
      <PageHeader title="Driver Management" subtitle={`${drivers.length} drivers on record`} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>License</Th>
                <Th>Expiry</Th>
                <Th>Phone</Th>
                <Th>Safety</Th>
                <Th>Status</Th>
                {writable && <Th>Actions</Th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {drivers.map((d) => {
                const expired = d.licenseExpiry < now;
                return (
                  <tr key={d.id}>
                    <Td className="font-medium">{d.name}</Td>
                    <Td>
                      <div className="font-mono text-xs">{d.licenseNo}</div>
                      <div className="text-xs text-zinc-500">{d.licenseCategory}</div>
                    </Td>
                    <Td className={expired ? "font-semibold text-red-600" : ""}>
                      {fmtDate(d.licenseExpiry)}
                      {expired && <div className="text-xs">EXPIRED</div>}
                    </Td>
                    <Td className="text-xs">{d.phone}</Td>
                    <Td>
                      <span className={`font-semibold ${d.safetyScore >= 80 ? "text-emerald-600" : d.safetyScore >= 60 ? "text-amber-600" : "text-red-600"}`}>
                        {d.safetyScore}
                      </span>
                    </Td>
                    <Td><StatusBadge status={d.status} /></Td>
                    {writable && (
                      <Td>
                        <div className="flex flex-wrap gap-1.5">
                          {d.status !== "ON_TRIP" && (
                            <>
                              {d.status !== "AVAILABLE" && (
                                <ActionForm action={setDriverStatus}>
                                  <input type="hidden" name="id" value={d.id} />
                                  <input type="hidden" name="status" value="AVAILABLE" />
                                  <button className={btnGhost}>Activate</button>
                                </ActionForm>
                              )}
                              {d.status !== "OFF_DUTY" && (
                                <ActionForm action={setDriverStatus}>
                                  <input type="hidden" name="id" value={d.id} />
                                  <input type="hidden" name="status" value="OFF_DUTY" />
                                  <button className={btnGhost}>Off Duty</button>
                                </ActionForm>
                              )}
                              {d.status !== "SUSPENDED" && (
                                <ActionForm action={setDriverStatus} confirmMessage={`Suspend ${d.name}?`}>
                                  <input type="hidden" name="id" value={d.id} />
                                  <input type="hidden" name="status" value="SUSPENDED" />
                                  <button className={btnDanger}>Suspend</button>
                                </ActionForm>
                              )}
                            </>
                          )}
                        </div>
                      </Td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>

        {writable && (
          <Card className="h-fit">
            <h2 className="mb-4 text-lg font-semibold">Register Driver</h2>
            <ActionForm action={createDriver} resetOnSuccess>
              <div className="space-y-3">
                <input name="name" required placeholder="Full name" className={inputCls} />
                <input name="licenseNo" required placeholder="License number (unique)" className={inputCls} />
                <div className="grid grid-cols-2 gap-3">
                  <select name="licenseCategory" required className={inputCls} defaultValue="">
                    <option value="" disabled>Category</option>
                    {["LMV", "HMV", "MCWG", "Trailer"].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <input name="safetyScore" type="number" min="0" max="100" defaultValue={100} className={inputCls} title="Safety score" />
                </div>
                <label className="block text-xs text-zinc-500">License expiry</label>
                <input name="licenseExpiry" type="date" required className={inputCls} />
                <input name="phone" required placeholder="Contact number" className={inputCls} />
                <button className={`${btnPrimary} w-full`}>Add Driver</button>
              </div>
            </ActionForm>
          </Card>
        )}
      </div>
    </>
  );
}
