import re, base64
PNG = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==")

def setup(p, lat=11.5000, lon=77.9000, accuracy=15, grant=True):
    b = p.chromium.launch()
    ctx = b.new_context(
        viewport={"width": 1400, "height": 1000},
        geolocation={"latitude": lat, "longitude": lon, "accuracy": accuracy},
        permissions=["geolocation"] if grant else [],
    )
    ctx.route(re.compile(r"https://[a-c]\.tile\.openstreetmap\.org/.*"),
              lambda r: r.fulfill(status=200, content_type="image/png", body=PNG))
    page = ctx.new_page()
    return b, ctx, page

def login(page, base="http://localhost:4173"):
    page.goto(base + "/login")
    page.fill('input[type="email"]', "demo@agricotton.ai")
    page.fill('input[type="password"]', "demo1234")
    page.click('button[type="submit"]')
    page.wait_for_url(re.compile(r".*/dashboard"), timeout=15000)

def tile_zoom(page):
    return page.evaluate("""() => {
      const counts = {};
      document.querySelectorAll('.leaflet-tile').forEach(t => {
        const m = /\\/(\\d+)\\/(\\d+)\\/(\\d+)\\.png/.exec(t.src); if (m) counts[m[1]] = (counts[m[1]]||0)+1; });
      const k = Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0];
      return k === undefined ? null : +k; }""")
