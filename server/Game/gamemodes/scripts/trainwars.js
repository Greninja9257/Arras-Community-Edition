// Thanks to Damocles
// https://discord.com/channels/366661839620407297/508125275675164673/1114907447195349074

class Train {
    constructor () {
        this.directions = new Map();
    }
    loop () {
        let trainable = [];
        for (let instance of entities.values()) {
            // Only include fully spawned, active tanks in train logic.
            if (!(instance.isPlayer || instance.isBot)) continue;
            if (instance.isGhost || instance.isDead?.()) continue;
            if (instance.invuln) continue;
            trainable.push(instance);
        }

        // In clan wars, each clan is its own train. Fallback to team grouping for non-clan entities.
        let groups = new Map();
        for (let entity of trainable) {
            let key = entity.clan || `team:${entity.team}`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(entity);
        }

        for (let [groupKey, train] of groups) {
            train.sort((a, b) => b.skill.score - a.skill.score);
            if (!train.length) continue;

            let leader = train[0];
            let target = leader.control?.target ?? { x: 0, y: 0 };
            let targetLen = Math.hypot(target.x, target.y);
            let lastDir = this.directions.get(groupKey);
            let dirX = targetLen > 0.01 ? target.x / targetLen : lastDir?.x ?? Math.cos(leader.facing);
            let dirY = targetLen > 0.01 ? target.y / targetLen : lastDir?.y ?? Math.sin(leader.facing);
            if (targetLen > 0.01) this.directions.set(groupKey, { x: dirX, y: dirY });

            let trainSpeed = 18;
            let leaderVelX = dirX * trainSpeed;
            let leaderVelY = dirY * trainSpeed;
            leader.velocity.x = leaderVelX;
            leader.velocity.y = leaderVelY;

            for (let i = 1; i < train.length; i++) {
                let player = train[i];
                let prev = train[i - 1];
                let prevVel = Math.hypot(prev.velocity.x, prev.velocity.y);
                let prevDirX = prevVel > 0.01 ? prev.velocity.x / prevVel : Math.cos(prev.facing);
                let prevDirY = prevVel > 0.01 ? prev.velocity.y / prevVel : Math.sin(prev.facing);
                let followDistance = 80;
                let targetX = prev.x - prevDirX * followDistance;
                let targetY = prev.y - prevDirY * followDistance;
                let dx = targetX - player.x;
                let dy = targetY - player.y;
                let dist = Math.hypot(dx, dy) || 1;
                let pull = Math.min(90, dist);
                let desiredX = (dx / dist) * pull * player.damp * 1.1 + prevDirX * trainSpeed * 0.7;
                let desiredY = (dy / dist) * pull * player.damp * 1.1 + prevDirY * trainSpeed * 0.7;

                player.velocity.x += (desiredX - player.velocity.x) * 0.35;
                player.velocity.y += (desiredY - player.velocity.y) * 0.35;
            }
        }
    }
}

module.exports = { Train };
