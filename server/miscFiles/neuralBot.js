'use strict';

const fs   = require('fs');
const path = require('path');

/**
 * neuralBot.js — Neural network + neuroevolution for Arras bot AI.
 *
 * Architecture: feedforward network with one hidden layer.
 *   INPUT_SIZE → HIDDEN_SIZE → OUTPUT_SIZE
 *
 * Training strategy: steady-state neuroevolution (no backprop).
 *   - Each bot is born with weights inherited from the hall of fame
 *     (best-fitness networks seen so far), mutated with Gaussian noise.
 *   - When a bot dies its fitness (score gained + survival bonus) is evaluated
 *     and potentially admitted to the hall of fame.
 *   - Over many bot lifetimes the population converges toward better behaviour.
 *
 * Observation vector (26 inputs):
 *  [0]    health ratio (0–1)
 *  [1]    shield ratio (0–1)
 *  [2-3]  own velocity x, y  (normalised by topSpeed)
 *  [4-5]  cos / sin of facing angle
 *  [6-7]  own x, y position  (normalised, centre-relative)
 *  [8-13] nearest enemy: dx, dy, health, danger, velX, velY
 *  [14-19] 2nd-nearest enemy (zeros if absent)
 *  [20-21] nearest food:   dx, dy
 *  [22-23] nearest incoming bullet/projectile: dx, dy
 *  [24]   visible-enemy count (clamped to [0,1])
 *  [25]   low-health flag (1 if health < 0.4)
 *
 * Action vector (5 outputs, tanh range −1…+1):
 *  [0-1]  aim direction  (x, y component — treated as unit vector)
 *  [2-3]  move direction (x, y component)
 *  [4]    fire  (fire when > 0)
 */

const INPUT_SIZE  = 26;
const HIDDEN_SIZE = 20;
const OUTPUT_SIZE = 5;

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

