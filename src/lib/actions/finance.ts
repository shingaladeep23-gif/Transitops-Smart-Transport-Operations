"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireWrite } from "@/lib/auth";
import type { ActionState } from "./auth";

function revalidateAll() {
  revalidatePath("/expenses");
  revalidatePath("/reports");
  revalidatePath("/");
}

export async function createFuelLog(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireWrite("finance");
  const vehicleId = String(formData.get("vehicleId") ?? "");
  const liters = Number(formData.get("liters"));
  const cost = Number(formData.get("cost"));
  const dateRaw = String(formData.get("date") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!vehicleId) return { error: "Select a vehicle." };
  if (!Number.isFinite(liters) || liters <= 0) return { error: "Liters must be a positive number." };
  if (!Number.isFinite(cost) || cost < 0) return { error: "Cost must be zero or more." };
  const date = dateRaw ? new Date(dateRaw) : new Date();
  if (Number.isNaN(date.getTime())) return { error: "Date is invalid." };

  await prisma.fuelLog.create({ data: { vehicleId, liters, cost, date, note } });
  revalidateAll();
}

export async function createExpense(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireWrite("finance");
  const vehicleId = String(formData.get("vehicleId") ?? "");
  const category = String(formData.get("category") ?? "").trim();
  const amount = Number(formData.get("amount"));
  const dateRaw = String(formData.get("date") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!vehicleId || !category) return { error: "Vehicle and category are required." };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Amount must be a positive number." };
  const date = dateRaw ? new Date(dateRaw) : new Date();
  if (Number.isNaN(date.getTime())) return { error: "Date is invalid." };

  await prisma.expense.create({ data: { vehicleId, category, amount, date, note } });
  revalidateAll();
}
