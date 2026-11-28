// Archmage (Humans, 2 slots, 5 cost) in vex: the approved card-art.ts drawing, rigged and animated.
// Ranks: 1★ grounded, 3 orbs · 2★ glowing array, 5 orbs · 3★ floating, 4 orbs + 3-orb crown. See ART.md "Animation".
include("facets.vx.js")

const robe = "#6a3fa8", cloakC = "#3d2470", hat = "#4d2c8a", gold = "#d8b24a",
  beard = "#e6e2ee", skin = "#d2ad92", wood = "#8a6a44", ink = "#2a1c3a"
const mix = (a, b, t) => "#" + ch(a).map((v, i) => Math.round(v + (ch(b)[i] - v) * t).toString(16).padStart(2, "0")).join("")

// Per rank: spell colour, pose, orbs, floor.
const RANKS = {
  1: { orb: "#ffb8f5", lift: 4, scale: 1, cloakRot: -16, cloakScale: 0.92, ring: 3, wobble: 1, crown: 0, rune: 0.35, light: 0.08, flare: false, eyes: false },
  2: { orb: "#9fd0ff", lift: -2, scale: 1, cloakRot: 0, cloakScale: 1, ring: 5, wobble: 0, crown: 0, rune: 0.8, light: 0.15, flare: true, eyes: false },
  3: { orb: "#ffcf5a", lift: -7, scale: 0.88, cloakRot: 10, cloakScale: 1.14, ring: 4, wobble: 0, crown: 3, rune: 1, light: 0.24, flare: true, eyes: true },
}

// ---------------------------------------------------------------- backdrop
// Cooler, darker sky (blue-black) so the warm purple figure separates from it. Moon moved inside the tile.
const r0 = rnd(3)
const STARS = Array.from({ length: 56 }, () => [r0() * 190 - 45, r0() * 58, 0.25 + r0() * 0.5, 0.25 + r0() * 0.5])
const backdrop = () => [
  P("-45,0 145,0 145,100 -45,100", "#0a0b1c"),
  P("-45,0 80,0 -45,78", "#151838"),
  P("-45,62 145,46 145,72 -45,72", "#22285a", 0.45),
  STARS.map(([x, y, s, o]) => C(x, y, s, "#ffffff", o)),
  C(108, 15, 16, "#cdd6f5", 0.05), C(108, 15, 6, "#e6ebff", 0.85), C(110.6, 13.2, 5.4, "#0c0e22"),
  P("-45,68 -30,63 -14,69 0,70 14,65 30,69 46,63 62,68 80,62 100,67 118,62 134,68 145,64 145,76 -45,76", "#131633"),
  P("115,71 115,51 117,51 117,47 121,41 125,47 125,51 127,51 127,71", "#131633"), C(121, 55, 0.8, "#ffd98a", 0.9),
  P("-34,71 -34,58 -31,54 -28,58 -28,71", "#131633"),
  P("-45,73 145,71 145,100 -45,100", "#09091a"),
]
const runeCircle = (orb, power, spin) => [
  E(50, 87, 40, 9, "#141327"),
  E(50, 87, 40, 9, "none", 1, { stroke: "#2c2d52", sw: 0.8 }),
  E(50, 87, 31, 6.5, "none", 0.3 + 0.6 * power, { stroke: orb, sw: 0.7 }),
  E(50, 87, 24, 5, "none", 0.2 + 0.4 * power, { stroke: orb, sw: 0.4 }),
  power >= 1 ? E(50, 87, 37, 8, "none", 0.5, { stroke: orb, sw: 0.4, dash: [2, 1.5] }) : [],
  E(50, 87, 31, 6.5, orb, 0.04 + 0.12 * power),
  Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6 + spin, x = 50 + 27.5 * Math.cos(a), y = 87 + 5.7 * Math.sin(a)
    return L(`${x - 1},${y - 0.8} ${x + 1},${y + 0.8}`, orb, 0.6, 0.3 + 0.6 * power)
  }),
  P("24,87 76,87 62,36 38,36", orb, 0.02 + 0.08 * power),     // light rising from the array
]

