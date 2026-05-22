# 🚀 LeetCode Collab — Chrome Extension

> Figma + Discord + Excalidraw for LeetCode collaboration

A futuristic, galaxy-themed collaborative Chrome Extension that injects a floating draggable panel into LeetCode pages.

---

## 🗂 Folder Structure

```
src/
├── components/
│   ├── ui/           # Shared UI: MemberAvatar, NotificationBadge, VoiceIndicator, etc.
│   ├── chat/         # ChatPanel, ChatMessage, ChatInput
│   ├── room/         # RoomHeader, RoomPanel, JoinRequestCard, RaiseHandButton
│   ├── members/      # MemberSidebar
│   ├── voice/        # (placeholder for voice controls)
│   └── settings/     # SettingsModal
├── draggable/        # FloatingPanel — main draggable container
├── overlays/         # ExplanationOverlay, ExcalidrawPlaceholder
├── store/            # Zustand stores (room, chat, panel, voice, explanation)
├── websockets/       # Socket service + event handlers
├── hooks/            # useDraggable, useSocket, useTypingIndicator, useAutoScroll
├── types/            # All TypeScript interfaces
├── constants/        # Socket events, languages, avatars, panel sizes
├── mock/             # Mock data for dev/demo
├── services/         # API service placeholders
├── utils/            # Formatting, helpers
├── extension/        # Chrome Extension: content.ts, background.ts
└── styles/           # globals.css
```

---

## 🛠 Tech Stack

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

## ⚡ Quick Start (Dev Preview)

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

## 🔨 Build Chrome Extension

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

## 🎮 Features to Test in Dev Preview

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

## 🔌 Backend Integration Points

When you're ready to add a real backend:

### 1. WebSocket URL
```ts
// src/constants/index.ts
export const WS_CONFIG = {
  BASE_URL: 'ws://your-backend.com', // ← Change this
  ...
}
```

### 2. API Endpoints
```ts
// src/services/roomService.ts
// Uncomment the fetch() calls and replace the placeholder returns
```

### 3. Socket Event Handlers
```ts
// src/websockets/eventHandlers.ts
// Wire handlers to Zustand store actions
```

---

## 📦 Extension Architecture

```
Chrome Extension (MV3)
├── content.ts     → Injects React app into LeetCode pages via Shadow DOM
├── background.ts  → Service worker for badge updates & tab messaging
└── manifest.json  → Permissions for leetcode.com domains
```

The Shadow DOM strategy prevents style conflicts with LeetCode's own CSS.

---

## 🧩 Adding Backend (When Ready)

1. Start a WebSocket server (e.g. Bun + ws, Node + Socket.IO)
2. Update `WS_CONFIG.BASE_URL` in `constants/index.ts`
3. Uncomment real API calls in `services/roomService.ts`
4. Wire `eventHandlers.ts` to store actions
5. The UI is fully ready — no changes needed

---

## 🎨 Design System

**Colors:** Galaxy dark (`#03020a` → `#1e1660`) + Nebula accents (violet, blue, cyan)  
**Fonts:** Space Grotesk (display) + DM Sans (body) + JetBrains Mono (code)  
**Effects:** Glassmorphism panels, star particles, glow borders, spring animations
