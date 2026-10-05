"use client";

import { useEffect, useState } from "react";

import { istLocale, type Locale } from "@/i18n/config";

import "./globals.css";

/**
 * Greift nur, wenn das Root-Layout selbst scheitert. Ersetzt dann das
 * gesamte Dokument — deshalb eigenes `<html>` und `<body>` und keine
 * Abhängigkeit zu Header, Footer oder den Font-Variablen.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum die Texte hier doppelt stehen statt aus dem Wörterbuch zu kommen
 * ─────────────────────────────────────────────────────────────────────
 *
 * Dieselbe Regel wie bei den Schriften, eine Ebene weiter: die Datei
 * springt genau dann ein, wenn das Root-Layout **nicht** gelaufen ist.
 * Damit gibt es weder `<SprachProvider>` — der steht in eben diesem
 * Layout — noch irgendetwas anderes, das der Server aufgelöst hätte.
 *
 * `getDictionary()` von hier aus aufzurufen ginge, zöge aber beide
 * vollständigen Wörterbücher ins Client-Bündel, für sechs Sätze. Das ist
 * derselbe Handel, den `sprach-provider.tsx` ausführlich ablehnt — und
 * ausgerechnet an der Stelle, die im Normalbetrieb nie rendert.
 *
 * Also stehen die paar Sätze hier, und zwar bewusst als Dopplung. Wer
 * `fehler.fehlerTitel` in `de.ts` ändert, muss hier nachziehen; das ist
 * der Preis dafür, dass diese Datei ohne alles auskommt.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum die Sprache aus einem Effekt kommt und nicht sofort
 * ─────────────────────────────────────────────────────────────────────
 *
 * Das Cookie ist ausdrücklich **nicht** `httpOnly` (siehe `sprache.ts`)
 * — ein Client-Skript darf es lesen. Gelesen wird es trotzdem erst nach
 * dem ersten Rendern: würde der erste Durchgang schon Englisch zeigen,
 * der servergerenderte HTML-Stand aber Deutsch, wäre das ein
 * Hydration-Mismatch auf einer Seite, die ohnehin schon einen schweren
 * Fehler meldet.
 *
 * Der Preis ist ein Bild lang Deutsch für englische Leser. Auf dieser
 * einen Seite ist das hinnehmbar; überall sonst löst der Server auf und
 * es gibt kein Aufblitzen.
 */

