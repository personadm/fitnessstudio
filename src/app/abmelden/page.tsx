import { db } from "@/lib/db";

interface PageProps {
  searchParams: Promise<{ t?: string }>;
}

export const dynamic = "force-dynamic";

/**
 * Abmelde-Page. Aufgerufen über den Link im Mail-Footer:
 *   /abmelden?t=<unsubscribeToken>
 *
 * Verhalten:
 *  - Token ungültig oder fehlt → freundliche "Link nicht gültig"-Meldung
 *  - Token gültig, noch nicht abgemeldet → optedOutAt setzen, Bestätigung zeigen
 *  - Token gültig, schon abgemeldet → Bestätigung zeigen (idempotent)
 *
 * Plus: laufende Funnel-Enrollments dieses Kontakts werden beim nächsten
 * processFunnels-Lauf automatisch mit Grund "OPTED_OUT" abgebrochen.
 */
export default async function UnsubscribePage({ searchParams }: PageProps) {
  const { t: token } = await searchParams;

  if (!token) {
    return <UnsubscribeShell variant="invalid" />;
  }

  // Kontakt anhand des Tokens suchen
  const contact = await db.contact.findUnique({
    where: { unsubscribeToken: token },
    select: { id: true, email: true, optedOutAt: true, firstName: true },
  });

  if (!contact) {
    return <UnsubscribeShell variant="invalid" />;
  }

  // Wenn noch nicht abgemeldet: jetzt abmelden + Event protokollieren
  if (!contact.optedOutAt) {
    await db.contact.update({
      where: { id: contact.id },
      data: { optedOutAt: new Date() },
    });
    await db.contactEvent.create({
      data: {
        contactId: contact.id,
        type: "OPTED_OUT",
        meta: { source: "unsubscribe_link" },
      },
    });
  }

  return <UnsubscribeShell variant="success" email={contact.email} firstName={contact.firstName} />;
}

function UnsubscribeShell({
  variant,
  email,
  firstName,
}: {
  variant: "success" | "invalid";
  email?: string;
  firstName?: string | null;
}) {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white border border-ink/15 p-10 md:p-14 text-center">
        {variant === "success" ? (
          <>
            <p className="label">Abgemeldet</p>
            <h1 className="mt-3 text-display text-4xl md:text-5xl">
              {firstName ? `Schade, ${firstName}.` : "Schade."}
            </h1>
            <p className="mt-6 text-sm text-muted leading-relaxed">
              Du wurdest erfolgreich von unserer Mail-Liste abgemeldet
              {email ? (
                <>
                  {" "}
                  (<span className="font-mono text-xs">{email}</span>)
                </>
              ) : null}
              . Du bekommst ab sofort keine weiteren Mails mehr von uns.
            </p>
            <p className="mt-6 text-sm text-muted leading-relaxed">
              Falls du das versehentlich angeklickt hast oder dich später anders
              entscheidest, melde dich einfach bei{" "}
              <a
                href="mailto:mail@gesundheitscoaches.de"
                className="underline hover:text-ink"
              >
                mail@gesundheitscoaches.de
              </a>{" "}
              — wir tragen dich dann gerne wieder ein.
            </p>
            <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
              Deine Gesundheitscoaches · Tina &amp; Erik
            </p>
          </>
        ) : (
          <>
            <p className="label">Link ungültig</p>
            <h1 className="mt-3 text-display text-4xl md:text-5xl">
              Hm, das hat nicht geklappt.
            </h1>
            <p className="mt-6 text-sm text-muted leading-relaxed">
              Der Abmelde-Link ist abgelaufen oder fehlerhaft. Schreib uns
              kurz an{" "}
              <a
                href="mailto:mail@gesundheitscoaches.de?subject=Abmeldung"
                className="underline hover:text-ink"
              >
                mail@gesundheitscoaches.de
              </a>{" "}
              und wir melden dich manuell ab.
            </p>
            <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
              Deine Gesundheitscoaches
            </p>
          </>
        )}
      </div>
    </div>
  );
}
