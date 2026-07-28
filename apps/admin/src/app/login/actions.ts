"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export type LoginFormState = {
  error?: string;
};

// Simple in-memory failed-attempt lockout — resets on server restart. A
// single-admin, low-traffic blog doesn't need a persisted rate-limit table,
// just enough friction to make brute-forcing impractical.
const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_WINDOW_MS = 60_000;

export async function loginAction(_prevState: LoginFormState, formData: FormData): Promise<LoginFormState> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  const attempt = failedAttempts.get(username);
  if (attempt && attempt.count >= LOCKOUT_THRESHOLD && Date.now() - attempt.lastAttempt < LOCKOUT_WINDOW_MS) {
    return { error: "Слишком много попыток. Подождите минуту и попробуйте снова." };
  }

  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
  if (!adminUsername || !adminPasswordHash) {
    return { error: "Логин администратора не настроен на сервере (ADMIN_USERNAME/ADMIN_PASSWORD_HASH)." };
  }

  const validUsername = username === adminUsername;
  const validPassword = await bcrypt.compare(password, adminPasswordHash);

  if (!validUsername || !validPassword) {
    failedAttempts.set(username, { count: (attempt?.count ?? 0) + 1, lastAttempt: Date.now() });
    return { error: "Неверный логин или пароль." };
  }

  failedAttempts.delete(username);

  const session = await getSession();
  session.admin = true;
  await session.save();

  redirect("/");
}

export async function logoutAction() {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}
