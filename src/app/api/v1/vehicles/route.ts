import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { apiError, requireApiSession, requireApiWrite, parsePagination, isEnum, num, str } from "@/lib/api";

const VEHICLE_STATUSES = ["AVAILABLE", "ON_TRIP", "IN_SHOP", "RETIRED"] as const;

// GET /api/v1/vehicles?status=AVAILABLE&type=Truck&region=West&q=tata&page=1&limit=20
export async function GET(req: NextRequest) {
  const session = await requireApiSession();
  if (session instanceof NextResponse) return session;

  const url = new URL(req.url);
  const { skip, take, page, limit } = parsePagination(url);
  const status = url.searchParams.get("status");
  const type = url.searchParams.get("type");
  const region = url.searchParams.get("region");
  const q = url.searchParams.get("q");

  if (status && !isEnum(status, VEHICLE_STATUSES)) {
    return apiError(400, `Invalid status. Allowed: ${VEHICLE_STATUSES.join(", ")}`);
  }

  const where = {
    ...(status ? { status: status as (typeof VEHICLE_STATUSES)[number] } : {}),
    ...(type ? { type } : {}),
    ...(region ? { region } : {}),
    ...(q
      ? {
          OR: [
            { registrationNo: { contains: q, mode: "insensitive" as const } },
            { name: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, data] = await Promise.all([
    prisma.vehicle.count({ where }),
    prisma.vehicle.findMany({ where, orderBy: { registrationNo: "asc" }, skip, take }),
  ]);

  return NextResponse.json({ data, meta: { total, page, limit, pages: Math.ceil(total / limit) } });
}

// POST /api/v1/vehicles  { registrationNo, name, type, region?, maxLoadKg, odometerKm?, acquisitionCost? }
export async function POST(req: NextRequest) {
  const session = await requireApiWrite("vehicles");
  if (session instanceof NextResponse) return session;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return apiError(400, "Request body must be valid JSON.");
  }

  const registrationNo = str(body.registrationNo).toUpperCase();
  const name = str(body.name);
  const type = str(body.type);
  const region = str(body.region) || "Central";
  const maxLoadKg = num(body.maxLoadKg);
  const odometerKm = body.odometerKm === undefined ? 0 : num(body.odometerKm);
  const acquisitionCost = body.acquisitionCost === undefined ? 0 : num(body.acquisitionCost);

  if (!registrationNo || !name || !type) return apiError(400, "registrationNo, name and type are required.");
  if (maxLoadKg === null || maxLoadKg <= 0) return apiError(400, "maxLoadKg must be a positive number.");
  if (odometerKm === null || odometerKm < 0) return apiError(400, "odometerKm must be >= 0.");
  if (acquisitionCost === null || acquisitionCost < 0) return apiError(400, "acquisitionCost must be >= 0.");

  try {
    const vehicle = await prisma.vehicle.create({
      data: { registrationNo, name, type, region, maxLoadKg, odometerKm, acquisitionCost },
    });
    return NextResponse.json({ data: vehicle }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return apiError(409, `Registration number ${registrationNo} already exists.`);
    }
    throw e;
  }
}
