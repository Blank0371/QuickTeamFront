A. Sicherheit und Berechtigungen – vor echten Kundendaten zwingend
- 1. Anonyme Umfragen wirklich anonym zugänglich machen. — Fehler
  Betriebsmitglieder können derzeit Einzelstimmen samt Mitarbeiter-ID lesen und Namen zuordnen. Personenbezogene Einzelstimmen dürfen bei anonymen Umfragen nicht über Tabellen, RPCs oder andere Endpunkte erreichbar sein. Erledigt, wenn: Mitarbeiter und Chef nur die vorgesehenen aggregierten Ergebnisse erhalten.
- 2. Eigenmächtige Änderung des Urlaubsanspruchs verhindern. — Fehler
  urlaubsanspruch_tage fehlt im Spaltenschutz für Mitarbeiter. Erledigt, wenn: Ein gewöhnlicher Mitarbeiter das Feld weder über Website/App noch per direkter API ändern kann, die berechtigte Betriebsleitung aber weiterhin schon.
- 3. Betriebstrennung bei Schichtnotizen schließen. — Fehler
  Betrieb, Schicht und Autor werden nicht durchgängig zusammen geprüft. Erledigt, wenn: Eine Notiz ausschließlich mit einer Schicht und einem zulässigen Autor desselben Betriebs verknüpft werden kann – auch bei direkten INSERTs und UPDATEs.
- 4. Alle weiteren betriebsübergreifenden Verknüpfungen kontrollieren. — Prüfung
  Besonders Anhänge, Umfrageoptionen, Stimmen, Rollen und Schichtzuweisungen prüfen. Einzelne gültige Fremdschlüssel reichen nicht, wenn zusammengehörige Datensätze unterschiedlichen Betrieben angehören können. Erledigt, wenn: Solche Kombinationen durch Datenbankregeln abgewiesen werden.
- 5. Urlaubsregeln auch außerhalb der vorgesehenen RPC erzwingen. — Fehler
  Direkte Tabellenzugriffe umgehen Kontingent-, Schicht- und Planungsprüfungen der Antragsfunktion. Erledigt, wenn: Jeder erlaubte Schreibweg dieselben fachlichen Regeln durchsetzt. Auch prüfen, ob Mitarbeiter genehmigte oder bereits vergangene Anträge löschen dürfen sollen.
- 6. Schutz des letzten aktiven Chefs tatsächlich aktivieren. — Fehler
  Die Schutzfunktion existiert, ist aber an keinen Trigger gebunden. Erledigt, wenn: Deaktivierung, Rollenänderung, Anonymisierung und Löschung keinen unbeabsichtigt führungslosen Betrieb erzeugen. Ein gewollter Betriebsschließungsprozess muss weiterhin möglich bleiben.
- 7. Einladungseinlösung gegen gleichzeitige Aufrufe absichern. — Fehler
  Derzeit kann die Sitzung vor dem zuverlässigen einmaligen Verbrauch der Einladung entstehen. Erledigt, wenn: Bei zwei gleichzeitigen Einlösungen höchstens eine erfolgreich ist. Abgelaufene und bereits verwendete Einladungen müssen zuverlässig scheitern.
- 8. Sämtliche privilegierten Funktionen einzeln prüfen. — Prüfung
  Für jede erreichbare SECURITY DEFINER-Funktion festhalten: erlaubte Aufrufer, Betriebsprüfung, Rollenprüfung, zulässige Parameter und Nebenwirkungen. Unnötige Ausführungsrechte entfernen. Erledigt, wenn: Jede öffentlich erreichbare Funktion eine begründete und getestete Zugriffskontrolle hat.
- 9. Authentifizierung und Sitzungen vollständig prüfen. — Prüfung
  Passwortzurücksetzung, Einladungen, E-Mail-Änderungen, Rollenentzug, deaktivierte Mitarbeiter und gelöschte Accounts prüfen. Adminzugänge zu Supabase, Hosting und Stripe mit MFA absichern. Erledigt, wenn: Entzogene Rechte auch mit einer bestehenden Sitzung nicht weiter genutzt werden können.
- 10. Missbrauchsschutz und Geheimnisse kontrollieren. — Prüfung
  Login, Registrierung, Passwortreset, Einladungen und teure Planungsaufrufe auf wirksame Begrenzungen prüfen. Keine privilegierten Schlüssel in Browsercode, Git oder Logs. Erledigt, wenn: Schutzmaßnahmen nachgewiesen sind und das hier verwendete Testpasswort vor dem Launch ersetzt oder der Testzugang deaktiviert ist.
