# GlyphIsland

GlyphIsland is a compact desktop status capsule and focus widget for Windows and Linux. It borrows the direct, monochrome visual language of Nothing hardware: matte surfaces, precise technical labels, dot matrix type, restrained motion, and a single red status signal. It is an independent desktop utility and is not affiliated with Nothing Technology Limited.

## Features

- An always-on-top, borderless capsule with a 24-hour clock, CPU and battery status, and an animated audio indicator.
- A modular bento panel with live CPU, memory, battery, and network telemetry.
- Telemetry is sampled every three seconds only while the expanded panel is visible; CPU and memory use Node's built-in OS counters.
- Built-in Rain, White Noise, and Deep Synth focus soundscapes, generated locally with the Web Audio API, with volume control.
- A clipboard vault that keeps the 10 most recent distinct text snippets for quick copy-back.
- A 25/50-minute focus timer with a red progress indicator on the collapsed capsule.
- Dark OLED black and matte off-white themes, plus a system tray menu for visibility, theme, position reset, and quit controls.
- Click-through transparent space around the widget so the desktop remains usable beneath it.

## Design system

The default OLED theme uses a pure black base, charcoal modules, crisp graphite dividers, white primary text, technical gray labels, and Nothing red (`#D71921`) for live state and progress. The light theme uses matte off-white and pale gray surfaces with the same black ink and red signal. Silkscreen supplies the dot matrix display typography, paired with Space Mono for labels and controls. The interface avoids glossy gradients and blurred glass effects.

## Technology

- Electron for the transparent always-on-top desktop window, system tray, native clipboard, and IPC.
- React and TypeScript for the interface and typed renderer logic.
- Tailwind CSS is included in the requested styling stack; this version uses a small, explicit CSS design system for precise widget surfaces and typography.
- Framer Motion for the capsule and panel transitions.
- Lucide React for monochrome interface icons.
- `systeminformation` for hardware telemetry.
- Vite and `electron-builder` for frontend compilation and desktop packaging.

## Development

Install Node.js 22 or newer, then run:

```sh
npm install --legacy-peer-deps
npm run dev
```

Run the TypeScript checks and production frontend/Electron build with:

```sh
npm run typecheck
npm run build
```

## Download builds

GitHub Actions packages a portable Windows x64 executable and a Linux x64 AppImage on pushes to `main`, version tags, pull requests, and manual runs. Open the repository's **Actions** tab, select a successful **Build GlyphIsland Desktop** run, and download the `GlyphIsland-windows-portable` or `GlyphIsland-linux-appimage` artifact. The output files are named `GlyphIsland-Windows.exe` and `GlyphIsland-Linux.AppImage`.

To create the matching package locally, run `npm run pack:win` on Windows or `npm run pack:linux` on Linux. Packages are written to `release/`.

## Notes

Telemetry and clipboard access are provided by the local Electron main process. Clipboard polling stores text snippets in memory for the current session. Audio focus sounds are synthesized locally and do not require a network connection. The Silkscreen and Space Mono font files are loaded from Google Fonts when a network connection is available; system monospace fallbacks remain in place offline.
