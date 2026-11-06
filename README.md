<h1 align="center">Resource Pack Studio</h1>

<p align="center">
  <strong>A modern, local-first desktop editor for Minecraft resource packs.</strong><br/>
  Built for 1.8.9 Bedwars packs and every version after.
</p>

<p align="center">
  <img alt="status" src="https://img.shields.io/badge/status-active-brightgreen"/>
  <img alt="platform" src="https://img.shields.io/badge/platform-linux%20%7C%20macos%20%7C%20windows-blue"/>
  <img alt="electron" src="https://img.shields.io/badge/electron-45-47848f"/>
  <img alt="license" src="https://img.shields.io/badge/license-MIT-lightgrey"/>
</p>

---

## Why

Editing a resource pack by hand means:

- Knowing that stone.png lives at assets/minecraft/textures/block/stone.png
- Knowing that textures must be a **power of two** in each dimension
- Knowing that animations are vertical frame strips with a sibling .png.mcmeta
- Knowing that a 1.8.9 pack is pack_format: 1 and a 1.20 pack is pack_format: 15

That is four layers of Minecraft-specific trivia before you can even draw a pixel. Resource Pack Studio removes all of it.

You pick **Stone** from a catalog. The app creates a 16x16 PNG at the right path, opens it in a pixel editor, and saves it back. If you want an animation, you tick a box and pick a frame count — the app writes the strip and the .mcmeta for you.

No terminal. No path typos. No dead packs.

---

## Features

### Pack library

- All packs live in one managed folder: ~/.config/resource-pack-studio/packs/ on Linux, ~/Library/Application Support/resource-pack-studio/packs/ on macOS, %APPDATA%/resource-pack-studio/packs/ on Windows.
- Create new packs with a **target Minecraft version** dropdown — 1.8.9 (Bedwars / Legacy) is the default, with 1.12.2, 1.16.5, 1.18.2, 1.20-1.20.1, 1.20.2, and 1.21-1.21.1 available.
- Import existing packs as a folder or as a .zip.
- Delete packs from the library with confirmation.
- Export any pack back to .zip — drop into Minecraft resourcepacks folder and play.

### Texture catalog

- **240+ block entries** for 1.8.9, verified against the actual vanilla client jar.
- Each entry shows name, path, and dimensions before you create it.
- Shows **In pack** with a checkmark for files that already exist.
- Search and filter (All / Not in pack / In pack).
- One click creates the file at the correct path and opens it in the editor.

### Pixel editor

- **Left tool rail**: pencil, eraser, eyedropper. Brush sizes 1/2/4. Color picker with hex input.
- **Checkerboard** background showing through transparent pixels.
- **Zoom** with mouse wheel, buttons, or Fit. 1x to 64x.
- **Pan** with Space+drag or middle-mouse drag.
- **Undo/redo** (50-step history) via Ctrl+Z / Ctrl+Shift+Z.
- **Auto-fit** on open.
- **Dirty indicator** — the Save button glows amber when there are unsaved changes.

### Animations

Minecraft animations work identically from 1.6 through 1.21, so one implementation covers every version.

- **Create animations from scratch** — pick frame count (2-64), frame size (16/32/64/128).
- **Detect** animations in any imported texture.
- **Frame editor** with horizontal strip: add, duplicate, delete frames.
- **frametime**, **interpolate** toggle, and explicit **frame order** override.
- **Live preview** — toggle Preview in the editor.
- **Save animation** — writes PNG and .mcmeta atomically.

### Safety and correctness

- **Path containment** — every file write is validated to resolve inside the pack root.
- **Texture dimension validation** — power-of-two check on import.
- **Zip traversal protection**.
- **ErrorBoundary** around the editor and catalog.
- **No nodeIntegration** in the renderer.

### Not included (by design)

Local only. No authentication, no accounts, no cloud, no backend, no networking.


---

## Installation

### From source

**Requirements:**

- Node.js 20 or newer
- npm 10 or newer
- Linux, macOS, or Windows

**Steps:**

    git clone https://github.com/sepehrkhosravi/resource-pack-studio.git
    cd resource-pack-studio
    npm install
    npm run dev

The Electron window opens automatically after Vite finishes booting (~2 seconds). DevTools opens detached on launch.

### Building a distributable

    npm run build

Compiles the renderer into dist/ and the main process into dist-electron/.

---

## Usage

### Creating your first pack

1. Launch the app. You land on the library screen.
2. Click **New Pack**. Fill in name, description, and target version.
3. Click **Create pack**.

### Adding a texture

1. Click the **Catalog** tab.
2. Search for the block or item you want to edit.
3. Click **Create** on the row.
4. The texture opens in the editor immediately.

### Drawing

