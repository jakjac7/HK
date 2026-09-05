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
    targetType: 'PERSON',
  },
  WORD: {
    id: 'WORD',
    koreanName: '말씀',
    subtitle: '복음의 농도 심화',
    description: '생명의 진리를 선포하여 복음의 깊이를 더하고, 공동체 안에 스며든 왜곡과 혼란을 바로잡습니다.',
    cooldown: 25,
    attentionCost: 1,
    icon: 'BookOpen',
    targetType: 'PERSON',
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
    koreanName: '돌봄',
    subtitle: '지친 영혼 심방',
    description: '목자의 손길로 상처받거나 방치된 지체를 따뜻하게 품어 정서적 안정을 주고 이탈을 막습니다.',
    cooldown: 20,
    attentionCost: 1,
    icon: 'Heart',
    targetType: 'PERSON',
  },
  SEND: {
    id: 'SEND',
    koreanName: '분립 개척',
    subtitle: '새 지경으로 파송',
    description: '성숙한 제자 리더를 세상의 열린 지경으로 믿음의 분립 개척을 위해 파송합니다.',
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
