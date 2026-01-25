const { dereference } = require('./facilitators')

/* comment the comment to disable the comment
/**
@typedef {Partial<{
	LABEL: (tier: number) => string,                 // prefix of the tank's label
	LABELS: (tier: number) => string[],              // prefixes of the tank's label
	OVERWRITE_LABEL: boolean,                        // overwrite the original label? default: false
	SKILL_CAP: (tier: number) => [number, number, number, number, number, number, number, number, number, number],
	INVISIBLE: (tier: number) => number | [number, number],                                             // NOT STACKABLE
	DANGER: (tier: number) => number,                // returns new DANGER
	SIZE: (current: number, tier: number) => number,
	BODY: {
		// NOTE: not sorted
		ACCELERATION: (current: number, tier: number) => number,
		SPEED: (current: number, tier: number) => number,
		HEALTH: (current: number, tier: number) => number,
		DAMAGE: (current: number, tier: number) => number,
		DENSITY: (current: number, tier: number) => number,
		FOV: (current: number, tier: number) => number,
	},
	GUNS: (GUNS: object[], tier: number) => object[],       // returns new guns
	TURRETS: (TURRETS: object[], tier: number) => object[], // returns new turrets
	MAX_TIERS: number                                       // max tiers of current branch
}>} ProceduralMockup
**/

/*

const megaNames = 'Mega Ultra Super Supreme Omega Celestial'.split(' ');
const spikeNames = 'Spike Spiker Spikest Thorn Thorner Thornest'.split(' ');

const generatingMockup = [
	{
		LABEL: tier =>
			spikeNames[Math.min(spikeNames.length - 1, tier - 1)] +
			(tier > spikeNames.length ? tier - spikeNames.length + 1 : ''),
		OVERWRITE_LABEL: true,
		DANGER: 1,
		BODY: {
			SPEED: value => value * 0.9,
			DAMAGE: value => value + base.DAMAGE * 0.25
		},
		TURRETS: (TURRETS, tier) => {
			const turrets = [];
			for (let i = 0, l = TURRETS.length + 2; i < l; ++i) {
				if (TURRETS[i] && TURRETS[i].TYPE) {
					const type = TURRETS[i].TYPE[0] || TURRETS[i].TYPE;
					if (type == 'landmineBody' || type == 'autoTurret') {
						turrets.push(TURRETS[i]);
						continue;
					}
				}

				const turret = cloneTurretsArray(TURRETS[i] || TURRETS[0]);
				turret.POSITION.SIZE -= 4 / Math.pow(tier, 2);
				turret.POSITION.ANGLE = (i * 120) / l; // triangle
				turret.TYPE = 'spikeBody';
				turrets.push(turret);
			}
			return turrets;
		},
		MAX_TIERS: 6
	},
	{
		LABEL: tier => 'LandmineTier' + tier,
		OVERWRITE_LABEL: true,
		INVISIBLE: tier => [0.06 / tier, 0.01 / tier],
		BODY: {
			SPEED: value => value * 0.9
		},
		TURRETS: (TURRETS, tier) =>
			TURRETS.concat([
				{
					POSITION: {
						SIZE: 21.5,
						ANGLE: 60 * tier,
						ARC: 360
					},
					TYPE: 'landmineBody'
				}
			]),
		MAX_TIERS: 2
	},
	{
		LABELS: tier => {
			const prefixes = [];

			while (tier > 0) {
				let i = Math.min(megaNames.length, tier);
				prefixes.push(megaNames[i - 1]);
				tier -= i;
			}

			return prefixes;
		},
		DANGER: 1,
		BODY: {
			ACCELERATION: value => value + 0.01,
			SPEED: value => value * 1.1,
			FOV: (value, tier) => value * (1 + 0.2 / (tier + 1)),
			DENSITY: (value, tier) => value * (1 + 3 / (tier + 1))
		},
		TURRETS: TURRETS => {
			let length = TURRETS.length;
			const turrets = cloneTurretsArray(TURRETS);
			for (let i = 0; i < length; ++i) {
				if ((turrets[i].TYPE || turrets[i].TYPE[0]) == 'autoTurret') continue;
				turrets[i].POSITION.SIZE += 2;
			}
			return turrets;
		},
		MAX_TIERS: 6
	},
	{
		LABELS: tier => Array.from({ length: tier }, () => 'Auto'),
		DANGER: 1,
		TURRETS: (TURRETS, tier) =>
			TURRETS.concat([
				{
					POSITION: {
						SIZE: 12,
						ANGLE: (360 / tier + 180) % 360,
						ARC: 360,
						LAYER: 1
					},
					TYPE: [
						'autoTurret',
						{
							CONTROLLERS: ['nearestDifferentMaster'],
							INDEPENDENT: true,
							COLOR: 'gray'
						}
					]
				}
			]),
		SKILL_CAP: _tier => Array(9).fill(smshskl),
		MAX_TIERS: 1
	}
];

const nameTemplate = 'gen_smasher';

const defaultMockup = {
	...Class.genericSmasher, // PARENT
	LABEL: 'Smasher',
	DANGER: 6,
	TURRETS: [{ POSITION: { SIZE: 21.5, ARC: 360 }, TYPE: 'smasherBody' }],
	REROOT_UPGRADE_TREE: nameTemplate,
	BRANCH_TIERS: Array(generatingMockup.length).fill(0)
};

*/

