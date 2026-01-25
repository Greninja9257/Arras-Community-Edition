const { Weapon } = require('./weapon.js');
const { combineStats } = require('./facilitators.js');
const g = require('./gunvals.js');

global.WeaponClass = {};
WeaponClass.basic = new Weapon(Class.basic.GUNS);
WeaponClass.desmos = new Weapon(Class.desmos.GUNS);
WeaponClass.director = new Weapon(Class.director.GUNS);
WeaponClass.factory = new Weapon(Class.factory.GUNS);
WeaponClass.machineGun = new Weapon(Class.machineGun.GUNS);
WeaponClass.marksman = new Weapon(Class.marksman.GUNS);
WeaponClass.railgun = new Weapon(Class.railgun.GUNS);
WeaponClass.single = new Weapon(Class.single.GUNS);
WeaponClass.stalker = new Weapon(Class.stalker.GUNS);
WeaponClass.swamp = new Weapon(
	[
		{
			POSITION: [7, 7.5, 0.6, 7, 0, 60, 0],
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.swarm, g.commander]),
				TYPE: 'swarm',
				STAT_CALCULATOR: 'swarm'
			}
		}
	],
	-1
);

WeaponClass.assassin = new Weapon(Class.assassin.GUNS);
WeaponClass.twin = new Weapon(Class.twin.GUNS);
WeaponClass.pounder = new Weapon(Class.pounder.GUNS);
WeaponClass.sniper = new Weapon(Class.sniper.GUNS);
WeaponClass.trapper = new Weapon(Class.trapper.GUNS);
WeaponClass.minigun = new Weapon(Class.minigun.GUNS);
WeaponClass.streamliner = new Weapon(Class.streamliner.GUNS);
WeaponClass.gunner = new Weapon(Class.gunner.GUNS);
WeaponClass.hunter = new Weapon(Class.hunter.GUNS);
WeaponClass.predator = new Weapon(Class.predator.GUNS);
WeaponClass.railgun = new Weapon(Class.railgun.GUNS);
WeaponClass.sprayer = new Weapon(Class.sprayer.GUNS);
WeaponClass.tripleShot = new Weapon(Class.tripleShot.GUNS);
WeaponClass.pentaShot = new Weapon(Class.pentaShot.GUNS);
WeaponClass.spreadshot = new Weapon(Class.spreadshot.GUNS);
WeaponClass.triAngle = new Weapon(Class.triAngle.GUNS);
WeaponClass.boosterBack = new Weapon(Class.booster.GUNS.slice(1));
WeaponClass.atomizer = new Weapon(Class.atomizer.GUNS);
WeaponClass.barricade = new Weapon(Class.barricade.GUNS);
WeaponClass.nailgun = new Weapon(Class.nailgun.GUNS);
WeaponClass.redistributor = new Weapon(Class.redistributor.GUNS);

WeaponClass.focal = new Weapon(Class.focal.GUNS);
WeaponClass.fork = new Weapon(Class.fork.GUNS);
WeaponClass.doubleTwin = new Weapon(Class.doubleTwin.GUNS);
WeaponClass.rifle = new Weapon(Class.rifle.GUNS);
WeaponClass.crossbow = new Weapon(Class.crossbow.GUNS);
