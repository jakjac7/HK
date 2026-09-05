/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CallingType, Person, Community } from '../types';
import { getCallingLabel } from '../utils/faithTerms';

const ALL_CALLINGS: NonNullable<CallingType>[] = [
  'EVANGELIST',
  'SHEPHERD',
  'TEACHER',
  'INTERCESSOR',
  'WORSHIPPER',
];

export class CallingSystem {
  /**
   * Evaluates calling assignment using Soft RNG with protection against extreme shortages.
   * Section 3 & 4:
   * Base random = 80%
   * Missing role correction = 15%
   * Extreme shortage protection = 5%
   */
  public static discoverCalling(
    person: Person,
    community: Community,
    allCommunityPeople: Person[]
  ): NonNullable<CallingType> {
    // Count current distribution of callings in the community
    const counts: Record<NonNullable<CallingType>, number> = {
      EVANGELIST: 0,
      SHEPHERD: 0,
      TEACHER: 0,
      INTERCESSOR: 0,
      WORSHIPPER: 0,
    };

    allCommunityPeople.forEach(p => {
      if (p.calling) {
        counts[p.calling]++;
      }
    });

    // Weight computation per TASK HK4-030:
    // Base 70%, Deficit Weight 20%, Extreme Pity 10% in a unified weighted distribution
    const minCount = Math.min(...Object.values(counts));
    const maxCount = Math.max(...Object.values(counts));

    const weights: Record<NonNullable<CallingType>, number> = {
      EVANGELIST: 70,
      SHEPHERD: 70,
      TEACHER: 70,
      INTERCESSOR: 70,
      WORSHIPPER: 70,
    };

    ALL_CALLINGS.forEach(c => {
      // Deficit Weight: boost roles that have fewer members
      const deficit = maxCount - counts[c];
      weights[c] += deficit * 15;

      // Extreme Pity: if a role is completely absent in a growing community (>= 6 members)
      if (counts[c] === 0 && allCommunityPeople.length >= 6) {
        weights[c] += 25;
      }
    });

    // Special natural situational influences
    if (community.stats.uncaredCount > 0) {
      weights.SHEPHERD += 15;
    }
    if (community.drift?.type === 'DECEPTION') {
      weights.TEACHER += 15;
    }
    if (community.drift?.type === 'BURNOUT') {
      weights.INTERCESSOR += 15;
    }

    // Weighted random pick (Purity guaranteed - no hard overrides)
    const totalWeight = ALL_CALLINGS.reduce((acc, c) => acc + weights[c], 0);
    let rand = Math.random() * totalWeight;

    for (const c of ALL_CALLINGS) {
      if (rand < weights[c]) {
        return c;
      }
      rand -= weights[c];
    }

    return ALL_CALLINGS[Math.floor(Math.random() * ALL_CALLINGS.length)];
  }

  /**
   * Applies the newly discovered calling to a person
   */
  public static applyDiscoveredCalling(person: Person, calling: NonNullable<CallingType>): void {
    person.calling = calling;
    person.revealGlowTimer = 3.5; // 3.5 seconds of visual celebration aura
    person.autonomy = Math.max(person.autonomy, 70);
    person.readiness = Math.max(person.readiness, 75);

    if (calling === 'SHEPHERD') {
      person.careCapacity = 4;
      person.careTargets = [];
      person.careLoad = 0;
      person.stability = Math.max(person.stability, 80);
    } else if (calling === 'TEACHER') {
      person.depth = Math.max(person.depth, 85);
    } else if (calling === 'INTERCESSOR') {
      person.stability = Math.max(person.stability, 80);
      person.trust = Math.max(person.trust, 80);
    } else if (calling === 'EVANGELIST') {
      person.trust = Math.max(person.trust, 75);
    } else if (calling === 'WORSHIPPER') {
      person.trust = Math.max(person.trust, 85);
    }
  }
}
