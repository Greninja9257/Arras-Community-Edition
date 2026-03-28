// Shape pools for attack wave modes.
// "cost" is the score needed per attack shape spawned.
// "shapes" is the ordered list of Class names to cycle through.
const SHAPE_POOLS = {
    pentagon:    { shapes: ["pentagon"],                                                                              cost: 400  },
    big_first:   { shapes: ["alphaPentagon", "betaPentagon", "hexagon", "pentagon", "triangle", "square", "egg"],    cost: 400  },
    small_first: { shapes: ["egg", "square", "triangle", "pentagon", "hexagon", "betaPentagon", "alphaPentagon"],    cost: 400  },
    random:      { shapes: ["egg", "square", "triangle", "pentagon", "hexagon"],                                     cost: 200  },
    "3d":        { shapes: ["cube", "tetrahedron", "octahedron", "dodecahedron", "icosahedron"],                     cost: 2000 },
    "4d":        { shapes: ["tesseract"],                                                                            cost: 50000 },
};
const MAX_ATTACK_SHAPES = 60; // per team
const TRACKER_INDEX = () => Class.tagMode.index.toString();
const goalController = getGoal => ({
    acceptsFromTop: false,
    think() {
        return {
            goal: getGoal(),
            power: 1,
        };
    }
});

class Harvest {
    constructor() {
        this.harvestedShapes = new Map(); // id -> entity
        this.scores = {};
        this.bases = {};
        this.scoreTrackers = {};
        this.globalHarvestTrackers = [];
        this.baseMarkers = {};
        this.attackShapes = {};           // team -> Set of ids
        this.hiddenLeaderboardEntities = new Set();
        this.leadingTeam = null;
        this.phase = "harvest";
        this.harvestEndTime = 0;
        this.active = false;
        // Countdown flags
        this._announced5min = false;
        this._announced1min = false;
        this._announced30sec = false;
        Config.harvest_data = this;
    }

    getData() {
        return this.globalHarvestTrackers;
    }

    start() {
        const room = global.gameManager.room;

        // Exclude TEAM_GREEN so players only get assigned to BLUE and RED
        if (!Array.isArray(global.defeatedTeams)) global.defeatedTeams = [];
        if (!global.defeatedTeams.includes(TEAM_GREEN)) global.defeatedTeams.push(TEAM_GREEN);

        this.bases[TEAM_BLUE] = this.getBaseCenter(TEAM_BLUE);
        this.bases[TEAM_RED]  = this.getBaseCenter(TEAM_RED);
        this.scores[TEAM_BLUE]  = 0;
        this.scores[TEAM_RED]   = 0;
        this.attackShapes[TEAM_BLUE] = new Set();
        this.attackShapes[TEAM_RED]  = new Set();
        this.leadingTeam = null;
        this.phase = "harvest";
        this.harvestEndTime = Date.now() + (Config.harvest_duration ?? 600) * 1000;
        this.active = true;
        this._announced5min = false;
        this._announced1min = false;
        this._announced30sec = false;

        this.spawnBaseMarkers();
        this.spawnTrackers();
        this.syncLeaderboardEntities(false);

        const minutes = Math.round((Config.harvest_duration ?? 600) / 60);
        global.gameManager.socketManager.broadcast(
            `Harvest phase started! Collect shapes and bring them to your base. ${minutes} minutes on the clock!`
        );
    }

    getBaseTiles(team) {
        return global.gameManager.room.spawnable[team] || [];
    }

    getBaseCenter(team) {
        const tiles = this.getBaseTiles(team);
        if (!tiles.length) return { x: 0, y: 0 };

        let sumX = 0;
        let sumY = 0;
        for (const tile of tiles) {
            sumX += tile.loc.x;
            sumY += tile.loc.y;
        }
        return {
            x: sumX / tiles.length,
            y: sumY / tiles.length,
        };
    }

