import sys, re, json; sys.path.insert(0, "/home/claude/e2e")
from common import *
from playwright.sync_api import sync_playwright, expect

BASE = "http://localhost:5173"
LAT, LON = 11.5000, 77.9000
results = []
def check(name, ok, detail=""):
    results.append((name, bool(ok), detail)); print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail else ""))

with sync_playwright() as p:
    b, ctx, page = setup(p, LAT, LON, accuracy=12)
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))
    login(page)
    page.goto(BASE + "/field-mapping"); page.wait_for_selector(".leaflet-container"); page.wait_for_timeout(800)

    # ---- 1. My Current Location (real mouse click, real navigator.geolocation)
    btn = page.get_by_role("button", name="My Current Location")
    check("locate button receives pointer events", btn.evaluate("e => getComputedStyle(e).pointerEvents") != "none")
    bx = btn.bounding_box(); page.mouse.click(bx["x"]+bx["width"]/2, bx["y"]+bx["height"]/2)
    page.wait_for_selector(".current-location-marker", timeout=8000); page.wait_for_timeout(1200)
    check("exactly one current-location marker", page.locator(".current-location-marker").count() == 1)
    check("map zoomed to street level (17)", tile_zoom(page) == 17, f"zoom={tile_zoom(page)}")
    mk = page.locator(".current-location-marker").bounding_box(); mp = page.locator(".leaflet-container").bounding_box()
    dx = (mk["x"]+mk["width"]/2) - (mp["x"]+mp["width"]/2); dy = (mk["y"]+mk["height"]/2) - (mp["y"]+mp["height"]/2)
    check("marker is at map centre (map centred on GPS fix)", abs(dx) < 6 and abs(dy) < 6, f"offset=({dx:.1f},{dy:.1f})px")
    page.locator(".current-location-marker").click(); page.wait_for_selector(".leaflet-popup-content")
    pop = page.locator(".leaflet-popup-content").inner_text()
    check("popup shows the exact emulated coordinates", f"{LAT:.6f}" in pop and f"{LON:.6f}" in pop, pop.replace("\n"," | ")[:90])
    check("button click did not add a boundary vertex", page.locator(".vertex-marker").count() == 0)
    page.keyboard.press("Escape")

    # ---- 2. Draw a boundary around the location
    page.select_option('select[name="farmId"]', index=1)
    page.fill('input[name="name"]', "E2E Location Field")
    page.get_by_role("button", name="Draw Field Boundary").click(); page.wait_for_timeout(500)
    mp = page.locator(".leaflet-container").bounding_box(); cx, cy = mp["x"]+mp["width"]/2, mp["y"]+mp["height"]/2
    clicks = [(-110,-90),(115,-85),(120,95),(-105,100)]
    zs, offs = [], []
    for dx, dy in clicks:
        page.mouse.click(cx+dx, cy+dy); page.wait_for_timeout(500); zs.append(tile_zoom(page))
    vs = page.locator(".vertex-marker")
    check("4 clicks created 4 vertices", vs.count() == 4, f"count={vs.count()}")
    check("zoom stayed at 17 while drawing", set(zs) == {17}, f"zooms={zs}")
    err = []
    for i,(dx,dy) in enumerate(clicks):
        bb = vs.nth(i).bounding_box(); err.append(((bb["x"]+bb["width"]/2)-(cx+dx), (bb["y"]+bb["height"]/2)-(cy+dy)))
    check("vertices stay exactly where clicked (map did not move)", all(abs(a)<4 and abs(c)<4 for a,c in err), f"max err={max(max(abs(a),abs(c)) for a,c in err):.1f}px")
    page.get_by_role("button", name="Finish Drawing").click()
    check("polygon validated", page.get_by_text(re.compile("Boundary validated")).count() == 1)
    page.get_by_role("button", name="Save Field Boundary").click()
    page.get_by_text("Field boundary saved successfully.").wait_for(timeout=8000)
    check("field boundary saved via backend", True)

    # ---- 3. Reload and display saved boundary
    page.reload(); page.wait_for_selector(".leaflet-container"); page.wait_for_timeout(1200)
    card = page.get_by_role("button", name=re.compile("E2E Location Field"))
    check("saved field listed after refresh", card.count() == 1)
    card.click(); page.wait_for_timeout(1200)
    check("boundary polygon + 4 vertices rendered after refresh", page.locator(".vertex-marker").count() == 4 and page.locator("path.leaflet-interactive, svg path").count() > 0)
    page.screenshot(path="/tmp/e2e_field_saved.png")

    # ---- 4. Management zones: generate grid, clipped to field
    page.get_by_role("button", name="Management Zone mode").click()
    page.get_by_label("Choose field").select_option(label="E2E Location Field")
    page.get_by_label("Grid rows (1–20)").fill("2"); page.get_by_label("Grid columns (1–20)").fill("2")
    page.get_by_role("button", name="Preview grid zones").click()
    page.get_by_text(re.compile("Previewed 4 clipped zones")).wait_for(timeout=8000)
    check("grid preview generated 4 clipped zones", True, page.get_by_text(re.compile("Previewed 4")).inner_text()[:100])
    page.get_by_role("button", name="Save previewed zones").click()
    page.get_by_text("4 management zones saved.").wait_for(timeout=8000)
    check("4 zones saved via backend", True)
    page.reload(); page.wait_for_selector(".leaflet-container")
    page.get_by_role("button", name="Management Zone mode").click()
    page.get_by_label("Choose field").select_option(label="E2E Location Field"); page.wait_for_timeout(1200)
    cards = page.locator("article")
    check("zones restored after refresh", cards.count() == 4, f"cards={cards.count()}")
    # selection: click a zone polygon ON THE MAP
    polys = page.locator("path.leaflet-interactive")
    check("zone outlines visible on map", polys.count() >= 4, f"paths={polys.count()}")
    cards.nth(1).click()
    check("zone card selection highlights it", cards.nth(1).get_attribute("aria-current") == "true")
    # click zone polygon on the map -> selects matching zone
    pb = polys.nth(0).bounding_box()
    page.mouse.click(pb["x"]+pb["width"]/2, pb["y"]+pb["height"]/2); page.wait_for_timeout(400)
    sel = [i for i in range(4) if cards.nth(i).get_attribute("aria-current") == "true"]
    check("clicking a zone on the map selects one zone", len(sel) == 1, f"selected={sel}")
    page.screenshot(path="/tmp/e2e_zones.png")
    check("no uncaught page errors", not errs, "; ".join(errs[:2]))
    b.close()

bad = [r for r in results if not r[1]]
print(f"\n{len(results)-len(bad)}/{len(results)} checks passed"); sys.exit(1 if bad else 0)
