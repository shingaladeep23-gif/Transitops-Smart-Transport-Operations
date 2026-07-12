import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { apiError, requireApiSession, requireApiWrite, parsePagination, isEnum, num, str } from "@/lib/api";

const DRIVER_STATUSES = ["AVAILABLE", "ON_TRIP", "OFF_DUTY", "SUSPENDED"] as const;

// GET /api/v1/drivers?status=AVAILABLE&q=alex&page=1&limit=20
export async function GET(req: NextRequest) {
  const session = await requireApiSession();
  if (session instanceof NextResponse) return session;

  const url = new URL(req.url);
  const { skip, take, page, limit } = parsePagination(url);
  const status = url.searchParams.get("status");
  const q = url.searchParams.get("q");

  if (status && !isEnum(status, DRIVER_STATUSES)) {
    return apiError(400, `Invalid status. Allowed: ${DRIVER_STATUSES.join(", ")}`);
  }

  const where = {
    ...(status ? { status: status as (typeof DRIVER_STATUSES)[number] } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { licenseNo: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, data] = await Promise.all([
    prisma.driver.count({ where }),
    prisma.driver.findMany({ where, orderBy: { name: "asc" }, skip, take }),
  ]);

  return NextResponse.json({ data, meta: { total, page, limit, pages: Math.ceil(total / limit) } });
}

// POST /api/v1/drivers  { name, licenseNo, licenseCategory, licenseExpiry, phone, safetyScore? }
export async function POST(req: NextRequest) {
  const session = await requireApiWrite("drivers");
  if (session instanceof NextResponse) return session;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return apiError(400, "Request body must be valid JSON.");
  }

  const name = str(body.name);
  const licenseNo = str(body.licenseNo).toUpperCase();
  const licenseCategory = str(body.licenseCategory);
  const phone = str(body.phone);
  const licenseExpiry = new Date(str(body.licenseExpiry));
  const safetyScore = body.safetyScore === undefined ? 100 : num(body.safetyScore);

  if (!name || !licenseNo || !licenseCategory || !phone) {
    return apiError(400, "name, licenseNo, licenseCategory and phone are required.");
  }
  if (Number.isNaN(licenseExpiry.getTime())) return apiError(400, "licenseExpiry must be a valid date (YYYY-MM-DD).");
  if (safetyScore === null || !Number.isInteger(safetyScore) || safetyScore < 0 || safetyScore > 100) {
    return apiError(400, "safetyScore must be an integer between 0 and 100.");
  }

  try {
    const driver = await prisma.driver.create({
      data: { name, licenseNo, licenseCategory, licenseExpiry, phone, safetyScore },
    });
    return NextResponse.json({ data: driver }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return apiError(409, `License number ${licenseNo} already exists.`);
    }
    throw e;
  }
}
