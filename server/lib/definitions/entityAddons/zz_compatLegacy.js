const { combineStats, makeGunner } = require('../facilitators.js');
const { base } = require('../constants.js');
const g = require('../gunvals.js');

// Lightweight compatibility layer for mixed upstream/local definition sets.
// This keeps custom local content loadable while syncing core files from upstream.

const aliasIfMissing = (name, parent, label) => {
  if (!Class[name] && Class[parent]) {
    Class[name] = { PARENT: parent, LABEL: label || Class[parent].LABEL || name };
  }
};

const defineIfMissing = (name, def) => {
  if (!Class[name]) Class[name] = def;
};

const spawnRamChild = (x, y, parent, type, vx = 0, vy = 0) => {
  const { Entity } = require('../../../Game/entities/entity.js');
  const { Vector } = require('../../../Game/entities/vector.js');
  const child = new Entity({ x, y });
  child.define(type);
  child.team = parent.team;
  child.color = parent.color;
  child.velocity = new Vector(vx, vy);
  return child;
};

// Common utility bodies/symbols used by dev menus and custom tanks.
defineIfMissing('smasherBody', {
  LABEL: '',
  FACING_TYPE: ['spin', { speed: 0.16 }],
  COLOR: 'black',
  SHAPE: 6,
  SIZE: 12,
  INDEPENDENT: true,
});

defineIfMissing('spikeBody', {
  PARENT: 'smasherBody',
  SHAPE: 3,
});

defineIfMissing('healerSymbol', {
  SHAPE: [[0.3, -0.3], [1, -0.3], [1, 0.3], [0.3, 0.3], [0.3, 1], [-0.3, 1], [-0.3, 0.3], [-1, 0.3], [-1, -0.3], [-0.3, -0.3], [-0.3, -1], [0.3, -1]],
  SIZE: 13,
  COLOR: 'red',
});

// Boss/menu aliases expected by some local dev menus.
aliasIfMissing('guardian', 'guardian_diep', 'Guardian');
aliasIfMissing('defender', 'defender_diep', 'Defender');
aliasIfMissing('ragnarok', 'odin', 'Ragnarok');
aliasIfMissing('rogueAlcazar', 'roguePalisade', 'Rogue Alcazar');
aliasIfMissing('zyrafaqBoss', 'tgsBoss', 'Zyrafaq Boss');
aliasIfMissing('oldEliteSprayer', 'eliteSprayer', 'Elite Sprayer (Old)');

// Local custom/legacy classes referenced by config/dev menus.
defineIfMissing('laser', {
  PARENT: 'genericTank',
  LABEL: 'Laser',
  DANGER: 6,
  STAT_NAMES: {
    BULLET_SPEED: 'Beam Width',
    BULLET_HEALTH: 'Beam Health',
    BULLET_PEN: 'Beam Penetration',
    BULLET_DAMAGE: 'Beam Damage',
    RELOAD: 'Beam Rate',
  },
  GUNS: [{
    POSITION: [22, 6, 1, 0, 0, 0, 0],
    PROPERTIES: {
      SHOOT_SETTINGS: combineStats([g.basic, { reload: 0.12, damage: 0.18, pen: 1, health: 0.7, speed: 2, maxSpeed: 2, range: 1.2, size: 1.4, recoil: 0.05, shudder: 0.05, spray: 0.05 }]),
      TYPE: 'bullet',
    },
  }],
});

defineIfMissing('spikeDaily', {
  PARENT: 'spike',
  LABEL: 'Cushionike',
  IS_SMASHER: true,
  SKILL_CAP: {
    RELOAD: 6,
    PENETRATION: 0,
    BULLET_HEALTH: 0,
    BULLET_DAMAGE: 0,
    BULLET_SPEED: 6,
    SHIELD_CAPACITY: 6,
    BODY_DAMAGE: 6,
    MAX_HEALTH: 6,
    SHIELD_REGENERATION: 6,
    MOVEMENT_SPEED: 6,
  },
  STAT_NAMES: {
    RELOAD: 'Engine Acceleration',
    BULLET_SPEED: 'Spin Speed',
  },
  BODY: {
    SPEED: base.SPEED * 0.8,
    DAMAGE: base.DAMAGE * 0.9,
    HEALTH: base.HEALTH * 0.9,
  },
  TURRETS: [{ POSITION: [6, 0, 0, 0, 360, 1], TYPE: 'smasherBody' }],
});

