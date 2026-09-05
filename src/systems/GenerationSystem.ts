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
   * Computes Transmission for new community (Section 45)
   * New Community State = Source Community 60% + Sent Leader 40%
   */
  public static computeTransmission(
    sourceCommunity: Community,
    leader: Person
  ): Partial<Community['stats']> {
    const s = sourceCommunity.stats;

    const leaderFormationFactor = leader.depth;
    const leaderCareFactor = leader.stability;
    const leaderResilienceFactor = leader.trust;

    return {
      formation: Math.round(s.formation * 0.6 + leaderFormationFactor * 0.4),
      care: Math.round(s.care * 0.6 + leaderCareFactor * 0.4),
      resilience: Math.round(s.resilience * 0.6 + leaderResilienceFactor * 0.4),
      clarity: Math.round(s.clarity * 0.7 + 20),
      unity: Math.round(s.unity * 0.6 + 30),
      mission: Math.round(s.mission * 0.6 + 30),
      integrity: Math.round(s.integrity * 0.7 + (leader.depth > 70 ? 25 : 15)),
    };
  }
}
