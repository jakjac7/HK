/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Person, RoutineStage, LifeRoutine, MapZone, PersonaType } from '../types';
import { MapSystem } from './MapSystem';

/**
 * Maps zone IDs from different maps to core routine life categories:
 * - RESIDENCE (주거지, 기숙사, 과수원)
 * - WORK_CAMPUS (대학 강의실/연구실, 비즈니스 빌딩, 배움터)
 * - CAFE (청년 카페거리, 상업 문화지구, 오일장 장터)
 * - TRANSIT (환승역, 중앙역, 마을 안길)
 */
export function categorizeZoneId(zoneId: string): RoutineStage {
  const upper = zoneId.toUpperCase();

  // Residence matches
  if (upper.includes('DORM') || upper.includes('RESIDENTIAL') || upper.includes('OUTSKIRTS')) {
    return 'RESIDENCE';
  }

  // Work / Study matches
  if (upper.includes('CAMPUS') || upper.includes('PLAZA') || upper.includes('OFFICE') || upper.includes('SCHOOL')) {
    return 'WORK_CAMPUS';
  }

  // Cafe / Leisure matches
  if (upper.includes('CAFE') || upper.includes('COMMERCIAL') || upper.includes('MARKET')) {
    return 'CAFE';
  }

  // Transit / Hub matches
  if (upper.includes('STATION') || upper.includes('VILLAGE')) {
    return 'TRANSIT';
  }

  return 'CAFE';
}

export function getRoutineActivityIcon(stage: RoutineStage): string {
  switch (stage) {
    case 'RESIDENCE':
      return '🏡';
    case 'WORK_CAMPUS':
      return '📚';
    case 'CAFE':
      return '☕';
    case 'TRANSIT':
      return '🚇';
    default:
      return '🚶';
  }
}

export interface ZoneSpot {
  id: string;
  name: string;
  stage: RoutineStage;
  relDist: number; // 0.0 - 0.75 of radius
  angle: number; // angle in radians
  pairWithSpotIndex?: number; // for cafe 2-person tables
}

/**
 * Concrete realistic spots inside each routine stage
 */
export const ZONE_STAGE_SPOTS: Record<RoutineStage, { name: string; icon: string; pairWithNext?: boolean }[]> = {
  CAFE: [
    { name: '테라스 창가 2인석 A', icon: '☕', pairWithNext: true },
    { name: '테라스 창가 2인석 B', icon: '☕' },
    { name: '원목 바 테이블', icon: '☕' },
    { name: '중앙 라운지 소파석', icon: '☕' },
    { name: '스터디 큐브 독서석', icon: '☕' },
    { name: '야외 파라솔 테이블', icon: '☕' },
  ],
  WORK_CAMPUS: [
    { name: '중앙도서관 3열람실', icon: '📚', pairWithNext: true },
    { name: '도서관 자율학습석', icon: '📚' },
    { name: '공학관 세미나실', icon: '📚' },
    { name: '캠퍼스 잔디광장 벤치', icon: '📚' },
    { name: '학술연구실 랩탑석', icon: '📚' },
    { name: '학생회관 오픈라운지', icon: '📚' },
  ],
  RESIDENCE: [
    { name: '기숙사 A동 개인실', icon: '🏡' },
    { name: '기숙사 휴게 라운지', icon: '🏡', pairWithNext: true },
    { name: '기숙사 스터디룸', icon: '🏡' },
    { name: '원룸촌 정원 쉼터', icon: '🏡' },
    { name: '주거지 산책로 벤치', icon: '🏡' },
  ],
  TRANSIT: [
    { name: '1번 출구 만남의 광장', icon: '🚇', pairWithNext: true },
    { name: '환승 통로 대기석', icon: '🚇' },
    { name: '중앙역 시계탑 앞', icon: '🚇' },
    { name: '버스 정류장 쉘터', icon: '🚇' },
    { name: '보행자 전용거리', icon: '🚇' },
  ],
};

/**
 * Schedules tailored by persona
 */
