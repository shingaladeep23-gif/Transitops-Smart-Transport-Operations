"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
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

// Business-rule violations detected inside a transaction; the transaction is
// rolled back and the message is shown to the user as a normal form error.
class RuleViolation extends Error {}

function parseChecklist(formData: FormData): { checklist: string } | { error: string } {
  const checked = formData.getAll("checklist").map(String);
  const missing = CHECKLIST_ITEMS.filter((i) => !checked.includes(i));
  if (missing.length > 0) {
    return { error: `Pre-dispatch vehicle check incomplete: ${missing.join(", ")}.` };
  }
  return { checklist: CHECKLIST_ITEMS.join(", ") };
}

async function nextRefNo(tx: Prisma.TransactionClient): Promise<string> {
  const count = await tx.trip.count();
  return `TRP-${String(count + 1).padStart(4, "0")}`;
}

// Concurrent trip creations can race on the sequential refNo; the unique
// constraint catches the collision (P2002) and we simply retry.
async function withRefNoRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002" && attempt < 4) continue;
      throw e;
    }
  }
}

// Atomically claim the vehicle and driver for a trip. The status guard in the
// WHERE clause makes the transition safe under concurrency: if another request
// dispatched either one first, the update matches zero rows and we roll back —
// double-booking is impossible even across parallel requests.
async function claimVehicleAndDriver(tx: Prisma.TransactionClient, vehicleId: string, driverId: string) {
  const v = await tx.vehicle.updateMany({
    where: { id: vehicleId, status: "AVAILABLE" },
    data: { status: "ON_TRIP" },
  });
  if (v.count === 0) throw new RuleViolation("Vehicle is no longer available — it may have just been dispatched or sent to maintenance.");
  const d = await tx.driver.updateMany({
    where: { id: driverId, status: "AVAILABLE" },
    data: { status: "ON_TRIP" },
  });
  if (d.count === 0) throw new RuleViolation("Driver is no longer available — they may have just been assigned to another trip.");
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

  const data = { source, destination, cargoWeightKg, plannedKm, revenue, vehicleId, driverId };

  try {
    if (dispatchNow) {
      const check = parseChecklist(formData);
      if ("error" in check) return check;
      await withRefNoRetry(() =>
        prisma.$transaction(async (tx) => {
          await claimVehicleAndDriver(tx, vehicleId, driverId);
          await tx.trip.create({
            data: {
              ...data,
              refNo: await nextRefNo(tx),
              status: "DISPATCHED",
              dispatchedAt: new Date(),
              startOdometerKm: vehicle.odometerKm,
              checklist: check.checklist,
            },
          });
        })
      );
    } else {
      await withRefNoRetry(() =>
        prisma.$transaction(async (tx) => {
          await tx.trip.create({ data: { ...data, refNo: await nextRefNo(tx) } });
        })
      );
    }
  } catch (e) {
    if (e instanceof RuleViolation) return { error: e.message };
    throw e;
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

  try {
    await prisma.$transaction(async (tx) => {
      // Status guard: if a parallel request already dispatched this draft,
      // match zero rows and roll back instead of double-claiming assets.
      const t = await tx.trip.updateMany({
        where: { id, status: "DRAFT" },
        data: {
          status: "DISPATCHED",
          dispatchedAt: new Date(),
          startOdometerKm: trip.vehicle.odometerKm,
          checklist: check.checklist,
        },
      });
      if (t.count === 0) throw new RuleViolation("This trip was already dispatched.");
      await claimVehicleAndDriver(tx, trip.vehicleId, trip.driverId);
    });
  } catch (e) {
    if (e instanceof RuleViolation) return { error: e.message };
    throw e;
  }
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

  try {
    await prisma.$transaction(async (tx) => {
      const t = await tx.trip.updateMany({
        where: { id, status: "DISPATCHED" },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          endOdometerKm,
          fuelUsedL,
          podReceiver: podReceiver || null,
          podNote: podNote || null,
        },
      });
      if (t.count === 0) throw new RuleViolation("This trip was already completed or cancelled.");
      await tx.vehicle.update({
        where: { id: trip.vehicleId },
        data: { status: "AVAILABLE", odometerKm: endOdometerKm },
      });
      await tx.driver.update({ where: { id: trip.driverId }, data: { status: "AVAILABLE" } });
      await tx.fuelLog.create({
        data: {
          liters: fuelUsedL,
          cost: fuelCost,
          note: `Trip ${trip.refNo} (${trip.source} → ${trip.destination})`,
          vehicleId: trip.vehicleId,
        },
      });
    });
  } catch (e) {
    if (e instanceof RuleViolation) return { error: e.message };
    throw e;
  }
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

  try {
    await prisma.$transaction(async (tx) => {
      const wasDispatched = trip.status === "DISPATCHED";
      const t = await tx.trip.updateMany({
        where: { id, status: trip.status },
        data: { status: "CANCELLED" },
      });
      if (t.count === 0) throw new RuleViolation("This trip changed state; refresh and try again.");
      if (wasDispatched) {
        await tx.vehicle.update({ where: { id: trip.vehicleId }, data: { status: "AVAILABLE" } });
        await tx.driver.update({ where: { id: trip.driverId }, data: { status: "AVAILABLE" } });
      }
    });
  } catch (e) {
    if (e instanceof RuleViolation) return { error: e.message };
    throw e;
  }
  revalidateAll();
}
