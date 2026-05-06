import { Resend } from "resend";
import { db } from "./db";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.MAIL_FROM ?? "onboarding@resend.dev";
const STUDIO_NAME = process.env.STUDIO_NAME ?? "Dein Fitnessstudio";
const STUDIO_URL = process.env.STUDIO_URL ?? "http://localhost:3000";

// ─────────────────────────────────────────────────────────────
// 1) Double-Opt-In-Mail
// ─────────────────────────────────────────────────────────────

export async function sendDoiMail(opts: {
  to: string;
  firstName?: string | null;
  doiToken: string;
}) {
  const confirmUrl = `${STUDIO_URL}/bestaetigen?token=${opts.doiToken}`;
  const greeting = opts.firstName ? `Hallo ${opts.firstName},` : "Hallo,";
  return resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `Bitte bestätige deine E-Mail-Adresse`,
    html: doiTemplate({ confirmUrl, greeting }),
    text: `${greeting}\n\nbitte bestätige deine E-Mail-Adresse:\n\n${confirmUrl}\n\nWenn du dich nicht eingetragen hast, ignoriere diese Mail einfach.\n\n— ${STUDIO_NAME}`,
  });
}

// ─────────────────────────────────────────────────────────────
// 2) Willkommens-/Preis-Mail (nach DOI)
// ─────────────────────────────────────────────────────────────

export async function sendPricingMail(opts: {
  to: string;
  firstName?: string | null;
  refToken: string;
}) {
  const plans = await db.pricingPlan.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });
  const signupUrl = `${STUDIO_URL}/anmelden?ref=${opts.refToken}`;
  const greeting = opts.firstName ? `Hallo ${opts.firstName},` : "Hallo,";
  return resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `Willkommen bei ${STUDIO_NAME} – unsere Tarife`,
    html: pricingTemplate({ plans, signupUrl, greeting }),
    text: pricingTextFallback({ plans, signupUrl, greeting }),
  });
}

// ─────────────────────────────────────────────────────────────
// 3) Anmeldungs-Bestätigung an User
// ─────────────────────────────────────────────────────────────

export async function sendSignupConfirmation(opts: {
  to: string;
  firstName: string;
  planName: string;
  priceCents: number;
}) {
  return resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `Anmeldung erhalten – ${STUDIO_NAME}`,
    html: signupConfirmTemplate(opts),
    text: `Hallo ${opts.firstName},\n\ndeine Anmeldung für den Tarif "${opts.planName}" ist bei uns eingegangen.\n\nWir melden uns in den nächsten Werktagen mit dem Vertrag und allen weiteren Schritten.\n\n— ${STUDIO_NAME}`,
  });
}

// ─────────────────────────────────────────────────────────────
// 4) Newsletter / Kampagnen
// ─────────────────────────────────────────────────────────────

export async function sendCampaignMail(opts: {
  to: string;
  subject: string;
  bodyHtml: string;
}) {
  const wrappedHtml = campaignWrapperTemplate({ bodyHtml: opts.bodyHtml });
  return resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: opts.subject,
    html: wrappedHtml,
  });
}

// ─────────────────────────────────────────────────────────────
// 5) Funnel-Mails (Phase 6)
// ─────────────────────────────────────────────────────────────

