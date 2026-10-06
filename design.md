# Design tokens

This file **drives the look of the app**. Edit a value, save, and the app reloads
with it (in `bash launch.sh` dev mode). No code changes needed.

The look: a casino card room. Mahogany wood everywhere, burnished brass rims, red velvet
buttons, a green felt board, glossy black and white discs, warm disco-pop lights, and poker
chips that splash across the screen at the start of a game and rain down when someone wins.

## How to edit

- Every line inside a `tokens` block is `name: value`. The value is plain CSS: a colour,
  a gradient, a length (`26px`, `38px`), a time (`0.6s`, `130ms`), a percentage, a font stack,
  or an image (`url(/textures/wood.png) center / cover`).
- Text after ` # ` (a space, `#`, a space) on a line is a comment. A colour like `#ff2fb3`
  is not a comment because no space follows its `#`.
- A value can reuse another token with `var(--d-the-name)`: underscores in a token name become
  hyphens, e.g. `brass_light` is `var(--d-brass-light)`. Change `brass` once and every brass
  edge follows.
- **Textures** live in `ui/public/textures/` (`wood.png`, `red-velvet.png`, `green-velvet.png`).
  To use your own, drop a PNG or JPG there and point a token at it, e.g.
  `url(/textures/my-felt.jpg) center / cover`.
- Don't rename or delete tokens: the app reads them by name. The build fails if the code uses a
  token that is missing here, and warns if a token here is not used by anything.
- Colours with transparency: `rgba(0, 0, 0, 0.5)`. Multi-layer values (a gradient over a
  texture) separate layers with commas; the first layer is on top.
- Speeds are durations: **bigger = slower**. To make something static, set a huge duration
  (`9999s`). To switch all motion off, use Settings > Animations in the app.

Sections go from the outside in: neon lights, the room, text, brass and velvet, buttons,
icon buttons, option boxes, scoreboard, board frame, bulbs, board surface, discs, disc
animations, hints, banners and dialogs, poker chips, the roulette wheel.

---

## 1. Neon lights (the shared accent palette)

Used for the title sign, hint rings, bulbs, glows and the light washes on the wood.

```tokens
neon_pink: #ff2fb3
neon_cyan: #1de9ff
neon_yellow: #ffd23f
neon_purple: #8a3dff
```

## 2. Room (main_bg: the wooden wall behind everything)

```tokens
main_bg: #1c0b06                          # colour shown if the image is missing
main_bg_image: url(/textures/wood.png) center / cover     # the mahogany wood
main_bg_tint: rgba(12, 4, 2, 0.5)         # darkens the wood: lower = brighter wood, 0 = untouched
main_bg_glow: rgba(255, 176, 96, 0.28)    # warm lamp light pooling near the top centre
vignette_color: rgba(0, 0, 0, 0.7)        # dark edges of the screen (transparent = none)
blobs_opacity: 0.28                       # soft coloured light washes drifting over the wood: 0 = off
blobs_blend: screen                       # how the washes mix with the wood
blobs_blur: 70px
blobs_drift_slowness: 1                   # 2 = half speed, 0.5 = double speed
glint_color: rgba(255, 214, 140, 0.9)     # the golden reflection that sweeps across the wood
glint_opacity: 0.2                        # 0 = off
glint_duration: 16s                       # one sweep (bigger = slower)
```

## 3. Text and fonts

```tokens
ink: #f6ead7                              # main text
ink_dim: #cdb89a                          # secondary text (tagline, history)
font_display: 'Monoton', 'Impact', sans-serif                                        # neon sign lettering
font_serif: 'Playfair Display', 'Didot', 'Bodoni MT', Georgia, serif                 # buttons, labels, numbers
font_ui: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif                    # everything else
```

## 4. Neon sign (the OTHELLO title and result headline)

```tokens
sign_core: #fff6e0                        # the bright tube colour
sign_glow: var(--d-neon-pink)             # near glow
sign_glow_far: var(--d-neon-purple)       # wide halo
sign_weight: 400                          # font weight (Monoton only has 400)
sign_letter_spacing: 0.06em
sign_hue_cycle_duration: 9s               # time to cycle through all colours (9999s = stay pink)
sign_flicker_duration: 5s                 # how often the tube flickers (bigger = calmer)
```

