/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PracticeCard, CardType } from '../types';

export const PRACTICE_CARDS_CATALOG: Record<CardType, Omit<PracticeCard, 'id'>> = {
  MEAL: {
    type: 'MEAL',
    name: 'Shared Meal',
    koreanName: '애찬과 식탁 교제',
    cost: 1,
    description: '함께 떡을 떼며 식탁의 교제를 나누어 마음을 열고 신뢰와 안정을 회복합니다.',
    targetType: 'PERSON',
    icon: 'Utensils',
  },
  WORD: {
    type: 'WORD',
    name: 'Open the Word',
    koreanName: '말씀 나눔 (복음의 깊이)',
    cost: 1,
    description: '생명의 말씀을 펼쳐 복음의 농도를 깊어지게 합니다. (교사와 함께 상고할 때 복음의 깊이가 크게 성장합니다)',
    targetType: 'PERSON',
    icon: 'BookOpen',
  },
  PRAYER: {
    type: 'PRAYER',
    name: 'Pray Together',
    koreanName: '합심 중보기도',
    cost: 1,
    description: '함께 무릎 꿇어 부르짖으며 지체들의 영적 소진을 씻고 공동체의 은혜의 품을 넓힙니다.',
    targetType: 'ANY',
    icon: 'Flame',
  },
  ENCOURAGE: {
    type: 'ENCOURAGE',
    name: 'Encourage',
    koreanName: '지체 사랑과 격려',
    cost: 1,
    description: '사랑과 위로의 말로 지친 영혼을 세우고 그리스도를 향한 섬김의 자리로 이끕니다.',
    targetType: 'PERSON',
    icon: 'Heart',
  },
  RECONCILE: {
    type: 'RECONCILE',
    name: 'Reconcile',
    koreanName: '화해와 용서',
    cost: 2,
    description: '그리스도의 십자가 사랑으로 맺힌 오해를 풀고 지체 간의 분열을 막아 하나됨을 지킵니다.',
    targetType: 'TENSION',
    icon: 'ShieldCheck',
  },
  TRAIN: {
    type: 'TRAIN',
    name: 'Train',
    koreanName: '제자 훈련과 양육',
    cost: 2,
    description: '준비된 지체를 양육하여 개척멤버의 뒤를 잇는 1대·2대·재생산 제자 리더로 세웁니다.',
    targetType: 'READY',
    icon: 'Sparkles',
  },
};

export function createStarterDeck(): PracticeCard[] {
  let counter = 1;
  const list: CardType[] = [
    'MEAL',
    'MEAL',
    'WORD',
    'WORD',
    'PRAYER',
    'ENCOURAGE',
    'RECONCILE',
    'TRAIN',
  ];

  return list.map(type => {
    const template = PRACTICE_CARDS_CATALOG[type];
    return {
      ...template,
      id: `card_${type}_${counter++}`,
    };
  });
}
