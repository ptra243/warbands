---
name: vex
description: Draw or animate Warband unit art in vex (rigs, keyframes, particles). Use when asked to animate a unit, add idle/attack motion, rank poses, or draw a new unit in vex.
---

# Warband art in vex

1. Read `ART.md` first, especially "Animation". Its rules beat anything below.
2. Read `tools/vex/SKILL.md` and `tools/vex/reference.md` for the DSL. If `tools/vex` is empty, run `git submodule update --init && npm --prefix tools/vex install`.
3. Start each art file with `include("facets.vx.js")`. The kit has the same helpers as `src/ui/facets.ts` (`P`, `C`, `L`, `sh`, `face`, `hd`, `glow`, `bolt`, `rnd`), in card coordinates (0..100, wide tiles -45..145). Copy existing `card-art.ts` drawing code rather than redrawing it.
4. Keep the layers apart: `backdrop()`, the rig (figure), and effects drawn per frame.
5. Build with `npm run art:vex -- art/vex/<unit>.vx.js` and look at the frames in `art/out/vex/anims/` at real tile size, cropped to the tile window. Fix what you see before showing it.
6. Show the result as a GIF or MP4 and list the weak spots plainly.

Known vex quirks: ease names are camelCase (`inOut`); `dash` takes an array; `anim` has no `loop` option; art files cannot `import`, so shared helpers go on `globalThis` and are loaded with `include`.
