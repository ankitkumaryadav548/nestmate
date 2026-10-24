/**
 * Pure Pool Clustering & Roommate Group Formation Engine
 * 
 * ALGORITHM OVERVIEW:
 * 1. Fill forming groups: Open seats in incomplete groups are filled with compatible solo students.
 * 2. Handle incomplete groups: Incomplete groups either shrink to their current size (if >= 2 members)
 *    or dissolve / waitlist based on policy.
 * 3. Cluster solo pool: Unplaced students are clustered by lifestyle compatibility using a
 *    most-constrained seed heuristic, descending by room size (4 -> 3 -> 2), followed by a greedy
 *    leftover pairing pass.
 * 4. Improve by swaps: Iterative 2-opt member swapping across groups of the same size and gender
 *    that strictly increases total compatibility without ever introducing deal-breakers.
 */

import { MIN_PAIR_SCORE } from "../../config/groups.js";

/**
 * Computes pairwise metrics for a list of members using the injected score function.
 * 
 * @param {Array<object>} members 
 * @param {(a: object, b: object) => { score: number, excluded: boolean }} scoreFn 
 * @returns {{ average: number, lowest: number, hasExcluded: boolean }}
 */
function evaluateMemberList(members, scoreFn) {
  if (members.length < 2) {
    return { average: 100, lowest: 100, hasExcluded: false };
  }

  let totalScore = 0;
  let lowest = 101;
  let count = 0;
  let hasExcluded = false;

  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const res = scoreFn(members[i], members[j]);
      if (res.excluded) {
        hasExcluded = true;
      }
      totalScore += res.score;
      if (res.score < lowest) {
        lowest = res.score;
      }
      count++;
    }
  }

  const average = count > 0 ? Math.round(totalScore / count) : 100;
  return { average, lowest: lowest === 101 ? 100 : lowest, hasExcluded };
}

/**
 * Checks if a candidate student is compatible with all current group members.
 * 
 * @param {object} candidate 
 * @param {Array<object>} currentMembers 
 * @param {(a: object, b: object) => { score: number, excluded: boolean }} scoreFn 
 * @param {number} minPairScore 
 * @returns {{ compatible: boolean, avgScore: number, lowestScore: number }}
 */
function checkCandidateWithMembers(candidate, currentMembers, scoreFn, minPairScore) {
  if (currentMembers.length === 0) {
    return { compatible: true, avgScore: 100, lowestScore: 100 };
  }

  let sum = 0;
  let lowest = 101;

  for (const m of currentMembers) {
    const res = scoreFn(candidate, m);
    if (res.excluded || res.score < minPairScore) {
      return { compatible: false, avgScore: 0, lowestScore: 0 };
    }
    sum += res.score;
    if (res.score < lowest) {
      lowest = res.score;
    }
  }

  return {
    compatible: true,
    avgScore: sum / currentMembers.length,
    lowestScore: lowest,
  };
}

/**
 * Fills open seats of forming groups with compatible solo students.
 * 
 * Groups with more members are filled first; ties broken by earlier creation.
 * 
 * @param {Array<object>} formingGroups 
 * @param {Array<object>} poolStudents 
 * @param {object} weights 
 * @param {(a: object, b: object) => { score: number, excluded: boolean }} scoreFn 
 * @param {object} options 
 * @returns {{
 *   filledUnits: Array<object>,
 *   partialGroups: Array<object>,
 *   usedStudentIds: Set<string>
 * }}
 */
