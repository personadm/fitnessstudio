import Link from "next/link";
import { db } from "@/lib/db";
import { generateToken } from "@/lib/tokens";
import { sendPricingMail } from "@/lib/mail";

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

const PETROL = "#0F6E56";

/**
 * /bestaetigen?token=xxx
 *
 * Server-Component: führt die DOI-Bestätigung durch und zeigt eine kurze
 * Erfolgsseite. Nach 1.5s leitet ein meta-refresh auf /anmelden weiter.
 * Zusätzlich ein klickbarer Fallback-Button für den Fall dass die
 * Auto-Weiterleitung blockiert wird (z.B. durch Mail-Client mit Preview).
 *
 * Die Pricing-Mail (Aufgabe 4b) wird im Hintergrund versendet — UNABHÄNGIG
 * von der Anzeige. Fehler im Mailversand werden geloggt, aber nicht an den
 * User durchgereicht.
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
    // Schon bestätigt → trotzdem weiterleiten zur Verkaufsseite
    const refToken = contact.refToken ?? generateToken();
    if (!contact.refToken) {
      await db.contact.update({
        where: { id: contact.id },
        data: { refToken },
      });
    }
    return (
      <Success
        firstName={contact.firstName ?? null}
        refToken={refToken}
        alreadyConfirmed
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

  // Angebots-Mail im Hintergrund senden (Fehler nicht durchreichen)
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

  return <Success firstName={contact.firstName ?? null} refToken={refToken} />;
}

function Success({
  firstName,
  refToken,
  alreadyConfirmed,
}: {
  firstName: string | null;
  refToken: string;
  alreadyConfirmed?: boolean;
}) {
  const targetUrl = `/anmelden?ref=${encodeURIComponent(refToken)}`;
  // meta refresh nach 1.5 Sekunden — Browser-native, kein JavaScript nötig
  return (
    <main className="grid min-h-screen place-items-center bg-[#FBF7F0] px-6 py-12">
      {/* eslint-disable-next-line @next/next/no-head-element */}
      <head>
        <meta httpEquiv="refresh" content={`1.5; url=${targetUrl}`} />
      </head>

      <div className="w-full max-w-lg rounded-xl border border-[#E8E2D5] bg-white p-8 text-center md:p-10">
        <div
          className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full"
          style={{ backgroundColor: "rgba(15,110,86,0.12)", color: PETROL }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M5 12l5 5L20 7"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-semibold leading-tight text-[#2C2C2A] md:text-3xl">
          Geschafft{firstName ? `, ${firstName}` : ""}!
        </h1>
        <p className="mt-3 text-base leading-relaxed text-[#5F5E5A]">
          {alreadyConfirmed
            ? "Du warst schon bestätigt — wir leiten dich direkt weiter zu deinem Start-Angebot."
            : "Dein Start-Angebot ist freigeschaltet — wir leiten dich direkt weiter."}
        </p>

        <Link
          href={targetUrl}
          className="mt-6 inline-block rounded-lg px-6 py-3 text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: PETROL }}
        >
          Zu deinem Start-Angebot →
        </Link>

        <p className="mt-4 text-xs text-[#8A857E]">
          Automatische Weiterleitung in wenigen Sekunden…
        </p>
      </div>
    </main>
  );
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
    <main className="grid min-h-screen place-items-center bg-[#FBF7F0] px-6">
      <div className="max-w-xl">
        <p
          className="mb-4 inline-block rounded-full px-3 py-1 text-xs font-semibold"
          style={{
            backgroundColor: isOk ? "rgba(15,110,86,0.1)" : "rgba(220,38,38,0.1)",
            color: isOk ? PETROL : "#B91C1C",
          }}
        >
          {isOk ? "✓ Bestätigt" : "× Fehler"}
        </p>
        <h1 className="text-3xl font-semibold leading-tight text-[#2C2C2A] md:text-4xl">
          {title}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[#5F5E5A]">{body}</p>
        <Link
          href="/"
          className="mt-8 inline-block text-sm font-semibold underline underline-offset-4"
          style={{ color: PETROL }}
        >
          Zur Startseite ↑
        </Link>
      </div>
    </main>
  );
}
