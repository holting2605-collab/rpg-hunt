# RPG Hunt v0.6 – Hub & Arsenal Update

Lokale Spieler-/Simulationsversion. Du steuerst Hunter nicht direkt. Du triffst Weg- und Taktikentscheidungen; die Hunter-KI führt Kämpfe anschließend selbstständig aus.

Stand 13.09.2026: **580 von 589 geplanten Bilddateien** sind vorhanden, darunter alle 150 Standard-Waffenvarianten. Neun Skins und eine Bildkorrektur bleiben wegen des Nutzungslimits der Bildgenerierung offen. Diese spielbare Zwischenversion zeigt dafür das passende Standardmodell und erhält die gespeicherte Skin-Auswahl; den genauen Umfang und noch offene Bilder dokumentiert [ART_OVERHAUL_STATUS.md](ART_OVERHAUL_STATUS.md). Hinweise zu Bildzuordnung, Skins und Prüfungen stehen in [ARTWORK.md](ARTWORK.md).

## Neu in v0.6

Elf Bildkacheln im Hub erschließen Hunter, Rekrutierung, Ausrüstung, Händler, Arsenal, Lager, Traits, Mission, Kodex, Statistik und Einstellungen; die Mission führt durch den bestehenden Run bis zur Rückkehr ins Hauptquartier.

- Zurück-Pfeil in jedem Unterbereich; `ESC` schließt Dialoge oder geht eine Ebene zurück. Offene Trait-Belohnungen müssen ausgewählt werden.
- Vier Rekruten mit Portrait, Klasse, allen Basiswerten, Startausrüstung und Preis; nicht bezahlbare Rekruten sind deaktiviert.
- Hunter mit Pfeilen in Details, Loadout und Lager durchschalten.
- Waffen mit Großansicht, Links-/Rechts-Pfeilen und Thumbnails auswählen; Suche, Kategorie, Waffengruppe, Qualität, Preis-/Schadens-/Präzisions-/Qualitätssortierung und Lagerfilter.
- Eigenes Lager mit kostenlosem Ausrüsten und bestätigtem Verkauf. Der Händler kauft neue Ware ins Lager.
- Tools und Consumables werden getrennt dargestellt. Die acht flexibel belegbaren Extraslots aus v0.5 bleiben erhalten; es wird keine neue 4+4-Beschränkung eingeführt.
- Missionsvorbereitung mit drei Teamplätzen, Ausrüstungswert, Gebiet, Target, Bedingungen und Bounty-Bonus.
- Laufende Kämpfe und offene Trait-Belohnungen lassen sich nach Neuladen fortsetzen. Während einer Mission sind Personal und Ausrüstung gesperrt.

Die technische Basis ist v0.5 Player. Waffenwerte, Rekrutenpreise, KI-Entscheidungen, Trefferregeln, Boss-Skalierung und Wirtschaft bleiben unverändert. Deshalb beträgt der Rückkauf weiterhin **55 %**, nicht 60–70 %. Einzelne Rekruten kommen entsprechend der bisherigen Regeln ohne Waffen; rüste sie vor der Mission aus.

## Spieler-Modus
- autonome Hunter-KI mit Intelligenz, Disziplin, Aggression und Mut
- unterschiedliche Persönlichkeiten: Taktiker, Hitzkopf, Unsicher, Jäger, Vorsichtiger, Glücksritter, Pragmatiker
- KI-Empfehlungen auf den drei Weg-Entscheidungen
- automatische Waffenwahl und Waffenwechsel nach Distanz
- selbstständiges Heilen, Ausdauer regenerieren, Zielwahl und Angriffe
- Trefferwahrscheinlichkeit 35–95 %, Glück, Ausdauer und Status wirken direkt
- drei Spieler-Vorgaben im Kampf: Vorsichtig, Ausgewogen, Aggressiv
- 1x/2x/4x Simulationsgeschwindigkeit
- animierte 2.5D-Kampfkulisse mit Hunter- und Gegnerkarten
- Händler-, Loadout-, Perk-, Boss-, Bounty- und Extraction-Systeme

## Start
- Windows: `START_RPG_HUNT.bat` doppelklicken.
- macOS: `sh START_RPG_HUNT.command` ausführen.
- Linux: `sh START_RPG_HUNT.sh` ausführen.
- Alternativ: `index.html` direkt in einem modernen Browser öffnen.

Das Spiel läuft lokal ohne Account, Cloud oder Internetverbindung. Spielstände werden im lokalen Browser-Speicher gespeichert; unter Einstellungen können sie exportiert und importiert werden.

Für einen lokalen Webserver mit installiertem Python 3 im Projekt-Hauptverzeichnis:

```bash
python -m http.server 8000 --bind 127.0.0.1
```

Danach `http://127.0.0.1:8000` im Browser öffnen. Spielstände sind an den Browser und die verwendete Adresse gebunden; der direkte Dateistart und der Webserver teilen keinen Spielstand.

## Händler und Ausrüstung

