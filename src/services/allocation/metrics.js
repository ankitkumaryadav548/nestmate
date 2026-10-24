/**
 * Allocation Evaluation Metrics & Random Baseline Module
 * 
 * DESIGN PRINCIPLES:
 * 1. PURE FUNCTIONS: Zero database dependencies, no path aliases.
 * 2. SCIENTIFIC COMPARISON: Evaluates allocated rooms against a Monte Carlo random baseline
 *    using the identical student population and room capacities.
 * 3. TRANSPARENCY: Excluded pairs (deal-breaker violations) count as score 0 and are explicitly tracked.
 */

import { createRng, shuffle } from "./rng.js";

const GOOD_THRESHOLD = 70;

/**
 * Evaluates compatibility metrics across a list of allocated rooms.
 * 
 * @param {Array<Array<object>>} roomMembersList - Array of student arrays per room
 * @param {(a: object, b: object) => { score: number, excluded: boolean }} scoreFn 
 * @returns {{
 *   rooms: number,
 *   studentsCount: number,
 *   avgPairScore: number,
 *   lowestPairScore: number,
 *   pairsTotal: number,
 *   pairsExcluded: number,
 *   roomsWithConflict: number,
 *   goodOrAbovePercent: number
 * }}
 */
export function evaluateRooms(roomMembersList = [], scoreFn) {
  let studentsCount = 0;
  let pairsTotal = 0;
  let pairsExcluded = 0;
  let roomsWithConflict = 0;
  let totalScore = 0;
  let lowestPairScore = 100;
  let goodOrAboveCount = 0;

  let validRoomsCount = 0;

  for (const members of roomMembersList) {
    if (!Array.isArray(members) || members.length === 0) continue;
    validRoomsCount++;
    studentsCount += members.length;

    if (members.length < 2) continue;

    let roomHasConflict = false;

    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        pairsTotal++;
        const res = scoreFn(members[i], members[j]);

        if (res.excluded) {
          pairsExcluded++;
          roomHasConflict = true;
          lowestPairScore = 0;
          // Excluded pair counts as score 0 in totalScore
        } else {
          totalScore += res.score;
          if (res.score < lowestPairScore) {
            lowestPairScore = res.score;
          }
          if (res.score >= GOOD_THRESHOLD) {
            goodOrAboveCount++;
          }
        }
      }
    }

    if (roomHasConflict) {
      roomsWithConflict++;
    }
  }

  const avgPairScore = pairsTotal > 0 ? Math.round(totalScore / pairsTotal) : 100;
  const goodOrAbovePercent = pairsTotal > 0 ? Math.round((goodOrAboveCount / pairsTotal) * 100) : 100;

  return {
    rooms: validRoomsCount,
    studentsCount,
    avgPairScore,
    lowestPairScore: pairsTotal > 0 ? lowestPairScore : 100,
    pairsTotal,
    pairsExcluded,
    roomsWithConflict,
    goodOrAbovePercent,
  };
}

/**
 * Builds a Monte Carlo random assignment baseline to prove HostelMatch algorithm benefits.
 * 
 * Takes the exact same students successfully assigned to rooms, partitioned by gender,
 * and deals them randomly into the identical room capacities. Runs 'trials' times and returns
 * the average, best, and worst outcomes.
 * 
 * @param {Record<string, Array<object>>} assignedStudentsByGender - { male: [...], female: [...], other: [...] }
 * @param {Record<string, Array<number>>} roomCapacitiesByGender - { male: [2, 2, 4, ...], female: [3, 3, ...], other: [...] }
 * @param {(a: object, b: object) => { score: number, excluded: boolean }} scoreFn 
 * @param {string|number} seed 
 * @param {number} [trials=20] 
 * @returns {{
 *   trials: number,
 *   avg: {
 *     avgPairScore: number,
 *     lowestPairScore: number,
 *     pairsTotal: number,
 *     pairsExcluded: number,
 *     roomsWithConflict: number,
 *     goodOrAbovePercent: number
 *   },
 *   bestTrial: object,
 *   worstTrial: object
 * }}
 */
