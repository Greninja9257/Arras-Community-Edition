const { generateProceduralClasses } = require('../procedural.js');
const { makeTurret, combineStats } = require('../facilitators.js');
const { base } = require('../constants.js');

const TEMPLATE = 'proc_celestial';

const Formula = {
	size: x =>
		1.04167 * x * x * x * x -
		5.41667 * x * x * x +
		8.95833 * x * x +
		0.416667 * x +
		25,
	health: x =>
		20.83333 * x * x * x * x -
		83.33333 * x * x * x +
		104.16667 * x * x +
		208.33333 * x +
		500,
	shield: x =>
		1.45833 * x * x * x * x -
		7.91667 * x * x * x +
		16.04167 * x * x +
		0.416667 * x +
		25,
	speed: x => 1.00341 / (1 + Math.exp(1.15596 * x - 3.23017)),
	damage: x =>
		0.0416667 * x * x * x * x -
		0.0833333 * x * x * x -
		0.0416667 * x * x +
		2.08333 * x +
		5,
	regen: x => 0.554203 / (1 + Math.exp(0.920001 * x - 2.49122))
};

const makeTrapTurret = function (GUNS, stats) {
	for (let gun of GUNS) {
		if (!gun.PROPERTIES) continue;
		gun.PROPERTIES.AUTOFIRE = true;

		if (stats && gun.PROPERTIES.SHOOT_SETTINGS) {
			gun.PROPERTIES.SHOOT_SETTINGS = combineStats([
				gun.PROPERTIES.SHOOT_SETTINGS,
				...stats
			]);
		}
	}

	return makeTurret(
		{ GUNS },
		{ independent: true, hasAI: false, extraStats: [] }
	);
};

const makeWeaponTurret = function (GUNS, stats) {
	if (stats) {
		for (let gun of GUNS) {
			if (!gun?.PROPERTIES?.SHOOT_SETTINGS) continue;
			gun.PROPERTIES.SHOOT_SETTINGS = combineStats([
				gun.PROPERTIES.SHOOT_SETTINGS,
				...stats
			]);
		}
	}

	return makeTurret(
		{ GUNS },
		{ canRepel: true, limitFov: true, extraStats: [] }
	);
};

const makeDroneTurret = function (GUNS, drones, stats) {
	for (let gun of GUNS) {
		if (!gun.PROPERTIES) continue;
		gun.PROPERTIES.STAT_CALCULATOR = 'drone';
		gun.PROPERTIES.AUTOFIRE = true;
		gun.PROPERTIES.SYNCS_SKILLS = true;
		gun.PROPERTIES.MAX_CHILDREN = drones;

		if (stats && gun.PROPERTIES.SHOOT_SETTINGS) {
			gun.PROPERTIES.SHOOT_SETTINGS = combineStats([
				gun.PROPERTIES.SHOOT_SETTINGS,
				...stats
			]);
		}
	}

	return makeTurret(
		{ GUNS },
		{ canRepel: true, limitFov: true, extraStats: [] }
	);
};

const makeClass = function (name, value) {
	Class[TEMPLATE + '_' + name] = value;
};

const getClass = function (name) {
	return Class[TEMPLATE + '_' + name];
};

// 1ST LAYER

makeClass(
	'trapperTurret',
	makeTrapTurret(
		[
			{ POSITION: { ...Class.trapper.GUNS[0].POSITION, Y: 7 } },
			{
				...Class.trapper.GUNS[1],
				POSITION: { ...Class.trapper.GUNS[1].POSITION, Y: 7 }
			},
			{ POSITION: { ...Class.trapper.GUNS[0].POSITION, Y: -7 } },
			{
				...Class.trapper.GUNS[1],
				POSITION: { ...Class.trapper.GUNS[1].POSITION, Y: -7, DELAY: 0.5 }
			}
		],
		[
			{
				reload: 2.2,
				size: 1.2,
				health: 1.2,
				damage: 1.1,
				speed: 0.6,
				shudder: 0.1
			}
		]
	)
);
makeClass(
	'trapTurret',
	makeTrapTurret(Class.baseTrapTurret.GUNS, [{ reload: 0.9 }])
);

// 2ND LAYER

