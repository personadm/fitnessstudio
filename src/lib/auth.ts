import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET_STRING = process.env.TOKEN_SECRET || "dev-secret-please-change-in-production";
const SECRET = new TextEncoder().encode(SECRET_STRING);

const COOKIE_NAME = "admin_session";
const ALG = "HS256";
const TTL_SECONDS = 60 * 60 * 24 * 7; // 7 Tage

export async function createSession(userId: string) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(SECRET);

  const c = await cookies();
  c.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: TTL_SECONDS,
    path: "/",
  });
}

export async function destroySession() {
  const c = await cookies();
  c.delete(COOKIE_NAME);
}

export async function getSession(): Promise<{ userId: string } | null> {
  const c = await cookies();
  const token = c.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return { userId: payload.uid as string };
  } catch {
    return null;
  }
}
