import { requireSession } from "@/lib/auth";
import { getFleetSummary } from "@/lib/reports";
import { PageHeader, KpiCard, Table, Th, Td, StatusBadge } from "@/components/ui";
import { inr } from "@/lib/format";
import BarChart from "@/components/BarChart";
import PrintButton from "@/components/PrintButton";

export const metadata = { title: "Reports — TransitOps" };

export default async function ReportsPage() {
  await requireSession();
  const { rows, utilizationPct, totalOperationalCost, totalRevenue, totalDistance, totalFuel } =
    await getFleetSummary();

  const fleetEfficiency = totalFuel > 0 ? (totalDistance / totalFuel).toFixed(1) : "—";

  return (
    <>
      <PageHeader title="Reports & Analytics" subtitle="Per-vehicle efficiency, cost and return on investment">
        <div className="no-print flex gap-2">
          <PrintButton />
          <a
            href="/api/reports/csv"
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Export CSV
          </a>
        </div>
      </PageHeader>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Fleet Utilization" value={`${utilizationPct}%`} />
        <KpiCard label="Fleet Fuel Efficiency" value={`${fleetEfficiency} km/L`} sub="completed-trip distance / fuel" />
        <KpiCard label="Total Operational Cost" value={inr.format(totalOperationalCost)} sub="fuel + maintenance" />
        <KpiCard label="Total Revenue" value={inr.format(totalRevenue)} accent="text-emerald-600" />
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <BarChart
          title="Operational Cost per Vehicle (Fuel + Maintenance)"
          color="bg-amber-500"
          bars={rows
            .filter((r) => r.operationalCost > 0)
            .map((r) => ({ label: r.registrationNo, value: r.operationalCost, display: inr.format(r.operationalCost) }))}
        />
        <BarChart
          title="Fuel Efficiency per Vehicle (km/L)"
          color="bg-emerald-500"
          bars={rows
            .filter((r) => r.fuelEfficiencyKmPerL != null)
            .map((r) => ({
              label: r.registrationNo,
              value: r.fuelEfficiencyKmPerL as number,
              display: `${(r.fuelEfficiencyKmPerL as number).toFixed(1)} km/L`,
            }))}
        />
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Vehicle</Th>
            <Th>Status</Th>
            <Th>Trips</Th>
            <Th>Distance</Th>
            <Th>Fuel</Th>
            <Th>Efficiency</Th>
            <Th>Op. Cost</Th>
            <Th>Revenue</Th>
            <Th>ROI</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {rows.map((r) => (
            <tr key={r.id}>
              <Td>
                <div className="font-mono text-xs font-semibold">{r.registrationNo}</div>
                <div className="text-xs text-zinc-500">{r.name}</div>
              </Td>
              <Td><StatusBadge status={r.status} /></Td>
              <Td>{r.tripsCompleted}</Td>
              <Td>{r.distanceKm.toLocaleString()} km</Td>
              <Td>{r.fuelLiters.toLocaleString()} L</Td>
              <Td>{r.fuelEfficiencyKmPerL != null ? `${r.fuelEfficiencyKmPerL.toFixed(1)} km/L` : "—"}</Td>
              <Td>{inr.format(r.operationalCost)}</Td>
              <Td>{inr.format(r.revenue)}</Td>
              <Td>
                {r.roi != null ? (
                  <span className={`font-semibold ${r.roi >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {(r.roi * 100).toFixed(1)}%
                  </span>
                ) : (
                  "—"
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <p className="mt-3 text-xs text-zinc-500">
        ROI = (Revenue − (Maintenance + Fuel)) ÷ Acquisition Cost · Fuel efficiency = completed-trip distance ÷ fuel logged
      </p>
    </>
  );
}
