// Bone Colossus (Undead, Reborn, 2 slots, 3 cost). On death breaks into two Bone Warriors.
// Hunched short body of fused skeletons, enormous arms (about twice the body's height), green grave-light in the seams.
// Built in halves: left half / right half meet at a glowing seam down the middle, so the death effect can split him.
// Card coordinates: 100x100 card frame; the wide tile shows x -22..122, y 0..82.
include("facets.vx.js")

const bone = "#d9cfb2", rust = "#7a4a2a", earth = "#2a2418", green = "#86ff7a", ink = "#1a1410"
const B = (k) => sh(bone, k)

// ---------------------------------------------------------------- backdrop: burial pit at a battlefield's edge, sickly dawn
const r0 = rnd(11)
const GROUND = 66   // feet stand here: above the bottom quarter, so the slam is visible
const backdrop = () => [
  P("-45,0 145,0 145,100 -45,100", "#0c110f"),
  P("-45,26 145,18 145,46 -45,50", "#1b2a1e"),
  P("-45,40 145,33 145,48 -45,52", "#3a5a34", 0.45),                    // green dawn on the horizon
  C(50, 48, 60, green, 0.04),
  Array.from({ length: 26 }, () => C(r0() * 190 - 45, r0() * 24, 0.25 + r0() * 0.35, "#cfe8d0", 0.2 + r0() * 0.4)),
  P("-45,46 145,40 145,42 -45,48", "#0b0f0c"),
  Array.from({ length: 20 }, (_, i) => {
    const x = -42 + i * 9.5, y = 47 - i * 0.32, lean = (r0() - 0.5) * 3
    return P(`${x},${y} ${x + 0.9},${y} ${x + 1.3 + lean},${y - 9} ${x + 0.45 + lean},${y - 11.5} ${x - 0.4 + lean},${y - 9}`, "#0b0f0c")
  }),
  [[-30, 54, -8], [-10, 52, 6], [108, 50, 9], [126, 52, -6]].map(([x, y, rot]) => tf({ rot, origin: [x, y] },
    P(`${x - 4},${y} ${x - 4},${y - 8} ${x - 2.5},${y - 10.5} ${x + 2.5},${y - 10.5} ${x + 4},${y - 8} ${x + 4},${y}`, "#1c2420"),
    P(`${x},${y} ${x},${y - 10.5} ${x + 2.5},${y - 10.5} ${x + 4},${y - 8} ${x + 4},${y}`, "#141a17"))),
  P("-45,52 145,46 145,100 -45,100", earth),
  P("-45,52 30,50 20,56 -45,60", sh(earth, 1.25)),
  E(50, GROUND + 1, 46, 9, "#140f0b"), E(50, GROUND, 38, 6.5, "#0b0806"),
  E(50, GROUND, 32, 5, green, 0.07),
  [[-20, 78], [8, 86], [96, 80], [118, 88]].map(([x, y]) => [L(`${x},${y} ${x + 5},${y - 1}`, sh(bone, 0.45), 1.2), ngon(x, y, 6, 0.9, sh(bone, 0.5))]),  // scattered bones
]

