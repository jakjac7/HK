/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PlayerAction, ActionId, Person, Community, CallingType } from '../types';
import { BASE_ACTIONS_CONFIG, initializeActions } from '../config/actions';
import { DriftSystem } from './DriftSystem';

export class ActionSystem {
  public actions: PlayerAction[];
  public attention: number = 3.0;
  public maxAttention: number = 3;

  constructor() {
    this.actions = initializeActions();
  }

  public update(dt: number): void {
    // 1. Recharge attention (1 charge per 8 seconds = 0.125 / sec)
    if (this.attention < this.maxAttention) {
      this.attention = Math.min(this.maxAttention, this.attention + (1.0 / 8.0) * dt);
    }

    // 2. Decrement action cooldowns
    for (const action of this.actions) {
      if (action.currentCooldown > 0) {
        action.currentCooldown = Math.max(0, action.currentCooldown - dt);
      }
    }
  }

  public getAction(id: ActionId): PlayerAction | undefined {
    return this.actions.find(a => a.id === id);
  }

  public canUseAction(id: ActionId): boolean {
    const action = this.getAction(id);
    if (!action) return false;
    return action.currentCooldown <= 0.05 && this.attention >= action.attentionCost;
  }

  /**
   * Executes a player action (Section 5, 8, 9, 10, 11-13)
   */
  public executeAction(
    actionId: ActionId,
    community: Community,
    targetPerson: Person | null,
    allPeople: Person[]
  ): { success: boolean; message: string } {
    const action = this.getAction(actionId);
    if (!action) {
      return { success: false, message: '알 수 없는 행동입니다.' };
    }

    if (action.currentCooldown > 0.05) {
      return {
        success: false,
        message: `${action.koreanName} 행동 준비 중입니다. (${Math.ceil(action.currentCooldown)}초 남음)`,
      };
    }

    if (this.attention < action.attentionCost) {
      return { success: false, message: '행동력(시선 포인트)이 부족합니다.' };
    }

    // Consume attention and start cooldown
    this.attention -= action.attentionCost;
    action.currentCooldown = action.cooldown;

    if (targetPerson) {
      targetPerson.visualEffect = {
        type: actionId,
        timer: actionId === 'CARE' ? 6.0 : 3.0, // Increased for CARE
      };
    }

    // Check calling presence in community for specialization bonuses (Section 5)
    const commMembers = allPeople.filter(p => p.communityId === community.id && !p.isExternal);
    const hasTeacher = commMembers.some(p => p.calling === 'TEACHER');
    const hasShepherd = commMembers.some(p => p.calling === 'SHEPHERD');
    const hasIntercessor = commMembers.some(p => p.calling === 'INTERCESSOR');
    const hasWorshipper = commMembers.some(p => p.calling === 'WORSHIPPER');

    // First, apply multi-action crisis mitigation
    const driftMitigationMsg = DriftSystem.applyActionMitigation(community, actionId, targetPerson);

    let specificMsg = '';

    switch (actionId) {
      case 'FELLOWSHIP': {
        // Boosts trust & heals tensions
        if (targetPerson) {
          targetPerson.trust = Math.min(100, targetPerson.trust + 25);
          targetPerson.stability = Math.min(100, targetPerson.stability + 15);
          if (targetPerson.need?.type === 'TENSION') targetPerson.need = null;
          specificMsg = `${targetPerson.name} 성도와 함께 식탁의 교제를 나누어 깊은 신뢰를 회복했습니다.`;
        } else {
          commMembers.forEach(p => {
            p.trust = Math.min(100, p.trust + 15);
            if (p.need?.type === 'TENSION') p.need = null; // Heal community-wide tension
          });
          community.stats.unity = Math.min(100, community.stats.unity + 10);
          specificMsg = '온 공동체가 함께 떡을 떼며 하나 됨의 기쁨을 누리고 갈등을 해소했습니다.';
        }
        break;
      }

      case 'WORD': {
        // Boosts Gospel depth (formation) across the ENTIRE community (AoE Skill)
        const depthGain = hasTeacher ? 24 : 16;
        commMembers.forEach(p => {
          p.depth = Math.min(100, p.depth + depthGain);
          p.readiness = Math.min(100, p.readiness + 10);
          p.trust = Math.min(100, p.trust + 8);
          p.stability = Math.min(100, p.stability + 6);
          p.visualEffect = { type: 'WORD', timer: 4.0 };
        });

        community.stats.formation = Math.min(100, community.stats.formation + (hasTeacher ? 22 : 15));
        community.stats.integrity = Math.min(100, community.stats.integrity + 15);
        
        // Teachers in the community rejoice in the Word proclamation
        commMembers.filter(p => p.calling === 'TEACHER').forEach(t => {
          t.contribution.trainedCount++;
        });

        specificMsg = `공동체 전체에 생명의 말씀을 광역 선포하여 모든 성도의 복음 깊이가 충만해졌습니다!${hasTeacher ? ' (교사의 강단 동역으로 말씀의 능력이 배가되었습니다)' : ''}`;
        break;
      }

      case 'PRAYER': {
        // Community resilience & Burnout reduction
        const resilienceGain = hasIntercessor ? 20 : 12;
        community.stats.resilience = Math.min(100, community.stats.resilience + resilienceGain);
        commMembers.forEach(p => {
          p.burnout = Math.max(0, p.burnout - (hasIntercessor ? 20 : 12));
          p.stability = Math.min(100, p.stability + 8);
        });
        specificMsg = `합심하여 무릎 꿇고 기도하여 영적 소진을 씻고 은혜의 품을 넓혔습니다.${hasIntercessor ? ' (중보기도자의 기도로 회복 ↑)' : ''}`;
        break;
      }

      case 'WORSHIP': {
        // Unity & visual clarity
        const unityGain = hasWorshipper ? 22 : 14;
        community.stats.unity = Math.min(100, community.stats.unity + unityGain);
        community.stats.clarity = Math.min(100, community.stats.clarity + 18);
        commMembers.forEach(p => {
          p.trust = Math.min(100, p.trust + 10);
        });
        specificMsg = `주를 향한 온전한 예배로 공동체의 중심이 굳건해지고 일치되었습니다.${hasWorshipper ? ' (예배자의 찬양으로 일치 ↑)' : ''}`;
        break;
      }

      case 'CARE': {
        // Heals Weariness & bridges care gap & resolves QUESTION (말씀에 대한 확신 부족은 심방으로 대응)
        if (targetPerson) {
          targetPerson.stability = Math.min(100, targetPerson.stability + 30);
          targetPerson.leaveIntent = 0;
          if (targetPerson.careStatus === 'UNCARED') targetPerson.careStatus = 'CARED';
          
          if (targetPerson.need?.type === 'QUESTION') {
            // Personal pastoral visitation resolves spiritual doubt / lack of conviction
            targetPerson.need = null;
            targetPerson.depth = Math.min(100, targetPerson.depth + 25);
            targetPerson.trust = Math.min(100, targetPerson.trust + 25);
            targetPerson.burnout = Math.max(0, targetPerson.burnout - 20);
            targetPerson.visualEffect = { type: 'CARE', timer: 6.0 };
            specificMsg = `${targetPerson.name} 성도를 1:1 심방하여 말씀에 대한 깊은 의문과 회의를 풀어주고 확고한 믿음의 확신을 세웠습니다.${hasShepherd ? ' (목자의 돌봄 협력)' : ''}`;
          } else if (targetPerson.need?.type === 'WEARY' || targetPerson.need?.type === 'NEWCOMER') {
            targetPerson.burnout = Math.max(0, targetPerson.burnout - 40);
            targetPerson.need = null;
            targetPerson.visualEffect = { type: 'CARE', timer: 6.0 };
            specificMsg = `${targetPerson.name} 성도를 목회적으로 심방하여 상처를 보듬고 안정을 되찾았습니다.${hasShepherd ? ' (목자의 돌봄 협력)' : ''}`;
          } else {
            targetPerson.burnout = Math.max(0, targetPerson.burnout - 30);
            targetPerson.visualEffect = { type: 'CARE', timer: 6.0 };
            specificMsg = `${targetPerson.name} 성도를 사랑으로 심방하여 교제의 온기를 나누었습니다.`;
          }
        } else {
          const uncaredOrWeary = commMembers.filter(p => p.careStatus === 'UNCARED' || p.burnout > 50 || p.need?.type === 'QUESTION');
          uncaredOrWeary.forEach(p => {
            p.burnout = Math.max(0, p.burnout - 20);
            p.stability = Math.min(100, p.stability + 15);
            p.careStatus = 'CARED';
            if (p.need?.type === 'QUESTION') p.need = null;
            p.visualEffect = { type: 'CARE', timer: 6.0 };
          });
          community.stats.care = Math.min(100, community.stats.care + 15);
          specificMsg = '돌봄이 절실한 지체들을 찾아가 그리스도의 사랑으로 위로하고 의문을 풀어주었습니다.';
        }
        break;
      }

      case 'SEND': {
        specificMsg = '분립 개척 준비에 착수했습니다.';
        break;
      }
    }

    const fullMsg = driftMitigationMsg ? `${specificMsg} (${driftMitigationMsg})` : specificMsg;
    return { success: true, message: fullMsg };
  }
}
