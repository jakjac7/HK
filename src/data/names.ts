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
