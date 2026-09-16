/** Nur syntaktisch beschädigte Session-Cookies entfernen, keine Auth-Prüfung ersetzen. */
export function beschaedigteSessionCookies(
  cookies: readonly { name: string; value: string }[],
  supabaseUrl: string,
): string[] {
  const schluessel = `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;
  const teile = cookies.filter(({ name }) => name === schluessel ||
    (name.startsWith(`${schluessel}.`) && /^\d+$/.test(name.slice(schluessel.length + 1))));
  if (!teile.length) return [];
  // Supabase bevorzugt den ungeteilten Wert, sonst fortlaufende Chunks ab .0.
  let wert = teile.find(({ name }) => name === schluessel)?.value;
  if (wert === undefined) {
    wert = "";
    for (let i = 0; i < teile.length; i++) {
      const teil = teile.find(({ name }) => name === `${schluessel}.${i}`);
      if (!teil) return teile.map(({ name }) => name);
      wert += teil.value;
    }
  }
  try {
    const text = wert.startsWith("base64-")
      ? new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(
          atob(wert.slice(7).replace(/-/g, "+").replace(/_/g, "/")),
          (zeichen) => zeichen.charCodeAt(0),
        ))
      : wert;
    JSON.parse(text);
    return [];
  } catch {
    return teile.map(({ name }) => name);
  }
}