export function fillFormingGroups(formingGroups = [], poolStudents = [], weights, scoreFn, options = {}) {
  const minPairScore = options.minPairScore || MIN_PAIR_SCORE;
  const usedStudentIds = new Set();
  const filledUnits = [];
  const partialGroups = [];

  // Sort forming groups: more members first, then older creation
  const sortedGroups = [...formingGroups].sort((a, b) => {
    if (b.members.length !== a.members.length) {
      return b.members.length - a.members.length;
    }
    const aTime = a.createdAtMs || 0;
    const bTime = b.createdAtMs || 0;
    if (aTime !== bTime) return aTime - bTime;
    return String(a.id || "").localeCompare(String(b.id || ""));
  });

  for (const group of sortedGroups) {
    const targetSize = group.targetSize || 2;
    const currentMembers = [...group.members];
    const groupGender = currentMembers[0]?.gender || group.gender;

    // Fill seats one by one
    while (currentMembers.length < targetSize) {
      // Find candidate pool students of identical gender
      const candidates = poolStudents.filter((s) => {
        if (usedStudentIds.has(s.id)) return false;
        if (s.gender !== groupGender) return false;
        return true;
      });

      let bestCandidate = null;
      let bestAvg = -1;
      let bestLowest = -1;

      for (const candidate of candidates) {
        const check = checkCandidateWithMembers(candidate, currentMembers, scoreFn, minPairScore);
        if (!check.compatible) continue;

        // Simulate new group average with candidate included
        const simulated = evaluateMemberList([...currentMembers, candidate], scoreFn);
        if (
          simulated.average > bestAvg ||
          (simulated.average === bestAvg && simulated.lowest > bestLowest) ||
          (simulated.average === bestAvg && simulated.lowest === bestLowest && (!bestCandidate || candidate.id.localeCompare(bestCandidate.id) < 0))
        ) {
          bestCandidate = candidate;
          bestAvg = simulated.average;
          bestLowest = simulated.lowest;
        }
      }

      if (bestCandidate) {
        currentMembers.push(bestCandidate);
        usedStudentIds.add(bestCandidate.id);
      } else {
        // No further compatible candidates available
        break;
      }
    }

    if (currentMembers.length === targetSize) {
      const stats = evaluateMemberList(currentMembers, scoreFn);
      filledUnits.push({
        unitId: `filled_${group.id}`,
        kind: "filled-group",
        sourceGroupId: group.id,
        members: currentMembers,
        size: targetSize,
        roomPreferences: group.roomPreferences || {},
        completedAtMs: group.completedAtMs || Date.now(),
        groupAverage: stats.average,
        groupLowest: stats.lowest,
      });
    } else {
      partialGroups.push({
        ...group,
        members: currentMembers,
      });
    }
  }

  return { filledUnits, partialGroups, usedStudentIds };
}

/**
 * Handles incomplete forming groups based on administrative policy ("shrink" vs "waitlist").
 * 
 * @param {Array<object>} partialGroups 
 * @param {"shrink"|"waitlist"} policy 
 * @param {(a: object, b: object) => { score: number, excluded: boolean }} [scoreFn]
 * @returns {{
 *   shrunkUnits: Array<object>,
 *   dissolvedStudents: Array<object>,
 *   waitlistedGroups: Array<{ unitId: string, reason: string, unit: object }>
 * }}
 */
export function handleIncompleteGroups(partialGroups = [], policy = "shrink", scoreFn) {
  const shrunkUnits = [];
  const dissolvedStudents = [];
  const waitlistedGroups = [];

  for (const group of partialGroups) {
    if (policy === "waitlist") {
      waitlistedGroups.push({
        unitId: `group_${group.id}`,
        reason: "incomplete_group_waitlisted",
        unit: {
          unitId: `group_${group.id}`,
          kind: "group",
          sourceGroupId: group.id,
          members: group.members,
          size: group.targetSize || group.members.length,
          roomPreferences: group.roomPreferences || {},
          completedAtMs: group.completedAtMs || null,
          groupAverage: group.averageScore || 0,
          groupLowest: group.lowestPairScore || 0,
        },
      });
    } else {
      // Policy "shrink": Groups with >= 2 members become smaller units of their current size
      if (group.members.length >= 2) {
        const stats = scoreFn ? evaluateMemberList(group.members, scoreFn) : { average: group.averageScore || 80, lowest: group.lowestPairScore || 70 };
        shrunkUnits.push({
          unitId: `shrunk_${group.id}`,
          kind: "shrunk-group",
          sourceGroupId: group.id,
          members: group.members,
          size: group.members.length,
          roomPreferences: group.roomPreferences || {},
          completedAtMs: group.completedAtMs || null,
          groupAverage: stats.average,
          groupLowest: stats.lowest,
        });
      } else if (group.members.length === 1) {
        // Groups with 1 member dissolve back into the solo pool
        dissolvedStudents.push(group.members[0]);
      }
    }
  }

  return { shrunkUnits, dissolvedStudents, waitlistedGroups };
}

/**
 * Clusters solo students into compatible roommate groups by lifestyle compatibility.
 * 
 * Algorithm:
 * 1. For each gender, process preferred room sizes in descending order (4, then 3, then 2).
 * 2. Pick the MOST CONSTRAINED unplaced student as seed (fewest non-excluded partners).
 * 3. Greedily add compatible partners until target room size is reached.
 * 4. Pair up leftovers of the same gender greedily by best score.
 * 5. Report isolated students with no compatible partner as unallocated.
 * 
 * @param {Array<object>} students 
 * @param {object} weights 
 * @param {(a: object, b: object) => { score: number, excluded: boolean }} scoreFn 
 * @param {object} options - { defaultRoomSize, minPairScore }
 * @returns {{
 *   groups: Array<{ members: Array<object>, size: number, average: number, lowest: number, shrunk: boolean }>,
 *   unallocated: Array<{ student: object, reason: string }>
 * }}
 */
