# RPG Hunt v0.6 – Hub & Arsenal Update

## Gesamtüberarbeitung der Bilder (13.09.2026, spielbarer Zwischenstand)

- 580/589 neue Bilder vorhanden und gesichtet; neun Skins und eine dokumentierte Korrektur offen.
- Fehlende oder zur Korrektur gesperrte Skins zeigen das richtige Standardmodell, ohne die gespeicherte Auswahl zu ändern.
- Hunter-Zuordnung nach Name stabilisiert und den ursprünglichen Pool mit acht Portrait-Einträgen erhalten. Rekrutierungs- und Händlerbilder zeigen die Gesichter im tatsächlichen Menüausschnitt.
- Homestead-Doppellauf, Drilling-Hatchet ohne erfundene Optik, Stacheldrahtbombe und organische Käfer korrigiert.

- Eigenständiger lokaler Bildkatalog für exakte Waffenvarianten, Skins, Extras, Traits, Hunter, Kreaturen, Bosse und Gebiete; kein zusätzlicher Onlinedienst im Spiel.
- Sichtbare Schalldämpfer, montierte Optiken und Bajonette bei den entsprechenden Waffenvarianten.
- Eigene Trait-Symbole, einschließlich „Adlerauge · Crack Shot“ mit unverändertem Effekt; Bilder auch in Hunter-Details und Kodex.
- 16 Hunter-Porträts mit unterscheidbaren Gesichtern und vier Kleidungsstufen.
- Vollständige Silhouetten in Kodex- und Kampfkarten; Waffenbilder werden nicht beschnitten. Bilder außerhalb der Ansicht werden verzögert geladen.
- Korrigiert: abweichende Bornheim-Skin-Geometrie, falsche Optik bei Iron Eye, aufrechte Rotjaw-Pose sowie missverständliche Kiteskin-, Catalyst-, Magpie-, Bruiser-, Flame-Touched- und Dewclaw-Symbole.
- Neue Prüfungen für Inhaltszuordnung, Bilddekodierung ohne Netz und erkennbare Varianten im Browser. Den genauen Umfang und noch fehlende Motive nennt `ART_OVERHAUL_STATUS.md`.

## Ausgangsstand und Sicherung

Aufbau auf dem bereinigten v0.5-Player-Commit `d996619472d6e9eee8cb8ed8cf7aa49883f99004`. Vor der Bearbeitung wurde ein ZIP dieses Git-Stands angelegt. Das Projekt wurde weder neu aufgesetzt noch auf v0.4 zurückgesetzt. Sämtliche 75 vorhandenen Assets bleiben erhalten.

## Änderungen

- Zusammenhängender Hub mit elf großen Bildkacheln, eigenen Lager- und Statistikbildschirmen.
- Einheitliche Navigation mit Zurück und ESC, klaren Überschriften, Tastaturfokus und Touch-Flächen.
- Vier große Rekrutenkarten; Klassenfarben, Werte, KI-Profil, Ausrüstung, Traits und Preis. Bezahlbarkeit wird vor dem Kauf angezeigt.
- Hunter-Karussell in Details, Loadout und Lager; drei visuelle Teamplätze.
- Waffenkarussell im Arsenal mit Großansicht, Munition, Magazin, Kontrolle, Distanzwerten, Beschreibung und Preis. Such-/Kategorie-/Qualitäts-/Gruppenfilter, Sortierung und Lagerfilter.
- Große Waffenslots, getrennte Tool-/Consumable-Auswahl, acht gemeinsame Extraslots ohne neue Kapazitätsgrenzen.
- Händlerkauf ins Lager; kostenloses Ausrüsten vorhandener Gegenstände; alter Besitz bleibt beim Wechsel erhalten. Verkauf mit ausdrücklicher Bestätigung.
- Trait-Anzeige mit bestehenden Grenzen: 15 Traits, 24 Gewicht, fünf schwere und zwei Mythic-Traits.
- Missionsübersicht mit Loadouts, Teamstärke als Orientierung, Risiko und Bounty-Bonus.
- Neue responsive Gestaltung auf Grundlage bestehender lokaler Illustrationen; vorhandene Kampfanimationen bleiben aktiv.
- Optionaler Browser-Integrationstest, Regeltests und Build-Skript ohne zusätzliche Spielabhängigkeiten.

