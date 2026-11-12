"use client";

import { SIGNUP_GOALS, SIGNUP_NOTE_MAX, type SignupGoalId } from "@/lib/signup-goals";

const PETROL = "#0F6E56";

type Props = {
  goals: readonly SignupGoalId[];
  onToggleGoal: (id: SignupGoalId) => void;
  note: string;
  onNoteChange: (value: string) => void;
  disabled?: boolean;
};

/**
 * Schritt 1 der Anmeldung: „Was ist dein Ziel?" — löst Eriks Aufforderung am
 * Videoende ein. Mehrfachauswahl, alles freiwillig, kein eigener Absenden-
 * Button (wird mit dem Anmeldeformular zusammen abgeschickt).
 *
 * DATENSCHUTZ: Die Felder haben bewusst KEIN name-Attribut — die Werte gehen
 * nur per JSON an /api/signup und tauchen so auch nicht in automatisch
 * erfassten Formular-Merkmalen von Tracking-Skripten auf.
 */
export function GoalStep({ goals, onToggleGoal, note, onNoteChange, disabled }: Props) {
  return (
    <div role="group" aria-labelledby="goal-heading" aria-describedby="goal-hint">
      <div className="mb-1.5 flex flex-wrap items-center gap-3">
        <span
          className="inline-block rounded-full px-3 py-1 text-xs font-semibold"
          style={{ backgroundColor: "rgba(15,110,86,0.1)", color: PETROL }}
        >
          Schritt 1
        </span>
        <h2 id="goal-heading" className="text-xl font-bold text-[#2C2C2A] md:text-2xl">
          Was ist dein Ziel?
        </h2>
      </div>
      <p id="goal-hint" className="mb-4 text-sm text-[#5F5E5A]">
        Tipp an, was für dich zählt – gern auch mehreres.
      </p>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {SIGNUP_GOALS.map((goal) => (
          <GoalTile
            key={goal.id}
            label={goal.label}
            isSelected={goals.includes(goal.id)}
            onToggle={() => onToggleGoal(goal.id)}
            disabled={disabled}
          />
        ))}
      </div>

      <label htmlFor="signup-note" className="mt-5 block text-sm font-medium text-[#2C2C2A]">
        Gibt es etwas, das wir vorher wissen sollten?
      </label>
      <textarea
        id="signup-note"
        rows={3}
        maxLength={SIGNUP_NOTE_MAX}
        value={note}
        onChange={(e) => onNoteChange(e.target.value)}
        disabled={disabled}
        autoComplete="off"
        aria-describedby="signup-note-hint"
        className="mt-1.5 w-full resize-y rounded-lg border border-[#D8D2C7] bg-white px-3 py-2.5 text-base outline-none transition-colors placeholder:text-[#A8A39A] focus:border-[#0F6E56] focus:ring-1 focus:ring-[#0F6E56] disabled:opacity-50"
      />
      <p id="signup-note-hint" className="mt-1 text-xs text-[#8A857E]">
        Freiwillig
      </p>
    </div>
  );
}

function GoalTile({
  label,
  isSelected,
  onToggle,
  disabled,
}: {
  label: string;
  isSelected: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex min-h-[56px] cursor-pointer select-none items-center gap-3 rounded-xl border-2 px-4 py-3 transition-[border-color,background-color,transform] duration-150 active:scale-[0.98] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#0F6E56] has-[:focus-visible]:ring-offset-2 ${
        isSelected
          ? "border-[#0F6E56] bg-[rgba(15,110,86,0.07)]"
          : "border-[#D8D2C7] bg-white hover:border-[rgba(15,110,86,0.5)]"
      } ${disabled ? "pointer-events-none opacity-50" : ""}`}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggle}
        disabled={disabled}
        className="sr-only"
      />
      <span
        aria-hidden
        className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
          isSelected ? "border-[#0F6E56] bg-[#0F6E56]" : "border-[#BDB6AA] bg-white"
        }`}
      >
        {isSelected && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12l5 5L20 7"
              stroke="#FFFFFF"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span className="text-base font-semibold leading-snug text-[#2C2C2A]">{label}</span>
    </label>
  );
}