export const PERSONA_SCHEDULES: Record<PersonaType, RoutineStage[][]> = {
  STUDENT: [
    ['RESIDENCE', 'WORK_CAMPUS', 'CAFE', 'WORK_CAMPUS', 'RESIDENCE'],
    ['RESIDENCE', 'CAFE', 'WORK_CAMPUS', 'TRANSIT', 'RESIDENCE'],
    ['WORK_CAMPUS', 'CAFE', 'RESIDENCE', 'CAFE', 'WORK_CAMPUS'],
  ],
  RESEARCHER: [
    ['RESIDENCE', 'WORK_CAMPUS', 'CAFE', 'WORK_CAMPUS', 'TRANSIT'],
    ['WORK_CAMPUS', 'CAFE', 'WORK_CAMPUS', 'RESIDENCE'],
  ],
  JOB_SEEKER: [
    ['RESIDENCE', 'CAFE', 'WORK_CAMPUS', 'CAFE', 'RESIDENCE'],
    ['CAFE', 'WORK_CAMPUS', 'TRANSIT', 'RESIDENCE'],
  ],
  PROFESSIONAL: [
    ['TRANSIT', 'WORK_CAMPUS', 'CAFE', 'WORK_CAMPUS', 'TRANSIT', 'RESIDENCE'],
    ['RESIDENCE', 'TRANSIT', 'WORK_CAMPUS', 'CAFE', 'RESIDENCE'],
  ],
  RESIDENT: [
    ['RESIDENCE', 'CAFE', 'TRANSIT', 'CAFE', 'RESIDENCE'],
    ['RESIDENCE', 'TRANSIT', 'CAFE', 'RESIDENCE'],
  ],
};

export const PERSONA_TITLES: Record<PersonaType, string> = {
  STUDENT: '대학생',
  RESEARCHER: '연구원',
  JOB_SEEKER: '취업준비생',
  PROFESSIONAL: '청년 직장인',
  RESIDENT: '동네 청년',
};

/**
 * Generates an appropriate Persona based on age and map profile
 */
export function determinePersona(person: Person, mapId: string): PersonaType {
  const hash = person.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  if (mapId === 'CAMPUS') {
    if (person.ageBand === 'SENIOR') return 'RESIDENT';
    const roll = hash % 100;
    if (roll < 55) return 'STUDENT';
    if (roll < 75) return 'RESEARCHER';
    if (roll < 90) return 'JOB_SEEKER';
    return 'PROFESSIONAL';
  } else if (mapId === 'DOWNTOWN') {
    const roll = hash % 100;
    if (roll < 50) return 'PROFESSIONAL';
    if (roll < 75) return 'JOB_SEEKER';
    if (roll < 88) return 'STUDENT';
    return 'RESIDENT';
  } else {
    // COUNTRYSIDE
    const roll = hash % 100;
    if (roll < 45) return 'RESIDENT';
    if (roll < 70) return 'STUDENT';
    return 'PROFESSIONAL';
  }
}

/**
 * Returns dynamic, authentic activity label based on persona, stage, spot, and dwelling status
 */
export function getEnrichedActivityLabel(
  persona: PersonaType,
  stage: RoutineStage,
  zoneName: string,
  spotName: string,
  isDwelling: boolean,
  hasSocialPartner: boolean
): string {
  if (!isDwelling) {
    switch (stage) {
      case 'RESIDENCE':
        return `${zoneName} (숙소)로 발걸음 옮기는 중`;
      case 'WORK_CAMPUS':
        return `${zoneName} 강의실·열람실로 이동 중`;
      case 'CAFE':
        return `${zoneName}로 커피 한 잔 마시러 가는 중`;
      case 'TRANSIT':
        return `${zoneName} 쪽으로 걸어가는 중`;
    }
  }

  if (hasSocialPartner) {
    if (stage === 'CAFE') return `${spotName}에서 친구와 따뜻한 차 한 잔 나누며 대화 중`;
    if (stage === 'WORK_CAMPUS') return `${spotName}에서 동기들과 과제 내용 토론 중`;
    if (stage === 'RESIDENCE') return `${spotName}에서 룸메이트와 하루 일과 이야기 중`;
    if (stage === 'TRANSIT') return `${spotName}에서 약속된 친구를 만나 반갑게 인사 중`;
  }

  switch (stage) {
    case 'CAFE':
      if (persona === 'JOB_SEEKER') return `${spotName}에서 취업 자격증 기출 풀이 중`;
      if (persona === 'STUDENT') return `${spotName}에서 노트북 펴고 전공 리포트 작성 중`;
      if (persona === 'RESEARCHER') return `${spotName}에서 에스프레소 마시며 논문 구상`;
      return `${spotName}에서 커피 마시며 여유롭게 독서 중`;

    case 'WORK_CAMPUS':
      if (persona === 'RESEARCHER') return `${spotName}에서 실험 데이터 분석 및 검토 중`;
      if (persona === 'JOB_SEEKER') return `${spotName}에서 조용히 집중 열람실 공부`;
      if (persona === 'PROFESSIONAL') return `${spotName}에서 오전 비즈니스 미팅 집중`;
      return `${spotName}에서 전공 강의 청강 및 필기 정리`;

    case 'RESIDENCE':
      return `${spotName}에서 음악을 듣고 재충전하며 휴식 중`;

    case 'TRANSIT':
      return `${spotName} 주변에서 산책하며 일상 환승 이동`;
  }
}

