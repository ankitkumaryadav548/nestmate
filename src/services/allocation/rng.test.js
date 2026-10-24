import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createRng, shuffle, hashSeed } from "./rng.js";

describe("Allocation PRNG & Shuffling Module", () => {
  test("1. hashSeed produces 32-bit unsigned integers", () => {
    assert.equal(hashSeed(42), 42);
    assert.equal(typeof hashSeed("test-seed"), "number");
    assert.equal(hashSeed("test-seed") >= 0, true);
    assert.equal(hashSeed("test-seed"), hashSeed("test-seed"));
  });

  test("2. createRng produces deterministic pseudo-random sequence", () => {
    const rng1 = createRng(12345);
    const seq1 = [rng1(), rng1(), rng1(), rng1()];

    const rng2 = createRng(12345);
    const seq2 = [rng2(), rng2(), rng2(), rng2()];

    assert.deepEqual(seq1, seq2);

    // Different seed produces different sequence
    const rng3 = createRng(99999);
    const seq3 = [rng3(), rng3(), rng3(), rng3()];
    assert.notDeepEqual(seq1, seq3);
  });

  test("3. shuffle produces a new array and does not mutate source", () => {
    const original = [1, 2, 3, 4, 5, 6, 7, 8];
    const originalCopy = [...original];
    const rng = createRng(42);

    const shuffled = shuffle(original, rng);

    // Not the same reference
    assert.notEqual(shuffled, original);
    // Original unchanged
    assert.deepEqual(original, originalCopy);
    // Elements preserved
    assert.equal(shuffled.length, original.length);
    assert.deepEqual([...shuffled].sort(), [...original].sort());
  });

  test("4. shuffle is strictly deterministic with the same seed", () => {
    const items = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot"];

    const shuffled1 = shuffle(items, createRng(777));
    const shuffled2 = shuffle(items, createRng(777));
    const shuffledDiff = shuffle(items, createRng(888));

    assert.deepEqual(shuffled1, shuffled2);
    assert.notDeepEqual(shuffled1, shuffledDiff);
  });
});