## 5. Brass and red velvet (the two shared materials)

Brass trims the buttons, frames, panels and scoreboard. Velvet is the face of the buttons.

```tokens
brass: #c9a24e                            # mid brass
brass_light: #f1dc94                      # highlight
brass_dark: #7a5a1f                       # shadow
brass_gradient: linear-gradient(100deg, #8a6420, #f1dc94 22%, #b98a35 45%, #f6e6a8 70%, #8a6420)   # burnished, with a sheen
brass_shine_duration: 8s                  # the sheen slowly crossing the brass (9999s = static)
velvet_red: linear-gradient(180deg, rgba(255,255,255,0.16), rgba(0,0,0,0.42)), url(/textures/red-velvet.png) center / cover   # velvet with soft top light
```

## 6. Buttons

```tokens
button_bg: var(--d-velvet-red)            # the face (red velvet)
button_text: #fff4e0
button_rim: 3px                           # thickness of the brass rim
button_glow: var(--d-brass)               # soft glow around the button
button_hover_glow: var(--d-brass-light)   # glow when hovered
button_lip: #240806                       # the dark 3D edge under the button
button_radius: 999px                      # 999px = pill, 12px = rounded rectangle
button_primary_bg: linear-gradient(180deg, #f6e3a1, #d4af5a 55%, #a67c2e)    # the main button is polished brass
button_primary_text: #2a1206
button_primary_lip: #5a3f12
button_primary_glow: var(--d-brass-light)
```

## 7. Icon buttons (Undo, Hint, Resign, New game and friends)

Round velvet buttons with a brass rim; they use the button tokens above plus these.

```tokens
icon_button_size: 58px
icon_color: #f6e3a1                       # the glyph (brass)
```

## 8. Option boxes (setup, settings, rules and the result dialog)

```tokens
option_box_bg: linear-gradient(rgba(22,8,3,0.62), rgba(22,8,3,0.72)), url(/textures/wood.png) center / cover   # dark polished wood
option_box_border: var(--d-brass)         # brass frame
option_box_border_width: 4px
option_box_radius: 16px
option_box_text: #f6ead7
input_bg: rgba(0, 0, 0, 0.45)             # dropdowns and text boxes
input_border: var(--d-brass)
input_text: #f6ead7
checkbox_color: #d12b3a                   # velvet red ticks
```

## 9. Scoreboard (the two player panels)

```tokens
scoreboard_bg: linear-gradient(180deg, rgba(48,18,10,0.92), rgba(16,6,3,0.95))
scoreboard_border: var(--d-brass-dark)
scoreboard_active_border: var(--d-brass-light)    # panel of the side to move
scoreboard_active_glow: var(--d-neon-yellow)
scoreboard_active_glow_alt: var(--d-neon-pink)    # the glow pulses between the two
scoreboard_count_color: #fff6e0
scoreboard_count_glow: var(--d-brass-light)
scoreboard_count_glow_far: var(--d-neon-pink)
scoreboard_pulse_duration: 1.6s
```

## 10. Board frame (the wooden surround)

```tokens
board_frame_bg: linear-gradient(115deg, rgba(255,255,255,0.14), transparent 30%, transparent 70%, rgba(0,0,0,0.18)), url(/textures/wood.png) center / cover   # polished wood with a sheen
board_frame_border: var(--d-brass)        # the brass rim around the frame ("bg_border")
board_frame_border_width: 5px
board_frame_radius: 22px
board_frame_padding: 38px                 # thickness of the wood rail (holds the bulbs)
board_frame_glow: var(--d-brass-light)    # warm halo around the whole board
board_frame_max_size: 68vh                # biggest the board gets, relative to window height
```

## 11. Marquee bulbs (the chasing lights on the frame)

```tokens
bulb_color: var(--d-neon-yellow)
bulb_core: #ffffff                        # bright centre of each bulb
bulb_size: 26px
bulb_chase_duration: 1.1s                 # blink period: the two interleaved sets alternate (bigger = slower chase)
bulb_hue_cycle_duration: 8s               # colour cycling of the bulbs; 9999s keeps them yellow
```