/** Standard normal sample via Box-Muller. */
function randn() {
    const u = 1 - Math.random(); // avoid log(0)
    const v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Xavier / He initialisation scale for a layer with `fanIn` inputs. */
function xavierScale(fanIn) {
    return Math.sqrt(2 / fanIn);
}

// ─────────────────────────────────────────────────────────────────────────────
// NeuralNetwork
// ─────────────────────────────────────────────────────────────────────────────

class NeuralNetwork {
    constructor() {
        // Layer 1 weights: [HIDDEN_SIZE][INPUT_SIZE]
        const s1 = xavierScale(INPUT_SIZE);
        this.w1 = [];
        this.b1 = new Float64Array(HIDDEN_SIZE);
        for (let j = 0; j < HIDDEN_SIZE; j++) {
            const row = new Float64Array(INPUT_SIZE);
            for (let k = 0; k < INPUT_SIZE; k++) row[k] = randn() * s1;
            this.w1.push(row);
        }

        // Layer 2 weights: [OUTPUT_SIZE][HIDDEN_SIZE]
        const s2 = xavierScale(HIDDEN_SIZE);
        this.w2 = [];
        this.b2 = new Float64Array(OUTPUT_SIZE);
        for (let j = 0; j < OUTPUT_SIZE; j++) {
            const row = new Float64Array(HIDDEN_SIZE);
            for (let k = 0; k < HIDDEN_SIZE; k++) row[k] = randn() * s2;
            this.w2.push(row);
        }
    }

    /**
     * Forward pass.
     * @param {number[]} input  Length-INPUT_SIZE array.
     * @returns {number[]}      Length-OUTPUT_SIZE array (tanh outputs).
     */
    forward(input) {
        // Hidden layer (tanh)
        const h = new Float64Array(HIDDEN_SIZE);
        for (let j = 0; j < HIDDEN_SIZE; j++) {
            let s = this.b1[j];
            const row = this.w1[j];
            for (let k = 0; k < INPUT_SIZE; k++) s += row[k] * input[k];
            h[j] = Math.tanh(s);
        }

        // Output layer (tanh)
        const out = new Array(OUTPUT_SIZE);
        for (let j = 0; j < OUTPUT_SIZE; j++) {
            let s = this.b2[j];
            const row = this.w2[j];
            for (let k = 0; k < HIDDEN_SIZE; k++) s += row[k] * h[k];
            out[j] = Math.tanh(s);
        }
        return out;
    }

    /**
     * Return a mutated copy of this network.
     * @param {number} rate   Probability of mutating each weight.
     * @param {number} sigma  Std dev of the Gaussian perturbation.
     */
    mutate(rate = 0.12, sigma = 0.25) {
        const child = new NeuralNetwork();
        // Copy then perturb
        for (let j = 0; j < HIDDEN_SIZE; j++) {
            for (let k = 0; k < INPUT_SIZE; k++) {
                child.w1[j][k] = this.w1[j][k] + (Math.random() < rate ? randn() * sigma : 0);
            }
            child.b1[j] = this.b1[j] + (Math.random() < rate ? randn() * sigma : 0);
        }
        for (let j = 0; j < OUTPUT_SIZE; j++) {
            for (let k = 0; k < HIDDEN_SIZE; k++) {
                child.w2[j][k] = this.w2[j][k] + (Math.random() < rate ? randn() * sigma : 0);
            }
            child.b2[j] = this.b2[j] + (Math.random() < rate ? randn() * sigma : 0);
        }
        return child;
    }

    /**
     * Uniform crossover: each weight comes from one of two parent networks.
     */
    static crossover(netA, netB) {
        const child = new NeuralNetwork();
        for (let j = 0; j < HIDDEN_SIZE; j++) {
            for (let k = 0; k < INPUT_SIZE; k++) {
                child.w1[j][k] = Math.random() < 0.5 ? netA.w1[j][k] : netB.w1[j][k];
            }
            child.b1[j] = Math.random() < 0.5 ? netA.b1[j] : netB.b1[j];
        }
        for (let j = 0; j < OUTPUT_SIZE; j++) {
            for (let k = 0; k < HIDDEN_SIZE; k++) {
                child.w2[j][k] = Math.random() < 0.5 ? netA.w2[j][k] : netB.w2[j][k];
            }
            child.b2[j] = Math.random() < 0.5 ? netA.b2[j] : netB.b2[j];
        }
        return child;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// NeuroevolutionManager
// ─────────────────────────────────────────────────────────────────────────────

class NeuroevolutionManager {
    /**
     * @param {object} opts
     * @param {number} opts.maxHallSize      Max hall-of-fame entries (default 12).
     * @param {number} opts.explorationRate  Fraction of bots born random (default 0.15).
     */
    constructor(opts = {}) {
        this.maxHallSize     = opts.maxHallSize     ?? 12;
        this.explorationRate = opts.explorationRate ?? 0.15;
        /** @type {Array<{network: NeuralNetwork, fitness: number, gen: number}>} */
        this.hallOfFame  = [];
        this.generation  = 0;
        this.totalSpawned  = 0;
        this.totalRecorded = 0;
        this.bestFitness   = 0;
    }

    /**
     * Produce a network for a newly spawned bot.
     * @returns {NeuralNetwork}
     */
    getNetwork() {
        this.totalSpawned++;
        if (this.hallOfFame.length < 2 || Math.random() < this.explorationRate) {
            return new NeuralNetwork(); // random exploration
        }
        if (Math.random() < 0.65 || this.hallOfFame.length < 2) {
            // Mutate a top-ranked parent
            return this._rankSelect().mutate();
        }
        // Crossover two parents then lightly mutate
        const childNet = NeuralNetwork.crossover(this._rankSelect(), this._rankSelect());
        return childNet.mutate(0.06, 0.15);
    }

    /**
     * Register a bot's fitness after it dies.
     * @param {NeuralNetwork} network
     * @param {number}        fitness
     */
    recordResult(network, fitness) {
        this.totalRecorded++;
        this.generation++;
        if (fitness <= 0) return;
        if (fitness > this.bestFitness) this.bestFitness = fitness;
        this.hallOfFame.push({ network, fitness, gen: this.generation });
        this.hallOfFame.sort((a, b) => b.fitness - a.fitness);
        if (this.hallOfFame.length > this.maxHallSize) {
            this.hallOfFame.length = this.maxHallSize;
        }
    }

    /**
     * Rank-based selection: rank 1 (best) is n× more likely than rank n.
     * @returns {NeuralNetwork}
     */
    _rankSelect() {
        const n = this.hallOfFame.length;
        const totalW = (n * (n + 1)) / 2;
        let r = Math.random() * totalW;
        for (let i = 0; i < n; i++) {
            r -= (n - i);
            if (r <= 0) return this.hallOfFame[i].network;
        }
        return this.hallOfFame[0].network;
    }

    /** Log-friendly stats snapshot. */
    getStats() {
        return {
            generation:  this.generation,
            hallSize:    this.hallOfFame.length,
            bestFitness: +this.bestFitness.toFixed(1),
            spawned:     this.totalSpawned,
        };
    }

    // ── Persistence ───────────────────────────────────────────────────────────

    /**
     * Serialise the hall-of-fame to a plain JSON object.
     * Weights are stored as nested plain arrays so JSON.stringify works cleanly.
     */
    _serialise() {
        return {
            version:       2,
            generation:    this.generation,
            totalSpawned:  this.totalSpawned,
            totalRecorded: this.totalRecorded,
            bestFitness:   this.bestFitness,
            hallOfFame: this.hallOfFame.map(entry => ({
                fitness: entry.fitness,
                gen:     entry.gen,
                network: {
                    w1: entry.network.w1.map(row => Array.from(row)),
                    b1: Array.from(entry.network.b1),
                    w2: entry.network.w2.map(row => Array.from(row)),
                    b2: Array.from(entry.network.b2),
                },
            })),
        };
    }

    /**
     * Restore a NeuralNetwork from a plain-object snapshot.
     */
    _deserialiseNetwork(snap) {
        const net = new NeuralNetwork();
        net.w1 = snap.w1.map(row => new Float64Array(row));
        net.b1 = new Float64Array(snap.b1);
        net.w2 = snap.w2.map(row => new Float64Array(row));
        net.b2 = new Float64Array(snap.b2);
        return net;
    }

    /**
     * Save the hall-of-fame to `savePath`.
     * Called automatically after every `saveInterval` recorded results.
     */
    save() {
        try {
            const dir = path.dirname(this.savePath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(this.savePath, JSON.stringify(this._serialise(), null, 2));
        } catch (err) {
            console.error('[neuralBot] Save failed:', err.message);
        }
    }

    /**
     * Load a previously saved hall-of-fame from `savePath`.
     * Silently does nothing if the file does not exist yet.
     */
    load() {
        if (!fs.existsSync(this.savePath)) return;
        try {
            const raw  = fs.readFileSync(this.savePath, 'utf8');
            const data = JSON.parse(raw);
            if (data.version !== 2) {
                console.log('[neuralBot] Save file version mismatch — starting fresh.');
                return;
            }
            this.generation    = data.generation    ?? 0;
            this.totalSpawned  = data.totalSpawned  ?? 0;
            this.totalRecorded = data.totalRecorded ?? 0;
            this.bestFitness   = data.bestFitness   ?? 0;
            this.hallOfFame    = (data.hallOfFame ?? []).map(entry => ({
                fitness: entry.fitness,
                gen:     entry.gen,
                network: this._deserialiseNetwork(entry.network),
            }));
            console.log(`[neuralBot] Loaded ${this.hallOfFame.length} networks from ${this.savePath} (gen ${this.generation}, best fitness ${this.bestFitness.toFixed(1)})`);
        } catch (err) {
            console.error('[neuralBot] Load failed:', err.message);
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton — shared across all neural bots in the process
// ─────────────────────────────────────────────────────────────────────────────

const SAVE_PATH     = path.join(__dirname, '../../data/neuralBotSave.json');
const SAVE_INTERVAL = 10; // save every N recorded results

const neuroManager = new NeuroevolutionManager();
neuroManager.savePath = SAVE_PATH;

// Patch recordResult to auto-save periodically
const _origRecord = neuroManager.recordResult.bind(neuroManager);
neuroManager.recordResult = function(network, fitness) {
    _origRecord(network, fitness);
    if (this.totalRecorded % SAVE_INTERVAL === 0) {
        this.save();
    }
};

// Load any previously saved progress before the first bot spawns
neuroManager.load();

module.exports = { NeuralNetwork, NeuroevolutionManager, neuroManager, INPUT_SIZE, HIDDEN_SIZE, OUTPUT_SIZE };
