/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { Generation, NeedType, CallingType } from '../types';

/**
 * 0~100 수치를 직관적인 1~10단계 척도로 단순화 변환 (호환용)
 */
export function toStep10(val: number): number {
  if (isNaN(val) || val <= 0) return 1;
  const step = Math.round(val / 10);
  return Math.min(10, Math.max(1, step));
}

/**
 * 1~10단계 문자열 포맷 (호환용)
 */
export function formatStep10(val: number, showMax: boolean = true): string {
  const step = toStep10(val);
  return showMax ? `${step} / 10단계` : `${step}단계`;
}

/**
 * 영성지수 및 능력치 5단계 질적 추상화 (매우나쁨 · 나쁨 · 보통 · 좋음 · 아주좋음)
 */
export type FaithGrade5 = '매우나쁨' | '나쁨' | '보통' | '좋음' | '아주좋음';

export interface FaithGradeMeta {
  grade: FaithGrade5;
  level: number;       // 1 ~ 5
  color: string;       // 텍스트 색상
  badge: string;       // 뱃지 배경 + 테두리 + 텍스트
  barColor: string;    // 게이지 채움 색상
  gaugeWidth: string;  // 게이지 % 폭
  description: string; // 친절한 성경적 영적 상태 설명
}

/**
 * 0~100 수치를 5단계 질적 상태로 변환
 * @param val 0 ~ 100 사이의 수치
 * @param inverted true인 경우(예: 피로/소진도), 수치가 높을수록 상태가 나쁨
 */
export function toFaithGrade5(val: number, inverted: boolean = false): FaithGradeMeta {
  const raw = isNaN(val) ? 0 : Math.max(0, Math.min(100, val));
  const score = inverted ? (100 - raw) : raw;

  if (score <= 20) {
    return {
      grade: '매우나쁨',
      level: 1,
      color: 'text-rose-400',
      badge: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
      barColor: 'bg-rose-500',
      gaugeWidth: '20%',
      description: inverted ? '심각한 영적 탈진 (쉼과 중보가 절실합니다)' : '심각한 결핍과 돌봄이 시급한 상태',
    };
  }
  if (score <= 40) {
    return {
      grade: '나쁨',
      level: 2,
      color: 'text-orange-400',
      badge: 'bg-orange-500/15 text-orange-300 border-orange-500/40',
      barColor: 'bg-orange-400',
      gaugeWidth: '40%',
      description: inverted ? '피로 누적 중 (안식과 양육이 필요합니다)' : '보살핌과 말씀 양육이 필요한 상태',
    };
  }
  if (score <= 60) {
    return {
      grade: '보통',
      level: 3,
      color: 'text-amber-300',
      badge: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
      barColor: 'bg-amber-400',
      gaugeWidth: '60%',
      description: inverted ? '평이한 활력 (무리 없는 상태)' : '완만하게 자라나고 있는 상태',
    };
  }
  if (score <= 80) {
    return {
      grade: '좋음',
      level: 4,
      color: 'text-emerald-300',
      badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
      barColor: 'bg-emerald-400',
      gaugeWidth: '80%',
      description: inverted ? '충분한 쉼과 평안' : '건강하고 든든하게 성숙한 상태',
    };
  }
  return {
    grade: '아주좋음',
    level: 5,
    color: 'text-cyan-300',
    badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40',
    barColor: 'bg-cyan-400',
    gaugeWidth: '100%',
    description: inverted ? '온전한 안식과 성령의 충만함' : '생명력이 충만하고 풍성한 열매를 맺는 상태',
  };
}

/**
 * 세대(Generation) 신앙 명칭
 */