// const OVERWRITE_LABEL = Symbol('OVERWRITE_LABEL');
const BRANCH_TIERS = Symbol('BRANCH_TIERS')
const SEQUENCE = Symbol('SEQUENCE')

const levelCap = Config.LEVEL_CAP ?? Config.level_cap ?? 45
const tierMultiplier = Config.TIER_MULTIPLIER ?? Config.tier_multiplier ?? 15
const maxTier =
	Config.MAX_UPGRADE_TIER ||
	Math.floor(levelCap / tierMultiplier)
const labelSeparator = '-'
const definitionSeparator = '_'

const defaultOptions = {
  template: '',
  mockup: 'genericTank',
  /** @type {((ctx: ProceduralMockupContext, totalTiers: number) => void) | null} */
  baseBranch: null,
  /** @type {Record<string | symbol, (ctx: ProceduralMockupContext, tier: number) => void>} */
  branches: [],
  startTier: 1,
  maxTiers: maxTier,
  maxTiersCap: maxTier,
  rerootUpgradeTree: true,
  keepSequence: false
}

const cloneObject =
	globalThis.structuredClone ||
	function (object) {
	  return JSON.parse(JSON.stringify(object))
	}

const flatMockup = function (mockup) {
  let output = dereference(mockup)

  while (output.PARENT) {
    const parent = dereference(output.PARENT)
    output.PARENT = output.PARENT.PARENT
    output = Object.assign(parent, output)
  }

  return output
}

class ProceduralMockupContext {
  constructor (context, mockup, tiers, sequence) {
    /** @type {ProceduralClassesContext} */
    this.context = context
    this.mockup = mockup
    this.branchTiers = tiers
    this.tiers = sequence.length
    this.label = []
    /** @type {string[]} */
    this.sequence = sequence
    this.cancelled = false
  }

  addLabel (label) {
    this.label.push(label)
  }

  addLabels (labels) {
    this.label.push(...labels)
  }

  getLabel () {
    return this.label.join(labelSeparator)
  }

  getTurretsById (id) {
    if (!this.mockup.TURRETS) return

    return this.mockup.TURRETS.filter(t => t.ID == id)
  }

  getUnique () {
    if (this.context.keepSequence) {
      return this.sequence.join(definitionSeparator)
    } else {
      return Object.values(this.branchTiers)
        .map((x, i) => x * Math.pow(2, this.context.maxTiers * i))
        .reduce((a, b) => a + b, 0)
    }
  }

  cancel () {
    this.cancelled = true
  }
}

