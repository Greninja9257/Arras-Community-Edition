# Arras Community Edition

<img alt="Logo" src="public/img/round.png" width="100"/>

![GitHub Release](https://img.shields.io/github/v/release/AE0Hello/open-source-arras)
![Discord](https://img.shields.io/discord/1004907608018264094)
![GitHub repo size](https://img.shields.io/github/repo-size/AE0Hello/open-source-arras)

> [!WARNING]
> **Arras Community Edition is beta software.** This build is **not** representative of the final product. Expect bugs and missing features.

## Fork Notice
This project is a fork of https://github.com/AE0hello/open-source-arras/.

### Changes in this fork
- Gameplay and balance updates (AI, trains mode, dominators, traps, bullets)
- UI/UX updates (skill bar visuals, chat input behavior, blackout rendering)
- QoL and stability fixes (leaderboard colors, tag teams, login inputs, playtime leveling)

## Setup Guide (Localhost)

This guide covers setting up your server on your own hardware and only supports devices running up-to-date versions of Windows/macOS/Linux.

You'll first need to install [Node.js](https://nodejs.org). It doesn't matter if you pick the LTS or Latest version, they'll both work fine.

Once `Node.js` is installed, open your terminal application (Command Prompt for Windows users) and run the command `npm i ws`. This will install the WebSocket library that Arras Community Edition uses.

After installing `ws`, [download the source code of the latest release of Arras Community Edition](https://github.com/AE0hello/open-source-arras/releases). Extract it once it's downloaded and open either `run.bat` (if you're on Windows) or `run.sh` (if you're not). If there aren't any errors, your server will start up. Go to `localhost:3000` in your favourite web browser (keep the terminal window open, closing it will shut down the server) to play.

> [!NOTE]
> If you want to stay up to date, create a fork, download a git client (such as GitHub Desktop), and sync the fork whenever there's a major update.
> 
> **Major updates may introduce breaking changes that alter how certain things work. It is *your responsibility* to keep your private server up-to-date and functioning.**

## Server setup
You can set up in-game servers in config.js file, in `SERVERS`. For further explanation, see the setting itself. It's an array of objects where each object is a server.

### Travelling between servers (Nexus)
Copy this code into your server's `PROPERTIES`:
```
SERVER_TRAVEL_PROPERTIES: {
    LOOP_INTERVAL: 10000, // how often the portal loop executes
    AMOUNT: 1, // amount of portals to spawn
},
SERVER_TRAVEL: [
    {
        IP: "<YourIP>", // destination server IP, don't add "https://" or any slashes to it
        PORTAL_PROPERTIES: {
            SPAWN_CHANCE: 3, // chance for a portal to spawn somewhere in the map each loop iteration (higher = more chances)
            COLOR: "red", // portal color
        }
    }
]
```

> [!NOTE]
> Make sure to set `ALLOW_SERVER_TRAVEL` to true in your destination server's `PROPERTIES`.

## Other Links
- [Our Discord server](https://discord.gg/arras)

*p.s. if something goes terribly wrong it's not our fault*
