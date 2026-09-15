# Umsetzung und verbleibende Voraussetzungen — 15.09.2026

## In Supabase angewendet

Projekt QuickTeam (jqpfuotwsgnqihspsmmf, Region eu-west-1). Migration legal_privacy_safeguards erfolgreich angewendet.

- notfall_gruende als getrennte Tabelle mit RLS: aktive Betriebsleitung und Melder; kein allgemeiner Teamzugriff und kein Sonderzugriff für Vertretungen. Berücksichtigt mehrere Profile desselben Kontos.
- notfall_melden schreibt Gründe in diese Tabelle. Die alte Spalte notfaelle.grund bleibt für ältere Clients vorhanden, ist durch CHECK immer NULL. Kein Löschen von Bestandsgründen: die Migration kopiert und prüft vor dem Leeren. Beim Lauf waren keine ausgefüllten Gründe vorhanden.
- Operatorfunktionen private.export_sperre_beginnen und private.export_sperre_abschliessen: offene Sperre ohne automatisches Ablaufdatum, nach vollständiger Bereitstellung/Übergangsende mindestens 30 Tage, wiederholter Abschluss verkürzt keine endliche Frist. Kein Zugriff aus dem öffentlichen API für normale Nutzer.

## Verifiziert

Transaktionstests vor und nach Migration mit anschließendem ROLLBACK: berechtigtes bestehendes Konto, zusätzlich erzeugtes unbeteiligtes Mitarbeiterkonto desselben Betriebs, fremdes Konto, Anonym-/Schreibrechte, leere Legacy-Spalte, unbefristete Sperre, 30-Tage-Frist und Schutz gegen Fristverkürzung. Testkonten und Testgründe bleiben nicht bestehen. Das bestehende Konto hatte mehrere Profile; deshalb wurde der unabhängige Mitarbeiter synthetisch in der zurückgerollten Transaktion angelegt.

Sicherheitsadvisor ausgeführt: kein neuer offen lesbarer Bereich. Meldungen zu beabsichtigt gesperrten privaten Tabellen, vorhandenen SECURITY-DEFINER-RPCs und pg_net bestehen weiter. Diese Ausgabe ist keine vollständige Sicherheitsfreigabe. [Advisor-Erläuterung zu privilegierten RPCs](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [pg_net im public-Schema](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public).

## Quellcode geändert, Veröffentlichung steht aus

- QuickTeamFront: neuer geschützter Exportbereich inklusive Verknüpfungsprüfung und Test; Datenschutzerklärung an Zugriffsschutz angepasst; deutsches/englisches Exportverzeichnis ergänzt. Versionsschlüssel 2026-09-15-r2-draft.
- QuickTeamMobile (vom Nutzer als aktuell benannt): Leitung liest Gründe über die geschützte Beziehung. Keine Aufforderung mehr, eine Krankheit als Notfallgrund einzugeben.
- Reguläre App-Abmeldung entfernt den gerätespezifischen Push-Token über die vorhandene, eigentümergebundene RPC; Registrierung, Erinnerungen und Abmeldung sind serialisiert. Geplante/lokal angezeigte Mitteilungen und personenbezogene lokale Zwischenspeicher werden bereinigt. Netzwerkfehler werden nicht als erfolgreiche Abmeldung dargestellt.
- App-Rechtstexte aus Website übernommen, einschließlich AVV. Veraltete DMCA-Platzhalter aus der sichtbaren Auswahl entfernt; Apple-Standard-EULA bleibt verlinkt. Datenschutz-Kenntnisnahme wird pro angemeldetem Konto gespeichert. Beschäftigte nehmen damit keinen Betriebsvertrag an. Vertragliche Annahme erfolgt über den Webprozess. Deutsch/Englisch; für andere App-Sprachen wird Englisch angezeigt.

## Arbeitsanweisung für Export-/Wechselanfragen

1. Identität und Vertretungsmacht prüfen, Vorgangsnummer vergeben und Eingang dokumentieren. Keine Gesundheitsdaten in die Vorgangsreferenz schreiben.
2. Im privilegierten SQL-Zugang private.export_sperre_beginnen(betrieb_id, vorgangsreferenz) aufrufen; zurückgegebene Sperren-ID zum Vorgang speichern. Es gibt keine automatische Postfachanbindung: Dieser Schritt muss nach Eingang einer E-Mail erfolgen.
3. Vollständigkeit und fehlende Dateien prüfen; sichere Bereitstellung koordinieren. Bei Wechsel Leistung, Zielkontakt und Termine abstimmen.
4. Erst nach vollständiger Bereitstellung und gegebenenfalls abgeschlossenem Übergang private.export_sperre_abschliessen(sperre_id, bereitstellungsdatum, uebergangsende) aufrufen. Enddatum dem Kunden mitteilen. Weitere parallele Sperren bleiben bestehen.
5. Offene Vorgänge regelmäßig bearbeiten. Unbefristete Sperren sind keine Erlaubnis für unbegrenzte Aufbewahrung ohne Zweck. Nachweislich zurückgezogene/erledigte Sonderfälle dokumentiert bearbeiten; keine pauschale Löschung aller Sperren.

## Nicht erledigt / nicht als erledigt ausgeben

- Veröffentlichung von Website und App sowie Prüfung auf echten iOS-/Android-Geräten, inklusive Netzwerkfehlern, automatischem Sitzungsablauf und Kontowechsel. Bereits zugestellte Push-Nachrichten sind nicht zuverlässig rückrufbar.
- Vollständiger Lösch-/Wiederherstellungstest mit sämtlichen Fachobjekten, Stripe-Testuhr und mehreren Anstellungen. Die RLS-/Sperrentests ersetzen ihn nicht.
- Vollständige Dateiübertragung und Datei-Backups: im Projekt sind derzeit keine Supabase-Storage-Buckets und keine Storage-Objekte vorhanden. Das ist keine vorhandene Datei-Infrastruktur. Externe URLs aus Anhangzeilen werden aus SSRF-Schutzgründen nicht einfach serverseitig abgerufen. Vor Aktivierung echter Anhänge Speicherort und Berechtigungsmodell festlegen und den sicheren Export implementieren.
- Stripe-Konfiguration, Behandlung offener Rechnungen, 14-Tage-Wiederholungen, Steuer-/E-Rechnungsanforderungen und Erstattungsablauf beim Wechsel. Keine produktiven Rechnungen oder Preise verändert.
- Verträge/DPF/SCC, 2FA-Nachweise, Backup-/Logkonfiguration, Prüfung der tatsächlichen Cookies im Zahlungsformular und DPO-Benennungspflicht. Vertragsabschlüsse und Betreiberbestätigungen können nicht durch Code ersetzt werden.
- Vollständiger betrieblicher Anbieterwechselprozess einschließlich fortlaufendem Dienst und Zahlungssteuerung; die neue Sperrenfunktion allein erledigt ihn nicht.

**Keine pauschale Launchfreigabe.** Aktuelle Datenbankkorrekturen sind wirksam; lokale App-/Webänderungen werden erst mit Veröffentlichung wirksam.
