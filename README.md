# MINI VICE CITY

**Your City. Your Story. Your Freedom.**

A browser-based 3D open-world urban exploration and driving game set in a sunlit coastal metropolis, built with procedural Three.js WebGL architecture, React, TypeScript, and Web Audio synthesis.

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-r187-000000?style=flat-square&logo=threedotjs&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)

---

## About the Game

**MINI VICE CITY** puts you on the streets of a stylized tropical coastal island city. Start on the palm-lined Ocean Drive boardwalk, step into a waiting sports coupe, and explore five interconnected districts at your own pace.

Whether you want to chase timed street races, evade Vice Coastal Police Department (VCPD) pursuits, unlock new rides for your garage, or cruise under a dynamic sky from golden hour to neon-lit rainstorms, the entire city runs directly in your browser with procedural 3D visuals and synthesized audio.

---

## Game Features

- **Five Connected Coastal Districts**: Explore a 4×4 road grid with 16 signal-controlled intersections, sidewalks, boardwalks, palm trees, sandy beachfront, Atlantic ocean shader waves, and seawall perimeters.
- **Third-Person On-Foot Exploration**: Walk, sprint, and jump around the city with articulated character animation, building/vehicle collision handling, and free camera orbit/zoom.
- **Custom 3D Vehicles & Handling**: Drive distinct custom-modeled vehicles featuring steering wheel pivots, rotating tires, suspension pitch and roll, headlights, brake lights, and handbrake drifting.
- **5 Playable Missions + Free Roam**: Play through story, sprint race, police-chase courier, landmark exploration, and precision valet missions—or switch to Free Roam anytime.
- **Living City Traffic & Pedestrians**: Share the streets with 14 autonomous civilian traffic vehicles that yield at red lights and intersections, plus 22 sidewalk pedestrians who stroll, pause, sidestep, and scatter from speeding cars.
- **VCPD Police Pursuit System**: Trigger 1-to-5 star wanted levels through reckless driving, crashes, or missions. Up to 4 VCPD pursuit cruisers join the chase with alternating red/blue lightbars, proximity sirens, ramming collisions, and evasion/busted outcomes.
- **Dynamic Time of Day & Weather**: Switch between 6 lighting presets (including a continuous 24-hour cycle) and Clear, Cloudy, or Rain weather with live clouds, raindrops, wet road reflections, and selective HDR bloom.
- **100% Procedural Web Audio**: Synthesizes engine RPM, tire screech, footsteps, jumping, door latches, crash impacts, two-tone police sirens, coastal/rain ambience, and a mellow synthwave pulse without external audio files.
- **Live HUD & Local Progression**: Includes an interactive minimap with mission, vehicle, and police blips, a vehicle speedometer/gear display, health bar, wanted stars, cash balance, and automatic browser-local saving.

---

## City Districts

Discovering a new district awards a **+$250** exploration bonus:

| District | Description |
| :--- | :--- |
| **Ocean Drive** | Sun-drenched eastern beachfront promenade featuring Art Deco pastel hotels and resorts (with rooftop pools), palm-lined boardwalks, sandy shore, marina area, and your starting spawn point. |
| **Downtown Vice** | The central corporate core anchored by the 66m **Vice Tower** landmark, multi-tier skyscrapers, plaza shops, and a multi-level parking deck. |
| **Coral Heights** | Northwest coastal neighborhood lined with residential villas, apartments, local storefronts, and the tree-shaded Bayside Palm Park. |
| **Vice Industrial Harbour** | Southwest port district featuring heavy industrial warehouses and stacked shipping container yards. |
| **Neon Mile** | Central-south nightlife strip filled with glowing neon clubs, lounges, and the Vice Theater. |

---

## Vehicles

### Player-Drivable Vehicles (Garage & Street Spawns)

