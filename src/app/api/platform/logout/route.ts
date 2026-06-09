import { NextResponse } from "next/server";
import { destroyPlatformSession } from "@/lib/platformAuth";

export const runtime = "nodejs";

export async function POST() {
  await destroyPlatformSession();
  return NextResponse.json({ ok: true });
}
