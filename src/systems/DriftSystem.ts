/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Community, DriftType, Person, MapProfile, ActionId } from '../types';

export interface VulnerabilityAccumulator {
  confusion: number;   // from unanswered questions / false concepts
  division: number;    // from uncared newcomers & tensions
  burnout: number;     // from high activity & shepherd overload & low prayer
  apathy: number;      // from lack of outreach & complacency
}

export class DriftSystem {
  /**
   * Evaluates and updates community drift intensity and vulnerabilities.
   * Section 14 & 15:
   * 60% vulnerability, 25% map pressure, 15% random.
   * Does NOT auto-expire! Has intensity 0~100.
   */
  public static updateDrifts(
    community: Community,
    people: Person[],
    map: MapProfile,
    vuln: VulnerabilityAccumulator,
    dt: number
  ): { spawnedDrift: boolean; resolvedDrift: boolean; overflowedDrift: boolean } {
    let spawnedDrift = false;
    let resolvedDrift = false;
    let overflowedDrift = false;

    const communityMembers = people.filter(p => p.communityId === community.id && !p.isExternal);
    const uncaredCount = communityMembers.filter(p => p.careStatus === 'UNCARED').length;
    const wearyCount = communityMembers.filter(p => p.burnout > 60 || p.need?.type === 'WEARY').length;
    const questionsCount = communityMembers.filter(p => p.need?.type === 'QUESTION').length;
    const tensionCount = communityMembers.filter(p => p.need?.type === 'TENSION').length;

    // 1. Accumulate vulnerabilities over time
    if (questionsCount > 0) {
      vuln.confusion += questionsCount * 0.8 * dt;
    }
    if (uncaredCount > 0 || tensionCount > 0) {
      vuln.division += (uncaredCount * 0.6 + tensionCount * 1.0) * dt;
    }
    if (wearyCount > 0 || community.stats.resilience < 40) {
      vuln.burnout += (wearyCount * 0.7 + (community.stats.resilience < 40 ? 0.5 : 0)) * dt;
    }
    if (community.stats.mission < 30 && communityMembers.length >= 6) {
      vuln.apathy += 0.5 * dt;
    }

    // Natural decay of vulnerabilities if healthy
    vuln.confusion = Math.max(0, vuln.confusion - 0.2 * dt);
    vuln.division = Math.max(0, vuln.division - 0.2 * dt);
    vuln.burnout = Math.max(0, vuln.burnout - 0.25 * dt);
    vuln.apathy = Math.max(0, vuln.apathy - 0.2 * dt);

    // 2. If no active drift, check if a vulnerability triggers a new crisis
    if (!community.drift) {
      // Calculate threat scores: 60% vulnerability, 25% map pressure, 15% random
      const randFactor = Math.random() * 15;
      const confusionScore = vuln.confusion * 0.6 + map.driftWeights.deception * 100 * 0.25 + randFactor;
      const divisionScore = vuln.division * 0.6 + map.driftWeights.division * 100 * 0.25 + randFactor;
      const burnoutScore = vuln.burnout * 0.6 + map.driftWeights.burnout * 100 * 0.25 + randFactor;
      const apathyScore = vuln.apathy * 0.6 + map.driftWeights.apathy * 100 * 0.25 + randFactor;

      const triggerThreshold = 45; // Threshold to spawn crisis

      if (confusionScore > triggerThreshold && confusionScore >= Math.max(divisionScore, burnoutScore, apathyScore)) {
        community.drift = {
          type: 'DECEPTION',
          intensity: 45,
          discovered: false,
          duration: 0,
          title: '혼란 (거짓 가르침)',
          description: '말씀의 왜곡으로 인해 지체들의 심령이 흔들리고 의심이 싹트고 있습니다.',
          vulnerabilitySource: '답변되지 않은 질문과 복음 깊이의 부재',
        };
        vuln.confusion = Math.max(0, vuln.confusion - 25);
        spawnedDrift = true;
      } else if (divisionScore > triggerThreshold && divisionScore >= Math.max(burnoutScore, apathyScore)) {
        community.drift = {
          type: 'DIVISION',
          intensity: 45,
          discovered: true,
          duration: 0,
          title: '갈등 (분열과 소외)',
          description: '돌봄 받지 못한 지체의 소외감과 오해가 공동체 내 균열을 일으키고 있습니다.',
          vulnerabilitySource: '돌봄 수용력 초과 및 미해결된 긴장',
        };
        vuln.division = Math.max(0, vuln.division - 25);
        spawnedDrift = true;
      } else if (burnoutScore > triggerThreshold && burnoutScore >= apathyScore) {
        community.drift = {
          type: 'BURNOUT',
          intensity: 45,
          discovered: true,
          duration: 0,
          title: '소진 (영적 탈진)',
          description: '지속된 사역과 기도의 부재로 목자와 지체들이 깊은 피로에 빠져 있습니다.',
          vulnerabilitySource: '과도한 사역 및 중보기도 품의 부족',
        };
        vuln.burnout = Math.max(0, vuln.burnout - 25);
        spawnedDrift = true;
      } else if (apathyScore > triggerThreshold) {
        community.drift = {
          type: 'APATHY',
          intensity: 40,
          discovered: true,
          duration: 0,
          title: '침체 (안일과 무관심)',
          description: '외부를 향한 시선이 닫히고 내부의 안락함에 안주하여 영적 활력이 식어가고 있습니다.',
          vulnerabilitySource: '선교적 시선 부재 및 지속된 정체',
        };
        vuln.apathy = Math.max(0, vuln.apathy - 25);
        spawnedDrift = true;
      }
    } else {
      // 3. Existing drift progression (Section 15: Does not auto-expire!)
      const drift = community.drift;
      drift.duration += dt;

      // Natural escalation pressure
      let escalationRate = 1.0;
      if (drift.type === 'BURNOUT') {
        escalationRate = wearyCount >= 2 ? 2.5 : 1.2;
      } else if (drift.type === 'DIVISION') {
        escalationRate = uncaredCount >= 2 ? 2.8 : 1.4;
      } else if (drift.type === 'DECEPTION') {
        escalationRate = questionsCount >= 2 ? 2.6 : 1.3;
      } else if (drift.type === 'APATHY') {
        escalationRate = 1.0;
      }

      // Intercessors and Teachers autonomously slow down drift
      const hasTeacher = communityMembers.some(p => p.calling === 'TEACHER');
      const hasIntercessor = communityMembers.some(p => p.calling === 'INTERCESSOR');
      const hasWorshipper = communityMembers.some(p => p.calling === 'WORSHIPPER');

      if (drift.type === 'DECEPTION' && hasTeacher) {
        drift.discovered = true;
        escalationRate -= 1.0;
      }
      if (drift.type === 'BURNOUT' && hasIntercessor) {
        escalationRate -= 1.2;
      }
      if (drift.type === 'DIVISION' && hasWorshipper) {
        escalationRate -= 0.8;
      }

      drift.intensity += escalationRate * dt;

      // Check overflow (crisis reached 100)
      if (drift.intensity >= 100) {
        drift.intensity = 80;
        overflowedDrift = true;
        // Severe impact on community
        community.stats.unity = Math.max(20, community.stats.unity - 25);
        community.stats.care = Math.max(20, community.stats.care - 20);
        // An uncared or weary member might leave
        const leavingCandidate = communityMembers.find(p => p.calling === null && (p.careStatus === 'UNCARED' || p.burnout > 70));
        if (leavingCandidate) {
          leavingCandidate.communityId = null;
          leavingCandidate.isExternal = true;
          leavingCandidate.movementState = 'OUTSIDE';
          leavingCandidate.careStatus = 'NONE';
        }
      }

      // Check resolution (drift reduced to <= 0)
      if (drift.intensity <= 0) {
        community.drift = null;
        resolvedDrift = true;
      }
    }

    return { spawnedDrift, resolvedDrift, overflowedDrift };
  }