| Vehicle | Class | Top Speed | How to Unlock / Price |
| :--- | :--- | :--- | :--- |
| **Veloce GT** | Twin-Turbo Coastal Sports Coupe | ~137 km/h | Unlocked from start (`$0`) |
| **Solstice Royale** | Executive Luxury Grand Sedan | ~119 km/h | `$2,500` in Garage (or complete *The First Ride*) |
| **Bayside Titan** | All-Terrain Coastal Luxury SUV | ~108 km/h | `$4,000` in Garage (or complete *Harbour Express*) |

### AI City Vehicles (Non-Drivable)

| Vehicle | Role | Notes |
| :--- | :--- | :--- |
| **City Cruiser** | Civilian Traffic Sedan | Spawns across city avenues in 7 paint finishes; obeys traffic signals and yields at intersections. |
| **VCPD Interceptor** | Vice Coastal Police Pursuit Unit | Deploys during wanted chases with police livery, front push-bar, grille/roof strobes, and pursuit AI. |

---

## How to Play

1. **Start the Game**: On the Title Screen, press **`Enter`** / **`Space`** or click **Play** (or **Continue Story** / **New Game** if a previous save is present). You can also inspect **Controls** or adjust **Settings** before starting.
2. **Enter Your Starter Car**: You begin on foot along Ocean Drive with `$500` and the first mission (**The First Ride**) active. Walk up to the marked **Veloce GT** and press **`F`** when the prompt appears.
3. **Follow Objective Markers**: Watch the 3D gold beacon in the city and the yellow blip on the bottom-left **Minimap**. Drive or walk through each checkpoint to advance the mission and earn cash rewards.
4. **Explore & Switch Modes**: Press **`Esc`** or **`P`** (or click **Menu** / **Pause** on the HUD) to open the Pause Hub:
   - **Paused**: Resume gameplay, restart the current mission, **Switch to Free Roam**, start a **2-Star VCPD Police Chase**, or return to the main menu.
   - **Missions**: Replay or start any of the 5 missions (*The First Ride*, *Ocean Drive Sprint*, *Harbour Express*, *Skyline Explorer*, *Valet Precision*).
   - **Garage**: Buy vehicles you have enough cash for, or click **Deliver Nearby** on unlocked vehicles to spawn them right beside you.
   - **Settings**: Customize graphics, camera, time of day, weather, and audio in real time.
5. **Manage Police Heat & Health**: Crashing into traffic at speed or startling pedestrians raises your **Wanted Level** (1–5 stars). Escape police sight until the **Evading VCPD** meter fills to clear your stars for a `$350` per-star cash bonus. Being cornered by police at low speed results in getting **Busted** (`-$400` fine, capped at your balance), and losing all HP results in being **Wrecked** (`-$300` fine, capped at your balance).

---

## Complete Game Controls

### On-Foot Controls

| Key / Input | Action |
| :--- | :--- |
| `W` / `A` / `S` / `D` or `Arrow Keys` | Move character (relative to camera view) |
| `Shift` (Left or Right) | Sprint |
| `Space` | Jump |
| `F` | Enter nearby drivable vehicle |

### Driving Controls

| Key / Input | Action |
| :--- | :--- |
| `W` or `Arrow Up` | Accelerate |
| `S` or `Arrow Down` | Brake / Reverse |
| `A` / `D` or `Arrow Left` / `Arrow Right` | Steer left / right |
| `Space` | Handbrake / Drift |
| `C` | Cycle driving camera (`Chase` → `Close` → `Hood`) |
| `F` | Exit vehicle |

### Camera & Menu Controls

| Key / Input | Action |
| :--- | :--- |
| `Left-Click + Drag` | Orbit third-person camera freely |
| `Right-Click` | Request pointer-lock mouse look (gameplay) |
| `Mouse Wheel` | Zoom third-person camera in / out |
| `M` | Mute / Unmute all game audio |
| `Esc` or `P` | Pause / Resume game (`Esc` also closes title modals) |
| `Enter` or `Space` (Title Screen) | Start / Continue game |