// ---------------------------------------------------------------- parts (drawn upright, rotated by the rig)
// A bone along a vertical axis: faceted shaft (lit left, shadow right) with knobbed ends.
const boneV = (x, y0, y1, w, k = 1) => [
  ngon(x - w * 0.36, y0 + w * 0.35, 6, w * 0.55, B(1.05 * k)), ngon(x + w * 0.36, y0 + w * 0.35, 6, w * 0.55, B(0.72 * k)),
  ngon(x - w * 0.36, y1 - w * 0.35, 6, w * 0.55, B(1.0 * k)), ngon(x + w * 0.36, y1 - w * 0.35, 6, w * 0.55, B(0.68 * k)),
  P(`${x - w / 2},${y0 + w * 0.6} ${x + w / 2},${y0 + w * 0.6} ${x + w / 2},${y1 - w * 0.6} ${x - w / 2},${y1 - w * 0.6}`, B(0.92 * k)),
  P(`${x},${y0 + w * 0.6} ${x + w / 2},${y0 + w * 0.6} ${x + w / 2},${y1 - w * 0.6} ${x},${y1 - w * 0.6}`, B(0.7 * k)),
  P(`${x - w / 2},${y0 + w * 0.6} ${x - w * 0.2},${y0 + w * 0.6} ${x - w * 0.2},${y1 - w * 0.6} ${x - w / 2},${y1 - w * 0.6}`, B(1.15 * k)),
]
const chainBand = (x, y, w) => [
  P(`${x - w},${y - 1.6} ${x + w},${y - 1.2} ${x + w},${y + 1.4} ${x - w},${y + 1.6}`, rust),
  P(`${x},${y - 1.4} ${x + w},${y - 1.2} ${x + w},${y + 1.4} ${x},${y + 1.5}`, sh(rust, 0.65)),
  Array.from({ length: 3 }, (_, i) => E(x - w * 0.6 + i * w * 0.6, y, 1.2, 1.7, "none", 0.9, { stroke: sh(rust, 1.4), sw: 0.45 })),
]
const skull = (x, y, s, k = 1, eyes = true) => [
  P(`${x - 3 * s},${y - 1 * s} ${x - 2.2 * s},${y - 3.6 * s} ${x},${y - 4.4 * s} ${x + 2.2 * s},${y - 3.6 * s} ${x + 3 * s},${y - 1 * s} ${x + 2.2 * s},${y + 1.8 * s} ${x - 2.2 * s},${y + 1.8 * s}`, B(0.98 * k)),
  P(`${x},${y - 4.4 * s} ${x + 2.2 * s},${y - 3.6 * s} ${x + 3 * s},${y - 1 * s} ${x + 2.2 * s},${y + 1.8 * s} ${x},${y + 1.8 * s}`, B(0.72 * k)),
  P(`${x - 1.8 * s},${y + 1.8 * s} ${x + 1.8 * s},${y + 1.8 * s} ${x + 1.3 * s},${y + 3.4 * s} ${x - 1.3 * s},${y + 3.4 * s}`, B(0.6 * k)),
  P(`${x - 2.1 * s},${y - 1.2 * s} ${x - 0.5 * s},${y - 1.4 * s} ${x - 0.7 * s},${y + 0.5 * s} ${x - 1.9 * s},${y + 0.4 * s}`, ink),
  P(`${x + 0.5 * s},${y - 1.4 * s} ${x + 2.1 * s},${y - 1.2 * s} ${x + 1.9 * s},${y + 0.4 * s} ${x + 0.7 * s},${y + 0.5 * s}`, ink),
  eyes ? [C(x - 1.3 * s, y - 0.4 * s, 0.5 * s, green, 0.85), C(x + 1.3 * s, y - 0.4 * s, 0.5 * s, green, 0.65)] : [],
  P(`${x - 0.4 * s},${y + 0.9 * s} ${x + 0.4 * s},${y + 0.9 * s} ${x},${y + 1.6 * s}`, ink),
]
// a fist: three thick curled fingers with gaps, big knuckle knobs, a skull at its heart, centred on (x, y)
const fist = (x, y, k = 1) => [
  [-3, 0, 3].map((dx, i) => L(`${x + dx * 0.5},${y - 6.5} ${x + dx * 1.2},${y + 1.5}`, B((i < 2 ? 0.95 : 0.7) * k), 2.2)),
  skull(x, y - 2, 0.95, k),
  [-4.4, 0, 4.4].map((dx, i) => {
    const c = B((i === 0 ? 1.05 : i === 1 ? 0.9 : 0.7) * k)
    return [L(`${x + dx},${y + 2.4} ${x + dx * 1.05},${y + 6.5}`, c, 3.2), ngon(x + dx, y + 2.4, 6, 2.1, c), ngon(x + dx * 1.05, y + 6.6, 6, 1.8, sh(c, 0.85))]
  }),
  L(`${x - 6.2},${y - 3} ${x - 7.4},${y + 1}`, B(1.1 * k), 2.6), ngon(x - 7.4, y + 1, 6, 1.7, B(1.1 * k)),
]
const tilt = (deg, cx, cy, ...items) => tf({ rot: deg, origin: [cx, cy] }, ...items)
const armUpper = (x, y0, y1) => [
  tilt(-3, x - 3.6, (y0 + y1) / 2, boneV(x - 3.6, y0, y1, 3.6)),
  tilt(4, x + 3.8, (y0 + y1) / 2, boneV(x + 3.8, y0 + 1.5, y1 - 0.5, 3.3, 0.88)),
  chainBand(x, (y0 + y1) / 2, 6.6)]
