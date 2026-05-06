"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";

// Globaler XLSX-Type aus dem CDN-Script
declare global {
  interface Window {
    XLSX?: {
      read: (data: ArrayBuffer | string, opts?: object) => XLSXWorkbook;
      utils: {
        sheet_to_json: <T>(sheet: object, opts?: object) => T[];
      };
    };
  }
}

interface XLSXWorkbook {
  SheetNames: string[];
  Sheets: Record<string, object>;
}

type Status = "INTERESSENT" | "NEUKUNDE" | "KUNDE" | "EHEMALIGER";
type Strategy = "skip" | "update_status" | "update_all";

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "KUNDE", label: "Kunde (aktives Mitglied)" },
  { value: "EHEMALIGER", label: "Ehemaliger" },
  { value: "NEUKUNDE", label: "Neukunde" },
  { value: "INTERESSENT", label: "Interessent" },
];

const STRATEGY_OPTIONS: { value: Strategy; label: string; hint: string }[] = [
  {
    value: "skip",
    label: "Überspringen",
    hint: "Existierende Kontakte bleiben unverändert. Nur neue werden angelegt.",
  },
  {
    value: "update_status",
    label: "Nur Status updaten",
    hint: "Bei existierenden Kontakten wird der Status auf den Ziel-Status gesetzt. Name und andere Felder bleiben.",
  },
  {
    value: "update_all",
    label: "Alles updaten",
    hint: "Status, Vorname, Nachname und Geschlecht werden überschrieben (sofern in der Datei vorhanden).",
  },
];

// Header-Erkennung — pragmatisch, deutsch und englisch
const EMAIL_KEYWORDS = ["email", "e-mail", "mail", "e_mail"];
const FIRSTNAME_KEYWORDS = ["vorname", "firstname", "first_name", "first name", "given", "given name"];
const LASTNAME_KEYWORDS = [
  "nachname",
  "lastname",
  "last_name",
  "last name",
  "surname",
  "familyname",
  "family name",
  "familienname",
];
const GENDER_KEYWORDS = ["geschlecht", "gender", "sex", "anrede"];

interface ParsedFile {
  headers: string[];
  rows: Record<string, unknown>[];
  fileName: string;
}

interface ColumnMapping {
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  gender: string | null;
}

function autoDetectColumn(headers: string[], keywords: string[]): string | null {
  for (const h of headers) {
    const norm = h.toLowerCase().trim();
    if (keywords.some((kw) => norm === kw || norm.includes(kw))) return h;
  }
  return null;
}

