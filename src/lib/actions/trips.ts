"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireWrite } from "@/lib/auth";
import type { ActionState } from "./auth";
import { CHECKLIST_ITEMS } from "@/lib/checklist";
import { assertDispatchable } from "@/lib/tripRules";

function revalidateAll() {
  revalidatePath("/trips");
  revalidatePath("/vehicles");
  revalidatePath("/drivers");
  revalidatePath("/");
}

function parseChecklist(formData: FormData): { checklist: string } | { error: string } {
  const checked = formData.getAll("checklist").map(String);
  const missing = CHECKLIST_ITEMS.filter((i) => !checked.includes(i));
  if (missing.length > 0) {
    return { error: `Pre-dispatch vehicle check incomplete: ${missing.join(", ")}.` };
  }
  return { checklist: CHECKLIST_ITEMS.join(", ") };
}

async function nextRefNo(): Promise<string> {
  const count = await prisma.trip.count();
  return `TRP-${String(count + 1).padStart(4, "0")}`;
}

export async function createTrip(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireWrite("trips");
  const source = String(formData.get("source") ?? "").trim();
  const destination = String(formData.get("destination") ?? "").trim();
  const vehicleId = String(formData.get("vehicleId") ?? "");
  const driverId = String(formData.get("driverId") ?? "");
  const cargoWeightKg = Number(formData.get("cargoWeightKg"));
  const plannedKm = Number(formData.get("plannedKm"));
  const revenue = Number(formData.get("revenue") ?? 0);
  const dispatchNow = formData.get("dispatchNow") === "on";

  if (!source || !destination) return { error: "Source and destination are required." };
  if (!vehicleId || !driverId) return { error: "Select a vehicle and a driver." };
  if (!Number.isFinite(cargoWeightKg) || cargoWeightKg <= 0) return { error: "Cargo weight must be a positive number." };
  if (!Number.isFinite(plannedKm) || plannedKm <= 0) return { error: "Planned distance must be a positive number." };
  if (!Number.isFinite(revenue) || revenue < 0) return { error: "Revenue must be zero or more." };

  const [vehicle, driver] = await Promise.all([
    prisma.vehicle.findUnique({ where: { id: vehicleId } }),
    prisma.driver.findUnique({ where: { id: driverId } }),
  ]);
  if (!vehicle || !driver) return { error: "Vehicle or driver not found." };

  const violation = assertDispatchable(vehicle, driver, cargoWeightKg);
  if (violation) return { error: violation };

  const refNo = await nextRefNo();
  const data = { refNo, source, destination, cargoWeightKg, plannedKm, revenue, vehicleId, driverId };

  if (dispatchNow) {
    const check = parseChecklist(formData);
    if ("error" in check) return check;
    await prisma.$transaction([
      prisma.trip.create({
        data: {
          ...data,
          status: "DISPATCHED",
          dispatchedAt: new Date(),
          startOdometerKm: vehicle.odometerKm,
          checklist: check.checklist,
        },
      }),
      prisma.vehicle.update({ where: { id: vehicleId }, data: { status: "ON_TRIP" } }),
      prisma.driver.update({ where: { id: driverId }, data: { status: "ON_TRIP" } }),
    ]);
  } else {
    await prisma.trip.create({ data });
  }
  revalidateAll();
}

export async function dispatchTrip(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireWrite("trips");
  const id = String(formData.get("id"));
  const trip = await prisma.trip.findUnique({ where: { id }, include: { vehicle: true, driver: true } });
  if (!trip) return { error: "Trip not found." };
  if (trip.status !== "DRAFT") return { error: "Only draft trips can be dispatched." };

  const violation = assertDispatchable(trip.vehicle, trip.driver, trip.cargoWeightKg);
  if (violation) return { error: violation };

  const check = parseChecklist(formData);
  if ("error" in check) return check;

  await prisma.$transaction([
    prisma.trip.update({
      where: { id },
      data: {
        status: "DISPATCHED",
        dispatchedAt: new Date(),
        startOdometerKm: trip.vehicle.odometerKm,
        checklist: check.checklist,
      },
    }),
    prisma.vehicle.update({ where: { id: trip.vehicleId }, data: { status: "ON_TRIP" } }),
    prisma.driver.update({ where: { id: trip.driverId }, data: { status: "ON_TRIP" } }),
  ]);
  revalidateAll();
}

export async function completeTrip(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireWrite("trips");
  const id = String(formData.get("id"));
  const endOdometerKm = Number(formData.get("endOdometerKm"));
  const fuelUsedL = Number(formData.get("fuelUsedL"));
  const fuelCost = Number(formData.get("fuelCost") ?? 0);
  const podReceiver = String(formData.get("podReceiver") ?? "").trim();
  const podNote = String(formData.get("podNote") ?? "").trim();

  const trip = await prisma.trip.findUnique({ where: { id }, include: { vehicle: true } });
  if (!trip) return { error: "Trip not found." };
  if (trip.status !== "DISPATCHED") return { error: "Only dispatched trips can be completed." };
  if (!Number.isFinite(endOdometerKm) || endOdometerKm <= (trip.startOdometerKm ?? 0)) {
    return { error: `Final odometer must be greater than the start reading (${trip.startOdometerKm ?? 0} km).` };
  }
  if (!Number.isFinite(fuelUsedL) || fuelUsedL <= 0) return { error: "Fuel consumed must be a positive number." };
  if (!Number.isFinite(fuelCost) || fuelCost < 0) return { error: "Fuel cost must be zero or more." };

  await prisma.$transaction([
    prisma.trip.update({
      where: { id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        endOdometerKm,
        fuelUsedL,
        podReceiver: podReceiver || null,
        podNote: podNote || null,
      },
    }),
    prisma.vehicle.update({
      where: { id: trip.vehicleId },
      data: { status: "AVAILABLE", odometerKm: endOdometerKm },
    }),
    prisma.driver.update({ where: { id: trip.driverId }, data: { status: "AVAILABLE" } }),
    prisma.fuelLog.create({
      data: {
        liters: fuelUsedL,
        cost: fuelCost,
        note: `Trip ${trip.refNo} (${trip.source} → ${trip.destination})`,
        vehicleId: trip.vehicleId,
      },
    }),
  ]);
  revalidateAll();
  revalidatePath("/expenses");
  revalidatePath("/reports");
}

export async function cancelTrip(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireWrite("trips");
  const id = String(formData.get("id"));
  const trip = await prisma.trip.findUnique({ where: { id } });
  if (!trip) return { error: "Trip not found." };
  if (trip.status === "COMPLETED" || trip.status === "CANCELLED") {
    return { error: "This trip is already finished." };
  }

  const ops = [prisma.trip.update({ where: { id }, data: { status: "CANCELLED" } })];
  if (trip.status === "DISPATCHED") {
    ops.push(
      prisma.vehicle.update({ where: { id: trip.vehicleId }, data: { status: "AVAILABLE" } }) as never,
      prisma.driver.update({ where: { id: trip.driverId }, data: { status: "AVAILABLE" } }) as never
    );
  }
  await prisma.$transaction(ops);
  revalidateAll();
}
