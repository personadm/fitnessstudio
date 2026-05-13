import { db } from "@/lib/db";
import { generateToken } from "@/lib/tokens";
import { sendPricingMail } from "@/lib/mail";
import { RedirectingSuccess } from "./RedirectingSuccess";

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

/**
 * /bestaetigen?token=xxx
 *
 * Server-Component: führt die DOI-Bestätigung durch.
 * Bei Erfolg → Countdown + automatische Weiterleitung zu /anmelden?ref=...
 * Bei Fehler → Hinweis-Seite
 */
export default async function BestaetigenPage({ searchParams }: PageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <Result variant="error" title="Kein Token gefunden." body="Der Link ist unvollständig." />
    );
  }

  const contact = await db.contact.findUnique({ where: { doiToken: token } });

  if (!contact) {
    // Kein offener DOI-Token mehr — vielleicht schon bestätigt.
    // Versuch via refToken zu finden (wenn der DOI-Token Reuse ist).
    return (
      <Result
        variant="error"
        title="Link nicht gültig."
        body="Vielleicht hast du die E-Mail-Adresse schon bestätigt, oder der Link ist abgelaufen. Trag dich notfalls einfach noch einmal ein."
      />
    );
  }

  // Bereits bestätigt? → Trotzdem zur Anmelde-Seite weiterleiten
  if (contact.doiConfirmedAt) {
    if (contact.refToken) {
      return <RedirectingSuccess redirectUrl={`/anmelden?ref=${contact.refToken}`} seconds={5} />;
    }
    return (
      <Result
        variant="success"
        title="Du bist bereits bestätigt."
        body="Schau in dein Postfach – die Tarif-Mail haben wir dir schon geschickt."
      />
    );
  }

  // Frische Bestätigung
  const refToken = contact.refToken ?? generateToken();
  await db.contact.update({
    where: { id: contact.id },
    data: { doiConfirmedAt: new Date(), refToken, doiToken: null },
  });

  await db.contactEvent.create({
    data: { contactId: contact.id, type: "DOI_CONFIRMED" },
  });

  // Preis-Mail im Hintergrund schicken (Fehler nicht an User durchreichen).
  // User wird ohnehin sofort zur Anmelde-Seite weitergeleitet, die Mail ist
  // dann eher als Backup / "nochmal nachlesen"-Option.
  try {
    await sendPricingMail({
      to: contact.email,
      firstName: contact.firstName,
      refToken,
    });
    await db.contactEvent.create({
      data: { contactId: contact.id, type: "PRICING_MAIL_SENT" },
    });
  } catch (err) {
    console.error("[bestaetigen] sendPricingMail failed", err);
  }

  return <RedirectingSuccess redirectUrl={`/anmelden?ref=${refToken}`} seconds={5} />;
}

function Result({
  variant,
  title,
  body,
}: {
  variant: "success" | "error";
  title: string;
  body: string;
}) {
  const isOk = variant === "success";
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="max-w-xl">
        <p className={`label mb-6 ${isOk ? "!text-ink" : "!text-red-700"}`}>
          {isOk ? "✓ Bestätigt" : "× Fehler"}
        </p>
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
