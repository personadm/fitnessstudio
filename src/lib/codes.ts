import { randomInt } from "crypto";

// Aktivierungs-Codes für Studios. Format: STUDIO-XXXX-XXXX
// Alphabet ohne verwechselbare Zeichen (kein 0/O, 1/I/L).
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const GROUP_LEN = 4;
const GROUPS = 2;

/** Erzeugt einen gut lesbaren Aktivierungs-Code, z. B. "STUDIO-7F3K-9QZP". */
export function generateActivationCode(): string {
  const groups: string[] = [];
  for (let g = 0; g < GROUPS; g++) {
    let group = "";
    for (let i = 0; i < GROUP_LEN; i++) {
      group += ALPHABET[randomInt(ALPHABET.length)];
    }
    groups.push(group);
  }
  return `STUDIO-${groups.join("-")}`;
}
