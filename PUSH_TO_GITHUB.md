# Einmalige GitHub-Verknüpfung

Sobald ein leeres GitHub-Repository `rpg-hunt` existiert:

```bash
git remote add origin https://github.com/<DEIN-LOGIN>/rpg-hunt.git
git push -u origin main
```

Danach ist der normale Ablauf:

```bash
git add .
git commit -m "Beschreibung der Änderung"
git push
```

Die GitHub Action `.github/workflows/validate.yml` führt automatisch `npm test` aus.
