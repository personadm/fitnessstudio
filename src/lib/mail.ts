import { Resend } from "resend";
import { db } from "./db";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.MAIL_FROM ?? "onboarding@resend.dev";
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
// 2) Willkommens-/Angebots-Mail (nach DOI)
// ─────────────────────────────────────────────────────────────

export async function sendPricingMail(opts: {
  to: string;
  firstName?: string | null;
  refToken: string;
}) {
  const plans = await db.pricingPlan.findMany({
    where: { active: true, availableOnline: true },
    orderBy: { sortOrder: "asc" },
  });
  const signupUrl = `${STUDIO_URL}/anmelden?ref=${opts.refToken}`;
  const greeting = opts.firstName ? `Hallo ${opts.firstName},` : "Hallo,";
  return resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `Dein persönliches Sonderangebot — nur für dich`,
    html: pricingTemplate({ plans, signupUrl, greeting }),
    text: pricingTextFallback({ plans, signupUrl, greeting }),
  });
}

// ─────────────────────────────────────────────────────────────
// 3) Anmeldebestätigung
// ─────────────────────────────────────────────────────────────

export async function sendSignupConfirmation(opts: {
  to: string;
  firstName: string;
  planName: string;
  priceCents: number;
  billingInterval?: string | null;
}) {
  return resend.emails.send({
    from: FROM,
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
// 4) Kampagnen / Newsletter (vom Admin manuell ausgelöst)
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
// 5) Funnel-Mail (automatische Schritt-Mails aus Funnels)
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

function logoBlock() {
  return `<div style="text-align:center;padding:32px 40px 8px;">
    <img src="${LOGO_URL}" alt="${STUDIO_NAME}" style="max-width:280px;width:100%;height:auto;display:inline-block;" />
  </div>`;
}

function doiTemplate({ confirmUrl, greeting }: { confirmUrl: string; greeting: string }) {
  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8"><style>${shellStyles()}</style></head>
<body>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:48px 16px;">
    <tr><td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #D8D2C7;">
        <tr><td>${logoBlock()}</td></tr>
        <tr><td style="padding:8px 40px 40px;">
          <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#8A857E;margin:0 0 24px;">${STUDIO_NAME}</p>
          <p style="font-size:16px;line-height:1.6;margin:0 0 12px;">${greeting}</p>
          <h1 style="font-size:28px;line-height:1.2;margin:0 0 16px;font-weight:400;">Bestätige deine E-Mail-Adresse</h1>
          <p style="font-size:16px;line-height:1.6;margin:0 0 32px;">Klick einmal kurz auf den Button, damit wir wissen, dass die Adresse wirklich dir gehört. Erst danach senden wir dir unsere aktuellen Angebote zu.</p>
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
            <summary style="cursor:pointer;font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#8A857E;margin-bottom:8px;">AGB &amp; Vertragsbedingungen anzeigen</summary>
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
        <tr><td>${logoBlock()}</td></tr>
        <tr><td style="padding:8px 40px 40px;font-size:16px;line-height:1.6;">
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
