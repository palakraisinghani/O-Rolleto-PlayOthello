# Design tokens

This file **drives the look of the app**. Edit a value, save, and the app reloads
with it (in `bash launch.sh` dev mode). No code changes needed.

## UI modes

The app has two looks, picked in Settings > Style (or the switch on the home screen):

- **Casino** (the default): night room, disco lights, neon, glossy lacquer. It is defined by the
  plain `tokens` blocks in sections 1-14. They contain **every** token.
- **Cafe**: a calm daytime coffee-house. It is defined by section 15, a ```` ```tokens cafe ```` block that
  lists **only the tokens that differ**; everything else is inherited from Casino. To change how Cafe
  looks, edit its block. To make Cafe differ in another way, copy a token line from sections 1-14 into
  the cafe block and change the value.

## How to edit

- Every line inside a `tokens` block is `name: value`. The value is plain CSS: a colour,
  a gradient, a length (`26px`, `38px`), a time (`0.6s`, `130ms`), a percentage, a font stack.
- Text after ` # ` (a space, `#`, a space) on a line is a comment. A colour like `#ff2fb3`
  is not a comment because no space follows its `#`.
- A value can reuse another token with `var(--d-the-name)`: underscores in a token name become
  hyphens, e.g. `neon_pink` is `var(--d-neon-pink)`. That is how the lights propagate: change
  `neon_pink` once and every pink glow follows.
- Don't rename or delete tokens: the app reads them by name. The build fails if the code uses a
  token that is missing from the Casino blocks or if the cafe block names a token that does not
  exist, and warns if a token here is not used by anything.
- Colours with transparency: `rgba(0, 0, 0, 0.5)`. Gradients: `linear-gradient(...)`,
  `radial-gradient(...)`; multi-layer values separate layers with commas.
- Speeds are durations: **bigger = slower**. To make something static, set a huge duration
  (`9999s`). To switch all motion off, use Settings > Animations in the app.

Sections follow the screen from the outside in: the room, text, buttons, option boxes,
scoreboard, board frame, bulbs, board surface, discs, animations, hints, dialogs, then Cafe.

---

## 1. Neon lights (the shared palette)

Used everywhere: background glows, beams, neon text, button edges, hints, bulbs, confetti.

```tokens
neon_pink: #ff2fb3
neon_cyan: #1de9ff
neon_yellow: #ffd23f
neon_purple: #8a3dff
neon_lime: #7cff4a
```

## 2. Room (main_bg: the page behind everything)

```tokens
main_bg: #0b0614                          # base colour of the room
main_bg_glow: #1a0b33                     # lighter glow near the top centre
vignette_color: rgba(0, 0, 0, 0.65)       # dark edges of the screen (use transparent for none)
beams_opacity: 0.55                       # rotating disco spotlight beams: 0 = off, 1 = strong
beams_spin_duration: 70s                  # one full turn of the beams (bigger = slower)
blobs_opacity: 0.55                       # the big drifting colour glows: 0 = off
blobs_blur: 70px                          # how soft the glows are
blobs_blend: screen                       # how glows mix with the room: screen (adds light), multiply (stains)
blobs_drift_slowness: 1                   # multiplier on drift time: 2 = twice as slow, 0.5 = twice as fast
```

## 3. Text and fonts

```tokens
ink: #f6efe6                              # main text
ink_dim: #b9aecb                          # secondary text (tagline, history, hints)
font_display: 'Monoton', 'Impact', sans-serif                                        # neon sign lettering
font_serif: 'Playfair Display', 'Didot', 'Bodoni MT', Georgia, serif                 # buttons, labels, numbers
font_ui: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif                    # everything else
```

## 4. Neon sign (the OTHELLO title and result headline)

```tokens
sign_core: #ffffff                        # the bright tube colour
sign_glow: var(--d-neon-pink)             # near glow
sign_glow_far: var(--d-neon-purple)       # wide halo
sign_weight: 400                          # font weight of the lettering (Monoton only has 400)
sign_letter_spacing: 0.06em
sign_hue_cycle_duration: 9s               # time to cycle through all colours
sign_flicker_duration: 5s                 # how often the tube flickers (bigger = calmer)
```

## 5. Buttons

```tokens
button_bg: linear-gradient(180deg, #2e2a33 0%, #0e0c11 55%, #000 100%)   # black lacquer
button_text: #ffffff
button_edge: linear-gradient(90deg, var(--d-neon-pink), var(--d-neon-cyan), var(--d-neon-yellow), var(--d-neon-purple), var(--d-neon-pink))   # animated neon rim
button_edge_duration: 6s                  # time for the rim colours to slide round
button_glow: var(--d-neon-pink)           # glow under the button
button_hover_glow: var(--d-neon-cyan)     # glow when hovered
button_lip: #000000                       # the dark 3D edge under the button
button_radius: 999px                      # 999px = pill, 10px = rounded rectangle
button_primary_bg: linear-gradient(180deg, #fffaf0 0%, #f1e3c8 55%, #d9c49b 100%)   # the ivory main button
button_primary_text: #1b0e08
button_primary_lip: #8a6a35
button_primary_glow: var(--d-neon-yellow)
```