export function clusterPool(students = [], weights, scoreFn, options = {}) {
  const minPairScore = options.minPairScore || MIN_PAIR_SCORE;
  const defaultRoomSize = options.defaultRoomSize || 2;
  const groups = [];
  const unallocated = [];

  // Partition students by gender
  const byGender = { male: [], female: [], other: [] };
  for (const s of students) {
    const g = s.gender || "other";
    if (byGender[g]) byGender[g].push(s);
    else byGender.other.push(s);
  }

  for (const [gender, genderStudents] of Object.entries(byGender)) {
    if (genderStudents.length === 0) continue;

    const unplaced = new Map();
    for (const s of genderStudents) {
      unplaced.set(s.id, s);
    }

    // Helper: count non-excluded partners for a student among unplaced
    const countCompatiblePartners = (student) => {
      let count = 0;
      for (const other of unplaced.values()) {
        if (other.id === student.id) continue;
        const res = scoreFn(student, other);
        if (!res.excluded && res.score >= minPairScore) {
          count++;
        }
      }
      return count;
    };

    // Process sizes 4, 3, 2
    const targetSizes = [4, 3, 2];

    for (const size of targetSizes) {
      while (true) {
        // Find unplaced students that desire this room size
        const candidatesForSize = Array.from(unplaced.values()).filter((s) => {
          const prefSize = s.preferredRoomSize || defaultRoomSize;
          return prefSize === size;
        });

        if (candidatesForSize.length === 0) break;

        // Seed: student with fewest non-excluded partners (most constrained)
        candidatesForSize.sort((a, b) => {
          const degA = countCompatiblePartners(a);
          const degB = countCompatiblePartners(b);
          if (degA !== degB) return degA - degB;
          return a.id.localeCompare(b.id);
        });

        const seed = candidatesForSize[0];
        const groupMembers = [seed];
        unplaced.delete(seed.id);

        // Add members up to target size
        while (groupMembers.length < size) {
          // Look among remaining unplaced students of this gender
          const available = Array.from(unplaced.values());
          if (available.length === 0) break;

          let bestNext = null;
          let bestAvg = -1;
          let bestLowest = -1;

          for (const cand of available) {
            const check = checkCandidateWithMembers(cand, groupMembers, scoreFn, minPairScore);
            if (!check.compatible) continue;

            const simulated = evaluateMemberList([...groupMembers, cand], scoreFn);
            if (
              simulated.average > bestAvg ||
              (simulated.average === bestAvg && simulated.lowest > bestLowest) ||
              (simulated.average === bestAvg && simulated.lowest === bestLowest && (!bestNext || cand.id.localeCompare(bestNext.id) < 0))
            ) {
              bestNext = cand;
              bestAvg = simulated.average;
              bestLowest = simulated.lowest;
            }
          }

          if (bestNext) {
            groupMembers.push(bestNext);
            unplaced.delete(bestNext.id);
          } else {
            break;
          }
        }

        if (groupMembers.length >= 2) {
          const stats = evaluateMemberList(groupMembers, scoreFn);
          groups.push({
            members: groupMembers,
            size: groupMembers.length,
            average: stats.average,
            lowest: stats.lowest,
            shrunk: groupMembers.length < size,
          });
        } else {
          // Could not find any partner for seed; keep as leftover in unplaced for the pairing pass
          unplaced.set(seed.id, seed);
          break; // Move to next size
        }
      }
    }

    // Leftover pairing pass: pair up any remaining unplaced students of this gender
    const leftovers = Array.from(unplaced.values());
    const leftoverPlaced = new Set();

    while (true) {
      const remainingLeftovers = leftovers.filter((s) => !leftoverPlaced.has(s.id));
      if (remainingLeftovers.length < 2) break;

      let bestPair = null;
      let highestScore = -1;

      for (let i = 0; i < remainingLeftovers.length; i++) {
        for (let j = i + 1; j < remainingLeftovers.length; j++) {
          const a = remainingLeftovers[i];
          const b = remainingLeftovers[j];
          const res = scoreFn(a, b);
          if (!res.excluded && res.score >= minPairScore && res.score > highestScore) {
            highestScore = res.score;
            bestPair = [a, b];
          }
        }
      }

      if (bestPair) {
        const [a, b] = bestPair;
        leftoverPlaced.add(a.id);
        leftoverPlaced.add(b.id);
        groups.push({
          members: [a, b],
          size: 2,
          average: highestScore,
          lowest: highestScore,
          shrunk: false,
        });
      } else {
        break; // No further compatible pairs exist
      }
    }

    // Any student who could not be paired is unallocated
    for (const s of leftovers) {
      if (!leftoverPlaced.has(s.id)) {
        unallocated.push({
          student: s,
          reason: "no_compatible_partner",
        });
      }
    }
  }

  return { groups, unallocated };
}

