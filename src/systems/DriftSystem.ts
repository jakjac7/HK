/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Community, DriftType, Person, MapProfile, ActionId, SocietalNews } from '../types';

export interface VulnerabilityAccumulator {
  confusion: number;   // from unanswered questions / false concepts
  division: number;    // from uncared newcomers & tensions
  burnout: number;     // from high activity & shepherd overload & low prayer
  apathy: number;      // from lack of outreach & complacency
  lastAlertTime?: number;
}

export const SOCIETAL_NEWS_DATABASE: Record<
  DriftType,
  Array<{ headline: string; impactDescription: string; category: 'CULT' | 'ECONOMY' | 'POLITICS' | 'SECULARISM' }>
> = {
  DECEPTION: [
    {
      headline: '[사회 속보] 캠퍼스 및 도심가에 신천지 등 사이비 이단 포교 활동 급증… 청년 대학가 경계령',
      impactDescription: '거짓 가르침과 왜곡된 교리가 침투하고 있습니다. 교사의 말씀 양육(ROOT)과 복음 선포가 시급합니다.',
      category: 'CULT',
    },
    {
      headline: '[교계 긴급 뉴스] 유튜브·SNS 발 왜곡된 종말론과 가짜 성경 해석 확산… 청년 성도 혼란 가중',
      impactDescription: '성도들의 복음적 분별력이 흔들리고 있습니다. 진리의 말씀 선포로 기준을 바로 세워야 합니다.',
      category: 'CULT',
    },
    {
      headline: '[심층 보도] 정통 교리를 흔드는 기복주의 침투… 거짓 가르침의 유혹 확산 조짐',
      impactDescription: '순전한 복음의 깊이가 얕아진 틈을 타 왜곡된 사상이 공동체를 위협합니다.',
      category: 'CULT',
    },
  ],
  BURNOUT: [
    {
      headline: '[경제 속보] 청년 실업률 역대 최고치 경신 및 고물가 한파… 2030 성도 생계 불안과 탈진 심화',
      impactDescription: '취업난과 생계 부담으로 사역자들과 성도들의 피로가 누적되고 있습니다. 쉼과 치유의 심방(CARE)이 절실합니다.',
      category: 'ECONOMY',
    },
    {
      headline: '[사회 기획] 2030 세대 "아무것도 할 힘이 없다"… 만성 피로와 영적 무기력 증후군 만연',
      impactDescription: '지친 심령들이 기도의 손을 놓고 있습니다. 중보기도(PRAYER)와 목자의 따뜻한 위로가 필요합니다.',
      category: 'ECONOMY',
    },
    {
      headline: '[산업 리포트] 대규모 구조조정과 야근의 일상화… 평신도 봉사자들의 영적 에너지 고갈 호소',
      impactDescription: '과도한 사역과 세상의 압박으로 번아웃 위기가 고조되고 있습니다.',
      category: 'ECONOMY',
    },
  ],
  DIVISION: [
    {
      headline: '[사회 뉴스] 총선 정국 극단적 정치 대립과 이념 갈등 심화… 교회 공동체로 번지는 편가르기',
      impactDescription: '정치적 견해 차이와 세대 간의 불통으로 성도 간의 신뢰가 금이 가고 있습니다. 식탁의 교제(FELLOWSHIP)가 절실합니다.',
      category: 'POLITICS',
    },
    {
      headline: '[긴급 속보] 온라인 커뮤니티發 혐오 담론 범람… "우리와 그들"로 갈라지는 공동체 균열 조짐',
      impactDescription: '돌봄의 공백과 오해가 깊은 감정의 골로 번지고 있습니다. 사랑의 결속과 화평이 필요합니다.',
      category: 'POLITICS',
    },
    {
      headline: '[교계 시평] 세대 간 문화적 단절과 의사소통 부재… 청년층과 기성세대 간의 거리감 확대',
      impactDescription: '소외된 지체들의 아픔을 품지 못하면 분열의 균열이 걷잡을 수 없이 커집니다.',
      category: 'POLITICS',
    },
  ],
  APATHY: [
    {
      headline: '[문화 리포트] 초개인주의와 숏폼 도파민 중독… 영혼을 향한 애통함이 실종된 도시의 그늘',
      impactDescription: '세속적 안락함에 젖어 외부 영혼들을 향한 전도의 열정이 식어가고 있습니다. 예배(WORSHIP)의 감격을 회복해야 합니다.',
      category: 'SECULARISM',
    },
    {
      headline: '[사회 속보] 종교적 무관심 시대 도래… 2030 세대의 영적 냉담 현상 심각한 수준',
      impactDescription: '교회 문턱을 넘는 발걸음이 줄어들고 영적 정체가 시작되고 있습니다. 선교적 시선(GO)이 요구됩니다.',
      category: 'SECULARISM',
    },
    {
      headline: '[특집] "나 혼자만 평안하면 그만"… 영적 나르시시즘과 선교적 야성의 실종 경고',
      impactDescription: '복음 전파의 열정을 잃어버린 공동체에 차가운 침체의 먹구름이 끼고 있습니다.',
      category: 'SECULARISM',
    },
  ],
};

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
    dt: number,
    gameTime: number = 0
  ): { spawnedDrift: boolean; resolvedDrift: boolean; overflowedDrift: boolean; societalAlert?: SocietalNews } {
    let spawnedDrift = false;
    let resolvedDrift = false;
    let overflowedDrift = false;
    let societalAlert: SocietalNews | undefined;

    const communityMembers = people.filter(p => p.communityId === community.id && !p.isExternal);
    const uncaredCount = communityMembers.filter(p => p.careStatus === 'UNCARED').length;
    const wearyCount = communityMembers.filter(p => p.burnout > 60 || p.need?.type === 'WEARY').length;
    const questionsCount = communityMembers.filter(p => p.need?.type === 'QUESTION').length;
    const tensionCount = communityMembers.filter(p => p.need?.type === 'TENSION').length;

    // 1. Accumulate vulnerabilities over time (Gentle accumulation tuned for 2-3 min cycle)
    if (questionsCount > 0) {
      vuln.confusion += questionsCount * 0.22 * dt;
    }
    if (uncaredCount > 0 || tensionCount > 0) {
      vuln.division += (uncaredCount * 0.18 + tensionCount * 0.3) * dt;
    }
    if (wearyCount > 0 || community.stats.resilience < 40) {
      vuln.burnout += (wearyCount * 0.22 + (community.stats.resilience < 40 ? 0.2 : 0)) * dt;
    }
    if (community.stats.mission < 30 && communityMembers.length >= 6) {
      vuln.apathy += 0.15 * dt;
    }

    // Natural decay of vulnerabilities if healthy
    vuln.confusion = Math.max(0, vuln.confusion - 0.25 * dt);
    vuln.division = Math.max(0, vuln.division - 0.25 * dt);
    vuln.burnout = Math.max(0, vuln.burnout - 0.28 * dt);
    vuln.apathy = Math.max(0, vuln.apathy - 0.22 * dt);

    // 2. If no active drift, check if a vulnerability triggers a new crisis
    if (!community.drift) {
      // Calculate threat scores: 60% vulnerability, 25% map pressure, 15% random
      const randFactor = Math.random() * 10;
      const confusionScore = vuln.confusion * 0.6 + map.driftWeights.deception * 100 * 0.25 + randFactor;
      const divisionScore = vuln.division * 0.6 + map.driftWeights.division * 100 * 0.25 + randFactor;
      const burnoutScore = vuln.burnout * 0.6 + map.driftWeights.burnout * 100 * 0.25 + randFactor;
      const apathyScore = vuln.apathy * 0.6 + map.driftWeights.apathy * 100 * 0.25 + randFactor;

      const triggerThreshold = 68; // Tuned for 2~3 minute cycle

      // Forecast alert when threats are building up (e.g. > 52)
      const maxThreat = Math.max(confusionScore, divisionScore, burnoutScore, apathyScore);
      if ((!vuln.lastAlertTime || gameTime - vuln.lastAlertTime > 75) && maxThreat > 52 && maxThreat <= triggerThreshold) {
        let threatenedType: DriftType = 'DECEPTION';
        if (divisionScore === maxThreat) threatenedType = 'DIVISION';
        else if (burnoutScore === maxThreat) threatenedType = 'BURNOUT';
        else if (apathyScore === maxThreat) threatenedType = 'APATHY';

        const newsCandidates = SOCIETAL_NEWS_DATABASE[threatenedType];
        const selected = newsCandidates[Math.floor(Math.random() * newsCandidates.length)];
        societalAlert = {
          id: `forecast-${Date.now()}`,
          headline: selected.headline,
          impactDescription: `[시대의 징후 감지] ${selected.impactDescription}`,
          driftType: threatenedType,
          targetDriftType: threatenedType,
          category: selected.category,
          severity: 'MEDIUM',
          timestamp: gameTime,
          duration: 16,
        };
        vuln.lastAlertTime = gameTime;
      }

      if (confusionScore > triggerThreshold && confusionScore >= Math.max(divisionScore, burnoutScore, apathyScore)) {
        community.drift = {
          type: 'DECEPTION',
          intensity: 28, // Milder starting intensity
          discovered: false,
          duration: 0,
          title: '혼란 (거짓 가르침)',
          description: '말씀의 왜곡으로 인해 지체들의 심령이 흔들리고 의심이 싹트고 있습니다.',
          vulnerabilitySource: '답변되지 않은 질문과 복음 깊이의 부재',
        };
        vuln.confusion = Math.max(0, vuln.confusion - 35);
        spawnedDrift = true;
      } else if (divisionScore > triggerThreshold && divisionScore >= Math.max(burnoutScore, apathyScore)) {
        community.drift = {
          type: 'DIVISION',
          intensity: 28,
          discovered: true,
          duration: 0,
          title: '갈등 (분열과 소외)',
          description: '돌봄 받지 못한 지체의 소외감과 오해가 공동체 내 균열을 일으키고 있습니다.',
          vulnerabilitySource: '돌봄 수용력 초과 및 미해결된 긴장',
        };
        vuln.division = Math.max(0, vuln.division - 35);
        spawnedDrift = true;
      } else if (burnoutScore > triggerThreshold && burnoutScore >= apathyScore) {
        community.drift = {
          type: 'BURNOUT',
          intensity: 28,
          discovered: true,
          duration: 0,
          title: '소진 (영적 탈진)',
          description: '지속된 사역과 기도의 부재로 목자와 지체들이 깊은 피로에 빠져 있습니다.',
          vulnerabilitySource: '과도한 사역 및 중보기도 품의 부족',
        };
        vuln.burnout = Math.max(0, vuln.burnout - 35);
        spawnedDrift = true;
      } else if (apathyScore > triggerThreshold) {
        community.drift = {
          type: 'APATHY',
          intensity: 25,
          discovered: true,
          duration: 0,
          title: '침체 (안일과 무관심)',
          description: '외부를 향한 시선이 닫히고 내부의 안락함에 안주하여 영적 활력이 식어가고 있습니다.',
          vulnerabilitySource: '선교적 시선 부재 및 지속된 정체',
        };
        vuln.apathy = Math.max(0, vuln.apathy - 35);
        spawnedDrift = true;
      }

      if (spawnedDrift && community.drift) {
        const newsCandidates = SOCIETAL_NEWS_DATABASE[community.drift.type];
        const selected = newsCandidates[Math.floor(Math.random() * newsCandidates.length)];
        societalAlert = {
          id: `news-${Date.now()}`,
          headline: selected.headline,
          impactDescription: selected.impactDescription,
          driftType: community.drift.type,
          targetDriftType: community.drift.type,
          category: selected.category,
          severity: 'HIGH',
          timestamp: gameTime,
          duration: 20,
        };
        vuln.lastAlertTime = gameTime;
      }
    } else {
      // 3. Existing drift progression (Gentle escalation for 2-3 min pace)
      const drift = community.drift;
      drift.duration += dt;

      // Natural escalation pressure (tuned so crises evolve over 2-3 minutes)
      let escalationRate = 0.38;
      if (drift.type === 'BURNOUT') {
        escalationRate = wearyCount >= 2 ? 0.75 : 0.45;
      } else if (drift.type === 'DIVISION') {
        escalationRate = uncaredCount >= 2 ? 0.8 : 0.48;
      } else if (drift.type === 'DECEPTION') {
        escalationRate = questionsCount >= 2 ? 0.75 : 0.45;
      } else if (drift.type === 'APATHY') {
        escalationRate = 0.35;
      }

      // Intercessors and Teachers autonomously slow down drift
      const hasTeacher = communityMembers.some(p => p.calling === 'TEACHER');
      const hasIntercessor = communityMembers.some(p => p.calling === 'INTERCESSOR');
      const hasWorshipper = communityMembers.some(p => p.calling === 'WORSHIPPER');

      if (drift.type === 'DECEPTION' && hasTeacher) {
        drift.discovered = true;
        escalationRate -= 0.35;
      }
      if (drift.type === 'BURNOUT' && hasIntercessor) {
        escalationRate -= 0.4;
      }
      if (drift.type === 'DIVISION' && hasWorshipper) {
        escalationRate -= 0.3;
      }

      drift.intensity = Math.max(0, drift.intensity + Math.max(0.05, escalationRate) * dt);

      // Check overflow (crisis reached 100)
      if (drift.intensity >= 100) {
        drift.intensity = 70;
        overflowedDrift = true;
        // Moderate impact on community
        community.stats.unity = Math.max(20, community.stats.unity - 15);
        community.stats.care = Math.max(20, community.stats.care - 15);
        // An uncared or weary member enters LEAVING state for pastoral rescue instead of evaporating!
        const leavingCandidate = communityMembers.find(p => p.calling === null && (p.careStatus === 'UNCARED' || p.burnout > 70));
        if (leavingCandidate && leavingCandidate.movementState !== 'LEAVING') {
          leavingCandidate.movementState = 'LEAVING';
          leavingCandidate.leaveIntent = 75;
          leavingCandidate.leavingTimer = 25; // 25 second grace period for shepherds
        }
      }

      // Check resolution (drift reduced to <= 0)
      if (drift.intensity <= 0) {
        community.drift = null;
        resolvedDrift = true;
      }
    }

    return { spawnedDrift, resolvedDrift, overflowedDrift, societalAlert };
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
