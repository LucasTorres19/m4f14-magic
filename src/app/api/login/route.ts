// make a post route to login with a password

import { env } from "@/env";
import { writeAuditLog } from "@/server/audit";
import { sign } from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { z } from "zod";

const loginSchema = z.object({
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const body = (await request.json()) as unknown;
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.format() },
      { status: 400 },
    );
  }

  const { password } = parsed.data;
  if (password !== env.AUTHORIZATION_PASSWORD) {
    await writeAuditLog({
      action: "auth.login_failed",
      entityType: "auth",
      summary: "Failed login attempt",
      metadata: { reason: "invalid_password" },
      headers: request.headers,
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cookieStore = await cookies();
  const token = sign({ authorized: true }, env.AUTHORIZATION_SECRET);
  cookieStore.set({
    name: "mafia-magic-auth",
    value: token,
    secure: env.NODE_ENV === "production",
    httpOnly: true,
  });
  await writeAuditLog({
    action: "auth.login_succeeded",
    entityType: "auth",
    summary: "Successful login",
    headers: request.headers,
  });
  return NextResponse.json({ success: true });
}
