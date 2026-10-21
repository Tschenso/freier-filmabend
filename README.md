# Freier Filmabend

[Öffentliche Website](https://freier-filmabend.jens-jung95.chatgpt.site/) · [Update-Läufe](https://github.com/Tschenso/freier-filmabend/actions/workflows/update-catalogue.yml)

Kostenlose Filme und Dokus bei ARTE, ZDF, ARD, Joyn Free, RTL+ Free, KiKA und Netzkino finden. Die Website bietet FSK-/Familienfilter und eine lokale Browser-Merkliste.

Dieses Repository enthält ausschließlich den Metadaten-Updater und seine Parser. Der Website-Server bleibt bei Sites. Private Projektdateien, Medien, Merklisten und Zugangsschlüssel gehören nicht in dieses Repository.

## Tägliches Update ohne KI-Aufruf

GitHub Actions startet täglich gegen **06:07 Uhr Europe/Berlin**. Zwei UTC-Zeitfenster mit Berliner Zeitprüfung berücksichtigen Sommer-/Winterzeit. GitHub kann geplante Läufe verzögern; bei größerer Verzögerung ist ein manueller Lauf möglich. Unter Actions → „Filmkatalog täglich aktualisieren“ → „Run workflow“ lässt sich derselbe Ablauf jederzeit starten.

1. Vorigen öffentlichen Katalog als Metadaten-Cache laden.
2. Begrenzte öffentliche Metadaten sammeln und kostenlos nutzbare Titel prüfen.
3. Alle sieben Anbieter, sichere Links, Bilder-/Verfügbarkeitsnachweise und plausible Titelzahl kontrollieren.
4. Mit kurzlebiger GitHub-OIDC-Identität hochladen. Der Server prüft Signatur, Repository-ID, Hauptbranch, konkreten Workflow, Anlass und Gültigkeit. Keine dauerhaften Secrets nötig.
5. Upload-Hash, Datenstand und Anbieterzahlen öffentlich zurücklesen. Der Website-Server erhält den Vorgänger als Rückfallstand.

Quellenfehler vor dem Upload erhalten den bisherigen Online-Katalog. Keine Anmeldungen, Medien-/Bilddatei-Downloads, Bezahlschranken-Umgehung oder KI-/LLM-Aufrufe. Die Metadaten sind eine begrenzte Auswahl; unbekannte Ablaufdaten bleiben unbekannt.

Standard-GitHub-Runner sind für öffentliche Repositories kostenlos. Andere Hosting-Leistungen unterliegen ihren jeweiligen Bedingungen. Öffentliche geplante Workflows können nach 60 Tagen ohne Repository-Aktivität deaktiviert werden: GitHub-Hinweis beachten und den Workflow bei Bedarf unter Actions wieder aktivieren.

## Technik und Rückweg

Node.js 22, keine npm-Abhängigkeiten. `node src/update_online.mjs` läuft nur innerhalb des zugelassenen Actions-Jobs; lokale Ausführung hat bewusst keine Upload-Berechtigung. Der Job besitzt nur `contents: read` und `id-token: write`.

Bei Fehlern Actions-Protokoll prüfen. Workflow-Deaktivierung stoppt weitere Updates; der letzte veröffentlichte Katalog bleibt erreichbar. Codeänderungen über Git rücknehmbar. Herkunft: Parser des lokalen Projekts `streaming-katalog`, Stand 21.10.2026.