// ---------------------------------------------------------------- the figure
// Cloak: rim light along the top and outer edges so it reads against the sky.
const wing = (k, rim, rimO) => [
  P("41,40 24,33 5,43 12,50 7,61 18,62 15,73 30,69 39,59", sh(cloakC, k)),
  P("41,40 24,33 5,43 25,46", sh(cloakC, k * 1.4)),
  P("25,46 5,43 12,50 7,61 26,56", sh(cloakC, k * 1.12)),
  L("25,46 26,56 30,69", sh(cloakC, k * 0.6), 0.5, 0.6),
  L("41,40 24,33 5,43", rim, 0.9, rimO),
  L("5,43 12,50 7,61 18,62 15,73", rim, 0.5, rimO * 0.55),
]
const robeShape = (flare) => flare
  ? { all: "40,40 60,40 64,58 66,79 58,76 51,85 44,76 34,80 36,58", shade: "50,40 60,40 64,58 66,79 58,76 51,85",
      lit: "40,40 44,40 41,58 39,77 34,80 36,58", hem: "34,80 44,76 51,85 58,76 66,79" }
  : { all: "40,40 60,40 63,58 61,77 55,74 50,80 45,74 39,77 37,58", shade: "50,40 60,40 63,58 61,77 55,74 50,80",
      lit: "40,40 44,40 41,58 39,77 37,58", hem: "39,77 45,74 50,80 55,74 61,77" }

const robeStars = () => [[44, 64], [56, 68], [46, 72], [58, 61], [42, 49], [57, 50]].map(([x, y], i) =>
  star(x, y, 5, i % 2 ? 1.1 : 1.5, (i % 2 ? 1.1 : 1.5) * 0.45, { fill: gold, opacity: 0.9 }))

