/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Person, Community, Generation } from '../types';

export class GenerationSystem {
  /**
   * Tracks discipleship maturation and lineage.
   * Section 41 & 42: Real lineage without same person G1->G2->G3 mutation.
   */
  public static trainDisciple(
    mentor: Person,
    disciple: Person
  ): { nextGen: Generation; success: boolean } {
    disciple.trainedById = mentor.id;
    disciple.parentLeaderId = mentor.id;

    // Inherit next generation: G0 mentor -> G1, G1 mentor -> G2, G2 mentor -> G3
    let nextGen: Generation = 1;
    if (mentor.generation === 1) nextGen = 2;
    else if (mentor.generation >= 2) nextGen = 3;

    disciple.generation = nextGen;
    disciple.isMatureDisciple = true;
    disciple.autonomy = Math.max(disciple.autonomy, 75);
    disciple.readiness = Math.max(disciple.readiness, 85);

    return { nextGen, success: true };
  }

  /**
   * Calculates Care Capacity impact on SEND (Section 44)
   */
  public static calculateSendImpact(
    sourceCommunity: Community,
    leader: Person,
    allPeople: Person[]
  ): {
    currentCapacity: number;
    projectedCapacity: number;
    remainingPopulation: number;
    willCreateCareGap: boolean;
  } {
    const commMembers = allPeople.filter(p => p.communityId === sourceCommunity.id && !p.isExternal);
    const currentCapacity = sourceCommunity.stats.careCapacity;
    const remainingPopulation = Math.max(0, commMembers.length - 1);

    const lostCapacity = leader.calling === 'SHEPHERD' ? 4 : (leader.generation >= 1 ? 1 : 0);
    const projectedCapacity = Math.max(0, currentCapacity - lostCapacity);
    const willCreateCareGap = remainingPopulation > projectedCapacity;

    return {
      currentCapacity,
      projectedCapacity,
      remainingPopulation,
      willCreateCareGap,
    };
  }

  /**
   * Computes Transmission for new community (HK5-110)
   * 1. Inherited Dimensions (60% Source Community + 40% Sent Leader):
   *    - Formation, Integrity, Care Culture, Resilience
   * 2. Reformed by New Environment:
   *    - Mission, Unity, Clarity (shaped by fresh planting zeal and context)
   */
  public static computeTransmission(
    sourceCommunity: Community,
    leader: Person
  ): Partial<Community['stats']> {
    const s = sourceCommunity.stats;

    // 1. Four Core Inherited Dimensions (strictly 60/40)
    const inheritedFormation = Math.round(s.formation * 0.6 + leader.depth * 0.4);
    const leaderIntegrity = leader.depth > 70 ? 85 : 65;
    const inheritedIntegrity = Math.round(s.integrity * 0.6 + leaderIntegrity * 0.4);
    const inheritedCare = Math.round(s.care * 0.6 + leader.stability * 0.4);
    const inheritedResilience = Math.round(s.resilience * 0.6 + leader.trust * 0.4);

    // 2. Reformed by New Environment & Fresh Planting Zeal
    const freshMissionZeal = leader.calling === 'EVANGELIST' ? 80 : 65;
    const freshUnity = 70;
    const freshClarity = 65;

    return {
      formation: inheritedFormation,
      integrity: inheritedIntegrity,
      care: inheritedCare,
      resilience: inheritedResilience,
      mission: freshMissionZeal,
      unity: freshUnity,
      clarity: freshClarity,
    };
  }
}