makeClass('twinTurret', makeWeaponTurret(Class.twin.GUNS));
makeClass('machineGunTurret', makeWeaponTurret(Class.machineGun.GUNS));

// 3RD LAYER

makeClass('gunnerTurret', makeWeaponTurret(Class.gunner.GUNS));
makeClass('helixTurret', makeWeaponTurret(Class.helix.GUNS));
makeClass('assassinTurret', makeWeaponTurret(Class.assassin.GUNS));
makeClass('sprayerTurret', makeWeaponTurret(Class.sprayer.GUNS));
makeClass('cruiserTurret', makeWeaponTurret(Class.cruiser.GUNS));
makeClass('builderTurret', makeWeaponTurret(Class.builder.GUNS));

// 4TH LAYER

makeClass('tripletTurret', makeWeaponTurret(Class.triplet.GUNS));
makeClass('triplexTurret', makeWeaponTurret(Class.triplex.GUNS));
makeClass('machineGunnerTurret', makeWeaponTurret(Class.machineGunner.GUNS));
makeClass('rangerTurret', makeWeaponTurret(Class.ranger.GUNS));
makeClass('streamlinerTurret', makeWeaponTurret(Class.streamliner.GUNS));
makeClass('barricadeTurret', makeWeaponTurret(Class.barricade.GUNS));
makeClass('redistributorTurret', makeWeaponTurret(Class.redistributor.GUNS));
makeClass('crowbarTurret', makeWeaponTurret(Class.crowbar.GUNS));
makeClass('carrierTurret', makeWeaponTurret(Class.carrier.GUNS));
makeClass('spawnerTurret', makeDroneTurret(Class.spawner.GUNS, 2));
makeClass('overlordTurret', makeDroneTurret(Class.overlord.GUNS, 4));
makeClass('constructorTurret', makeWeaponTurret(Class.construct.GUNS));
makeClass('skimmerTurret', makeWeaponTurret(Class.skimmer.GUNS));
makeClass('engineerTurret', makeWeaponTurret(Class.engineer.GUNS));
makeClass('swarmerTurret', makeWeaponTurret(Class.swarmer.GUNS));

makeClass('forkTurret', makeWeaponTurret(Class.fork.GUNS));

const placeWeapons = function (mockup, type) {
	mockup.TURRETS = Array.from({ length: mockup.SHAPE }, (_, i) => ({
		POSITION: [
			6.5 * lazyRealSizes[mockup.SHAPE],
			9 - lazyRealSizes[mockup.SHAPE],
			0,
			(360 / mockup.SHAPE) * (i + 0.5),
			180,
			0
		],
		TYPE: type
	}));
};

const placeLayer = function (context, tier, TYPE) {
	const type = {
		PARENT: 'genericTank',
		LABEL: '',
		SHAPE: context.mockup.SHAPE - tier * 2,
		COLOR: -1,
		INDEPENDENT: true,
		FACING_TYPE: ['spin', { speed: (0.05 / 1.5) * (tier % 2 ? -1 : 1) }],
		MAX_CHILDREN: 0,
		GUNS: [],
		TURRETS: []
	};

	placeWeapons(type, TYPE);

	const name = 'proc_celestial_' + context.getUnique() + '_layer_' + tier;
	Class[name] = type;

	const realSize = lazyRealSizes[type.SHAPE];

	context.mockup.TURRETS.push({
		POSITION: [
			(20 - (tier * (tier == 0 ? 10 : 12)) / context.tiers) /
				realSize /
				realSize,
			0,
			0,
			0,
			360,
			1
		],
		TYPE: name
	});
};

const makeCelestialBranch = function (TIER, type, name) {
	if (TIER == 1) {
		return function (context, tier) {
			if (tier != 1) return context.cancel();
			placeWeapons(context.mockup, type);
			if (context.tiers == tier) context.addLabel(name);
		};
	} else {
		return function (context, tier) {
			if (tier != TIER) return context.cancel();
			placeLayer(context, tier - 1, type);
			if (context.tiers == tier) context.addLabel(name);
		};
	}
};

