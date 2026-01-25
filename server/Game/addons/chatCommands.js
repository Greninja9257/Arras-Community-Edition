const prefix = "$";

// Lightweight entity tagging system for developer commands.
// Tags are short numeric handles that persist across commands.
const devTags = new class {
    constructor() {
        /** @type {Map<number, any>} */
        this.tags = new Map();
        this.last = 0;
    }
    get(tag) {
        return this.tags.get(tag);
    }
    has(entity) {
        let tag = null;
        for (const [t, e] of this.tags.entries()) {
            if (e?.id === entity?.id) {
                tag = t;
                break;
            }
        }
        return tag;
    }
    add(entity) {
        const existing = this.has(entity);
        if (existing !== null) return existing;
        const id = ++this.last;
        this.tags.set(id, entity);
        return id;
    }
    pruneDead() {
        for (const [id, e] of this.tags.entries()) {
            if (!e || typeof e.isDead !== "function" || e.isDead()) {
                this.tags.delete(id);
            }
        }
    }
};

/** COMMANDS **/
let commands = [
  {
        command: ["help"],
        description: "Show this help menu.",
        level: 0,
        run: ({ socket, level }) => {
            let useOldMenu = false;
            let lines = [
            "Help menu:",
            ...commands.filter((c) => level >= c.level && !c.hidden).map((c) => {
                    let cmdData = [c.command];
                    let commandText = cmdData.map((e) => e.map((name) => name).join(` or ${prefix} `)).join(" ")
                    let description = c.description ?? false;
                    let text = `- ${prefix} ${commandText}`;
                    if (description) text += ` - ${description}`;
                    return text;
                }),
            ];
            if (useOldMenu) {
                for (let line of lines.reverse()) {
                    socket.talk("m", 15_000, line);
                }
            } else socket.talk("Em", 15_000, JSON.stringify(lines));
        },
    },
    {
        command: ["leaderboard", "b"],
        description: "Select the leaderboard to display.",
        level: 0,
        run: ({ socket, args }) => {
            let sendAvailableLeaderboardMessage = () => {
                let lines = [
                    "Available leaderboards:",
                    ...leaderboards.map(lb => `- ${lb}`)
                ];
                socket.talk("Em", 10_000, JSON.stringify(lines));
            };

            const leaderboards = [
                "default",
                "players",
                "bosses",
                "global",
            ];
            const choice = args[0];

            if (!choice) {
                sendAvailableLeaderboardMessage(socket);
                return;
            }

            if (leaderboards.includes(choice)) {
                socket.status.selectedLeaderboard = choice;
                socket.status.forceNewBroadcast = true;
                socket.talk("m", 4_000, "Leaderboard changed.");
            } else {
                socket.talk("m", 4_000, "Unknown leaderboard.");
            }
        }
    },
    {
        command: ["toggle", "t"],
        description: "Enable or disable chat",
        level: 0,
        run: ({ socket }) => {
            socket.status.disablechat = socket.status.disablechat ?? false;
            socket.talk("m", 3_000, `In-game chat ${socket.status.disablechat ? "enabled" : "disabled"}`);
        }
    },
    {
        command: ["arena"],
        description: "Manage the arena",
        level: 1,
        hidden: true,
        run: ({ socket, args, gameManager }) => {
            let sendAvailableArenaMessage = () => {
                let lines = [
                    "Help menu:",
                    `- ${prefix} arena size dynamic - Make the size of the arena dynamic, depending on the number of players`,
                    `- ${prefix} arena size <width> <height> - Set the size of the arena`,
                    `- ${prefix} arena team <team> - Set the number of teams, from 0 (FFA) to 4 (4TDM)`,
                    `- ${prefix} arena spawnpoint [x] [y] - Set a location where all players spawn on default`,
                    `- ${prefix} arena close - Close the arena`,
                ];
                if (!Config.sandbox) lines.splice(1, 1)
                socket.talk("Em", 10_000, JSON.stringify(lines));
            }
            if (!args[0]) sendAvailableArenaMessage(); else {
                switch (args[0]) {
                    case "size":
                        if (args[1] === "dynamic") {
                            if (!Config.sandbox) return socket.talk("m", 3_000, "This command is only available on sandbox.");
                            gameManager.room.settings.sandbox.do_not_change_arena_size = false;
                        } else {
                            if (!args[1] || !args[2]) return socket.talk("m", 3_000, "Invalid arguments.");
                            if (args[1] % 2 === 0 && args[2] % 2 === 0) {
                                if (Config.sandbox) gameManager.room.settings.sandbox.do_not_change_arena_size = true;
                                gameManager.updateBounds(args[1] * 30, args[2] * 30);
                            } else {
                                socket.talk("m", 3000, "Arena size must be even.");
                            }
                        }
                        break;
                    case "team":
                        if (!args[1]) return socket.talk("m", 3_000, "Invalid argument.");
                        if (args[1] === "0") {
                            Config.mode = "ffa";
                            Config.teams = null;
                            socket.rememberedTeam = undefined;
                        } else {
                            Config.mode = "tdm";
                            Config.teams = args[1];
                            socket.rememberedTeam = undefined;
                        }
                        break;
                    case "spawnpoint":
                        if (!args[1] || !args[2]) return socket.talk("m", 3_000, "Invalid arguments.");
                        socket.talk("m", 4_000, "Spawnpoint set.");
                        global.spawnPoint = {
                            x: parseInt(args[1] * 30),
                            y: parseInt(args[2] * 30),
                        };
                        break;
                    case "close":
                        util.warn(`${socket.player.body.name === "" ? `An unnamed player (ip: ${socket.ip})` : socket.player.body.name} has closed the arena.`);
                        gameManager.closeArena();
                        break;
                    default:
                        socket.talk("m", 4_000, "Unknown subcommand.");
                }
            }
        }
    },
    {
        command: ["broadcast"],
        description: "Broadcast a message to all players.",
        level: 2,
        hidden: true,
        run: ({ args, socket, gameManager }) => {
            if (!args[0]) {
                socket.talk("m", 5_000, "No message specified.");
            }
            else {
                gameManager.socketManager.broadcast(args.join(" "));
            }
        }
    },
    {
        command: ["define"],
        description: "Change your level.",
        level: 2,
        hidden: true,
        run: ({ args, socket }) => {
            if (!args[0]) {
                socket.talk("m", 5_000, "No entity specified.");
            }
            else {
                socket.player.body.define({ RESET_UPGRADES: true, BATCH_UPGRADES: false });
                socket.player.body.define(args[0]);
                socket.talk("m", 5_000, `Changed to ${socket.player.body.label}`);
            }
        },
    },
    {
        command: ["level"],
        description: "Change your level.",
        level: 2,
        hidden: true,
        run: ({ args, socket }) => {
            if (!args[0]) {
                socket.talk("m", 5_000, "No level specified.");
            }
            else {
                socket.player.body.define({ LEVEL: args[0] });
                socket.talk("m", 5_000, `Changed to level ${socket.player.body.level}`);
            }
        },
    },
    {
        command: ["team"],
        description: "Change your team.", // player teams are -1 through -8, dreads are -10, room is -100 and enemies is -101
        level: 2,
        hidden: true,
        run: ({ args, socket }) => {
            if (!args[0]) {
                socket.talk("m", 5_000, "No team specified.");
            }
            else {
                socket.player.body.define({ COLOR: getTeamColor(args[0]), TEAM: args[0] });
                socket.talk("m", 5_000, `Changed to team ${socket.player.body.team}`);
            }
        },
    },
    {
        command: ["developer", "dev"],
        description: "Developer commands, go troll some players or just take a look for yourself.",
        level: 3,
        run: ({ socket, args, gameManager }) => {
            const sendAvailableDevCommandsMessage = (pageArg, pageAltArg) => {
                const lines = [
                    "Dev commands:",
                    "- $ dev entity [name] - tag yourself or a named entity",
                    "- $ dev tags [prefix] - list active entity tags",
                    "- $ dev color <base> [hue=0] [brightness=1] [saturation=0] [invert=0|1] [tag|id|name]",
                    "- $ dev god [on|off]",
                    "- $ dev noclip [on|off]",
                    "- $ dev invisible [on|off]",
                    "- $ dev tp <x> <y>",
                    "- $ dev tp rel <dx> <dy> [tag|id|name]",
                    "- $ dev tp grid <gx> <gy> [tag|id|name]",
                    "- $ dev tp center [dx] [dy] [tag|id|name]",
                    "- $ dev tp facing <d> [dy] [tag|id|name]",
                    "- $ dev tphere <name|id>",
                    "- $ dev tpall <x> <y>",
                    "- $ dev size <n> [tag|id|name]",
                    "- $ dev fov <n> [tag|id|name]",
                    "- $ dev level <n> [tag|id|name]",
                    "- $ dev skill <points> [tag|id|name]",
                    "- $ dev cap <cap> [tag|id|name]",
                    "- $ dev state <attr> <n|*n|/n> [tag|id|name]",
                    "- $ dev maxchildren <n> [overrideTurrets=0|1] [tag|id|name]",
                    "- $ dev guns <attr> <n|*n|/n> [tag|id|name]",
                    "- $ dev define <class> [tag|id|name]",
                    "- $ dev team <team> [tag|id|name]",
                    "- $ dev wall grid [name]",
                    "- $ dev wall <dx> <dy> [tiles=1] [name]",
                    "- $ dev me <tag|id|name> <message...>",
                    "- $ dev edit <message...>",
                    "- $ dev setlevel <n>",
                    "- $ dev setscore <n>",
                    "- $ dev setskill <stat> <n>",
                    "- $ dev maxskills",
                    "- $ dev heal",
                    "- $ dev killme",
                    "- $ dev kill <name|id>",
                    "- $ dev respawn",
                    "- $ dev resetstats",
                    "- $ dev spawn <entity> [count]",
                    "- $ dev despawn <radius>",
                    "- $ dev clearbots",
                    "- $ dev addbots <n>",
                    "- $ dev freeze [on|off]",
                    "- $ dev restart",
                    "- $ dev closearena",
                    "- $ dev speed <mult>",
                    "- $ dev size <mult>",
                    "- $ dev fov <mult>",
                    "- $ dev recoil [on|off]",
                    "- $ dev autocannon [on|off]",
                    "- $ dev nohit [on|off]",
                    "- $ dev nofire [on|off]",
                    "- $ dev nomove [on|off]",
                    "- $ dev dev",
                    "- $ dev listplayers",
                    "- $ dev info <name|id>",
                    "- $ dev control <name|id>",
                    "- $ dev uncontrol",
                    "- $ dev giveop <name|id>",
                    "- $ dev revokeop <name|id>",
                    "- $ dev ban <name|id>",
                    "- $ dev permaban <name|id>",
                    "- $ dev unban <ip>",
                    "- $ dev reloaddefs",
                    "- $ dev reloadroom",
                    "- $ dev mockups",
                    "- $ dev perf",
                    "- $ dev entities",
                    "- $ dev reload <n|inf>",
                    "- $ dev reloadattrs",
                ];
                const pageSize = 12;
                const totalPages = Math.max(1, Math.ceil(lines.length / pageSize));
                let rawPage = null;
                if (pageArg === "page") {
                    rawPage = parseNumber(pageAltArg);
                } else {
                    rawPage = parseNumber(pageArg);
                    if (rawPage == null && pageArg) {
                        const cleaned = String(pageArg).replace(/[^\d]/g, "");
                        rawPage = parseNumber(cleaned);
                    }
                }
                const page = rawPage == null ? 1 : Math.max(1, Math.min(totalPages, rawPage));
                const start = (page - 1) * pageSize;
                const chunk = lines.slice(start, start + pageSize);
                const header = `Dev commands (page ${page}/${totalPages}):`;
                if (chunk[0] !== "Dev commands:") {
                    chunk.unshift(header);
                } else {
                    chunk[0] = header;
                }
                socket.talk("Em", 10_000, JSON.stringify(chunk));
            };
            const command = args[0];
            const body = socket.player?.body;
            const clampToggle = (value) => {
                if (value == null) return null;
                if (["on", "true", "1"].includes(value)) return true;
                if (["off", "false", "0"].includes(value)) return false;
                return null;
            };
            const parseNumber = (value) => Number.isFinite(Number(value)) ? Number(value) : null;
            const parseBoolean = (value, fallback = false) => {
                if (value == null) return fallback;
                const lowered = String(value).toLowerCase();
                if (["true", "1", "on"].includes(lowered)) return true;
                if (["false", "0", "off"].includes(lowered)) return false;
                return fallback;
            };
            const findPlayer = (query) => {
                if (!query) return null;
                const lower = query.toLowerCase();
                for (const client of gameManager.clients) {
                    const playerBody = client.player?.body;
                    if (!playerBody) continue;
                    if (String(playerBody.id) === query) return client;
                    if ((playerBody.name || "").toLowerCase() === lower) return client;
                }
                return null;
            };
            const ensureBody = () => {
                if (!body) {
                    socket.talk("m", 5_000, "You must be spawned.");
                    return false;
                }
                return true;
            };
            const setToggle = (value, fallback) => {
                const parsed = clampToggle(value);
                return parsed == null ? !fallback : parsed;
            };
            const resolveEntity = (query, fallback = body, { allowNameSearch = true } = {}) => {
                if (!query) return fallback;
                const asNumber = parseNumber(query);
                if (asNumber != null) {
                    // Prefer tagged entities first.
                    const tagged = devTags.get(asNumber);
                    if (tagged && typeof tagged.isDead === "function" && !tagged.isDead()) return tagged;
                    // Then try player id.
                    const player = findPlayer(String(asNumber));
                    if (player?.player?.body) return player.player.body;
                    socket.talk("m", 5_000, `Unknown entity reference: ${query}`);
                    return null;
                }
                if (allowNameSearch) {
                    const player = findPlayer(query);
                    if (player?.player?.body) return player.player.body;
                    const lowered = String(query).toLowerCase();
                    for (const e of entities.values()) {
                        const name = (e.name || "").toLowerCase();
                        if (name && name === lowered) return e;
                    }
                }
                socket.talk("m", 5_000, `Unknown entity reference: ${query}`);
                return null;
            };
            const statIndex = {
                atk: 6,
                hlt: 7,
                spd: 4,
                str: 2,
                pen: 1,
                dam: 3,
                rld: 0,
                mob: 9,
                rgn: 8,
                shi: 5,
            };

            if (!command) return sendAvailableDevCommandsMessage(args[1], args[2]);
            if (command === "page" || parseNumber(command) != null || String(command).match(/^\(?\d+\)?$/)) {
                return sendAvailableDevCommandsMessage(command, args[1]);
            }

            if (command === "reloaddefs" || command === "redefs") {
                /* IMPORT FROM (defsReloadCommand.js) */
                if (!global.reloadDefinitionsInfo) {
                    global.reloadDefinitionsInfo = {
                        lastReloadTime: 1,
                    };
                }
                // Rate limiter for anti-lag
                let time = performance.now();
                let sinceLastReload = time - global.reloadDefinitionsInfo.lastReloadTime;
                if (sinceLastReload < 5000) {
                    socket.talk('m', Config.popup_message_duration, `Wait ${Math.floor((5000 - sinceLastReload) / 100) / 10} seconds and try again.`);
                    return;
                }
                // Set the timeout timer ---
                global.reloadDefinitionsInfo.lastReloadTime = time;

                // Remove function so all for(let x in arr) loops work
                delete Array.prototype.remove;

                // Before we purge the class, we are going to stop the game interval first
                gameManager.gameHandler.stop();

                // Now we can purge Class
                Class = {};

                // Log it.
                util.warn(`[IMPORTANT] Definitions are going to be reloaded on server ${gameManager.gamemode} (${gameManager.webProperties.id})!`);

                // Purge all cache entries of every file in definitions
                for (let file in require.cache) {
                    if (!file.includes('definitions') || file.includes(__filename)) continue;
                    delete require.cache[file];
                }

                // Load all definitions
                gameManager.reloadDefinitions();

                // Put the removal function back
                Array.prototype.remove = function (index) {
                    if (index === this.length - 1) return this.pop();
                    let r = this[index];
                    this[index] = this.pop();
                    return r;
                };

                // Redefine all tanks and bosses
                for (let entity of entities.values()) {
                    // If it's a valid type, and it's not a turret
                    if (!['tank', 'miniboss', 'food'].includes(entity.type)) continue;
                    if (entity.bond) continue;

                    let entityDefs = JSON.parse(JSON.stringify(entity.defs));
                    // Save color to put it back later
                    let entityColor = entity.color.compiled;

                    // Redefine all properties and update values to match
                    entity.upgrades = [];
                    entity.define(entityDefs);
                    for (let instance of entities.values()) {
                        if (
                            instance.settings.clearOnMasterUpgrade &&
                            instance.master.id === entity.id
                        ) {
                            instance.kill();
                        }
                    }
                    entity.skill.update();
                    entity.syncTurrets();
                    entity.refreshBodyAttributes();
                    entity.color.interpret(entityColor);
                }

                // Tell the command sender
                socket.talk('m', Config.popup_message_duration, "Successfully reloaded all definitions.");


                // Erase mockups so it can rebuild.
                mockupData = [];
                // Load all mockups if enabled in configuration
                if (Config.load_all_mockups) global.loadAllMockups(false);

                setTimeout(() => { // Let it sit for a second.
                    // Erase cached mockups for each connected clients.
                    gameManager.clients.forEach(socket => {
                        socket.status.mockupData = socket.initMockupList();
                        socket.status.selectedLeaderboard2 = socket.status.selectedLeaderboard;
                        socket.status.selectedLeaderboard = "stop";
                        socket.talk("RE"); // Also reset the global.entities in the client so it can refresh.
                        if (Config.load_all_mockups) for (let i = 0; i < mockupData.length; i++) {
                            socket.talk("M", mockupData[i].index, JSON.stringify(mockupData[i]));
                        }
                        socket.status.selectedLeaderboard = socket.status.selectedLeaderboard2;
                        delete socket.status.selectedLeaderboard2;
                        socket.talk("CC"); // Clear cache
                    });
                    // Log it again.
                    util.warn(`[IMPORTANT] Definitions are successfully reloaded on server ${gameManager.gamemode} (${gameManager.webProperties.id})!`);
                    gameManager.gameHandler.run();
                }, 1000)
                return;
            }

            if (command === "reloadroom") {
                gameManager.setRoom();
                gameManager.defineRoom();
                gameManager.socketManager.broadcastRoom();
                socket.talk("m", 5_000, "Room reloaded.");
                return;
            }

            if (command === "mockups") {
                mockupData = [];
                if (Config.load_all_mockups) global.loadAllMockups(false);
                socket.talk("m", 5_000, "Mockups reloaded.");
                return;
            }

            if (command === "perf") {
                socket.talk("m", 5_000, `Lag ${gameManager.lagLogger.totalTime.toFixed(2)}ms, roomSpeed ${gameManager.roomSpeed}.`);
                return;
            }

            if (command === "entities") {
                const counts = {};
                for (const e of entities.values()) {
                    counts[e.type] = (counts[e.type] || 0) + 1;
                }
                const lines = ["Entities:", ...Object.entries(counts).map(([k, v]) => `- ${k}: ${v}`)];
                socket.talk("Em", 10_000, JSON.stringify(lines));
                return;
            }

            if (command === "entity" || command === "tag") {
                if (!ensureBody()) return;
                devTags.pruneDead();
                if (!args[1]) {
                    const tagId = devTags.add(body);
                    socket.talk("m", 6_000, `Current entity tag: ${tagId}`);
                    return;
                }
                const name = args.slice(1).join(" ").trim();
                let target = null;
                for (const e of entities.values()) {
                    if ((e.name || "") === name) {
                        target = e;
                        break;
                    }
                }
                if (!target) return socket.talk("m", 5_000, "No entity with that exact name was found.");
                const tagId = devTags.add(target);
                socket.talk("m", 6_000, `${name}'s entity tag: ${tagId}`);
                return;
            }

            if (command === "tags") {
                devTags.pruneDead();
                const query = args[1] ? String(args.slice(1).join(" ")) : null;
                const lines = ["Tagged entities:"];
                for (const [id, e] of devTags.tags.entries()) {
                    if (!e || typeof e.isDead !== "function" || e.isDead()) continue;
                    if (query && !(e.name || "").startsWith(query)) continue;
                    lines.push(`- ${id}: ${e.name || e.label || "unnamed"} (id ${e.id})`);
                }
                if (lines.length === 1) lines.push("- none");
                socket.talk("Em", 10_000, JSON.stringify(lines));
                return;
            }

            if (command === "listplayers") {
                const lines = ["Players:"];
                for (const client of gameManager.clients) {
                    const b = client.player?.body;
                    if (!b) continue;
                    lines.push(`- ${b.name || "unnamed"} (id ${b.id}, team ${b.team})`);
                }
                socket.talk("Em", 10_000, JSON.stringify(lines));
                return;
            }

            if (command === "info") {
                const target = findPlayer(args[1]);
                if (!target?.player?.body) return socket.talk("m", 5_000, "Player not found.");
                const b = target.player.body;
                socket.talk("m", 8_000, `${b.name || "unnamed"} id=${b.id} team=${b.team} score=${b.skill.score} lvl=${b.skill.level}`);
                return;
            }

            if (command === "control") {
                if (!ensureBody()) return;
                const query = args.slice(1).join(" ");
                if (!query) return socket.talk("m", 5_000, "Usage: $ dev control <name|id>");
                const lower = query.toLowerCase();
                const matches = [];
                for (const e of entities.values()) {
                    if (String(e.id) === query) {
                        matches.push(e);
                        continue;
                    }
                    const name = (e.name || e.label || "").toLowerCase();
                    if (name === lower || name.includes(lower)) {
                        matches.push(e);
                    }
                }
                if (!matches.length) return socket.talk("m", 5_000, "No entity found with that name.");
                const target = ran.choose(matches);
                if (target === body) return socket.talk("m", 5_000, "You can't control yourself!");
                if (target.underControl) return socket.talk("m", 5_000, "That entity is already being controlled.");
                // Store old body info
                const oldBody = body;
                const oldName = body.name;
                const oldTeam = body.team;
                const oldSkill = body.skill;
                const oldTeamColor = socket.player.teamColor;
                // Initialize ALL missing properties on target for player compatibility
                // These MUST NOT be null/undefined - floppyvar doesn't allow them
                if (!target.killCount) target.killCount = { solo: 0, assists: 0, bosses: 0, polygons: 0, killers: [] };
                if (!target.killCount.killers) target.killCount.killers = [];
                if (target.killCount.polygons == null) target.killCount.polygons = 0;
                if (!target.upgrades) target.upgrades = [];
                if (!target.defs) target.defs = [target.label || "genericEntity"];
                // Merge settings instead of overwriting existing settings.
                target.settings = Object.assign({ canSeeInvisible: false }, target.settings || {});
                if (!target.eastereggs) target.eastereggs = { braindamage: false };
                if (!target.control) target.control = { target: { x: 0, y: 0 }, goal: { x: 0, y: 0 }, main: false, alt: false, fire: false, power: 0 };
                target.rerootUpgradeTree = target.rerootUpgradeTree || "";
                target.index = target.index || target.label || "Unknown";
                target.acceleration = target.acceleration ?? 1;
                target.topSpeed = target.topSpeed ?? 1;
                target.label = target.label || "Entity";
                target.nameColor = target.nameColor || "#ffffff";
                target.facingType = target.facingType || "toTarget";
                target.syncWithTank = target.syncWithTank ?? false;
                target.borderless = target.borderless ?? false;
                target.drawFill = target.drawFill ?? true;
                target.invuln = target.invuln ?? false;
                target.displayName = target.displayName ?? true;
                // Copy skill from old body so you keep your level/score
                target.skill = oldSkill;
                target.team = oldTeam;
                // Take control of target
                target.controllers = [];
                target.underControl = true;
                target.socket = socket;
                socket.player.body = target;
                socket.player.teamColor = oldTeamColor || "10 0 1 0 false";
                const projectileTypes = new Set(["bullet", "drone", "trap", "satellite", "swarm", "minion"]);
                const isProjectileControl = target.type !== "tank" && projectileTypes.has(target.type);
                target.store = target.store || {};
                target.store.controlledProjectile = isProjectileControl;
                // Detach from the old body before we kill it. Bullets/drones often keep their
                // original master/parent/source, and oldBody.destroy() will kill anything that
                // still references it as a master.
                try {
                    if (target.master && target.master.id === oldBody.id) {
                        target.master = target;
                    }
                    if (target.source && target.source.id === oldBody.id) {
                        target.source = target;
                    }
                    if (target.parent && target.parent.id === oldBody.id) {
                        target.parent = target;
                    }
                    if (target.bulletparent && target.bulletparent.id === oldBody.id) {
                        target.bulletparent = target;
                    }
                    if (Array.isArray(oldBody.bulletchildren)) {
                        const idx = oldBody.bulletchildren.indexOf(target);
                        if (idx !== -1) oldBody.bulletchildren.splice(idx, 1);
                    }
                    // Projectile/minion-only safety tweaks.
                    if (isProjectileControl) {
                        if (target.settings) {
                            // Ensure the entity produces camera/photo data so it can be seen
                            // and the camera can follow it when controlled.
                            target.settings.drawShape = true;
                            target.settings.diesAtRange = false;
                            target.settings.diesAtLowSpeed = false;
                            target.settings.persistsAfterDeath = true;
                        }
                        // Keep controlled entities ticking even if they would otherwise deactivate.
                        target.alwaysActive = true;
                        if (target.activation) target.activation.active = true;
                        // Generate a fresh photo immediately for the camera path.
                        if (typeof target.takeSelfie === "function") target.takeSelfie();
                        if (typeof target.RANGE === "number" && (!target.range || target.range < 1)) {
                            target.range = target.RANGE;
                        }
                    }
                } catch (e) {
                    // If anything goes wrong here, we still want control to succeed.
                }
                // Implement become() inline since not all entities have it (e.g. bullets)
                if (typeof target.become === "function") {
                    target.become(socket.player);
                } else {
                    // Manual become implementation for entities without the method
                    target.addController = target.addController || function(io) { this.controllers.push(io); };
                    target.addController(new ioTypes.listenToPlayer(target, { player: socket.player, static: false }));
                    target.sendMessage = (content, displayTime = Config.popup_message_duration) =>
                        socket.talk("m", displayTime, content);
                    target.kick = (reason) => socket.kick(reason);
                }
                // Add giveUp method if it doesn't exist (for clean disconnect)
                if (typeof target.giveUp !== "function") {
                    target.giveUp = function(player) {
                        this.controllers = [];
                        this.underControl = false;
                        // Create a fake body to kill
                        let fakeBody = new Entity({ x: this.x, y: this.y });
                        fakeBody.passive = true;
                        fakeBody.underControl = true;
                        player.body = fakeBody;
                        fakeBody.kill();
                    };
                }
                // Kill old body silently
                oldBody.dontSendDeathMessage = true;
                oldBody.skill = new (oldSkill.constructor)(); // Give old body a dummy skill before killing
                oldBody.kill();
                // Setup new body
                if (isProjectileControl) target.FOV = (target.FOV || 1) + 0.3;
                target.name = oldName;
                target.isPlayer = true;
                // Snap the camera to the controlled entity immediately so it doesn't
                // linger at the old body's position until the next valid photo tick.
                try {
                    const safeNumber = (v, d) => (typeof v === "number" && Number.isFinite(v) ? v : d);
                    const cam = socket.camera || {};
                    cam.x = safeNumber(target.x, safeNumber(cam.x, 0));
                    cam.y = safeNumber(target.y, safeNumber(cam.y, 0));
                    const currentFov = safeNumber(cam.fov, 2000);
                    const targetFov = safeNumber(target.fov, safeNumber(target.FOV, currentFov));
                    if (isProjectileControl) {
                        cam.fov = Math.max(currentFov, targetFov * 275, 1200);
                    } else {
                        // Keep tank-to-tank control at a normal player zoom level.
                        const desired = targetFov * 275;
                        cam.fov = Math.min(Math.max(desired, 600), 2000);
                    }
                    socket.camera = cam;
                    // Force the next gaze tick to snap to the controlled body as well.
                    socket.status.forceCameraToBody = isProjectileControl;
                    // Nudge the client to update its camera immediately.
                    socket.talk("c", cam.x, cam.y, cam.fov);
                } catch (e) {
                    // Camera snap is best-effort only.
                }
                socket.talk("m", 5_000, `Now controlling: ${target.label || "entity"} (id ${target.id})`);
                socket.talk("m", 8_000, "Use $ dev uncontrol to release control.");
                return;
            }

            if (command === "uncontrol") {
                if (!ensureBody()) return;
                if (!body.underControl) return socket.talk("m", 5_000, "You're not controlling anything special.");
                body.giveUp(socket.player, body.label || "Entity");
                socket.talk("m", 5_000, "Control released. You have died.");
                return;
            }

            if (command === "giveop" || command === "revokeop") {
                const target = findPlayer(args[1]);
                if (!target?.player?.body) return socket.talk("m", 5_000, "Player not found.");
                const enable = command === "giveop";
                target.player.body.hasOperator = enable;
                target.status.hasOperator = enable;
                target.talk("m", 8_000, enable ? "You are now an operator." : "You are no longer an operator.");
                socket.talk("m", 5_000, enable ? "Operator granted." : "Operator revoked.");
                return;
            }

            if (command === "ban" || command === "permaban") {
                const target = findPlayer(args[1]);
                if (!target) return socket.talk("m", 5_000, "Player not found.");
                command === "ban" ? target.ban("Banned by developer.") : target.permaban("Permanently banned by developer.");
                return;
            }

            if (command === "unban") {
                const ip = args[1];
                if (!ip) return socket.talk("m", 5_000, "No IP specified.");
                if (global.bans) global.bans = global.bans.filter(b => b.ip !== ip);
                if (global.permBans) global.permBans = global.permBans.filter(b => b.ip !== ip);
                socket.talk("m", 5_000, `Unbanned ${ip}.`);
                return;
            }

            if (!ensureBody()) return;

            if (command === "god" || command === "invuln") {
                const enable = setToggle(args[1], body.godmode);
                body.godmode = enable;
                socket.talk("m", 4_000, `Invulnerability ${enable ? "enabled" : "disabled"}.`);
                return;
            }

            if (command === "noclip") {
                const enable = setToggle(args[1], body.store.noWallCollision);
                body.store.noWallCollision = enable;
                socket.talk("m", 4_000, `Noclip ${enable ? "enabled" : "disabled"}.`);
                return;
            }

            if (command === "invisible") {
                const enable = setToggle(args[1], body.alpha === 0);
                body.invisible = [0, 0];
                body.alpha = enable ? 0 : 1;
                body.allowedOnMinimap = !enable;
                socket.talk("m", 4_000, `Invisibility ${enable ? "enabled" : "disabled"}.`);
                return;
            }

            if (command === "tp") {
                const room = gameManager.room;
                const type = (args[1] || "pos").toLowerCase();
                const tileW = room?.tileWidth ?? 30;
                const tileH = room?.tileHeight ?? 30;

                // Backwards compatibility: "$ dev tp <x> <y>"
                if (type !== "pos" && parseNumber(args[1]) != null) {
                    const x = parseNumber(args[1]);
                    const y = parseNumber(args[2]);
                    if (x == null || y == null) return socket.talk("m", 5_000, "Invalid coordinates.");
                    body.x = x;
                    body.y = y;
                    socket.talk("m", 4_000, "Teleported.");
                    return;
                }

                const x = parseNumber(args[2]);
                const y = parseNumber(args[3]);
                const targetRef = args[4];
                const target = resolveEntity(targetRef, body);
                if (!target) return;

                if (type !== "center" && x == null && y == null) {
                    return socket.talk("m", 5_000, "X and Y are required for non-center types.");
                }
                if (type !== "facing" && type !== "center" && y == null) {
                    return socket.talk("m", 5_000, "Y is required for this teleport type.");
                }

                switch (type) {
                    case "pos":
                        if (x == null || y == null) return socket.talk("m", 5_000, "Usage: tp pos <x> <y> [who]");
                        target.x = x;
                        target.y = y;
                        break;
                    case "grid":
                        if (x == null || y == null) return socket.talk("m", 5_000, "Usage: tp grid <gx> <gy> [who]");
                        target.x = x * tileW;
                        target.y = y * tileH;
                        break;
                    case "rel":
                    case "relative":
                        target.x += x ?? 0;
                        target.y += y ?? 0;
                        break;
                    case "center":
                        target.x = room.width / 2 + (x ?? 0);
                        target.y = room.height / 2 + (y ?? 0);
                        break;
                    case "facing": {
                        const distX = x ?? 0;
                        const distY = (y ?? x) ?? 0;
                        target.x = target.x + Math.cos(body.facing) * distX;
                        target.y = target.y + Math.sin(body.facing) * distY;
                        break;
                    }
                    default:
                        return socket.talk("m", 6_000, "Invalid type. Use: pos, grid, rel, center, facing.");
                }
                socket.talk("m", 4_000, "Teleported.");
                return;
            }

            if (command === "tphere") {
                const target = findPlayer(args[1]);
                if (!target?.player?.body) return socket.talk("m", 5_000, "Player not found.");
                target.player.body.x = body.x;
                target.player.body.y = body.y;
                socket.talk("m", 4_000, "Teleported player.");
                return;
            }

            if (command === "tpall") {
                const x = parseNumber(args[1]);
                const y = parseNumber(args[2]);
                if (x == null || y == null) return socket.talk("m", 5_000, "Invalid coordinates.");
                for (const client of gameManager.clients) {
                    const b = client.player?.body;
                    if (!b) continue;
                    b.x = x;
                    b.y = y;
                }
                socket.talk("m", 4_000, "Teleported all players.");
                return;
            }

            if (command === "setlevel") {
                const level = parseNumber(args[1]);
                if (level == null) return socket.talk("m", 5_000, "Invalid level.");
                body.define({ LEVEL: level });
                socket.talk("m", 4_000, `Level set to ${body.skill.level}.`);
                return;
            }

            if (command === "setscore") {
                const score = parseNumber(args[1]);
                if (score == null) return socket.talk("m", 5_000, "Invalid score.");
                body.skill.score = score;
                while (body.skill.maintain()) {}
                body.refreshBodyAttributes();
                socket.talk("m", 4_000, "Score updated.");
                return;
            }

            if (command === "setskill") {
                const stat = args[1];
                const value = parseNumber(args[2]);
                if (!stat || value == null || statIndex[stat] == null) return socket.talk("m", 5_000, "Usage: setskill <stat> <n>");
                body.skill.raw[statIndex[stat]] = Math.max(0, value);
                body.skill.update();
                body.refreshBodyAttributes();
                socket.talk("m", 4_000, "Skill updated.");
                return;
            }

            if (command === "maxskills") {
                body.skill.set(body.skill.caps);
                body.refreshBodyAttributes();
                socket.talk("m", 4_000, "Skills maxed.");
                return;
            }

            if (command === "heal") {
                body.health.amount = body.health.max;
                if (body.shield?.max) body.shield.amount = body.shield.max;
                socket.talk("m", 4_000, "Healed.");
                return;
            }

            if (command === "killme") {
                body.kill();
                return;
            }

            if (command === "kill") {
                const target = findPlayer(args[1]);
                if (!target?.player?.body) return socket.talk("m", 5_000, "Player not found.");
                target.player.body.kill();
                return;
            }

            if (command === "respawn") {
                socket.status.deceased = true;
                socket.spawn(body.name || "");
                return;
            }

            if (command === "resetstats") {
                body.skill.reset();
                body.refreshBodyAttributes();
                socket.talk("m", 4_000, "Stats reset.");
                return;
            }

            if (command === "spawn") {
                // Support two spawn formats:
                // 1) spawn <entity> [count]
                // 2) spawn <dx> <dy> <class> [ai=on|off] [name...]
                const dx = parseNumber(args[1]);
                const dy = parseNumber(args[2]);
                const className = args[3];

                if (dx != null && dy != null && className) {
                    const toggle = clampToggle(args[4]);
                    const ai = toggle ?? false;
                    const nameStartIndex = toggle == null ? 4 : 5;
                    const name = args.slice(nameStartIndex).join(" ").trim() || null;
                    let classDef;
                    try {
                        classDef = ensureIsClass(className);
                    } catch (e) {
                        return socket.talk("m", 5_000, "Unknown entity class.");
                    }
                    const entity = new Entity({ x: body.x + dx, y: body.y + dy });
                    entity.define(classDef);
                    if (ai) {
                        entity.define({
                            CONTROLLERS: ["nearestDifferentMaster", "minion", "canRepel"],
                            AI: { NO_LEAD: true },
                        });
                    }
                    if (name) entity.name = name;
                    entity.refreshBodyAttributes?.();
                    entity.life();
                    const tagId = devTags.add(entity);
                    socket.talk("m", 6_000, `Spawned ${entity.label || className}. Tag: ${tagId}`);
                    return;
                }

                const entityName = args[1];
                const count = parseNumber(args[2]) ?? 1;
                if (!entityName) return socket.talk("m", 5_000, "No entity specified.");
                let classDef;
                try {
                    classDef = ensureIsClass(entityName);
                } catch (e) {
                    return socket.talk("m", 5_000, "Unknown entity.");
                }
                for (let i = 0; i < Math.min(50, count); i++) {
                    const loc = getSpawnableArea(undefined, gameManager);
                    let o = new Entity({ x: loc.x, y: loc.y });
                    o.define(classDef);
                }
                socket.talk("m", 4_000, `Spawned ${count}.`);
                return;
            }

            if (command === "despawn") {
                const radius = parseNumber(args[1]) ?? 500;
                const radiusSq = radius * radius;
                let removed = 0;
                for (const e of entities.values()) {
                    if (e.isPlayer || e.isBot) continue;
                    const dx = e.x - body.x;
                    const dy = e.y - body.y;
                    if (dx * dx + dy * dy <= radiusSq) {
                        e.kill();
                        removed++;
                    }
                }
                socket.talk("m", 4_000, `Removed ${removed} entities.`);
                return;
            }

            if (command === "clearbots") {
                let removed = 0;
                for (const e of entities.values()) {
                    if (!e.isBot) continue;
                    e.kill();
                    removed++;
                }
                socket.talk("m", 4_000, `Removed ${removed} bots.`);
                return;
            }

            if (command === "addbots") {
                const amount = parseNumber(args[1]) ?? 1;
                for (let i = 0; i < Math.min(50, amount); i++) {
                    const loc = getSpawnableArea(undefined, gameManager);
                    gameManager.gameHandler.spawnBots(loc);
                }
                socket.talk("m", 4_000, `Added ${amount} bots.`);
                return;
            }

            if (command === "freeze") {
                const enable = setToggle(args[1], !gameManager.gameHandler.active);
                if (enable) gameManager.gameHandler.stop();
                else if (!gameManager.gameHandler.active) gameManager.gameHandler.run();
                socket.talk("m", 4_000, enable ? "Game frozen." : "Game resumed.");
                return;
            }

            if (command === "restart") {
                gameManager.closeArena();
                return;
            }

            if (command === "closearena") {
                gameManager.closeArena();
                return;
            }

            if (command === "speed") {
                const value = parseNumber(args[1]);
                if (value == null) return socket.talk("m", 5_000, "Invalid value.");
                body.SPEED = value;
                body.refreshBodyAttributes();
                socket.talk("m", 4_000, "Speed updated.");
                return;
            }

            if (command === "size") {
                const value = parseNumber(args[1]);
                const target = resolveEntity(args[2], body);
                if (!target) return;
                if (value == null || value <= 0) {
                    return socket.talk("m", 6_000, `Current size: ${target.SIZE}`);
                }
                target.SIZE = value;
                target.coreSize = value;
                target.refreshBodyAttributes?.();
                socket.talk("m", 4_000, "Size updated.");
                return;
            }

            if (command === "fov") {
                const value = parseNumber(args[1]);
                const target = resolveEntity(args[2], body);
                if (!target) return;
                if (value == null || value <= 0) {
                    return socket.talk("m", 6_000, `Current FOV: ${target.FOV}`);
                }
                target.FOV = value;
                socket.talk("m", 4_000, "FOV updated.");
                return;
            }

            if (command === "recoil") {
                const enable = setToggle(args[1], body.settings.hasNoRecoil);
                body.settings.hasNoRecoil = enable;
                socket.talk("m", 4_000, `No recoil ${enable ? "enabled" : "disabled"}.`);
                return;
            }

            if (command === "autocannon") {
                socket.player.command.autofire = !socket.player.command.autofire;
                socket.talk("m", 4_000, `Autofire ${socket.player.command.autofire ? "enabled" : "disabled"}.`);
                return;
            }

            if (command === "nohit") {
                const enable = setToggle(args[1], body.settings.noHit);
                body.settings.noHit = enable;
                socket.talk("m", 4_000, `No-hit ${enable ? "enabled" : "disabled"}.`);
                return;
            }

            if (command === "nofire") {
                const enable = setToggle(args[1], body.settings.noFire);
                body.settings.noFire = enable;
                socket.talk("m", 4_000, `No-fire ${enable ? "enabled" : "disabled"}.`);
                return;
            }

            if (command === "nomove") {
                const enable = setToggle(args[1], body.settings.noMove);
                body.settings.noMove = enable;
                socket.talk("m", 4_000, `No-move ${enable ? "enabled" : "disabled"}.`);
                return;
            }

            if (command === "dev") {
                body.define({ RESET_UPGRADES: true, BATCH_UPGRADES: false });
                body.define("developer");
                socket.talk("m", 4_000, "Switched to Developer.");
                return;
            }

            if (command === "color" || command === "rgb" || command === "colour" || command === "cr") {
                const colorBase = args[1];
                const hueShift = parseNumber(args[2]) ?? 0;
                const brightnessShift = parseNumber(args[3]) ?? 1;
                const saturationShift = parseNumber(args[4]) ?? 0;
                const allowInvert = parseBoolean(args[5], false);
                const target = resolveEntity(args[6], body);
                if (!target) return;
                if (!colorBase) {
                    socket.talk("m", 6_000, `Current color: ${target.color?.compiled ?? target.color}`);
                    return;
                }
                target.color = new Color({
                    BASE: colorBase,
                    base: colorBase,
                    HUE_SHIFT: hueShift,
                    hueShift,
                    BRIGHTNESS_SHIFT: brightnessShift,
                    brightnessShift,
                    SATURATION_SHIFT: saturationShift,
                    saturationShift,
                    ALLOW_BRIGHTNESS_INVERT: allowInvert,
                    allowBrightnessInvert: allowInvert,
                });
                socket.talk("m", 4_000, "Color updated.");
                return;
            }

            if (command === "skill") {
                const points = parseNumber(args[1]);
                const target = resolveEntity(args[2], body);
                if (!target) return;
                if (points == null) return socket.talk("m", 5_000, "Usage: skill <points> [who]");
                const before = target.skill.points;
                target.skill.points += points;
                target.skill.update();
                target.refreshBodyAttributes?.();
                socket.talk("m", 6_000, `Skill points: ${before} -> ${target.skill.points}`);
                return;
            }

            if (command === "cap") {
                const cap = parseNumber(args[1]);
                const target = resolveEntity(args[2], body);
                if (!target) return;
                if (cap == null || cap < 0) return socket.talk("m", 5_000, "Usage: cap <cap> [who]");
                const caps = target.skill.caps.map(c => (c > 0 ? cap : 0));
                target.skill.setCaps(caps);
                target.skill.update();
                target.refreshBodyAttributes?.();
                socket.talk("m", 4_000, "Skill caps updated.");
                return;
            }

            if (command === "level") {
                const desiredLevel = parseNumber(args[1]);
                const target = resolveEntity(args[2], body);
                if (!target) return;
                if (desiredLevel == null || desiredLevel < 0) {
                    return socket.talk("m", 6_000, `Current level: ${target.skill.level}`);
                }
                const startingLevel = target.skill.level;
                target.skill.reset();
                while (target.skill.level < desiredLevel) {
                    target.skill.score += target.skill.levelScore;
                    if (!target.skill.maintain()) break;
                }
                target.refreshBodyAttributes?.();
                socket.talk("m", 6_000, `Level: ${startingLevel} -> ${target.skill.level}`);
                return;
            }

            const allowedBodyAttributes = ["speed", "acceleration", "health", "regen", "shield", "resist", "range", "pushability", "damage"];
            if (command === "state" || command === "stat" || command === "body" || command === "attr") {
                const attrName = (args[1] || "").toLowerCase();
                const rawValue = args[2];
                const target = resolveEntity(args[3], body);
                if (!target) return;
                if (!allowedBodyAttributes.includes(attrName)) {
                    return socket.talk("m", 7_000, `Invalid attribute. Use one of: ${allowedBodyAttributes.join(", ")}`);
                }
                const key = attrName.toUpperCase();
                if (!rawValue) {
                    return socket.talk("m", 6_000, `Current ${attrName}: ${target[key]}`);
                }
                const numeric = parseNumber(rawValue);
                const before = target[key];
                if (numeric != null) {
                    target[key] = numeric;
                } else {
                    const op = rawValue[0];
                    const factor = parseNumber(rawValue.slice(1));
                    if (factor == null || factor <= 0) return socket.talk("m", 5_000, "Invalid value.");
                    if (op === "*") target[key] *= factor;
                    else if (op === "/") target[key] /= factor;
                    else return socket.talk("m", 6_000, "Value must be a number, *n, or /n.");
                }
                target.refreshBodyAttributes?.();
                socket.talk("m", 7_000, `${attrName}: ${before} -> ${target[key]}`);
                return;
            }

            const killChildren = (entity) => {
                let removed = 0;
                if (Array.isArray(entity.children)) {
                    for (const child of [...entity.children]) {
                        if (child && typeof child.kill === "function") {
                            child.kill();
                            removed++;
                        }
                    }
                }
                if (Array.isArray(entity.bulletchildren)) {
                    for (const child of [...entity.bulletchildren]) {
                        if (child && typeof child.kill === "function") {
                            child.kill();
                            removed++;
                        }
                    }
                }
                return removed;
            };
            const overrideMaxChildren = (entity, recursive = true) => {
                if (entity.maxChildren !== undefined) entity.maxChildren = 0;
                if (entity.countsOwnKids === true) entity.countsOwnKids = false;
                if (recursive) {
                    if (entity.turrets instanceof Map) {
                        for (const [, turret] of entity.turrets.entries()) {
                            overrideMaxChildren(turret, false);
                        }
                    }
                    if (entity.guns instanceof Map) {
                        for (const [, gun] of entity.guns.entries()) {
                            if (gun.countsOwnKids != null) gun.countsOwnKids = false;
                            killChildren(gun);
                        }
                    }
                }
                return killChildren(entity);
            };
            if (command === "maxchildren" || command === "children") {
                const value = parseNumber(args[1]);
                const overrideTurrets = parseBoolean(args[2], false);
                const target = resolveEntity(args[3], body);
                if (!target) return;
                if (value == null || value < 0) {
                    return socket.talk("m", 6_000, `Current maxChildren: ${target.maxChildren ?? 0}`);
                }
                const removed = overrideTurrets ? overrideMaxChildren(target, true) : 0;
                target.maxChildren = value;
                socket.talk("m", 7_000, `maxChildren set to ${value}${removed ? ` (cleared ${removed} children)` : ""}.`);
                return;
            }

            const allowedGunsAttributes = ["reload", "recoil", "shudder", "size", "health", "damage", "pen", "speed", "maxSpeed", "range", "density", "spray", "resist"];
            if (command === "guns") {
                const attrName = args[1];
                const rawValue = args[2];
                const target = resolveEntity(args[3], body);
                if (!target) return;
                if (!allowedGunsAttributes.includes(attrName)) {
                    return socket.talk("m", 7_000, `Invalid gun attribute. Use one of: ${allowedGunsAttributes.join(", ")}`);
                }
                const guns = target.guns instanceof Map ? Array.from(target.guns.values()) : [];
                if (!guns.length) return socket.talk("m", 5_000, "Target has no guns.");
                if (!rawValue) {
                    const values = guns.map(g => g.settings?.[attrName]).filter(v => v != null);
                    return socket.talk("m", 7_000, `Current ${attrName}: ${values.join(", ") || "n/a"}`);
                }
                const numeric = parseNumber(rawValue);
                let mode = "add";
                let value = numeric;
                if (numeric == null) {
                    mode = rawValue[0];
                    value = parseNumber(rawValue.slice(1));
                    if (value == null || value <= 0 || !["*", "/"].includes(mode)) {
                        return socket.talk("m", 6_000, "Value must be a number, *n, or /n.");
                    }
                }
                for (const gun of guns) {
                    if (!gun.settings || gun.settings[attrName] == null) continue;
                    if (mode === "*") gun.settings[attrName] *= value;
                    else if (mode === "/") gun.settings[attrName] /= value;
                    else gun.settings[attrName] += value;
                    gun.interpret?.();
                }
                const values = guns.map(g => g.settings?.[attrName]).filter(v => v != null);
                socket.talk("m", 7_000, `${attrName} updated: ${values.join(", ")}`);
                return;
            }

            if (command === "define" || command === "def") {
                const className = args[1];
                const target = resolveEntity(args[2], body);
                if (!target) return;
                if (!className) return socket.talk("m", 5_000, "Usage: define <class> [who]");
                if (!Class[className]) return socket.talk("m", 5_000, "Unknown class.");
                const previousColor = target.color;
                target.define(className);
                if (!Class[className].COLOR && previousColor) {
                    target.color = previousColor;
                }
                target.refreshBodyAttributes?.();
                socket.talk("m", 4_000, `Defined as ${className}.`);
                return;
            }

            const teams = ["BLUE", "GREEN", "RED", "PURPLE", "YELLOW", "ORANGE", "BROWN", "CYAN", "ROOM", "ENEMIES"];
            if (command === "team") {
                const teamArg = args[1];
                const target = resolveEntity(args[2], body);
                if (!target) return;
                if (!teamArg) return socket.talk("m", 6_000, `Current team: ${target.team}`);
                let teamValue = parseNumber(teamArg);
                if (teamValue == null) {
                    const upper = teamArg.toUpperCase();
                    if (!teams.includes(upper)) return socket.talk("m", 6_000, `Invalid team. Use: ${teams.join(", ")}`);
                    teamValue = global[`TEAM_${upper}`];
                }
                const before = target.team;
                target.team = teamValue;
                socket.talk("m", 6_000, `Team: ${before} -> ${teamValue}`);
                return;
            }

            if (command === "wall" || command === "w") {
                const room = gameManager.room;
                const tileSize = room?.tileWidth ?? 30;
                const wallSize = tileSize / 2;
                const spawnWall = (x, y, name = null, size = wallSize) => {
                    const e = new Entity({ x, y });
                    e.define("wall");
                    e.SIZE = size;
                    e.team = TEAM_ROOM;
                    if (name) e.name = name;
                    e.protect?.();
                    e.life();
                    return e;
                };
                const type = args[1];
                if (type === "grid") {
                    const name = args[2] ?? null;
                    const gx = (Math.floor(body.x / tileSize) + 0.5) * tileSize;
                    const gy = (Math.floor(body.y / tileSize) + 0.5) * tileSize;
                    const e = spawnWall(gx, gy, name);
                    const tagId = devTags.add(e);
                    socket.talk("m", 6_000, `Spawned wall at grid. Tag: ${tagId}`);
                    return;
                }
                const dx = parseNumber(args[1]);
                const dy = parseNumber(args[2]);
                if (dx == null || dy == null) return socket.talk("m", 6_000, "Usage: wall <dx> <dy> [tiles=1] [name]");
                const tiles = parseNumber(args[3]) ?? 1;
                const name = args.slice(4).join(" ") || null;
                const size = tiles > 0 ? tiles * wallSize : wallSize;
                const e = spawnWall(body.x + dx, body.y + dy, name, size);
                const tagId = devTags.add(e);
                socket.talk("m", 6_000, `Spawned wall. Tag: ${tagId}`);
                return;
            }

            if (command === "me") {
                const targetRef = args[1];
                const message = args.slice(2).join(" ").trim();
                if (!targetRef || !message) return socket.talk("m", 6_000, "Usage: me <tag|id|name> <message...>");
                const target = resolveEntity(targetRef, null);
                if (!target) return;
                if (typeof target.sendMessage === "function") {
                    target.sendMessage(message);
                }
                socket.talk("m", 4_000, "Message sent.");
                return;
            }

            if (command === "edit") {
                const message = args.slice(1).join(" ").trim();
                if (!message) return socket.talk("m", 6_000, "Usage: edit <message...>");
                const chatList = chats[body.id];
                if (!chatList?.length) return socket.talk("m", 6_000, "You have no recent messages.");
                const current = chatList.shift();
                if (!current || current.expires < Date.now()) return socket.talk("m", 6_000, "Your message has expired.");
                const edited = { message: `${message}*`, expires: Date.now() + Config.chat_message_duration };
                chatList.unshift(edited);
                util.log(`${body.name || "unnamed"} (edited): ${edited.message}`);
                gameManager.socketManager.chatLoop();
                socket.talk("m", 3_000, "Last message edited.");
                return;
            }

            if (command === "reload") {
                const raw = args[1];
                if (!raw) return socket.talk("m", 5_000, "Usage: reload <n|inf>");
                if (["inf", "infinite", "max"].includes(raw.toLowerCase())) {
                    body.settings.hasNoReloadDelay = true;
                    socket.talk("m", 4_000, "Reload set to infinite.");
                    return;
                }
                const value = parseNumber(raw);
                if (value == null) return socket.talk("m", 5_000, "Usage: reload <n|inf>");
                body.settings.hasNoReloadDelay = false;
                body.skill.raw[statIndex.rld] = Math.max(0, value);
                body.skill.update();
                body.refreshBodyAttributes();
                socket.talk("m", 4_000, "Reload updated.");
                return;
            }

            if (command === "reloadattrs") {
                const defs = body.defs;
                body.define({ RESET_UPGRADES: true, BATCH_UPGRADES: false });
                body.define(defs);
                body.refreshBodyAttributes();
                socket.talk("m", 4_000, "Attributes reloaded.");
                return;
            }

            sendAvailableDevCommandsMessage(command, args[1]);
        },
    },
]

