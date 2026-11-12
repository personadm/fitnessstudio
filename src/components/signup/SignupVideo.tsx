"use client";

import { useEffect, useRef, useState } from "react";

const VIDEO_SRC = "/videos/erik-anmelden.mp4";
const POSTER_BASE = "/images/erik-anmelden";
const POSTER_WIDTHS = [540, 720, 941] as const;
const POSTER_WIDTH = 941;
const POSTER_HEIGHT = 1672;
const POSTER_ALT =
  "Video: Erst schauen, dann anmelden. Erik zeigt, was in den sechs Wochen wirklich drinsteckt";
// Handy: volle Inhaltsbreite (16 px Rand je Seite). Rechner: Höhe ≈ 75vh,
// Breite folgt dem 9:16-Format (75vh × 9/16 ≈ 42vh).
const POSTER_SIZES = "(min-width: 768px) 42vh, calc(100vw - 32px)";
const PETROL = "#0F6E56";

const srcSet = (ext: "webp" | "jpg") =>
  POSTER_WIDTHS.map((w) => `${POSTER_BASE}-${w}.${ext} ${w}w`).join(", ");

/**
 * Verkaufsvideo von Erik oben auf /anmelden.
 *
 *  - Kein Autoplay. Vor dem Start liegt Eriks eigenes Vorschaubild (WebP mit
 *    JPG-Fallback) unverzerrt im 9:16-Rahmen; der Abspiel-Knopf sitzt im
 *    oberen Bildbereich über dem Kopf — Gesicht und Bildtext bleiben frei.
 *  - Start per Tipp aufs Bild ODER über den Knopf „Video starten" darunter.
 *  - Wiedergabe im Seitenfluss (playsInline) mit sichtbaren Bedienelementen.
 *  - preload="metadata": Es werden nur die Kopfdaten geladen; dank faststart-
 *    MP4 (moov vorne) beginnt die Wiedergabe nach wenigen KB.
 *  - Das Vorschaubild bleibt liegen, bis das Video wirklich läuft — kein
 *    schwarzes Bild beim Starten über langsames Mobilnetz.
 */
export function SignupVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [posterSrc, setPosterSrc] = useState<string | undefined>(undefined);
  const [isRequested, setIsRequested] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  // Poster = exakt die bereits geladene Bilddatei (gleiche URL → aus dem
  // Cache, kein zweiter Download).
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const sync = () => setPosterSrc(img.currentSrc || img.src);
    if (img.complete) sync();
    img.addEventListener("load", sync);
    return () => img.removeEventListener("load", sync);
  }, []);

  function start() {
    const video = videoRef.current;
    if (!video) return;
    setIsRequested(true);
    // play() muss synchron in der Tipp-Geste laufen (iOS-Vorgabe).
    video.play().catch(() => {
      // Abgelehnt (z. B. Energiesparmodus) → native Bedienelemente zeigen,
      // dann kann direkt im Player gestartet werden.
      setIsRequested(false);
      setHasFailed(true);
    });
  }

  function toggle() {
    const video = videoRef.current;
    if (!video) return;
    if (!hasStarted) {
      start();
    } else if (video.paused) {
      void video.play().catch(() => setHasFailed(true));
    } else {
      video.pause();
    }
  }

  const isOverlayVisible = !hasStarted && !hasFailed;
  const buttonLabel = !hasStarted ? "Video starten" : isPlaying ? "Video pausieren" : "Weiter abspielen";

  return (
    <figure className="mx-auto w-full md:w-[min(100%,calc(75vh*9/16))]">
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl bg-[#1F2421] shadow-[0_18px_40px_-18px_rgba(15,60,48,0.55)]">
        <video
          ref={videoRef}
          src={VIDEO_SRC}
          poster={posterSrc}
          preload="metadata"
          playsInline
          controls={!isOverlayVisible}
          width={540}
          height={960}
          onPlaying={() => {
            setHasStarted(true);
            setIsPlaying(true);
            setIsRequested(false);
          }}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onError={() => {
            setIsRequested(false);
            setHasFailed(true);
          }}
          className="absolute inset-0 h-full w-full object-contain"
        />

        {isOverlayVisible && (
          // Tipp aufs ganze Bild startet das Video. Für Tastatur/Screenreader
          // ist der Knopf „Video starten" darunter da (kein doppelter Tab-Stopp).
          <div onClick={start} className="group absolute inset-0 cursor-pointer">
            <picture>
              <source type="image/webp" srcSet={srcSet("webp")} sizes={POSTER_SIZES} />
              <img
                ref={imgRef}
                src={`${POSTER_BASE}-720.jpg`}
                srcSet={srcSet("jpg")}
                sizes={POSTER_SIZES}
                width={POSTER_WIDTH}
                height={POSTER_HEIGHT}
                alt={POSTER_ALT}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="absolute inset-0 h-full w-full object-contain"
              />
            </picture>
            {/* Abspiel-Knopf oben über Eriks Kopf (Kopf beginnt bei ~16 % der
                Bildhöhe) — verdeckt weder Gesicht noch Text. */}
            <span
              aria-hidden
              className="absolute left-1/2 top-[8%] flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 shadow-xl ring-4 ring-white/30 transition-transform duration-200 group-hover:scale-105 group-active:scale-95 md:h-16 md:w-16"
            >
              {isRequested ? (
                <span className="h-6 w-6 animate-spin rounded-full border-[3px] border-[#0F6E56] border-t-transparent motion-reduce:animate-none" />
              ) : (
                <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7 md:h-8 md:w-8" fill={PETROL}>
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={toggle}
        aria-busy={isRequested || undefined}
        className="mt-3 flex w-full items-center justify-center gap-2.5 rounded-lg bg-[#0F6E56] px-5 py-3.5 text-base font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-[#0B5A46] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6E56] active:scale-[0.99]"
      >
        {isPlaying ? (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
            <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
        {isRequested ? "Video lädt…" : buttonLabel}
      </button>
    </figure>
  );
}
