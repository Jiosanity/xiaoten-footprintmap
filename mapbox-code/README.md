# mapbox-code

This folder contains extracted Mapbox-related JavaScript and CSS snippets taken from the `xiaoten-footprintmap` project for reuse in other projects.

Files
- `mapbox-adapter.js`: lightweight adapter that dynamically loads Mapbox GL JS/CSS and exposes two helpers:
  - `window.loadMapboxAdapter()` — ensures Mapbox GL JS/CSS are loaded.
  - `window.renderMapWithMapbox(container, locations, token)` — renders a simple marker/cluster view and popups.
  - Coordinate helpers exported: `window.gcj02towgs84` and `window.wgs84togcj02`.
- `footprintmap-mapbox.css`: CSS needed for popups, photo carousel and the in-page photo viewer. Includes Mapbox popup visual overrides so popups look similar to the original project.
- `local_mapbox_token.example.js`: template for a local token override. Copy to `local_mapbox_token.js` and insert your token. Do NOT commit your real token.
- `mapbox-example.html`: minimal demo page that uses the adapter and CSS.

Usage
1. Copy the `mapbox-code` folder to your project or import the files you need.
2. Provide a Mapbox token:
   - Create `local_mapbox_token.js` from `local_mapbox_token.example.js` and set `window.__MAPBOX_TOKEN_OVERRIDE` to your token, or
   - Pass the token directly to `renderMapWithMapbox` as the 3rd argument.
3. Include `footprintmap-mapbox.css` and `mapbox-adapter.js` in your page and call `loadMapboxAdapter()` then `renderMapWithMapbox()`.

Notes & Legal
- This code was extracted for developer convenience. Mapbox requires proper attribution when using their tiles and SDK. The original project included a dev-only rule to hide Mapbox logo/attribution for local testing — do not remove Mapbox attribution in production unless you have the right to do so and you comply with Mapbox Terms of Service.
- The adapter intentionally leaves image viewer binding responsibilities to host code. If your project uses a different viewer, you can hook popup elements (they are rendered inside an element with class `.amap-info-content`).

If you want me to trim the adapter further (e.g. remove cluster code or footprint-specific UI), or to produce a standalone npm-style package, tell me which parts to keep.
