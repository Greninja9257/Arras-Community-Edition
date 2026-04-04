const { Weapon } = require('./weapon.js');
const { combineStats } = require('./facilitators.js');
const g = require('./gunvals.js');

const makeWeapon = (className, gunsFn) => {
    try {
        const guns = gunsFn();
        if (guns) WeaponClass[className] = new Weapon(guns);
    } catch (e) { /* class doesn't exist in this build */ }
};

global.WeaponClass = {};
makeWeapon('basic',        () => Class.basic.GUNS);
makeWeapon('desmos',       () => Class.desmos.GUNS);
makeWeapon('director',     () => Class.director.GUNS);
makeWeapon('factory',      () => Class.factory.GUNS);
makeWeapon('machineGun',   () => Class.machineGun.GUNS);
makeWeapon('marksman',     () => Class.marksman.GUNS);
makeWeapon('railgun',      () => Class.railgun.GUNS);
makeWeapon('single',       () => Class.single.GUNS);
makeWeapon('stalker',      () => Class.stalker.GUNS);
makeWeapon('swamp', () => [
	{
		POSITION: [7, 7.5, 0.6, 7, 0, 60, 0],
		PROPERTIES: {
			SHOOT_SETTINGS: combineStats([g.swarm, g.commander]),
			TYPE: 'swarm',
			STAT_CALCULATOR: 'swarm'
		}
	}
]);
makeWeapon('assassin',     () => Class.assassin.GUNS);
makeWeapon('twin',         () => Class.twin.GUNS);
makeWeapon('pounder',      () => Class.pounder.GUNS);
makeWeapon('sniper',       () => Class.sniper.GUNS);
makeWeapon('trapper',      () => Class.trapper.GUNS);
makeWeapon('minigun',      () => Class.minigun.GUNS);
makeWeapon('streamliner',  () => Class.streamliner.GUNS);
makeWeapon('gunner',       () => Class.gunner.GUNS);
makeWeapon('hunter',       () => Class.hunter.GUNS);
makeWeapon('predator',     () => Class.predator.GUNS);
makeWeapon('sprayer',      () => Class.sprayer.GUNS);
makeWeapon('tripleShot',   () => Class.tripleShot.GUNS);
makeWeapon('pentaShot',    () => Class.pentaShot.GUNS);
makeWeapon('spreadshot',   () => Class.spreadshot.GUNS);
makeWeapon('triAngle',     () => Class.triAngle.GUNS);
makeWeapon('boosterBack',  () => Class.booster.GUNS.slice(1));
makeWeapon('atomizer',     () => Class.atomizer.GUNS);
makeWeapon('barricade',    () => Class.barricade.GUNS);
makeWeapon('nailgun',      () => Class.nailgun.GUNS);
makeWeapon('redistributor',() => Class.redistributor.GUNS);
makeWeapon('focal',        () => Class.focal.GUNS);
makeWeapon('fork',         () => Class.fork.GUNS);
makeWeapon('doubleTwin',   () => Class.doubleTwin.GUNS);
makeWeapon('rifle',        () => Class.rifle.GUNS);
makeWeapon('crossbow',     () => Class.crossbow.GUNS);
