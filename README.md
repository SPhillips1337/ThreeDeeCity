# ThreeDeeCity

A high-performance, 3D city-building simulation built for the web. Experience the thrill of urban planning with real-time simulation, dynamic zoning, and complex infrastructure management.

## 🏗 Features

- **3D City Rendering:** Built with **Three.js** for a smooth, immersive 3D experience directly in your browser.
- **Dynamic Zoning (RCI):** 
  - **Residential:** Houses and apartments for your citizens.
  - **Commercial:** Shops and services to drive the economy.
  - **Industrial:** Factories and production centers.
- **Infrastructure:** Lay down complex road networks to connect your city.
- **Real-time Simulation:** Advanced simulation engine tracking population growth, economic health, and time progression.
- **Interactive Tools:**
  - **Zone Tool:** Easily zoning areas for development.
  - **Road Tool:** Intelligent pathfinding and road placement.
  - **Bulldoze:** Clear space for new developments.
- **Time Controls:** Play, Pause, and Fast-Forward to manage your city's growth.

## 🛠 Tech Stack

- **Frontend:** Vanilla JavaScript, HTML5, CSS3
- **Graphics:** [Three.js](https://threejs.org/) (WebGL)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Simulation:** Custom modular simulation engine with road-access requirements.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (Latest LTS recommended)
- npm or yarn

### Installation

#### Option 1: installer script

Download and run the hardened installer from the repository root:

```bash
curl -fsSL https://raw.githubusercontent.com/SPhillips1337/ThreeDeeCity/main/install.sh -o install.sh
chmod +x install.sh
./install.sh
```

If you already cloned the repository, run the same script from inside the checkout:

```bash
./install.sh
```

The installer validates that an existing directory is a `SPhillips1337/ThreeDeeCity` checkout before installing dependencies. For a validation-only run, set `THREEDEECITY_SKIP_INSTALL=1`.

Review the downloaded script before running it, especially when fetching from a mutable branch such as `main`.

#### Option 2: manual setup

1. Clone the repository:
   ```bash
   git clone https://github.com/SPhillips1337/ThreeDeeCity.git
   cd ThreeDeeCity
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to `http://localhost:5173`.

## 🎮 Controls

- **Mouse Wheel:** Zoom in/out
- **Right Click + Drag:** Rotate Camera
- **Left Click:** Use Active Tool
- **Left Click + Drag:** Area Zoning / Road Placement
- **Keyboard Shortcuts:**
  - `S`: Select Tool
  - `R`: Residential Zone
  - `C`: Commercial Zone
  - `I`: Industrial Zone
  - `W`: Road Tool
  - `B`: Bulldozer

## 🧪 Development Protocol

This project is developed using the **Antigravity Development Protocol**, an autonomous agent-based workflow designed for high-velocity engineering. See [AGENTS.md](AGENTS.md) for more details.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

*Maximize Momentum. Minimize Gravity.*