const armLower = (x, y0, y1) => [
  tilt(-4, x - 4.8, (y0 + y1) / 2, boneV(x - 4.8, y0, y1 - 1, 3.8)),
  tilt(5, x + 4.8, (y0 + y1) / 2, boneV(x + 4.8, y0 + 1.5, y1 - 2, 3.8, 0.86)),
  boneV(x, y0 + 5, y1 - 5, 2.4, 1.02),
  chainBand(x, y0 + 7, 8), chainBand(x, y1 - 5, 7.4)]

// geometry: shoulders and arm lengths (arms ~2x the body)
const SH = { L: [31, 49], R: [69, 49] }, UP = 25, LOW = 25

const CAGE = "50,44 39,45 33.5,50 34.5,62 39,73 44,77 56,77 61,73 65.5,62 66.5,50 61,45"
const interior = (power = 1) => [
  P(CAGE, "#0b120c"),
  C(50, 61, 14, green, 0.16 * power), C(50, 61, 9, green, 0.3 * power), C(50, 61, 5, "#b8ff9e", 0.55 * power), C(50, 61, 2.4, "#efffe8", 0.85 * power),
]
const torsoHalf = (side) => {
  // side -1 = left (lit), +1 = right (shadow). Mirrored around x=50, lit from the viewer's left.
  const k = side < 0 ? 1 : 0.72, m = (pts) => (side < 0 ? pts : mx(pts))
  return [
    // ribs: separate curved bones with gaps, shorter towards the bottom
    [[49, 0], [54, 0], [59, 0.2], [64, 0.8], [69, 2]].map(([y, inset]) => [
      L(m(`48.6,${y} 42.5,${y - 1.4} ${37 + inset},${y + 1.2} ${36 + inset * 1.4},${y + 4.5}`), B(0.92 * k), 2.9),
      L(m(`47.5,${y - 0.7} 42.5,${y - 2} ${38 + inset},${y}`), B(1.2 * k), 0.6, 0.8)]),
    // collarbone ridge and shoulder skull
    L(m("49,45.5 42,44.5 34.5,47.5"), B(1.05 * k), 2.8), L(m("48,44.6 42,43.6 36,45.8"), B(1.25 * k), 0.7, 0.8),
    skull(side < 0 ? 33.5 : 66.5, 46.5, 1.25, k),
    // pelvis half with its hole
    P(m("50,74 41,73.5 39.5,77 41.5,81 46,82.5 50,82"), B(0.88 * k)),
    E(side < 0 ? 44.5 : 55.5, 78, 2, 1.7, "#0b120c"),
    // leg: thighbone, knee, shin, foot
    tilt(side * -6, side < 0 ? 44 : 56, 82, boneV(side < 0 ? 44 : 56, 80, 87.5, 4.4, k)),
    ngon(side < 0 ? 43.2 : 56.8, 87.6, 6, 2.5, B(1.05 * k)),
    boneV(side < 0 ? 43 : 57, 87.5, 93, 3.8, k * 0.92),
    P(m("39,92.5 46,92.5 46.5,94.5 38.5,94.5"), B(0.7 * k)),
  ]
}
// spine down the middle, split by the glowing seam
const spine = () => Array.from({ length: 7 }, (_, i) => {
  const y = 47 + i * 4.4, w = 2.2 - i * 0.08
  return [P(`${50 - w},${y - 1.4} ${49.6},${y - 1.6} ${49.6},${y + 1.6} ${50 - w},${y + 1.4}`, B(1.02)),
    P(`${50.4},${y - 1.6} ${50 + w},${y - 1.4} ${50 + w},${y + 1.4} ${50.4},${y + 1.6}`, B(0.68))]
})
const seam = (power = 1) => [
  L("50,42 49.6,50 50.4,58 49.6,66 50.3,74 50,82", green, 2.4, 0.25 * power),
  L("50,42 49.6,50 50.4,58 49.6,66 50.3,74 50,82", green, 0.8, 0.9),
  L("50,42 49.6,50 50.4,58 49.6,66 50.3,74 50,82", "#eaffe6", 0.3, 0.8),
]