Die vorhandene RLS ist eine gute Grundlage. Sie ersetzt aber keine Spalten- und Funktionskontrollen. Supabase: Spaltenrechte
B. Vertragsannahme – technisch und rechtlich zusammenführen
- 11. Vertragsannahme auf vertretungsberechtigte Personen beschränken. — Fehler
  Gewöhnliche Mitarbeiter können aktuell Einträge erzeugen, die als Zustimmung des Betriebs zählen. Erledigt, wenn: Betriebliche Vertragsannahme und persönliche Kenntnisnahme getrennt gespeichert und ausgewertet werden.
- 12. Fehler bei der Zustimmungsprüfung korrekt behandeln. — Fehler
  Ein Datenbankfehler darf nicht als erfolgreiche Zustimmung gelten. Erledigt, wenn: „Zugestimmt“, „nicht zugestimmt“ und „Prüfung fehlgeschlagen“ technisch unterschieden werden und jeweils einen definierten Ablauf haben.
- 13. Speicherung und vollständige Einrichtung absichern. — Fehler
  Speicherfehler werden derzeit teilweise ignoriert; die Einrichtung kann weitergehen. Erledigt, wenn: Vor der Verarbeitung betrieblicher Mitarbeiterdaten ein zuverlässiger Annahmenachweis vorliegt – auch bei Wiederaufnahme, Bestandskonten und alternativen Zugangswegen.
- 14. Angenommene Dokumentfassungen dauerhaft nachweisbar machen. — Prüfung
  Unterzeichner, Betrieb, Zeitpunkt, Sprache und exakt angenommene Fassung nachvollziehbar speichern. Alte Fassungen aufbewahren; unter derselben Versionskennung keine Texte austauschen. Datenschutzhinweise nicht pauschal als Einwilligung für sämtliche Verarbeitung behandeln.
C. Bezahlung, Kündigung und Löschung
- 15. Rückleitung nach Bankbestätigung reparieren. — Fehler
  Abgelaufene Testaccounts können nach 3-D-Secure auf der falschen Seite landen. Erledigt, wenn: Zahlungsmittelübernahme und Abo-Aktivierung sowohl während als auch nach der Testphase zuverlässig abgeschlossen werden.
- 16. Verbindlichen Bestellablauf eindeutig machen. — Prüfung
  Festlegen, an welcher Stelle der kostenpflichtige Vertrag entsteht. Dort Tarif, Preis, Steuerbehandlung, Intervall, Testphase, erste Belastung und Kündigung verständlich anzeigen. Erledigt, wenn: Nutzer vor ihrer verbindlichen Erklärung die wirtschaftlichen Folgen erkennen.
- 17. Alle Abozustände mit Stripe abgleichen. — Prüfung
  Testphase mit/ohne Zahlungsmittel, Ablauf, erfolgreiche und gescheiterte Zahlung, notwendige Bankbestätigung, Kündigung und Wiederaufnahme testen. Erledigt, wenn: Stripe, Datenbank und tatsächlicher Zugang in jedem Fall zusammenpassen.
- 18. Webhooks gegen Wiederholung und falsche Reihenfolge prüfen. — Prüfung
  Signaturprüfung, doppelte Zustellungen, verzögerte Ereignisse und Fehlerwiederholung kontrollieren. Erledigt, wenn: Wiederholte Ereignisse keine falsche Freischaltung, Sperre oder widersprüchlichen Abostatus erzeugen.
- 19. Konto löschen, Betrieb schließen und Abo kündigen trennen. — Fehler/offen
  Der geprüfte Kontolöschablauf enthält keine erkennbare Stripe-Kündigung; die Benutzerführung erklärt die Abofolge nicht ausreichend. Erledigt, wenn: Für jeden Vorgang klar ist, was mit Zugang, Betrieb, Daten und Abrechnung passiert. Keine unbemerkte Weiterzahlung nach Zugangsverlust.
- 20. Rechnungen und grenzüberschreitende Besteuerung prüfen. — Prüfung
  Rechnungsangaben, Steuersätze und gegebenenfalls Reverse Charge für eure konkreten deutschen und österreichischen B2B-Kunden mit Steuerberatung abstimmen. Erledigt, wenn: Beispielrechnungen für die tatsächlich unterstützten Fälle fachlich geprüft sind.
D. Rechtliches und Datenschutz
- 21. Datenschutzerklärung an Website und App anpassen. — Fehler
  Stripe, tatsächliches Website-Hosting, E-Mail-Versand, technische Protokolle und lokale Speicherung vollständig abbilden. Je Verarbeitung Zweck, Rechtsgrundlage, Empfänger und Speicherdauer beziehungsweise Kriterien benennen.
- 22. EU-/Drittlandaussagen in der AVV vereinheitlichen. — Fehler
  Die EU/EWR-Regelung muss nachvollziehbar mit den eingesetzten US-Push-Diensten zusammenpassen. Erledigt, wenn: Vertrag, Unterauftragsverarbeiterliste und Datenschutzerklärung dieselben tatsächlichen Datenflüsse beschreiben.
