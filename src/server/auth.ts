import { env } from "@/env";
import { verify } from "jsonwebtoken";
import { cookies } from "next/headers";

export const isAuthorizedByCookie = async () => {
  const cookieStore = await cookies();
  const cookie = cookieStore.get("mafia-magic-auth");

  try {
    const decoded = verify(cookie?.value ?? "", env.AUTHORIZATION_SECRET);
    return Boolean(decoded);
  } catch {
    return false;
  }
};