defineIfMissing('zombie', makeGunner('basic', 'Zombie', { rear: false }));

if (!Class.oneShot) {
  Class.oneShot = {
    PARENT: 'smasher',
    LABEL: 'One-Shot',
    UPGRADE_TOOLTIP: 'One Shot anything a the cost of Your Life',
    IGNORE_BODY_DAMAGE_RESIST: true,
    SELF_DESTRUCT_ON_COLLIDE: true,
    DANGER: 8,
    SKILL_CAP: {
      RELOAD: 30,
      PENETRATION: 0,
      BULLET_HEALTH: 0,
      BULLET_DAMAGE: 0,
      BULLET_SPEED: 0,
      SHIELD_CAPACITY: 0,
      BODY_DAMAGE: 0,
      MAX_HEALTH: 0,
      SHIELD_REGENERATION: 0,
      MOVEMENT_SPEED: 30,
    },
    STAT_NAMES: {
      RELOAD: 'Engine Acceleration',
      MOVEMENT_SPEED: 'Movement Speed',
    },
    BODY: {
      SPEED: base.SPEED * 3.45,
      DAMAGE: 1e22,
      HEALTH: 1,
      SHIELD: 0,
      REGEN: 0,
    },
  };

  Class.oneShotSwarm = {
    PARENT: 'swarm',
    LABEL: 'One-Shot Swarm',
    PERSISTS_AFTER_DEATH: true,
    BODY: {
      ACCELERATION: 5,
      PENETRATION: 4,
      HEALTH: 2.2,
      DAMAGE: 14,
      SPEED: 7,
      RESIST: 3,
      RANGE: 320,
      DENSITY: 18,
      PUSHABILITY: 0.4,
      FOV: 2,
    },
  };
  Class.oneShotCrasher = {
    PARENT: 'crasher',
    LABEL: 'Bloom Crasher',
    PERSISTS_AFTER_DEATH: true,
    BODY: {
      SPEED: 7.5,
      ACCELERATION: 2.4,
      HEALTH: 3,
      DAMAGE: 18,
      PENETRATION: 3,
      PUSHABILITY: 0.35,
      DENSITY: 18,
      RESIST: 3,
    },
  };
  Class.shardShot = {
    PARENT: 'oneShot',
    LABEL: 'Shard',
    PERSISTS_AFTER_DEATH: true,
    ACCEPTS_SCORE: false,
    CAN_BE_ON_LEADERBOARD: false,
    CONTROLLERS: ['nearestDifferentMaster', 'mapTargetToGoal'],
    AI: { NO_LEAD: true },
    SIZE: 0.8,
    BODY: {
      SPEED: base.SPEED * 2.9,
      DAMAGE: base.DAMAGE * 18,
      HEALTH: 1,
      SHIELD: 0,
      REGEN: 0,
      FOV: base.FOV * 1.2,
    },
  };
  Class.hunterShot = {
    PARENT: 'oneShot',
    LABEL: 'Hunter',
    PERSISTS_AFTER_DEATH: true,
    ACCEPTS_SCORE: false,
    CAN_BE_ON_LEADERBOARD: false,
    CONTROLLERS: ['nearestDifferentMaster', 'mapTargetToGoal'],
    AI: { NO_LEAD: true },
    SIZE: 1,
    SELF_DESTRUCT_ON_COLLIDE: false,
    SELF_DESTRUCT_ON_COLLIDE_COUNT: 2,
    COLLIDE_SPEED_BOOST: 1.6,
    COLLIDE_SPEED_BOOST_TIME: 1200,
    BODY: {
      SPEED: base.SPEED * 2.5,
      DAMAGE: base.DAMAGE * 24,
      HEALTH: 1,
      SHIELD: 0,
      REGEN: 0,
      FOV: base.FOV * 1.35,
    },
  };
  Class.splinterShot = {
    PARENT: 'oneShot',
    LABEL: 'Splinter',
    PERSISTS_AFTER_DEATH: true,
    ACCEPTS_SCORE: false,
    CAN_BE_ON_LEADERBOARD: false,
    CONTROLLERS: ['nearestDifferentMaster', 'mapTargetToGoal'],
    AI: { NO_LEAD: true },
    SIZE: 0.75,
    SELF_DESTRUCT_ON_COLLIDE: false,
    SELF_DESTRUCT_ON_COLLIDE_COUNT: 2,
    SHRINK_ON_COLLIDE_FACTOR: 0.55,
    BODY: {
      SPEED: base.SPEED * 2.7,
      DAMAGE: base.DAMAGE * 14,
      HEALTH: 1,
      SHIELD: 0,
      REGEN: 0,
      FOV: base.FOV * 1.1,
    },
  };
  Class.bruiserShot = {
    PARENT: 'oneShot',
    LABEL: 'Bruiser',
    PERSISTS_AFTER_DEATH: true,
    ACCEPTS_SCORE: false,
    CAN_BE_ON_LEADERBOARD: false,
    CONTROLLERS: ['nearestDifferentMaster', 'mapTargetToGoal'],
    AI: { NO_LEAD: true },
    SIZE: 1.2,
    BODY: {
      SPEED: base.SPEED * 2.1,
      DAMAGE: base.DAMAGE * 32,
      HEALTH: 1,
      SHIELD: 0,
      REGEN: 0,
      DENSITY: base.DENSITY * 1.8,
      FOV: base.FOV * 1.4,
    },
  };
  Class.dualShot = {
    PARENT: 'oneShot',
    LABEL: 'Dual-Shot',
    DANGER: 9,
    SELF_DESTRUCT_ON_COLLIDE: false,
    SELF_DESTRUCT_ON_COLLIDE_COUNT: 2,
    TOOLTIP: 'Survives one ram. Dies on the second.',
    BODY: {
      SPEED: base.SPEED * 3.2,
      FOV: base.FOV * 1.1,
    },
  };
  Class.tripleShotOne = {
    PARENT: 'oneShot',
    LABEL: 'Triple Shot',
    DANGER: 9,
    SELF_DESTRUCT_ON_COLLIDE: false,
    SELF_DESTRUCT_ON_COLLIDE_COUNT: 3,
    TOOLTIP: 'Gets three lethal touches before breaking.',
    BODY: {
      SPEED: base.SPEED * 3,
      FOV: base.FOV * 1.12,
    },
  };
  Class.quarterOff = {
    PARENT: 'oneShot',
    LABEL: 'Quarter-Off',
    DANGER: 9,
    SELF_DESTRUCT_ON_COLLIDE: false,
    SELF_DESTRUCT_ON_COLLIDE_COUNT: 4,
    SHRINK_ON_COLLIDE_FACTOR: 0.75,
    TOOLTIP: 'Each ram cuts away a quarter of the tank before the fourth one kills it.',
    BODY: {
      SPEED: base.SPEED * 3.3,
      FOV: base.FOV * 1.08,
    },
  };
  Class.droneShot = {
    PARENT: 'oneShot',
    LABEL: 'Drone-Shot',
    DANGER: 9,
    TOOLTIP: 'Dies on impact, but releases a hunting swarm.',
    BODY: {
      SPEED: base.SPEED * 2.8,
      FOV: base.FOV * 1.2,
    },
    ON: [
      {
        event: 'death',
        handler: ({ body }) => {
          const variants = ['shardShot', 'hunterShot', 'splinterShot', 'bruiserShot'];
          for (let i = 0; i < 4; i++) {
            spawnRamChild(
              body.x,
              body.y,
              body,
              variants[i],
              Math.cos((Math.PI * 2 * i) / 4) * 8,
              Math.sin((Math.PI * 2 * i) / 4) * 8,
            );
          }
        },
      },
    ],
  };
  Class.doubleTap = {
    PARENT: 'dualShot',
    LABEL: 'Double-Tap',
    DANGER: 10,
    COLLIDE_SPEED_BOOST: 1.8,
    COLLIDE_SPEED_BOOST_TIME: 1400,
    TOOLTIP: 'First hit is free and launches you into a second faster one.',
    BODY: {
      SPEED: base.SPEED * 3.15,
    },
  };
  Class.splitDecision = {
    PARENT: 'dualShot',
    LABEL: 'Split Decision',
    DANGER: 10,
    TOOLTIP: 'On death, breaks into two last-chance One-Shots.',
    BODY: {
      SPEED: base.SPEED * 3.4,
    },
    ON: [
      {
        event: 'death',
        handler: ({ body }) => {
          for (const dir of [-1, 1]) {
            spawnRamChild(body.x + dir * 20, body.y, body, 'oneShot', dir * 12, 0);
          }
        },
      },
    ],
  };
  Class.executioner = {
    PARENT: 'tripleShotOne',
    LABEL: 'Executioner',
    DANGER: 10,
    IGNORE_TANK_BODY_DAMAGE: true,
    SELF_DESTRUCT_ON_COLLIDE: false,
    SELF_DESTRUCT_ON_COLLIDE_COUNT: 1,
    TOOLTIP: 'Ignores enemy tank body damage. Player kills add 1 life.',
    BODY: {
      SPEED: base.SPEED * 2.9,
      DAMAGE: 20000000000000000000000,
      DENSITY: base.DENSITY * 2,
    },
    ON: [
      {
        event: 'define',
        handler: ({ body }) => {
          body.store.remainingCollisionLives = body.settings.selfDestructOnCollideCount ?? 1;
        },
      },
      {
        event: 'kill',
        handler: ({ body, entity }) => {
          if (!(entity?.isPlayer || entity?.isBot)) return;
          body.store.remainingCollisionLives ??= body.settings.selfDestructOnCollideCount ?? 1;
          body.store.remainingCollisionLives++;
          body.sendMessage(`Executioner gained a life. Remaining lives: ${body.store.remainingCollisionLives}.`);
        },
      },
    ],
  };
  Class.glassburst = {
    PARENT: 'tripleShotOne',
    LABEL: 'Glassburst',
    DANGER: 10,
    TOOLTIP: 'Shatters into a ring of swarms when it dies.',
    BODY: {
      SPEED: base.SPEED * 3.25,
    },
    ON: [
      {
        event: 'death',
        handler: ({ body }) => {
          const variants = ['shardShot', 'splinterShot', 'hunterShot', 'shardShot', 'bruiserShot', 'splinterShot'];
          for (let i = 0; i < 6; i++) {
            spawnRamChild(
              body.x,
              body.y,
              body,
              variants[i],
              Math.cos((Math.PI * 2 * i) / 6) * 10,
              Math.sin((Math.PI * 2 * i) / 6) * 10,
            );
          }
        },
      },
    ],
  };
  Class.crossCut = {
    PARENT: 'quarterOff',
    LABEL: 'Cross-Cut',
    DANGER: 10,
    SELF_DESTRUCT_ON_COLLIDE_COUNT: 2,
    SHRINK_ON_COLLIDE_FACTOR: 0.5,
    TOOLTIP: 'The first hit cuts the tank in half. The second destroys it.',
    BODY: {
      SPEED: base.SPEED * 3.2,
    },
  };
  Class.shatterDrive = {
    PARENT: 'quarterOff',
    LABEL: 'Shatter Drive',
    DANGER: 10,
    COLLIDE_SPEED_BOOST: 2.2,
    COLLIDE_SPEED_BOOST_TIME: 1800,
    TOOLTIP: 'Every surviving hit overdrives the next dash.',
    BODY: {
      SPEED: base.SPEED * 3.8,
      FOV: base.FOV * 1.15,
    },
  };
  Class.hiveShot = {
    PARENT: 'droneShot',
    LABEL: 'Hive-Shot',
    DANGER: 10,
    TOOLTIP: 'Releases a larger hive on death.',
    BODY: {
      SPEED: base.SPEED * 2.75,
      FOV: base.FOV * 1.25,
    },
    ON: [
      {
        event: 'death',
        handler: ({ body }) => {
          const variants = ['shardShot', 'splinterShot', 'hunterShot', 'shardShot', 'bruiserShot', 'splinterShot', 'hunterShot', 'shardShot'];
          for (let i = 0; i < 8; i++) {
            spawnRamChild(
              body.x,
              body.y,
              body,
              variants[i],
              Math.cos((Math.PI * 2 * i) / 8) * 11,
              Math.sin((Math.PI * 2 * i) / 8) * 11,
            );
          }
        },
      },
    ],
  };
  Class.deathBloom = {
    PARENT: 'droneShot',
    LABEL: 'Death Bloom',
    DANGER: 10,
    TOOLTIP: 'Blooms into orbiting crashers when destroyed.',
    BODY: {
      SPEED: base.SPEED * 2.9,
      FOV: base.FOV * 1.3,
    },
    ON: [
      {
        event: 'death',
        handler: ({ body }) => {
          const variants = ['bruiserShot', 'hunterShot', 'splinterShot', 'shardShot'];
          for (let i = 0; i < 4; i++) {
            spawnRamChild(
              body.x,
              body.y,
              body,
              variants[i],
              Math.cos((Math.PI * 2 * i) / 4) * 9,
              Math.sin((Math.PI * 2 * i) / 4) * 9,
            );
          }
        },
      },
    ],
  };

  Class.oneShot.UPGRADES_TIER_2 = ['dualShot', 'tripleShotOne', 'quarterOff', 'droneShot'];
  Class.dualShot.UPGRADES_TIER_3 = ['doubleTap', 'splitDecision'];
  Class.tripleShotOne.UPGRADES_TIER_3 = ['executioner', 'glassburst'];
  Class.quarterOff.UPGRADES_TIER_3 = ['crossCut', 'shatterDrive'];
  Class.droneShot.UPGRADES_TIER_3 = ['hiveShot', 'deathBloom'];
}

