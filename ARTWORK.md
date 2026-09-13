# RPG Hunt v0.6 – Bildbestand und Waffenskins

## Laufende Gesamtüberarbeitung

**Stand 13.09.2026: 580/589 Bilddateien, neun fehlende Skins und eine offene Korrektur.** Alle 150 Standard-Waffenbilder, 87 Traits, Hunter, Kreaturen, Bosse, Gebiete und geplanten Menübilder sind vorhanden. Offen sind jeweils drei Skins für Dolch 96 Precision, Hand Crossbow und Combat Axe sowie der deutlicher sichtbare Unterhebel bei Terminus Shorty/Bayou. Bis zur Fortsetzung der Bildgenerierung wird bei diesen Auswahlen das genaue Standardmodell mit Vorschauhinweis angezeigt; Auswahl und Besitz bleiben gespeichert.

Der aktuelle Arbeitsstand erweitert die erste Menü-/Skin-Ausgabe unten um individuelle Bilder für Waffenvarianten, Gegenstände, Traits, Hunter, Gegner und Gebiete. Der genaue Fertigstellungsstand steht in `ART_OVERHAUL_STATUS.md`; noch fehlende Motive verwenden weiterhin vorhandene lokale Bilder. Die Gesamtüberarbeitung ist erst vollständig, wenn dort keine offenen Bildaufträge mehr stehen.

Neue Bilder liegen in `assets/overhaul/`. `ui/art-catalog.js` enthält ausschließlich tatsächlich vorhandene Dateien. `ui/illustrations.js` ordnet sie den bestehenden Spielinhalten zu; `ui/skins.js` berücksichtigt das exakte Waffenmodell und den gespeicherten Skin. Schalldämpfer, Optiken und Bajonette werden in den jeweiligen Varianten ausdrücklich dargestellt. Bildrahmen zeigen Waffen vollständig statt Aufsätze abzuschneiden.

„Adlerauge · Crack Shot“ bezeichnet den vorhandenen Trait 66 mit unverändert +6 Präzision. Es wurde keine zusätzliche Fähigkeit eingeführt. Auch „Iron Eye“ erhält ein eigenes Motiv mit offener Visierung. Die Hunter-Porträts werden aus 16 Bildern passend zur Qualitätsstufe stabil zugeordnet. Spielwerte, KI und Besitz bleiben davon unberührt.

Prüfgrundlage und vollständige Motivbeschreibungen: `tools/art-overhaul/jobs.json`. Technischer Stand: `tools/art-overhaul/status.json`. Sichtprüfung und Korrekturen: `tools/art-overhaul/visual-review.json`. Die vorhandenen 118 Bilder wurden vor Beginn in Kontaktbögen geprüft; alte Dateien werden zur Absicherung beibehalten, bis alle benötigten Darstellungen ersetzt sind.

Zusätzliche Tests: `node tests/art-overhaul.mjs` prüft vollständige Abdeckung und schlägt bei offenen Motiven fehl. `node tests/art-loading-browser.cjs` dekodiert alle aktuell vorhandenen neuen Bilder offline. `node tests/art-features-browser.cjs` prüft markante Varianten und Adlerauge im Spiel.

## Dokumentation der ersten Menü-/Skin-Ausgabe

Die folgenden Angaben zu 43 Bildern und Gruppenmotiven dokumentieren die vorherige Ausgabe, nicht den Fertigstellungsstand der laufenden Gesamtüberarbeitung.

## Umfang

43 neue lokale PNG-Artworks, jeweils 1536 × 1024 Pixel, erstellt mit dem eingebauten Imagegen-Werkzeug. Keine Bildsuche, kein CDN und keine Online-Abhängigkeit des Spiels. Alle bisherigen Assets bleiben erhalten.

- Elf eigenständige Menübilder: Mission, Hunter, Rekrutierung, Ausrüstung, Händler, Arsenal, Lager, Traits, Kodex, Statistik und Einstellungen.
- Acht Waffenmotive: Revolver einschließlich schwerer Uppercut-Familie, frühe Selbstladepistole, Lever-Action-Gewehr, Schrotflinte, Zielfernrohrgewehr, Armbrust, Messer und Wurfaxt.
- Je vier Looks: **Dunkles Holz** (Standard), **Bayou-Wanderer** (Jäger), **Blackwater-Gilde** (Elite) und **Erbe der Verdammten** (Meister).
- Der erste Katalog deckt 78 vorhandene Waffenvarianten und fünf Messer-/Wurfaxt-Tools ab. Die Motive werden innerhalb einer Waffengruppe geteilt; dies sind keine 150 individuell konstruierten Waffenmodelle. Nicht abgedeckte Waffen und andere Extras behalten ihre bisherigen Bilder.

