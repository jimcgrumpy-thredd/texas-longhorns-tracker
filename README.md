Texas Longhorns football tracker — schedule, roster, news, odds, rankings, and gameday weather.

Built with Next.js (App Router). The home page is server-rendered on every request, pulling live data straight from ESPN's public APIs — no API key needed.

## Data sources (all free, public, no key required)
- Schedule & scores: ESPN site API (`site.api.espn.com`)
- Roster: ESPN site API
- News: ESPN site API
- Odds: ESPN's public odds aggregator (`sports.core.api.espn.com`), which surfaces lines from books like DraftKings and ESPN BET once they're posted (typically ~1-2 weeks before each game — games further out will show "Odds not yet posted", which is expected).
- Rankings: ESPN's AP Top 25 poll endpoint. Shows Texas's current rank and highlights ranked opponents on the schedule. Off-season/preseason it'll reflect the most recent poll available (e.g. last season's final poll) until the next one is released.
- Weather: ESPN's per-game AccuWeather forecast, which only populates within roughly a week of kickoff — games further out show "Forecast not yet available", which is expected.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy

```bash
npm run build
npm start
```

## Auto-deploy

This repo is connected to Vercel — every push to `main` deploys automatically to production.
