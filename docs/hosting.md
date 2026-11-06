# Hosting und Datenhaltung

Rewinde wird als statische Website auf Cloudflare Pages veröffentlicht. Es gibt kein Node-Backend im öffentlichen Betrieb, keine Datenbank und keine Daten-API. Alle App-Dateien werden vom selben Ursprung geladen.

## Cloudflare Pages

Das GitHub-Repository verbinden und folgende Einstellungen verwenden:

| Feld | Wert |
| --- | --- |
| Production branch | `main` |
| Framework preset | `None` |
| Build command | `node scripts/build-static.mjs` |
| Build output directory | `dist` |
| Root directory | Leer lassen |

Die Datei `.node-version` legt Node.js 24 für den Build fest. Zusätzliche Umgebungsvariablen, Zugangsschlüssel und Datenbankbindungen werden nicht benötigt. Die vollständige [Anleitung für die erste Veröffentlichung](github-veroeffentlichung.md) beschreibt die einzelnen Schritte.

Der Build erzeugt `datenschutz.html` aus `public/privacy.js` und kopiert eine feste Liste öffentlicher Dateien nach `dist/`. Zusätzliche unbekannte Dateien im bestehenden Ausgabeordner führen zum Abbruch. Daten, Sicherungen und Repository-Metadaten werden nicht kopiert.

`public/_headers` enthält die Sicherheitsheader für Pages. Die Content Security Policy sperrt Netzwerkclients wie fetch/XHR/WebSocket/Beacon über `connect-src 'none'`. `script-src` erlaubt nur eigene Module; externe Schriftarten und Skripte sind nicht eingebunden. `frame-ancestors 'none'` verhindert fremde Einbettung über den HTTP-Header. Das CSP-Meta-Tag in der App ergänzt diese Einstellungen.

Web Analytics, Zaraz und zusätzliche Drittanbieter-Skripte sind kein Bestandteil von Rewinde. Solche Dienste nicht ohne Anpassung des Datenkonzepts ergänzen. Cloudflare verarbeitet unabhängig davon technische Verbindungsdaten bei der Auslieferung.

## Daten im Browser

- Prozesse werden nach expliziten Speichervorgängen im lokalen Browserprofil abgelegt.
- Es werden keine Prozessinhalte in URLs, Cookies, API-Aufrufen oder Serverdateien gespeichert.
- Exporte werden lokal erstellt und sind unverschlüsselt.
- Domain, Protokoll, Port und Browserprofil bestimmen den Speicherbereich. Auch Domain mit und ohne `www` sind getrennt.
- Vor einem Umzug den vollständigen Arbeitsbereich auf der alten Adresse als JSON exportieren und auf der neuen Adresse importieren.
- Das Löschen von Websitedaten, private Sitzungen oder Browserbereinigung können Daten entfernen. Es gibt keine Serversicherung oder Gerätesynchronisierung.
- Personen mit Zugriff auf das Browserprofil können dessen Daten lesen.

Der bisherige lokale Speicherschlüssel bleibt zur Datenübernahme unverändert. Frühere Serverdateien in `data/` werden nicht mehr gelesen, ausgeliefert oder beschrieben. Falls sie lokal vorhanden sind, bleiben sie private Übernahmesicherungen außerhalb des Quellcode- und Hostingpakets.

## Repository-Link

Nach dem Anlegen des Repositorys dessen vollständige URL in `public/project.js` eintragen:

```js
export const REPOSITORY_URL = 'https://github.com/DEIN-NUTZERNAME/rewinde';
```

Anschließend neu bauen. Der gemeinsame Datenschutztext zeigt dann den Projekt-/Kontaktlink im App-Dialog und auf der eigenen Datenschutzseite. Ohne gültige URL bleibt der Link ausgeblendet.

## Lokaler Server und Docker

`npm start` liefert ausschließlich `public/` unter http://127.0.0.1:4173/ aus. Der Server verarbeitet keine Uploads oder Prozessdaten und schreibt keine Dateien. `HOST`, `PORT` und `ALLOWED_HOSTS` sind nur bei abweichendem Serverbetrieb relevant. Der Standard ist auf lokale Hostnamen begrenzt.

Optional: `docker compose up --build -d`. Das Container-Dateisystem ist schreibgeschützt; ein Datenvolume ist nicht erforderlich. Docker wurde nicht im Rahmen des lokalen Prüfstands ausgeführt.

## Öffentlicher Betrieb

Die kurzen Hinweise in der App beschreiben die Projektpräsentation, Browserspeicherung und Cloudflare Pages. Die Anforderungen an Betreiberangaben und Datenschutz richten sich nach dem tatsächlichen öffentlichen Betrieb. Ein Repository-Link allein stellt deren Erfüllung nicht sicher. Die technische Prüfung ist kein Nachweis rechtlicher Vollständigkeit.

Dokumentation: [Cloudflare Pages mit Git](https://developers.cloudflare.com/pages/get-started/git-integration/), [Build-Umgebung](https://developers.cloudflare.com/pages/configuration/build-image/), [Sicherheitsheader](https://developers.cloudflare.com/pages/configuration/headers/), [Cloudflare-Datenschutz](https://www.cloudflare.com/privacypolicy/).
