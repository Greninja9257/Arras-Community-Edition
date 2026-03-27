class Harvest {
    constructor() {
        this.harvestedShapes = new Map(); // entity.id -> entity
        this.scores = {};
        this.bases = {};
        this.scoreTrackers = {};
        this.active = false;
        Config.harvest_data = this;
    }

    start() {
        const room = global.gameManager.room;
        const hw = room.width / 2;

        // Exclude the middle team (TEAM_GREEN) so only Blue and Red are used
        if (!Array.isArray(global.defeatedTeams)) global.defeatedTeams = [];
        if (!global.defeatedTeams.includes(TEAM_GREEN)) {
            global.defeatedTeams.push(TEAM_GREEN);
        }

        this.bases[TEAM_BLUE] = { x: -hw * 0.82, y: 0 };
        this.bases[TEAM_RED]  = { x:  hw * 0.82, y: 0 };
        this.scores[TEAM_BLUE] = 0;
        this.scores[TEAM_RED]  = 0;
        this.active = true;
        this.spawnTrackers();
    }

    spawnTrackers() {
        const teamDefs = [
            { team: TEAM_BLUE, name: "Blue", color: getTeamColor(TEAM_BLUE) },
            { team: TEAM_RED,  name: "Red",  color: getTeamColor(TEAM_RED)  },
        ];
        for (const { team, name, color } of teamDefs) {
            const base = this.bases[team];
            const o = new Entity(base);
            o.define("genericTank");
            o.define({ BODY: { HEALTH: 1e10, DAMAGE: 0, PUSHABILITY: 0, SPEED: 0 }, SIZE: 1 });
            o.team = team;
            o.color.base = color;
            o.leaderboardColor = color;
            o.name = name;
            o.settings.leaderboardable = true;
            o.settings.renderOnLeaderboard = false;
            o.godmode = true;
            o.refreshBodyAttributes();
            this.scoreTrackers[team] = o;
        }
    }

    teamName(team) {
        return team === TEAM_BLUE ? "Blue" : "Red";
    }

    // Called by the addon when a food entity is killed by a player
    onFoodKilled(food, killerTeam) {
        if (!this.active) return;
        if (killerTeam !== TEAM_BLUE && killerTeam !== TEAM_RED) return;
        const harvestValue = food.skill.score || 0;
        this.claimShape({ x: food.x, y: food.y }, food.defs[0], harvestValue, killerTeam);
    }

    claimShape(pos, foodType, harvestValue, team) {
        if (!this.active) return;
        const base = this.bases[team];
        if (!base) return;

        const o = new Entity(pos);
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
        o.isHarvested = true;
        o.controllers = [];
        o.control.goal.x = base.x;
        o.control.goal.y = base.y;
        o.control.power = 1;
        o.refreshBodyAttributes();

        o.on("dead", ({ killers }) => {
            this.harvestedShapes.delete(o.id);
            if (o.harvestScored) return; // Reached base, don't re-spawn

            // Find a killer from the opposing team
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
    }

    loop() {
        if (!this.active) return;

        const room = global.gameManager.room;
        const captureRadius = Math.max(100, Math.min(room.width, room.height) * 0.07);

        for (const [id, shape] of this.harvestedShapes) {
            if (!shape || shape.isDead()) {
                this.harvestedShapes.delete(id);
                continue;
            }

            const base = this.bases[shape.harvestTeam];
            if (!base) continue;

            const dx = base.x - shape.x;
            const dy = base.y - shape.y;

            if (dx * dx + dy * dy < captureRadius * captureRadius) {
                this.harvestedShapes.delete(id);
                shape.harvestScored = true;
                const value = shape.harvestValue || 0;
                const team = shape.harvestTeam;
                shape.kill();
                this.addScore(team, value);
                global.gameManager.socketManager.broadcast(
                    `${this.teamName(team)} scored! — Blue: ${Math.round(this.scores[TEAM_BLUE])}  |  Red: ${Math.round(this.scores[TEAM_RED])}`
                );
            }
        }
    }

    reset() {
        this.active = false;
        this.harvestedShapes.clear();
        this.scores = {};
        this.scoreTrackers = {};
        this.bases = {};
    }
}

module.exports = { Harvest };
