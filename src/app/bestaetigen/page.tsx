import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { generateToken } from "@/lib/tokens";
import { sendPricingMail } from "@/lib/mail";

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

/**
 * /bestaetigen?token=xxx
 *
 * Server-Component: führt die DOI-Bestätigung direkt durch
 * und zeigt dem User das Ergebnis. Kein clientseitiger Round-Trip nötig.
 */
export default async function BestaetigenPage({ searchParams }: PageProps) {
  const { token } = await searchParams;

  if (!token) {
    return <Result variant="error" title="Kein Token gefunden." body="Der Link ist unvollständig." />;
  }

  const contact = await db.contact.findUnique({ where: { doiToken: token } });

  if (!contact) {
    return (
      <Result
        variant="error"
        title="Link nicht gültig."
        body="Vielleicht hast du die E-Mail-Adresse schon bestätigt, oder der Link ist abgelaufen. Trag dich notfalls einfach noch einmal ein."
      />
    );
  }

  if (contact.doiConfirmedAt) {
    return (
      <Result
        variant="success"
        title="Du bist bereits bestätigt."
        body="Schau in dein Postfach – die Tarif-Mail haben wir dir schon geschickt."
      />
    );
  }

  // Bestätigen
  const refToken = contact.refToken ?? generateToken();
  await db.contact.update({
    where: { id: contact.id },
    data: { doiConfirmedAt: new Date(), refToken, doiToken: null },
  });

  await db.contactEvent.create({
    data: { contactId: contact.id, type: "DOI_CONFIRMED" },
  });

  // Preis-Mail im Hintergrund schicken (Fehler nicht an User durchreichen)
  try {
    await sendPricingMail({ to: contact.email, refToken });
    await db.contactEvent.create({
      data: { contactId: contact.id, type: "PRICING_MAIL_SENT" },
    });
  } catch (err) {
    console.error("[bestaetigen] sendPricingMail failed", err);
  }

  return (
    <Result
      variant="success"
      title="Bestätigt."
      body="Wir haben dir gerade die Tarife in dein Postfach geschickt. In wenigen Minuten ist sie da."
    />
  );
}

function Result({ variant, title, body }: { variant: "success" | "error"; title: string; body: string }) {
  const isOk = variant === "success";
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="max-w-xl">
        <p className={`label mb-6 ${isOk ? "!text-ink" : "!text-red-700"}`}>{isOk ? "✓ Bestätigt" : "× Fehler"}</p>
        <h1 className="text-display text-5xl leading-[0.95] md:text-7xl">{title}</h1>
        <p className="mt-6 text-base leading-relaxed text-ink-soft">{body}</p>
        <a
          href="/"
          className="mt-10 inline-block border-b-2 border-ink pb-1 font-mono text-sm uppercase tracking-[0.14em] hover:text-ink-soft"
        >
          Zur Startseite ↑
        </a>
      </div>
    </main>
  );
}