    spawnBaseMarkers() {
        for (const team of [TEAM_BLUE, TEAM_RED]) {
            const base = this.bases[team];
            const o = new Entity(base);
            o.isHarvested = true;
            o.define("pentagon");
            o.define({
                BODY: { HEALTH: 1e10, DAMAGE: 0, PUSHABILITY: 0, SPEED: 0, ACCELERATION: 0 },
                SIZE: 50,
                DRAW_HEALTH: false,
                FACING_TYPE: "spinWhenIdle",
            });
            o.team = team;
            o.color.base = getTeamColor(team);
            o.godmode = true;
            o.protect();
            o.life();
            o.refreshBodyAttributes();
            this.baseMarkers[team] = o;
        }
    }

    spawnTrackers() {
        this.globalHarvestTrackers = [];
        const teamDefs = [
            { team: TEAM_BLUE, name: "Blue", color: getTeamColor(TEAM_BLUE) },
            { team: TEAM_RED,  name: "Red",  color: getTeamColor(TEAM_RED)  },
        ];
        for (const { team, name, color } of teamDefs) {
            const base = this.bases[team];
            const o = new Entity(base);
            o.isHarvested = true;
            o.define("genericTank");
            o.define({ BODY: { HEALTH: 1e10, DAMAGE: 0, PUSHABILITY: 0, SPEED: 0 }, SIZE: 1 });
            o.team = team;
            o.color.base = color;
            o.leaderboardColor = color;
            o.name = name;
            o.index = TRACKER_INDEX();
            o.label = "";
            o.settings.leaderboardable = true;
            o.settings.renderOnLeaderboard = true;
            o.godmode = true;
            o.refreshBodyAttributes();
            this.scoreTrackers[team] = o;
            this.globalHarvestTrackers.push(o);
        }
    }

    syncLeaderboardEntities(restore = false) {
        for (const entity of entities.values()) {
            if (!entity || (!entity.isPlayer && !entity.isBot)) continue;

            if (restore) {
                if (entity._harvestLeaderboardable != null) {
                    entity.settings.leaderboardable = entity._harvestLeaderboardable;
                    delete entity._harvestLeaderboardable;
                }
                this.hiddenLeaderboardEntities.delete(entity.id);
                continue;
            }

            if (entity._harvestLeaderboardable == null) {
                entity._harvestLeaderboardable = entity.settings.leaderboardable ?? true;
            }
            entity.settings.leaderboardable = false;
            this.hiddenLeaderboardEntities.add(entity.id);
        }
    }

    teamName(team) {
        return team === TEAM_BLUE ? "Blue" : "Red";
    }

    // Called by the addon when a regular food entity is killed by a player
    onFoodKilled(food, killerTeam) {
        if (!this.active || this.phase !== "harvest") return;
        if (killerTeam !== TEAM_BLUE && killerTeam !== TEAM_RED) return;
        const harvestValue = food.skill.score || 0;
        this.claimShape({ x: food.x, y: food.y }, food.defs[0], harvestValue, killerTeam);
    }

    claimShape(pos, foodType, harvestValue, team) {
        if (!this.active || this.phase !== "harvest") return;
        const base = this.bases[team];
        if (!base) return;

        const o = new Entity(pos);
        // IMPORTANT: set isHarvested BEFORE define so the addon's "define" listener
        // sees it and does not attach another dead handler to this entity.
        o.isHarvested = true;
        o.define(foodType);
        o.define({
            MOTION_TYPE: "motor",
            BODY: { SPEED: 3, ACCELERATION: 0.5, DAMAGE: 0, PUSHABILITY: 0.5 },
            ACCEPTS_SCORE: false,
        });
        o.team = team;
        o.color.base = getTeamColor(team);
        o.harvestTeam = team;
        o.harvestValue = harvestValue;
        o.harvestScored = false;
        o.controllers = [goalController(() => this.bases[o.harvestTeam] || { x: o.x, y: o.y })];
        o.refreshBodyAttributes();

        o.on("dead", ({ killers }) => {
            this.harvestedShapes.delete(o.id);
            if (o.harvestScored) return;

            // If an enemy kills it, transfer to their team
            const enemy = killers.find(e => {
                const t = e.master?.master?.team ?? e.master?.team ?? e.team;
                return (t === TEAM_BLUE || t === TEAM_RED) && t !== team;
            });
            if (enemy) {
                const newTeam = enemy.master?.master?.team ?? enemy.master?.team ?? enemy.team;
                this.claimShape({ x: o.x, y: o.y }, foodType, harvestValue, newTeam);
            }
        });

        this.harvestedShapes.set(o.id, o);
    }

