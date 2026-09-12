"use client";

import { useRef, useState } from "react";

type Props = {
  className?: string;
};

const VIDEO_SRC = "/videos/erik-lp.mp4";
const POSTER_SRC = "/images/erik-poster.jpg";
const PETROL = "#0F6E56";

/**
 * Vertrauens-Video (Erik) für die Landing-Page-Hero.
 *  - Kein Autoplay, kein Ton-Autostart. Startbild (Poster) mit Play-Button.
 *  - preload="none" → das Video wird erst beim Tippen geladen; die Startseite
 *    bleibt leichtgewichtig (Ladezeit ist conversion-kritisch).
 *  - Tippen: Wiedergabe im größeren Format — iOS nutzt den nativen
 *    Fullscreen-Player, sonst requestFullscreen; nach dem Schließen kehrt der
 *    Besucher an gleiche Position der Seite zurück.
 *
 * Bewusst KEIN Bezug zu LeadForm/Conversion-Tracking — reine Präsentation.
 */
export function HeroVideo({ className }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isStarted, setIsStarted] = useState(false);

  async function handlePlay() {
    const video = videoRef.current;
    if (!video) return;

    setIsStarted(true);

    // iOS-Safari zeigt Videos nur über webkitEnterFullscreen im nativen Player.
    const iosVideo = video as HTMLVideoElement & {
      webkitEnterFullscreen?: () => void;
    };

    try {
      await video.play();
    } catch {
      // play() ohne gültige Geste abgelehnt → Controls bleiben sichtbar,
      // der Besucher kann manuell starten.
    }

    try {
      if (typeof iosVideo.webkitEnterFullscreen === "function") {
        iosVideo.webkitEnterFullscreen();
      } else if (typeof video.requestFullscreen === "function") {
        await video.requestFullscreen();
      }
    } catch {
      // Fullscreen abgelehnt → Video läuft inline mit Controls weiter.
    }
  }

  return (
    <div className={`relative mx-auto w-fit lg:mx-0 ${className ?? ""}`}>
      <video
        ref={videoRef}
        src={VIDEO_SRC}
        poster={POSTER_SRC}
        controls={isStarted}
        preload="none"
        playsInline
        width={608}
        height={1080}
        className="block h-auto max-h-[46vh] w-auto rounded-2xl bg-black shadow-lg lg:max-h-[440px]"
      />

      {!isStarted && (
        <button
          type="button"
          onClick={handlePlay}
          aria-label="Video abspielen: Fitness, Gesundheit, Wohlbefinden – Erik erklärt dir alles"
          className="group absolute inset-0 flex items-center justify-center rounded-2xl focus:outline-none focus-visible:ring-4 focus-visible:ring-white/70"
        >
          <span className="absolute inset-0 rounded-2xl bg-black/5 transition-colors group-hover:bg-black/15" />
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/95 shadow-xl transition-transform duration-200 group-hover:scale-105 group-active:scale-95 md:h-20 md:w-20">
            <svg
              viewBox="0 0 24 24"
              className="ml-1 h-7 w-7 md:h-9 md:w-9"
              fill={PETROL}
              aria-hidden
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}
