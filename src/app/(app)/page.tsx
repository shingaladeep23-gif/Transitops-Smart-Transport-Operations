import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { Card, KpiCard, PageHeader, StatusBadge, Table, Th, Td } from "@/components/ui";
import { fmtDate } from "@/lib/format";

export const metadata = { title: "Dashboard — TransitOps" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string; region?: string }>;
}) {
  const session = await requireSession();
  const { type, status, region } = await searchParams;

  const [vehicles, driverCounts, activeTrips, pendingTrips, recentTrips, expiringLicenses] = await Promise.all([
    prisma.vehicle.findMany({
      where: {
        ...(type ? { type } : {}),
        ...(status ? { status: status as never } : {}),
        ...(region ? { region } : {}),
      },
      orderBy: { registrationNo: "asc" },
    }),
    prisma.driver.groupBy({ by: ["status"], _count: true }),
    prisma.trip.count({ where: { status: "DISPATCHED" } }),
    prisma.trip.count({ where: { status: "DRAFT" } }),
    prisma.trip.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { vehicle: true, driver: true },
    }),
    prisma.driver.findMany({
      where: { licenseExpiry: { lte: new Date(Date.now() + 60 * 24 * 3600 * 1000) } },
      orderBy: { licenseExpiry: "asc" },
    }),
  ]);

  const allVehicles = await prisma.vehicle.findMany({ select: { type: true, region: true, status: true } });
  const byStatus = (s: string) => vehicles.filter((v) => v.status === s).length;
  const activeFleet = vehicles.filter((v) => v.status !== "RETIRED").length;
  const utilization = activeFleet > 0 ? Math.round((byStatus("ON_TRIP") / activeFleet) * 100) : 0;
  const driversOnDuty = driverCounts
    .filter((d) => d.status === "AVAILABLE" || d.status === "ON_TRIP")
    .reduce((s, d) => s + d._count, 0);

  const types = [...new Set(allVehicles.map((v) => v.type))];
  const regions = [...new Set(allVehicles.map((v) => v.region))];

  return (
    <>
      <PageHeader title={`Welcome back, ${session.name.split(" ")[0]}`} subtitle="Fleet operations at a glance" />

      <form className="mb-6 flex flex-wrap gap-2" method="get">
        <select name="type" defaultValue={type ?? ""} className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800">
          <option value="">All types</option>
          {types.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select name="status" defaultValue={status ?? ""} className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800">
          <option value="">All statuses</option>
          {["AVAILABLE", "ON_TRIP", "IN_SHOP", "RETIRED"].map((s) => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </select>
        <select name="region" defaultValue={region ?? ""} className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800">
          <option value="">All regions</option>
          {regions.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <button className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
          Apply
        </button>
        {(type || status || region) && (
          <Link href="/" className="rounded-lg px-3 py-1.5 text-sm text-zinc-500 underline">
            Clear
          </Link>
        )}
      </form>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Active Vehicles" value={activeFleet} sub="excluding retired" />
        <KpiCard label="Fleet Utilization" value={`${utilization}%`} accent={utilization >= 50 ? "text-emerald-600" : "text-amber-600"} sub="vehicles on trip / active fleet" />
        <KpiCard label="Active Trips" value={activeTrips} accent="text-blue-600" />
        <KpiCard label="Drivers On Duty" value={driversOnDuty} />
        <KpiCard label="Available Vehicles" value={byStatus("AVAILABLE")} accent="text-emerald-600" />
        <KpiCard label="In Maintenance" value={byStatus("IN_SHOP")} accent="text-amber-600" />
        <KpiCard label="Pending Trips" value={pendingTrips} sub="drafts awaiting dispatch" />
        <KpiCard label="Retired" value={byStatus("RETIRED")} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-lg font-semibold">Recent Trips</h2>
          <Table>
            <thead>
              <tr>
                <Th>Ref</Th>
                <Th>Route</Th>
                <Th>Vehicle</Th>
                <Th>Driver</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {recentTrips.map((t) => (
                <tr key={t.id}>
                  <Td className="font-mono text-xs">{t.refNo}</Td>
                  <Td>{t.source} → {t.destination}</Td>
                  <Td>{t.vehicle.registrationNo}</Td>
                  <Td>{t.driver.name}</Td>
                  <Td><StatusBadge status={t.status} /></Td>
                </tr>
              ))}
              {recentTrips.length === 0 && (
                <tr><Td className="text-zinc-400">No trips yet — create one from the Trips page.</Td></tr>
              )}
            </tbody>
          </Table>
        </div>
        <div>
          <h2 className="mb-3 text-lg font-semibold">License Watch</h2>
          <Card>
            {expiringLicenses.length === 0 ? (
              <p className="text-sm text-zinc-500">No licenses expiring in the next 60 days. ✅</p>
            ) : (
              <ul className="space-y-3">
                {expiringLicenses.map((d) => {
                  const expired = d.licenseExpiry < new Date();
                  return (
                    <li key={d.id} className="flex items-center justify-between text-sm">
                      <div>
                        <div className="font-medium">{d.name}</div>
                        <div className="text-xs text-zinc-500">{d.licenseNo}</div>
                      </div>
                      <span className={`text-xs font-semibold ${expired ? "text-red-600" : "text-amber-600"}`}>
                        {expired ? "Expired" : "Expires"} {fmtDate(d.licenseExpiry)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
