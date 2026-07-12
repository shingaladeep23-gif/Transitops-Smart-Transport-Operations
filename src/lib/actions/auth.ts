"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";
import { isRateLimited, recordFailedAttempt, clearAttempts } from "@/lib/rateLimit";

export type ActionState = { error?: string } | undefined;

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email and password are required." };
  if (email.length > 254 || password.length > 128) return { error: "Input too long." };

  if (isRateLimited(email)) {
    return { error: "Too many failed attempts. Try again in 15 minutes." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    recordFailedAttempt(email);
    return { error: "Invalid email or password." };
  }
  clearAttempts(email);
  await createSession({ userId: user.id, email: user.email, name: user.name, role: user.role });
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
