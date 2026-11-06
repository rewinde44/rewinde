# Rewinde

Geschäftsprozesse vom Ergebnis aus modellieren und dokumentieren. Rewinde unterstützt die Prozessanalyse durch Rückwärtsverkettung: Zuerst wird das gewünschte Ergebnis festgelegt, anschließend werden die notwendigen Voraussetzungen ergänzt.

Die Anwendung läuft im Browser. Prozessdaten bleiben auf dem Gerät des Nutzers; es gibt keine Datenbank, Benutzerkonten oder KI-Anbindung. Die öffentliche Fassung dient als Projektpräsentation.

## Funktionen

- Vertikale Ablaufdarstellung mit parallelen, gemeinsam notwendigen Vorgängern.
- Direkte Bearbeitung von Schritten und Prozessangaben im Arbeitsbereich.
- Eigene Menüs für Allgemein, Ressourcen, Verbindungen und Potenzial.
- Gemeinsame Ressourcen, Software und Daten mit Input-, Output- oder Nutzungszuordnung.
- Manuelle Bewertung von Automatisierungspotenzial, Verantwortung, Zeit und Notizen.
- Import und Sicherung als JSON; Export als HTML-Bericht, Druck/PDF, CSV und SVG.
- Suche über Prozesse, Schritte und Ressourcen.

## Schnellstart

Voraussetzung: [Node.js](https://nodejs.org/) ab Version 22, empfohlen ist Version 24. Zusätzliche Pakete sind nicht erforderlich.

```sh
npm start
```

Danach [http://127.0.0.1:4173/](http://127.0.0.1:4173/) öffnen. Unter Windows kann alternativ `start-local.cmd` gestartet werden. Zum Beenden im Terminal `Strg+C` drücken.

```sh
npm test                 # Modell-, Speicher-, Export-, HTTP- und Paketprüfungen
npm run build            # Statische Website nach dist/ bauen
npm run package:github   # Freigegebenen Quellcode nach outputs/github/rewinde/ kopieren
```

Alle Befehle funktionieren auch direkt mit Node, zum Beispiel `node server.mjs` und `node scripts/build-static.mjs`.

## Bedienung

In der Prozessübersicht einen Prozess anlegen und sein Ergebnis benennen. Eine Karte im Ablauf öffnet die zugehörigen Bearbeitungsmenüs. Das Plus vor einer Karte ergänzt einen Vorgänger. Mehrere Vorgänger bilden gemeinsame Voraussetzungen (UND). Zoom, Gesamtansicht und Verschieben mit der Maus erleichtern die Navigation.

Änderungen bleiben beim Wechsel zwischen den Schrittmenüs erhalten und werden über **Speichern** übernommen. Ressourcen können direkt zugeordnet, neu angelegt oder bearbeitet werden. Änderungen gemeinsamer Ressourcen gelten für alle zugeordneten Schritte. Die Dokumentation entsteht beim Export als eigenständiger Bericht.

Ein neuer Browser-Arbeitsbereich ist leer. `seed.mjs` enthält ausschließlich fiktive Beispieldaten für Tests und wird nicht an Besucher ausgeliefert.

## Daten und Sicherungen

Der Arbeitsbereich liegt in `localStorage`. Web Locks koordinieren Schreibzugriffe mehrerer Tabs; bei Konflikten oder Speicherfehlern wird der bestehende Stand nicht stillschweigend überschrieben. Benötigt werden aktuelle Browser und HTTPS; lokal funktionieren `localhost` und `127.0.0.1`.

Unter **Einstellungen → Daten & Sicherung** lässt sich der gesamte Arbeitsbereich exportieren. Ein Arbeitsbereichimport ersetzt nach Bestätigung den Browserbestand. Einzelne Prozessdateien werden mit neuen IDs ergänzt. Browserbereinigung, private Sitzungen und Gerätewechsel können die Daten unzugänglich machen; eine Wiederherstellung durch den Betreiber ist nicht möglich. Exporte sind unverschlüsselt.

Domain, Protokoll, Port und Browserprofil bestimmen den Speicherbereich. Vor einem Domainwechsel eine JSON-Sicherung exportieren und auf der neuen Adresse importieren. Es gibt keine automatische Synchronisierung zwischen Geräten.

Grenzen pro Arbeitsbereich: 2 MB, 100 Prozesse mit je 100 Schritten, 1.000 Ressourcen. Importdateien dürfen bis zu 10 MB groß sein; der enthaltene Arbeitsbereich weiterhin höchstens 2 MB.

Der Speicherschlüssel `rueckgrat:workspace:v1` und die JSON-Formatkennungen `rueckgrat-process` beziehungsweise `rueckgrat-workspace` bleiben zur Kompatibilität mit bisherigen Sicherungen erhalten. Frühere Statusfelder werden beim Einlesen entfernt, ältere Input-/Output-Texte in Ressourcenzuordnungen überführt.

## Veröffentlichung

Die [Schritt-für-Schritt-Anleitung](docs/github-veroeffentlichung.md) beschreibt den ersten Upload auf GitHub und die anschließende Veröffentlichung mit Cloudflare Pages.

| Cloudflare Pages | Einstellung |
| --- | --- |
| Framework | None |
| Build command | `node scripts/build-static.mjs` |
| Build output directory | `dist` |
| Production branch | `main` |
| Root directory | Repository-Wurzel, Feld leer lassen |

Der Build kopiert ausschließlich freigegebene öffentliche Dateien. Nur `dist/` wird als Website ausgeliefert. Quellcode und Website sind unterschiedliche Pakete: Das Repository enthält auch Tests und Dokumentation. Lokale Daten, Exporte und Sicherungen gehören nicht ins öffentliche Repository.

Die Repository-Adresse kann nach dem Anlegen in `public/project.js` eingetragen werden. Ohne konfigurierte URL erscheint kein Projekt-/Kontaktlink. Der Build erstellt die eigene Datenschutzseite aus dem gemeinsamen Text in `public/privacy.js`.

Weitere Hinweise: [Hosting und Datenhaltung](docs/hosting.md), [Prüfstand](docs/verification.md), [Mitarbeit](CONTRIBUTING.md), [Weiterentwicklung](docs/product-roadmap.md).

## Projektstruktur

```text
public/     Browseranwendung und öffentliche Assets
scripts/    Statischer Build und Quellcodepaket
tests/      Automatisierte Tests und isolierter Vorschau-Server
docs/       Bedienungs-, Hosting- und Veröffentlichungsinformationen
server.mjs  Lokaler statischer Testserver
seed.mjs    Fiktive Testdaten
```

JavaScript-Module, HTML, CSS und SVG ohne Framework oder Laufzeitabhängigkeiten. Docker ist optional; Cloudflare Pages benötigt keinen eigenen Server und keine Datenbank.

## Umfang und Lizenz

Rewinde dokumentiert Prozesse; es führt keine Workflows aus. Alternative ODER-Pfade, Schleifen, gemeinsame Echtzeitbearbeitung, Anhänge und revisionssichere Historien sind nicht umgesetzt. Bewertungen erfolgen durch Menschen. Eine Bezahlversion und Lizenzprüfung sind nicht Bestandteil dieser Fassung.

[MIT-Lizenz](LICENSE). Die technische Datenminimierung ersetzt keine Prüfung der rechtlichen Anforderungen des konkreten öffentlichen Betriebs.