const TEXTE = {
  de: {
    kennzeichen: "Schwerer Fehler",
    titel: "Die Seite konnte nicht geladen werden",
    text: "Beim Aufbau der Seite ist etwas grundlegend schiefgelaufen. Lad die Seite neu — bleibt der Fehler bestehen, meld dich beim Support und gib die Kennung unten an.",
    kennung: "Kennung",
    erneut: "Erneut versuchen",
    start: "Zur Startseite",
  },
  en: {
    kennzeichen: "Fatal error",
    titel: "The page could not be loaded",
    text: "Something went fundamentally wrong while building this page. Reload it — if the error persists, get in touch with support and quote the reference below.",
    kennung: "Reference",
    erneut: "Try again",
    start: "Go to home page",
  },
  sq: {
    kennzeichen: "Gabim i rëndë",
    titel: "Faqja nuk u ngarkua dot",
    text: "Gjatë ndërtimit të faqes diçka shkoi rrënjësisht keq. Ringarko faqen — nëse gabimi vazhdon, kontakto mbështetjen dhe jep referencën më poshtë.",
    kennung: "Referenca",
    erneut: "Provo sërish",
    start: "Shko te kryefaqja",
  },
  es: {
    kennzeichen: "Error grave",
    titel: "No se pudo cargar la página",
    text: "Algo salió mal de raíz al montar esta página. Recárgala — si el error persiste, ponte en contacto con el soporte e indica la referencia de abajo.",
    kennung: "Referencia",
    erneut: "Reintentar",
    start: "Ir a la página de inicio",
  },
  fr: {
    kennzeichen: "Erreur grave",
    titel: "La page n'a pas pu être chargée",
    text: "Une erreur fondamentale s'est produite lors de la construction de cette page. Rechargez-la — si l'erreur persiste, contactez le support en indiquant la référence ci-dessous.",
    kennung: "Référence",
    erneut: "Réessayer",
    start: "Aller à l'accueil",
  },
  it: {
    kennzeichen: "Errore grave",
    titel: "Impossibile caricare la pagina",
    text: "Qualcosa è andato storto alla base durante la costruzione di questa pagina. Ricaricala — se l'errore persiste, contatta l'assistenza indicando il riferimento qui sotto.",
    kennung: "Riferimento",
    erneut: "Riprova",
    start: "Vai alla pagina iniziale",
  },
  pt: {
    kennzeichen: "Erro grave",
    titel: "Não foi possível carregar a página",
    text: "Algo correu mal de raiz ao construir esta página. Recarregue-a — se o erro persistir, contacte o suporte e indique a referência abaixo.",
    kennung: "Referência",
    erneut: "Tentar novamente",
    start: "Ir para a página inicial",
  },
  ru: {
    kennzeichen: "Критическая ошибка",
    titel: "Не удалось загрузить страницу",
    text: "При построении страницы что-то пошло совсем не так. Перезагрузите её — если ошибка повторяется, обратитесь в поддержку и укажите код ниже.",
    kennung: "Код",
    erneut: "Повторить",
    start: "На главную",
  },
  tr: {
    kennzeichen: "Ciddi hata",
    titel: "Sayfa yüklenemedi",
    text: "Sayfa oluşturulurken temelden bir şey ters gitti. Sayfayı yenile — hata devam ederse destekle iletişime geç ve aşağıdaki referansı belirt.",
    kennung: "Referans",
    erneut: "Tekrar dene",
    start: "Ana sayfaya git",
  },
  uk: {
    kennzeichen: "Критична помилка",
    titel: "Не вдалося завантажити сторінку",
    text: "Під час побудови сторінки щось пішло зовсім не так. Перезавантажте її — якщо помилка повторюється, зверніться до підтримки та вкажіть код нижче.",
    kennung: "Код",
    erneut: "Спробувати ще раз",
    start: "На головну",
  },
} satisfies Record<Locale, Record<string, string>>;

type Sprache = keyof typeof TEXTE;

function spracheAusCookie(): Sprache {
  const treffer = /(?:^|;\s*)qt_sprache=([a-z]{2})(?:;|$)/u.exec(document.cookie);
  const wert = treffer?.[1];
  return wert && istLocale(wert) ? wert : "de";
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [sprache, setSprache] = useState<Sprache>("de");
  const t = TEXTE[sprache];

  useEffect(() => {
    setSprache(spracheAusCookie());
  }, []);

  return (
    <html lang={sprache}>
      <body className="bg-bg text-text antialiased">
        <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col justify-center px-5 py-20 sm:px-8">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-stop">
            {t.kennzeichen}
          </p>

          <h1 className="mt-3 text-3xl font-bold leading-[1.1] tracking-tight sm:text-4xl">
            {t.titel}
          </h1>

          <p className="mt-5 max-w-xl leading-relaxed text-muted">{t.text}</p>

          {error.digest ? (
            <p className="mt-4 font-mono text-xs text-muted">
              {t.kennung}: {error.digest}
            </p>
          ) : null}

          <div className="mt-9 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={reset}
              className="rounded-blk bg-signal px-5 py-3 text-sm font-semibold text-signal-ink transition-colors hover:bg-signal-hover"
            >
              {t.erneut}
            </button>
            <a
              href="/"
              className="rounded-blk border border-line-strong px-5 py-3 text-sm font-semibold text-text transition-colors hover:bg-surface-sunk"
            >
              {t.start}
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
