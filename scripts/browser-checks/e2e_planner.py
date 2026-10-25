import sys, re; sys.path.insert(0, "/home/claude/e2e")
from common import *
from playwright.sync_api import sync_playwright
BASE="http://localhost:5173"; results=[]
def check(n, ok, d=""):
    results.append(ok); print(("PASS " if ok else "FAIL ")+n+(f"  [{d}]" if d else ""))
with sync_playwright() as p:
    b, ctx, page = setup(p); login(page)
    api = ctx.request
    fields = api.get(BASE+"/api/fields").json()["fields"]; zones = api.get(BASE+"/api/zones").json()["zones"]
    f = next(x for x in fields if x["name"]=="E2E Location Field"); zs = sorted([z for z in zones if z["fieldId"]==f["id"]], key=lambda z:z["name"])
    page.goto(BASE+"/fertilizer-planner"); page.wait_for_timeout(1000)
    sel = page.locator("select"); 
    check("field dropdown lists real saved fields", page.locator("select").first.locator("option").count() >= 3)
    check("zone dropdown disabled until a field is chosen", page.locator("select").nth(1).is_disabled())
    page.locator("select").first.select_option(label="E2E Location Field")
    check("zone dropdown lists the field's 4 real zones", page.locator("select").nth(1).locator("option").count() == 5)
    page.locator("select").nth(1).select_option(index=1); page.wait_for_timeout(600)
    check("missing soil data is stated explicitly", page.get_by_text(re.compile("No soil test recorded for")).count()==1)
    # record a real soil sample for zone 1 and a whole-field one via backend
    r = api.post(BASE+"/api/soil", data={"fieldId":f["id"],"zoneId":zs[0]["id"],"samplingDate":"2026-10-01","ph":7.4,"nitrogen":180,"phosphorus":14,"potassium":220})
    check("soil sample saved for zone 1", r.status==201, str(r.status))
    page.locator("select").nth(1).select_option(index=2); page.wait_for_timeout(500)
    page.locator("select").nth(1).select_option(index=1); page.wait_for_timeout(800)
    t = page.locator("dl").inner_text() if page.locator("dl").count() else ""
    check("zone 1 shows its saved values (pH 7.4, N 180)", "7.4" in t and "180" in t, t.replace("\n"," ")[:80])
    check("values labelled user-entered / unverified", page.get_by_text(re.compile("not verified them against a laboratory")).count()==1)
    page.locator("select").nth(1).select_option(index=2); page.wait_for_timeout(800)
    check("switching zone refreshes: zone 2 has no sample -> warning, old values gone", page.get_by_text(re.compile("No soil test recorded")).count()==1 and page.locator("dl").count()==0)
    api.post(BASE+"/api/soil", data={"fieldId":f["id"],"samplingDate":"2026-09-01","ph":6.1})
    page.locator("select").nth(1).select_option(index=3); page.wait_for_timeout(900)
    check("whole-field fallback flagged as not zone-specific", page.get_by_text(re.compile("No sample was recorded for this specific zone")).count()==1)
    # save a plan, selection retained
    page.locator("select").nth(1).select_option(index=1)
    page.get_by_label(re.compile("Nitrogen rate")).fill("60"); page.get_by_label(re.compile("Phosphorus rate")).fill("30"); page.get_by_label(re.compile("Potassium rate")).fill("30")
    page.get_by_label("Application date").fill("2026-11-01")
    page.get_by_role("button", name="Save plan").click(); page.get_by_text("Zone nutrient quantities saved.").wait_for(timeout=6000)
    check("plan saved; field+zone selection retained", page.locator("select").nth(1).input_value()==zs[0]["id"])
    check("plans list scoped to selected zone", page.get_by_role("heading", name=re.compile("Saved plans for")).count()==1)
    # soil page dropdown + error state
    page.goto(BASE+"/soil-health"); page.wait_for_timeout(800)
    check("soil page field dropdown populated", page.locator("select").first.locator("option").count()>=3)
    # permission denied
    b2, ctx2, pg2 = setup(p, grant=False); login(pg2); pg2.goto(BASE+"/field-mapping"); pg2.wait_for_selector(".leaflet-container")
    pg2.get_by_role("button", name="My Current Location").click()
    pg2.get_by_role("alert").filter(has_text="denied").wait_for(timeout=8000)
    check("denied permission -> clear message, no marker", pg2.locator(".current-location-marker").count()==0)
    # mobile menu
    pg2.set_viewport_size({"width":390,"height":800}); pg2.reload(); pg2.wait_for_timeout(600)
    pg2.get_by_role("button", name="Open navigation menu").click()
    pg2.get_by_role("dialog").get_by_role("link", name="Soil Health").click(); pg2.wait_for_url(re.compile(".*/soil-health"))
    check("mobile menu opens and navigates", pg2.get_by_role("dialog").count()==0)
    b2.close(); b.close()
print(f"{sum(results)}/{len(results)} passed"); sys.exit(0 if all(results) else 1)
