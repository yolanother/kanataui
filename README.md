# KanataUI

A cross-platform desktop app for configuring [kanata](https://github.com/jtroo/kanata) keyboard remapping — no manual config editing required.

![KanataUI](https://img.shields.io/badge/version-0.1.0-blue) ![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Visual keyboard editor** — click keys to assign actions, modifiers, layers, and macros
- **Home row mods** — one-click setup for GACS (GUI/Alt/Ctrl/Shift) with basic or advanced anti-misfire presets
- **Ergonomic layouts** — split keyboard editors for Corne, Lily58, Moonlander, and Kinesis Advantage
- **Quick setup wizard** — get a working config in 3 steps
- **Live preview** — see your generated `.kbd` config before saving
- **Start/stop kanata** — launch and manage kanata directly from the app or system tray
- **Log viewer** — real-time kanata output with filtering and copy support
- **Config simulation** — test key sequences without applying changes
- **Autostart** — optionally launch KanataUI on system boot
- **Dark/light theme** — follows your system preference or toggle manually

## Tech Stack

- [Tauri v2](https://v2.tauri.app/) (Rust backend)
- [React 19](https://react.dev/) + TypeScript
- [Vite](https://vitejs.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://rustup.rs/) (stable)
- Platform-specific Tauri dependencies — see [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)

### Setup

```bash
git clone --recurse-submodules https://github.com/user/kanataui.git
cd kanataui
npm install
```

### Build kanata binaries

KanataUI bundles kanata from source via the git submodule:

```bash
node scripts/build-kanata.js
```

This compiles `kanata` and `kanata_simulated_input` for your platform and places them in `src-tauri/binaries/`.

### Development

```bash
npx tauri dev
```

### Production build

```bash
npx tauri build
```

The installer/bundle will be in `src-tauri/target/release/bundle/`.

## Project Structure

```
src/                          # React frontend
  components/
    keyboard/                 # QWERTY + ergonomic keyboard editors
    wizard/                   # Quick setup wizard
    settings/                 # Autostart toggle
    log/                      # Log viewer
    ui/                       # Shared UI components (Toast, etc.)
  lib/
    kanata/                   # Config engine: parser, generator, types, presets, key mappings
src-tauri/                    # Rust backend
  src/
    main.rs                   # Tauri commands, kanata process management
    tray.rs                   # System tray menu
kanata/                       # Kanata source (git submodule)
scripts/
  build-kanata.js             # Cross-platform kanata build script
```

## How It Works

KanataUI parses and generates kanata `.kbd` config files using S-expression parsing. The visual editors let you modify layers and key actions, which are serialized back to valid kanata config format. The app manages the kanata process lifecycle — starting, stopping, and streaming logs.

## License

[MIT](LICENSE)
