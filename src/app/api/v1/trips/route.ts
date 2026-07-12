import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, requireApiSession, requireApiWrite, parsePagination, isEnum, num, str } from "@/lib/api";
import { assertDispatchable } from "@/lib/tripRules";

const TRIP_STATUSES = ["DRAFT", "DISPATCHED", "COMPLETED", "CANCELLED"] as const;

// GET /api/v1/trips?status=DISPATCHED&page=1&limit=20
export async function GET(req: NextRequest) {
  const session = await requireApiSession();
  if (session instanceof NextResponse) return session;

  const url = new URL(req.url);
  const { skip, take, page, limit } = parsePagination(url);
  const status = url.searchParams.get("status");

  if (status && !isEnum(status, TRIP_STATUSES)) {
    return apiError(400, `Invalid status. Allowed: ${TRIP_STATUSES.join(", ")}`);
  }

  const where = status ? { status: status as (typeof TRIP_STATUSES)[number] } : {};
  const [total, data] = await Promise.all([
    prisma.trip.count({ where }),
    prisma.trip.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        vehicle: { select: { registrationNo: true, name: true } },
        driver: { select: { name: true } },
      },
    }),
  ]);

  return NextResponse.json({ data, meta: { total, page, limit, pages: Math.ceil(total / limit) } });
}

// POST /api/v1/trips  { source, destination, vehicleId, driverId, cargoWeightKg, plannedKm, revenue? }
// Creates a DRAFT trip. All mandatory business rules are validated server-side.
export async function POST(req: NextRequest) {
  const session = await requireApiWrite("trips");
  if (session instanceof NextResponse) return session;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return apiError(400, "Request body must be valid JSON.");
  }

  const source = str(body.source);
  const destination = str(body.destination);
  const vehicleId = str(body.vehicleId);
  const driverId = str(body.driverId);
  const cargoWeightKg = num(body.cargoWeightKg);
  const plannedKm = num(body.plannedKm);
  const revenue = body.revenue === undefined ? 0 : num(body.revenue);

  if (!source || !destination) return apiError(400, "source and destination are required.");
  if (!vehicleId || !driverId) return apiError(400, "vehicleId and driverId are required.");
  if (cargoWeightKg === null || cargoWeightKg <= 0) return apiError(400, "cargoWeightKg must be a positive number.");
  if (plannedKm === null || plannedKm <= 0) return apiError(400, "plannedKm must be a positive number.");
  if (revenue === null || revenue < 0) return apiError(400, "revenue must be >= 0.");

  const [vehicle, driver] = await Promise.all([
    prisma.vehicle.findUnique({ where: { id: vehicleId } }),
    prisma.driver.findUnique({ where: { id: driverId } }),
  ]);
  if (!vehicle) return apiError(404, "Vehicle not found.");
  if (!driver) return apiError(404, "Driver not found.");

  const violation = assertDispatchable(vehicle, driver, cargoWeightKg);
  if (violation) return apiError(422, violation);

  const count = await prisma.trip.count();
  const trip = await prisma.trip.create({
    data: {
      refNo: `TRP-${String(count + 1).padStart(4, "0")}`,
      source,
      destination,
      vehicleId,
      driverId,
      cargoWeightKg,
      plannedKm,
      revenue,
    },
  });
  return NextResponse.json({ data: trip }, { status: 201 });
}
