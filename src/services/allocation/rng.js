/**
 * Pure Deterministic Pseudo-Random Number Generator (PRNG) & Utilities
 * 
 * DESIGN PRINCIPLES:
 * 1. PURE FUNCTIONS: Zero dependencies, zero external state.
 * 2. DETERMINISM: Given the identical seed, createRng produces the exact same numeric sequence.
 * 3. IMMUTABILITY: shuffle returns a new array and does not mutate the source array.
 */

/**
 * Hashes a string or numeric seed into a 32-bit unsigned integer.
 * Uses Jenkins / 32-bit FNV-1a variant.
 * 
 * @param {string|number} seed 
 * @returns {number} 32-bit integer
 */
export function hashSeed(seed) {
  if (typeof seed === "number" && Number.isFinite(seed)) {
    return (seed | 0) >>> 0;
  }
  const str = String(seed || "");
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Creates a deterministic Mulberry32 PRNG generator.
 * Returns a function that produces floating point values in [0, 1).
 * 
 * @param {string|number} seed 
 * @returns {() => number}
 */
export function createRng(seed) {
  let s = hashSeed(seed);
  return function next() {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Shuffles an array deterministically using Fisher-Yates and the provided PRNG.
 * Returns a new array; the original array is left untouched.
 * 
 * @template T
 * @param {Array<T>} array 
 * @param {() => number} rng 
 * @returns {Array<T>}
 */
export function shuffle(array, rng) {
  if (!Array.isArray(array)) return [];
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}
