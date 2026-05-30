# AlgoArena— Chrome Extension

> Figma + Discord + Excalidraw for LeetCode collaboration

A futuristic, galaxy-themed collaborative Chrome Extension that injects a floating draggable panel into LeetCode pages.

---


## Tech Stack

| Tool | Purpose |
|------|---------|
| React 18 | UI framework |
| TypeScript | Type safety |
| TailwindCSS 3 | Styling |
| Framer Motion | Animations |
| Zustand | State management |
| Lucide React | Icons |
| Vite | Build tool |
| Chrome MV3 | Extension manifest |

---

## Quick Start (Dev Preview)

```bash
# 1. Install dependencies
npm install

# 2. Start dev server (UI preview in browser)
npm run dev

# 3. Open http://localhost:3000
```

The dev server shows the full UI on a fake LeetCode-looking background.
You can test all features: chat, rooms, members, settings, explanation mode.

---

## Build Chrome Extension

```bash
# Build extension bundle
npm run build:extension

# Output: dist/
```

### Load in Chrome:
1. Open `chrome://extensions`
2. Enable **Developer Mode** (top right)
3. Click **Load unpacked**
4. Select the `dist/` folder
5. Navigate to `leetcode.com` — the panel will inject automatically

---

## Features to Test in Dev Preview

| Feature | How to test |
|---------|-------------|
| Drag panel | Click and drag the header |
| Collapse/Expand | Click the chevron button |
| Chat | Type messages, send code snippets |
| Member list | Switch to Members tab |
| Raise Hand | Members tab → Raise Hand button |
| Create Room | Room tab → Create Room |
| Join Room | Room tab → Join Room |
| Settings | Gear icon in header |
| Galaxy particles | Settings → Galaxy Particles toggle |
| Explanation mode | (trigger via store or add a demo button) |

---

## Backend Integration Points

To be updated...


## Design System

**Colors:** Galaxy dark (`#03020a` → `#1e1660`) + Nebula accents (violet, blue, cyan)  
**Fonts:** Space Grotesk (display) + DM Sans (body) + JetBrains Mono (code)  
**Effects:** Glassmorphism panels, star particles, glow borders, spring animations