## 6. Option boxes (setup, settings, rules panels)

```tokens
option_box_bg: linear-gradient(115deg, rgba(255,255,255,0.12), transparent 35%), repeating-linear-gradient(91deg, transparent 0 7px, rgba(0,0,0,0.1) 8px 9px, transparent 10px 15px), linear-gradient(135deg, #6b3f22, #4a2a17 55%, #2c170c)   # wooden plaque
option_box_border: #1d0f06
option_box_radius: 18px
option_box_text: #f6efe6
input_bg: rgba(0, 0, 0, 0.45)             # dropdowns and text boxes
input_border: var(--d-neon-cyan)
input_text: #f6efe6
checkbox_color: var(--d-neon-pink)
```

## 7. Scoreboard (the two player panels)

```tokens
scoreboard_bg: linear-gradient(180deg, rgba(40,20,55,0.85), rgba(10,5,20,0.9))
scoreboard_border: rgba(255, 255, 255, 0.12)
scoreboard_active_border: var(--d-neon-yellow)   # panel of the side to move
scoreboard_active_glow: var(--d-neon-yellow)
scoreboard_active_glow_alt: var(--d-neon-cyan)   # the glow pulses between the two
scoreboard_count_color: #ffffff
scoreboard_count_glow: var(--d-neon-cyan)        # glow under the disc counts
scoreboard_count_glow_far: var(--d-neon-purple)  # wider halo
scoreboard_pulse_duration: 1.6s
```

## 8. Board frame (the wooden surround)

```tokens
board_frame_bg: linear-gradient(115deg, rgba(255,255,255,0.2), transparent 28%, transparent 70%, rgba(255,255,255,0.07)), repeating-linear-gradient(90deg, rgba(0,0,0,0) 0 9px, rgba(0,0,0,0.13) 10px 11px, rgba(255,220,170,0.05) 12px 14px), linear-gradient(145deg, #6b3f22, #4a2a17 50%, #2c170c)   # walnut with grain and gloss
board_frame_border: #1a0d05               # outline around the frame ("bg_border")
board_frame_radius: 22px
board_frame_padding: 38px                 # thickness of the wood rail (holds the bulbs)
board_frame_glow: var(--d-neon-purple)    # coloured halo around the whole board
board_frame_max_size: 68vh                # biggest the board gets, relative to window height
```

## 9. Marquee bulbs (the chasing lights on the frame)

```tokens
bulb_color: var(--d-neon-yellow)
bulb_core: #ffffff                        # bright centre of each bulb
bulb_size: 26px
bulb_chase_duration: 1.1s                 # blink period: the two interleaved sets alternate (bigger = slower chase)
bulb_hue_cycle_duration: 8s               # colour cycling of the bulbs; 9999s keeps them yellow
```

## 10. Board surface

```tokens
board_bg: #3a2210                         # the grooves between squares
board_border: rgba(255, 215, 150, 0.35)   # thin brass ring around the playing surface
board_gap: 2px                            # groove width
board_square_dark: #c58d52                # oak squares
board_square_light: #e2b97e               # maple squares
board_grain: rgba(110, 60, 20, 0.12)      # wood grain lines on the squares
board_square_gloss: rgba(255, 255, 255, 0.22)   # shine on each square
board_square_hover_brightness: 1.12       # how much a playable square brightens under the mouse
```

## 11. Discs

```tokens
disc_size: 82%                            # of a square
disc_black_bg: radial-gradient(ellipse at 32% 24%, rgba(255,255,255,0.55) 0 8%, transparent 26%), radial-gradient(circle at 50% 45%, #4a4a52, #15151a 58%, #000 100%)
disc_black_rim: #000000
disc_white_bg: radial-gradient(ellipse at 32% 24%, #fff 0 10%, transparent 30%), radial-gradient(circle at 50% 45%, #ffffff, #ece7dd 60%, #b9b2a3 100%)
disc_white_rim: #8f887a
disc_shadow: rgba(0, 0, 0, 0.55)
```

## 12. Disc animations

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

## 13. Hints and highlights

```tokens
legal_hint_color: var(--d-neon-pink)      # rings on squares you can play
legal_hint_size: 30%
legal_hint_pulse_duration: 1.4s
legal_hint_hue_cycle_duration: 6s         # 9999s keeps the rings one colour
last_move_color: var(--d-neon-yellow)     # frame around the latest disc
hint_color: var(--d-neon-cyan)            # square suggested by the Hint button
```

## 14. Banners, dialogs, confetti

```tokens
banner_bg: linear-gradient(90deg, #7a1d5b, #3b1b7a)    # "has no legal move" notice
banner_border: var(--d-neon-pink)
banner_text: #ffffff
error_bg: #5b0a0a
error_border: #ff5a5a
error_text: #ffffff
dialog_bg: var(--d-option-box-bg)         # the result dialog
overlay_bg: rgba(5, 0, 12, 0.7)           # dimming behind the dialog
overlay_blur: 3px
confetti_colors: #ff2fb3, #1de9ff, #ffd23f, #8a3dff, #7cff4a, #ffffff    # comma separated
confetti_count: 70                        # pieces (a plain number, no unit)
```