class ProceduralClassesContext {
  /** @param {typeof defaultOptions} options */
  constructor (options) {
    /** @type {typeof defaultOptions} */
    this.options = Object.assign(defaultOptions, options ?? {})

    ensureIsClass(this.options.mockup)

    if (typeof this.options.template !== 'string') {
      throw new Error('`template` should be a string')
    }

    if (!this.options.template) {
      this.options.template = 'procedural' + Math.random().toString().slice(2)
    }

    if (
      typeof this.options.startTier !== 'number' ||
			!Number.isFinite(this.options.startTier) ||
			!Number.isSafeInteger(this.options.startTier)
    ) {
      throw new Error('`startTier` should be a safe finite number')
    }

    if (
      typeof this.options.maxTiers !== 'number' ||
			(this.options.maxTiers != Number.POSITIVE_INFINITY &&
				!Number.isSafeInteger(this.options.maxTiers))
    ) {
      throw new Error('`maxTiers` should be a safe number or `Infinity`')
    }

    if (
      typeof this.options.maxTiersCap !== 'number' ||
			(this.options.maxTiersCap != Number.POSITIVE_INFINITY &&
				!Number.isSafeInteger(this.options.maxTiersCap))
    ) {
      throw new Error('`maxTiersCap` should be a safe number or `Infinity`')
    }

    if (this.options.rerootUpgradeTree) { Class[this.options.mockup].REROOT_UPGRADE_TREE = this.options.mockup }

    // make it flat to access PARENT's attributes
    const cls = flatMockup(Class[this.options.mockup])
    // cls[OVERWRITE_LABEL] = false;
    cls[BRANCH_TIERS] = Object.fromEntries(
      Object.keys(this.options.branches).map(x => [x, 0])
    )
    cls[SEQUENCE] = []

    this.template = this.options.template
    this.mockupName = this.options.mockup
    this.mockup = cls
    this.baseBranch = this.options.baseBranch
    this.branches = this.options.branches
    this.startTier = this.options.startTier
    this.maxTiers = this.options.maxTiers
    this.rerootUpgradeTree = this.options.rerootUpgradeTree
    this.maxTiersCap = this.options.maxTiersCap
    this.keepSequence = this.options.keepSequence
  }

  /*
	#generateBranch(branch, branchTiers, parentMockup) {
		const branchGenerator = this.branches[branch];
		const branchTier = branchTiers[branch];

		const mockup = dereference(parentMockup);
		mockup[BRANCH_TIERS] = branchTiers;

		const label = [];

		if (branchGenerator.OVERWRITE_LABEL) mockup[OVERWRITE_LABEL] = true;

		if (!mockup[OVERWRITE_LABEL]) label.push(this.mockup.LABEL);

		for (const key in mockup[BRANCH_TIERS]) {
			if (mockup[BRANCH_TIERS][key] == 0) continue;

			const branchGen = this.branches[key];

			if (branchGen.LABEL) label.push(branchGen.LABEL(branchTier));
			if (branchGen.LABELS) label.push(...branchGen.LABELS(branch));
		}

		mockup.LABEL = label.reverse().join(labelSeparator);

		if (branchGenerator.DANGER)
			mockup.DANGER += branchGenerator.DANGER(branchTier);

		if (branchGenerator.SIZE)
			mockup.SIZE = branchGenerator.SIZE(mockup.SIZE, branchTier);

		if (branchGenerator.INVISIBLE)
			mockup.INVISIBLE = branchGenerator.INVISIBLE(branchTier);

		if (branchGenerator.BODY) {
			mockup.BODY ??= {};

			if (branchGenerator.BODY.DAMAGE)
				mockup.BODY.DAMAGE = branchGenerator.BODY.DAMAGE(
					mockup.BODY.DAMAGE ?? base.DAMAGE,
					branchTier
				);
			if (branchGenerator.BODY.DENSITY)
				mockup.BODY.DENSITY = branchGenerator.BODY.DENSITY(
					mockup.BODY.DENSITY ?? base.DENSITY,
					branchTier
				);
			if (branchGenerator.BODY.FOV)
				mockup.BODY.FOV = branchGenerator.BODY.FOV(
					mockup.BODY.FOV ?? base.FOV,
					branchTier
				);
			if (branchGenerator.BODY.SPEED)
				mockup.BODY.SPEED = branchGenerator.BODY.SPEED(
					mockup.BODY.SPEED ?? base.SPEED,
					branchTier
				);
			if (branchGenerator.BODY.ACCELERATION)
				mockup.BODY.ACCELERATION = branchGenerator.BODY.ACCELERATION(
					mockup.BODY.ACCELERATION ?? base.ACCEL,
					branchTier
				);
		}

		if (branchGenerator.GUNS)
			mockup.GUNS = branchGenerator.GUNS(mockup.GUNS, branchTier);

		if (branchGenerator.TURRETS)
			mockup.TURRETS = branchGenerator.TURRETS(mockup.TURRETS, branchTier);

		if (branchGenerator.SKILL_CAP) {
			const skillCap = branchGenerator.SKILL_CAP(branchTier);
			for (let j = 0; j < 9; ++j) {
				mockup.SKILL_CAP[j] = Math.max(
					mockup.SKILL_CAP[j] ?? dfltskl,
					skillCap[j] ?? 0
				);
			}
		}

		if (this.rerootUpgradeTree) mockup.REROOT_UPGRADE_TREE = this.mockupName;

		const name = [this.template, ...Object.values(branchTiers)].join(
			definitionSeparator
		);
		Class[name] = mockup;
		return name;
	}
	*/

