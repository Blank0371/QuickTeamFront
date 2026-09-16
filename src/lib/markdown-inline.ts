export type InlineTeil = { typ: "text" | "fett" | "kursiv" | "code"; text: string }
  | { typ: "link"; text: string; href: string };

/** Nur explizit erlaubte Protokolle und lokale Pfade werden klickbar. */
export function sicheresLinkZiel(ziel: string): boolean {
  if (/[\s\\\u0000-\u001f\u007f]/u.test(ziel)) return false;
  return /^(?:https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i.test(ziel);
}

export function inlineTeile(text: string): InlineTeil[] {
  const muster = /(\[[^\]\n]+\]\([^\s)]+\)|\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  return text.split(muster).filter(Boolean).map((teil): InlineTeil => {
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(teil);
    if (link && sicheresLinkZiel(link[2]!)) return { typ: "link", text: link[1]!, href: link[2]! };
    if (teil.startsWith("**") && teil.endsWith("**")) return { typ: "fett", text: teil.slice(2, -2) };
    if (teil.startsWith("`") && teil.endsWith("`")) return { typ: "code", text: teil.slice(1, -1) };
    if (teil.startsWith("*") && teil.endsWith("*")) return { typ: "kursiv", text: teil.slice(1, -1) };
    return { typ: "text", text: teil };
  });
}
