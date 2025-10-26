# 大太刀50本 — Ono-ha Ittō-ryū Kata Quick Reference (PWA)

A fast, offline-capable reference app for the **36 kata (50 techniques)** of 小野派一刀流.
Tap a tile to open a short 3×-speed clip for quick study during practice.

**Demo (GitHub Pages):** _<https://darrell-plant.github.io/itto-ryu-50-pon/>_

---

## Features
- 3×12 **index grid** (portrait-first) with **number + kanji** per kata
- **Clip overlay** with auto-play video and **Prev / Next** navigation
- **Reading (hiragana)** shown under the title on the clip page
- PWA:
  - **Offline shell**, clips cached after first play (if fully fetched)
  - **Update toast** when a new version is available
- **Hash deep links** (e.g. `#06.07`)
- **Keyboard controls:** ← → for Prev/Next, Esc to close clip overlay
- **Swipe gestures:** swipe left/right to navigate, swipe down to close
- **Original videos (720p)** hosted under `/assets/originals/`, cached on-demand for offline use

---

## File Structure
```
/assets/clips/           # 50 technique videos (low-res 320 px, ~5 s, 3× speed)
assets/originals/        # Original full-speed kata videos (720p), cached on-demand
icons/                   # PWA icons (16, 32, 192, 512…)
index.html               # App (single page)
manifest.webmanifest     # PWA manifest
sw.js                    # Service Worker
favicon.ico              # Favicons
```

---

## Kata Data (mapping)
The index uses `kataMeta` inside `index.html` to map kata **numbers → kanji & reading**.
Display uses commas for multi-technique labels (e.g. `06,07`), filenames still use dots (`06.07.mp4`).

---

## Local Development
Serve locally (avoids autoplay/security quirks):
```bash
python3 -m http.server 8080
# then visit http://localhost:8080/
```

Access from phone on same Wi-Fi:
```
http://<your-desktop-LAN-IP>:8080/
```

---

## PWA Notes
- **Install button** intentionally removed to simplify UX.
- **Update flow:** When a new service worker installs, the app shows a **“新しいバージョン”** toast with a **再読み込み** button.
- **Caching:** Videos fetched via HTTP Range (206) are **not cached**; full 200 responses **are** cached.
- On release, bump the cache name in `sw.js`:
```js
const CACHE_NAME = "odachi50-v4";
```

---

## Deploy to GitHub Pages
Already set to serve from the `main` branch (root).
If needed:
```bash
gh api \
  -X POST \
  "repos/{owner}/{repo}/pages" \
  -F "source[branch]=main" \
  -F "source[path]=/"
```

---

## License
MIT (or your choice)

---

## Recent Changes (v0.1.0 → v1.1.2)
v1.2.1  Add dynamic tile scaling controls (+/−5%) and improved responsive grid layout (portrait 3×12, landscape 6×6)
v1.2.0  Media preloader polish: skip-cached, busy guard, Shift+Click force, status indicator
v1.1.0  fix video caching to allow offline use
v1.0.2  remove redundant swipe down
v1.0.1  fix screen jitter
v1.0.0  Stable release: hosted originals + full offline PWA
v0.1.6  add build number footer
v0.1.5  automatic folder reconnect for android devices
v0.1.4  Added ability to link a local folder of original kata videos
v0.1.3  Added keyboard nav and swipe gestures
v0.1.2  update sw cache policy
v0.1.1  Landscape controls fix
v0.1.0  First public demo: grid w/ kanji, overlay, prev/next, update toast, PWA
