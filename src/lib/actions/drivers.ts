"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireWrite } from "@/lib/auth";
import type { ActionState } from "./auth";
import { Prisma, DriverStatus } from "@prisma/client";

function parseDriver(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const licenseNo = String(formData.get("licenseNo") ?? "").trim().toUpperCase();
  const licenseCategory = String(formData.get("licenseCategory") ?? "").trim();
  const licenseExpiryRaw = String(formData.get("licenseExpiry") ?? "");
  const phone = String(formData.get("phone") ?? "").trim();
  const safetyScore = Number(formData.get("safetyScore") ?? 100);

  const licenseExpiry = new Date(licenseExpiryRaw);
  if (!name || !licenseNo || !licenseCategory || !phone) {
    return { error: "Name, license number, category and phone are required." };
  }
  if (Number.isNaN(licenseExpiry.getTime())) return { error: "License expiry date is invalid." };
  if (!Number.isInteger(safetyScore) || safetyScore < 0 || safetyScore > 100) {
    return { error: "Safety score must be between 0 and 100." };
  }
  return { data: { name, licenseNo, licenseCategory, licenseExpiry, phone, safetyScore } };
}

export async function createDriver(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireWrite("drivers");
  const parsed = parseDriver(formData);
  if ("error" in parsed) return parsed;
  try {
    await prisma.driver.create({ data: parsed.data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: `License number ${parsed.data.licenseNo} already exists.` };
    }
    throw e;
  }
  revalidatePath("/drivers");
  revalidatePath("/");
}

export async function updateDriver(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireWrite("drivers");
  const id = String(formData.get("id"));
  const parsed = parseDriver(formData);
  if ("error" in parsed) return parsed;
  try {
    await prisma.driver.update({ where: { id }, data: parsed.data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: `License number ${parsed.data.licenseNo} already exists.` };
    }
    throw e;
  }
  revalidatePath("/drivers");
  revalidatePath("/");
}

export async function setDriverStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireWrite("drivers");
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as DriverStatus;

  const driver = await prisma.driver.findUnique({ where: { id } });
  if (!driver) return { error: "Driver not found." };
  if (driver.status === "ON_TRIP") {
    return { error: "Driver is on an active trip; complete or cancel the trip first." };
  }
  if (!["AVAILABLE", "OFF_DUTY", "SUSPENDED"].includes(status)) {
    return { error: "Invalid status." };
  }
  await prisma.driver.update({ where: { id }, data: { status } });
  revalidatePath("/drivers");
  revalidatePath("/");
}

export async function deleteDriver(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireWrite("drivers");
  const id = String(formData.get("id"));
  const tripCount = await prisma.trip.count({ where: { driverId: id } });
  if (tripCount > 0) return { error: "Driver has trip history; set them Off Duty or Suspended instead of deleting." };
  await prisma.driver.delete({ where: { id } });
  revalidatePath("/drivers");
  revalidatePath("/");
}