    addScore(team, value) {
        this.scores[team] = (this.scores[team] || 0) + value;
        const tracker = this.scoreTrackers[team];
        if (tracker && !tracker.isDead()) {
            tracker.skill.score = this.scores[team];
        }
        this.maybeAnnounceLeadChange();
    }

    getLeadingTeam() {
        const blue = this.scores[TEAM_BLUE] || 0;
        const red = this.scores[TEAM_RED] || 0;
        if (blue === red) return null;
        return blue > red ? TEAM_BLUE : TEAM_RED;
    }

    maybeAnnounceLeadChange() {
        const leadingTeam = this.getLeadingTeam();
        if (leadingTeam === this.leadingTeam) return;

        this.leadingTeam = leadingTeam;
        if (leadingTeam === null) {
            global.gameManager.socketManager.broadcast("Harvest is tied.");
            return;
        }

        global.gameManager.socketManager.broadcast(`${this.teamName(leadingTeam)} takes the lead!`);
    }

    // ─── Attack Phase ──────────────────────────────────────────────────────────

    startAttackPhase() {
        this.phase = "attack";

        // Kill all in-flight harvested shapes
        for (const [, shape] of this.harvestedShapes) {
            if (!shape.isDead()) shape.kill();
        }
        this.harvestedShapes.clear();

        // Kill base markers
        for (const [, marker] of Object.entries(this.baseMarkers)) {
            if (!marker.isDead()) marker.kill();
        }

        const blue = Math.round(this.scores[TEAM_BLUE] || 0);
        const red  = Math.round(this.scores[TEAM_RED]  || 0);
        global.gameManager.socketManager.broadcast(
            `Harvest over! Blue: ${blue} | Red: ${red} — Attack waves launching!`
        );

        this.spawnAttackWave(TEAM_BLUE, this.scores[TEAM_BLUE] || 0);
        this.spawnAttackWave(TEAM_RED,  this.scores[TEAM_RED]  || 0);
    }

    spawnAttackWave(team, score) {
        const mode  = Config.harvest_attack_mode || "pentagon";
        const pool  = SHAPE_POOLS[mode] || SHAPE_POOLS.pentagon;
        const count = Math.max(1, Math.min(MAX_ATTACK_SHAPES, Math.floor(score / pool.cost)));

        const base      = this.bases[team];
        const enemyTeam = team === TEAM_BLUE ? TEAM_RED : TEAM_BLUE;
        const enemyBase = this.bases[enemyTeam];

        for (let i = 0; i < count; i++) {
            let shapeName;
            if (mode === "random") {
                shapeName = pool.shapes[Math.floor(Math.random() * pool.shapes.length)];
            } else {
                // Distribute evenly across shape tiers
                const idx = Math.floor((i / count) * pool.shapes.length);
                shapeName = pool.shapes[Math.min(idx, pool.shapes.length - 1)];
            }

            // Spawn in expanding rings around the base
            const angle  = (i / count) * 2 * Math.PI;
            const ring   = Math.floor(i / 20);
            const radius = 80 + ring * 70;
            const pos = {
                x: base.x + Math.cos(angle) * radius,
                y: base.y + Math.sin(angle) * radius,
            };

            const o = new Entity(pos);
            o.isHarvested = true; // Prevent addon from attaching listeners
            o.define(shapeName);
            o.define({
                MOTION_TYPE: "motor",
                // Only override movement — DAMAGE/HEALTH/RESIST from the shape are preserved
                BODY: { SPEED: 4, ACCELERATION: 0.3, PUSHABILITY: 0.3 },
                ACCEPTS_SCORE: false,
                INTANGIBLE: false,
            });
            o.team = team;
            o.color.base = getTeamColor(team);
            o.controllers = [goalController(() => this.bases[enemyTeam] || { x: o.x, y: o.y })];
            o.refreshBodyAttributes();

            const id = o.id;
            this.attackShapes[team].add(id);
            o.on("dead", () => this.attackShapes[team].delete(id));
        }
    }

