# RPG Hunt v0.5 Player

Lokale Spieler-/Simulationsversion. Du steuerst Hunter nicht direkt. Du triffst Weg- und Taktikentscheidungen; die Hunter-KI führt Kämpfe anschließend selbstständig aus.

## Neu
- autonome Hunter-KI mit Intelligenz, Disziplin, Aggression und Mut
- unterschiedliche Persönlichkeiten: Taktiker, Hitzkopf, Unsicher, Jäger, Vorsichtiger, Glücksritter, Pragmatiker
- KI-Empfehlungen auf den drei Weg-Entscheidungen
- automatische Waffenwahl und Waffenwechsel nach Distanz
- selbstständiges Heilen, Ausdauer regenerieren, Zielwahl und Angriffe
- Trefferwahrscheinlichkeit 35–95 %, Glück, Ausdauer und Status wirken direkt
- drei Spieler-Vorgaben im Kampf: Vorsichtig, Ausgewogen, Aggressiv
- 1x/2x/4x Simulationsgeschwindigkeit
- animierte 2.5D-Kampfkulisse mit Hunter- und Gegnerkarten
- bestehende Händler-, Loadout-, Perk-, Boss-, Bounty- und Extraction-Systeme bleiben enthalten

## Start
Windows: `START_RPG_HUNT.bat`
Alternativ: `index.html` im Browser öffnen.
# RPG Hunt v0.4.0 Local

Lokale Offline-Version von RPG Hunt.

## Start

Windows: `START_RPG_HUNT.bat` doppelklicken.  
macOS: `START_RPG_HUNT.command` öffnen.  
Linux: `./START_RPG_HUNT.sh` starten oder `index.html` im Browser öffnen.

## Neu in v0.4

- Neuer Hauptmenüpunkt **Händler / Markt & Lager**.
- Eigenes Händler-Untermenü mit großem Bildhintergrund.
- Waffen können im Händler per **Vor/Zurück-Karussell** durchgeschaltet werden.
- Waffen lassen sich kaufen und direkt ausrüsten oder nur ins Lager legen.
- Extras/Tools/Consumables können gekauft und direkt ausgerüstet oder eingelagert werden.
- Lager-/Verkaufsmenü: alte Waffen und Extras für 55 % Rückkaufswert verkaufen.
- Ausrüstung, Händler und Arsenal sind stärker miteinander verknüpft.
- Zusätzliche eigene Händler-/Workbench-Grafiken.
- Version bleibt komplett lokal: kein Account, keine Cloud, kein Internet nötig.

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

```bash
npm test
```

Der Smoke-Test prüft JavaScript-Syntax, Kern-Dateien, Waffen-JSON, statische DOM-Verknüpfungen und lokale Asset-Pfade. GitHub Actions führt denselben Test bei Pushes und Pull Requests aus.
