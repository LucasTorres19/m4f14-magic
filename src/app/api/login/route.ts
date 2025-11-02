// make a post route to login with a password

import { env } from "@/env";
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
  return NextResponse.json({ success: true });
}
