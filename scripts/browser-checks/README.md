Optional real-browser checks (Python + Playwright, `pip install playwright && playwright install chromium`).
Start the app (`npm run dev`), then from this folder: `python3 e2e_main.py`, `python3 e2e_planner.py`, `node geo_check.js`.
They use the seeded demo login and Chromium's emulated geolocation (a real navigator.geolocation call). Map tiles are stubbed.
