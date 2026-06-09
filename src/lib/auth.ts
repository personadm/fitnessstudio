import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// In Produktion MUSS TOKEN_SECRET gesetzt sein — sonst könnten mit einem
// öffentlich bekannten Fallback-Secret gültige Admin-Sessions gefälscht werden.
const SECRET_STRING = process.env.TOKEN_SECRET;
if (!SECRET_STRING && process.env.NODE_ENV === "production") {
  throw new Error("TOKEN_SECRET ist nicht gesetzt.");
}
const SECRET = new TextEncoder().encode(
  SECRET_STRING || "dev-secret-please-change-in-production",
);

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
    if (typeof payload.uid !== "string") return null;
    return { userId: payload.uid };
  } catch {
    return null;
  }
}
