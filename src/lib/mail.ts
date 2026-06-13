import { Resend } from "resend";
import { db } from "./db";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.MAIL_FROM ?? "onboarding@resend.dev";

// ─────────────────────────────────────────────────────────────
// Resend-Send-Wrapper
//
// WICHTIG: resend.emails.send() wirft KEINE Exception, wenn der Versand
// scheitert (unverifizierte Domain, geblockter Empfänger, Rate-Limit,
// Validierungsfehler …). Stattdessen liefert es { data: null, error: {...} }
// als *erfolgreich aufgelöstes* Promise zurück. Wer nur `await send()` macht
// und das Ergebnis ignoriert, hält einen Fehlversand fälschlich für Erfolg
// und protokolliert die Mail als "verschickt", obwohl Resend sie nie
// angenommen hat. Dieser Wrapper macht aus Resends error-Channel einen echten
// Throw, damit aufrufende try/catch-Blöcke fehlgeschlagene Sends bemerken.
type ResendSendPayload = Parameters<typeof resend.emails.send>[0];

async function sendViaResend(payload: ResendSendPayload): Promise<{ id: string }> {
  const { data, error } = await resend.emails.send(payload);
  if (error) {
    throw new Error(`Resend send failed: ${error.name ?? "error"} – ${error.message}`);
  }
  if (!data?.id) {
    throw new Error("Resend send failed: keine Message-ID zurückgeliefert");
  }
  return { id: data.id };
}

// Optional: Antwort-Adresse. Wenn gesetzt, wird sie als reply-to Header
// in alle Mails geschrieben → wenn der Empfänger auf "Antworten" klickt,
// geht die Mail an diese Adresse statt an die Absender-Adresse.
// In Render als ENV setzen, z.B. MAIL_REPLY_TO=tim@example.com
const REPLY_TO = process.env.MAIL_REPLY_TO?.trim() || null;
const REPLY_TO_FIELD = REPLY_TO ? { replyTo: [REPLY_TO] } : {};

const STUDIO_NAME = process.env.STUDIO_NAME ?? "Deine Gesundheitscoaches";
const STUDIO_URL = process.env.STUDIO_URL ?? "http://localhost:3000";
const LOGO_URL =
  process.env.STUDIO_LOGO_URL ??
  "https://static.wixstatic.com/media/fe97c9_fce18c98c6b74c699b46b0bb10e832ed~mv2.png/v1/fill/w_720,h_120,al_c,q_85/Logo-FB-NEU.png";

// ─────────────────────────────────────────────────────────────
// BillingInterval → Preis-Suffix
// ─────────────────────────────────────────────────────────────
const BILLING_SUFFIX: Record<string, string> = {
  MONATLICH: "/ Monat",
  QUARTALSWEISE: "/ Quartal",
  HALBJAEHRLICH: "/ Halbjahr",
  JAEHRLICH: "/ Jahr",
  EINMALIG: "einmalig",
};

function billingSuffix(interval: string | null | undefined): string {
  if (!interval) return "/ Monat";
  return BILLING_SUFFIX[interval] ?? "/ Monat";
}

// ─────────────────────────────────────────────────────────────
// 1) Willkommens-/Angebots-Mail (Single-Opt-In: direkt nach Eintragung)
// ─────────────────────────────────────────────────────────────