## Behobene technische Fehler

- Zurück-Navigation war während eines Runs vollständig verborgen. Hub und laufender Run sind nun erreichbar; Personal-/Ausrüstungsänderungen bleiben während der Mission gesperrt.
- Kampf-Fortschritt und gewählte Trait-Belohnungen wurden nicht zuverlässig nach jeder abgeschlossenen KI-Runde gespeichert. Autosave ergänzt.
- Geladene oder importierte Kämpfe erhalten eine neue Laufzeitkennung, damit frühere asynchrone Aktionen nicht in einen neuen Spielstand eingreifen.
- Offene Trait-Angebote werden zusammen mit dem Run gespeichert und nach dem Neuladen wiederhergestellt.
- Ungültige Save-Importe werden vor der Übernahme geprüft; bei Fehlern während der Übernahme wird auf den vorherigen Zustand zurückgegangen.
- Veraltete Versionsanzeige in den Einstellungen, fehlendes Browser-Icon und horizontale Überbreite der mobilen Bereichsköpfe korrigiert.

## Bewusst unverändert / Grenzen

- Rückkaufquote bleibt bei 55 %. Der Wunsch nach unveränderter v0.5-Wirtschaft hat Vorrang vor dem Richtwert 60–70 %.
- Keine neue 4+4-Slotregel: v0.5 erlaubt insgesamt acht flexibel aufgeteilte Extras. Die Trennung ist eine Darstellung, keine Balanceänderung.
- Munition im Händler zeigt vorhandene Munitions-Extras. Kein neues Patronen-, Rabatt- oder Sonderangebotswirtschaftssystem; „Auswahl“ zeigt günstige vorhandene Waffen zu normalen Preisen.
- Hunter und nicht vom Skin-Katalog abgedeckte Waffen behalten ihre bisherigen Illustrationen. Die neuen Waffenmotive werden innerhalb ihrer Gruppe geteilt; es gibt nicht für jede der 150 Waffen ein individuelles Bild.
- v0.5-Schadensregeln bleiben erhalten: Der Basiswert wird begrenzt, danach können im autonomen Kampf Vorgaben/Aktionen zusätzliche Schadenspunkte beitragen. Keine eigenmächtige Neubegrenzung oder Balanceänderung.
- Kein manueller Ersatz der autonomen KI. Waffenwahl, Heilung, Erholung, Zielwahl, Distanz und Angriffe folgen weiterhin dem v0.5-System.
- Browser-Speicherung ist an Browser und Adresse gebunden. Der direkte Dateistart und ein Webserver verwenden unterschiedliche lokale Spielstände.
- Ein Smoke-Test ist kein vollständiger Nachweis sämtlicher Zufallsverläufe oder aller Browsergeräte. Physische Android-Geräte werden durch eine responsive Chrome-Prüfung nicht ersetzt.

## Menübilder & Skins – 11. September 2026

- Elf eigene lokale Menü-Artworks für Hub und Untermenüs; lesbare Text-Overlays und bestehende Navigation erhalten.
- 32 neue Einzelwaffenbilder: acht Motive mit vier kosmetischen Looks. 78 Waffenvarianten und fünf Tools werden abgedeckt.
- Skin-Pfeile mit Vorschau, Namen und Beschreibung in Arsenal, Händler, Loadout und Lager; Waffenbilder in der Teamvorbereitung ergänzt.
- Modulares kosmetisches Save-Feld `weaponSkins` mit `defaultSkin`, `ownedSkins` und `selectedSkin`; Migration alter Spielstände und Validierung ungültiger Auswahl.
- Bisheriger starker Bildbeschnitt in der großen Waffenansicht durch vollständige Darstellung ersetzt.
- Bestehende Waffenwerte, Preise, KI und Assets unverändert; alle Looks zunächst kostenlos.
- Neue Skin-Regressions- und Browsertests; alle bestehenden Tests erneut bestanden. Details und bekannte Grenzen: `ARTWORK.md`.