  /**
   * Applies Multi-Action Mitigation (Section 11, 12, 13)
   * Multiple actions mitigate crisis in different ways.
   */
  public static applyActionMitigation(
    community: Community,
    actionId: ActionId,
    targetPerson: Person | null
  ): string | null {
    if (!community.drift) return null;
    const drift = community.drift;

    switch (drift.type) {
      case 'BURNOUT':
        if (actionId === 'PRAYER') {
          drift.intensity = Math.max(0, drift.intensity - 30);
          community.stats.resilience = Math.min(100, community.stats.resilience + 15);
          return '합심 기도로 공동체 전체의 영적 피로와 소진 위기가 크게 완화되었습니다.';
        } else if (actionId === 'CARE') {
          drift.intensity = Math.max(0, drift.intensity - 20);
          if (targetPerson) {
            targetPerson.burnout = Math.max(0, targetPerson.burnout - 45);
            targetPerson.stability = Math.min(100, targetPerson.stability + 25);
          }
          return '지친 지체를 향한 집중 심방으로 소진의 불길을 잡았습니다.';
        } else if (actionId === 'WORSHIP') {
          drift.intensity = Math.max(0, drift.intensity - 15);
          community.stats.unity = Math.min(100, community.stats.unity + 10);
          return '예배의 감격으로 탈진한 공동체의 사기가 회복되었습니다.';
        } else if (actionId === 'WORD') {
          drift.intensity = Math.max(0, drift.intensity - 10);
          return '말씀의 위로로 영적 불안을 달랬습니다.';
        }
        break;

      case 'DIVISION':
        if (actionId === 'FELLOWSHIP') {
          drift.intensity = Math.max(0, drift.intensity - 30);
          community.stats.unity = Math.min(100, community.stats.unity + 20);
          return '함께 떡을 떼며 지체 간의 서운함과 벽을 허물었습니다.';
        } else if (actionId === 'CARE') {
          drift.intensity = Math.max(0, drift.intensity - 25);
          if (targetPerson) {
            targetPerson.stability = Math.min(100, targetPerson.stability + 30);
          }
          return '상처 입은 지체를 따뜻하게 품어 분열의 원인을 치유했습니다.';
        } else if (actionId === 'WORSHIP') {
          drift.intensity = Math.max(0, drift.intensity - 20);
          community.stats.unity = Math.min(100, community.stats.unity + 15);
          return '한 몸 된 경배를 통해 공동체의 결속을 다졌습니다.';
        } else if (actionId === 'PRAYER') {
          drift.intensity = Math.max(0, drift.intensity - 15);
          return '중보기도로 갈등의 확산 속도를 늦추었습니다.';
        }
        break;

      case 'DECEPTION':
        if (actionId === 'WORD') {
          drift.intensity = Math.max(0, drift.intensity - 45);
          community.stats.formation = Math.min(100, community.stats.formation + 20);
          community.stats.integrity = Math.min(100, community.stats.integrity + 20);
          return '진리의 말씀 선포로 거짓된 왜곡과 혼란을 명쾌하게 물리쳤습니다.';
        } else if (actionId === 'PRAYER') {
          drift.intensity = Math.max(0, drift.intensity - 20);
          return '기도의 방패로 미혹의 영적 공격을 막아섰습니다.';
        } else if (actionId === 'FELLOWSHIP' || actionId === 'WORSHIP') {
          drift.intensity = Math.max(0, drift.intensity - 15);
          return '공동체적 결속으로 흔들리는 지체들을 붙들어 주었습니다.';
        }
        break;

      case 'APATHY':
        if (actionId === 'WORSHIP' || actionId === 'PRAYER') {
          drift.intensity = Math.max(0, drift.intensity - 30);
          community.stats.mission = Math.min(100, community.stats.mission + 15);
          return '뜨거운 예배와 기도로 식어진 공동체의 첫사랑을 다시 깨웠습니다.';
        } else if (actionId === 'WORD' || actionId === 'FELLOWSHIP') {
          drift.intensity = Math.max(0, drift.intensity - 20);
          return '말씀과 교제로 침체된 분위기를 쇄신했습니다.';
        }
        break;
    }

    return null;
  }
}
