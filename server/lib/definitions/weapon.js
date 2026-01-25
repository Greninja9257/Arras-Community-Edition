const { combineStats } = require('./facilitators.js');

/**
 * @typedef {{
 *   POSITION: [number, number, number, number, number, number, number] | Partial<{ LENGTH: number; WIDTH: number; ASPECT: number; X: number; Y: number; ANGLE: number; DELAY: number; }>,
 *   PROPERTIES?: {
 *     SHOOT_SETTINGS?: Record<string, number>,
 *     TYPE?: string | (string | Record<string, any>)[]
 *   }
 * }} Gun
 */

class Weapon {
	/** @param {Gun[]} GUNS */
	constructor(GUNS, layer = 0) {
		/** @type {Gun[]} */
		this.GUNS = GUNS;
		/** @type {number} */
		this.LAYER = layer;
		/** @type {boolean} */
		this.isCloned = false;
	}

	#cloneWeapon() {
		if (this.isCloned) return this;

		const weapon = new Weapon(this.cloneGuns(), this.LAYER);
		weapon.isCloned = true;

		return weapon;
	}

	/**
	 * `Array.prototype.map` but for `Weapon` class
	 * @param {(gun: Gun, index: number) => Gun | null | undefined} f
	 */
	modify(f) {
		const self = this.#cloneWeapon();

		for (let i = 0, l = self.GUNS.length; i < l; ++i) {
			const output = f(self.GUNS[i], i);
			if (output) self.GUNS[i] = output;
		}

		return self;
	}

	/** @param {(position: Gun['POSITION'], index: number, gun: Gun) => Gun['POSITION']} f */
	position(f) {
		return this.modify((gun, i) => {
			const pos = f(gun.POSITION, i, gun);
			if (pos) gun.POSITION = pos;
		});
	}

	/** @param {(length: number, index: number, gun: Gun) => number} f */
	length(f) {
		return this.position((pos, i, gun) => {
			if (Array.isArray(pos)) {
				pos[0] = f(pos[0], i, gun);
			} else if (pos !== null && pos !== undefined) {
				pos.LENGTH = f(pos.LENGTH || 0, i, gun);
			}
			return pos;
		});
	}

	/** @param {(width: number, index: number, gun: Gun) => number} f */
	width(f) {
		return this.position((pos, i, gun) => {
			if (Array.isArray(pos)) {
				pos[1] = f(pos[1], i, gun);
			} else if (pos !== null && pos !== undefined) {
				pos.WIDTH = f(pos.WIDTH || 0, i, gun);
			}
			return pos;
		});
	}

	/** @param {(aspect: number, index: number, gun: Gun) => number} f */
	aspect(f) {
		return this.position((pos, i, gun) => {
			if (Array.isArray(pos)) {
				pos[2] = f(pos[2], i, gun);
			} else if (pos !== null && pos !== undefined) {
				pos.ASPECT = f(pos.ASPECT || 0, i, gun);
			}
			return pos;
		});
	}

	/** @param {(x: number, index: number, gun: Gun) => number} f */
	x(f) {
		return this.position((pos, i, gun) => {
			if (Array.isArray(pos)) {
				pos[3] = f(pos[3], i, gun);
			} else if (pos !== null && pos !== undefined) {
				pos.X = f(pos.X || 0, i, gun);
			}
			return pos;
		});
	}

	/** @param {(y: number, index: number, gun: Gun) => number} f */
	y(f) {
		return this.position((pos, i, gun) => {
			if (Array.isArray(pos)) {
				pos[4] = f(pos[4], i, gun);
			} else if (pos !== null && pos !== undefined) {
				pos.Y = f(pos.Y || 0, i, gun);
			}
			return pos;
		});
	}

	/** @param {(angle: number, index: number, gun: Gun) => number} f */
	angle(f) {
		return this.position((pos, i, gun) => {
			if (Array.isArray(pos)) {
				pos[5] = f(pos[5], i, gun);
			} else if (pos !== null && pos !== undefined) {
				pos.ANGLE = f(pos.ANGLE || 0, i, gun);
			}
			return pos;
		});
	}

	/** @param {(delay: number, index: number, gun: Gun) => number} f */
	delay(f) {
		return this.position((pos, i, gun) => {
			if (Array.isArray(pos)) {
				pos[6] = f(pos[6], i, gun);
			} else if (pos !== null && pos !== undefined) {
				pos.DELAY = f(pos.DELAY || 0, i, gun);
			}
			return pos;
		});
	}

	/**
	 * @overload
	 * @param {(properties: Gun['PROPERTIES'], index: number, gun: Gun) => Gun['PROPERTIES']} f
	 * @returns {Weapon}
	 *
	 * @overload
	 * @param {(properties: Required<Gun>['PROPERTIES'], index: number, gun: Gun) => Gun['PROPERTIES']} f
	 * @param {false} defined
	 * @returns {Weapon}
	 * */
	properties(f, defined = true) {
		return this.modify((props, i, gun) => {
			if (defined && !props.PROPERTIES) return;
			else if (!defined) props.PROPERTIES = {};
			const properties = f(props.PROPERTIES, i, gun);
			if (properties) props.PROPERTIES = properties;
		});
	}

	/**
	 * @overload
	 * @param {(properties: Required<Required<Gun>['PROPERTIES']>['SHOOT_SETTINGS'], index: number, gun: Gun) => object} f
	 * @returns {Weapon}
	 *
	 * @overload
	 * @param {(properties: Required<Gun>['PROPERTIES']['SHOOT_SETTINGS'], index: number, gun: Gun) => object} f
	 * @param {true} override
	 * @returns {Weapon}
	 * */
	shootSettings(f, override = false) {
		return this.properties((props, i, gun) => {
			if (!override && !props.SHOOT_SETTINGS) return props.SHOOT_SETTINGS;
			const settings = f(props.SHOOT_SETTINGS, i, gun);
			if (settings) props.SHOOT_SETTINGS = settings;
		}, !override);
	}

	/** @param {Record<string, number>[]} stats */
	combineStats(stats, override = false) {
		return this.shootSettings(
			settings => combineStats([settings || {}, ...stats]),
			override
		);
	}

	/**
	 * @overload
	 * @param {(type: Required<Required<Gun>['PROPERTIES']>['TYPE'], index: number, gun: Gun) => Required<Required<Gun>['PROPERTIES']>['TYPE']} f
	 * @returns {Weapon}
	 *
	 * @overload
	 * @param {(type: Required<Gun>['PROPERTIES']['TYPE'], index: number, gun: Gun) => Required<Required<Gun>['PROPERTIES']>['TYPE']} f
	 * @param {true} override
	 * @returns {Weapon}
	 * */
	type(f, override = false) {
		return this.properties((props, i, gun) => {
			if (!override && !props.TYPE) return props.TYPE;
			props.TYPE = f(props.TYPE, i, gun);
		}, override);
	}

	/** @param {Required<Required<Gun>['PROPERTIES']>['TYPE'][0]} t */
	addType(t, override = false) {
		return this.type(type => {
			if (Array.isArray(type)) {
				return type.concat(t);
			} else if (typeof type == 'object' && type !== null) {
				return [type, t];
			} else if (override) {
				return t;
			}
		}, override);
	}

	/** @param {(layer: number) => number} f */
	layer(f) {
		const self = this.#cloneWeapon();
		self.LAYER = f(self.LAYER);
		return self;
	}

	expand() {
		return this.GUNS;
	}

	cloneGuns() {
		return JSON.parse(JSON.stringify(this.GUNS));
	}
}

/**
 * Supports layer
 * @param {Weapon[]} weapons
 * */
const expandWeapons = function (weapons) {
	weapons = weapons.sort((a, b) => a.LAYER - b.LAYER);

	const GUNS = [];

	for (let i = 0, l = weapons.length; i < l; ++i) {
		GUNS.push(...weapons[i].expand());
	}

	return GUNS;
};

module.exports = { Weapon, expandWeapons };
