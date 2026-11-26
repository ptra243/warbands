# Warband card art

How to draw a unit illustration that matches the ones already approved. Read this before adding or changing anything in `src/ui/card-art.ts`.

The card art is a study. It is not wired into the game yet: the game still shows the small icons in `src/ui/art.ts`. Seven units are drawn so far.

## Where things are

| Path                  | Contents                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------ |
| `src/ui/facets.ts`    | The drawing kit: polygon, line and circle helpers, the shading function, the faceted head.       |
| `src/ui/card-art.ts`  | One function per unit, returning SVG. Scene helpers (`hd`, `bolt`, `sbg`, `rnd`) are at the top. |
| `src/ui/portraits.ts` | The nine leader portraits, drawn with the same kit.                                              |
| `tools/cards.ts`      | Renders the art large, as full cards and as battle tiles, and screenshots each.                  |
| `art/reference/`      | Approved renders to match, and rejected ones to avoid.                                           |
| `art/out/`            | Scratch output from the tool. Not committed.                                                     |

## The working loop

Follow these steps in order. The owner reviews at steps 1 and 5.

1. **Describe the scene in words first** and get it approved before drawing: setting, figure, action, colour. Four short lines are enough.
2. **Draw it** as a function in `card-art.ts`, reusing the kit.
3. **Render it:** `npm run cards -- <unit id>`. This needs Chromium (`npx playwright install chromium` or `CHROME=path`).
4. **Open `art/out/large.png`, `cards.png` and `tiles.png` and look at them.** The SVG source will not show you a head that floats, an arm that reads as a stick, or a focal point hidden under the health bar. Fix what you see and render again.
5. **Show the renders and list the weak spots yourself.** Say plainly what still looks wrong. Do not describe a drawing as finished when a part of it is stiff or unclear.

Draw units in small batches that share a tribe or class, and compare them side by side. Sameness only shows up in a group.

## Style

- **Flat facets.** Every form is built from flat polygons. No outlines around figures, no gradients on figures, no blur.
- **Lit from the viewer's left.** The left side of every form is lighter and the right side darker. Use `sh(colour, factor)` for tones: about 1.2 to 1.4 for lit planes, 0.6 to 0.7 for shadow, 0.45 to 0.5 for deep shadow.
- **Three or four tones per colour.** Pick one base colour for a material and derive the rest with `sh`. Do not hand-pick each tone.
- **Thin highlight lines** along lit edges, with `L` at a width under 1 and reduced opacity.
- **Light sources glow.** Use `glow` for orbs, eyes and flames, and `bolt` for lightning. A light source in the scene also tints nearby planes: add a low-opacity polygon of its colour over them.
- **Backgrounds are simple and dark.** Two or three large planes, then a few props that say where we are. The figure must be the brightest, most saturated thing in the frame.
- **Scattered details** such as stars, embers and rain use `rnd(seed)` so they land in the same place on every render. Never use `Math.random`.

## Composition

Each illustration is a small scene: one figure, in a place, doing what the card does. It is not a portrait.

- **Show the ability.** The Storm Mage's attack arcs to two enemies, so two bolts fork from his staff. The Apprentice's attack splashes, so his spark splits three ways.
- **Focal point in the middle.** The face or the action sits in the central half of the frame, so it survives every crop.
- **Keep the bottom quarter unimportant.** The name on a card and the health bar on a tile both cover it. Feet, floors and hems can go there. Hands, faces and effects cannot.
- **Keep the top corners unimportant.** The cost coin covers the top left of a card and the rarity label the top right.
- **Bold silhouette.** A battle tile is 113 pixels wide. The pose must read as a shape at that size.

## Variety

The first version of the four Human mages was one figure in four colours (`art/reference/rejected-same-silhouette.png`). The owner rejected it. Units that share a tribe or class must differ in this order:

1. **Silhouette and pose.** Each needs its own outline.
2. **Framing and angle.** Mix close and distant, front-on, three-quarter and profile.
3. **Props.** Only one unit in a group gets the obvious prop. Only the Archmage wears the pointed hat.
4. **Colour.** This comes last. It supports the differences above and never carries them alone.

