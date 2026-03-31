// BOB — an extremely powerful (and unreasonably self-important) boss addon.
// Disabled by default. To enable, comment out or remove the "return;" line below.

return;

const { combineStats } = require('../facilitators');
const g = require('../gunvals');
const { statnames } = require('../constants.js');

// Shared drone gun properties — used across all 6 drone barrels.
// NOTE: reload: 200 in the original was a 200× MULTIPLIER (= 1 drone per 4 minutes). Fixed to 0.35.
// Ring gun — spawns one satellite that locks to a fixed orbital angle around BOB.
// 6 of these form a rotating shield ring (like Whirlwind).
const BOB_RING_GUN = (i) => ({
	POSITION: { WIDTH: 10, LENGTH: 1, DELAY: i * (1 / 6) },
	PROPERTIES: {
		SHOOT_SETTINGS: combineStats([g.satellite, {
			size:   2.2,
			health: 0.05,   // paper-thin cushions — pop in one hit
			damage: 0.8,
		}]),
		TYPE: ["satellite", { ANGLE: i * 60 }],
		COLOR: 12,
		LABEL: "Personal Space",
		MAX_CHILDREN: 1,
		AUTOFIRE: true,
		SYNCS_SKILLS: false,
		WAIT_TO_CYCLE: true,   // respawns immediately in correct position
	},
});

// Attack drone gun — these actually chase players.
const BOB_DRONE_GUN = (angle, delay) => ({
	POSITION: { LENGTH: 22, WIDTH: 9, ANGLE: angle, DELAY: delay },
	PROPERTIES: {
		SHOOT_SETTINGS: combineStats([g.drone, {
			reload:   0.4,
			damage:   0.4,
			health:   0.05,   // still paper-thin, just annoying
			speed:    1.2,
			maxSpeed: 1.2,
			size:     0.9,
		}]),
		TYPE: "drone",
		COLOR: 12,
		LABEL: "Friend Request",
		STAT_CALCULATOR: "drone",
		MAX_CHILDREN: 12,
		AUTOFIRE: true,
		SYNCS_SKILLS: true,
	},
});

// Bullet guns — "Strongly Worded Letters", now with actual punch
const BOB_BULLET_GUN = (angle, delay) => ({
	POSITION: { LENGTH: 18, WIDTH: 7, ANGLE: angle, DELAY: delay },
	PROPERTIES: {
		SHOOT_SETTINGS: combineStats([g.basic, g.destroyer, g.pounder, {
			damage: 1.8,
			pen:    1.5,
			speed:  1.1,
		}]),
		TYPE: "bullet",
		COLOR: 12,
		LABEL: "Strongly Worded Letter",
		AUTOFIRE: true,
	},
});