const makeRig = (R) => {
  const o = R.orb, rs = robeShape(R.flare), lt = R.light
  return rig({
    body: { pivot: [50, 60], z: 4, items: [
      R.flare ? [] : [P("44,77 48,77 47.5,83 42.5,81.5", "#241640"), P("52,77 56,77 57.5,81.5 52.5,83", "#1a0f30")],
      P(rs.all, robe), P(rs.shade, sh(robe, 0.66)), P(rs.lit, sh(robe, 1.25)),
      L("50,58 50," + (R.flare ? 84 : 79), gold, 0.8, 0.8),
      P("37.5,55 62.5,55 63,58.5 37,58.5", gold), P("50,55 62.5,55 63,58.5 50,58.5", sh(gold, 0.7)),
      C(50, 56.8, 1.6, o),
      L(rs.hem, gold, 0.6, 0.8),
      R.crown ? robeStars() : [],
      P("50,40 60,40 63,58 50,58", o, lt * 0.6)] },                       // spell light on the robe
    cloakL: { parent: "body", pivot: [41, 40], z: 1, items: [tf({ rot: R.cloakRot, scale: R.cloakScale, origin: [41, 40] }, wing(1, mix("#c9b6ff", o, 0.3), 0.9))] },
    cloakR: { parent: "body", pivot: [59, 40], z: 1, items: [tf({ rot: -R.cloakRot, scale: R.cloakScale, origin: [59, 40] }, tf({ x: 100, scale: [-1, 1] }, wing(0.66, mix("#9c88d8", o, 0.4), 0.6)))] },
    armL: { parent: "body", pivot: [40, 42], z: 6, items: [
      L("5,50.5 41,46.5", sh(wood, 0.5), 2.2), L("5,50 41,46", wood, 1.3), L("9,49.5 11,49.3", gold, 2.4),
      glow(4, 50.5, 2.2, o),
      P("39,40 43,47 29,53 24,46", sh(robe, 1.2)), P("24,46 29,53 27,58 22,50", sh(robe, 0.9)),
      L("24,46 29,53", gold, 0.8, 0.9),                                   // cuff
      // fist wrapped round the staff: knuckles lit, underside shaded
      P("24.4,46.4 28.8,45.8 29.4,50.3 25.1,50.9", skin), P("25.1,49.3 29.2,48.8 29.4,50.3 25.1,50.9", sh(skin, 0.7)),
      L("25,47.1 28.5,46.6", sh(skin, 1.15), 0.5, 0.9),
      P("24,46 29,53 22,50", o, lt * 0.7)] },
    armR: { parent: "body", pivot: [60, 42], z: 6, items: [
      P("61,40 57,47 71,53 76,46", sh(robe, 0.66)), P("76,46 71,53 73,58 78,50", sh(robe, 0.5)),
      L("76,46 71,53", gold, 0.8, 0.8),
      // open palm: palm, three tapered fingers, thumb; two tones
      P("72.5,47 78.5,45.5 80.5,49.5 74,51.5", sh(skin, 0.85)), P("76,50.5 80.5,49.5 79.5,48 75,49", sh(skin, 0.68)),
      P("74.8,46.7 76.2,46.4 76.5,42.6 75.5,42.4", sh(skin, 0.92)),
      P("76.6,46.2 78,45.9 79,42.3 78,42", sh(skin, 0.85)),
      P("78.2,45.8 79.4,45.7 80.8,43 79.8,42.6", sh(skin, 0.75)),
      P("80,48.6 81.2,47.5 83.4,46.4 82.6,48.6", sh(skin, 0.8)),
      P("72.5,47 80.5,49.5 76,51", o, lt)] },
    head: { parent: "body", pivot: [50, 40], z: 7, items: [
      // beard in facets: lit left, shadow right, a darker lower tip, a few strands; toned below white
      P("43,33 50,35 50,62 43,47", beard), P("50,35 57,33 57,47 50,62", sh(beard, 0.76)),
      P("46,52 50,50 50,62", sh(beard, 0.88)), P("50,50 54,52 50,62", sh(beard, 0.66)),
      L("46,40 47,52", "#aaa5bd", 0.4, 0.8), L("48.4,44 48.8,57", "#b7b2c8", 0.35, 0.7), L("53,40 52.5,54", "#8d88a2", 0.4, 0.8),
      P("50,35 57,33 57,47 50,62", o, lt),                                 // spell light on the shadow side
      hd(50, 31, 0.34, 0,
        face(skin),
        P("34,56 46,55 50,58 54,55 66,56 60,66 50,62 40,66", beard), P("50,58 54,55 66,56 60,66 50,62", sh(beard, 0.78)),
        L("35,41 46,42.5", beard, 2.6), L("54,42.5 65,41", sh(beard, 0.8), 2.6),
        R.eyes
          ? [C(41.5, 46.5, 4.5, o, 0.25), C(58.5, 46.5, 4.5, o, 0.25), L("38,46.5 45,46.5", o, 1.6), L("55,46.5 62,46.5", o, 1.6),
             L("39.5,46.5 43.5,46.5", "#ffffff", 0.7), L("56.5,46.5 60.5,46.5", "#ffffff", 0.7)]
          : [L("38,46.5 45,46.5", ink, 1.2), L("55,46.5 62,46.5", ink, 1.2)],
        P("50,40 66,40 66,60 50,62", o, lt * 0.8))] },
    hat: { parent: "head", pivot: [50, 24], z: 8, items: [
      P("34,25.5 50,21.5 66,25.5 50,29", sh(hat, 0.6)), P("34,25.5 50,21.5 50,29", sh(hat, 0.9)),
      P("41,24 46,9 55,2 52,9 59,24", hat), P("50,24 50,7 55,2 52,9 59,24", sh(hat, 0.68)),
      P("41,24 46,9 48,10 45,24", sh(hat, 1.35)),
      L("46,9 55,2", mix("#c9b6ff", o, 0.3), 0.5, 0.7),                    // rim light on the hat too
      P("41.5,22 58.5,22 59,24.5 41,24.5", gold), P("50,22 58.5,22 59,24.5 50,24.5", sh(gold, 0.7)),
      C(50, 16, 1.2, gold)] },
  })
}