// ---------------------------------------------------------------- rig (rest pose: arms hanging straight down)
const makeRig = () => rig({
  body: { pivot: [50, 80], z: 4, items: [
    E(50, 93, 26, 3.5, "#000000", 0.45),
    tf({ scale: [1.28, 1.06], origin: [50, 62] }, interior(1), spine(), torsoHalf(-1), torsoHalf(1)), seam(1),
    // spine of small skulls up the back, peeking above the hunch
    skull(43, 41, 0.8, 0.9, false), skull(57, 41, 0.8, 0.65, false)] },
  head: { parent: "body", pivot: [50, 47], z: 6, items: [
    P("45,46 55,46 54,52 46,52", B(0.55)),                                    // jaw in shadow (no neck)
    skull(50, 45.5, 1.5, 1)] },
  armLU: { parent: "body", pivot: SH.L, z: 7, items: [armUpper(SH.L[0], SH.L[1], SH.L[1] + UP)] },
  armLL: { parent: "armLU", pivot: [SH.L[0], SH.L[1] + UP], z: 7, items: [armLower(SH.L[0], SH.L[1] + UP, SH.L[1] + UP + LOW)] },
  fistL: { parent: "armLL", pivot: [SH.L[0], SH.L[1] + UP + LOW], z: 8, items: [scl(SH.L[0], SH.L[1] + UP + LOW, 1.35, fist(SH.L[0], SH.L[1] + UP + LOW + 5))] },
  armRU: { parent: "body", pivot: SH.R, z: 7, items: [armUpper(SH.R[0], SH.R[1], SH.R[1] + UP)] },
  armRL: { parent: "armRU", pivot: [SH.R[0], SH.R[1] + UP], z: 7, items: [armLower(SH.R[0], SH.R[1] + UP, SH.R[1] + UP + LOW)] },
  fistR: { parent: "armRL", pivot: [SH.R[0], SH.R[1] + UP + LOW], z: 8, items: [tf({ x: 2 * SH.R[0], scale: [-1, 1] }, scl(SH.R[0], SH.R[1] + UP + LOW, 1.35, fist(SH.R[0], SH.R[1] + UP + LOW + 5, 0.8)))] },
})
const RIG = makeRig()

// ---------------------------------------------------------------- poses
// Crouch: body low, arms out and down, knuckles on the ground either side.
const CROUCH = { body: [0, 4], LU: 68, LL: -50, FL: -20 }
// Rise: body up, arms high, fists together overhead.
const RISE = { body: [0, -3], LU: 134, LL: 80, FL: 25 }
// Slam: body pitched forward, arms down in front, fists on the ground at the centre.
const SLAM = { body: [0, 2], LU: 30, LL: -75, FL: -20 }
const clip = (keys) => {
  // keys: [frame, pose, ease]
  const k = (f) => keys.map(([fr, p, e]) => [fr, f(p), e].filter((v) => v !== undefined))
  return {
    body: { move: k((p) => p.body), rot: k((p) => p.bodyRot ?? 0) },
    armLU: { rot: k((p) => p.LU) }, armLL: { rot: k((p) => p.LL) }, fistL: { rot: k((p) => p.FL), scale: k((p) => p.FS ?? 1) },
    armRU: { rot: k((p) => -p.LU) }, armRL: { rot: k((p) => -p.LL) }, fistR: { rot: k((p) => -p.FL), scale: k((p) => p.FS ?? 1) },
    head: { rot: k((p) => p.head ?? 0) },
  }
}
const lerpPose = (a, b, t) => ({ body: [a.body[0] + (b.body[0] - a.body[0]) * t, a.body[1] + (b.body[1] - a.body[1]) * t],
  LU: a.LU + (b.LU - a.LU) * t, LL: a.LL + (b.LL - a.LL) * t, FL: a.FL + (b.FL - a.FL) * t })