export async function sendPricingMail(opts: {
  to: string;
  firstName?: string | null;
  refToken: string;
}) {
  const signupUrl = `${STUDIO_URL}/anmelden?ref=${opts.refToken}`;
  const greeting = opts.firstName ? `Hallo ${opts.firstName},` : "Hallo,";
  const subject = opts.firstName
    ? `Geschafft – hier ist dein Gratis-Start-Angebot, ${opts.firstName}`
    : `Geschafft – hier ist dein Gratis-Start-Angebot`;
  return sendViaResend({
    from: FROM,
    ...REPLY_TO_FIELD,
    to: opts.to,
    subject,
    html: offerTemplate({ signupUrl, greeting }),
    text:
      `${greeting}\n\n` +
      `du bist drin – herzlich willkommen bei den Gesundheitscoaches!\n\n` +
      `Wie versprochen kommt hier dein persönliches Start-Angebot. ` +
      `In 6 Wochen bringen wir dich spürbar leichter, schmerzfreier und mit mehr Energie ` +
      `durch den Alltag – ganzheitlich, ohne Diätstress und ohne Leistungsdruck.\n\n` +
      `Das Wichtigste auf einen Blick:\n` +
      `• Dein Start kostet einmalig 99 € – und deine gesetzliche Krankenkasse erstattet bis zu 100 % davon.\n` +
      `• Du beginnst mit 2 Std. Personal-Coaching, Körper- & Stoffwechselanalyse und einem Plan, der zu deinem Alltag passt.\n` +
      `• Zufriedenheitsgarantie: Nach 6 Wochen entscheidest du komplett frei.\n\n` +
      `Sichere dir jetzt deinen Platz:\n${signupUrl}\n\n` +
      `Über 6.000 Menschen sind diesen Weg schon mit uns gegangen.\n\n` +
      `Wir freuen uns auf dich!\nTina & Erik – Deine Gesundheitscoaches`,
  });
}

// ─────────────────────────────────────────────────────────────
// 2) Anmeldebestätigung
// ─────────────────────────────────────────────────────────────

export async function sendSignupConfirmation(opts: {
  to: string;
  firstName: string;
  planName: string;
  priceCents: number;
  billingInterval?: string | null;
}) {
  return sendViaResend({
    from: FROM,
    ...REPLY_TO_FIELD,
    to: opts.to,
    subject: `Willkommen bei ${STUDIO_NAME}`,
    html: signupConfirmTemplate({
      firstName: opts.firstName,
      planName: opts.planName,
      priceCents: opts.priceCents,
      billingInterval: opts.billingInterval ?? null,
    }),
    text: `Hallo ${opts.firstName},\n\ndeine Anmeldung für den Tarif ${opts.planName} (${formatPrice(opts.priceCents)} ${billingSuffix(opts.billingInterval)}) ist bei uns eingegangen. Wir melden uns in den nächsten Werktagen mit allen Details.\n\n— ${STUDIO_NAME}`,
  });
}

// ─────────────────────────────────────────────────────────────
// 3) Kampagnen / Newsletter (vom Admin manuell ausgelöst)
// ─────────────────────────────────────────────────────────────

export async function sendCampaignMail(opts: {
  to: string;
  subject: string;
  bodyHtml: string;
  unsubscribeUrl?: string | null;
}) {
  const wrappedHtml = campaignWrapperTemplate({
    bodyHtml: opts.bodyHtml,
    unsubscribeUrl: opts.unsubscribeUrl ?? null,
  });
  return sendViaResend({
    from: FROM,
    ...REPLY_TO_FIELD,
    to: opts.to,
    subject: opts.subject,
    html: wrappedHtml,
  });
}

// ─────────────────────────────────────────────────────────────
// 4) Funnel-Mail (automatische Schritt-Mails aus Funnels)
// ─────────────────────────────────────────────────────────────

export async function sendFunnelMail(opts: {
  to: string;
  subject: string;
  bodyHtml: string;
  unsubscribeUrl?: string | null;
}) {
  const wrappedHtml = campaignWrapperTemplate({
    bodyHtml: opts.bodyHtml,
    unsubscribeUrl: opts.unsubscribeUrl ?? null,
  });
  return sendViaResend({
    from: FROM,
    ...REPLY_TO_FIELD,
    to: opts.to,
    subject: opts.subject,
    html: wrappedHtml,
  });
}

// ─────────────────────────────────────────────────────────────
// HTML-Templates
// ─────────────────────────────────────────────────────────────

function shellStyles() {
  return `body{margin:0;padding:0;background:#F5F0E8;font-family:Georgia,serif;color:#1A1815;}`;
}