// ---------------------------------------------------------------- orbs
const orbCore = (o) => mix(o, "#ffffff", 0.6)
const drawOrb = (p, o, k = 1, menacing = false) => {
  const z = p.size * k, a = p.dim ? 0.55 : 1
  if (menacing) return [C(p.x, p.y, z * 3, o, 0.12 * a), C(p.x, p.y, z * 1.6, o, 0.35 * a), C(p.x, p.y, z * 1.15, o, a),
    C(p.x, p.y, z * 0.8, sh(o, 0.22), a), C(p.x - z * 0.25, p.y - z * 0.25, z * 0.3, orbCore(o), 0.9 * a)]
  return [C(p.x, p.y, z * 3, o, 0.1 * a), C(p.x, p.y, z * 1.7, o, 0.25 * a), C(p.x, p.y, z, p.dim ? o : orbCore(o), 0.95 * a),
    C(p.x - z * 0.3, p.y - z * 0.3, z * 0.4, "#ffffff", 0.9 * a)]
}
// Ring orbs; far ones small and dim (behind him), near ones big. `t` 0..1 turns the ring.
const ringOrbs = (R, t, dy, squeeze = 1) => Array.from({ length: R.ring }, (_, i) => {
  const a = (i * 2 * Math.PI) / R.ring + 0.45 + t * 2 * Math.PI, c = Math.cos(-0.2), n = Math.sin(-0.2)
  const w = R.wobble ? 1 + 0.06 * Math.sin(t * 6 * Math.PI + i * 2.1) : 1
  const X = 41 * Math.cos(a) * w * squeeze, Y = 14 * Math.sin(a) * w * squeeze
  const near = Math.sin(a) > 0
  return { x: 50 + X * c - Y * n, y: 47 + dy + X * n + Y * c + (R.wobble ? Math.sin(t * 4 * Math.PI + i) * 1.2 : 0),
    near, dim: !near, size: near ? 2.7 : 1.5, menacing: R.crown > 0 }
})
// 3★ crown: three big orbs in an arc above and beside the hat, crackling between them.
const crownOrbs = (R, t, dy) => R.crown ? [[30, 17], [40, 5], [68, 9]].map(([x, y], i) =>
  ({ x, y: y + dy * 0.4 + Math.sin(t * 2 * Math.PI + i * 2.1) * 1.2, near: true, dim: false, size: 3.1, menacing: true, crown: true })) : []
const crackle = (pts, o, f) => {
  if (pts.length < 2) return []
  const rr = rnd(1 + Math.floor(f / 2) * 7)
  const seg = (a, b) => {
    const mx1 = (a.x * 2 + b.x) / 3 + (rr() - 0.5) * 4, my1 = (a.y * 2 + b.y) / 3 + (rr() - 0.5) * 4
    const mx2 = (a.x + b.x * 2) / 3 + (rr() - 0.5) * 4, my2 = (a.y + b.y * 2) / 3 + (rr() - 0.5) * 4
    return bolt(`${a.x},${a.y} ${mx1},${my1} ${mx2},${my2} ${b.x},${b.y}`, o, 0.35)
  }
  return [seg(pts[0], pts[1]), seg(pts[1], pts[2])]
}
const track = (o, half, dy, power) => tf({ rot: -11.5, origin: [50, 47 + dy] },
  path(`M9,${47 + dy} A41,14 0 0 ${half} 91,${47 + dy}`, { fill: "none", stroke: o, sw: 0.5, opacity: (half ? 0.25 : 0.5) * (0.5 + power / 2), dash: [1.5, 1.5] }))

