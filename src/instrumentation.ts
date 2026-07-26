/**
 * Läuft einmalig beim Serverstart (Next.js Instrumentation Hook).
 *
 * Loggt das effektive V8-Heap-Limit — so lässt sich in den Render-Logs
 * zweifelsfrei ablesen, ob `--max-old-space-size` (gesetzt im start-Script,
 * package.json) tatsächlich greift. Der Default liegt bei ~256 MB; bei
 * aktivem Flag muss hier ~1536 MB stehen (2-GB-standard-Plan). War der Wert
 * bei einem OOM weiterhin ~256, wurde das Flag nicht übernommen.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const v8 = await import(/* webpackIgnore: true */ "node:v8");
  const limitMb = Math.round(v8.getHeapStatistics().heap_size_limit / 1024 / 1024);
  console.log(`[boot] V8 heap limit: ${limitMb} MB (NODE_OPTIONS=${process.env.NODE_OPTIONS ?? "—"})`);
}
