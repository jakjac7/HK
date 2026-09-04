/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Generation, NeedType, CallingType, CardType } from '../types';

/**
 * 0~100 수치를 직관적인 1~10단계 척도로 단순화 변환
 */
export function toStep10(val: number): number {
  if (isNaN(val) || val <= 0) return 1;
  const step = Math.round(val / 10);
  return Math.min(10, Math.max(1, step));
}

/**
 * 1~10단계 문자열 포맷
 */
export function formatStep10(val: number, showMax: boolean = true): string {
  const step = toStep10(val);
  return showMax ? `${step} / 10단계` : `${step}단계`;
}

/**
 * 세대(Generation) 신앙 명칭
 * G0은 사용자의 요청에 따라 반드시 '개척멤버'로 표현
 */
export function getGenerationLabel(gen: Generation, isExternal?: boolean, hasCalling?: boolean): string {
  if (isExternal) return '이웃 (새로운 영혼)';
  switch (gen) {
    case 0:
      return '개척멤버';
    case 1:
      return hasCalling ? '1대 제자' : '1대 성도';
    case 2:
      return hasCalling ? '2대 제자' : '2대 성도';
    case 3:
      return '재생산 리더 (3대 제자)';
    default:
      return '공동체 지체';
  }
}

/**
 * 은사 직분 한국어 명칭
 */
export function getCallingLabel(calling: CallingType | null): string {
  if (!calling) return '성도';
  switch (calling) {
    case 'EVANGELIST': return '전도자';
    case 'SHEPHERD': return '목자';
    case 'TEACHER': return '교사';
    case 'INTERCESSOR': return '중보기도자';
    case 'WORSHIPPER': return '예배자';
    default: return '사역자';
  }
}

/**
 * 세대 뱃지 스타일
 */
export function getGenerationBadgeStyle(gen: Generation, isExternal?: boolean): string {
  if (isExternal) {
    return 'bg-slate-800 text-slate-300 border-slate-700';
  }
  switch (gen) {
    case 0:
      return 'bg-amber-400/15 text-amber-300 border-amber-400/40 font-bold';
    case 1:
      return 'bg-white/10 text-white/90 border-white/20 font-medium';
    case 2:
      return 'bg-violet-500/20 text-violet-300 border-violet-400/30 font-medium';
    case 3:
      return 'bg-gradient-to-r from-amber-400/20 to-yellow-500/20 text-yellow-300 border-yellow-400/50 font-bold shadow-[0_0_10px_rgba(251,191,36,0.2)]';
    default:
      return 'bg-white/5 text-white/70 border-white/10';
  }
}

/**
 * 신앙 능력치 명칭 및 쉬운 한국어 설명
 */
