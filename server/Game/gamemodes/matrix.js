class Matrix {
    constructor() {
        this.agents = new Set();
        this.tick = 0;
    }

    start() {
        this.tick = 0;
    }

    loop() {
        this.tick++;

        for (const agent of [...this.agents]) {
            if (!agent || agent.isDead() || agent.isGhost) {
                this.agents.delete(agent);
            }
        }

        if (Config.mode !== "matrix") return;
        if (global.gameManager.arenaClosed || global.cannotRespawn) return;
        if (this.tick % (Config.matrix_agent_interval ?? 45) !== 0) return;
        if (this.agents.size >= (Config.matrix_agent_cap ?? 6)) return;

        const players = [...entities.values()].filter(entity =>
            entity &&
            entity.isPlayer &&
            !entity.isDead() &&
            !entity.invuln &&
            !entity.godmode
        );
        if (!players.length) return;

        const target = ran.choose(players);
        if (!target) return;

        this.spawnAgentNear(target);
    }

    spawnAgentNear(target) {
        const minDistance = Config.matrix_agent_spawn_min_distance ?? 900;
        const maxDistance = Config.matrix_agent_spawn_max_distance ?? 1600;
        let loc = null;

        for (let i = 0; i < 24; i++) {
            const angle = ran.randomAngle();
            const distance = ran.randomRange(minDistance, maxDistance);
            const candidate = {
                x: target.x + Math.cos(angle) * distance,
                y: target.y + Math.sin(angle) * distance,
            };

            if (Config.wrap_room) {
                const width = global.gameManager.room.width;
                const height = global.gameManager.room.height;
                const halfWidth = width / 2;
                const halfHeight = height / 2;

                if (candidate.x < -halfWidth) candidate.x += width;
                else if (candidate.x > halfWidth) candidate.x -= width;

                if (candidate.y < -halfHeight) candidate.y += height;
                else if (candidate.y > halfHeight) candidate.y -= height;
            }

            if (!global.gameManager.room.isInRoom(candidate)) continue;
            if (dirtyCheck(candidate, 60, global.gameManager)) continue;

            const tile = global.gameManager.room.getAt(candidate);
            if (!tile || tile.name === "Matrix Wall Tile") continue;

            loc = candidate;
            break;
        }

        if (!loc) return;

        const agent = new Entity(loc);
        agent.define(ran.choose(Config.matrix_agent_classes ?? ["basic", "twin", "machineGun", "sniper"]));
        agent.define({
            CONTROLLERS: [],
            FACING_TYPE: ["smoothToTarget", { smoothness: 12 }],
            AI: { ...Class.bot.AI, IGNORE_SHAPES: true, SKYNET: true, BLIND: true, CHASE: true },
            ALPHA: [0, 1],
            INVISIBLE: [0.08, 0],
        }, false, true, false);
        agent.refreshBodyAttributes();
        agent.isBot = true;
        agent.name = "Agent";
        agent.team = TEAM_ENEMIES;
        agent.color.base = "black";
        agent.leaderboardColor = "black";
        agent.minimapColor = "black";
        agent.alpha = 0;
        agent.invuln = true;
        agent.godmode = true;
        agent.alwaysActive = true;
        agent.countsTowardsBotCap = false;
        agent.skill.reset();

        while (agent.skill.level < (Config.matrix_agent_level ?? 45)) {
            agent.skill.score += agent.skill.levelScore;
            agent.skill.maintain();
        }
        agent.refreshBodyAttributes();

        this.agents.add(agent);
        const fadeSteps = 8;
        const fadeDuration = Config.matrix_agent_materialize_time ?? 1800;
        const fadeInterval = Math.max(50, Math.floor(fadeDuration / fadeSteps));
        let fadeCount = 0;
        const fadeLoop = setInterval(() => {
            if (!agent || agent.isDead() || agent.isGhost) {
                clearInterval(fadeLoop);
                return;
            }
            fadeCount++;
            agent.alpha = Math.min(0.9, fadeCount / fadeSteps);
            if (fadeCount >= fadeSteps) {
                clearInterval(fadeLoop);
            }
        }, fadeInterval);

        setTimeout(() => {
            if (!agent || agent.isDead() || agent.isGhost) return;
            const body = Class[agent.defs[0]] || {};
            agent.controllers = [];
            agent.define({
                CONTROLLERS: body.CONTROLLERS ? [...Class.bot.CONTROLLERS, ...body.CONTROLLERS] : Class.bot.CONTROLLERS,
                FACING_TYPE: ["smoothToTarget", { smoothness: 8 }],
                AI: { ...Class.bot.AI, IGNORE_SHAPES: true, SKYNET: true, BLIND: true, CHASE: true },
            }, false, true, false);
            agent.invuln = false;
            agent.godmode = false;
            agent.alpha = 1;
            agent.name = "Agent";
            agent.refreshBodyAttributes();
        }, Config.matrix_agent_materialize_time ?? 1800);

        agent.on("dead", () => {
            this.agents.delete(agent);
        });
    }

    reset() {
        for (const agent of this.agents) {
            if (agent && !agent.isDead()) agent.kill();
        }
        this.agents.clear();
        this.tick = 0;
    }
}

module.exports = { Matrix };
