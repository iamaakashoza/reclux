# Reclux brand (V2)

One idea: **Rec + Lux**: you choose what to capture, and the light stays with you.

- **Frame R.** The R is built from a screen-selection corner (stem and arm), a red light (the bowl) and a 45° capsule (the leg).
- **The light is official red.** The disc is the "lux", in Vibrant Crimson Red `#F20B18` (owner's call, 20 Nov 2026; it was amber until then).
- **The mark replaces the capital R** in the wordmark, so the name reads "Reclux", not "R Reclux" (same rule as V1).

Chosen on 17 Nov 2026 from four directions (see `concepts/v2-logo-concepts.html`). Research: report §35.

## Files

| Folder | Use it for |
|---|---|
| `logo/` | The full logo. Default choice anywhere the name fits |
| `mark/` | The Frame R alone, where the name is already nearby |
| `icon/` | The Deep Ink app tile |
| `png/` | Exported app icons, 16 to 512 px (`public/icon/` copies 16–128) |
| `concepts/` | The V2 concept board: directions A–D compared |

| File ending | Background |
|---|---|
| `-on-light` | White or light. Ink letters, red light |
| `-on-dark` | Black or dark. White letters, red light |
| `-mono-black`, `-mono-white` | One colour for print, stamps, photos. The light is the same colour as the R |

| Icon file | Sizes |
|---|---|
| `reclux-icon-small.svg` | 16 to 32 px. Flat, bigger mark, solid leg, no glass (glass turns to mud this small) |
| `reclux-icon.svg` | 48 px and up. Glass finish, small margin, to sit level with other browser icons |
| `reclux-icon-full.svg` | Fills the square, for places that add their own margin or round the corners |

## Colours

| Name | Hex | Use |
|---|---|---|
| Vibrant Crimson Red | `#F20B18` | The light, on light and dark backgrounds (`--c-brand` in the app) |
| Deep Ink | `#0E1116` | Letters on light, the app tile |
| Paper | `#F6F5F2` | The R on the app tile, light surfaces |

The app's own palette (Off-White `#F7F7F5`, Midnight Black `#080808`, the same red) and its status colours live in `src/styles/tokens.css`.

## Liquid glass

Apple's icon rule: flat filled shapes on one background, the system adds light. Browsers only take flat PNGs, so the glass finish is baked into the 48 px and larger icons: one light from the top left, a soft sheen on the R, a lit "bead" for the red light, a faint rim on the tile. The leg sits at 75% white so it reads as a second glass layer.

## Type

The letters "eclux" are Google Sans Flex Bold, converted to shapes (kept from V1), so no font is needed. SIL Open Font License.

## Rules

- **Clear space:** at least the diameter of the red light on every side.
- **Smallest size:** logo 16 px tall, app icon 16 px. Below 24 px, prefer the app icon.
- **Keep:** the light red `#F20B18`, the leg at 45° and detached from the light, the proportions as drawn.
- **Avoid:** recolouring the light, outlines, stretching, the colour logo on busy photos (use mono).

## Geometry

24-unit grid. Corner: path `M6 19V7A2 2 0 0 1 8 5H8.75`, stroke 3.8, round. Light: circle at (15, 7), radius 3.75. Leg: (11.5, 13) to (17.75, 19.25), stroke 3.65 (a little thinner, so the diagonal looks the same weight). In the logo the stem height equals the letters' cap height (96 units).

All files here are generated from that one geometry, so change it once and regenerate everything. `src/lib/Logo.svelte` copies `logo/reclux-logo-on-light.svg`.
