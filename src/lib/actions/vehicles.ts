"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireWrite } from "@/lib/auth";
import type { ActionState } from "./auth";
import { Prisma, VehicleStatus } from "@prisma/client";

function parseVehicle(formData: FormData) {
  const registrationNo = String(formData.get("registrationNo") ?? "").trim().toUpperCase();
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim();
  const region = String(formData.get("region") ?? "Central").trim();
  const maxLoadKg = Number(formData.get("maxLoadKg"));
  const odometerKm = Number(formData.get("odometerKm") ?? 0);
  const acquisitionCost = Number(formData.get("acquisitionCost") ?? 0);

  if (!registrationNo || !name || !type) return { error: "Registration number, name and type are required." };
  if (!Number.isFinite(maxLoadKg) || maxLoadKg <= 0) return { error: "Max load capacity must be a positive number." };
  if (!Number.isFinite(odometerKm) || odometerKm < 0) return { error: "Odometer must be zero or more." };
  if (!Number.isFinite(acquisitionCost) || acquisitionCost < 0) return { error: "Acquisition cost must be zero or more." };

  return { data: { registrationNo, name, type, region, maxLoadKg, odometerKm, acquisitionCost } };
}

export async function createVehicle(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireWrite("vehicles");
  const parsed = parseVehicle(formData);
  if ("error" in parsed) return parsed;
  try {
    await prisma.vehicle.create({ data: parsed.data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: `Registration number ${parsed.data.registrationNo} already exists.` };
    }
    throw e;
  }
  revalidatePath("/vehicles");
  revalidatePath("/");
}

export async function updateVehicle(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireWrite("vehicles");
  const id = String(formData.get("id"));
  const parsed = parseVehicle(formData);
  if ("error" in parsed) return parsed;
  try {
    await prisma.vehicle.update({ where: { id }, data: parsed.data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: `Registration number ${parsed.data.registrationNo} already exists.` };
    }
    throw e;
  }
  revalidatePath("/vehicles");
  revalidatePath("/");
}

export async function setVehicleStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireWrite("vehicles");
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as VehicleStatus;

  const vehicle = await prisma.vehicle.findUnique({ where: { id } });
  if (!vehicle) return { error: "Vehicle not found." };
  if (vehicle.status === "ON_TRIP") {
    return { error: "Vehicle is on an active trip; complete or cancel the trip first." };
  }
  if (!["AVAILABLE", "RETIRED"].includes(status)) {
    return { error: "Status can only be changed to Available or Retired here. Use Maintenance for In Shop." };
  }
  if (status === "AVAILABLE") {
    const openMaintenance = await prisma.maintenanceLog.count({ where: { vehicleId: id, status: "OPEN" } });
    if (openMaintenance > 0) return { error: "Vehicle has open maintenance. Close it to make the vehicle available." };
  }
  await prisma.vehicle.update({ where: { id }, data: { status } });
  revalidatePath("/vehicles");
  revalidatePath("/");
}

export async function deleteVehicle(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireWrite("vehicles");
  const id = String(formData.get("id"));
  const tripCount = await prisma.trip.count({ where: { vehicleId: id } });
  if (tripCount > 0) return { error: "Vehicle has trip history; retire it instead of deleting." };
  await prisma.$transaction([
    prisma.maintenanceLog.deleteMany({ where: { vehicleId: id } }),
    prisma.fuelLog.deleteMany({ where: { vehicleId: id } }),
    prisma.expense.deleteMany({ where: { vehicleId: id } }),
    prisma.vehicle.delete({ where: { id } }),
  ]);
  revalidatePath("/vehicles");
  revalidatePath("/");
}
