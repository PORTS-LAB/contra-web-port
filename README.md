# CONTRA — Web Port

A self-contained local web port of Contra (USA) for the NES, wrapped in a retro
arcade-cabinet UI. Runs fully offline: the emulator (EmulatorJS 4.2.3, GPL-3,
[fceumm](https://www.fceumm.com/) core) and its core binaries are bundled, nothing loads from the internet at play time.

## Run

```bash
./play.sh          # this machine — browser opens at http://127.0.0.1:8647/
./play-lan.sh      # whole home network — phone/TV at http://<lan-ip>:8647/
```

or manually:

```bash
python3 serve.py 8647            # localhost only
python3 serve.py 8647 0.0.0.0    # any device on the LAN
```

An HTTP server is required — browsers block the WASM emulator's fetch calls on
`file://` pages. Chrome, Firefox and Edge all work.

On a fresh browser with no `roms/` file (for example the hosted build), the
cabinet asks for a cartridge once — drop a `.nes` anywhere on the page. It is
stored in that browser (IndexedDB) and every later visit boots straight in;
the button says **CONTINUE GAME** instead of asking again. Dropping another
file at any time swaps the cartridge.

## Controls (Player 1)

| NES button | Key | Gamepad |
|------------|-------|---------|
| D-Pad      | Arrow keys | D-Pad / stick |
| A (jump)   | X | Bottom face button |
| B (fire)   | Z | Upper face button |
| START      | Enter | Start |
| SELECT     | V | Select |

Gamepads auto-connect, phones get an on-screen touch pad automatically.
Remap anything in the on-screen menu (gear icon → CONTROLLER SETTINGS).

## Features

- Save states: menu → SAVE/LOAD STATE (kept in browser storage)
- Fullscreen mode via the menu bar
- Screenshot capture via the menu
- CRT scanline overlay with a CRT toggle in the header
- Auto rewind/Audio-video sync controls in the menu for fine tuning

## Folder layout

```
web-port/
├── index.html          # the cabinet page
├── style.css           # CRT/bezel UI
├── app.js              # boot logic, cartridge picker, emulator config
├── play.sh / play-lan.sh / serve.py  # local + network launch, no-store HTTP
├── .gitignore          # keeps the cartridge out of the repo
├── .nojekyll           # makes GitHub Pages serve the emulator files verbatim
├── assets/             # pixel font (Press Start 2P, OFL)
├── roms/               # local cartridge lives here (git-ignored)
└── emulator/data/      # EmulatorJS (GPL-3): loader, minified bundle, cores (fceumm/nestopia)
```

## Hosting on GitHub Pages

The repo is built to deploy as-is — with one deliberate omission: **the cartridge
is not committed**. Visitors to the hosted site get a drop zone instead, load
their own `.nes` once, and it is kept in their browser (IndexedDB) so every
later visit boots straight into the game. Nothing is ever uploaded.

```bash
# from the web-port folder, once the repo exists on GitHub
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

Then enable Pages: repo → **Settings → Pages → Deploy from a branch → main / (root)**.
With the `gh` CLI it is two commands:

```bash
gh repo create <repo> --public --source=. --push
gh api -X POST repos/<you>/<repo>/pages -f source[branch]=main -f source[path]=/
```

Your port lands at `https://<you>.github.io/<repo>/`. Local play is unaffected —
`./play.sh` still auto-loads `roms/Contra (USA).nes` when the file is present.

## Swapping games

Point `EJS_gameUrl` in `app.js` at another `.nes` file dropped into `roms/`
(local mode), or just drop a different file onto the site's picker and press
**SWAP CART** to forget the stored one.
The bundled fceumm core also runs Game Boy (switch `EJS_core` to `gb` and add
the `@emulatorjs/core-gambatte` package to `emulator/data/cores/`).

## Notes

- The public build ships the GPL emulator and its cores; the ROM stays out of
  the repo (`.gitignore: roms/*.nes`) and out of the deployed site — each
  visitor brings their own.
- ROM integrity check (Contra USA): md5 `7bdad8b4a7a56a634c9649d20bd3011b`.
