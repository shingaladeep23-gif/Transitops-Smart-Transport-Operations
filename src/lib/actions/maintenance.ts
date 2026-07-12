"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireWrite } from "@/lib/auth";
import type { ActionState } from "./auth";

function revalidateAll() {
  revalidatePath("/maintenance");
  revalidatePath("/vehicles");
  revalidatePath("/");
  revalidatePath("/reports");
}

export async function createMaintenance(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireWrite("maintenance");
  const vehicleId = String(formData.get("vehicleId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const cost = Number(formData.get("cost") ?? 0);

  if (!vehicleId || !title) return { error: "Vehicle and title are required." };
  if (!Number.isFinite(cost) || cost < 0) return { error: "Cost must be zero or more." };

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) return { error: "Vehicle not found." };
  if (vehicle.status === "ON_TRIP") return { error: "Vehicle is on a trip; complete the trip before opening maintenance." };
  if (vehicle.status === "RETIRED") return { error: "Retired vehicles cannot be sent for maintenance." };

  // Opening maintenance automatically moves the vehicle to In Shop,
  // which removes it from the dispatch selection pool.
  await prisma.$transaction([
    prisma.maintenanceLog.create({ data: { vehicleId, title, description, cost } }),
    prisma.vehicle.update({ where: { id: vehicleId }, data: { status: "IN_SHOP" } }),
  ]);
  revalidateAll();
}

export async function closeMaintenance(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireWrite("maintenance");
  const id = String(formData.get("id"));
  const finalCost = formData.get("cost") !== null ? Number(formData.get("cost")) : null;

  const log = await prisma.maintenanceLog.findUnique({ where: { id }, include: { vehicle: true } });
  if (!log) return { error: "Maintenance record not found." };
  if (log.status === "CLOSED") return { error: "This maintenance record is already closed." };
  if (finalCost !== null && (!Number.isFinite(finalCost) || finalCost < 0)) {
    return { error: "Cost must be zero or more." };
  }

  const otherOpen = await prisma.maintenanceLog.count({
    where: { vehicleId: log.vehicleId, status: "OPEN", id: { not: id } },
  });

  // Closing maintenance restores the vehicle to Available — unless it is
  // retired or still has other open maintenance records.
  const restoreVehicle =
    log.vehicle.status === "IN_SHOP" && otherOpen === 0
      ? [prisma.vehicle.update({ where: { id: log.vehicleId }, data: { status: "AVAILABLE" } })]
      : [];

  await prisma.$transaction([
    prisma.maintenanceLog.update({
      where: { id },
      data: { status: "CLOSED", closedAt: new Date(), ...(finalCost !== null ? { cost: finalCost } : {}) },
    }),
    ...restoreVehicle,
  ]);
  revalidateAll();
}