    checkWinCondition() {
        const blueAlive = this.attackShapes[TEAM_BLUE].size;
        const redAlive  = this.attackShapes[TEAM_RED].size;

        if (blueAlive === 0 && redAlive === 0) {
            this.endGame(null);
        } else if (blueAlive === 0) {
            this.endGame(TEAM_RED);
        } else if (redAlive === 0) {
            this.endGame(TEAM_BLUE);
        }
    }

    endGame(winnerTeam) {
        this.phase = "ended";
        this.active = false;
        this.syncLeaderboardEntities(true);
        if (winnerTeam === null) {
            global.gameManager.socketManager.broadcast("Draw! Both attack waves destroyed each other.");
        } else {
            global.gameManager.socketManager.broadcast(`${this.teamName(winnerTeam)} wins the Harvest war!`);
            setTimeout(() => {
                if (!global.gameManager.arenaClosed) global.gameManager.closeArena();
            }, 3000);
        }
    }

    // ─── Main Loop ─────────────────────────────────────────────────────────────

    loop() {
        if (this.active) this.syncLeaderboardEntities(false);

        if (this.phase === "harvest") {
            const remaining = this.harvestEndTime - Date.now();

            // Countdown announcements
            if (!this._announced5min  && remaining <= 5 * 60 * 1000 && remaining > 0) {
                this._announced5min = true;
                global.gameManager.socketManager.broadcast("5 minutes remaining in the harvest phase!");
            }
            if (!this._announced1min  && remaining <= 1 * 60 * 1000 && remaining > 0) {
                this._announced1min = true;
                global.gameManager.socketManager.broadcast("1 minute remaining!");
            }
            if (!this._announced30sec && remaining <= 30 * 1000 && remaining > 0) {
                this._announced30sec = true;
                global.gameManager.socketManager.broadcast("30 seconds remaining!");
            }

            if (remaining <= 0) {
                this.startAttackPhase();
                return;
            }

            for (const [id, shape] of this.harvestedShapes) {
                if (!shape || shape.isDead()) {
                    this.harvestedShapes.delete(id);
                    continue;
                }

                const tile = global.gameManager.room.getAt(shape);
                if (tile && this.getBaseTiles(shape.harvestTeam).includes(tile)) {
                    this.harvestedShapes.delete(id);
                    shape.harvestScored = true;
                    const value = shape.harvestValue || 0;
                    const team  = shape.harvestTeam;
                    shape.kill();
                    this.addScore(team, value);
                }
            }
        } else if (this.phase === "attack") {
            this.checkWinCondition();
        }
    }

    reset() {
        this.syncLeaderboardEntities(true);
        this.active = false;
        this.phase = "harvest";
        this.harvestedShapes.clear();
        this.scores = {};
        this.scoreTrackers = {};
        this.globalHarvestTrackers = [];
        this.baseMarkers = {};
        this.bases = {};
        this.attackShapes = {};
        this.hiddenLeaderboardEntities.clear();
        this.leadingTeam = null;
    }
}

module.exports = { Harvest };