  #generateNextTierOf (mockup) {
    const generatedTier = []

    for (const branch in this.branches) {
      const branchTiers = cloneObject(mockup[BRANCH_TIERS])
      branchTiers[branch] += 1

      const sequence = cloneObject(mockup[SEQUENCE])
      sequence.push(branch)

      let currentMockupName

      if (this.keepSequence) {
        currentMockupName = [this.template, ...sequence].join(
          definitionSeparator
        )
      } else {
        currentMockupName = [this.template, ...Object.values(branchTiers)].join(
          definitionSeparator
        )
      }

      // don't generate already generated mockup
      if (Class[currentMockupName]) {
        generatedTier.push(currentMockupName)
        continue
      }

      if (mockup[BRANCH_TIERS][branch] >= this.branches[branch].MAX_TIERS) { continue }

      const mockupContext = new ProceduralMockupContext(
        this,
        dereference(mockup),
        branchTiers,
        sequence
      )

      this.baseBranch(mockupContext, sequence.length)

      if (this.keepSequence) {
        for (let tier = 0, l = sequence.length; tier < l; ++tier) {
          this.branches[sequence[tier]](mockupContext, tier + 1)
        }
      } else {
        for (const branch2 in this.branches) {
          this.branches[branch2](mockupContext, branchTiers[branch2])
        }
      }

      if (mockupContext.cancelled) continue

      mockupContext.mockup.LABEL = mockupContext.getLabel()
      if (this.rerootUpgradeTree) { mockupContext.mockup.REROOT_UPGRADE_TREE = this.mockupName }
      mockupContext.mockup[BRANCH_TIERS] = branchTiers
      mockupContext.mockup[SEQUENCE] = sequence

      Class[currentMockupName] = mockupContext.mockup
      generatedTier.push(currentMockupName)
    }

    return generatedTier
  }

  generate () {
    if (this.startTier >= this.maxTiers) return []

    const firstTier = this.#generateNextTierOf(this.mockup)

    let tier = this.startTier + 1
    let prevTiers = firstTier
    let currentTiers

    // break if capped or no tiers
    while (tier != this.maxTiers && prevTiers.length) {
      currentTiers = []

      for (let branch = 0; branch < prevTiers.length; ++branch) {
        const nextTiers = this.#generateNextTierOf(Class[prevTiers[branch]])
        Class[prevTiers[branch]][
          'UPGRADES_TIER_' + Math.min(tier, this.maxTiersCap)
        ] = nextTiers
        currentTiers.push(...nextTiers)
      }

      prevTiers = currentTiers
      tier += 1
    }

    return firstTier
  }
}

/** @param {typeof defaultOptions} options */
exports.generateProceduralClasses = function (options) {
  return new ProceduralClassesContext(options).generate()
}

exports.cloneTurretsArray = function (TURRETS) {
  const output = JSON.parse(JSON.stringify(TURRETS))

  for (let i = 0; i < TURRETS.length; ++i) {
    output[i].TYPE = TURRETS[i].TYPE
  }

  return output
}
