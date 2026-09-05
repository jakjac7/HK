/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Community, Person, ReleaseSnapshot, RunStats } from '../types';

export class ReleaseSystem {
  /**
   * Captures snapshot right before THE RELEASE begins (09:00 / 540s)
   */
  public static captureSnapshot(
    communities: Community[],
    people: Person[],
    time: number
  ): ReleaseSnapshot {
    const insidePeople = people.filter(p => !p.isExternal);
    const avgHealth = Math.round(
      communities.reduce((acc, c) => {
        const s = c.stats;
        return acc + (s.formation + s.care + s.clarity + s.resilience + s.mission) / 5;
      }, 0) / Math.max(1, communities.length)
    );

    const avgIntegrity = Math.round(
      communities.reduce((acc, c) => acc + c.stats.integrity, 0) / Math.max(1, communities.length)
    );

    const totalCapacity = communities.reduce((acc, c) => acc + c.stats.careCapacity, 0);
    const totalPop = insidePeople.length;

    return {
      time,
      population: totalPop,
      health: avgHealth,
      integrity: avgIntegrity,
      communityCount: communities.length,
      careCapacity: totalCapacity,
      careGap: Math.max(0, totalPop - totalCapacity),
      g1Count: insidePeople.filter(p => p.generation === 1).length,
      g2Count: insidePeople.filter(p => p.generation === 2).length,
      g3Count: insidePeople.filter(p => p.generation >= 3).length,
    };
  }

  /**
   * Computes final score and simplified causal reflections after THE RELEASE (Section 48, 49, 50)
   */
  public static evaluateRelease(
    snapshot: ReleaseSnapshot | undefined,
    currentCommunities: Community[],
    currentPeople: Person[],
    stats: RunStats
  ): {
    autonomyScore: number;
    multiplicationScore: number;
    kingdomHealthScore: number;
    gospelIntegrityScore: number;
    reachScore: number;
    finalScore: number;
    finalGrade: 'S' | 'A' | 'B' | 'C' | 'D';
    reflections: string[];
  } {
    const insidePeople = currentPeople.filter(p => !p.isExternal);
    const postPop = insidePeople.length;
    const postHealth = Math.round(
      currentCommunities.reduce((acc, c) => {
        const s = c.stats;
        return acc + (s.formation + s.care + s.clarity + s.resilience + s.mission) / 5;
      }, 0) / Math.max(1, currentCommunities.length)
    );
    const postIntegrity = Math.round(
      currentCommunities.reduce((acc, c) => acc + c.stats.integrity, 0) / Math.max(1, currentCommunities.length)
    );

    // Retention ratios
    const preHealth = snapshot ? Math.max(1, snapshot.health) : 70;
    const preIntegrity = snapshot ? Math.max(1, snapshot.integrity) : 75;
    const healthRetention = Math.min(100, (postHealth / preHealth) * 100);
    const integrityRetention = Math.min(100, (postIntegrity / preIntegrity) * 100);

    // TASK HK4-050: Rigorous Community Survival Ratio (post / pre * 100)
    const preCommunityCount = snapshot ? Math.max(1, snapshot.communityCount) : Math.max(1, currentCommunities.length);
    const communitySurvival = Math.min(100, Math.round((currentCommunities.length / preCommunityCount) * 100));

    // TASK HK4-051: Remove arbitrary +40 floor. Normalized against expected ~14 autonomous actions
    const totalAutoActions =
      stats.autonomousCareCount +
      stats.autonomousReachCount +
      stats.autonomousFormationCount +
      stats.autonomousCrisesResolved * 5;
    const autonomousScore = Math.min(100, Math.round(totalAutoActions * 7));

    // Care stability
    const totalCapacity = currentCommunities.reduce((acc, c) => acc + c.stats.careCapacity, 0);
    const careStabilityScore = postPop <= totalCapacity ? 100 : Math.max(20, 100 - (postPop - totalCapacity) * 15);

    // G2/G3 Activity
    const g2Count = insidePeople.filter(p => p.generation === 2).length;
    const g3Count = insidePeople.filter(p => p.generation >= 3).length;
    const g2g3Score = Math.min(100, g2Count * 30 + g3Count * 50);

    // Overall formula (Section 48):
    // Health Retention 25%, Integrity Retention 20%, Community Survival 20%, Autonomous Actions 15%, Care Stability 10%, G2/G3 10%
    const finalScore = Math.round(
      healthRetention * 0.25 +
      integrityRetention * 0.20 +
      communitySurvival * 0.20 +
      autonomousScore * 0.15 +
      careStabilityScore * 0.10 +
      g2g3Score * 0.10
    );

    // TASK HK4-052: S Gate Criteria
    // FinalScore >= 85, G3 >= 1, ReleaseSurvival >= 80, Integrity >= 70, no catastrophic care collapse
    const qualifiesForS =
      finalScore >= 85 &&
      g3Count >= 1 &&
      communitySurvival >= 80 &&
      postIntegrity >= 70 &&
      postPop <= totalCapacity + 2;

    let finalGrade: 'S' | 'A' | 'B' | 'C' | 'D' = 'C';
    if (finalScore >= 85 && qualifiesForS) finalGrade = 'S';
    else if (finalScore >= 78) finalGrade = 'A';
    else if (finalScore >= 65) finalGrade = 'B';
    else if (finalScore >= 48) finalGrade = 'C';
    else finalGrade = 'D';

    // Generate up to 3 causal reflection sentences (Section 50)
    const reflections: string[] = [];

    // Reflection 1: Care & Population Pressure
    if (postPop > totalCapacity + 2) {
      reflections.push('사람이 너무 빨리 늘어 목자의 돌봄 수용력이 한계에 달했습니다.');
    } else if (snapshot && snapshot.careGap > 3) {
      reflections.push('한 명의 목자에게 너무 많은 사람이 의존하여 돌봄 공백이 생겼습니다.');
    } else {
      reflections.push('지체들의 세심한 돌봄으로 새가족들이 사랑 안에 안정되게 정착했습니다.');
    }

    // Reflection 2: Multiplication & Succession
    if (currentCommunities.length > 1) {
      if (g2Count + g3Count >= 2) {
        reflections.push('다음 세대 제자들이 든든히 세워져 분립 개척 후에도 자립적으로 번식했습니다.');
      } else {
        reflections.push('새로운 지경을 향해 분립 개척을 이뤄 공동체의 지경을 넓혔습니다.');
      }
    } else {
      reflections.push('한 공동체에 머무르느라 다음 세대를 향한 분립 개척 파송에 이르지 못했습니다.');
    }

    // Reflection 3: Formation & Gospel Integrity
    if (postIntegrity < 60) {
      reflections.push('복음의 깊이가 충분히 다져지지 않아 혼란과 의심의 위기에 흔들렸습니다.');
    } else if (stats.autonomousCrisesResolved > 0) {
      reflections.push('사역을 성령께 온전히 맡겨드린 후에도 공동체가 오직 성령 안에서 스스로 위기를 이겨냈습니다.');
    } else {
      reflections.push('진리의 말씀과 신실한 기도가 공동체를 끝까지 굳건하게 지켜냈습니다.');
    }

    return {
      autonomyScore: Math.round(autonomousScore),
      multiplicationScore: Math.min(100, Math.round(currentCommunities.length * 35 + g2g3Score * 0.3)),
      kingdomHealthScore: Math.round(postHealth),
      gospelIntegrityScore: Math.round(postIntegrity),
      reachScore: Math.min(100, Math.round(stats.peopleReached * 6)),
      finalScore,
      finalGrade,
      reflections: reflections.slice(0, 3),
    };
  }
}
