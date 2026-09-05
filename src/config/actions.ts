/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PlayerAction, ActionId } from '../types';

export const BASE_ACTIONS_CONFIG: Record<ActionId, Omit<PlayerAction, 'currentCooldown'>> = {
  FELLOWSHIP: {
    id: 'FELLOWSHIP',
    koreanName: '함께하기',
    subtitle: '신뢰 회복과 지체 결속',
    description: '함께 식탁에 앉아 마음을 나누고 지체 간 신뢰를 두텁게 하여 관계의 갈등을 치유합니다.',
    cooldown: 15,
    attentionCost: 1,
    icon: 'Utensils',
    targetType: 'ANY', // Changed to ANY for community-wide action
  },
  WORD: {
    id: 'WORD',
    koreanName: '말씀 선포 (광역)',
    subtitle: '공동체 전체 복음 깊이 증진',
    description: '공동체 전체에 하나님의 생명의 말씀을 힘있게 선포합니다. 모든 성도의 복음 깊이(Depth)가 크게 상승하고 교회의 진리성이 견고해집니다.',
    cooldown: 25,
    attentionCost: 1,
    icon: 'BookOpen',
    targetType: 'STRATEGIC', // Community-wide AoE Skill
  },
  PRAYER: {
    id: 'PRAYER',
    koreanName: '기도',
    subtitle: '영적 회복과 품 확장',
    description: '온 지체가 무릎 꿇어 부르짖음으로 소진된 영혼을 감싸고 공동체의 은혜의 품과 회복력을 넓힙니다.',
    cooldown: 30,
    attentionCost: 1,
    icon: 'Flame',
    targetType: 'ANY',
  },
  WORSHIP: {
    id: 'WORSHIP',
    koreanName: '예배',
    subtitle: '임재와 공동체 일치',
    description: '주를 향한 경배로 온 공동체가 하나로 결속되며, 냉담해진 심령에 첫사랑의 감격을 회복시킵니다.',
    cooldown: 35,
    attentionCost: 1,
    icon: 'Sparkles',
    targetType: 'ANY',
  },
  CARE: {
    id: 'CARE',
    koreanName: '심방/돌봄',
    subtitle: '말씀 확신 심방 & 치유',
    description: '말씀에 확신이 흔들리거나 깊은 회의/의문(QUESTION)이 있는 지체를 1:1 심방하여 확신을 심어주고, 상처와 소진을 보듬어 이탈을 막습니다.',
    cooldown: 20,
    attentionCost: 1,
    icon: 'Heart',
    targetType: 'PERSON',
  },
  SEND: {
    id: 'SEND',
    koreanName: '리더 파송',
    subtitle: '새 지경으로 파송',
    description: '성숙한 제자 리더를 세상의 열린 지경으로 보내어 새로운 공동체를 개척합니다.',
    cooldown: 60,
    attentionCost: 2,
    icon: 'Send',
    targetType: 'STRATEGIC',
  },
};

export function initializeActions(): PlayerAction[] {
  return (Object.keys(BASE_ACTIONS_CONFIG) as ActionId[]).map(id => ({
    ...BASE_ACTIONS_CONFIG[id],
    currentCooldown: 0,
  }));
}