Within a group, let cost show as mastery. The 1-cost Apprentice barely controls a spark. The 5-cost Archmage floats calmly and is not looking at his spell.

## Figures

- **Head.** Use `face(skin)` from the kit, placed with `hd(cx, cy, scale, tilt, contents)`. A waist-up figure uses a scale near 0.6, a figure seen to the knee near 0.5, a full figure near 0.35.
- **Neck.** The owner has flagged necks more than once (`art/reference/rejected-necks.png`). Make the neck short, narrower than the jaw and much darker than the face (`sh(skin, 0.45)` to `0.58`), because it sits in the chin's shadow. Set the head low so little neck shows, and wrap a collar, cowl or beard around its base. A light neck as wide as the head makes the head look perched on a post.
- **Faces.** Scene figures have simple eyes and a mouth where the expression matters: wide eyes on the Apprentice, a grin on the Fire Mage. The owner approved this on the mages. The leader portraits and the three older busts have no drawn features. Whether to reconcile the two is not decided, so ask before changing either.
- **Arms.** A bare arm drawn as one thick line reads as a stick. Give it a sleeve, a second tone, or a bend.
- **Hands on effects.** Draw the effect over the hand, with a glow, so the join is hidden.

## Frames

Every drawing must work in each frame the unit can appear in. `tools/cards.ts` renders all of them.

| Frame           | Size in pixels | Window onto the scene                                                          |
| --------------- | -------------- | ------------------------------------------------------------------------------ |
| Card art window | 296 by 296     | The square from 0,0 to 100,100.                                                |
| One-slot tile   | 113 by 132     | The same square, with a little trimmed from each side.                         |
| Two-slot tile   | 231 by 132     | A wider window set per unit in `WIDE`. The scene must be drawn out to fill it. |

Units with `size: 2` need background and props beyond the 0 to 100 square on both sides. The Archmage's sky, moon and towers run from -45 to 145. The Knight and Lich are older busts that were never widened, and they crop badly in a two-slot tile (`art/reference/rejected-busts-in-wide-tiles.png`). Redraw them as scenes before using them.

A wide unit should also look bigger than its neighbours. The Archmage does not yet: he is the same height as the one-slot mages with empty sky beside him. That is an open problem.

## Setting and colour by faction

| Faction | Settings                                        | Background colours               |
| ------- | ----------------------------------------------- | -------------------------------- |
| Humans  | Keeps, studies, battlefields, clifftops, towers | Slate blue, warm brown, dusk red |
| Elves   | Forest, moonlight, groves, altars               | Deep green, violet for Drow      |
| Undead  | Graveyards, crypts, fog                         | Green-black, bone, sickly green  |

Each unit has one signature colour for its clothing and one for its effect. Keep the ones already in `src/ui/art.ts` where they exist, so a unit is the same colour as its current icon.

## Taking inspiration

The owner may name a character from another game or show as a reference. Take the attitude, the energy or a general pose from it. Never draw the character itself, its costume or its signature features. The result must be Warband's own figure. A classic pose, such as a weapon raised overhead to catch lightning, is free to use.

## Drawn so far

| Unit       | Kind  | Notes                                                                          |
| ---------- | ----- | ------------------------------------------------------------------------------ |
| Apprentice | Scene | Approved as a good start. The raised arm is thin.                              |
| Fire Mage  | Scene | Approved as a good start. Reads less clearly as a woman than intended.         |
| Storm Mage | Scene | Approved as a good start. Sleeves bunch around the head.                       |
| Archmage   | Scene | Approved as a good start. Needs more presence in the two-slot tile.            |
| Knight     | Bust  | First study, before the move to scenes. Two-slot unit: redraw as a wide scene. |
| Lich       | Bust  | First study. Two-slot unit: redraw as a wide scene.                            |
| Assassin   | Bust  | First study. Redraw as a scene.                                                |

## Not decided yet

- Where card art appears in the game: the hover card, the shop, the battle tiles, or all three.
- Whether battle tiles become full-bleed art with the bars laid over it, as the tool renders them, or keep the current layout of an icon above a stat strip.
- Whether leader portraits gain facial features or scene figures lose them.
