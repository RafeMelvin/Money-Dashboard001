# Budget Tracker — self-contained edition

A personal finance dashboard (income, expenses, debts, assets, investing, planning)
as a plain multi-file web app. **No build step. No npm. No dependencies** —
open `index.html` and it runs, including straight from `file://`.

## Run it

- **Double-click** `index.html`, or
- serve the folder with any static server/file host.

All data stays in your browser via `localStorage` (key `bta_v1`).
If you used the older single-file edition, your saved data is picked up
automatically on first launch (it migrates from the old `bt_file_v2` key).

## Live stock prices (optional)

1. Get a free API key at https://finnhub.io — sign up (free tier, no card),
   then copy the API key from the dashboard.
2. Open the app: the first-run screen asks for the key (or click the
   &#9881; gear later to add/change/clear it).
3. In an investing account, hit **Refresh prices**. Each holding shows a
   `live` / `manual` chip — click it to toggle that holding between the live
   quote and your manual price. The chip also shows quote age
   ("live · 5m ago").

Your key is stored **only** in this browser (`localStorage` key
`bta_finnhub_key`) and is transmitted **only** to `https://api.finnhub.io`.
Skip the key and everything works with manual prices.

## CSV import

Assets → open an investing account → **Upload CSV**.

- Auto-detects **Fidelity**, **Charles Schwab**, **Vanguard**, and
  **Robinhood** position exports via header aliases (it also skips the
  preamble/summary rows those files include), plus generic
  ticker/shares/price/cost files.
- If the headers aren't recognized, a **column-mapping** screen lets you match
  Ticker / Shares / Price / Cost-per-share to the right columns.
- Import adds new holdings, updates matching tickers, and reports
  added / updated / skipped counts.

Tip: cost basis may come per-share ("Average Cost") or as a total
("Cost Basis Total") — both are handled.

## Debt payments

In the Debts tab, click any credit card **or loan** to expand it. Credit
cards have Transactions and Payments tabs; loans open a payment panel
directly. Logging a payment lowers that debt's balance (and the totals
everywhere); deleting the payment restores it.

## Deploy to GitHub Pages

1. Push this folder's contents to a GitHub repo (repo root).
2. Repo **Settings → Pages** → Source: **Deploy from a branch** →
   branch `main`, folder `/(root)` → Save.
3. The site appears at `https://<username>.github.io/<repo>/`
   (the repo must be **public** on GitHub's free plan).

## Files

| File | What it is |
|---|---|
| `index.html` | Markup, tabs, setup/settings overlays, script tags (plain scripts, no modules) |
| `css/styles.css` | All styling (dark Money Dashboard theme) |
| `js/app.js` | Core app: state, tabs, overview, income/timecard, expenses, debts, assets, planning |
| `js/quotes.js` | Finnhub live quotes + local cache (`BTQuotes`) |
| `js/csv.js` | CSV parsing + brokerage importers (`BTCSV`, plus global `parseCSV`) |