Class.proc_celestial = {
	PARENT: 'genericTank',
	LABEL: 'Egg',
	DANGER: 6,
	FACING_TYPE: ['spin', { speed: 0.02 }],
	HITS_OWN_TYPE: 'hardOnlyBosses',
	BODY: { PUSHABILITY: 0.05 },
	CONTROLLERS: [['minion', { turnwiserange: 360 }], 'canRepel'],
	AI: { NO_LEAD: true }
};
/*
Class.proc_celestial.UPGRADES_TIER_1 = generateProceduralClasses({
	template: TEMPLATE,
	mockup: 'proc_celestial',
	baseBranch: (context, tiers) => {
		const mockup = context.mockup;
		mockup.SHAPE = 1 + tiers * 2;
		mockup.DANGER = 6 + tiers;
		mockup.SIZE = Formula.size(tiers - 1);
		mockup.BODY = {
			HEALTH: Formula.health(tiers - 1),
			SHIELD: Formula.shield(tiers - 1),
			SPEED: base.SPEED * Formula.speed(tiers - 1),
			DAMAGE: Formula.damage(tiers - 1),
			REGEN: base.REGEN * Formula.regen(tiers - 1)
		};
		mockup.EXTRA_SKILL = 10 - tiers;

		if (tiers == 3) {
			// == because mockup is stackable so this means "once"
			mockup.CONTROLLERS.push(['minion', { orbit: 240 }]);
		}

		// clear all layers
		mockup.TURRETS = [];

		context.addLabel(
			[
				'Cell',
				'Lite',
				'Terrestrial',
				'Celestial',
				'Eternal',
				'Primordial',
				'Omnipotent'
			][tiers - 1]
		);
	},
	/* prettier-ignore *!/
	branches: {
		trapper: makeCelestialBranch(1, getClass('trapperTurret'), 'Trapper'),
		trap: makeCelestialBranch(1, getClass('trapTurret'), 'MegaTrapper'),

		twin: makeCelestialBranch(2, getClass('twinTurret'), 'Twin'),
		machineGun: makeCelestialBranch(2, getClass('machineGunTurret'), 'Machine'),

		gunner: makeCelestialBranch(3, getClass('gunnerTurret'), 'Gunner'),
		helix: makeCelestialBranch(3, getClass('helixTurret'), 'Helix'),
		assassin: makeCelestialBranch(3, getClass('assassinTurret'), 'Assassin'),
		sprayer: makeCelestialBranch(3, getClass('sprayerTurret'), 'Sprayer'),
		cruiser: makeCelestialBranch(3, getClass('cruiserTurret'), 'Cruiser'),
		builder: makeCelestialBranch(3, getClass('builderTurret'), 'Builder'),

		triplet: makeCelestialBranch(4, getClass('tripletTurret'), 'Triplet'),
		triplex: makeCelestialBranch(4, getClass('triplexTurret'), 'Triplex'),
		machineGunner: makeCelestialBranch(4, getClass('machineGunnerTurret'), 'MachineGunner'),
		ranger: makeCelestialBranch(4, getClass('rangerTurret'), 'Ranger'),
		streamliner: makeCelestialBranch(4, getClass('streamlinerTurret'), 'Streamliner'),
		barricade: makeCelestialBranch(4, getClass('barricadeTurret'), 'Barricade'),
		redistributor: makeCelestialBranch(4, getClass('redistributorTurret'), 'Redistributor'),
		crowbar: makeCelestialBranch(4, getClass('crowbarTurret'), 'Crowbar'),
		carrier: makeCelestialBranch(4, getClass('carrierTurret'), 'Carrier'),
		spawner: makeCelestialBranch(4, getClass('spawnerTurret'), 'Spawner'),
		overlord: makeCelestialBranch(4, getClass('overlordTurret'), 'Overlord'),
		construct: makeCelestialBranch(4, getClass('constructorTurret'), 'Constructor'),
		skimmer: makeCelestialBranch(4, getClass('skimmerTurret'), 'Skimmer'),
		engineer: makeCelestialBranch(4, getClass('engineerTurret'), 'Engineer'),
		swarmer: makeCelestialBranch(4, getClass('swarmerTurret'), 'Swamper'),

		fork: makeCelestialBranch(5, getClass('forkTurret'), 'Fork')
	},
	startTier: 1,
	maxTiers: 1 + 5,
	keepSequence: true
});
*/