const sway = (d, dy, dl) => ({ ...CROUCH, body: [d, CROUCH.body[1] + dy], LU: CROUCH.LU + dl, LL: CROUCH.LL - dl * 0.6, head: -d * 1.5 })

const IDLE = clip([[0, sway(0, 0, 0), "inOut"], [8, sway(-0.8, 0.6, 2), "inOut"], [16, sway(0, -0.5, -1), "inOut"], [24, sway(0.8, 0.6, 2), "inOut"], [32, sway(0, 0, 0)]])
const ATTACK = clip([
  [0, CROUCH, "inOut"],
  [7, { ...RISE, head: -4 }, "out"],              // rise up, arms high
  [11, { ...RISE, body: [0, -4.5], LU: 138, LL: 84, head: -6 }, "in"],   // hold at the top, straining
  [13, { ...SLAM, head: 6, FS: 1.35 }, "out"],              // slam
  [16, { ...SLAM, body: [0, 3], head: 4, FS: 1.25 }, "inOut"],
  [24, CROUCH],
])

// ---------------------------------------------------------------- effects (drawn live; separate from the figure)
const seamPulse = (f) => C(50, 60, 14, green, 0.05 + 0.04 * Math.sin(f.t * 2 * Math.PI))
const slamFx = (i) => {
  if (i < 13 || i > 21) return []
  const g = (i - 13) / 8
  return [E(50, 93, 10 + g * 50, 2 + g * 8, "none", 0.8 * (1 - g), { stroke: "#e6dcc0", sw: 1.4 * (1 - g) + 0.3 }),
    E(50, 93, 6 + g * 30, 1.5 + g * 5, green, 0.25 * (1 - g))]
}

const TILE = { w: 190, h: 100, scale: 3 }
const SCENE = (...figure) => tf({ x: 45 }, backdrop(), tf({ y: GROUND - 93 }, scl(50, 93, 0.64, ...figure)))

anim("bone_colossus_idle", { ...TILE, frames: 32, fps: 12 },
  SCENE(seamPulse, pose(RIG, IDLE)))

anim("bone_colossus_attack", { ...TILE, frames: 24, fps: 14 },
  SCENE(
    (f) => [C(50, 60, 18, green, f.i >= 6 && f.i <= 12 ? 0.22 : 0.05), f.i >= 6 && f.i <= 12 ? C(50, 61, 6, "#efffe8", 0.5) : []],
    pose(RIG, ATTACK),
    (f) => slamFx(f.i),
    particles({ area: [32, 90, 36, 3], burst: 30, start: 13, life: [8, 14], speed: [1, 2.6], angle: [-170, -10], drag: 0.08, gravity: [0, 0.12],
      size: [[1.2, 2.2], 0.6], color: ["#cfc3a4", "#8a7f66", "#5a4f3c"], shape: "square", spin: [-12, 12], seed: 3 }),
    particles({ area: [26, 88, 48, 4], burst: 16, start: 13, life: [14, 22], speed: [0.4, 1], angle: [-160, -20], drag: 0.04, gravity: [0, -0.02],
      size: [[5, 8], [12, 16]], color: ["#4a4232", "#2e2920"], opacity: [0.5, 0], seed: 5 })))

// the card still: the top of the rise
anim("bone_colossus_card", { ...TILE, frames: 1, fps: 1 }, SCENE(C(50, 60, 18, green, 0.2), pose(RIG, clip([[0, { ...RISE, body: [0, -4.5], LU: 138, LL: 84, head: -6 }]]))))