- 23. Dienstleisterverträge und zugesagte Schutzmaßnahmen belegen. — Prüfung
  Erforderliche AVV/DPA und Übermittlungsgrundlagen tatsächlich vorhalten. Zusagen wie tägliche Backups, sieben Tage Aufbewahrung oder Admin-MFA gegen die Konfiguration prüfen. Eine EU-Datenbankregion allein belegt nicht sämtliche Aussagen.
- 24. Testphase, Zahlungsausfall und Vertragsende in den AGB bereinigen. — Fehler
  Beginn und Ende der Testphase, automatische Kostenpflicht und Verhalten ohne Zahlungsmittel regeln. Den Widerspruch zwischen Vertragsende bei ausbleibender Zahlung und längerem Zahlungsverzug auflösen.
- 25. Übrige AGB gezielt juristisch prüfen lassen. — Prüfung
  Besonders Änderungszustimmung durch Schweigen, Preisanpassungen, Freistellung, Haftung bei Datenverlust, Verfügbarkeit und Support. Erledigt, wenn: Eine im SaaS-/IT-Recht erfahrene Person die finalen Texte und den echten Bestellablauf für eure Zielmärkte geprüft hat. Auch B2B-AGB unterliegen Transparenz- und Inhaltskontrollen. § 307 BGB
- 26. Impressum vervollständigen und Unternehmensangaben verifizieren. — Fehler/Prüfung
  Einen zusätzlichen wirksamen Kommunikationsweg neben E-Mail bereitstellen. Firma, Anschrift, Vertretung, Register und USt-ID gegen die tatsächlichen Angaben prüfen. § 5 DDG
- 27. Cookies und externe Dienste auf der echten Domain prüfen. — Prüfung
  Feststellen, welche Dienste schon vor Anmeldung oder Interaktion laden. Nicht erforderliche Speicherung beziehungsweise Zugriffe gegebenenfalls erst nach Einwilligung ermöglichen. Kein Cookiebanner nur aus Gewohnheit: Für ausschließlich erforderliche Vorgänge kann eine Ausnahme greifen. § 25 TDDDG
- 28. Lösch- und Aufbewahrungskonzept praktisch umsetzen. — Prüfung
  Für Accounts, Mitarbeiterdaten, Schichten, Freitexte, Einladungen, Logs, Rechnungen und Backups festlegen, was wann gelöscht oder weiter aufbewahrt wird. Erledigt, wenn: Ein vollständiger Testfall geprüft wurde. Das Entfernen eines Namens allein beweist keine irreversible Anonymisierung.
- 29. Datenexport und Anbieterwechsel ermöglichen. — Prüfung
  Einen nutzbaren Export mit klaren Zuständigkeiten und Fristen vorsehen. Die AGB-Formulierung „soweit eine Funktion vorgesehen ist“ reicht als verlässlicher Prozess nicht. Die Anwendbarkeit und Anforderungen des Data Act auf QuickTeam prüfen lassen. EU-Kommission: Data Act
- 30. Datenschutzorganisation und Beschäftigtendaten klären. — Prüfung
  Verantwortlichkeiten zwischen euch und Arbeitgebern, Verarbeitungsverzeichnis, Betroffenenanfragen und Datenschutzvorfälle dokumentieren. Bedarf an Datenschutzbeauftragtem und Datenschutz-Folgenabschätzung beurteilen. Für Abwesenheitsgründe und Freitexte den Umgang mit Gesundheitsdaten festlegen; Betriebsrats-/Mitbestimmungsfragen in Kundeninformationen berücksichtigen.
- 31. Deutsche und englische Fassungen synchronisieren. — Prüfung
  Gleiche Leistungen, Fristen, Preise, Rechtsfolgen und Versionsstände sicherstellen. Erledigt, wenn: Beide Sprachen gemeinsam mit dem Vertragsablauf freigegeben sind.
E. Dienstplanung und verlässlicher Betrieb
- 32. Planungsalgorithmus und Datenbankregeln angleichen. — Konkrete Unstimmigkeiten
  Im gelesenen Code wird max_stunden_hart im Solver monatlich, im Datenbank-Trigger wöchentlich behandelt. Auch die Behandlung mehrerer Mitarbeiterprofile mit gleichem Login unterscheidet sich. Erledigt, wenn: Die fachliche Bedeutung definiert ist und sämtliche Planungswege dieselben Regeln verwenden.
