# Velocity Duel — Real-Time 2-Player Isometric Drag & Sprint Racer

A high-octane, real-time multiplayer car racing game built with React and Socket.io. Players can create a race room, share a match code or link with a friend, customize their retro arcade racer, toggle ready status, and compete head-to-head in an isometric drag sprint featuring manual gear shifts, perfect launch timing, and high-pressure nitro boosts.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The game design incorporates your preferences from Phase 1:
> - **Visual & Camera Style**: Isometric retro arcade perspective with custom canvas rendering, depth sorting, dynamic asphalt tracks, and neon-lit street environments.
> - **Game Mode & Rules**: Sprint drag race with RPM tachometer, clutch gear-shift timing (Bad / Good / Perfect Shift), launch control, and strategic nitro charge depletion.
> - **Matchmaking & Room Flow**: Instant room generation ("Create Race") with a 6-character code and copyable invite link. The second player inputs the code to join. Both players select their car livery, hit **Ready**, and a synchronized 3-2-1-GO countdown launches the race.
> - **Audio & Atmosphere**: Pure browser Web Audio API procedural sound engine (no external audio files that could fail) delivering responsive engine rumble, gear shift clicks, screeching tires, nitro hiss, countdown tones, and checkered flag fanfare.
> - **Solo Practice Mode**: Included alongside multiplayer so you can test car handling and shifting mechanics anytime, even before your friend joins.

---

## 1. Overview & Core Concept

- **What It Does**: Enables two friends on any browser to create a room, connect in real-time via Socket.io, line up at the starting grid, and race across a 1/4-mile isometric drag corridor with authentic drag mechanics (launch reaction, RPM power band, manual upshifting, and nitro).
- **Target Audience**: Casual and competitive web gamers seeking fast-paced 2-player multiplayer showdowns with zero installation or account requirements.
- **Key Value**: True low-latency synchronization, responsive 60 FPS isometric canvas rendering, instant lobby invite sharing, and arcade physics that feel immediate and tactile.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Title & Matchmaking Hub**:
   - Player 1 clicks **"Host Race"** $\rightarrow$ A room is allocated with a unique 6-character room code (e.g. `NEON99`) and a direct share link.
   - Player 2 inputs the code or clicks the invite link $\rightarrow$ Instantly connects and lands in the same lobby.
   - Optional **"Solo Test Run"** button for immediate practice against a ghost racer.
2. **Race Paddock & Lobby**:
   - Displays both racers side-by-side: Player 1 (Host) and Player 2 (Challenger).
   - Vehicle selector: Choose between 3 retro muscle and tuner cars (Apex GT, Turbo Phantom, Crimson Vector) with distinct top speed, acceleration, and gear ratio curves.
   - Color picker: Custom paint jobs (Hot Rod Red, Cyber Teal, Solar Yellow, Midnight Purple).
   - Both players click **"Ready Up"**. When both are locked in, the lobby transitions seamlessly to the starting grid.
3. **The Race Experience**:
   - **Starting Tree**: Traditional Christmas tree lights (Red $\rightarrow$ Yellow $\rightarrow$ Green) with 3-2-1 audio beeps. Launching before Green causes a false start penalty!
   - **Isometric HUD & Controls**:
     - Analog/Digital Tachometer showing current RPM, redline warning zone, and optimal gear shift indicator.
     - Gear indicator (1st through 5th gear) with Shift Up (`Space` or `W` / `↑` / on-screen paddle) and Shift Down (`S` / `↓`).
     - Shift rating callouts: "EARLY", "GOOD", "PERFECT SHIFT (+10% Boost)", or "OVER-REV".
     - Nitro canister with trigger button (`Shift` / `N` / on-screen Nitro button) for explosive acceleration bursts with isometric flame trails.
     - Split track progress bar showing both cars' real-time distances along the sprint track.
   - **Post-Race Podium & Rematch**:
     - Finish line photo-finish camera effect with elapsed time to the millisecond (`08.412s`), top speed achieved, and shift accuracy percentage.
     - Instant **"Rematch"** button resetting both cars to the starting line without losing the room connection.

### Visual Identity & Theme

- **Aesthetic Direction**: Neo-arcade 1990s isometric sprint racing with crisp vector lines, asphalt textures, glowing track barriers, and dynamic smoke/tire skid particle systems.
- **Color Palette**:
  - Neutral Canvas: Deep asphalt charcoal (`#090D16` and `#111827`).
  - Structural Surfaces: Midnight slate (`#1E293B`) with subtle hairline border styling (`#334155`).
  - High-Octane Accents: Cyber amber (`#F59E0B`), nitro cyan (`#06B6D4`), and launch green (`#10B981`).
- **Typography & Hierarchy**:
  - Display Font: Athletic condensed headings (`Oswald` / `Barlow Condensed`) for high-speed impact.
  - Telemetry & Timing: Monospaced tabular numerals (`tabular-nums font-mono`) for precision race times, RPM gauges, and match codes.
- **Controls & Responsiveness**:
  - Keyboard: `W` or `↑` (Throttle / Shift Up), `S` or `↓` (Shift Down), `Space` (Shift Up), `Shift` or `N` (Nitro).
  - Mobile & Touch: Dual on-screen paddle shifters, large gas pedal, and nitro actuator sized $\ge 48\text{px}$.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Full-Stack Express + Socket.io Server Architecture**:
  - *Chosen Approach*: Implement a lightweight Node.js Express server running on port 3000 that serves both the Vite frontend bundle and an integrated Socket.io WebSocket server on the same HTTP instance.
  - *Why*: Provides sub-30ms state synchronization across real browser instances, zero third-party dependencies, and zero configuration for users.
  - *Alternative Considered*: Peer-to-peer WebRTC was rejected due to complex STUN/TURN firewall traversal issues in cloud sandboxes.
