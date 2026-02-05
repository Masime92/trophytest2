
# TrophyHunter Pro (THP_Pro) 🏆

Ein Hardcore-Begleiter für Steam-Completionists. Optimiert für Mobile-Web-App (PWA).

## Features
- **Echte Steam-Integration**: Login via Web API Key und SteamID64.
- **Auto-Sortierung**: Deine Library sortiert nach Fortschritt (Highest First).
- **Missable Warnings**: Warnungen vor verpassbaren Trophäen.
- **KI-Routenplaner**: Generiert optimale Strategien für 100% Completion via Gemini AI.
- **Search-First Navigation**: Schnelles Finden von Spielen in großen Bibliotheken.

## Deployment auf Render.com
1. Erstelle ein neues **Static Site** Projekt.
2. Verbinde dein GitHub Repository.
3. Setze folgende Umgebungsvariable (Environment Variable):
   - `API_KEY`: Dein Google Gemini API Key.
4. Build Command: `npm run build` (falls vorhanden) oder nutze die statische Dateistruktur.
5. Publish Directory: `.` (Projekt-Root).

## Datenschutz
Der Steam API Key wird ausschließlich im lokalen Speicher (`localStorage`) deines Browsers aufbewahrt und niemals an fremde Server (außer Valve/Google via Proxy) übertragen.