Class.BOB = {
	PARENT: "genericTank",
	LABEL: "BOB",
	NAME: "BOB",
	DANGER: 7,
	SHAPE: 6,
	SIZE: 80,
	DISPLAY_NAME: true,
	ANGLE: 30,
	COLOR: 12,
	CAN_SEE_INVISIBLE_ENTITIES: true,
	CRAVES_ATTENTION: true,   // he really wants you to notice him
	HAS_NO_RECOIL: true,
	MOTION_TYPE: "chase",
	FACING_TYPE: "smoothToTarget",
	NECRO: [3, 4, 5],         // converts triangles, squares, AND pentagons to his cause
	LEVEL: 1,
	STAT_NAMES: statnames.swarm,
	BODY: {
		SPEED: 3,
		HEALTH: 500,
		DAMAGE: 5,
		PENETRATION: 1.5,
		SHIELD: 100,
		REGEN: 0.2,
		DENSITY: 4,
		KNOCKBACK: 1,
		FOV: 1.5,
		PUSHABILITY: 0.5,
	},
	SKILL: [7, 7, 7, 7, 7, 7, 7, 7, 7, 7],
	SKILL_CAP: [9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
	EXTRA_SKILL: 3,
	CONTROLLERS: [
		"nearestDifferentMaster",
		["spin", { speed: 0.008, onlyWhenIdle: true }],  // idle spin only; don't overwrite live targeting
	],
	AI: { SPEED: 2, AWARENESS: 1.0, CHASE: true, AVOID_SWARM: false },
	GLOW: { RADIUS: 10, COLOR: 2, ALPHA: 0.6 },

	// 6 ring satellites (shield cushions) + 6 attack drone barrels + 6 bullet barrels
	GUNS: [
		BOB_RING_GUN(0),
		BOB_RING_GUN(1),
		BOB_RING_GUN(2),
		BOB_RING_GUN(3),
		BOB_RING_GUN(4),
		BOB_RING_GUN(5),

		BOB_DRONE_GUN(  0,   0   ),
		BOB_DRONE_GUN( 60,   0.1 ),
		BOB_DRONE_GUN(120,   0.2 ),
		BOB_DRONE_GUN(180,   0.3 ),
		BOB_DRONE_GUN(240,   0.4 ),
		BOB_DRONE_GUN(300,   0.5 ),

		BOB_BULLET_GUN( 30,  0.05 ),
		BOB_BULLET_GUN( 90,  0.15 ),
		BOB_BULLET_GUN(150,  0.25 ),
		BOB_BULLET_GUN(210,  0.35 ),
		BOB_BULLET_GUN(270,  0.45 ),
		BOB_BULLET_GUN(330,  0.55 ),
	],

	TURRETS: [
		{ POSITION: [10, 0, 0, 0, 360, 1], TYPE: ["autoTankGun", { INDEPENDENT: true }] },
	],

	ON: [
		{
			event: "tick",
			handler: ({ body }) => {
				// Always force the name to "BOB", even if the boss spawn system overwrote it
				if (body.name !== "BOB") body.name = "BOB";

				// ── Drone Ring + Launch ───────────────────────────────────────────
				// BOB keeps his drones in a wide orbit around himself, then periodically
				// kicks them toward his current target.
				// Drones with MAX_CHILDREN in gun PROPERTIES go into gun.children
				// (countsOwnKids), NOT body.children — so we must collect from gunsArrayed.
				if (body._fireCooldown === undefined) body._fireCooldown = 0;
				body._fireCooldown = Math.max(0, body._fireCooldown - 1);
				if (body._droneOrbitPhase === undefined) body._droneOrbitPhase = 0;
				body._droneOrbitPhase += 0.035;

				// Gather all live attack drones from every gun's child list
				const drones = [];
				for (const gun of (body.gunsArrayed || [])) {
					for (const child of (gun.children || [])) {
						if (child.type === 'drone') drones.push(child);
					}
				}

				const orbitRadius = body.size + 110;
				const orbitSpeed = 5;
				for (let i = 0; i < drones.length; i++) {
					const d = drones[i];
					if (d.control.goal == null) d.control.goal = { x: d.x, y: d.y };

					if (d._launchGoalX !== undefined) {
						d.control.goal.x = d._launchGoalX;
						d.control.goal.y = d._launchGoalY;
						d._launchTicks++;
						if (d._launchTicks > 45) {
							delete d._launchGoalX;
							delete d._launchGoalY;
							delete d._launchTicks;
						}
						continue;
					}

					const angle = body._droneOrbitPhase + (Math.PI * 2 * i / Math.max(1, drones.length));
					const orbitX = body.x + Math.cos(angle) * orbitRadius;
					const orbitY = body.y + Math.sin(angle) * orbitRadius;
					d.x = orbitX;
					d.y = orbitY;
					d.velocity.x = -Math.sin(angle) * orbitSpeed;
					d.velocity.y =  Math.cos(angle) * orbitSpeed;
					d.control.goal.x = orbitX;
					d.control.goal.y = orbitY;
				}

				// Fire whenever we have drones and the cooldown is up
				if (drones.length >= 3 && body._fireCooldown === 0) {
					const dx = body.control.target.x;
					const dy = body.control.target.y;
					if (dx === 0 && dy === 0) return;
					const dist = Math.sqrt(dx * dx + dy * dy) || 1;
					const nx = dx / dist;
					const ny = dy / dist;

					for (const d of drones) {
						// Launch toward the actual target direction. Also set immediate
						// velocity so the first frame doesn't drift the wrong way.
						d._launchGoalX = d.x + nx * 99999;
						d._launchGoalY = d.y + ny * 99999;
						d._launchTicks = 0;
						d.velocity.x = nx * 18;
						d.velocity.y = ny * 18;
						d.control.goal.x = d._launchGoalX;
						d.control.goal.y = d._launchGoalY;
					}

					body._fireCooldown = 90; // ~3 seconds between launches
				}
			},
		},
		{
			event: "death",
			handler: () => {
				const quips = [
					"BOB has been defeated. He'll be back after his lunch break.",
					"BOB has clocked out. His drones are now orphaned.",
					"BOB just needed a hug. You gave him the opposite of a hug.",
					"BOB has left the server. (He was never good at this game.)",
					"BOB is gone. The shapes he converted are now free... or are they?",
				];
				const msg = quips[Math.floor(Math.random() * quips.length)];
				global.gameManager?.socketManager?.broadcast(msg);
			},
		},
	],
};

// Spawn pool entry — his own category so chance/amount can be tuned independently.
Config.boss_types.push({
	bosses: ["BOB"],
	amount: [1],
	chance: 1,
	nameType: "a",
	message: "An ominous presence looms... it's just BOB.",
});
