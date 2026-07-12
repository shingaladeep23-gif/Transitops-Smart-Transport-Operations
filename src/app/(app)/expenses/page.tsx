import { prisma } from "@/lib/db";
import { requireSession, canWrite } from "@/lib/auth";
import { createFuelLog, createExpense } from "@/lib/actions/finance";
import ActionForm from "@/components/ActionForm";
import { PageHeader, Table, Th, Td, Card, inputCls, btnPrimary } from "@/components/ui";
import { fmtDate, inr } from "@/lib/format";

export const metadata = { title: "Fuel & Expenses — TransitOps" };

export default async function ExpensesPage() {
  const session = await requireSession();
  const writable = canWrite(session.role, "finance");

  const [fuelLogs, expenses, vehicles] = await Promise.all([
    prisma.fuelLog.findMany({ orderBy: { date: "desc" }, include: { vehicle: true }, take: 50 }),
    prisma.expense.findMany({ orderBy: { date: "desc" }, include: { vehicle: true }, take: 50 }),
    prisma.vehicle.findMany({ where: { status: { not: "RETIRED" } }, orderBy: { registrationNo: "asc" } }),
  ]);

  return (
    <>
      <PageHeader title="Fuel & Expense Management" subtitle="Fuel logs, tolls and other operational costs" />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section>
            <h2 className="mb-3 text-lg font-semibold">Fuel Logs</h2>
            <Table>
              <thead>
                <tr>
                  <Th>Date</Th><Th>Vehicle</Th><Th>Liters</Th><Th>Cost</Th><Th>Note</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {fuelLogs.map((f) => (
                  <tr key={f.id}>
                    <Td className="text-xs">{fmtDate(f.date)}</Td>
                    <Td className="font-mono text-xs font-semibold">{f.vehicle.registrationNo}</Td>
                    <Td>{f.liters} L</Td>
                    <Td>{inr.format(f.cost)}</Td>
                    <Td className="text-xs text-zinc-500">{f.note || "—"}</Td>
                  </tr>
                ))}
                {fuelLogs.length === 0 && <tr><Td className="text-zinc-400">No fuel logs yet.</Td></tr>}
              </tbody>
            </Table>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">Other Expenses</h2>
            <Table>
              <thead>
                <tr>
                  <Th>Date</Th><Th>Vehicle</Th><Th>Category</Th><Th>Amount</Th><Th>Note</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <Td className="text-xs">{fmtDate(e.date)}</Td>
                    <Td className="font-mono text-xs font-semibold">{e.vehicle.registrationNo}</Td>
                    <Td>{e.category}</Td>
                    <Td>{inr.format(e.amount)}</Td>
                    <Td className="text-xs text-zinc-500">{e.note || "—"}</Td>
                  </tr>
                ))}
                {expenses.length === 0 && <tr><Td className="text-zinc-400">No expenses yet.</Td></tr>}
              </tbody>
            </Table>
          </section>
        </div>

        {writable && (
          <div className="space-y-6">
            <Card>
              <h2 className="mb-4 text-lg font-semibold">Log Fuel</h2>
              <ActionForm action={createFuelLog} resetOnSuccess>
                <div className="space-y-3">
                  <select name="vehicleId" required className={inputCls} defaultValue="">
                    <option value="" disabled>Select vehicle</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>{v.registrationNo} — {v.name}</option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-3">
                    <input name="liters" type="number" step="any" min="0.1" required placeholder="Liters" className={inputCls} />
                    <input name="cost" type="number" step="any" min="0" required placeholder="Cost (₹)" className={inputCls} />
                  </div>
                  <input name="date" type="date" className={inputCls} />
                  <input name="note" placeholder="Note (optional)" className={inputCls} />
                  <button className={`${btnPrimary} w-full`}>Add Fuel Log</button>
                </div>
              </ActionForm>
            </Card>

            <Card>
              <h2 className="mb-4 text-lg font-semibold">Log Expense</h2>
              <ActionForm action={createExpense} resetOnSuccess>
                <div className="space-y-3">
                  <select name="vehicleId" required className={inputCls} defaultValue="">
                    <option value="" disabled>Select vehicle</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>{v.registrationNo} — {v.name}</option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-3">
                    <select name="category" required className={inputCls} defaultValue="">
                      <option value="" disabled>Category</option>
                      {["Toll", "Parking", "Repair", "Insurance", "Permit", "Other"].map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                    <input name="amount" type="number" step="any" min="1" required placeholder="Amount (₹)" className={inputCls} />
                  </div>
                  <input name="date" type="date" className={inputCls} />
                  <input name="note" placeholder="Note (optional)" className={inputCls} />
                  <button className={`${btnPrimary} w-full`}>Add Expense</button>
                </div>
              </ActionForm>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