// Class used by a boss turret in elites definitions when Arms Race is disabled.
defineIfMissing('scatterer_AR', {
  PARENT: 'genericTank',
  LABEL: 'Scatterer',
  DANGER: 7,
  GUNS: [{
    POSITION: [18, 8, 1, 0, 0, 0, 0],
    PROPERTIES: {
      SHOOT_SETTINGS: combineStats([g.basic, g.twin]),
      TYPE: 'bullet',
    },
  }],
});

// Final safety pass: remove menu upgrades that still target missing classes.
const sanitizeMenuUpgrades = () => {
  for (const [name, def] of Object.entries(Class)) {
    if (!def || !Array.isArray(def.UPGRADES_TIER_0)) continue;
    let upgrades = def.UPGRADES_TIER_0;

    // If arms race is disabled, hide AR-only options from menus.
    if (!Config.arms_race) upgrades = upgrades.filter(u => !(typeof u === 'string' && u.endsWith('_AR')));

    def.UPGRADES_TIER_0 = upgrades.filter(u => typeof u !== 'string' || !!Class[u]);

    // Keep menu objects stable even after filtering.
    if (!def.UPGRADES_TIER_0.length && name.startsWith('arrasMenu_')) {
      def.UPGRADES_TIER_0 = [Config.spawn_class].filter(Boolean);
    }
  }
};

sanitizeMenuUpgrades();