// ---------------------------------------------------------------- clips
const lifted = (R, [dx, dy]) => [dx, dy + R.lift]
const IDLE = (R) => {
  const amp = R.rank === 1 ? 0.4 : R.rank === 2 ? 1.6 : 2.8
  return {
    body: { move: [[0, lifted(R, [0, 0]), "inOut"], [12, lifted(R, [0, -amp]), "inOut"], [24, lifted(R, [0, 0])]] },
    cloakL: { rot: [[0, 0], [12, R.rank === 1 ? 1 : 5], [24, 0]] }, cloakR: { rot: [[0, 0], [12, R.rank === 1 ? -1 : -5], [24, 0]] },
    // 1★ strains: the staff trembles
    armL: { rot: R.rank === 1 ? [[0, 0], [3, 1.5], [6, -0.5], [9, 1.5], [12, 0], [15, 1.5], [18, -0.5], [21, 1.5], [24, 0]] : [[0, 0], [12, -1.5], [24, 0]] },
    armR: { rot: [[0, 0], [12, 2], [24, 0]] },
    head: { rot: [[0, 0], [12, 1], [24, 0]] }, hat: { rot: [[0, 0], [12, 2.5], [24, 0]] },
  }
}
// Attack: lean back and pull the orbs in (wind-up), snap forward (release + recoil), settle.
const ATTACK = (R) => ({
  body: { move: [[0, lifted(R, [0, 0])], [5, lifted(R, [-2, -2]), "out"], [7, lifted(R, [2, -1]), "out"], [10, lifted(R, [0.5, 0])], [18, lifted(R, [0, 0])]],
    rot: [[0, 0], [5, -5, "inOut"], [7, 4, "out"], [11, 0]] },
  armL: { rot: [[0, 0], [5, 36, "inOut"], [7, -16, "out"], [11, -6], [18, 0]] },
  armR: { rot: [[0, 0], [5, -18], [7, 12, "out"], [18, 0]] },
  cloakL: { rot: [[0, 0], [5, -6], [7, 14, "out"], [18, 0]] }, cloakR: { rot: [[0, 0], [5, 6], [7, -14, "out"], [18, 0]] },
  head: { rot: [[0, 0], [5, -3], [7, 2], [18, 0]] },
  hat: { rot: [[0, 0], [5, -6], [8, 5], [12, -2], [18, 0]] },
})

// ---------------------------------------------------------------- assets
const BOX = { w: 190, h: 100, scale: 3 }
const at3 = (R, ...items) => R.scale === 1 ? items : [scl(50, 92, R.scale, ...items)]