- **Decision 2: Authoritative Server Loop with Client-Side Prediction**:
  - *Chosen Approach*: The server computes race ticks (60Hz), validates start countdowns, gear ratios, and distance milestones. Clients run local physics prediction for immediate throttle response and smoothly interpolate opponent position updates via linear interpolation (LERP).
  - *Why*: Eliminates input lag for the local player while ensuring competitive integrity and preventing desynchronization.
- **Decision 3: HTML5 Canvas Rendering for Isometric Scene**:
  - *Chosen Approach*: Dedicated HTML5 Canvas with custom isometric 2.5D projection matrix ($x' = (x - y) \times \cos(30^\circ)$, $y' = (x + y) \times \sin(30^\circ)$), custom car sprites with dynamic shadow offsets, wheel rotation, and particle emitters.
  - *Why*: Rock-solid 60 FPS performance on both mobile and desktop with zero heavy external 3D engine overhead.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Browser A                       │
│  ┌───────────────────┐  ┌───────────────┐  ┌─────────────┐  │
│  │ Matchmaking Lobby │  │ Isometric     │  │ Web Audio   │  │
│  │ & Ready Controls  │  │ Canvas Engine │  │ Synthesizer │  │
│  └─────────┬─────────┘  └───────▲───────┘  └──────▲──────┘  │
│            │                    │                 │         │
│            ▼                    │                 │         │
│     Socket.io Client ───────────┴─────────────────┘         │
└───────────────────▲─────────────────────────────────────────┘
                    │ WebSocket Events (port 3000)
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                   Node.js + Express Server                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  Socket.io Server                     │  │
│  │  - Room Manager (UUID / 6-char codes)                 │  │
│  │  - Race State Authority (Waiting, Countdown, Racing)  │  │
│  │  - 60Hz Physics & Delta Sync Engine                   │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         Static Asset & Vite Dev / Prod Server         │  │
│  └───────────────────────────────────────────────────────┘  │
└───────────────────▲─────────────────────────────────────────┘
                    │ WebSocket Events (port 3000)
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                      Client Browser B                       │
│  ┌───────────────────┐  ┌───────────────┐  ┌─────────────┐  │
│  │ Matchmaking Lobby │  │ Isometric     │  │ Web Audio   │  │
│  │ & Ready Controls  │  │ Canvas Engine │  │ Synthesizer │  │
│  └───────────────────┘  └───────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Event Contracts (Socket.io)

| Event Name | Direction | Payload | Description |
|:---|:---|:---|:---|
| `room:create` | Client $\rightarrow$ Server | `{ carModel, color, name }` | Creates a new race room and returns unique 6-character code |
| `room:join` | Client $\rightarrow$ Server | `{ roomCode, carModel, color, name }` | Joins existing room via code |
| `room:update` | Server $\rightarrow$ Both | `{ roomId, players, status }` | Broadcasts current roster and ready states |
| `player:ready` | Client $\rightarrow$ Server | `{ isReady: boolean }` | Toggles player readiness |
| `race:countdown` | Server $\rightarrow$ Both | `{ countdown: number }` | Triggers 3, 2, 1, GO synchronized timer |
| `player:input` | Client $\rightarrow$ Server | `{ throttle, gear, nitro, rpm }` | Transmits driving inputs and shift triggers |
| `race:tick` | Server $\rightarrow$ Both | `{ racers: { [id]: { x, speed, gear, rpm, nitro } } }` | Synchronized 60Hz physics broadcast |
| `race:finish` | Server $\rightarrow$ Both | `{ winnerId, results: [...] }` | Final race rankings, times, and telemetry |
| `room:rematch` | Client $\rightarrow$ Server | `{}` | Requests or accepts rematch |

---

## 5. Execution Steps

1. **Backend Real-Time Infrastructure**:
   - Install `socket.io` and `socket.io-client`.
   - Create `server.ts` with Express and Socket.io server logic handling rooms, ready triggers, 60Hz game loop, and race state machine.
   - Update `package.json` dev and start scripts to execute full-stack Node server with `tsx server.ts`.
2. **Procedural Web Audio Engine**:
   - Create `src/audio/soundEngine.ts` using Web Audio API oscillators for procedural engine pitch modulation based on RPM, clutch pop sound, nitro jet hiss, countdown beeps, and victory fanfare.
3. **Isometric Canvas Renderer**:
   - Create `src/game/IsometricCanvas.tsx` with dynamic isometric perspective, multi-lane drag strip, finish line banners, animated crowd rails, vehicle rendering with custom colors, tire smoke particles, and nitro flame effects.
4. **Race HUD & Shifting Mechanics**:
   - Implement authentic drag mechanics: RPM gauge with redline indicator, clutch shift buttons, timing feedback ("PERFECT SHIFT"), and nitro trigger.
5. **Lobby, Code Sharing & Rematch UI**:
   - Clean, high-impact lobby view with room code display, one-click copy button, vehicle customization garage, player ready switches, and victory summary podium.
6. **Verification**:
   - Test build and compilation with `compile_applet` and verify dev server responsiveness.
