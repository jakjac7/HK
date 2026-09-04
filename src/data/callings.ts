/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CallingType } from '../types';

export interface CallingInfo {
  type: NonNullable<CallingType>;
  name: string;
  koreanName: string;
  icon: string; // Lucide icon key or symbol
  symbol: string;
  themeColor: string;
  textColor: string;
  bgLight: string;
  description: string;
  movementProfile: string;
  visualEffect: string;
  strategicRole: string;
  riskIfImbalanced: string;
}

export const CALLING_DEFINITIONS: Record<NonNullable<CallingType>, CallingInfo> = {
  EVANGELIST: {
    type: 'EVANGELIST',
    name: 'Evangelist',
    koreanName: '전도자',
    icon: 'Compass',
    symbol: '🧭',
    themeColor: '#06b6d4', // Cyan
    textColor: 'text-cyan-400',
    bgLight: 'bg-cyan-500/15 border-cyan-500/30',
    description: '공동체의 울타리를 넘어 길 잃은 영혼을 찾아가며, 복음의 다리를 놓아 새가족을 주님의 품으로 이끕니다.',
    movementProfile: '공동체 안팎을 오가며 외부 이웃과 만나 그리스도의 사랑을 전함',
    visualEffect: '외부 영혼을 향한 만남의 길을 열고 새가족의 유입을 인도',
    strategicRole: '잃은 양 찾음과 선교 지경 확장',
    riskIfImbalanced: '과도하면 내부 돌봄과 말씀 양육의 기초가 옅어질 수 있음',
  },
  SHEPHERD: {
    type: 'SHEPHERD',
    name: 'Shepherd',
    koreanName: '목자',
    icon: 'HeartHandshake',
    symbol: '🤍',
    themeColor: '#10b981', // Emerald
    textColor: 'text-emerald-400',
    bgLight: 'bg-emerald-500/15 border-emerald-500/30',
    description: '지치고 방황하는 영혼을 따뜻이 품고 돌보아 공동체 안에서 사랑으로 굳건히 정착하도록 돕습니다.',
    movementProfile: '경계 외곽을 순찰하며 낙심한 지체를 찾아 심방하고 중심부로 인도',
    visualEffect: '흔들리는 지체를 사랑으로 붙들어 평안과 정착을 이룸',
    strategicRole: '이탈 방지와 사랑의 돌봄 정착',
    riskIfImbalanced: '과도하면 외부를 향한 복음 전파가 위축되고 내부 안주 위험',
  },
  TEACHER: {
    type: 'TEACHER',
    name: 'Teacher',
    koreanName: '교사',
    icon: 'BookOpen',
    symbol: '📖',
    themeColor: '#6366f1', // Indigo / Violet
    textColor: 'text-indigo-400',
    bgLight: 'bg-indigo-500/15 border-indigo-500/30',
    description: '생명의 말씀을 가르쳐 복음의 농도를 깊어지게 하고, 거짓 가르침과 왜곡된 생각을 분별하여 지킵니다.',
    movementProfile: '지체들과 일대일 및 소그룹으로 성경을 상고하며 진리를 나눔',
    visualEffect: '말씀: 성도색 농도가 아니라 복음의 농도가 깊어짐을 의미합니다 (1~10단계 성장)',
    strategicRole: '말씀 양육과 진리 분별 수호',
    riskIfImbalanced: '교사 부재 시 거짓 가르침(미혹)에 흔들리기 쉬움',
  },
  INTERCESSOR: {
    type: 'INTERCESSOR',
    name: 'Intercessor',
    koreanName: '중보기도자',
    icon: 'Flame',
    symbol: '🔥',
    themeColor: '#f59e0b', // Amber
    textColor: 'text-amber-400',
    bgLight: 'bg-amber-500/15 border-amber-500/30',
    description: '상처와 위기 앞에서 눈물로 무릎 꿇어 부르짖으며, 지체들의 영적 소진을 대신 품고 공동체의 은혜의 품을 넓힙니다.',
    movementProfile: '영적 소진과 시험이 닥친 자리를 찾아가 기도의 제단을 쌓음',
    visualEffect: '은혜의 품(품는 수용력) 확장 및 지친 지체의 피로 경감',
    strategicRole: '영적 방패와 기도의 은혜의 품 확장',
    riskIfImbalanced: '기도의 뒷받침이 없으면 인원이 늘 때 공동체가 찢어지거나 탈진',
  },
  WORSHIPPER: {
    type: 'WORSHIPPER',
    name: 'Worshipper',
    koreanName: '예배자',
    icon: 'Sparkles',
    symbol: '✨',
    themeColor: '#ec4899', // Pink / Rose
    textColor: 'text-pink-400',
    bgLight: 'bg-pink-500/15 border-pink-500/30',
    description: '주님을 향한 온전한 찬양과 경배로 지체들의 시선을 주께 모으며, 하나님 나라의 기쁨과 임재를 부어줍니다.',
    movementProfile: '찬양과 기도로 회중의 중심을 향해 지체들을 불러 모음',
    visualEffect: '공동체 영역에 주님의 거룩한 임재와 영적 감격이 뚜렷해짐',
    strategicRole: '성령 안의 하나됨과 거룩한 임재 회복',
    riskIfImbalanced: '말씀의 깊이 없이 예배만 강조되면 감정주의에 치우칠 위험',
  },
};
