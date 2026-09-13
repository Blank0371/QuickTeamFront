/**
 * Die gesammelten Rollen als versteckte Felder.
 *
 * Steht in einer eigenen Datei, weil beide schreibenden Formulare des
 * Schritts sie mitschicken müssen — das Einladen und das Weitergehen —
 * und beide von `TeamSchritt` gerendert werden. Läge sie dort, importierten
 * sich die Dateien gegenseitig.
 *
 * Ein Feldname, an drei Stellen getippt, wäre ausserdem eine Gelegenheit
 * für einen Tippfehler, den nichts meldet: `formData.getAll()` liefert
 * dann einfach eine leere Liste, und die Rollen verschwänden lautlos.
 */
export function EntwurfsFelder({ entwuerfe }: { entwuerfe: readonly string[] }) {
  return (
    <>
      {entwuerfe.map((name) => (
        <input key={name} type="hidden" name="entwurf_rollen" value={name} />
      ))}
    </>
  );
}
