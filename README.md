# Eden

A single-file lunar-expedition game: manage the launch campaign, fly the landing,
drill the first ice, then run the colony in real time under an astronomically
accurate polar sky. Built entirely with three.js r128 + Web Audio in one HTML file.

## Quick start

    ./build.sh            # -> dist/eden.html (open it, or serve dist/ for phone testing)
    test/run-all.sh       # build + syntax/id audit + balance sims + headless screenshots
    ./build.sh --bump     # bump SURVEY BUILD patch version, then build

The screenshot stage needs playwright + its Chromium (`npm i -g playwright &&
npx playwright install chromium`); it auto-skips when they're absent. Shots land
in `test/visual/out/` for eyeballing.

## Layout

    src/parts/01…07   ordered source (concatenated in filename order)
    src/tail.html     closing tags
    test/             structural checks + headless balance sims (node, no deps)
    test/visual/      playwright screenshot QA (vendored three.js; network-free)
    dist/             build output (gitignored)
    CLAUDE.md         project brief for Claude Code — constraints, conventions, tunables

## Dropping into an existing repo

This repo IS the workspace root — `build.sh`, `src/`, `test/`, and `CLAUDE.md` sit at
the top level, and `dist/` is ignored by the root `.gitignore`. Claude Code picks up
`CLAUDE.md` automatically when working anywhere in the repo.
