<div align="center">

# 🔭 SpaceScope

**A beautiful desktop disk-space analyzer. See exactly where every gigabyte went — then clean it up.**

Scan an entire drive (or any folder), get an animated visual breakdown by category — Windows system files, Docker/WSL disks, `node_modules`, Downloads, temp & caches, media — and open any item in File Explorer to clean it yourself.

Electron · React · TypeScript · Vite · Tailwind CSS · Framer Motion · D3 · Recharts · Zustand

</div>

---

## Screenshots

> _Placeholder — drop real captures in `docs/` and update these links._

| Light mode — Treemap | Dark mode — List |
| --- | --- |
| `docs/screenshot-treemap-light.png` | `docs/screenshot-list-dark.png` |

| Quick Wins panel | Drill-down |
| --- | --- |
| `docs/screenshot-quickwins.png` | `docs/screenshot-drilldown.png` |

---

## Features

- **Drive overview** — every drive with an animated used/free donut and one-click scan.
- **Interactive treemap** — proportional, color-coded blocks (squarified layout). Hover for a tooltip; click a folder to drill down with a smooth transition; breadcrumb to climb back up.
- **Sortable list view** — Name · Size · Share · Category · Modified, with filter chips for Docker, `node_modules`, Temp, Large Files (>500 MB) and Media.
- **Smart categorization** — System / Apps / User Data / Docker / Dev / Media / Temp / Other, including the often-hidden **WSL2 `ext4.vhdx`** Docker disk.
- **Quick Wins** — reclaimable temp files, Recycle Bin, browser caches (Chrome / Edge / Firefox, auto-detected), Docker/WSL disks, Windows Update cache and thumbnail cache — each with an exact size and an **Open in Explorer** button.
- **Light & dark themes** — light is the default; deep, true-dark surfaces for night. Preference persists.
- **Fast, non-blocking scanning** — recursive scan runs in a `worker_thread`, streams live progress (current path, file count, %), and gracefully skips permission-denied folders.
- **Instant reopen** — results are cached to disk, so relaunching shows your last scan immediately with a timestamp.
- **Read-only & safe** — SpaceScope never deletes anything. It points you at what to clean; you stay in control.

---

## Getting started

### Prerequisites
- **Node.js 18+** (developed on Node 22)
- **Windows 10 / 11** (the categorizer and Quick Wins are Windows-focused; the app also launches on macOS/Linux with a generic root scan)

### Install & run in dev

```bash
npm install
npm run dev
```

This launches Electron with Vite HMR — edit any renderer file and it hot-reloads.

### Build a Windows installer

```bash
npm run build
```

Produces `SpaceScope-Setup-x64.exe` (NSIS installer) and a portable build in `release/<version>/` via electron-builder.
To produce an unpacked app folder without an installer (faster, for testing):

```bash
npm run build:dir
```

> **App icon:** place a `build/icon.ico` (256×256) to brand the installer and window; otherwise the default Electron icon is used.

### Publishing a release (so the website download works)

The landing page's download button points at the latest release asset
`SpaceScope-Setup-x64.exe`. Publish a release one of two ways:

**Automated (recommended)** — push a version tag and GitHub Actions builds + publishes:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The [`.github/workflows/release.yml`](.github/workflows/release.yml) workflow runs
`npm run release` on a Windows runner and attaches the installer to a new GitHub
Release automatically (uses the built-in `GITHUB_TOKEN`).

**Manual** — run `npm run build`, then on GitHub create a new Release for the tag
and drag `release/<version>/SpaceScope-Setup-x64.exe` into the assets.

### macOS

There's no macOS build yet. The UI and the scan engine are cross-platform, but
the Windows-specific features (Quick Wins, Recycle Bin sizing, Docker/WSL `.vhdx`
detection, drive labels) need macOS equivalents first, and a `.dmg` must be built
on macOS (electron-builder can't build/sign Mac apps from Windows) — typically via
the `macos-latest` job stubbed in the release workflow, plus an Apple Developer
account for signing/notarization.

### Type-check

```bash
npm run typecheck
```

---

## How it works

```
┌──────────────────────────────── Main process (Node) ────────────────────────────────┐
│  index.ts      window + lifecycle + production CSP                                     │
│  ipc.ts        all ipcMain handlers, broadcasts scan events to the renderer           │
│  drives.ts     drive enumeration via fs.statfs (+ volume labels via PowerShell)       │
│  scanner.ts    owns the worker thread, streams progress, caches results to JSON       │
│  quickwins.ts  measures temp / caches / Recycle Bin / Docker disks / update cache     │
│                                                                                        │
│  workers/scanWorker.ts  ← recursive, bounded-concurrency scanner (runs off-thread)     │
└───────────────────────────────────────┬───────────────────────────────────────────────┘
                                         │  contextBridge (preload/index.ts)
                                         │  window.spacescope.* — fully typed IPC surface
┌───────────────────────────────────────┴───────────────────────────────────────────────┐
│  Renderer (React + TS)                                                                  │
│  store/useStore.ts   Zustand: drives, scan status, results, navigation, theme, view     │
│  components/         Sidebar · TopBar · Breadcrumb · Treemap · ListView · RightPanel …   │
│  theme               CSS variables drive light/dark; persisted to localStorage          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

**Shared contract** lives in `src/shared/` (`types.ts`, `categorize.ts`, `format.ts`) and is imported by both sides, so the IPC API and categorization rules never drift.

### IPC API (`window.spacescope`)

| Method | Purpose |
| --- | --- |
| `getDrives()` | List drives with `total` / `free` / `used`. |
| `startScan(drivePath)` | Begin a scan; streams progress events. |
| `cancelScan()` | Cancel the active scan. |
| `getScanResults()` / `getCachedScan()` | Latest in-memory / on-disk result. |
| `getQuickWins(drivePath)` | Reclaimable-space estimates. |
| `openInExplorer(path)` | Reveal a path (or `shell:` folder) in Explorer. |
| `onScanProgress / onScanComplete / onScanError` | Event subscriptions (return an unsubscribe fn). |

### Performance notes
- The scanner retains items ≥ 2 MB and the largest ~140 children per folder, collapsing the rest into a "Smaller items" bucket — so the tree stays light while still summing to 100%.
- File `stat`s and sub-directory recursion both use a bounded concurrency pool to stay fast without exhausting file handles.
- Symlinks/junctions are skipped to avoid loops and double-counting.

---

## Project structure

```
src/
  main/         Electron main process (window, IPC, drives, scanner, quick wins)
  preload/      contextBridge — the typed window.spacescope API
  renderer/     React app (components, hooks, store, theme)
  shared/       Types + categorization + formatting shared by both sides
  workers/      The worker-thread scan script
electron.vite.config.ts     bundling (main / preload / renderer)
electron-builder.config.cjs Windows packaging (NSIS + portable, GitHub publish)
.github/workflows/release.yml  tag-triggered build + publish
tailwind.config.js          design tokens mapped to CSS variables
```

---

## Contributing

Issues and PRs welcome. Some good first areas: per-drive parallel scans, an in-app "reveal largest files" jump, macOS/Linux Quick Wins, and exportable scan reports.

## License

[MIT](LICENSE) © SpaceScope Contributors