- 33. Schutz bei nachträglichen Schichtänderungen prüfen. — Prüfung
  Kontrollen bei einer Zuweisung reichen nicht, wenn später Datum oder Zeiten verändert werden. Nachtarbeit, Mitternacht, Sommerzeit, Überschneidungen, Ruhezeiten, Urlaub und Tages-/Wochenlimits testen. Zusätzlich den Vergleich mit Status deaktiviert korrigieren: Dieser Wert gehört nicht zu den zulässigen Mitarbeiterstatus.
- 34. Aussagen zur rechtssicheren Planung begrenzen und belegen. — Prüfung
  Klären, welche deutschen und österreichischen Arbeitszeitregeln, Ausnahmen und Beschäftigtengruppen unterstützt werden. Urlaubsberechnung in Kalender- versus Arbeitstagen prüfen. Erledigt, wenn: Werbung und Produkt keine rechtliche Vollständigkeit versprechen, die der Regelumfang nicht abdeckt.
- 35. Backups tatsächlich wiederherstellen. — Prüfung
  Nicht nur kontrollieren, dass Backups angezeigt werden. Eine Wiederherstellung in einer getrennten Testumgebung durchführen und akzeptablen Datenverlust sowie Wiederanlaufzeit festlegen. Erledigt, wenn: Ein Wiederherstellungsprotokoll mit geprüftem Ergebnis vorliegt.
- 36. Produktionskonfiguration und E-Mail-Zustellung prüfen. — Prüfung
  Echte Domain, HTTPS, Redirect-URLs, Supabase-Auth-URLs, Stripe-Live-Konfiguration, Absender und SPF/DKIM/DMARC prüfen. Testdaten und Testberechtigungen vom Kundenbetrieb abgrenzen. Registrierung, Passwortreset und Einladungen auf der tatsächlichen Domain testen.
- 37. Überwachung und Störungsablauf einrichten. — Prüfung
  Fehler bei Anmeldung, Zahlung, Webhooks und Planung müssen auffallen. Zuständige Person, erreichbaren Support, Wiederanlauf und Rücknahme eines fehlerhaften Releases festlegen. Erledigt, wenn: Ein absichtlich ausgelöster Testfehler erkannt und nach dem vorgesehenen Ablauf bearbeitet wird.
- 38. Performance-Befunde bewerten. — Prüfung
  Die 44 gemeldeten nicht indexierten Fremdschlüssel und auffällige RLS-Abfragen gezielt prüfen. Keine Indizes blind hinzufügen oder wegen bisher fehlender Nutzung löschen. Erledigt, wenn: Kalender, Team, Mitteilungen und Planer mit einer realistischen Datenmenge ausreichend schnell bleiben.
F. Abschließende Abnahme – damit „erledigt“ etwas bedeutet
- 39. Rollen- und Betriebsmatrix testen.
  Mindestens zwei getrennte Testbetriebe mit jeweils Chef und Mitarbeiter verwenden. Lesen, Erstellen, Ändern und Löschen jeweils über die vorgesehenen Wege und direkte API-Zugriffe testen. Zusätzlich nicht angemeldete, eingeladene und deaktivierte Nutzer berücksichtigen. Im späteren Testlauf nur ausdrücklich dafür vorgesehene Testdaten verändern.
- 40. Vollständige Kundenreise auf dem Release testen.
  Registrierung → Vertragsannahme → Einrichtung → Einladung → Planung → Veröffentlichung → Mitarbeiterreaktion → Testphasenende → Zahlung → Kündigung → Export/Löschung. Fehlerfälle und Wiederaufnahme nach Abbruch gehören dazu. Wenn die mobile App zum Angebot gehört, muss diese dieselbe Abnahme bestehen.
- 41. Mobile Bedienbarkeit und Barrierefreiheit prüfen.
  Kritische Abläufe mit Tastatur, sichtbarem Fokus, verständlichen Fehlermeldungen, Zoom und kleinen Bildschirmen testen. Die rechtliche Anwendbarkeit von Barrierefreiheitsanforderungen anhand des tatsächlichen Angebots beurteilen; ein B2B-Hinweis allein ersetzt diese Prüfung nicht.
- 42. Genau den freizugebenden Stand dokumentieren.
  Codeversion, Datenbankschema, Edge-Function-Versionen, Konfiguration und Rechtstextfassungen festhalten. Launch erst, wenn: Keine offenen Fehler bei fremdem Datenzugriff, Berechtigungen, Abrechnung oder Datenverlust bestehen und alle oben genannten Pflichtprüfungen ein akzeptiertes Ergebnis haben.
Was den Launch verbessern würde, ihn aber aktuell nicht blockieren sollte
- Echte Produktansichten statt ausschließlich dekorativer Kalenderanimation.
- Klarere Gegenüberstellung der Tarifleistungen und Grenzen.
- Kurze Einführung und Hilfetexte für neue Betriebsleiter.
- SEO, Social-Vorschau und eine überzeugendere Produktdemonstration.