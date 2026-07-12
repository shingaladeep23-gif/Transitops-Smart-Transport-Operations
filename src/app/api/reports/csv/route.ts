import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getVehicleReport } from "@/lib/reports";

export async function GET() {
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const rows = await getVehicleReport();
  const header = [
    "Registration No",
    "Name",
    "Type",
    "Status",
    "Trips Completed",
    "Distance (km)",
    "Fuel (L)",
    "Fuel Cost",
    "Maintenance Cost",
    "Other Expenses",
    "Operational Cost",
    "Revenue",
    "Fuel Efficiency (km/L)",
    "ROI (%)",
  ];
  const escape = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = rows.map((r) =>
    [
      r.registrationNo,
      r.name,
      r.type,
      r.status,
      r.tripsCompleted,
      r.distanceKm,
      r.fuelLiters,
      r.fuelCost,
      r.maintenanceCost,
      r.otherExpenses,
      r.operationalCost,
      r.revenue,
      r.fuelEfficiencyKmPerL != null ? r.fuelEfficiencyKmPerL.toFixed(2) : "",
      r.roi != null ? (r.roi * 100).toFixed(2) : "",
    ]
      .map(escape)
      .join(",")
  );
  const csv = [header.join(","), ...lines].join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="transitops-vehicle-report.csv"`,
    },
  });
}