/** COMMANDS RUN FUNCTION **/
function runCommand(socket, message, gameManager) {
    if (!message.startsWith(prefix) || !socket?.player?.body) return;

    let args = message.slice(prefix.length).split(" ");
    let commandName = args.shift();
    let command = commands.find((command) => command.command.includes(commandName));
    if (command) {
        let permissionsLevel = socket.permissions?.level ?? 0;
        let level = command.level;

        if (permissionsLevel >= level) {
            try {
                command.run({ socket, message, args, level: permissionsLevel, gameManager: gameManager });
            } catch (e) {
                console.error("Error while running ", commandName);
                console.error(e);
                socket.talk("m", 5_000, "An error occurred while running this command.");
            }
        } else socket.talk("m", 5_000, "You do not have access to this command.");
    } else socket.talk("m", 5_000, "Unknown command.");

    return true;
}
global.addChatCommand = function (command) {
    if (!command.command || !command.run) {
        throw new Error("Invalid command format. A command must have at least a 'command' and a 'run' property.");
    }
    if (!Array.isArray(command.command)) {
        throw new Error("Invalid command format. The 'command' property must be an array of strings.");
    }
    if (commands.find(c => c.command.some(cmd => command.command.includes(cmd)))) {
        throw new Error("A command with this name already exists.");
    }
    commands.push(command);
}


/** CHAT MESSAGE EVENT **/
module.exports = ({ Events }) => {
    Events.on("chatMessage", ({ socket, message, preventDefault, gameManager }) => {
        if (message.startsWith(prefix)) {
            preventDefault();
            runCommand(socket, message, gameManager);
        }
    });
};