## 15. Cafe mode (overrides only)

Anything not listed here is inherited from Casino above. Warm accents reuse the `neon_*` names:
in Cafe, `neon_pink` is terracotta, `neon_cyan` sage, `neon_yellow` amber, `neon_purple` mocha,
`neon_lime` olive, so every glow, ring and bulb picks up the warm palette automatically.
Long durations (`9999s`) mean "static".

```tokens cafe
# palette
neon_pink: #d96b4a                        # terracotta
neon_cyan: #6fa58a                        # sage
neon_yellow: #e0a84a                      # amber
neon_purple: #8a5a3c                      # mocha
neon_lime: #a8b67a                        # olive

# room
main_bg: #f1e6d3                          # latte cream
main_bg_glow: #fff7e8
vignette_color: rgba(90, 55, 25, 0.28)
beams_opacity: 0                          # no disco beams
blobs_opacity: 0.35                       # faint warm stains of light
blobs_blend: multiply
blobs_blur: 90px
blobs_drift_slowness: 2                   # drifts at half speed

# text
ink: #3a2a1d
ink_dim: #7a6350
font_display: 'Playfair Display', 'Didot', Georgia, serif
sign_core: #3a2214                        # dark espresso lettering, not a neon tube
sign_glow: rgba(224, 168, 74, 0.35)
sign_glow_far: rgba(224, 168, 74, 0.15)
sign_weight: 900
sign_letter_spacing: 0.02em
sign_hue_cycle_duration: 9999s            # no colour cycling
sign_flicker_duration: 9999s              # no flicker

# buttons
button_bg: linear-gradient(180deg, #fffaf0 0%, #f3e6cc 60%, #e6d2ae 100%)    # cream ceramic
button_text: #3a2214
button_edge: linear-gradient(90deg, #c49a66, #a87a48, #c49a66)
button_edge_duration: 9999s
button_glow: #c49a66
button_hover_glow: var(--d-neon-yellow)
button_lip: #b08d5f
button_radius: 14px
button_primary_bg: linear-gradient(180deg, #9a6642 0%, #6d4326 60%, #55321b 100%)   # espresso
button_primary_text: #fff7e8
button_primary_lip: #3a2214
button_primary_glow: var(--d-neon-yellow)

# option boxes
option_box_bg: linear-gradient(115deg, rgba(255,255,255,0.5), transparent 40%), linear-gradient(160deg, #fbf1de, #efdfc2)   # parchment
option_box_border: #c9ad82
option_box_radius: 14px
option_box_text: #3a2a1d
input_bg: #fffaf0
input_border: #a87a48
input_text: #3a2a1d
checkbox_color: #8a5a3c

# scoreboard
scoreboard_bg: linear-gradient(180deg, #fffaf0, #f1e3c8)
scoreboard_border: #d8c19a
scoreboard_active_border: var(--d-neon-yellow)
scoreboard_active_glow: var(--d-neon-yellow)
scoreboard_active_glow_alt: var(--d-neon-pink)
scoreboard_count_color: #3a2214
scoreboard_count_glow: transparent
scoreboard_count_glow_far: transparent
scoreboard_pulse_duration: 3s

# board frame and surface (light oak, café tiles)
board_frame_bg: linear-gradient(115deg, rgba(255,255,255,0.28), transparent 30%, transparent 70%, rgba(255,255,255,0.1)), repeating-linear-gradient(90deg, rgba(0,0,0,0) 0 9px, rgba(60,30,10,0.14) 10px 11px, rgba(255,235,200,0.08) 12px 14px), linear-gradient(145deg, #b9824a, #9a6638 50%, #7a4d27)
board_frame_border: #5a3820
board_frame_glow: transparent
board_bg: #5e3d20
board_border: rgba(255, 235, 200, 0.5)
board_square_dark: #a8743f
board_square_light: #e3c9a0

# string lights instead of marquee bulbs
bulb_color: #ffcf6b
bulb_core: #fff3d0
bulb_size: 20px
bulb_chase_duration: 3.4s                 # slow twinkle
bulb_hue_cycle_duration: 9999s            # stay warm white

# gentler disc motion
disc_flip_duration: 0.7s
disc_flip_ripple_delay: 90ms
disc_hop_scale: 1.12
disc_drop_easing: cubic-bezier(0.25, 1, 0.5, 1)    # no bounce

# hints and highlights
legal_hint_pulse_duration: 2.4s
legal_hint_hue_cycle_duration: 9999s

# banners, dialogs, confetti
banner_bg: linear-gradient(90deg, #f6dfb0, #ecc88c)
banner_text: #3a2214
banner_border: var(--d-neon-yellow)
error_bg: #f7d6cd
error_border: #c4553a
error_text: #4a1a10
overlay_bg: rgba(60, 35, 20, 0.45)
confetti_colors: #d96b4a, #e0a84a, #6fa58a, #8a5a3c, #f6dfb0
```
