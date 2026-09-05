/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CallingType = 'EVANGELIST' | 'SHEPHERD' | 'TEACHER' | 'INTERCESSOR' | 'WORSHIPPER' | null;

export type Generation = 0 | 1 | 2 | 3;

export type PersonMovementState =
  | 'INSIDE'
  | 'EDGE'
  | 'OUTSIDE'
  | 'RETURNING'
  | 'VISITING'
  | 'SENT'
  | 'RESTING'
  | 'CRISIS'
  | 'LEAVING';

export type NeedType =
  | 'QUESTION'
  | 'NEWCOMER'
  | 'OPEN_DOOR'
  | 'WEARY'
  | 'SCATTERED'
  | 'READY'
  | 'TENSION';

export type DriftType = 'DECEPTION' | 'DIVISION' | 'BURNOUT' | 'APATHY';

export type CareStatus = 'NONE' | 'CARED' | 'UNCARED';

export type CommunityPriority = 'GO' | 'ROOT' | 'CARE';

export type ExternalPersonState =
  | 'UNCONNECTED'
  | 'AWARE'
  | 'CONTACTED'
  | 'FOLLOWING'
  | 'ENTERING';

export interface PersonNeed {
  type: NeedType;
  duration: number; // remaining seconds
  maxDuration: number;
  targetPersonId?: string; // e.g. for Tension between two people
  description?: string;
}

export interface Person {
  id: string;
  name: string;
  gender: 'M' | 'F';
  communityId: string | null; // null if outside/external
  calling: CallingType;
  generation: Generation;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  movementState: PersonMovementState;
  targetX: number | null;
  targetY: number | null;
  
  // Psychological & Spiritual stats (1~100 internally, 1~10 step scale for player)
  trust: number;       // 0-100 (지체 간 신뢰)
  depth: number;       // 0-100 (복음의 농도 / 깊이)
  stability: number;   // 0-100 (사랑의 정착)
  readiness: number;   // 0-100 (사역 헌신도)
  autonomy: number;    // 0-100 (자립 생명력)
  burnout: number;     // 0-100 (영적 지침 / 소진)
  
  // Care System (Section 16-22)
  careStatus: CareStatus;
  caregiverId?: string;
  careTargets?: string[];   // For Shepherds (up to 4) & Mature disciples (1)
  careCapacity?: number;    // 4 for Shepherd, 1 for Mature disciple
  careLoad?: number;        // careTargets.length
  leaveIntent?: number;     // 0-100 (rises if UNCARED)

  // Real Lineage (Section 41-42)
  trainedById?: string;
  parentLeaderId?: string;
  isMatureDisciple?: boolean;

  need: PersonNeed | null;
  
  // External person tracking & Evangelism Milestone System
  isExternal: boolean;
  externalState?: ExternalPersonState;
  contactWithId?: string | null;
  contactProgress?: number; // 0-100 for evangelism relational progress
  contactDuration?: number; // Cumulative close-proximity seconds
  requiredContactDuration?: number; // Target seconds to complete milestone (5-10s)
  contactMilestoneStage?: 1 | 2 | 3; // 1: 호감/대화(0-33%), 2: 마음 열림(34-66%), 3: 신뢰/복음(67-99%)
  engagedSeekerIds?: string[]; // On believers: maximum 2 concurrent seekers being marked
  attraction?: number; // 0-100 (seeker relational attraction)
  
  // Relational unique tracking
  caredPersonIds?: string[];
  reachedPersonIds?: string[];

  // Map & Zone Environment Integration (Section 25-35)
  remainingStayTime?: number; // Average stay time countdown for dynamic external flow
  currentZoneName?: string; // Zone this person is currently situated within
  
  // Pastoral Rescue & Holding System (Holding onto leaving/lukewarm members)
  beingHeldById?: string | null; // ID of the shepherd holding and comforting this person
  isHoldingPersonId?: string | null; // ID of the member this shepherd is holding
  holdingTimer?: number; // Visual holding animation/embrace timer
  leavingTimer?: number; // Grace period countdown before leaving (gives shepherd time to reach)
  
  // Sending state
  isBeingSent?: boolean;
  sentData?: {
    targetCommunitySeedX: number;
    targetCommunitySeedY: number;
    progress: number;
    followers?: string[];
  };
  
  // Visual Feedback for Skills
  visualEffect?: {
    type: ActionId;
    timer: number;
  };
  
  // Contribution stats for run story
  contribution: {
    reachedCount: number;
    caredCount: number;
    trainedCount: number;
    questionsResolved: number;
    deceptionsExposed: number;
    crisesStabilized: number;
    worshipGathered: number;
  };

  // Visual animation props
  wobbleOffset: number;
  lastWorshipPulse?: number;
  revealGlowTimer?: number; // for calling discovery animation
}

export interface CommunityStats {
  population: number;
  area: number;
  density: number;
  clarity: number;     // WORSHIP -> visual saturation
  unity: number;       // WORSHIP -> cohesion
  resilience: number;  // PRAYER -> safe capacity & shock absorb
  mission: number;     // MISSION -> outside activity
  formation: number;   // WORD -> spiritual depth
  care: number;        // CARE -> retention & return flow
  centralization: number; // 0-100 (High = single leader dependence)
  integrity: number;   // 0-100 (Truth vs deception)
  safeCapacity: number;// PRAYER / Intercessors expand this
  