function logoBlock() {
  return `<div style="text-align:center;padding:32px 40px 8px;">
    <img src="${LOGO_URL}" alt="${STUDIO_NAME}" style="max-width:280px;width:100%;height:auto;display:inline-block;" />
  </div>`;
}

interface PlanForMail {
  name: string;
  description: string | null;
  priceCents: number;
  highlights: string[];
  billingInterval?: string | null;
  agb?: string | null;
}

function pricingTemplate({
  plans,
  signupUrl,
  greeting,
}: {
  plans: PlanForMail[];
  signupUrl: string;
  greeting: string;
}) {
  const planRows = plans
    .map(
      (p) => `
    <tr><td style="padding:24px;border-top:1px solid #D8D2C7;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:top;">
            <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#8A857E;margin:0 0 4px;">Angebot</p>
            <h3 style="font-size:22px;margin:0 0 8px;font-weight:400;">${p.name}</h3>
            ${p.description ? `<p style="font-size:14px;line-height:1.5;color:#3A3530;margin:0 0 12px;">${p.description}</p>` : ""}
            <ul style="font-size:14px;line-height:1.6;color:#3A3530;margin:0;padding-left:18px;">
              ${p.highlights.map((h) => `<li>${h}</li>`).join("")}
            </ul>
          </td>
          <td style="vertical-align:top;text-align:right;white-space:nowrap;padding-left:16px;">
            <p style="font-size:28px;font-weight:400;margin:0;">${formatPrice(p.priceCents)}</p>
            <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.05em;color:#8A857E;margin:4px 0 0;">${billingSuffix(p.billingInterval)}</p>
          </td>
        </tr>
        ${
          p.agb
            ? `<tr><td colspan="2" style="padding-top:16px;">
          <details style="font-size:12px;line-height:1.5;color:#5A554F;">
            <summary style="cursor:pointer;font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#8A857E;margin-bottom:8px;">AGB anzeigen</summary>
            <div style="white-space:pre-wrap;padding:12px;background:#FAF7F2;border:1px solid #E8E2D5;margin-top:8px;">${escapeHtml(p.agb)}</div>
          </details>
        </td></tr>`
            : ""
        }
      </table>
    </td></tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8"><style>${shellStyles()}</style></head><body>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:48px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #D8D2C7;">
        <tr><td>${logoBlock()}</td></tr>
        <tr><td style="padding:8px 40px 24px;">
          <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#8A857E;margin:0 0 24px;">${STUDIO_NAME}</p>
          <p style="font-size:16px;line-height:1.6;margin:0 0 12px;">${greeting}</p>
          <h1 style="font-size:34px;line-height:1.1;margin:0 0 16px;font-weight:400;letter-spacing:-0.02em;">Dein Sonderangebot.</h1>
          <p style="font-size:16px;line-height:1.6;margin:0 0 12px;"><strong>Nur für dich</strong> — exklusiv zusammengestellt nach deiner Anfrage. Schau dir an, was wir dir anbieten können. Wenn dir etwas zusagt, klick unten auf <em>Hier anmelden</em>. Das Angebot ist zeitlich begrenzt.</p>
        </td></tr>
        ${planRows}
        <tr><td style="padding:40px;border-top:1px solid #D8D2C7;text-align:center;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr><td style="background:#1A1815;">
            <a href="${signupUrl}" style="display:inline-block;padding:16px 36px;font-family:'Courier New',monospace;font-size:14px;letter-spacing:0.1em;text-transform:uppercase;color:#C8FF00;text-decoration:none;">Hier anmelden →</a>
          </td></tr></table>
          <p style="font-size:13px;line-height:1.6;color:#8A857E;margin:24px 0 0;">Fragen? Antworte einfach auf diese Mail.</p>
        </td></tr>
      </table>
      <p style="font-family:'Courier New',monospace;font-size:11px;color:#8A857E;margin:24px 0 0;">${STUDIO_NAME}</p>
    </td></tr>
  </table>
</body></html>`;
}

function pricingTextFallback({
  plans,
  signupUrl,
  greeting,
}: {
  plans: PlanForMail[];
  signupUrl: string;
  greeting: string;
}) {
  const planText = plans
    .map(
      (p) =>
        `${p.name} – ${formatPrice(p.priceCents)} ${billingSuffix(p.billingInterval)}\n  ${p.highlights.join("\n  ")}${p.agb ? `\n\n  AGB: ${p.agb.slice(0, 200)}${p.agb.length > 200 ? "…" : ""}` : ""}`,
    )
    .join("\n\n");
  return `${greeting}\n\nhier ist dein persönliches Sonderangebot — exklusiv für dich zusammengestellt. Das Angebot ist zeitlich begrenzt.\n\n${planText}\n\nHier anmelden: ${signupUrl}\n\n— ${STUDIO_NAME}`;
}

function signupConfirmTemplate(opts: {
  firstName: string;
  planName: string;
  priceCents: number;
  billingInterval: string | null;
}) {
  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8"><style>${shellStyles()}</style></head><body>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:48px 16px;">
    <tr><td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #D8D2C7;">
        <tr><td>${logoBlock()}</td></tr>
        <tr><td style="padding:8px 40px 40px;">
          <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#8A857E;margin:0 0 24px;">${STUDIO_NAME}</p>
          <h1 style="font-size:28px;line-height:1.2;margin:0 0 16px;font-weight:400;">Hallo ${opts.firstName}, willkommen.</h1>
          <p style="font-size:16px;line-height:1.6;margin:0 0 24px;">Deine Anmeldung für das Angebot <strong>${opts.planName}</strong> (${formatPrice(opts.priceCents)} ${billingSuffix(opts.billingInterval)}) ist bei uns eingegangen.</p>
          <p style="font-size:16px;line-height:1.6;margin:0 0 24px;">Wir melden uns in den nächsten Werktagen bei dir mit allen weiteren Schritten zu deinem Start.</p>
          <p style="font-size:14px;line-height:1.6;color:#3A3530;margin:0;">Bis dahin: schön, dass du dabei bist.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function campaignWrapperTemplate({
  bodyHtml,
  unsubscribeUrl,
}: {
  bodyHtml: string;
  unsubscribeUrl?: string | null;
}) {
  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8"><style>${shellStyles()}</style></head><body>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:48px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #D8D2C7;">
        <tr><td>${logoBlock()}</td></tr>
        <tr><td style="padding:8px 40px 40px;font-size:16px;line-height:1.6;">
          <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#8A857E;margin:0 0 24px;">${STUDIO_NAME}</p>
          ${bodyHtml}
        </td></tr>
      </table>
      ${legalFooterBlock(unsubscribeUrl ?? null)}
    </td></tr>
  </table>
</body></html>`;
}

/**
 * Footer mit Studio-Adressen und Abmeldelink.
 *
 * unsubscribeUrl: wenn vorhanden → 1-Klick-Abmelde-Link auf /abmelden?t=<token>.
 *                 wenn null (z.B. bei Test-Mails ohne Contact) → mailto-Fallback.
 */
function legalFooterBlock(unsubscribeUrl: string | null): string {
  const fallbackMailto = `mailto:mail@gesundheitscoaches.de?subject=${encodeURIComponent("Abmeldung Newsletter")}`;
  const href = unsubscribeUrl ?? fallbackMailto;

  return `
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="margin-top:24px;">
    <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.7;color:#A8A39A;padding:0 16px;">
      <p style="margin:0 0 6px;color:#A8A39A;">Deine Gesundheitscoaches:</p>
      <p style="margin:0 0 4px;color:#A8A39A;">Vital-Fit · Laurenzstr. 98 · 48607 Ochtrup · Tel: 02553 7216466</p>
      <p style="margin:0 0 14px;color:#A8A39A;">Villa-Fit · Erhardstr. 2 · 48683 Ahaus · Tel: 02561 961166</p>
      <p style="margin:0;color:#A8A39A;">
        Du möchtest keine E-Mails mehr von uns erhalten? <a href="${href}" style="color:#A8A39A;text-decoration:underline;">Hier abmelden</a>.
      </p>
    </td></tr>
  </table>`;
}

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─────────────────────────────────────────────────────────────
// Angebots-Mail-Template (Single-Opt-In: direkt nach Eintragung)
// ─────────────────────────────────────────────────────────────

function offerTemplate({ signupUrl, greeting }: { signupUrl: string; greeting: string }) {
  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8"><style>${shellStyles()}</style></head>
<body>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:48px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #D8D2C7;">
        <tr><td>${logoBlock()}</td></tr>
        <tr><td style="padding:8px 40px 40px;">
          <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#8A857E;margin:0 0 24px;">${STUDIO_NAME}</p>
          <p style="font-size:16px;line-height:1.6;margin:0 0 12px;">${greeting}</p>
          <h1 style="font-size:30px;line-height:1.2;margin:0 0 16px;font-weight:600;color:#2C2C2A;">Du bist drin – willkommen!</h1>
          <p style="font-size:16px;line-height:1.6;margin:0 0 16px;color:#5F5E5A;">Wie versprochen kommt hier dein persönliches Start-Angebot. In 6 Wochen bringen wir dich spürbar leichter, schmerzfreier und mit mehr Energie durch den Alltag – ganzheitlich, ohne Diätstress und ohne Leistungsdruck.</p>

          <div style="background:#FBF7F0;border-left:4px solid #0F6E56;padding:20px 24px;margin:24px 0;border-radius:4px;">
            <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#0F6E56;margin:0 0 12px;font-weight:600;">Das Wichtigste auf einen Blick</p>
            <ul style="margin:0;padding:0;list-style:none;">
              <li style="font-size:15px;line-height:1.6;margin:0 0 10px;padding-left:24px;position:relative;color:#2C2C2A;">
                <span style="position:absolute;left:0;color:#0F6E56;font-weight:bold;">✓</span>
                Dein Start kostet einmalig <strong>99 €</strong> – und deine gesetzliche Krankenkasse erstattet bis zu <strong>100 %</strong> davon.
              </li>
              <li style="font-size:15px;line-height:1.6;margin:0 0 10px;padding-left:24px;position:relative;color:#2C2C2A;">
                <span style="position:absolute;left:0;color:#0F6E56;font-weight:bold;">✓</span>
                Du beginnst mit <strong>2 Std. Personal-Coaching</strong>, Körper- & Stoffwechselanalyse und einem Plan, der zu deinem Alltag passt.
              </li>
              <li style="font-size:15px;line-height:1.6;margin:0 0 0;padding-left:24px;position:relative;color:#2C2C2A;">
                <span style="position:absolute;left:0;color:#0F6E56;font-weight:bold;">✓</span>
                <strong>Zufriedenheitsgarantie:</strong> Nach 6 Wochen entscheidest du komplett frei.
              </li>
            </ul>
          </div>

          <p style="font-size:16px;line-height:1.6;margin:0 0 20px;color:#2C2C2A;font-weight:500;">Sichere dir jetzt deinen Platz:</p>

          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr><td style="background:#0F6E56;border-radius:8px;">
            <a href="${signupUrl}" style="display:inline-block;padding:16px 32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Zu meinem Start-Angebot →</a>
          </td></tr></table>

          <hr style="border:none;border-top:1px solid #D8D2C7;margin:16px 0 24px;">

          <p style="font-size:13px;line-height:1.5;color:#5F5E5A;margin:0 0 16px;font-style:italic;">Über 6.000 Menschen sind diesen Weg schon mit uns gegangen.</p>
          <p style="font-size:14px;line-height:1.6;margin:0;">Wir freuen uns auf dich!<br><strong>Tina & Erik</strong> – Deine Gesundheitscoaches</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