- **B** pencil, **E** eraser, **I** eyedropper.
- **Space + drag** to pan, **mouse wheel** to zoom.
- **Ctrl+Z** undo, **Ctrl+Shift+Z** redo.
- **Ctrl+S** save.
- **P** toggles animation preview.

### Creating an animation

1. Click **New texture**, tick **Animated texture**.
2. Pick frame size and frame count.
3. Set frametime.
4. Click **Create & open**.

### Sharing your pack

1. Click **Export .zip**.
2. Drop into your Minecraft resourcepacks folder.
3. Enable in-game.


---

## How it works

### Architecture

    electron/
      main.ts                 Electron entry, window + IPC registration
      preload.cts             contextBridge surface
      ipc/fs.ts               filesystem + dialog handlers
      services/
        packService.ts        pack open/save/scan/create logic
        library.ts            managed pack library folder
        textureValidator.ts   PNG header parsing + power-of-two rules
        animationService.ts   .png.mcmeta read/write
        zipService.ts         .zip import/export with path-traversal guard

    src/
      components/             React UI
      hooks/                  usePack, useEditorHistory, useAnimationPreview
      services/               typed wrappers around window.api
      styles/                 modular CSS
      types/                  TypeScript interfaces

    shared/
      types/pack.ts           types used by BOTH main and renderer

    public/
      catalogs/blocks.json    verified 1.8.9 texture catalog

### The pack_format question

| pack_format | Version |
|---|---|
| 1  | 1.8 - 1.8.9 |
| 3  | 1.11 - 1.12.2 |
| 6  | 1.16 - 1.16.5 |
| 8  | 1.18 - 1.18.2 |
| 15 | 1.20 - 1.20.1 |
| 18 | 1.20.2 |
| 22 | 1.20.3 - 1.20.4 |
| 32 | 1.20.5 - 1.20.6 |
| 34 | 1.21 - 1.21.1 |
| 46 | 1.21.4 |
| 63 | 1.21.6 |

The app surfaces this as a version dropdown at creation time.

### Texture rules

- **Power of two** — 1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048.
- **Square requirement** — block/, item/, entity/, particle/, painting/. gui/ may be rectangular.
- **Validated on import**.

### Animation format

A foo.png with sibling foo.png.mcmeta:

    {
      "animation": {
        "frametime": 2,
        "interpolate": false,
        "frames": [0, 1, 2, 3, 2, 1]
      }
    }

- foo.png is a vertical strip.
- frametime — MC ticks per frame (50 ms per tick).
- interpolate — blend between frames.
- frames — optional explicit order.


---

## Roadmap

### Done

- [x] Pack library (create, open, delete, import folder, import zip)
- [x] Pack browser sidebar with file tree
- [x] Texture gallery with categories, filters, search
- [x] Pixel editor (pencil, eraser, eyedropper, brush sizes, undo/redo, save)
- [x] Power-of-two + square validation with warnings
- [x] Animation detection and preview
- [x] Animation builder (add/delete/reorder frames)
- [x] Animated texture creation wizard
- [x] Export as .zip, import as .zip
- [x] Verified 1.8.9 block catalog
- [x] Frameless custom-chrome dark UI

### In progress

- [ ] Item, entity, GUI, environment catalogs
- [ ] pack.mcmeta editor
- [ ] pack.png icon creator (256x256)
- [ ] File tree right-click operations

### Planned

- [ ] Multi-version catalogs (1.12.2, 1.16.5, 1.21)
- [ ] Model .json and blockstates editing
- [ ] Language .lang file editor
- [ ] Sound file browser
- [ ] Batch texture operations
- [ ] Undo stack persistence across save
- [ ] Import vanilla jar as a reference pack
- [ ] Theme options (light / dark / system)
- [ ] Keyboard shortcut customization

### Explicitly out of scope

- Cloud sync, accounts, or shared packs
- Multiplayer or collaborative editing
- Any network functionality
- Datapack editing

---

## Contributing

Conventions:

- TypeScript strict mode everywhere.
- No any — use unknown and narrow.
- electron/ for main process, src/ for renderer, shared/ for shared types.
- No file writes outside the pack root. All go through resolveInside().
- New IPC handlers in electron/ipc/fs.ts, typed in src/types/global.d.ts.
- One CSS file per feature.

Before opening a PR:

    npm run lint
    npm run build

---

## Acknowledgements

- **Minecraft** is a trademark of Mojang Studios. This tool is unaffiliated with Mojang and is not endorsed by them.
- Texture catalogs are generated from publicly distributed client jars.
- Icon set: Lucide
- UI foundation: Bootstrap 5 (dark mode only) + custom CSS
- Framework: Electron + React + Vite
- Zip handling: adm-zip

---

## Author

**Sepehr Khosravi** — 2026

---

## License

MIT — see LICENSE for details.

You may use this software to create, edit, and share Minecraft resource packs freely, including for commercial minigame servers. Attribution appreciated but not required.