export async function sendFunnelMail(opts: {
  to: string;
  subject: string;
  bodyHtml: string;
}) {
  const wrappedHtml = campaignWrapperTemplate({ bodyHtml: opts.bodyHtml });
  return resend.emails.send({
    from: FROM,
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

function doiTemplate({ confirmUrl, greeting }: { confirmUrl: string; greeting: string }) {
  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8"><style>${shellStyles()}</style></head>
<body>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:48px 16px;">
    <tr><td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #D8D2C7;">
        <tr><td style="padding:40px;">
          <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#8A857E;margin:0 0 24px;">${STUDIO_NAME}</p>
          <p style="font-size:16px;line-height:1.6;margin:0 0 12px;">${greeting}</p>
          <h1 style="font-size:28px;line-height:1.2;margin:0 0 16px;font-weight:400;">Bestätige deine E-Mail-Adresse</h1>
          <p style="font-size:16px;line-height:1.6;margin:0 0 32px;">Klick einmal kurz auf den Button, damit wir wissen, dass die Adresse wirklich dir gehört. Erst danach senden wir dir unsere Tarife zu.</p>
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#1A1815;">
            <a href="${confirmUrl}" style="display:inline-block;padding:14px 28px;font-family:'Courier New',monospace;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#C8FF00;text-decoration:none;">E-Mail bestätigen →</a>
          </td></tr></table>
          <p style="font-size:13px;line-height:1.6;color:#8A857E;margin:32px 0 0;">Falls der Button nicht funktioniert: ${confirmUrl}</p>
          <hr style="border:none;border-top:1px solid #D8D2C7;margin:32px 0;">
          <p style="font-size:12px;line-height:1.6;color:#8A857E;margin:0;">Wenn du dich nicht eingetragen hast, ignoriere diese Mail einfach.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function pricingTemplate({
  plans,
  signupUrl,
  greeting,
}: {
  plans: Array<{ name: string; description: string | null; priceCents: number; highlights: string[] }>;
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
            <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#8A857E;margin:0 0 4px;">Tarif</p>
            <h3 style="font-size:22px;margin:0 0 8px;font-weight:400;">${p.name}</h3>
            ${p.description ? `<p style="font-size:14px;line-height:1.5;color:#3A3530;margin:0 0 12px;">${p.description}</p>` : ""}
            <ul style="font-size:14px;line-height:1.6;color:#3A3530;margin:0;padding-left:18px;">
              ${p.highlights.map((h) => `<li>${h}</li>`).join("")}
            </ul>
          </td>
          <td style="vertical-align:top;text-align:right;white-space:nowrap;padding-left:16px;">
            <p style="font-size:28px;font-weight:400;margin:0;">${formatPrice(p.priceCents)}</p>
            <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.05em;color:#8A857E;margin:4px 0 0;">/ Monat</p>
          </td>
        </tr>
      </table>
    </td></tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8"><style>${shellStyles()}</style></head><body>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:48px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #D8D2C7;">
        <tr><td style="padding:40px 40px 24px;">
          <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#8A857E;margin:0 0 24px;">${STUDIO_NAME}</p>
          <p style="font-size:16px;line-height:1.6;margin:0 0 12px;">${greeting}</p>
          <h1 style="font-size:34px;line-height:1.1;margin:0 0 16px;font-weight:400;letter-spacing:-0.02em;">schön, dass du da bist.</h1>
          <p style="font-size:16px;line-height:1.6;margin:0;">Hier sind unsere aktuellen Tarife. Wenn dir einer zusagt, klick unten auf <em>Hier anmelden</em>.</p>
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
  plans: Array<{ name: string; priceCents: number; highlights: string[] }>;
  signupUrl: string;
  greeting: string;
}) {
  const planText = plans
    .map((p) => `${p.name} – ${formatPrice(p.priceCents)}/Monat\n  ${p.highlights.join("\n  ")}`)
    .join("\n\n");
  return `${greeting}\n\nschön, dass du da bist.\n\nUnsere aktuellen Tarife:\n\n${planText}\n\nHier anmelden: ${signupUrl}\n\n— ${STUDIO_NAME}`;
}

function signupConfirmTemplate(opts: { firstName: string; planName: string; priceCents: number }) {
  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8"><style>${shellStyles()}</style></head><body>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:48px 16px;">
    <tr><td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #D8D2C7;">
        <tr><td style="padding:40px;">
          <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#8A857E;margin:0 0 24px;">${STUDIO_NAME}</p>
          <h1 style="font-size:28px;line-height:1.2;margin:0 0 16px;font-weight:400;">Hallo ${opts.firstName}, willkommen.</h1>
          <p style="font-size:16px;line-height:1.6;margin:0 0 24px;">Deine Anmeldung für den Tarif <strong>${opts.planName}</strong> (${formatPrice(opts.priceCents)} / Monat) ist bei uns eingegangen.</p>
          <p style="font-size:16px;line-height:1.6;margin:0 0 24px;">Wir melden uns in den nächsten Werktagen bei dir mit dem Vertrag und allen weiteren Schritten.</p>
          <p style="font-size:14px;line-height:1.6;color:#3A3530;margin:0;">Bis dahin: schön, dass du dabei bist.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function campaignWrapperTemplate({ bodyHtml }: { bodyHtml: string }) {
  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8"><style>${shellStyles()}</style></head><body>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:48px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #D8D2C7;">
        <tr><td style="padding:40px;font-size:16px;line-height:1.6;">
          <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#8A857E;margin:0 0 24px;">${STUDIO_NAME}</p>
          ${bodyHtml}
        </td></tr>
      </table>
      <p style="font-family:'Courier New',monospace;font-size:11px;color:#8A857E;margin:16px 0 0;">${STUDIO_NAME}</p>
    </td></tr>
  </table>
</body></html>`;
}

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}