export function getGenerationLabel(gen: Generation, isExternal?: boolean, hasCalling?: boolean): string {
  if (isExternal) return '이웃';
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
      return '성도';
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
    name: '말씀 깊이',
    subName: '복음의 이해',
    description: '말씀과 복음에 대한 깊이를 의미합니다.',
    meaning: '진리를 분별하고 흔들리지 않는 깊이',
    accentColor: 'text-indigo-300',
    barColor: 'bg-indigo-400',
  },
  stability: {
    name: '사랑의 정착',
    subName: '돌봄의 안정',
    description: '공동체 안에서 누리는 평안과 정서적 안정입니다.',
    meaning: '공동체에 깊이 안착하여 안식을 누리는 마음의 상태',
    accentColor: 'text-emerald-300',
    barColor: 'bg-emerald-400',
  },
  trust: {
    name: '성도 간 신뢰',
    subName: '사랑의 연대',
    description: '성도들과 나누는 깊은 사랑과 신뢰의 연대감입니다.',
    meaning: '서로를 내 몸처럼 믿고 마음을 털어놓을 수 있는 신뢰',
    accentColor: 'text-cyan-300',
    barColor: 'bg-cyan-400',
  },
  readiness: {
    name: '사역 헌신도',
    subName: '제자 준비',
    description: '다른 이웃을 품고 제자로 섬길 준비된 성숙도입니다.',
    meaning: '다음 세대를 훈련하고 섬길 수 있는 준비',
    accentColor: 'text-amber-300',
    barColor: 'bg-amber-400',
  },
  autonomy: {
    name: '성령충만',
    subName: '자발적 섬김',
    description: '성령에 의지하여 지시 없이도 스스로 섬기고 자라나는 생명력입니다.',
    meaning: '성령으로 충만하여 스스로 살아 움직이는 자율성',
    accentColor: 'text-violet-300',
    barColor: 'bg-violet-400',
  },
  burnout: {
    name: '소진 (피로)',
    subName: '휴식 필요',
    description: '사역과 삶 속에서 겪는 소진으로, 쉼이 필요합니다.',
    meaning: '탈진된 상태로 돌봄과 쉼이 절실함',
    accentColor: 'text-rose-300',
    barColor: 'bg-rose-400',
  },
  // 공동체 5대 기둥
  word: {
    name: '말씀',
    subName: '복음의 이해',
    description: '진리를 깊이 이해하고 분별하는 힘입니다.',
    accentColor: 'text-indigo-400',
    bgColor: 'bg-indigo-400',
  },
  care: {
    name: '돌봄',
    subName: '사랑의 교제',
    description: '서로의 아픔을 보듬고 마음을 엮어 평안을 이룹니다.',
    accentColor: 'text-emerald-400',
    bgColor: 'bg-emerald-400',
  },
  worship: {
    name: '예배',
    subName: '경배와 감격',
    description: '온전한 찬양으로 공동체에 기쁨이 가득합니다.',
    accentColor: 'text-pink-400',
    bgColor: 'bg-pink-400',
  },
  prayer: {
    name: '기도',
    subName: '위로와 중보',
    description: '기도로 위기를 이기며 넉넉한 수용력이 자랍니다.',
    accentColor: 'text-amber-400',
    bgColor: 'bg-amber-400',
  },
  mission: {
    name: '전도',
    subName: '이웃 사랑',
    description: '울타리를 넘어 세상의 이웃에게 복음을 전합니다.',
    accentColor: 'text-cyan-400',
    bgColor: 'bg-cyan-400',
  },
  harmony: {
    name: '건강도',
    subName: '온전한 연합',
    description: '모든 사역이 균형을 이루는 공동체의 상태입니다.',
    accentColor: 'text-amber-300',
    bgColor: 'bg-amber-400',
  },
  safeCapacity: {
    name: '수용력',
    subName: '돌봄의 한계',
    description: '공동체가 무리 없이 품을 수 있는 사람의 한계치입니다.',
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
        title: '진리에 대한 갈망과 질문',
        prescription: '교사의 말씀 나눔으로 이해를 도와주세요.',
        badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      };
    case 'NEWCOMER':
      return {
        title: '처음 방문한 낯선 새가족',
        prescription: '식탁 교제로 따뜻한 환대와 사랑을 베풀어주세요.',
        badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      };
    case 'WEARY':
      return {
        title: '사역과 일상에 지친 상태',
        prescription: '합심 기도와 격려로 새 힘을 북돋워주세요.',
        badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      };
    case 'TENSION':
      return {
        title: '성도 간의 오해와 갈등',
        prescription: '화해와 용서로 하나됨을 회복해주세요.',
        badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      };
    case 'READY':
      return {
        title: '다음 리더로 헌신할 준비됨',
        prescription: '훈련을 통해 다음 리더로 세워주세요.',
        badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      };
  }
}
