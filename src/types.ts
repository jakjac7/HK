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
  | 'CRISIS';

export type NeedType =
  | 'QUESTION'
  | 'NEWCOMER'
  | 'OPEN_DOOR'
  | 'WEARY'
  | 'SCATTERED'
  | 'READY'
  | 'TENSION';

export type DriftType = 'DECEPTION' | 'DIVISION' | 'BURNOUT';

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
  
  // Psychological & Spiritual stats
  trust: number;       // 0-100
  depth: number;       // 0-100 (WORD -> visual color intensity)
  stability: number;   // 0-100 (CARE -> staying power)
  readiness: number;   // 0-100 (For Train / Discipleship / Calling)
  autonomy: number;    // 0-100 (Autonomous action capacity)
  burnout: number;     // 0-100 (Stagnates if high)
  
  need: PersonNeed | null;
  
  // External person tracking
  isExternal: boolean;
  externalState?: ExternalPersonState;
  contactWithId?: string | null;
  
  // Sending state
  isBeingSent?: boolean;
  sentData?: {
    targetCommunitySeedX: number;
    targetCommunitySeedY: number;
    progress: number;
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
}

export interface CommunityDrift {
  type: DriftType;
  intensity: number;   // 0-100
  discovered: boolean; // Teacher reveals Deception
  duration: number;
  title: string;
  description: string;
  sourcePersonId?: string;
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
}

export type CardType =
  | 'MEAL'
  | 'WORD'
  | 'PRAYER'
  | 'ENCOURAGE'
  | 'RECONCILE'
  | 'TRAIN';

export interface PracticeCard {
  id: string;
  type: CardType;
  name: string;
  koreanName: string;
  cost: number; // Attention cost: 1 or 2
  description: string;
  targetType: 'PERSON' | 'ANY' | 'TENSION' | 'READY';
  icon: string;
}

export type SuccessionStatus = 'LOW' | 'FAIR' | 'READY';

export interface RunStats {
  timeElapsed: number; // seconds (0 to 570)
  isReleaseActive: boolean; // 540-570s (09:00-09:30)
  isGameOver: boolean;
  
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
  
  // Final Score Breakdown
  autonomyScore: number;
  multiplicationScore: number;
  kingdomHealthScore: number;
  gospelIntegrityScore: number;
  reachScore: number;
  finalScore: number;
  finalGrade: 'S' | 'A' | 'B' | 'C' | 'D';
  
  // Story Narrative
  runStory: string[];
  struggles: string[];
}

export interface StoryEvent {
  id: string;
  timestamp: number;
  text: string;
  type: 'BLESSING' | 'SEND' | 'DRIFT' | 'WARNING' | 'FRUIT' | 'RELEASE';
}
