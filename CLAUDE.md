# Eden — lunar expedition game

Single-file HTML game (three.js + Web Audio, no build deps, no server) covering the
first years of a lunar base: launch campaign management, a hand-flown landing, an
ice traverse, a real-time colony sim, and a first-lunar-night survival vignette.
Current: **SURVEY BUILD 0.14.0**, five chapters + interlude + chapter select.
Ch.5 is a first playable pass — candidates for deepening: live load-shedding
controls, night EVAs, a proper astro()-driven night length.

## Working on this project

- Source of truth is `src/parts/01…07` in filename order. `./build.sh` concatenates
  them + `src/tail.html` into `dist/eden.html`. **Never edit dist/ directly.**
- **Every change that ships bumps the version**: `./build.sh --bump` (patch), or edit
  `EDEN_BUILD` in `02-data.js` by hand for minor/major. It renders as
  "SURVEY BUILD x.y.z" bottom-left of the title menu (`#vTag`).
- **Run `test/run-all.sh` after every change.** The balance sims are not optional:
  three separate design failures (an unwinnable water economy, morale silently
  capping food, fatigue equilibrium delaying the greenhouse past year-end) were
  caught by these sims before ever reaching a device.
- The last run-all stage is `test/visual/run.sh`: playwright drives the built game
  headless (boot tap → title → archive → every chapter entry), saves screenshots to
  `test/visual/out/`, and fails on console/page errors or a blank canvas. It serves
  the vendored `test/visual/vendor/three-r128.min.js` in place of the cdnjs fetch,
  so it runs network-free; it auto-skips when playwright isn't installed. **Look at
  the shots** after visual changes — the assertions only catch blank/errored scenes,
  not ugly ones.
- Pure-block markers `/* @c4-start */ … @c4-end`, `@c4rt-*`, `@c5-*`, `@arch-*` fence
  DOM-free logic (colony economics, astronomy/crew accrual, archive history roller).
  Tests extract code via these markers — keep them intact and keep those blocks pure
  (no DOM, RNG injected as a parameter).

## Hard platform constraints (from the claude.ai artifact heritage)

- three.js **r128 only** (cdnjs pin in 01-shell). No OrbitControls, no
  CapsuleGeometry (r142+) — use Cylinder/Sphere/custom.
- **No localStorage/sessionStorage**, no `<form>` tags. State lives in `gameState`.
- Web Audio must unlock behind the boot "Tap to initialize" gesture
  (`ensureAudio()` pattern + standing resume listeners). Don't create AudioContext
  before that tap.
- Mobile-first: 44px minimum touch targets, `dpr ≤ 2`, portrait-friendly layout.

## Architecture map

| Part | Contents |
|---|---|
| 01-shell.html | All CSS + DOM + opening `<script>` (intentionally unbalanced tag; tail closes it) |
| 02-data.js | `EDEN_BUILD`, SITES/BACKGROUNDS/MODULES tables, `newGameState()`, NPCS voice map |
| 03-audio.js | One 72 BPM transport (title runs 85), layer mixes per scene, SFX, beat-locked alarm system, TTS/blip voice |
| 04-earth-launch.js | Earth textures, orbital cutscene, launch site, 2031 rocket (booster+upper groups), staging, world-space plume, launch-sky star shader |
| 05-lunar-scene.js | Cabin + moon-window scenes, crew rigs, lunar terrain (`terrainH` gameplay profile at z=0; `terrainH3`/`wildH`/`CRATERS` 3D heightfield around it), horizon rings, lander, particle pools, `terraSun`/`terraAmb`/`earthBall` handles |
| 06-chapter-one.js | Ch.1 management game, dialog engine, `go()` scene router + `mixMap`, settings, `resetGame()` |
| 07-chapters-2-5.js | Cutscenes, Ch.2 lander, Ch.3 call + traverse, Ch.4 colony (astronomy, crew, econ), Ch.5 long night (`C5`/`N5`), Crew Archive, frame loop, boot |

One continuous `gameState` flows through every chapter; earlier choices surface as
flags (`waivedAnomaly`, leader-call deals, payloads, background) consumed by later
chapters. Scene transitions go through `go(name)`; audio follows via `mixMap`.

## Key tunables (grep the name)

- Ch.2 lander: `GRAV/THRUST/ROT/BURN`, pad geometry `PAD_X/PAD_TOP/PAD_HALF`
- Ch.3 traverse: `B3` object (drive/heater/drill economy), alarm thresholds in `updateRoverHud`
- Ch.5 night: `C5` object (drains, leak/EVA/blackout numbers) in the `@c5-*` pure
  block, pacing `SOL5_SEC=14`, beats in `N5_BEATS`
- Ch.4 colony: `C4` object (rates, ledger masses, project costs), `CREWD` skills,
  shift length `4.1` in `accrueSol`, `SOL_SEC=10` (real seconds per sol at 1×),
  astronomy in `astro()` (synodic 29.5306 d, draconic 27.2122 d, rim horizon geometry)
- Alarm musicality: `setAlarmLevels` buses in 03-audio (cold/battery/slope reuse the
  descent V/S / H/S / tilt voices)
- Terrain (05): `terrainH(x)` is the gameplay truth on the z=0 line — **never change
  it without re-running the sims**. Visuals live in `wildH`/`terrainH3` (corridor
  blend `smooth(16,120,|z|)`), `CRATERS` (min radius ≥ ~3 grid cells or they alias
  to spikes), `terrainPatch` grids (7 m fine / 34 m coarse, coarse dropped 2.5 m),
  `buildHorizon` rings. Keep patch cells square — anisotropic cells sliver into
  teeth at grazing sun angles.

## Editing gotchas (hard-won)

- The file mixes **literal unicode** (°, —) in older strings and **\uXXXX escapes**
  in later-inserted ones — both valid at runtime; when string-matching, try both.
- Constant lists are comma-packed (`,RIG:210,`) — anchor edits with the comma, not
  a leading space.
- Each JS part is individually brace/paren balanced (01 + tail are the only
  intentionally partial files). A quick per-part balance scan catches truncated edits.

## Open feel-test items (need eyes/thumbs, not sims)

SOL_SEC pacing at 1×; alarm mix audibility on phone speakers; slope-ping thresholds
on the bowl walls; booster tumble rate; leader TTS voice distinctness; forged-history
toast length on narrow screens; whether cold-jumping into Ch.4 via the Archive wants
a one-beat roster-brief dialog.

## Suggested setup in Claude Code

- `python3 -m http.server -d dist 8080` and test from a phone on LAN.
- Screenshot QA lives in `test/visual/` (runs as part of run-all). For ad-hoc visual
  debugging beyond the fixed shot list, drive `dist/eden.html` with playwright the
  same way `test/visual/shots.mjs` does (route `**/three.min.js` to the vendored copy).
