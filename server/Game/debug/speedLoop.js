// Speed check loop — runs at 1Hz.
//
// Two-mode optimizer:
//
//   COLLISION mode (collidetime > lifetime * 3):
//     Collision cost is O(n²) with entity count. Targeting the most-populous
//     non-player entity type reduces collision pairs fastest. Entity counts are
//     read directly from the live entity map — accurate, no profiling needed.
//
//   LIFE mode (life() CPU is the bottleneck):
//     Uses per-entity profiling to find which type spends the most time in
//     life(). Profiling count is divided by loop count to get per-entity avg.
//
//   Severity = (frameTime − budget) / budget
//   CullFraction = clamp(0.1 + severity * 0.2, 0.1, 0.5)
//   Applied to the actual live entity count of the target type.
//
// Optimization levels reduce systemic load alongside culling:
//   0 — normal
//   1 — bots −25%
//   2 — bots −50%, food −25%
//   3 — bots −75%, food −50%
//   4 — bots off, food −50%, minimap skipped

class speedcheckloop {
    constructor() {
        this.fails = 0;
        this.isRestarting = false;
        this.optimizationLevel = 0;
        this._baseBotCap  = null;
        this._baseFoodCap = null;
        this._stackedWallIds = new Set();

        global.entityTimings   = new Map();
        global.entityProfiling = true;
        this._loopCount = 0; // game ticks elapsed since last analysis window
    }

    _getEntityKey(entity) {
        return entity.defs?.[0] || entity.label || entity.type || "unknown";
    }

    _getWallStackKey(entity) {
        const x = Math.round(entity.x);
        const y = Math.round(entity.y);
        const size = Math.round((entity.SIZE ?? entity.size ?? 0) * 10) / 10;
        const shape = entity.shape ?? 0;
        const wallType = entity.walltype ?? 0;
        return `${x}:${y}:${size}:${shape}:${wallType}`;
    }

    _refreshStackedWallCullability() {
        const groups = new Map();
        this._stackedWallIds = new Set();

        for (const entity of entities.values()) {
            if (!entity || entity.isDead?.() || entity.type !== "wall") continue;
            const key = this._getWallStackKey(entity);
            const group = groups.get(key) || [];
            group.push(entity);
            groups.set(key, group);
        }

        for (const group of groups.values()) {
            if (group.length <= 1) continue;
            for (let i = 1; i < group.length; i++) {
                this._stackedWallIds.add(group[i].id);
            }
        }
    }

    // Only cull entities whose removal actually reduces load.
    // Permanent map entities like baseProtectors immediately respawn, so they
    // create churn without lowering long-term collision pressure.
    _isCullableEntity(entity) {
        if (!entity || entity.isPlayer || entity.isDead?.()) return false;
        if (entity.isArenaCloser || entity.isDominator || entity.isMothership) return false;

        const key = this._getEntityKey(entity);
        const type = entity.type || "unknown";
        if (type === "wall") return entity.allowOptimizerCull === true || this._stackedWallIds.has(entity.id);
        if (["aura", "portal"].includes(type)) return false;
        if (key === "baseProtector") return false;

        return true;
    }

    // Returns a Map<type, liveCount> of cullable, live entities.
    _countLiveEntities() {
        const counts = new Map();
        for (const entity of entities.values()) {
            if (!this._isCullableEntity(entity)) continue;
            const key = this._getEntityKey(entity);
            counts.set(key, (counts.get(key) || 0) + 1);
        }
        return counts;
    }

    _countCollisionParticipants() {
        let walls = 0;
        let cullable = 0;

        for (const entity of entities.values()) {
            if (!entity || entity.isDead?.()) continue;
            if (entity.type === "wall") {
                walls++;
                continue;
            }
            if (this._isCullableEntity(entity)) cullable++;
        }

        return {
            walls,
            cullable,
            stackedWalls: this._stackedWallIds.size,
            total: walls + cullable,
        };
    }

    _cullByType(type, count) {
        let culled = 0;
        for (const entity of entities.values()) {
            if (culled >= count) break;
            if (!this._isCullableEntity(entity)) continue;
            if (this._getEntityKey(entity) !== type) continue;
            entity.kill();
            culled++;
        }
        return culled;
    }

