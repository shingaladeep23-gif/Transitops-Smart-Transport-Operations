import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiSession } from "@/lib/api";

// GET /api/v1/kpis — live dashboard metrics computed from the database
export async function GET() {
  const session = await requireApiSession();
  if (session instanceof NextResponse) return session;

  const [vehicleCounts, driverCounts, activeTrips, pendingTrips] = await Promise.all([
    prisma.vehicle.groupBy({ by: ["status"], _count: true }),
    prisma.driver.groupBy({ by: ["status"], _count: true }),
    prisma.trip.count({ where: { status: "DISPATCHED" } }),
    prisma.trip.count({ where: { status: "DRAFT" } }),
  ]);

  const v = Object.fromEntries(vehicleCounts.map((c) => [c.status, c._count]));
  const d = Object.fromEntries(driverCounts.map((c) => [c.status, c._count]));
  const activeFleet = (v.AVAILABLE ?? 0) + (v.ON_TRIP ?? 0) + (v.IN_SHOP ?? 0);

  return NextResponse.json({
    data: {
      vehicles: {
        available: v.AVAILABLE ?? 0,
        onTrip: v.ON_TRIP ?? 0,
        inShop: v.IN_SHOP ?? 0,
        retired: v.RETIRED ?? 0,
        activeFleet,
      },
      drivers: {
        available: d.AVAILABLE ?? 0,
        onTrip: d.ON_TRIP ?? 0,
        offDuty: d.OFF_DUTY ?? 0,
        suspended: d.SUSPENDED ?? 0,
        onDuty: (d.AVAILABLE ?? 0) + (d.ON_TRIP ?? 0),
      },
      trips: { active: activeTrips, pending: pendingTrips },
      fleetUtilizationPct: activeFleet > 0 ? Math.round(((v.ON_TRIP ?? 0) / activeFleet) * 100) : 0,
      generatedAt: new Date().toISOString(),
    },
  });
}