export function ImportForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({
    email: null,
    firstName: null,
    lastName: null,
    gender: null,
  });
  const [targetStatus, setTargetStatus] = useState<Status>("KUNDE");
  const [strategy, setStrategy] = useState<Strategy>("skip");
  const [parseError, setParseError] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<null | {
    total: number;
    created: number;
    updated: number;
    skipped: number;
    errors: number;
    errorDetails: { row: number; email: string; reason: string }[];
  }>(null);

  // Wenn das XLSX-Script schon im Cache ist
  useEffect(() => {
    if (typeof window !== "undefined" && window.XLSX) {
      setScriptLoaded(true);
    }
  }, []);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError("");
    setResult(null);

    if (!window.XLSX) {
      setParseError("Excel-Bibliothek lädt noch — moment, dann nochmal.");
      return;
    }

    try {
      const buf = await file.arrayBuffer();
      const wb = window.XLSX.read(buf, { type: "array" });
      const firstSheetName = wb.SheetNames[0];
      if (!firstSheetName) {
        setParseError("Keine Tabelle in der Datei gefunden.");
        return;
      }
      const sheet = wb.Sheets[firstSheetName];
      // Mit defval: "" bekommen wir leere Strings statt undefined,
      // mit raw: false werden Datums/Zahlen als Strings ausgegeben (gut)
      const json = window.XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
        raw: false,
      });

      if (json.length === 0) {
        setParseError("Die Datei hat eine Kopfzeile, aber keine Einträge.");
        return;
      }

      const headers = Object.keys(json[0]);

      // Auto-Detect Spalten
      const newMapping: ColumnMapping = {
        email: autoDetectColumn(headers, EMAIL_KEYWORDS),
        firstName: autoDetectColumn(headers, FIRSTNAME_KEYWORDS),
        lastName: autoDetectColumn(headers, LASTNAME_KEYWORDS),
        gender: autoDetectColumn(headers, GENDER_KEYWORDS),
      };

      setParsed({ headers, rows: json, fileName: file.name });
      setMapping(newMapping);
    } catch (err) {
      console.error(err);
      setParseError(
        "Datei konnte nicht gelesen werden. Stell sicher, dass es eine .xlsx, .xls oder .csv ist.",
      );
    }
  }

  function reset() {
    setParsed(null);
    setMapping({ email: null, firstName: null, lastName: null, gender: null });
    setResult(null);
    setParseError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function startImport() {
    if (!parsed || !mapping.email) return;
    setImporting(true);
    setResult(null);

    const rows = parsed.rows.map((r) => ({
      email: String(r[mapping.email!] ?? ""),
      firstName: mapping.firstName ? String(r[mapping.firstName] ?? "") : undefined,
      lastName: mapping.lastName ? String(r[mapping.lastName] ?? "") : undefined,
      gender: mapping.gender ? String(r[mapping.gender] ?? "") : undefined,
    }));

    try {
      const res = await fetch("/api/admin/contacts/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rows,
          targetStatus,
          duplicateStrategy: strategy,
        }),
      });
      const data = await res.json();

      if (!data.ok) {
        setParseError(data.message ?? "Import fehlgeschlagen.");
        setImporting(false);
        return;
      }

      setResult({
        total: data.summary.total,
        created: data.summary.created,
        updated: data.summary.updated,
        skipped: data.summary.skipped,
        errors: data.summary.errors,
        errorDetails: data.errors ?? [],
      });
      setImporting(false);
      router.refresh();
    } catch {
      setParseError("Verbindungsfehler.");
      setImporting(false);
    }
  }

  // Vorschau auf max. 8 Zeilen
  const previewRows = parsed?.rows.slice(0, 8) ?? [];
  const previewableColumns = parsed?.headers.slice(0, 6) ?? [];

  return (
    <>
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />

      <div className="space-y-8 max-w-4xl">
        {/* Schritt 1: Datei wählen */}
        {!parsed && (
          <section>
            <p className="label mb-3">Schritt 1 — Datei hochladen</p>
            <label className="block cursor-pointer border-2 border-dashed border-ink/30 bg-cream/50 p-12 text-center hover:border-ink/60 hover:bg-cream transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                disabled={!scriptLoaded}
                className="sr-only"
              />
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-ink">
                {scriptLoaded ? "Datei auswählen" : "Lädt Bibliothek…"}
              </p>
              <p className="mt-2 text-sm text-muted">
                .xlsx, .xls oder .csv — wird im Browser verarbeitet, nichts wird hochgeladen außer
                den Endkontakten beim eigentlichen Import.
              </p>
            </label>
            {parseError && (
              <p role="alert" className="mt-3 text-sm text-red-700">
                {parseError}
              </p>
            )}
          </section>
        )}

        {/* Schritt 2: Vorschau + Spaltenzuordnung */}
        {parsed && !result && (
          <>
            <section>
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="label">Schritt 2 — Vorschau ({parsed.rows.length} Zeilen)</p>
                <button
                  type="button"
                  onClick={reset}
                  className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted hover:text-ink"
                >
                  Andere Datei
                </button>
              </div>
              <p className="mb-4 text-sm text-muted">
                Datei: <span className="font-mono">{parsed.fileName}</span>
              </p>
              <div className="overflow-auto border border-ink/15">
                <table className="w-full text-xs">
                  <thead className="border-b border-ink/15 bg-ink/5">
                    <tr>
                      {previewableColumns.map((h) => (
                        <th
                          key={h}
                          className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.1em] text-muted whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                      {parsed.headers.length > 6 && (
                        <th className="px-3 py-2 text-left font-mono text-[10px] text-muted">
                          +{parsed.headers.length - 6} weitere
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/10">
                    {previewRows.map((row, i) => (
                      <tr key={i}>
                        {previewableColumns.map((h) => (
                          <td key={h} className="px-3 py-2 truncate max-w-[200px]">
                            {String(row[h] ?? "")}
                          </td>
                        ))}
                        {parsed.headers.length > 6 && <td className="px-3 py-2">…</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsed.rows.length > 8 && (
                  <p className="border-t border-ink/15 bg-ink/5 px-3 py-2 font-mono text-[10px] text-muted">
                    +{parsed.rows.length - 8} weitere Zeilen
                  </p>
                )}
              </div>
            </section>

            {/* Spaltenzuordnung */}
            <section>
              <p className="label mb-3">Schritt 3 — Spalten zuordnen</p>
              <p className="mb-4 text-sm text-muted">
                Was wir automatisch erkannt haben — gerne korrigieren falls falsch.
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <ColumnSelector
                  label="E-Mail (Pflicht)"
                  headers={parsed.headers}
                  value={mapping.email}
                  onChange={(v) => setMapping({ ...mapping, email: v })}
                  required
                />
                <ColumnSelector
                  label="Vorname"
                  headers={parsed.headers}
                  value={mapping.firstName}
                  onChange={(v) => setMapping({ ...mapping, firstName: v })}
                />
                <ColumnSelector
                  label="Nachname"
                  headers={parsed.headers}
                  value={mapping.lastName}
                  onChange={(v) => setMapping({ ...mapping, lastName: v })}
                />
                <ColumnSelector
                  label="Geschlecht"
                  headers={parsed.headers}
                  value={mapping.gender}
                  onChange={(v) => setMapping({ ...mapping, gender: v })}
                />
              </div>
              {!mapping.email && (
                <p className="mt-3 text-xs text-red-700">
                  Eine E-Mail-Spalte muss zugeordnet sein.
                </p>
              )}
            </section>

            {/* Ziel-Status + Strategie */}
            <section>
              <p className="label mb-3">Schritt 4 — Status für alle Zeilen</p>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_OPTIONS.map((opt) => {
                  const sel = targetStatus === opt.value;
                  return (
                    <label
                      key={opt.value}
                      className={`cursor-pointer border p-3 transition-colors ${
                        sel ? "border-ink bg-ink text-cream" : "border-ink/20 hover:border-ink/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="targetStatus"
                        value={opt.value}
                        checked={sel}
                        onChange={() => setTargetStatus(opt.value)}
                        className="sr-only"
                      />
                      <p className="font-mono text-xs uppercase tracking-[0.1em]">
                        {sel ? "✓ " : ""}
                        {opt.label}
                      </p>
                    </label>
                  );
                })}
              </div>
            </section>

            <section>
              <p className="label mb-3">Schritt 5 — Was, wenn ein Kontakt schon existiert?</p>
              <div className="space-y-2">
                {STRATEGY_OPTIONS.map((opt) => {
                  const sel = strategy === opt.value;
                  return (
                    <label
                      key={opt.value}
                      className={`block cursor-pointer border p-4 transition-colors ${
                        sel ? "border-ink bg-ink/5" : "border-ink/20 hover:border-ink/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="strategy"
                        value={opt.value}
                        checked={sel}
                        onChange={() => setStrategy(opt.value)}
                        className="sr-only"
                      />
                      <p className="font-mono text-xs uppercase tracking-[0.1em]">
                        {sel ? "✓ " : "○ "}
                        {opt.label}
                      </p>
                      <p className="mt-1 text-xs text-muted">{opt.hint}</p>
                    </label>
                  );
                })}
              </div>
            </section>

            {/* Action */}
            <section className="border-t border-ink/15 pt-6">
              <button
                type="button"
                onClick={startImport}
                disabled={!mapping.email || importing}
                className="bg-ink px-6 py-3 font-mono text-xs uppercase tracking-[0.12em] text-acid disabled:opacity-50 hover:bg-ink-soft"
              >
                {importing
                  ? "Importiert…"
                  : `Jetzt ${parsed.rows.length} Zeilen importieren →`}
              </button>
              {parseError && (
                <p role="alert" className="mt-3 text-sm text-red-700">
                  {parseError}
                </p>
              )}
            </section>
          </>
        )}

        {/* Ergebnis */}
        {result && (
          <section>
            <p className="label mb-3">Ergebnis</p>
            <div className="border border-ink/15 p-6">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <ResultStat label="Verarbeitet" value={result.total} />
                <ResultStat label="Neu angelegt" value={result.created} highlight />
                <ResultStat label="Aktualisiert" value={result.updated} />
                <ResultStat label="Übersprungen" value={result.skipped} />
              </div>

              {result.errors > 0 && (
                <div className="mt-6 border-t border-ink/10 pt-4">
                  <p className="font-mono text-xs uppercase tracking-[0.1em] text-red-700">
                    {result.errors} Fehler
                  </p>
                  <ul className="mt-2 space-y-1 max-h-40 overflow-auto">
                    {result.errorDetails.map((e, i) => (
                      <li key={i} className="font-mono text-[11px] text-muted">
                        Zeile {e.row} ({e.email}): {e.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={reset}
                className="border border-ink/20 px-5 py-2.5 font-mono text-xs uppercase tracking-[0.12em] hover:bg-ink/5"
              >
                Weitere Datei importieren
              </button>
              <a
                href="/admin/contacts"
                className="bg-ink px-5 py-2.5 font-mono text-xs uppercase tracking-[0.12em] text-acid hover:bg-ink-soft"
              >
                Zu den Kontakten →
              </a>
            </div>
          </section>
        )}
      </div>
    </>
  );
}

function ColumnSelector({
  label,
  headers,
  value,
  onChange,
  required,
}: {
  label: string;
  headers: string[];
  value: string | null;
  onChange: (v: string | null) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="label mb-2 block">{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className={`w-full border bg-transparent p-2 text-sm outline-none ${
          required && !value ? "border-red-400" : "border-ink/20 focus:border-ink"
        }`}
      >
        <option value="">— nicht zuordnen —</option>
        {headers.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
    </label>
  );
}

function ResultStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">{label}</p>
      <p className={`mt-1 text-display text-3xl ${highlight ? "text-acid_dark" : ""}`}>{value}</p>
    </div>
  );
}
