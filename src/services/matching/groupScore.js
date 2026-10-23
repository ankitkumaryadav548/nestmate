/**
 * Pure Group Compatibility Scoring Module
 * 
 * DESIGN PRINCIPLES:
 * 1. PURE FUNCTIONS: Zero external database dependencies, no Mongoose, no path-aliases.
 *    Easy to unit test, deterministic, and explainable in viva.
 * 2. SYMMETRIC & ORDER INDEPENDENT: Evaluating a group yields the same metric regardless
 *    of internal member array ordering.
 * 3. FAIRNESS: Relies solely on lifestyle compatibility computed by the pure scoreEngine.
 */

import { calculateCompatibility } from "./scoreEngine.js";
import { MIN_PAIR_SCORE } from "../../config/groups.js";

/**
 * Calculates aggregate compatibility scores for a roommate group.
 * Evaluates all unique pairwise combinations among members.
 * 
 * @param {Array<object>} members - Array of student objects with { preferences, year, ... }
 * @param {object} [weights] - Optional custom weights
 * @param {object} [options] - Additional engine options (e.g. yearBonus)
 * @returns {{
 *   average: number,
 *   lowest: number,
 *   lowestPair: [number, number] | null,
 *   pairs: Array<{ a: number, b: number, score: number, excluded: boolean }>,
 *   hasExcludedPair: boolean
 * }}
 */
export function calculateGroupScore(members = [], weights, options = {}) {
  if (!Array.isArray(members) || members.length < 2) {
    return {
      average: 100,
      lowest: 100,
      lowestPair: null,
      pairs: [],
      hasExcludedPair: false,
    };
  }

  const pairs = [];
  let hasExcludedPair = false;
  let lowestScore = 101;
  let lowestPairIndices = null;
  let totalScore = 0;

  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const res = calculateCompatibility(members[i], members[j], weights, options);

      if (res.excluded) {
        hasExcludedPair = true;
      }

      pairs.push({
        a: i,
        b: j,
        score: res.score,
        label: res.label,
        excluded: Boolean(res.excluded),
        violations: res.violations || [],
      });

      totalScore += res.score;
      if (res.score < lowestScore) {
        lowestScore = res.score;
        lowestPairIndices = [i, j];
      }
    }
  }

  const average = pairs.length > 0 ? Math.round(totalScore / pairs.length) : 100;
  const lowest = lowestScore === 101 ? 100 : lowestScore;

  return {
    average,
    lowest,
    lowestPair: lowestPairIndices,
    pairs,
    hasExcludedPair,
  };
}

/**
 * Evaluates whether a candidate student can join an existing group.
 * A candidate is allowed only if they have NO deal-breaker conflicts with any
 * current member and meet the minimum pairwise score requirement.
 * 
 * @param {object} candidate - Candidate student object
 * @param {Array<object>} currentMembers - Array of current group members
 * @param {object} [weights] - Optional category weights
 * @param {number} [minPairScore=MIN_PAIR_SCORE] - Minimum acceptable pairwise score
 * @returns {{
 *   allowed: boolean,
 *   perMemberScores: Array<{ memberIndex: number, score: number, excluded: boolean }>,
 *   average: number,
 *   lowest: number,
 *   blockedBy: Array<number>
 * }}
 */
export function canJoinGroup(
  candidate,
  currentMembers = [],
  weights,
  minPairScore = MIN_PAIR_SCORE
) {
  if (!candidate || !Array.isArray(currentMembers) || currentMembers.length === 0) {
    return {
      allowed: true,
      perMemberScores: [],
      average: 100,
      lowest: 100,
      blockedBy: [],
    };
  }

  const perMemberScores = [];
  const blockedBy = [];

  for (let idx = 0; idx < currentMembers.length; idx++) {
    const member = currentMembers[idx];
    const res = calculateCompatibility(candidate, member, weights);

    perMemberScores.push({
      memberIndex: idx,
      score: res.score,
      label: res.label,
      excluded: Boolean(res.excluded),
      violations: res.violations || [],
    });

    if (res.excluded || res.score < minPairScore) {
      blockedBy.push(idx);
    }
  }

  const allowed = blockedBy.length === 0;
  const simulatedGroup = calculateGroupScore([...currentMembers, candidate], weights);

  return {
    allowed,
    perMemberScores,
    average: simulatedGroup.average,
    lowest: simulatedGroup.lowest,
    blockedBy,
  };
}