- Im Arsenal Waffen auswählen und ausrüsten; beim Händler ins Lager kaufen.
- Tools und Consumables kaufen, ausrüsten und einlagern.
- Alte Waffen und Extras für 55 % Rückkaufswert verkaufen.
- Hunter-Loadouts, gemeinsames Lager und Arsenal verwalten.

## Spielkern

- 1–3 Hunter pro Run
- 20 reguläre Runden + bis zu 3 Bonusrunden
- immer 3 Entscheidungen
- Bossfenster Runde 10–15
- Boss, Banish, Bounty, Extraction
- Geldsystem, Permadeath, Leveln, Perks und Savegame

## Datenumfang

- 150 Waffenvarianten
- 87 Traits/Perks
- 51 Tools & Consumables
- 16 Monster + 6 Bosse
- 28 Lärmquellen

## Entwicklung / Tests

Voraussetzung: Node.js ab Version 20. Es werden keine zusätzlichen npm-Pakete benötigt.

```bash
npm test
npm run check:game
npm run check:data
```

Der Smoke-Test prüft JavaScript-Syntax einschließlich der neuen UI-Datei, Kern-Dateien, Waffen-JSON, statische DOM-Verknüpfungen und lokale Asset-Pfade. Zusätzlich prüft `tests/rules.mjs` Inventarerhalt, Geldgrenzen, Traits, KI-Entscheidungen und Boss-Skalierung. 17 geschützte Funktionen werden gegen den gesicherten v0.5-Stand `d996619` verglichen; Zeilenenden werden dabei normalisiert. GitHub Actions führt `npm test` bei Pushes und Pull Requests aus.

Ohne npm: `node tests/smoke.mjs`, `node tests/rules.mjs` und `node tests/skins.mjs`. Die einzelnen Syntaxprüfungen entsprechen `node --check game.js`, `node --check data.js` und `node --check v3data.js`.

Der optionale Browser-Test `node tests/browser.cjs` benötigt eine vorhandene Playwright-Installation und Chromium/Chrome. Er verwendet einen frischen, isolierten Browser-Spielstand und einen reproduzierbaren Zufallsstart. Dafür den lokalen Webserver starten. Optional lassen sich `PLAYWRIGHT_MODULE` (Modulpfad), `CHROME_PATH` (Browserdatei), `RPG_HUNT_URL` und `RPG_HUNT_TEST_OUTPUT` setzen. Playwright ist **keine Laufzeitabhängigkeit des Spiels**. Der Test bedient echte Menüs bis Boss, Bounty und Extraction und prüft Save-Import/-Export sowie Smartphone-Breite.

## Lokaler Build und ZIP

Das Repository selbst ist der spielbare Build; es gibt keinen Download- oder Bundling-Schritt. Alle Bilder sind lokal enthalten. `index.html` benötigt die benachbarten Dateien und Ordner.

Mit Python 3 erzeugt `python tools/build.py` einen eigenständigen Ordner `dist/RPG-Hunt-v0.6` und `dist/RPG-Hunt-v0.6.zip`. ZIP vollständig entpacken, dann den passenden Starter oder `index.html` öffnen. Der Build enthält keine Git-Metadaten, Test-Spielstände oder Online-Dienste.

Ein zusätzlicher Browser-Regressionscheck ist `node tests/save-session.cjs`: Er importiert einen vorherigen Spielstand während einer laufenden KI-Aktion und prüft, dass keine veraltete Aktion die wiederhergestellten Hunter verändert. Es gelten dieselben optionalen Playwright-Umgebungsvariablen.

Die UI-Erweiterung liegt in `ui/player.js` und `ui/player.css`. `game.js` enthält weiterhin die bestehenden Regeln, die autonome KI und einen kleinen UI-Adapter. Das lokale Savegame verwendet weiterhin den Schlüssel `rpgHuntSaveV3`; vorhandene v0.5-Spielstände bleiben verwendbar. Ein Export vor einem Versionswechsel wird empfohlen.

Änderungen, technische Fehlerkorrekturen und Grenzen stehen in `CHANGELOG.md`.

## Menü-Artworks und Waffenskins

Elf neue Gothic-Western-Menübilder und 32 Waffen-Artworks sind lokal enthalten. Acht Waffentypen bieten Standard, Bayou, Elite und Meister. Die kleinen Pfeile unter **KOSMETIK** wechseln den kostenlosen Skin. Die Auswahl gilt pro Waffenmodell und bleibt in Loadout, Lager, Händler, Mission sowie Save-Import/-Export erhalten. Alte Saves bleiben kompatibel; Spielwerte und KI ändern sich nicht.

Bedienung, abgedeckte Waffen, technische Datenstruktur und Grenzen: [ARTWORK.md](ARTWORK.md). Die vollständigen Bild-Prompts stehen in [tools/art-manifest.json](tools/art-manifest.json). Die Erweiterung besteht aus `ui/skins.js` und `ui/art.css`. Zusätzlicher Browsertest: `node tests/skins-browser.cjs` (gleiche Playwright-Variablen wie oben).
