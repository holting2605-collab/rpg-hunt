# RPG Hunt – Entwicklungsablauf

- `main` soll immer eine spielbare, geprüfte Version enthalten.
- Neue Änderungen kommen zuerst in einen Feature-Branch.
- Vor dem Merge: `npm test` ausführen.
- Danach vollständigen Spielzyklus manuell prüfen: Rekrutierung → Händler → Loadout → Mission → KI-Kampf → Boss → Bounty → Extraction → Save/Reload.
- Keine Cloud-Abhängigkeit in den lokalen Kern einbauen, solange die Offline-Version nicht stabil ist.