## 12. Board surface (the felt)

```tokens
board_felt: linear-gradient(120deg, rgba(255,255,255,0.07), transparent 45%), url(/textures/green-velvet.png) center / cover   # green felt with a soft sheen
board_border: var(--d-brass)              # thin brass ring around the felt
board_grid_line: rgba(0, 0, 0, 0.55)      # the lines between squares
board_grid_width: 1px
board_square_alt_tint: rgba(255, 255, 255, 0.035)   # alternate squares are very slightly lighter (0 = plain felt)
board_square_hover: rgba(255, 255, 255, 0.14)       # a playable square under the mouse
```

## 13. Discs

```tokens
disc_size: 82%                            # of a square
disc_black_bg: radial-gradient(ellipse at 32% 24%, rgba(255,255,255,0.55) 0 8%, transparent 26%), radial-gradient(circle at 50% 45%, #4a4a52, #15151a 58%, #000 100%)
disc_black_rim: #000000
disc_white_bg: radial-gradient(ellipse at 32% 24%, #fff 0 10%, transparent 30%), radial-gradient(circle at 50% 45%, #ffffff, #ece7dd 60%, #b9b2a3 100%)
disc_white_rim: #8f887a
disc_shadow: rgba(0, 0, 0, 0.55)
```

## 14. Disc animations

```tokens
disc_drop_duration: 0.5s                  # a new disc dropping onto the board
disc_drop_easing: cubic-bezier(0.25, 1.4, 0.5, 1)   # >1 in the 2nd number = a bounce
disc_drop_height: -60%                    # starting height (negative = above)
disc_flip_duration: 0.6s                  # the turn-over
disc_flip_easing: cubic-bezier(0.3, 0.7, 0.3, 1)
disc_flip_first_delay: 120ms              # pause before the nearest disc starts turning
disc_flip_ripple_delay: 130ms             # extra delay per square of distance (0ms = all flip at once)
disc_hop_height: -26%                     # how high a disc rises while turning (0% = stays flat)
disc_hop_scale: 1.22                      # how much bigger it gets at the top of the hop
```

## 15. Hints and highlights

```tokens
legal_hint_color: var(--d-neon-pink)      # rings on squares you can play
legal_hint_size: 30%
legal_hint_pulse_duration: 1.4s
legal_hint_hue_cycle_duration: 6s         # 9999s keeps the rings one colour
last_move_color: var(--d-neon-yellow)     # frame around the latest disc
hint_color: var(--d-neon-cyan)            # square suggested by the Hint button
```

## 16. Banners and dialogs

```tokens
banner_bg: linear-gradient(180deg, rgba(255,255,255,0.14), rgba(0,0,0,0.4)), url(/textures/red-velvet.png) center / cover   # the "has no legal move" notice
banner_border: var(--d-brass)
banner_text: #fff4e0
error_bg: #5b0a0a
error_border: #ff5a5a
error_text: #ffffff
dialog_bg: var(--d-option-box-bg)         # the result dialog
overlay_bg: rgba(10, 3, 1, 0.72)          # dimming behind the dialog
overlay_blur: 3px
```

## 17. Poker chips (start-of-game splash and win rain)

At the start of every game chips fly in from the edges and splash across the screen, bounce
and fade. When someone wins, chips rain from the top while the result dialog is open. Both
are switched off by Settings > Animations.

```tokens
chip_colors: #b3202a, #1f8a46, #1f3f9a, #17171a, #d9a521, #6a2a8c   # comma separated: red, green, blue, black, gold, purple
chip_notch: #f6f0e4                       # the white notches round the edge
chip_size: 54px
chip_splash_count: 34                     # chips in the opening splash (a plain number, no unit)
chip_splash_duration: 2.8s                # how long the splash lasts (a number of seconds, ends in s)
chip_rain_count: 60                       # chips in the victory rain (a plain number)
chip_rain_slowness: 1                     # 2 = chips fall twice as slowly
```

## 18. Roulette wheel (home screen)

A slow-turning roulette wheel behind the spinning coin.

```tokens
wheel_size: 190px
wheel_red: #a3182a
wheel_black: #121212
wheel_spin_duration: 26s                  # one full turn (bigger = slower)
```