export function buildRandomBaseline(
  assignedStudentsByGender = {},
  roomCapacitiesByGender = {},
  scoreFn,
  seed,
  trials = 20
) {
  const trialResults = [];

  for (let t = 1; t <= trials; t++) {
    const trialRng = createRng(`${seed}_baseline_trial_${t}`);
    const trialRoomsList = [];

    // For each gender, shuffle students and deal into room capacities
    for (const [gender, students] of Object.entries(assignedStudentsByGender)) {
      if (!Array.isArray(students) || students.length === 0) continue;
      const capacities = roomCapacitiesByGender[gender] || [];
      const shuffled = shuffle(students, trialRng);

      let studentIdx = 0;
      for (const cap of capacities) {
        if (studentIdx >= shuffled.length) break;
        const roomMembers = shuffled.slice(studentIdx, studentIdx + cap);
        studentIdx += cap;
        trialRoomsList.push(roomMembers);
      }
    }

    const metrics = evaluateRooms(trialRoomsList, scoreFn);
    trialResults.push(metrics);
  }

  if (trialResults.length === 0) {
    return {
      trials: 0,
      avg: {
        avgPairScore: 0,
        lowestPairScore: 0,
        pairsTotal: 0,
        pairsExcluded: 0,
        roomsWithConflict: 0,
        goodOrAbovePercent: 0,
      },
      bestTrial: null,
      worstTrial: null,
    };
  }

  // Aggregate averages across trials
  const sumAvg = trialResults.reduce((acc, r) => acc + r.avgPairScore, 0);
  const sumLowest = trialResults.reduce((acc, r) => acc + r.lowestPairScore, 0);
  const sumPairs = trialResults.reduce((acc, r) => acc + r.pairsTotal, 0);
  const sumExcluded = trialResults.reduce((acc, r) => acc + r.pairsExcluded, 0);
  const sumConflicts = trialResults.reduce((acc, r) => acc + r.roomsWithConflict, 0);
  const sumGood = trialResults.reduce((acc, r) => acc + r.goodOrAbovePercent, 0);

  // Best trial (highest avgPairScore) and worst trial (lowest avgPairScore)
  const sorted = [...trialResults].sort((a, b) => b.avgPairScore - a.avgPairScore);

  return {
    trials: trialResults.length,
    avg: {
      avgPairScore: Math.round(sumAvg / trialResults.length),
      lowestPairScore: Math.round(sumLowest / trialResults.length),
      pairsTotal: Math.round(sumPairs / trialResults.length),
      pairsExcluded: Math.round((sumExcluded / trialResults.length) * 10) / 10,
      roomsWithConflict: Math.round((sumConflicts / trialResults.length) * 10) / 10,
      goodOrAbovePercent: Math.round(sumGood / trialResults.length),
    },
    bestTrial: sorted[0],
    worstTrial: sorted[sorted.length - 1],
  };
}

/**
 * Summarizes preference satisfaction percentages for placed units.
 * 
 * @param {Array<object>} assignments 
 * @param {Map<string, object>} unitsById 
 * @returns {{
 *   withHostelPrefs: number,
 *   rank1: { count: number, percent: number },
 *   rank2: { count: number, percent: number },
 *   rank3: { count: number, percent: number },
 *   other: { count: number, percent: number },
 *   acRequested: number,
 *   acSatisfied: { count: number, percent: number },
 *   floorRequested: number,
 *   floorSatisfied: { count: number, percent: number }
 * }}
 */
export function summarizePreferenceSatisfaction(assignments = [], unitsById = new Map()) {
  let withHostelPrefs = 0;
  let rank1Count = 0;
  let rank2Count = 0;
  let rank3Count = 0;
  let otherCount = 0;

  let acRequested = 0;
  let acSatisfiedCount = 0;

  let floorRequested = 0;
  let floorSatisfiedCount = 0;

  for (const a of assignments) {
    const unit = unitsById.get(a.unitId) || a.unit;
    const prefs = unit?.roomPreferences || {};

    const preferredHostels = Array.isArray(prefs.preferredHostels) ? prefs.preferredHostels : [];
    if (preferredHostels.length > 0) {
      withHostelPrefs++;
      if (a.hostelRank === 1) rank1Count++;
      else if (a.hostelRank === 2) rank2Count++;
      else if (a.hostelRank === 3) rank3Count++;
      else otherCount++;
    }

    if (prefs.acType === "ac" || prefs.acType === "non-ac") {
      acRequested++;
      if (a.acMatch === true) {
        acSatisfiedCount++;
      }
    }

    if (prefs.floorPreference && prefs.floorPreference !== "any") {
      floorRequested++;
      if (a.floorMatch === true) {
        floorSatisfiedCount++;
      }
    }
  }

  const calcPercent = (count, total) => (total > 0 ? Math.round((count / total) * 100) : 0);

  return {
    withHostelPrefs,
    rank1: { count: rank1Count, percent: calcPercent(rank1Count, withHostelPrefs) },
    rank2: { count: rank2Count, percent: calcPercent(rank2Count, withHostelPrefs) },
    rank3: { count: rank3Count, percent: calcPercent(rank3Count, withHostelPrefs) },
    other: { count: otherCount, percent: calcPercent(otherCount, withHostelPrefs) },
    acRequested,
    acSatisfied: { count: acSatisfiedCount, percent: calcPercent(acSatisfiedCount, acRequested) },
    floorRequested,
    floorSatisfied: { count: floorSatisfiedCount, percent: calcPercent(floorSatisfiedCount, floorRequested) },
  };
}
