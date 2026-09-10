# RPG Hunt v0.5 Player

Lokale Spieler-/Simulationsversion. Du steuerst Hunter nicht direkt. Du triffst Weg- und Taktikentscheidungen; die Hunter-KI führt Kämpfe anschließend selbstständig aus.

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

- Waffen per Vor-/Zurück-Karussell auswählen und direkt ausrüsten oder ins Lager kaufen.
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

Der Smoke-Test prüft JavaScript-Syntax, Kern-Dateien, Waffen-JSON, statische DOM-Verknüpfungen und lokale Asset-Pfade. GitHub Actions führt denselben Test bei Pushes und Pull Requests aus.

Ohne npm lässt sich derselbe Smoke-Test mit `node tests/smoke.mjs` ausführen. Die einzelnen Syntaxprüfungen entsprechen `node --check game.js`, `node --check data.js` und `node --check v3data.js`.

Die lauffähige Projektversion liegt direkt im Repository-Hauptverzeichnis: `index.html`, `styles.css`, `game.js`, `data.js`, `v3data.js`, `weapons.json` und `assets/`. Der Ordner `tests/` enthält die automatisierten Prüfungen.