/**
 * Finds the concrete zone matching a specific routine stage
 */
export function findZoneForStage(
  stage: RoutineStage,
  absoluteZones: (MapZone & { x: number; y: number; radius: number })[]
): (MapZone & { x: number; y: number; radius: number }) | null {
  for (const z of absoluteZones) {
    if (categorizeZoneId(z.id) === stage) {
      return z;
    }
  }
  return absoluteZones[0] || null;
}

/**
 * Calculates a dedicated spot coordinate inside a zone
 */
export function calculateSpotCoordinate(
  zone: MapZone & { x: number; y: number; radius: number },
  spotIndex: number,
  totalSpots: number
): { x: number; y: number; offsetX: number; offsetY: number } {
  // Angle distributed around circle with slight organic asymmetry
  const baseAngle = (spotIndex / Math.max(1, totalSpots)) * Math.PI * 2;
  // Distance between 25% and 65% of radius to keep inside zone perimeter
  const dist = zone.radius * (0.28 + 0.35 * ((spotIndex % 3) * 0.3 + 0.3));
  const offsetX = Math.cos(baseAngle) * dist;
  const offsetY = Math.sin(baseAngle) * dist;

  return {
    x: zone.x + offsetX,
    y: zone.y + offsetY,
    offsetX,
    offsetY,
  };
}

/**
 * Initializes an individualized routine for an external soul
 * @param spawnAtZone If true, immediately sets person.x and person.y to their starting location
 */
export function initializePersonRoutine(
  person: Person,
  mapSystem: MapSystem,
  worldWidth: number,
  worldHeight: number,
  spawnAtZone: boolean = false
): void {
  const zones = mapSystem.getAbsoluteZones(worldWidth, worldHeight);
  if (!zones || zones.length === 0) return;

  const mapId = mapSystem.getMapProfile().id;
  const persona = determinePersona(person, mapId);
  const personaTitle = PERSONA_TITLES[persona];

  // Pick a schedule pattern for this persona
  const hash = person.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const schedules = PERSONA_SCHEDULES[persona];
  const schedule = schedules[hash % schedules.length];

  // Start at a varied cycle stage so souls are naturally dispersed across the city
  const startCycleIdx = (hash + Math.floor(person.wobbleOffset * 7)) % schedule.length;
  const currentStage = schedule[startCycleIdx];
  const targetZone = findZoneForStage(currentStage, zones);

  if (!targetZone) return;

  // Pick a distinct spot in the target zone
  const spots = ZONE_STAGE_SPOTS[currentStage];
  const spotIndex = hash % spots.length;
  const spotDef = spots[spotIndex];
  const spotCoord = calculateSpotCoordinate(targetZone, spotIndex, spots.length);

  // 70% start already dwelling at their spot, 30% walking en route
  const startDwelling = (hash % 10) < 7;
  const dwellDuration = 16 + (hash % 15); // 16 ~ 30s

  const activityLabel = getEnrichedActivityLabel(
    persona,
    currentStage,
    targetZone.name,
    spotDef.name,
    startDwelling,
    false
  );

  person.routine = {
    stage: currentStage,
    targetZoneId: targetZone.id,
    targetZoneName: targetZone.name,
    targetX: spotCoord.x,
    targetY: spotCoord.y,
    isDwelling: startDwelling,
    timer: startDwelling ? dwellDuration * (0.35 + 0.65 * ((hash % 100) / 100)) : 12 + (hash % 8),
    dwellDuration,
    activityLabel,
    activityIcon: getRoutineActivityIcon(currentStage),
    cycleSchedule: schedule,
    cycleIndex: startCycleIdx,
    personalOffset: { x: spotCoord.offsetX, y: spotCoord.offsetY },
    persona,
    personaTitle,
    spotName: spotDef.name,
    partnerId: null,
    walkPhase: hash % 10,
  };

  // If requested, place the person directly at their natural starting spot!
  if (spawnAtZone) {
    if (startDwelling) {
      person.x = spotCoord.x;
      person.y = spotCoord.y;
    } else {
      // Starting on their way: offset slightly towards previous stage zone
      const prevStage = schedule[(startCycleIdx - 1 + schedule.length) % schedule.length];
      const prevZone = findZoneForStage(prevStage, zones) || targetZone;
      const progress = 0.3 + 0.4 * ((hash % 10) / 10);
      person.x = prevZone.x + (spotCoord.x - prevZone.x) * progress;
      person.y = prevZone.y + (spotCoord.y - prevZone.y) * progress;
    }
  }
}

