// Warband faceted kit for vex: a port of src/ui/facets.ts (+ the scene helpers from card-art.ts) that
// returns vex items instead of SVG strings, so card art can be rigged and animated. Same coordinates,
// same names, so card-art code ports almost line for line.
//
// House rules (from ART.md): flat facets only, no gradients or blur on figures; lit from the viewer's left
// (sh 1.2-1.4 lit, 0.6-0.7 shadow, 0.45-0.5 deep); 3-4 tones per material via sh(); short dark necks hidden
// by collar/beard; focal point in the middle, bottom quarter and top corners unimportant.
//
// Usage: include("facets.vx.js") at the top of an art file. Helpers are globals.

const G = globalThis

// ---- colour
G.ch = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }
G.sh = (h, f) => "#" + ch(h).map((v) => Math.max(0, Math.min(255, Math.round(v * f))).toString(16).padStart(2, "0")).join("")

// ---- primitives (point strings exactly as in card-art.ts: "x,y x,y ...")
const nums = (s) => (Array.isArray(s) ? s : s.trim().split(/[ ,]+/).map(Number))
const sty = (c, o) => (o == null ? c : { fill: c, opacity: o })
G.P = (pts, c, o) => poly(nums(pts), sty(c, o))
G.C = (x, y, r, c, o) => circle(+x, +y, +r, sty(c, o))
G.E = (x, y, rx, ry, c, o, stroke) => ellipse(x, y, rx, ry, { fill: c, opacity: o ?? 1, ...(stroke || {}) })
G.L = (pts, c, w, o) => {
  const p = nums(pts), d = "M" + p.slice(0, 2).join(",") + p.slice(2).reduce((a, v, i) => a + (i % 2 ? "," : " L") + v, "")
  return path(d, { fill: "none", stroke: c, sw: w, cap: "round", join: "round", opacity: o ?? 1 })
}
G.PA = (d, c, o) => path(d, sty(c, o))
G.SP = (d, c, w, o) => path(d, { fill: "none", stroke: c, sw: w, cap: "round", opacity: o ?? 1 })
G.mx = (pts) => nums(pts).map((v, i) => (i % 2 ? v : 100 - v))
G.glow = (x, y, r, c) => [C(x, y, r * 2.4, c, 0.1), C(x, y, r * 1.6, c, 0.22), C(x, y, r, c, 0.95), C(x - r * 0.3, y - r * 0.3, r * 0.35, "#ffffff", 0.8)]
G.bolt = (pts, c, w) => [L(pts, c, w * 4.5, 0.16), L(pts, c, w * 2.2, 0.5), L(pts, c, w, 1), L(pts, "#ffffff", w * 0.4, 0.95)]
G.rnd = (seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647

// ---- placement: the kit's head is drawn in its own 100-unit frame centred near (50,48)
G.hd = (cx, cy, k, rot, ...items) => tf({ x: cx, y: cy, rot, scale: k }, tf({ x: -50, y: -48 }, ...items))
G.scl = (cx, cy, k, ...items) => tf({ x: cx, y: cy, scale: k }, tf({ x: -cx, y: -cy }, ...items))

// ---- the base head: ten facets and no drawn features
G.face = (skin, o = {}) => {
  const lit = skin, hi = sh(skin, 1.08), mid = sh(skin, 0.9), shd = sh(skin, 0.76), deep = sh(skin, 0.6), sock = sh(skin, 0.64)
  const s = []
  if (o.ears === "elf") s.push(P("34,46 20,27 27,44 34,56", lit), P("27,44 20,27 30,40", hi), P("67,46 82,29 75,45 66,56", shd), P("75,45 82,29 71,42", deep))
  else if (o.ears !== "none") s.push(P("33,46 29,48 30,56 34,58", mid), P("67,46 71,48 70,56 66,58", deep))
  s.push(
    P("33,38 40,27 52,24 54,40 40,42", hi), P("52,24 63,28 68,40 60,42 54,40", mid),
    P("33,38 40,42 36,43 37,48 33,54", lit), P("36,43 47,42 46,47 37,48", sock), P("53,42 64,43 63,48 54,47", deep),
    P("37,48 46,47 46,55 40,60 33,54", lit), P("54,47 63,48 68,40 67,52 62,64 56,60 54,55", shd),
    P("47,42 50,42 49,55 46,55", hi), P("50,42 53,42 54,55 50,57 49,55", mid), P("46,55 50,57 54,55 51,59 47,58", deep),
    P("40,60 46,55 47,58 51,59 54,55 56,60 51,65", mid), P("33,54 40,60 51,65 51,72 40,66", lit),
    P("56,60 62,64 51,72 51,65", shd), P("40,66 51,72 46,71", deep, 0.5))
  return s
}
// Simple almond eye (ART.md: lighter skin over the socket first, dark iris, highlight). Kit-frame coords.
G.eye = (x, y, skin, iris = "#2a1c3a", w = 4) => [
  P(`${x - w},${y - 1.6} ${x + w},${y - 1.6} ${x + w},${y + 1.6} ${x - w},${y + 1.6}`, sh(skin, 0.92)),
  P(`${x - w * 0.8},${y} ${x},${y - 1.2} ${x + w * 0.8},${y} ${x},${y + 1.1}`, "#efe9e2"),
  C(x + 0.3, y, 0.95, iris), C(x - 0.1, y - 0.4, 0.3, "#ffffff", 0.9)]

G.neck = (skin) => [P("43,66 58,64 60,86 42,86", sh(skin, 0.86)), P("43,66 58,64 52,76", sh(skin, 0.58)), P("52,76 58,64 60,86", sh(skin, 0.7))]
G.torso = (c) => [P("0,120 4,98 26,84 44,80 50,96 50,120", c), P("50,120 50,96 56,80 74,84 96,98 100,120", sh(c, 0.72)),
  P("4,98 26,84 22,106", sh(c, 1.14)), P("74,84 96,98 80,108", sh(c, 0.58)), P("44,80 56,80 54,120 46,120", sh(c, 0.86))]
G.cloak = (c) => [P("0,120 0,96 20,76 80,76 100,96 100,120", sh(c, 0.7)), P("0,96 20,76 30,80 6,104", c), P("80,76 100,96 94,104 70,80", sh(c, 0.5))]
G.hood = (c) => ({
  back: [P("23,48 29,20 50,9 71,18 79,46 77,72 67,84 33,84 23,72", c), P("23,48 29,20 36,24 30,44 32,66 23,72", sh(c, 1.22)),
    P("71,18 79,46 77,72 68,66 70,44 64,23", sh(c, 0.62)), P("30,44 36,24 50,17 64,23 70,44 68,66 60,74 40,74 32,66", sh(c, 0.34))],
  front: [P("30,44 36,24 50,17 64,23 70,44 62,35 50,30 38,35", sh(c, 0.82)), P("30,44 36,24 50,17 50,30 38,35", sh(c, 1.05)),
    P("33,38 40,27 52,24 63,28 68,40 67,50 33,50", "#06080a", 0.5)],
})