  // Shepherd Care Capacity (Section 16-22)
  careCapacity: number; // (Mature Disciples * 1) + (Shepherds * 4)
  careDemand: number;   // Current community members needing care
  uncaredCount: number; // Members with careStatus === 'UNCARED'
  shepherdCount: number;
  careGap?: number;
  overloadBurnout?: number;
}

export interface SocietalNews {
  id: string;
  category: 'CULT' | 'ECONOMY' | 'POLITICS' | 'SECULARISM';
  headline: string;
  impactDescription: string;
  driftType: DriftType;
  targetDriftType?: DriftType;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH';
  timestamp: number;
  duration: number; // Duration in seconds to remain active on ticker
}

export interface CommunityDrift {
  type: DriftType;
  intensity: number;   // 0-100 (Doesn't auto-expire, multi-action mitigation)
  discovered: boolean; // Teacher reveals Deception
  detectionProgress?: number; // 0-100% progress until discovery (Teacher discernment)
  duration: number;
  title: string;
  description: string;
  sourcePersonId?: string;
  vulnerabilitySource?: string;
}

export interface Community {
  id: string;
  name: string;
  centerX: number;
  centerY: number;
  colorBase: string; // e.g. "hsl(215, 80%, 55%)"
  stats: CommunityStats;
  priority: CommunityPriority;
  priorityCooldown: number; // seconds remaining
  drift: CommunityDrift | null;
  pulsePhase: number;
  seedLeaderId?: string;
  generation: number;
  hullPoints: { x: number; y: number }[];
  targetRadius: number;
  currentRadius: number;
  isIndependent?: boolean;
  isAutonomous?: boolean; // Fully self-governing planted daughter church
}

export type ActionId = 'FELLOWSHIP' | 'WORD' | 'PRAYER' | 'WORSHIP' | 'CARE' | 'SEND';

export interface PlayerAction {
  id: ActionId;
  koreanName: string;
  subtitle: string;
  description: string;
  cooldown: number;        // total cooldown in seconds (data-driven)
  currentCooldown: number; // remaining cooldown (0 = READY)
  attentionCost: number;   // 1 or 2
  icon: string;
  targetType: 'PERSON' | 'ANY' | 'STRATEGIC';
}

// Map System Types (Section 25-35)
export type MapId = 'COUNTRYSIDE' | 'CAMPUS' | 'DOWNTOWN';

export interface MapZone {
  id: string;
  name: string;
  englishName: string;
  relX: number; // 0..1 fraction of canvas
  relY: number; // 0..1 fraction of canvas
  relRadius: number; // 0..1 fraction of min(w, h)
  influence: {
    speedMultiplier: number;
    questionNeedMultiplier: number;
    careMultiplier: number;
    relationshipMultiplier: number;
  };
}

export interface MapProfile {
  id: MapId;
  name: string;
  koreanName: string;
  subtitle: string;
  description: string;
  populationIndicator: string; // e.g. "●●○○○"
  mobilityIndicator: string;   // e.g. "●○○○○"
  crisisSummary: string;       // e.g. "침체 · 폐쇄성"
  
  populationDensity: number;
  populationSpawnRate: number;
  mobility: number;
  averageStayTime: number;
  openness: number;
  
  ageProfile: {
    young: number;
    adult: number;
    senior: number;
  };
  
  driftWeights: {
    deception: number;
    division: number;
    burnout: number;
    apathy: number;
  };

  zones: MapZone[];
}

export type SuccessionStatus = 'LOW' | 'FAIR' | 'READY';

export interface ReleaseSnapshot {
  time: number;
  population: number;
  health: number;
  integrity: number;
  communityCount: number;
  careCapacity: number;
  careGap: number;
  g1Count: number;
  g2Count: number;
  g3Count: number;
}

export interface RunStats {
  timeElapsed: number; // seconds (0 to 570)
  isReleaseActive: boolean; // 540-570s (09:00-09:30)
  isGameOver: boolean;
  mapId: MapId;
  
  // Metrics
  peopleReached: number;
  newcomerCount: number;
  leadersTrained: number;
  g1Count: number;
  g2Count: number;
  g3Count: number;
  deceptionsExposed: number;
  crisesOvercome: number;
  communitiesFormed: number;
  
  // Release Evaluation
  releaseSnapshot?: ReleaseSnapshot;
  autonomousCareCount: number;
  autonomousReachCount: number;
  autonomousFormationCount: number;
  autonomousCrisesResolved: number;
  releaseSurvivalRate: number;
  
  // Final Score Breakdown
  autonomyScore: number;
  multiplicationScore: number;
  kingdomHealthScore: number;
  gospelIntegrityScore: number;
  reachScore: number;
  finalScore: number;
  finalGrade: 'S' | 'A' | 'B' | 'C' | 'D';
  
  // Story Narrative & 3 Core Causal Reflections
  runStory: string[];
  struggles: string[];
  reflections: string[]; // Max 3 concise causal reflections
}

export interface StoryEvent {
  id: string;
  timestamp: number;
  text: string;
  type: 'BLESSING' | 'SEND' | 'DRIFT' | 'WARNING' | 'FRUIT' | 'RELEASE';
}
