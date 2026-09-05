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

    // Check for extreme shortage (0 of a critical role like SHEPHERD or TEACHER in a growing community)
    const totalPop = allCommunityPeople.length;
    if (totalPop >= 6 && counts.SHEPHERD === 0 && Math.random() < 0.85) {
      return 'SHEPHERD';
    }
    if (totalPop >= 6 && counts.TEACHER === 0 && Math.random() < 0.75) {
      return 'TEACHER';
    }

    // Weight computation
    const weights: Record<NonNullable<CallingType>, number> = {
      EVANGELIST: 20,
      SHEPHERD: 20,
      TEACHER: 20,
      INTERCESSOR: 20,
      WORSHIPPER: 20,
    };

    const minCount = Math.min(...Object.values(counts));

    ALL_CALLINGS.forEach(c => {
      const deficit = counts[c] - minCount;
      if (counts[c] === 0) {
        weights[c] += 30; // Strong boost if 0
      } else if (deficit === 0) {
        weights[c] += 15; // Moderate boost if at minimum
      } else {
        weights[c] = Math.max(5, weights[c] - deficit * 6);
      }
    });

    // Special map adjustments can slightly influence calling emergence naturally:
    if (community.stats.uncaredCount > 0) {
      weights.SHEPHERD += 25;
    }
    if (community.drift?.type === 'DECEPTION') {
      weights.TEACHER += 20;
    }
    if (community.drift?.type === 'BURNOUT') {
      weights.INTERCESSOR += 20;
    }

    // Weighted random pick
    const totalWeight = ALL_CALLINGS.reduce((acc, c) => acc + weights[c], 0);
    let rand = Math.random() * totalWeight;

    for (const c of ALL_CALLINGS) {
      if (rand < weights[c]) {
        return c;
      }
      rand -= weights[c];
    }

    return 'SHEPHERD'; // Fallback
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
