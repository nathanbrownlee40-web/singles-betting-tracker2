# Singles Betting Tracker

A mobile-friendly singles betting tracker that runs as a static website.

## Features

- Dashboard KPI cards
- Cumulative P/L chart
- Monthly P/L chart
- Profit/loss and ROI
- Win rate and average odds
- Current winning/losing streak
- Market performance
- League performance
- Odds-range analysis
- Betting history with filters
- Add/edit/delete bets
- CSV and JSON export
- JSON import
- Betting screenshot OCR import using Tesseract.js
- Local browser storage — no server/database required

## Put it on GitHub Pages

1. Create/open your GitHub repository.
2. Upload these files to the repository root:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `README.md`
3. Commit the files.
4. Open **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Choose the `main` branch and `/ (root)`.
7. Save.
8. GitHub will give you the website address.

## Important

The tracker stores data in the browser's `localStorage`. That means your bets stay on the device/browser where you enter them. Use **Export JSON** regularly as a backup.

Screenshot OCR is intentionally a review step: different bookmakers format screenshots differently, so always check the extracted selection, odds, stake and status before saving.

The app loads Chart.js and Tesseract.js from public CDNs, so the charts/OCR need an internet connection.
