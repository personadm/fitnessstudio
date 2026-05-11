import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { sendPushToAll } from "@/lib/push";

export async function POST() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const result = await sendPushToAll({
    title: "🔔 Test-Notification",
    body: "Push funktioniert! Du wirst ab jetzt bei jeder Online-Anmeldung benachrichtigt.",
    url: "/admin",
    tag: "test",
  });

  return NextResponse.json({ ok: true, ...result });
}