    _enforceHardEntityCap(sum, lagThreshold, collidetime, lifetime) {
        const collisionDominates = collidetime > lifetime * 3;
        if (!collisionDominates) return 0;

        const liveCounts = this._countLiveEntities();
        const participants = this._countCollisionParticipants();
        const totalCullable = participants.cullable;
        if (totalCullable <= 0) return 0;

        const severity = (sum - lagThreshold) / lagThreshold;
        let participantCap = 900;
        if (severity >= 5) participantCap = 500;
        else if (severity >= 3) participantCap = 650;
        else if (severity >= 1.5) participantCap = 800;

        const cullableCap = Math.max(0, participantCap - participants.walls);
        if (totalCullable <= cullableCap) return 0;

        let overage = totalCullable - cullableCap;
        let totalCulled = 0;
        const offenders = Array.from(liveCounts.entries()).sort((a, b) => b[1] - a[1]);

        util.warn(`[Optimizer] (CAP) collision participants=${participants.total} (${participants.walls} walls, ${participants.stackedWalls} stacked-wall extras, ${participants.cullable} cullable), ` +
            `effective cullable cap=${cullableCap}; removing ${overage}.`);

        for (const [type, count] of offenders) {
            if (overage <= 0) break;
            const removed = this._cullByType(type, Math.min(count, overage));
            totalCulled += removed;
            overage -= removed;
        }

        if (totalCulled > 0) {
            util.warn(`[Optimizer] Hard cap culled ${totalCulled} entities to reduce collision load.`);
        }

        return totalCulled;
    }

    // Identifies the lag source and culls proportionally to severity.
    // collidetime and lifetime are the raw ms totals from this window.
    cullTopOffender(sum, lagThreshold, collidetime, lifetime) {
        const timings   = global.entityTimings;
        const loopCount = this._loopCount || 1;

        // Reset profiling window immediately so collection resumes
        global.entityTimings   = new Map();
        global.entityProfiling = true;
        this._loopCount        = 0;

        const severity = (sum - lagThreshold) / lagThreshold;
        if (severity <= 0 || this.fails === 0) return;

        const liveCounts = this._countLiveEntities();
        if (liveCounts.size === 0) return;

        const fraction  = Math.min(0.5, 0.1 + severity * 0.2);

        // ── Mode selection ────────────────────────────────────────────────────
        const collisionDominates = collidetime > lifetime * 3;
        let topType, liveCount, avgMsLabel;

        if (collisionDominates) {
            // Collision bottleneck: target the type with the most live entities.
            // More entities = more collision pairs = more cost.
            let maxCount = 0;
            for (const [type, count] of liveCounts) {
                if (count > maxCount) { topType = type; maxCount = count; }
            }
            liveCount  = maxCount;
            avgMsLabel = 'collision-dominant';
        } else {
            // Life() bottleneck: target the type with highest total profiled ms.
            // Divide totalMs by loopCount to get per-entity-per-tick average.
            let maxMs = 0;
            for (const [type, data] of timings) {
                if (data.totalMs > maxMs) { topType = type; maxMs = data.totalMs; }
            }
            if (!topType) return;
            liveCount = liveCounts.get(topType) || 0;
            if (liveCount === 0) return;
            const perEntityMs = timings.get(topType).totalMs / loopCount / liveCount;
            avgMsLabel = `avg ${perEntityMs.toFixed(2)}ms/tick`;
        }

        const cullCount = Math.max(1, Math.ceil(liveCount * fraction));
        const mode      = collisionDominates ? 'COLLIDE' : 'LIFE';
        const participants = collisionDominates ? this._countCollisionParticipants() : null;

        util.warn(`[Optimizer] (${mode}) "${topType}" — ${liveCount} live entities, ${avgMsLabel}. ` +
            `Severity +${(severity * 100).toFixed(0)}%, culling ${cullCount} (${(fraction * 100).toFixed(0)}).` +
            (participants ? ` Participants=${participants.total} (${participants.walls} walls, ${participants.stackedWalls} stacked-wall extras, ${participants.cullable} cullable).` : ""));

        const culled = this._cullByType(topType, cullCount);

        if (culled > 0) util.warn(`[Optimizer] Culled ${culled} "${topType}" entities.`);
    }