/**
 * Advances a soul's routine to the next landmark zone in their daily schedule
 */
export function advancePersonRoutine(
  person: Person,
  mapSystem: MapSystem,
  worldWidth: number,
  worldHeight: number
): void {
  if (!person.routine) {
    initializePersonRoutine(person, mapSystem, worldWidth, worldHeight);
    return;
  }

  const zones = mapSystem.getAbsoluteZones(worldWidth, worldHeight);
  if (!zones || zones.length === 0) return;

  const nextIndex = (person.routine.cycleIndex + 1) % person.routine.cycleSchedule.length;
  const nextStage = person.routine.cycleSchedule[nextIndex];
  const targetZone = findZoneForStage(nextStage, zones);

  if (!targetZone) return;

  const spots = ZONE_STAGE_SPOTS[nextStage];
  const hash = person.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const spotIndex = (hash + nextIndex) % spots.length;
  const spotDef = spots[spotIndex];
  const spotCoord = calculateSpotCoordinate(targetZone, spotIndex, spots.length);

  person.routine.cycleIndex = nextIndex;
  person.routine.stage = nextStage;
  person.routine.targetZoneId = targetZone.id;
  person.routine.targetZoneName = targetZone.name;
  person.routine.targetX = spotCoord.x;
  person.routine.targetY = spotCoord.y;
  person.routine.personalOffset = { x: spotCoord.offsetX, y: spotCoord.offsetY };
  person.routine.spotName = spotDef.name;
  person.routine.isDwelling = false;
  person.routine.timer = 24; // journey timeout fallback
  person.routine.partnerId = null;
  person.routine.activityLabel = getEnrichedActivityLabel(
    person.routine.persona,
    nextStage,
    targetZone.name,
    spotDef.name,
    false,
    false
  );
  person.routine.activityIcon = getRoutineActivityIcon(nextStage);
}

/**
 * Per-frame routine lifecycle update with social interactions
 */
export function updatePersonRoutine(
  person: Person,
  mapSystem: MapSystem,
  worldWidth: number,
  worldHeight: number,
  dt: number,
  allPeople?: Person[]
): void {
  // If contacted or visiting church community, pause everyday routine
  if (person.externalState === 'CONTACTED' || person.externalState === 'FOLLOWING' || person.externalState === 'ENTERING') {
    if (person.routine) {
      person.routine.activityLabel = '복음의 초대를 받아 공동체로 향함';
      person.routine.activityIcon = '✝️';
      person.routine.partnerId = null;
    }
    return;
  }

  if (!person.routine) {
    initializePersonRoutine(person, mapSystem, worldWidth, worldHeight);
    return;
  }

  if (person.routine.isDwelling) {
    person.routine.timer -= dt;

    // Check for nearby companion at same location/table (Social pairing)
    if (allPeople) {
      let foundPartner: Person | null = null;
      for (const other of allPeople) {
        if (other.id !== person.id && other.isExternal && other.routine?.isDwelling) {
          if (other.routine.targetZoneId === person.routine.targetZoneId) {
            const d = Math.hypot(person.x - other.x, person.y - other.y);
            if (d < 36) {
              foundPartner = other;
              break;
            }
          }
        }
      }

      if (foundPartner) {
        person.routine.partnerId = foundPartner.id;
        person.routine.activityLabel = getEnrichedActivityLabel(
          person.routine.persona,
          person.routine.stage,
          person.routine.targetZoneName,
          person.routine.spotName,
          true,
          true
        );
      } else {
        person.routine.partnerId = null;
      }
    }

    if (person.routine.timer <= 0) {
      // Dwell period finished: walk to next landmark in schedule!
      advancePersonRoutine(person, mapSystem, worldWidth, worldHeight);
    }
  } else {
    // Walking toward destination
    person.routine.walkPhase = (person.routine.walkPhase || 0) + dt * 6;
    person.routine.timer -= dt;

    const dx = person.routine.targetX - person.x;
    const dy = person.routine.targetY - person.y;
    const d = Math.hypot(dx, dy);

    // If reached destination spot (within 16px) or timeout
    if (d < 16 || person.routine.timer <= 0) {
      person.routine.isDwelling = true;
      person.routine.timer = person.routine.dwellDuration;
      person.routine.activityLabel = getEnrichedActivityLabel(
        person.routine.persona,
        person.routine.stage,
        person.routine.targetZoneName,
        person.routine.spotName,
        true,
        false
      );
      person.routine.activityIcon = getRoutineActivityIcon(person.routine.stage);
    }
  }
}
