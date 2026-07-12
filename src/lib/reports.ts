import { prisma } from "@/lib/db";

export type VehicleReportRow = {
  id: string;
  registrationNo: string;
  name: string;
  type: string;
  status: string;
  distanceKm: number;
  fuelLiters: number;
  fuelCost: number;
  maintenanceCost: number;
  otherExpenses: number;
  revenue: number;
  operationalCost: number;
  fuelEfficiencyKmPerL: number | null;
  roi: number | null;
  tripsCompleted: number;
};

export async function getVehicleReport(): Promise<VehicleReportRow[]> {
  const vehicles = await prisma.vehicle.findMany({
    include: {
      trips: { where: { status: "COMPLETED" } },
      fuelLogs: true,
      maintenance: true,
      expenses: true,
    },
    orderBy: { registrationNo: "asc" },
  });

  return vehicles.map((v) => {
    const distanceKm = v.trips.reduce(
      (s, t) => s + Math.max(0, (t.endOdometerKm ?? 0) - (t.startOdometerKm ?? 0)),
      0
    );
    const fuelLiters = v.fuelLogs.reduce((s, f) => s + f.liters, 0);
    const fuelCost = v.fuelLogs.reduce((s, f) => s + f.cost, 0);
    const maintenanceCost = v.maintenance.reduce((s, m) => s + m.cost, 0);
    const otherExpenses = v.expenses.reduce((s, e) => s + e.amount, 0);
    const revenue = v.trips.reduce((s, t) => s + t.revenue, 0);
    const operationalCost = fuelCost + maintenanceCost;

    return {
      id: v.id,
      registrationNo: v.registrationNo,
      name: v.name,
      type: v.type,
      status: v.status,
      distanceKm,
      fuelLiters,
      fuelCost,
      maintenanceCost,
      otherExpenses,
      revenue,
      operationalCost,
      fuelEfficiencyKmPerL: fuelLiters > 0 ? distanceKm / fuelLiters : null,
      roi: v.acquisitionCost > 0 ? (revenue - operationalCost) / v.acquisitionCost : null,
      tripsCompleted: v.trips.length,
    };
  });
}

export async function getFleetSummary() {
  const [rows, vehicles] = await Promise.all([
    getVehicleReport(),
    prisma.vehicle.findMany({ select: { status: true } }),
  ]);
  const active = vehicles.filter((v) => v.status !== "RETIRED").length;
  const onTrip = vehicles.filter((v) => v.status === "ON_TRIP").length;
  return {
    rows,
    utilizationPct: active > 0 ? Math.round((onTrip / active) * 100) : 0,
    totalOperationalCost: rows.reduce((s, r) => s + r.operationalCost, 0),
    totalRevenue: rows.reduce((s, r) => s + r.revenue, 0),
    totalDistance: rows.reduce((s, r) => s + r.distanceKm, 0),
    totalFuel: rows.reduce((s, r) => s + r.fuelLiters, 0),
  };
}