export const FAITH_STATS = {
  depth: {
    name: '복음의 농도',
    subName: '말씀의 깊이',
    description: '말씀: 성도색 농도가 아니라 복음의 농도가 깊어짐을 의미합니다.',
    meaning: '생명의 말씀이 심령에 깊이 새겨져 진리를 분별하고 흔들리지 않는 깊이',
    accentColor: 'text-indigo-300',
    barColor: 'bg-indigo-400',
  },
  stability: {
    name: '사랑의 정착',
    subName: '돌봄의 안정',
    description: '공동체 안에서 누리는 그리스도의 평안과 정서적 안정입니다.',
    meaning: '상처받지 않고 공동체에 깊이 안착하여 안식을 누리는 마음의 상태',
    accentColor: 'text-emerald-300',
    barColor: 'bg-emerald-400',
  },
  trust: {
    name: '지체 간 신뢰',
    subName: '사랑의 연대',
    description: '지체들과 나누는 깊은 사랑과 신뢰의 연대감입니다.',
    meaning: '서로를 내 몸처럼 믿고 마음을 털어놓을 수 있는 친밀한 신뢰',
    accentColor: 'text-cyan-300',
    barColor: 'bg-cyan-400',
  },
  readiness: {
    name: '사역 헌신도',
    subName: '제자 준비',
    description: '다른 영혼을 품고 제자로 섬길 준비된 성숙도입니다.',
    meaning: '나 자신을 넘어 다음 세대를 훈련하고 섬길 수 있는 영적 준비',
    accentColor: 'text-amber-300',
    barColor: 'bg-amber-400',
  },
  autonomy: {
    name: '자율 생명력',
    subName: '성령의 운행',
    description: '사람의 지시 없이 성령 안에서 스스로 섬기고 자라나는 생명력입니다.',
    meaning: '조직의 통제 없이도 그리스도의 몸으로서 스스로 살아 움직이는 자율성',
    accentColor: 'text-violet-300',
    barColor: 'bg-violet-400',
  },
  burnout: {
    name: '영적 지침',
    subName: '피로와 소진',
    description: '사역과 삶 속에서 겪는 소진으로, 기도의 쉼과 안식이 필요합니다.',
    meaning: '영적 호흡이 가빠지고 탈진된 상태로 목자의 돌봄과 기도가 절실함',
    accentColor: 'text-rose-300',
    barColor: 'bg-rose-400',
  },
  // 공동체 5대 기둥
  word: {
    name: '말씀',
    subName: '복음의 농도',
    description: '말씀: 성도색 농도가 아니라 복음의 농도가 깊어짐을 의미합니다.',
    accentColor: 'text-indigo-400',
    bgColor: 'bg-indigo-400',
  },
  care: {
    name: '돌봄',
    subName: '사랑의 교제',
    description: '서로의 아픔을 보듬고 마음을 엮어 안정된 평안을 이룹니다.',
    accentColor: 'text-emerald-400',
    bgColor: 'bg-emerald-400',
  },
  worship: {
    name: '예배',
    subName: '경배와 감격',
    description: '주님을 향한 온전한 찬양으로 공동체 영역에 임재의 빛이 가득합니다.',
    accentColor: 'text-pink-400',
    bgColor: 'bg-pink-400',
  },
  prayer: {
    name: '기도',
    subName: '은혜의 품',
    description: '무릎의 중보로 시험을 이기며 많은 영혼을 품는 수용력이 자랍니다.',
    accentColor: 'text-amber-400',
    bgColor: 'bg-amber-400',
  },
  mission: {
    name: '전도',
    subName: '잃은 양 찾음',
    description: '울타리를 넘어 세상의 잃어버린 영혼에게 복음의 다리를 놓습니다.',
    accentColor: 'text-cyan-400',
    bgColor: 'bg-cyan-400',
  },
  harmony: {
    name: '몸의 건강도',
    subName: '온전한 연합',
    description: '말씀, 돌봄, 예배, 기도, 전도가 균형을 이루는 그리스도의 몸의 상태입니다.',
    accentColor: 'text-amber-300',
    bgColor: 'bg-amber-400',
  },
  safeCapacity: {
    name: '은혜의 품',
    subName: '품는 수용력',
    description: '공동체가 찢어지지 않고 안전하게 품을 수 있는 영혼의 한계치입니다.',
    accentColor: 'text-white/80',
    bgColor: 'bg-white/20',
  },
} as const;

/**
 * 영적 필요(Need) 신앙 용어 정의
 */
export function getNeedDetails(type: NeedType): {
  title: string;
  prescription: string;
  badgeClass: string;
} {
  switch (type) {
    case 'QUESTION':
      return {
        title: '말씀에 대한 영적 갈망과 질문',
        prescription: '교사의 말씀 나눔(Open the Word)으로 복음의 깊이를 더해주세요.',
        badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      };
    case 'NEWCOMER':
      return {
        title: '처음 연결된 낯선 새가족',
        prescription: '애찬과 식탁 교제(Shared Meal)로 따뜻한 환대와 사랑을 베풀어주세요.',
        badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      };
    case 'WEARY':
      return {
        title: '사역과 일상에 지친 심령',
        prescription: '합심 기도(Pray Together)와 지체 격려로 영적 새 힘을 북돋워주세요.',
        badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      };
    case 'TENSION':
      return {
        title: '지체 간의 오해와 관계적 갈등',
        prescription: '십자가의 화해와 용서(Reconcile)로 하나됨을 회복해주세요.',
        badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      };
    case 'READY':
      return {
        title: '제자로 헌신할 준비된 성숙',
        prescription: '제자 훈련(Train)을 통해 세대를 잇는 영적 리더로 세워주세요.',
        badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      };
  }
}
