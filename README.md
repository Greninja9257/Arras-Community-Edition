# Arras Community Edition

<p align="center">
  <img src="public/img/round.png" alt="Arras Community Edition Logo" width="120">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-v18+-green">
  <img src="https://img.shields.io/badge/license-PolyForm%20Noncommercial%201.0.0-blue">
  <img src="https://img.shields.io/github/stars/Greninja9257/Arras-Community-Edition">
  <img src="https://img.shields.io/github/all-contributors/Greninja9257/Arras-Community-Edition?color=ee8449&style=flat-square">   
</p>

> ⚠️ **Beta Warning**  
> Arras Community Edition is beta software. This build is not representative of the final product. Expect bugs, breaking changes, and incomplete features.

---

## 📌 Fork Notice

This project is forked from:  
https://github.com/AE0hello/open-source-arras/

---

## 📚 Table of Contents

- [🎮 About](#-about)
- [✨ Features](#-features)
- [📋 Requirements](#-requirements)
- [🚀 Quick Start (Localhost)](#-quick-start-localhost)
- [🐳 Docker (Local Development)](#-docker-local-development)
- [📁 Project Structure](#-project-structure)
- [⚙️ Configuration](#️-configuration)
- [🔐 Environment Variables](#-environment-variables)
- [👤 Accounts & Sessions](#-accounts--sessions)
- [🌐 Server Travel (Nexus)](#-server-travel-nexus)
- [🧩 Addons](#-addons)
- [🗺 Rooms & Maps](#-rooms--maps)
- [🤖 Bots & AI](#-bots--ai)
- [🛡 Administration & Moderation](#️-administration--moderation)
- [🔧 Development Tips](#-development-tips)
- [🛠 Troubleshooting](#-troubleshooting)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [👥 Community](#-community)

---

## 🎮 About

Arras Community Edition is a **self-hostable multiplayer Arras game server with a web client**.

It provides:

- Integrated web client server (`http://localhost:3000`)
- Multi-instance real-time game servers (`3001+`)
- Modding framework (definitions, addons, room systems)
- Optional account system with stats and friends
- Multi-server travel (Nexus portals)
- Docker support

---

## ✨ Features

- Web client hosted by the same Node process
- Room system with configurable maps and modes
- Entity definitions and addon hooks for modding
- Optional authentication, sessions, and friends
- Travel between servers via Nexus portals
- Dockerfile for local containers

---

## 📋 Requirements

- Node.js **18+**
- npm

Verify installation:

```bash
node -v
npm -v
```

---

## 🚀 Quick Start (Localhost)

Install dependencies:

```bash
npm install
```

Start the server:

Windows:

```bash
run.bat
```

macOS / Linux:

```bash
./run.sh
```

Alternative:

```bash
npm start
```

Open the client:

`http://localhost:3000`

If you see `Package 'ws' is not installed`, run:

```bash
npm install ws
```

---

## 🐳 Docker (Local Development)

Build image:

```bash
docker build -t arras-ce .
```

Run with live file sync:

```bash
docker run -d --name arras \
  -p 3000-3017:3000-3017 \
  -v "$(pwd):/usr/src/app" \
  arras-ce
```

Stop / Remove:

```bash
docker stop arras
docker rm arras
```

Without volume mounting, rebuild the image after code changes.

---

## 📁 Project Structure

| Path | Description |
| --- | --- |
| server/server.js | Main server entry |
| server/config.js | Core configuration |
| server/.env | Tokens and API keys |
| server/data/users.json | Account storage |
| server/data/sessions.json | Session storage |
| server/Game/ | Game logic |
| server/lib/definitions/ | Entity definitions |
| server/Game/addons/ | Gameplay addons |
| server/Game/room_setup/ | Maps and room layouts |
| public/ | Web client assets |

---

## ⚙️ Configuration

All primary settings are in:

`server/config.js`

### 🌐 Web Server Settings

```js
host: "localhost:3000",
port: 3000,
allow_ACAO: true
```

### 🕹 Game Server Setup

Example configuration:

```js
servers: [
  {
    share_client_server: false,
    host: "localhost:3001",
    port: 3001,
    id: "ffa",
    featured: false,
    region: "local",
    gamemode: ["ffa"],
    player_cap: 80,
    properties: {
      bot_cap: 16
    }
  }
]
```

Notes:

- `gamemode` references files from `server/Game/gamemodeconfigs/`
- `properties` override global config values
- `player_cap` affects server capacity and UI display

---

## 🔐 Environment Variables

Location:

`server/.env`

Common production setup:

```bash
PUBLIC_HOST=yourdomain.com
PORT=3000
GAME_HOST=yourdomain.com
GAME_PORT_BASE=3001
API_KEY=your_secret_key
```

Additional notes:

- `PUBLIC_HOST` affects client connections and share links.
- `GAME_PORT_BASE` defines the first port in your game server range.

---

## 👤 Accounts & Sessions

API Routes:

- POST /api/register
- POST /api/login
- POST /api/logout
- POST /api/validate
- POST /api/profile
- POST /api/friends

Storage Files:

- server/data/users.json
- server/data/sessions.json

Deleting these files resets all accounts and sessions.

---

## 🌐 Server Travel (Nexus)

Enable on destination server:

```js
ALLOW_SERVER_TRAVEL: true
```

Configure source server:

```js
SERVER_TRAVEL_PROPERTIES: {
  LOOP_INTERVAL: 10000,
  AMOUNT: 1
},
SERVER_TRAVEL: [
  {
    IP: "localhost:3002",
    PORTAL_PROPERTIES: {
      SPAWN_CHANCE: 3,
      COLOR: "red"
    }
  }
]
```

---

## 🧩 Addons

Gameplay Addons:

Path:

`server/Game/addons/`

Example:

```js
module.exports = ({ Events, Config }) => {
  Events.on("chatMessage", () => {});
};
```

Entity Addons:

Path:

`server/lib/definitions/entityAddons/`

Example:

```js
module.exports = ({ Class }) => {
  Class.customTank = {};
};
```

---

## 🗺 Rooms & Maps

Directory:

`server/Game/room_setup/`

Add a new map:

- Create room file in `rooms/`
- Use tiles from `tiles/`
- Assign the room in the gamemode config

---

## 🤖 Bots & AI

Controllers:

`server/miscFiles/controllers.js`

Default bot definition:

`server/lib/definitions/groups/misc.js`

Behavior tuning:

`server/config.js`

---

## 🛡 Administration & Moderation

Permissions file:

`server/permissions.js`

Chat commands:

`server/Game/addons/chatCommands.js`

Tokens are managed in:

`server/.env`

---

## 🔧 Development Tips

- Definitions and addons hot-reload on restart, so keep run scripts handy.
- When testing new servers, increment `id` values and ports to avoid conflicts.
- For local multiplayer testing, open multiple browser windows or profiles.

---

## 🛠 Troubleshooting

| Problem | Fix |
| --- | --- |
| ws package missing | npm install ws |
| Port already in use | Change Config.port |
| Client loads but no servers | Check Config.servers |
| Server travel broken | Verify API_KEY and flags |

---

## 🤝 Contributing

Workflow:

- Fork the repository
- Create a feature branch
- Commit focused changes
- Submit a pull request
- Include repro steps or screenshots for gameplay/UI changes

## Contributors

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

---

## 📄 License

This project uses the PolyForm Noncommercial License 1.0.0.  
See LICENSE for full text.

---

## 👥 Community

Discord:  
https://discord.gg/arras
