# Repair summary

Root causes fixed
- My Current Location was unclickable: buttons were inside `.leaflet-top` (pointer-events:none). Now in a `.leaflet-control` with propagation disabled.
- Drawing broke: MapViewport re-fitted on every vertex/render. Now re-frames only when `fitKey` changes. Status text/controls no longer block map clicks; popups close when drawing starts.
- Vertex markers used Leaflet's default image icon (fragile with bundlers) -> CSS divIcons.
- Fertilizer Planner showed no soil data -> shows the selected zone's real saved soil values, whole-field fallback flagged, or "no soil test recorded". No recommendations are invented.
- Soil/Planner loaders swallowed errors -> per-resource error + loading + empty states, Retry.
- Mobile Menu button had no handler -> working drawer. Bell disabled (no notifications backend).
- Server updateZone mutated memory before DB save; zone handlers classified DB errors by regex -> validation and persistence separated; DB failures are 500.
- Server silently ran memory-only -> /api/health reports `persistence`; UI warns.
- Zone selection on map/cards added. ~1000 lines of unreachable legacy pages removed from App.tsx.

Files: client/src/{App.tsx, components/{MapEditor,MappingWorkspace,Layout,ZoneSoilSummary}.tsx, components/MapEditor.test.tsx, lib/{geolocation,soilSelection}.ts, lib/{geolocation,soilSelection}.test.ts},
server/src/{index.ts, index.test.ts, controllers/zoneController.ts}, .env.example, .gitignore, scripts/browser-checks/*
Baseline is git commit "baseline: uploaded project"; work is on branch `repair`.
