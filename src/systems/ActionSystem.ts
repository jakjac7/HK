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
      return { success: false, message: '목회적 시선(주의 집중)이 부족합니다.' };
    }

    // Consume attention and start cooldown
    this.attention -= action.attentionCost;
    action.currentCooldown = action.cooldown;

    if (targetPerson) {
      targetPerson.visualEffect = {
        type: actionId,
        timer: 3.0, // 3 seconds visual effect
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
          });
          community.stats.unity = Math.min(100, community.stats.unity + 10);
          specificMsg = '온 공동체가 함께 떡을 떼며 하나 됨의 기쁨을 누렸습니다.';
        }
        break;
      }

      case 'WORD': {
        // Boosts Gospel depth (formation)
        const depthGain = hasTeacher ? 22 : 14; // Teacher amplifies formation
        if (targetPerson) {
          targetPerson.depth = Math.min(100, targetPerson.depth + depthGain);
          targetPerson.readiness = Math.min(100, targetPerson.readiness + 12);
          if (targetPerson.need?.type === 'QUESTION') targetPerson.need = null;
          
          // Upgrades calling if INTERCESSOR or WORSHIPPER or null
          if (targetPerson.calling === null) {
            if (targetPerson.depth > 40 && Math.random() < 0.6) {
              const upgradeOptions: NonNullable<CallingType>[] = ['INTERCESSOR', 'WORSHIPPER'];
              const newCalling = upgradeOptions[Math.floor(Math.random() * upgradeOptions.length)];
              targetPerson.calling = newCalling;
              targetPerson.revealGlowTimer = 3.5;
              specificMsg = `${targetPerson.name} 성도가 훈련을 통해 ${newCalling} 사역자로 첫 발을 내딛었습니다!`;
            } else {
              specificMsg = `${targetPerson.name} 성도에게 생명의 말씀을 나누어 복음의 농도가 깊어졌습니다.${hasTeacher ? ' (교사의 동역으로 효과 ↑)' : ''}`;
            }
          } else if (targetPerson.calling === 'INTERCESSOR' || targetPerson.calling === 'WORSHIPPER') {
            if (targetPerson.depth > 75 && targetPerson.readiness > 75 && Math.random() < 0.6) {
              const upgradeOptions: NonNullable<CallingType>[] = ['EVANGELIST', 'SHEPHERD', 'TEACHER'];
              const newCalling = upgradeOptions[Math.floor(Math.random() * upgradeOptions.length)];
              targetPerson.calling = newCalling;
              targetPerson.revealGlowTimer = 3.5;
              specificMsg = `${targetPerson.name} 성도가 양육을 통해 ${newCalling} 사역자로 성장했습니다!`;
            } else {
              specificMsg = `${targetPerson.name} 성도에게 생명의 말씀을 나누어 복음의 농도가 깊어졌습니다.${hasTeacher ? ' (교사의 동역으로 효과 ↑)' : ''}`;
            }
          } else {
            specificMsg = `${targetPerson.name} 성도에게 생명의 말씀을 나누어 복음의 농도가 깊어졌습니다.${hasTeacher ? ' (교사의 동역으로 효과 ↑)' : ''}`;
          }
        } else {
          commMembers.forEach(p => {
            p.depth = Math.min(100, p.depth + (hasTeacher ? 12 : 8));
          });
          community.stats.formation = Math.min(100, community.stats.formation + 15);
          community.stats.integrity = Math.min(100, community.stats.integrity + 15);
          specificMsg = `공동체에 진리의 말씀을 선포하여 복음의 깊이가 확고해졌습니다.${hasTeacher ? ' (교사의 동역으로 효과 ↑)' : ''}`;
        }
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
        // Heals Weariness & bridges care gap
        if (targetPerson) {
          targetPerson.burnout = Math.max(0, targetPerson.burnout - 35);
          targetPerson.stability = Math.min(100, targetPerson.stability + 30);
          targetPerson.leaveIntent = 0;
          if (targetPerson.careStatus === 'UNCARED') targetPerson.careStatus = 'CARED';
          if (targetPerson.need?.type === 'WEARY' || targetPerson.need?.type === 'NEWCOMER') {
            targetPerson.need = null;
          }
          specificMsg = `${targetPerson.name} 성도를 목회적으로 심방하여 상처를 보듬고 안정을 되찾았습니다.${hasShepherd ? ' (목자의 돌봄 협력)' : ''}`;
        } else {
          const uncaredOrWeary = commMembers.filter(p => p.careStatus === 'UNCARED' || p.burnout > 50);
          uncaredOrWeary.forEach(p => {
            p.burnout = Math.max(0, p.burnout - 20);
            p.stability = Math.min(100, p.stability + 15);
            p.careStatus = 'CARED';
          });
          community.stats.care = Math.min(100, community.stats.care + 15);
          specificMsg = '돌봄이 절실한 지체들을 찾아가 그리스도의 사랑으로 위로했습니다.';
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
