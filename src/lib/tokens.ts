import { randomBytes } from "crypto";

/**
 * Erzeugt einen URL-sicheren Zufallstoken.
 * Default 32 Bytes -> 43 Zeichen base64url.
 */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}