for (const rank of [1, 2, 3]) {
  const R = { ...RANKS[rank], rank }, RIG = makeRig(R), o = R.orb
  const orbsAll = (t, dy) => [...ringOrbs(R, t, dy), ...crownOrbs(R, t, dy)]

  anim(`archmage_${rank}star_idle`, { ...BOX, frames: 24, fps: 12 },
    tf({ x: 45 }, backdrop(),
      (f) => runeCircle(o, R.rune, f.t * (rank === 1 ? 0.15 : 0.6)),
      (f) => at3(R,
        track(o, 1, R.lift, R.rune), ringOrbs(R, f.t / R.ring, R.lift).filter((p) => !p.near).map((p) => drawOrb(p, o, 1, p.menacing)),
        pose(RIG, IDLE(R)),
        track(o, 0, R.lift, R.rune), ringOrbs(R, f.t / R.ring, R.lift).filter((p) => p.near).map((p) => drawOrb(p, o, 1, p.menacing)),
        crackle(crownOrbs(R, f.t, R.lift), o, f.i), crownOrbs(R, f.t, R.lift).map((p) => drawOrb(p, o, 1, true)))))

  // ---- attack: 18 frames
  const N = 18, FIRE = 7
  anim(`archmage_${rank}star_attack`, { ...BOX, frames: N, fps: 14 },
    tf({ x: 45 }, backdrop(),
      (f) => runeCircle(o, Math.min(1, R.rune + (f.i >= 4 && f.i <= 9 ? 0.6 : 0)), f.i * 0.04),
      (f) => {
        const i = f.i
        const squeeze = i < FIRE ? 1 - 0.35 * Math.min(1, i / 5) : 1
        const grow = i < FIRE ? 1 + 0.25 * Math.min(1, i / 5) : 1
        const ring = ringOrbs(R, 0, R.lift, squeeze), crown = crownOrbs(R, 0, R.lift)
        const all = [...ring, ...crown]
        const showHome = i < FIRE || i >= 14
        const reform = i >= 14 ? (i - 13) / 4 : grow
        // flight: each orb arcs up and over to its own lane, staggered half a frame apart, with a fading trail
        const lanes = all.map((_, k) => 20 + (k * 58) / Math.max(1, all.length - 1))
        const posAt = (p, k, tt) => {
          const tx = 120, ty = lanes[k], cx = (p.x + tx) / 2, cy = Math.min(p.y, ty) - 22
          const u = Math.max(0, Math.min(1, tt)), e = u * u * (3 - 2 * u)
          return { x: (1 - e) ** 2 * p.x + 2 * (1 - e) * e * cx + e * e * tx, y: (1 - e) ** 2 * p.y + 2 * (1 - e) * e * cy + e * e * ty }
        }
        const flying = (i >= FIRE && i < 13) ? all.map((p, k) => {
          const tt = (i - FIRE - k * 0.4) / 4.5
          if (tt <= 0) return drawOrb(p, o, 1.15, p.menacing)
          if (tt > 1) return []
          return [0.2, 0.1].map((d, j) => { const q = posAt(p, k, tt - d); return [C(q.x, q.y, p.size * (1.2 - j * 0.3), o, 0.18), C(q.x, q.y, p.size * (0.55 - j * 0.15), orbCore(o), 0.5 - j * 0.15)] })
            .concat(drawOrb({ ...posAt(p, k, tt), size: p.size, dim: false }, o, 1.15, p.menacing))
        }) : []
        const impacts = (i >= 10 && i <= 13) ? all.map((p, k) => {
          const g = (i - 10 - k * 0.4) / 3
          return g < 0 || g > 1 ? [] : [C(120, lanes[k], 2.5 + g * 7, o, 0.5 * (1 - g)), C(120, lanes[k], 1.4 + g * 2.5, "#ffffff", 0.9 * (1 - g))]
        }) : []
        return [
          at3(R,
            track(o, 1, R.lift, R.rune),
            showHome ? ring.filter((p) => !p.near).map((p) => drawOrb(p, o, reform, p.menacing)) : [],
            pose(RIG, ATTACK(R)),
            track(o, 0, R.lift, R.rune),
            showHome ? ring.filter((p) => p.near).map((p) => drawOrb(p, o, reform, p.menacing)) : [],
            showHome && crown.length ? [crackle(crown, o, i), crown.map((p) => drawOrb(p, o, reform, true))] : [],
            i === FIRE ? [C(4, 50.5 + R.lift, 7, o, 0.35), C(4, 50.5 + R.lift, 3.5, "#ffffff", 0.9)] : []),
          at3(R, flying), impacts,
        ]
      },
      particles({ at: [4, 50 + RANKS[rank].lift], burst: 10 + rank * 4, start: FIRE, life: [4, 8], speed: [1.5, 3], angle: [140, 220], drag: 0.12,
        size: [1.4, 0.3], color: [o, "#ffffff"], glow: 2, seed: 2 }),
      particles({ area: [118, 16, 4, 66], burst: 18 + rank * 6, start: 10, life: [4, 8], speed: [1, 2.6], angle: [130, 230], drag: 0.15,
        size: [1.8, 0.3], color: ["#ffffff", o], glow: 2, seed: 4 })))
}
