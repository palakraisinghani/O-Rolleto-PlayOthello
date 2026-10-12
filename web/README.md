# Putting the game on your GitHub Pages site

Two files do everything:

| File | What it is |
|---|---|
| `web/othello.html` | the whole game (one self-contained page, no other files needed) |
| `web/embed/play-button.html` | a "Play Othello" button that opens the game inside your page |

## Steps

1. **Upload the game.** In your site's repository, make a folder (say `othello/`) and put a copy of
   `web/othello.html` in it, named `index.html` → `othello/index.html`.
2. **Add the button.** Open the page of your site where the Play button should appear and paste the
   contents of `web/embed/play-button.html` where you want it. If that page is not in the same folder
   as `othello/`, change `data-src` in the button to the path from that page to the game.
3. **Publish.** Commit and push your site's repository. GitHub Pages updates in about a minute.
4. **Try it.** Hard-refresh the page (Ctrl+Shift+R), click the button, and play a move.

## If something is off

- **"404" or a blank frame:** `data-src` is wrong. It is relative to the page holding the button.
  For a project site at `username.github.io/repo/` do not start the path with `/`.
- **You still see the old game after an update:** hard-refresh; browsers cache the file.
- **You added `sandbox` to the iframe:** it needs `allow-scripts allow-same-origin` or the game cannot run.

## Updating the game later

Rebuild with `cd ui && npm run build:web` (this rewrites `web/othello.html`), copy the new file over
`othello/index.html` in your site, and push.