    applyOptimizationLevel(level) {
        if (level === this.optimizationLevel) return;
        this.optimizationLevel = level;

        if (this._baseBotCap  === null) this._baseBotCap  = Config.bot_cap;
        if (this._baseFoodCap === null) this._baseFoodCap = Config.food_cap;

        if (level === 0) {
            Config.bot_cap       = this._baseBotCap;
            Config.food_cap      = this._baseFoodCap;
            global.skipMinimap   = false;
            this._baseBotCap     = null;
            this._baseFoodCap    = null;
            util.log(`[Optimizer] Server recovered — settings restored.`);
            return;
        }

        const botScale  = [1, 0.75, 0.5, 0.25, 0][level] ?? 0;
        const foodScale = [1, 1,    0.75, 0.5,  0.5][level] ?? 0.5;
        Config.bot_cap       = Math.floor(this._baseBotCap  * botScale);
        Config.food_cap      = Math.floor(this._baseFoodCap * foodScale);
        global.skipMinimap   = level >= 4;

        util.warn(`[Optimizer] Level ${level} active — bots: ${Config.bot_cap}, food: ${Config.food_cap}.`);
    }

    _resetState() {
        global.entityProfiling = false;
        global.entityTimings   = new Map();
        this._loopCount        = 0;
    }

    update() {
        const activationtime = logs.activation.sum(),
              collidetime     = logs.collide.sum(),
              movetime        = logs.entities.sum(),
              maptime         = logs.minimap.sum(),
              physicstime     = logs.physics.sum(),
              lifetime        = logs.life.sum(),
              thoughtime      = logs.though.sum(),
              selfietime      = logs.selfie.sum();
        const playertime   = logs.network.record();
        const masterrecord = logs.master.record();
        const sum   = masterrecord.average + playertime.average;
        const loops = logs.loops.getTallyCount();

        this._loopCount += loops;
        this._refreshStackedWallCullability();

        global.fps = (1000 / sum).toFixed(2);
        for (const e of entities.values()) {
            if (e.isPlayer && e.socket)
                e.socket.talk("svInfo", global.gameManager.name, sum.toFixed(1));
        }

        const lagThreshold = 1000 / global.gameManager.roomSpeed / 30;

        // Analyze this window, then cullTopOffender resets and re-enables profiling
        global.entityProfiling = false;
        this.cullTopOffender(sum, lagThreshold, collidetime, lifetime);
        this._enforceHardEntityCap(sum, lagThreshold, collidetime, lifetime);

        // ── Lag detection ──────────────────────────────────────────────────────
        if (sum > lagThreshold) {
            this.fails++;

            if (this.fails % 3 === 0) {
                this.applyOptimizationLevel(Math.min(4, Math.floor(this.fails / 3)));
            }

            if (Config.startup_logs) {
                util.warn(`Server tick over budget! [Loops: ${loops}, Entities: ${entities.size}, ` +
                    `Clients: ${global.gameManager.clients.length}, ` +
                    `Backlog: ${(sum * global.gameManager.roomSpeed * 3).toFixed(1)}%]`);
                util.warn(`  activation=${activationtime}  collide=${collidetime}  entities=${movetime}`);
                util.warn(`  players=${playertime.sum}  minimap=${maptime}  physics=${physicstime}`);
                util.warn(`  life=${lifetime}  thought=${thoughtime}  selfie=${selfietime}`);
                util.warn(`  total=${movetime + playertime.sum + maptime}`);
            }

            if (this.fails > 20 && +sum.toFixed(0) > 300 && !this.isRestarting) {
                this.isRestarting = true;
                this._resetState();
                util.error("FAILURE!");
                global.gameManager.socketManager.broadcast("Server overloaded! Restarting...");
                global.gameManager.gameHandler.stop();
                setTimeout(() => { global.gameManager.close(); }, 900);
                setTimeout(() => { this.isRestarting = false; }, 3000);
            }

        // ── Recovery ───────────────────────────────────────────────────────────
        } else if (this.fails > 0) {
            this.fails = Math.max(0, this.fails - 2);
            if (this.fails === 0) {
                this.applyOptimizationLevel(0);
            } else {
                this.applyOptimizationLevel(Math.max(0, Math.floor(this.fails / 3)));
            }
        }
    }

    onError(error) {
        if (this.isRestarting) return;
        this.isRestarting = true;
        this._resetState();
        util.error("FAILURE!");
        global.gameManager.socketManager.broadcast("Server Error! Restarting...");
        setTimeout(() => { global.gameManager.close(); }, 900);
        setTimeout(() => { this.isRestarting = false; }, 3000);
        console.error(error);
    }
}

module.exports = { speedcheckloop };