> **Tip:** Append `?autostart=1` to the URL (for example, `http://localhost:3000/?autostart=1`) to boot directly into gameplay.

---

## Settings

Accessible from both the **Title Screen** and the **Pause Menu**, all settings apply live and save automatically:

- **Graphics Quality**: `Low`, `Medium`, or `High` (scales directional shadow maps, environment reflections, and selective HDR bloom / color-grading post-processing).
- **Resolution Scale**: `75%` to `100%` (in `5%` increments).
- **Mouse Sensitivity**: `0.4x` to `2.0x`.
- **Driving Camera Mode**: `Chase`, `Close`, or `Hood`.
- **Time of Day**: `Golden Hour (Signature)`, `Morning Sunlight`, `Bright Afternoon`, `Miami Sunset Dusk`, `Neon Nightlife`, or `Dynamic 24h Cycle`.
- **Weather**: `Clear`, `Cloudy`, or `Rain`.
- **Audio Mix**: Global `Audio Active / Muted` toggle plus independent sliders for **Master Volume**, **Radio & Synth Music**, **Engine & Effects**, and **City & Rain Ambience**.

---

## Installation and Local Setup

### Prerequisites

- **Node.js** `^20.19.0` or `>=22.12.0` (required by Vite 8)
- **npm** (bundled with Node.js)
- A modern desktop web browser with **WebGL2** support

### Run Locally

1. Clone the repository:

   ```bash
   git clone https://github.com/Vivek-Kumar-IIITD24/mini-vice-city.git
   cd mini-vice-city
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the local development server:

   ```bash
   npm run dev
   ```

4. Open the game in your browser at:

   ```text
   http://localhost:3000
   ```

No API keys or `.env` configuration are required to run the game locally.

Alternatively, if you use [Bun](https://bun.sh/), you can install and start the dev server with:

```bash
bun install
bun run dev
```

---

## Development Commands

| Command | Script | Description |
| :--- | :--- | :--- |
| `npm run dev` | `vite --port=3000 --host=0.0.0.0` | Start the Vite dev server on port 3000 |
| `npm run build` | `vite build` | Build the production bundle into `dist/` |
| `npm run preview` | `vite preview` | Preview the production build locally |
| `npm run lint` | `tsc --noEmit` | Run TypeScript type-checking |
| `npm run clean` | `node -e "['dist','server.js'].forEach(p=>require('fs').rmSync(p,{recursive:true,force:true}))"` | Remove build output (`dist/` and `server.js`) using a cross-platform Node.js script |

---

## Save System

Progress and settings are stored automatically in your browser's `localStorage` under the key **`mini_vice_city_save_v1`**:

- **What is saved**: Cash balance, completed missions, unlocked vehicles, active mission & checkpoint index, discovered districts, best mission clear times, cumulative stats (`distanceDrivenKm`, `missionsCompleted`, `maxWantedEscaped`), and all game settings.
- **When it saves**: Automatically every 15 seconds during active gameplay, as well as immediately on mission start/checkpoint/completion, vehicle purchases, district discoveries, settings changes, and returning to the main menu.
- **Scope**: Saves are strictly browser-local (clearing site data removes your save; there is no account system or cloud sync). Selecting **New Game** on the title screen resets story and world progress while preserving your current settings.

---

## Technology Stack

- **UI & State**: React 19, TypeScript, Tailwind CSS v4
- **3D Engine & Rendering**: Three.js (`r187`), WebGL2, `EffectComposer`, `UnrealBloomPass`, custom GLSL sky/ocean/grading shaders, dynamic PMREM environment reflections
- **Audio**: Native Browser Web Audio API (100% procedural synthesis)
- **Persistence**: Browser `localStorage`
- **Build Tooling**: Vite 8 (`@vitejs/plugin-react`, `@tailwindcss/vite`)

---

## Project Notes

- **Controls Focus**: Designed for desktop keyboard and mouse play; touch/mobile virtual controls are not included.
- **License**: No `LICENSE` file is currently present in the repository root.
