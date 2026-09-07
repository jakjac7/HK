/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// 2000s-2020s Korean authentic names (>50 male, >50 female)
export const KOREAN_MALE_NAMES: string[] = [
  '민준', '서준', '도윤', '예준', '시우', '하준', '지호', '주원', '지후', '준서',
  '준우', '현우', '도현', '지훈', '건우', '우진', '선우', '서진', '민재', '현준',
  '연우', '유준', '정우', '승우', '승현', '시윤', '준혁', '은우', '지환', '윤우',
  '승민', '진우', '태윤', '이준', '민성', '지안', '성민', '동현', '준영', '재원',
  '태민', '시환', '상우', '은성', '규민', '태현', '지원', '민규', '영민', '하민',
  '재윤', '수현', '찬우', '태양', '성현', '진서', '한결', '다온', '로운', '이안'
];

export const KOREAN_FEMALE_NAMES: string[] = [
  '서연', '서윤', '지우', '서현', '하은', '하윤', '민서', '지민', '채원', '수아',
  '지아', '윤서', '다은', '은서', '예은', '수빈', '지유', '소율', '예린', '예원',
  '지원', '시은', '하린', '유나', '채은', '유진', '소은', '나은', '서은', '민지',
  '예나', '수민', '다인', '아린', '가은', '다윤', '아인', '세아', '하율', '서영',
  '유주', '혜원', '소윤', '채아', '연우', '윤아', '보민', '은채', '다솜', '한별',
  '단아', '라온', '솔아', '은유', '하늬', '봄', '예솔', '하영', '주아', '시아'
];

export const GLOBAL_NAMES: { name: string; gender: 'M' | 'F' }[] = [
  // Biblical & Classic
  { name: 'Peter', gender: 'M' },
  { name: 'John', gender: 'M' },
  { name: 'Paul', gender: 'M' },
  { name: 'Timothy', gender: 'M' },
  { name: 'Luke', gender: 'M' },
  { name: 'Andrew', gender: 'M' },
  { name: 'Stephen', gender: 'M' },
  { name: 'Philip', gender: 'M' },
  { name: 'Barnabas', gender: 'M' },
  { name: 'Silas', gender: 'M' },
  { name: 'Mary', gender: 'F' },
  { name: 'Martha', gender: 'F' },
  { name: 'Lydia', gender: 'F' },
  { name: 'Priscilla', gender: 'F' },
  { name: 'Phoebe', gender: 'F' },
  { name: 'Hannah', gender: 'F' },
  { name: 'Ruth', gender: 'F' },
  { name: 'Esther', gender: 'F' },
  { name: 'Dorcas', gender: 'F' },
  { name: 'Chloe', gender: 'F' },
  // Modern
  { name: 'Ethan', gender: 'M' },
  { name: 'Lucas', gender: 'M' },
  { name: 'Noah', gender: 'M' },
  { name: 'Caleb', gender: 'M' },
  { name: 'Liam', gender: 'M' },
  { name: 'Emma', gender: 'F' },
  { name: 'Grace', gender: 'F' },
  { name: 'Joy', gender: 'F' },
  { name: 'Hope', gender: 'F' },
  { name: 'Faith', gender: 'F' }
];

export class NameGenerator {
  private usedNames: Set<string> = new Set();
  private isKoreanTheme: boolean = true;

  constructor(isKorean: boolean = true) {
    this.isKoreanTheme = isKorean;
  }

  public setTheme(isKorean: boolean) {
    this.isKoreanTheme = isKorean;
  }

  public reset() {
    this.usedNames.clear();
  }

  public generate(preferredGender?: 'M' | 'F'): { name: string; gender: 'M' | 'F' } {
    const gender = preferredGender || (Math.random() < 0.5 ? 'M' : 'F');

    if (this.isKoreanTheme) {
      const pool = gender === 'M' ? KOREAN_MALE_NAMES : KOREAN_FEMALE_NAMES;
      const available = pool.filter(n => !this.usedNames.has(n));
      
      let selected: string;
      if (available.length > 0) {
        selected = available[Math.floor(Math.random() * available.length)];
      } else {
        // Fallback with subtle ordinal if all exhausted
        selected = `${pool[Math.floor(Math.random() * pool.length)]}${this.usedNames.size + 1}`;
      }
      this.usedNames.add(selected);
      return { name: selected, gender };
    } else {
      const available = GLOBAL_NAMES.filter(item => item.gender === gender && !this.usedNames.has(item.name));
      let selected: string;
      if (available.length > 0) {
        selected = available[Math.floor(Math.random() * available.length)].name;
      } else {
        selected = `Member${this.usedNames.size + 1}`;
      }
      this.usedNames.add(selected);
      return { name: selected, gender };
    }
  }
}

/**
 * 성경적 및 초기 교회의 도시/지명 기반 공동체 명칭 풀
 */
export const COMMUNITY_NAME_POOL: string[] = [
  '안디옥 공동체',
  '빌립보 공동체',
  '에베소 공동체',
  '데살로니가 공동체',
  '베뢰아 공동체',
  '고린도 공동체',
  '골로새 공동체',
  '서머나 공동체',
  '버가모 공동체',
  '두아디라 공동체',
  '사데 공동체',
  '라오디게아 공동체',
  '예루살렘 공동체',
  '갈릴리 공동체',
  '벧엘 공동체',
  '엠마오 공동체',
  '헤브론 공동체',
  '시온 공동체',
  '실로 공동체',
  '가버나움 공동체',
  '다메섹 공동체',
  '욥바 공동체',
  '마케도니아 공동체',
  '로마 공동체',
  '아테네 공동체',
  '드로아 공동체',
];

/**
 * 중복을 피해 무작위 공동체 이름을 반환하는 함수
 */
export function getRandomCommunityName(excludeNames: string[] = []): string {
  const available = COMMUNITY_NAME_POOL.filter(name => !excludeNames.includes(name));
  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)];
  }
  // 풀이 모두 소진되었을 경우 안전한 인덱스 접미사 부여
  const base = COMMUNITY_NAME_POOL[Math.floor(Math.random() * COMMUNITY_NAME_POOL.length)];
  return `${base.replace(' 공동체', '')} ${excludeNames.length + 1} 공동체`;
}