Menüs: `assets/ui/menu/menu_*.png`. Waffen: `assets/weapons/skins/<gruppe>_<skin>.png`. Dateinamen und vollständige Generierungs-Prompts stehen in `tools/art-manifest.json`. Der Stil verwendet dunkles Holz, Leder, Schwarzstahl, Messing, Nebel und Kerzenlicht; Titel und Bedienelemente werden als echte UI über dunklen Bildflächen gesetzt.

## Bedienung

Eine unterstützte Waffe im Arsenal oder Händler öffnen. Im Bereich **KOSMETIK** wechseln die kleinen Links-/Rechts-Pfeile den Skin; die äußeren Pfeile wechseln weiterhin die Waffe. Name, Beschreibung und Vorschau ändern sich sofort. Auch ausgerüstete Waffen im Hunter-Loadout sowie Gegenstände im Lager besitzen Skin-Pfeile. Messer und Wurfäxte sind zusätzlich in den Tools auswählbar.

Die Auswahl gilt für alle Exemplare desselben **exakten Waffenmodells**, nicht für die gesamte Familie. Zum Beispiel dürfen Ranger 73 und Ranger 73 Swift unterschiedliche Skins tragen. Händler, Lager, Waffenwahl, Hunter-Details, Loadout und Missionsteam verwenden dieselbe Bildauflösung. Die Missionsvorbereitung zeigt nun Bilder beider ausgerüsteter Waffen.

Alle vier Looks sind zunächst kostenlos verfügbar. Skin-Wechsel werden direkt gespeichert. Die kosmetische Auswahl beeinflusst weder Geld noch Schaden, Präzision, Munition, Traits, Hunter-KI oder Gegenstandsbesitz. Während eines Runs ist die Ausrüstungs-/Skin-Bedienung wie bisher gesperrt.

## Speicherung und Erweiterbarkeit

Das modulare `ui/skins.js` verwaltet Katalog, Auswahl, Normalisierung und Bildpfade. Im bestehenden Save unter `rpgHuntSaveV3` wird `weaponSkins` ergänzt. Jeder Eintrag enthält:

```json
{
  "weaponSkins": {
    "Ranger 73": {
      "defaultSkin": "standard_darkwood",
      "ownedSkins": ["standard_darkwood", "bayou_wrap", "elite_brass", "bone_ritual"],
      "selectedSkin": "bayou_wrap"
    }
  }
}
```

Die Waffen-Regeldaten und Inventargegenstände selbst werden nicht umgeschrieben. Alte Saves ohne `weaponSkins` erhalten Standardauswahl und die kostenlos verfügbaren Looks. Unbekannte oder nicht freigeschaltete Skin-IDs fallen auf Standard zurück. `ownedSkins` ist bereits für spätere Freischaltungen vorbereitet; Kaufpreise, Bezahlsysteme oder kosmetische Beute wurden noch nicht eingeführt. Export und Import nehmen die Auswahl automatisch mit.

## Verifikation

- Statischer Smoke-Test einschließlich neuer JavaScript-Dateien und lokaler Referenzen.
- Regeltest: 17 geschützte v0.5-Balance-/KI-Funktionen unverändert.
- Skin-Test: Alt-Saves, Vor-/Zurück-Umlauf, JSON-Neuladen, gesperrte/ungültige Skins, keine Änderungen an Waffenwerten und alle möglichen Skin-Bildpfade.
- Chrome: alle 43 PNG-Dateien vollständig dekodiert; Menü- und Skin-Galerien visuell geprüft.
- Browser-Skin-Test: elf Haupt-/Untermenüs, Vorschau, Händlerkauf, Lager, kostenloses Ausrüsten, Mission, Loadout-Wechsel, Save-Export/-Import und Neustart. Mobile Breite 390 Pixel ohne Seitenüberlauf; keine JavaScript- oder HTTP-Fehler.
- Bestehender vollständiger Browser-Test: Rekrutierung bis autonome KI, Boss, Banish, Bounty, Extraction, Belohnung und Savegame bestanden. Reproduzierbarer Testlauf: Assassin, Runde 19, 2238 Loot.
- Save-Import während einer laufenden KI-Aktion weiterhin ohne veraltete Folgeaktionen.

Ausführen: `npm test`, optional `node tests/skins-browser.cjs`, `node tests/browser.cjs` und `node tests/save-session.cjs` mit vorhandener Playwright-/Chrome-Installation. Umgebungsvariablen und Serverstart stehen in der README. Das Spiel selbst benötigt diese Testwerkzeuge nicht.

## Grenzen

Die acht Motive sind stilisierte Gruppenansichten; Aufsätze und mechanische Details jeder einzelnen Variante sind nicht separat illustriert. Hunter-Porträts und nicht unterstützte Waffen verwenden weiterhin die vorhandenen Bilder. Keine reale Android-/iOS-Geräteprüfung; die mobile Prüfung erfolgte mit Chrome-Viewport. Browser-Saves bleiben wie bisher an Browser und Adresse gebunden.