/**
 * Optimizes roommate group compatibility via iterative 2-opt member swapping.
 * 
 * Rules:
 * - Only swaps between groups of the SAME gender and SAME size.
 * - Swap is accepted ONLY IF:
 *   1. Neither group gains an excluded (deal-breaker) pair.
 *   2. Neither group drops below minPairScore.
 *   3. The SUM of the two groups' average scores strictly increases (or equal sum with higher lowest pair).
 * - Never makes the total system compatibility worse.
 * 
 * @param {Array<object>} groups 
 * @param {object} weights 
 * @param {(a: object, b: object) => { score: number, excluded: boolean }} scoreFn 
 * @param {number} [maxPasses=3] 
 * @returns {Array<object>} Optimized groups
 */
export function improveBySwaps(groups = [], weights, scoreFn, maxPasses = 3) {
  const resultGroups = groups.map((g) => ({
    ...g,
    members: [...g.members],
  }));

  const minPairScore = MIN_PAIR_SCORE;

  for (let pass = 0; pass < maxPasses; pass++) {
    let swapCount = 0;

    for (let i = 0; i < resultGroups.length; i++) {
      for (let j = i + 1; j < resultGroups.length; j++) {
        const g1 = resultGroups[i];
        const g2 = resultGroups[j];

        // Same gender and same size only
        const gender1 = g1.members[0]?.gender;
        const gender2 = g2.members[0]?.gender;
        if (gender1 !== gender2 || g1.members.length !== g2.members.length) {
          continue;
        }

        const currentSumAvg = g1.average + g2.average;
        const currentMinLowest = Math.min(g1.lowest, g2.lowest);

        let bestSwap = null;
        let bestImprovement = 0;

        // Try swapping each member from g1 with each member from g2
        for (let m1Idx = 0; m1Idx < g1.members.length; m1Idx++) {
          for (let m2Idx = 0; m2Idx < g2.members.length; m2Idx++) {
            const newM1 = [...g1.members];
            const newM2 = [...g2.members];

            // Swap
            newM1[m1Idx] = g2.members[m2Idx];
            newM2[m2Idx] = g1.members[m1Idx];

            const stats1 = evaluateMemberList(newM1, scoreFn);
            if (stats1.hasExcluded || stats1.lowest < minPairScore) continue;

            const stats2 = evaluateMemberList(newM2, scoreFn);
            if (stats2.hasExcluded || stats2.lowest < minPairScore) continue;

            const newSumAvg = stats1.average + stats2.average;
            const newMinLowest = Math.min(stats1.lowest, stats2.lowest);

            const isStrictAvgImprovement = newSumAvg > currentSumAvg;
            const isLowestPairImprovement = newSumAvg === currentSumAvg && newMinLowest > currentMinLowest;

            if (isStrictAvgImprovement || isLowestPairImprovement) {
              const improvement = newSumAvg - currentSumAvg + (newMinLowest - currentMinLowest) * 0.01;
              if (improvement > bestImprovement) {
                bestImprovement = improvement;
                bestSwap = {
                  m1Idx,
                  m2Idx,
                  newM1,
                  newM2,
                  stats1,
                  stats2,
                };
              }
            }
          }
        }

        if (bestSwap) {
          g1.members = bestSwap.newM1;
          g1.average = bestSwap.stats1.average;
          g1.lowest = bestSwap.stats1.lowest;

          g2.members = bestSwap.newM2;
          g2.average = bestSwap.stats2.average;
          g2.lowest = bestSwap.stats2.lowest;

          swapCount++;
        }
      }
    }

    if (swapCount === 0) {
      break; // Converged
    }
  }

  return resultGroups;
}
