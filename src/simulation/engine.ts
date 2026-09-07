/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Person,
  Community,
  RunStats,
  CommunityPriority,
  CallingType,
  SuccessionStatus,
  StoryEvent,
  DriftType,
  Generation,
  PlayerAction,
  ActionId,
  MapId,
  ReleaseSnapshot,
  MapZone,
  SocietalNews,
  AgeBand,
} from '../types';
import { NameGenerator, getRandomCommunityName } from '../data/names';
import { calculatePersonSteering, distance, clamp } from './steering';
import { calculateCommunityHull } from './communityBlob';
import { soundEngine } from './sound';
import { getGenerationLabel, getCallingLabel } from '../utils/faithTerms';

import { MapSystem } from '../systems/MapSystem';
import { ActionSystem } from '../systems/ActionSystem';
import { CareSystem } from '../systems/CareSystem';
import { CallingSystem } from '../systems/CallingSystem';
import { DriftSystem, VulnerabilityAccumulator } from '../systems/DriftSystem';
import { GenerationSystem } from '../systems/GenerationSystem';
import { ReleaseSystem } from '../systems/ReleaseSystem';
import { initializePersonRoutine } from '../systems/RoutineSystem';

export interface Particle {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  progress: number;
  type: 'BLESSING' | 'GENERIC';
  targetPersonId?: string;
  speedModifier?: number;
}

export interface GameEngineState {
  timeElapsed: number;
  isPaused: boolean;
  gameSpeed: number; // 1, 2
  isReleaseActive: boolean;
  isGameOver: boolean;

  attention: number; // 0-3
  maxAttention: number;

  particles: Particle[];

  mapId: MapId;
  actions: PlayerAction[];
  selectedActionId: ActionId | null;

  communities: Community[];
  people: Person[];

  selectedPersonId: string | null;

  events: StoryEvent[];
  stats: RunStats;

  releaseSnapshot?: ReleaseSnapshot;
  societalNews: SocietalNews | null;
  callingFeedback?: {
    personId: string;
    personName: string;
    calling: CallingType;
    message: string;
    timestamp: number;
  } | null;
}

export class GameEngine {
  public state: GameEngineState;
  private nameGen: NameGenerator;
  private worldWidth: number = 800;
  private worldHeight: number = 600;
  private needSpawnTimer: number = 0;
  private needSpawnInterval: number = 135; // 2 ~ 2.5 minutes cycle
  private externalReplenishTimer: number = 0;
  private hasInitialLayout: boolean = false;
  private lastWordPulseTime: number = 0;
  private autonomousActionTimers: Map<string, number> = new Map();

  // Sub-systems
  public mapSystem: MapSystem;
  public actionSystem: ActionSystem;
  public onWordProclaimed?: () => void;
  public onCallingDiscovered?: (person: Person, calling: CallingType) => void;
  private communityVulnerabilities: Map<string, VulnerabilityAccumulator> = new Map();

  public getVulnerabilities(communityId: string): VulnerabilityAccumulator {
    let vuln = this.communityVulnerabilities.get(communityId);
    if (!vuln) {
      vuln = { confusion: 0, division: 0, burnout: 0, apathy: 0 };
      this.communityVulnerabilities.set(communityId, vuln);
    }
    return vuln;
  }

  constructor(isKoreanTheme: boolean = true) {
    this.nameGen = new NameGenerator(isKoreanTheme);
    this.mapSystem = new MapSystem('CAMPUS');
    this.actionSystem = new ActionSystem();

    if (typeof window !== 'undefined' && window.innerWidth > 0 && window.innerHeight > 0) {
      this.worldWidth = Math.max(320, window.innerWidth);
      this.worldHeight = Math.max(320, window.innerHeight);
    }
    this.state = this.createInitialState();
  }

  public setWorldDimensions(w: number, h: number) {
    this.worldWidth = Math.max(320, w);
    this.worldHeight = Math.max(320, h);

    if (!this.hasInitialLayout && w > 50 && h > 50) {
      this.hasInitialLayout = true;
      const targetCx = this.worldWidth / 2;
      const targetCy = this.worldHeight / 2;

      const primaryComm = this.state.communities[0];
      if (primaryComm) {
        const dx = targetCx - primaryComm.centerX;
        const dy = targetCy - primaryComm.centerY;

        for (const comm of this.state.communities) {
          comm.centerX += dx;
          comm.centerY += dy;
        }
        for (const person of this.state.people) {
          person.x += dx;
          person.y += dy;
        }
      }
    }

    // Safety bounds enforcement
    for (const comm of this.state.communities) {
      const padX = Math.min(comm.currentRadius + 20, this.worldWidth * 0.4);
      const padY = Math.min(comm.currentRadius + 20, this.worldHeight * 0.4);
      comm.centerX = clamp(comm.centerX, padX, this.worldWidth - padX);
      comm.centerY = clamp(comm.centerY, padY, this.worldHeight - padY);
    }

    for (const person of this.state.people) {
      person.x = clamp(person.x, 20, this.worldWidth - 20);
      person.y = clamp(person.y, 20, this.worldHeight - 20);
    }
  }

  public setMap(mapId: MapId) {
    this.mapSystem.setMap(mapId);
    this.state.mapId = mapId;
    const profile = this.mapSystem.getMapProfile();
    this.logEvent(`선교 환경이 '${profile.name}'(으)로 변경되었습니다. (${profile.description})`, 'BLESSING');

    // Re-initialize external souls' life routine according to new map's zones
    for (const p of this.state.people) {
      if (p.isExternal && p.externalState === 'UNCONNECTED') {
        initializePersonRoutine(p, this.mapSystem, this.worldWidth, this.worldHeight, true);
      }
    }
  }

  public reset(isKoreanTheme?: boolean, targetMapId?: MapId) {
    if (isKoreanTheme !== undefined) {
      this.nameGen.setTheme(isKoreanTheme);
    }
    this.nameGen.reset();
    this.hasInitialLayout = false;
    this.actionSystem = new ActionSystem();
    this.communityVulnerabilities.clear();
    const effectiveMapId = targetMapId || this.state?.mapId || 'CAMPUS';
    this.mapSystem.setMap(effectiveMapId);
    this.state = this.createInitialState(effectiveMapId);
  }

  public getExternalTargetCount(): number {
    const mapId = this.mapSystem?.getMapProfile()?.id || 'CAMPUS';
    if (mapId === 'COUNTRYSIDE') return 10;
    if (mapId === 'CAMPUS') return 22;
    if (mapId === 'DOWNTOWN') return 28;
    return 16;
  }

  public getRandomAgeBand(): AgeBand {
    const mapId = this.mapSystem?.getMapProfile()?.id || 'CAMPUS';
    const roll = Math.random();
    if (mapId === 'CAMPUS') {
      if (roll < 0.70) return 'YOUNG';
      if (roll < 0.95) return 'ADULT';
      return 'SENIOR';
    } else if (mapId === 'COUNTRYSIDE') {
      if (roll < 0.60) return 'SENIOR';
      if (roll < 0.90) return 'ADULT';
      return 'YOUNG';
    } else {
      if (roll < 0.65) return 'ADULT';
      if (roll < 0.90) return 'YOUNG';
      return 'SENIOR';
    }
  }

  private createInitialState(targetMapId?: MapId): GameEngineState {
    const effectiveMapId = targetMapId || (this.state && this.state.mapId) || this.mapSystem.getMapProfile().id || 'CAMPUS';
    this.mapSystem.setMap(effectiveMapId);

    const cx = this.worldWidth / 2;
    const cy = this.worldHeight / 2;

    // TASK HK4-031: Randomize Founding Callings (4 G0 Disciples, 2 Random Mature Workers)
    const allCallingPool: CallingType[] = ['EVANGELIST', 'SHEPHERD', 'TEACHER', 'INTERCESSOR', 'WORSHIPPER'];
    const shuffledPool = [...allCallingPool].sort(() => Math.random() - 0.5);
    const workerCalling1 = shuffledPool[0];
    const workerCalling2 = shuffledPool[1];

    const callingsList: { calling: CallingType; nameGenGender: 'M' | 'F' }[] = [
      { calling: workerCalling1, nameGenGender: 'M' },
      { calling: workerCalling2, nameGenGender: 'F' },
      { calling: null, nameGenGender: 'M' },
      { calling: null, nameGenGender: 'F' },
      { calling: null, nameGenGender: 'M' },
      { calling: null, nameGenGender: 'F' },
    ];

    const shepherdCount = (workerCalling1 === 'SHEPHERD' ? 1 : 0) + (workerCalling2 === 'SHEPHERD' ? 1 : 0);
    // Mature disciple = +1 careCapacity, Shepherd = +4 careCapacity
    const foundingCareCapacity = Math.max(2, 2 * 1 + shepherdCount * 3);

    const initialCommunityName = getRandomCommunityName();

    const initialCommunity: Community = {
      id: 'comm_1',
      name: initialCommunityName,
      centerX: cx,
      centerY: cy,
      colorBase: 'hsl(210, 85%, 55%)',
      stats: {
        population: 6,
        area: 28000,
        density: 0.00021,
        clarity: 70,
        unity: 75,
        resilience: 70,
        mission: 65,
        formation: 60,
        care: 75,
        centralization: 20,
        integrity: 90,
        safeCapacity: 12,
        careCapacity: foundingCareCapacity,
        careDemand: 6,
        uncaredCount: 0,
        shepherdCount,
        careGap: 0,
        overloadBurnout: 0,
      },
      priority: 'ROOT',
      priorityCooldown: 0,
      drift: null,
      pulsePhase: 0,
      generation: 1,
      hullPoints: [],
      targetRadius: 105,
      currentRadius: 105,
    };

    const people: Person[] = [];
    callingsList.forEach((item, index) => {
      const { name, gender } = this.nameGen.generate(item.nameGenGender);
      const angle = (index / callingsList.length) * Math.PI * 2;
      const dist = 25 + Math.random() * 35;

      people.push({
        id: `person_init_${index + 1}`,
        name,
        gender,
        communityId: initialCommunity.id,
        calling: item.calling,
        generation: 0 as Generation, // 개척멤버 (G0)
        isMatureDisciple: item.calling !== null,
        careStatus: 'CARED',
        careTargets: [],
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        radius: 12,
        movementState: 'INSIDE',
        targetX: null,
        targetY: null,
        trust: 75 + Math.floor(Math.random() * 15),
        depth: item.calling === 'TEACHER' ? 85 : 60 + Math.floor(Math.random() * 20),
        stability: 70 + Math.floor(Math.random() * 20),
        readiness: item.calling ? 80 : 55,
        autonomy: item.calling ? 70 : 45,
        burnout: 5 + Math.floor(Math.random() * 8),
        need: null,
        isExternal: false,
        wobbleOffset: Math.random() * Math.PI * 2,
        contribution: {
          reachedCount: 0,
          caredCount: 0,
          trainedCount: 0,
          questionsResolved: 0,
          deceptionsExposed: 0,
          crisesStabilized: 0,
          worshipGathered: 0,
        },
      });
    });

    // HK5-050: Map Profile Target External Seekers (Countryside: 10, Campus: 22, Downtown: 28)
    const initialExtCount = this.getExternalTargetCount();
    for (let i = 0; i < initialExtCount; i++) {
      const { name, gender } = this.nameGen.generate();

      const extPerson: Person = {
        id: `external_${i + 1}`,
        name,
        gender,
        communityId: null,
        calling: null,
        generation: 0,
        isMatureDisciple: false,
        careStatus: 'NONE',
        careTargets: [],
        x: cx,
        y: cy,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        radius: 10,
        movementState: 'OUTSIDE',
        targetX: null,
        targetY: null,
        trust: 20 + Math.floor(Math.random() * 25),
        depth: 15 + Math.floor(Math.random() * 20),
        stability: 30 + Math.floor(Math.random() * 30),
        readiness: 10 + Math.floor(Math.random() * 20),
        autonomy: 10,
        burnout: 0,
        need: null,
        isExternal: true,
        externalState: 'UNCONNECTED',
        ageBand: this.getRandomAgeBand(),
        remainingStayTime: 60 + Math.random() * 40,
        wobbleOffset: Math.random() * Math.PI * 2,
        contribution: {
          reachedCount: 0,
          caredCount: 0,
          trainedCount: 0,
          questionsResolved: 0,
          deceptionsExposed: 0,
          crisesStabilized: 0,
          worshipGathered: 0,
        },
      };

      // Naturally spawn inside routine zones (Campus, Cafe, Dorms, Station)
      initializePersonRoutine(extPerson, this.mapSystem, this.worldWidth, this.worldHeight, true);
      people.push(extPerson);
    }

    const initialEvent: StoryEvent = {
      id: 'event_init',
      timestamp: 0,
      text: `${initialCommunityName}가 기도로 첫 걸음을 내딛습니다. 개척멤버(G0)들이 사랑과 복음으로 섬깁니다.`,
      type: 'BLESSING',
    };

    return {
      timeElapsed: 0,
      isPaused: false,
      gameSpeed: 1,
      isReleaseActive: false,
      isGameOver: false,
      attention: 3.0,
      maxAttention: 3,
      particles: [],
      mapId: effectiveMapId,
      actions: this.actionSystem.actions,
      selectedActionId: null,
      communities: [initialCommunity],
      people,
      selectedPersonId: null,
      events: [initialEvent],
      stats: {
        timeElapsed: 0,
        isReleaseActive: false,
        isGameOver: false,
        mapId: effectiveMapId,
        peopleReached: 0,
        newcomerCount: 0,
        leadersTrained: 0,
        g1Count: 5,
        g2Count: 0,
        g3Count: 0,
        deceptionsExposed: 0,
        crisesOvercome: 0,
        communitiesFormed: 1,
        autonomousCareCount: 0,
        autonomousReachCount: 0,
        autonomousFormationCount: 0,
        autonomousCrisesResolved: 0,
        releaseSurvivalRate: 0,
        autonomyScore: 0,
        multiplicationScore: 0,
        kingdomHealthScore: 0,
        gospelIntegrityScore: 0,
        reachScore: 0,
        finalScore: 0,
        finalGrade: 'B',
        runStory: [],
        struggles: [],
        reflections: [],
      },
      societalNews: null,
      callingFeedback: null,
    };
  }

  /**
   * Main game tick (dt in seconds)
   */
  public update(realDt: number) {
    if (this.state.isPaused || this.state.isGameOver) return;

    const simSpeed = (this.state.isReleaseActive ? 2.0 : 1.0) * this.state.gameSpeed;
    const dt = Math.min(realDt, 0.1) * simSpeed;

    this.state.timeElapsed += dt;
    this.state.stats.timeElapsed = this.state.timeElapsed;

    this.processLifeEvents(dt);

    // Check Phase transitions:
    // At 09:00 (540s), trigger THE RELEASE (Player Control OFF!)
    if (this.state.timeElapsed >= 540 && !this.state.isReleaseActive && !this.state.isGameOver) {
      this.triggerTheRelease();
    }

    // At 10:00 (600s), complete run and evaluate victory score
    if (this.state.timeElapsed >= 600 && !this.state.isGameOver) {
      this.finishRun();
      return;
    }

    // 1. Update Action System & Attention
    this.actionSystem.update(dt);
    this.state.attention = this.actionSystem.attention;
    this.state.actions = this.actionSystem.actions;

    // Update Particles
    if (this.state.particles) {
      this.state.particles.forEach(p => {
        const speed = p.speedModifier !== undefined ? p.speedModifier : 1.0;
        p.progress += dt * 1.5 * speed; // Particle speed
      });
      this.state.particles = this.state.particles.filter(p => p.progress < 1.0);
    }

    // Clear calling feedback after 4 seconds
    if (this.state.callingFeedback && performance.now() - this.state.callingFeedback.timestamp > 4000) {
      this.state.callingFeedback = null;
    }

    // Update societal news alert countdown
    if (this.state.societalNews) {
      this.state.societalNews.duration -= dt;
      if (this.state.societalNews.duration <= 0) {
        this.state.societalNews = null;
      }
    }

    // Gradual decay of Word depth & community formation over time (Req 3)
    for (const p of this.state.people) {
      if (!p.isExternal && p.depth > 15) {
        p.depth = Math.max(15, p.depth - dt * 0.12);
      }
    }
    for (const comm of this.state.communities) {
      if (comm.stats.formation > 20) {
        comm.stats.formation = Math.max(20, comm.stats.formation - dt * 0.10);
      }
    }

    // 3-Minute (180s) Word Proclamation Pulse (+10% of current value, Req 3)
    const current3MinCycle = Math.floor(this.state.timeElapsed / 180);
    if (current3MinCycle > this.lastWordPulseTime && this.state.timeElapsed >= 180) {
      this.lastWordPulseTime = current3MinCycle;
      
      for (const comm of this.state.communities) {
        comm.stats.formation = Math.min(100, Math.round(comm.stats.formation * 1.10));
        comm.stats.integrity = Math.min(100, Math.round(comm.stats.integrity * 1.05));
      }
      for (const p of this.state.people) {
        if (!p.isExternal) {
          p.depth = Math.min(100, Math.round(p.depth * 1.10));
          p.trust = Math.min(100, Math.round(p.trust * 1.05));
          p.visualEffect = { type: 'WORD', timer: 3.5 };
        }
      }

      this.logEvent(
        `[강단 말씀의 은혜] 3분 정기 주일 말씀 선포! 모든 성도와 공동체의 복음 깊이가 10% 상승했습니다. (점진적으로 하락하므로 주기적인 말씀 선포로 활력을 유지하십시오)`,
        'BLESSING'
      );
      soundEngine.playChime();
    }

    // 2. Priority Cooldown
    for (const comm of this.state.communities) {
      if (comm.priorityCooldown > 0) {
        comm.priorityCooldown = Math.max(0, comm.priorityCooldown - dt);
      }
    }

    // 3. Update People Movement & Steering
    const world = { width: this.worldWidth, height: this.worldHeight };
    const currentMapProfile = this.mapSystem.getMapProfile();

    // HK5-040: Autonomous Worshipper-Driven Gathering Pulse (replaces artificial Sunday Scrum)
    let worshipGatheringCommId: string | null = null;
    for (const comm of this.state.communities) {
      const worshippers = this.state.people.filter(p => p.communityId === comm.id && p.calling === 'WORSHIPPER');
      if (worshippers.length > 0) {
        if (!comm.lastWorshipPulse) comm.lastWorshipPulse = -30;
        const timeSincePulse = this.state.timeElapsed - comm.lastWorshipPulse;
        if (timeSincePulse > 45 && (comm.stats.unity < 70 || Math.random() < 0.05)) {
          comm.lastWorshipPulse = this.state.timeElapsed;
          comm.stats.unity = Math.min(100, comm.stats.unity + 8);
          comm.stats.clarity = Math.min(100, comm.stats.clarity + 10);
          soundEngine.playChime();
          const wLeader = worshippers[0];
          wLeader.contribution.worshipGathered++;
          this.logEvent(`[${comm.name}]의 ${wLeader.name} 예배자가 온 회중을 찬양과 기도의 자리로 모읍니다.`, 'BLESSING');
        }

        if (timeSincePulse < 8.0) {
          worshipGatheringCommId = comm.id;
        }
      }
    }

    const expiredExternalIds: string[] = [];
    
    for (const person of this.state.people) {
      const { fx, fy, maxSpeed } = calculatePersonSteering(
        person,
        this.state.people,
        this.state.communities,
        world,
        dt,
        this.state.isReleaseActive,
        worshipGatheringCommId,
        currentMapProfile,
        this.mapSystem
      );

      person.vx = (person.vx + fx * dt) * 0.92;
      person.vy = (person.vy + fy * dt) * 0.92;

      const speed = Math.sqrt(person.vx * person.vx + person.vy * person.vy);
      if (speed > maxSpeed) {
        person.vx = (person.vx / speed) * maxSpeed;
        person.vy = (person.vy / speed) * maxSpeed;
      }

      person.x += person.vx * dt;
      person.y += person.vy * dt;

      // HK5-050: External Person Dynamic Stay Time Churn (Despawn & Spawn with new identity)
      if (person.isExternal && person.externalState === 'UNCONNECTED') {
        if (person.remainingStayTime === undefined) {
          person.remainingStayTime = currentMapProfile.averageStayTime * (50 + Math.random() * 40);
        }
        person.remainingStayTime -= dt;
        // When stay time expires, person leaves and a new person arrives with fresh identity
        if (person.remainingStayTime <= 0) {
          expiredExternalIds.push(person.id);
        }
      }

      // HK5-100: Discipleship Formation Accumulation
      if (!person.isExternal && person.communityId && !person.calling && !person.isMatureDisciple) {
        if (!person.formationMentorId) {
          const possibleMentor = this.state.people.find(
            p => p.communityId === person.communityId && p.id !== person.id && (p.calling !== null || p.isMatureDisciple)
          );
          if (possibleMentor) person.formationMentorId = possibleMentor.id;
        }

        if (person.formationMentorId) {
          const mentor = this.state.people.find(p => p.id === person.formationMentorId);
          if (mentor) {
            const d = Math.hypot(person.x - mentor.x, person.y - mentor.y);
            if (d < 65) {
              const comm = this.state.communities.find(c => c.id === person.communityId);
              const rootMult = comm?.priority === 'ROOT' ? 1.5 : 1.0;
              const teacherNearby = this.state.people.some(
                p => p.communityId === person.communityId && p.calling === 'TEACHER' && Math.hypot(p.x - person.x, p.y - person.y) < 55
              );
              const teacherBonus = teacherNearby ? 1.35 : 1.0;
              const growth = 1.4 * rootMult * teacherBonus * dt;
              person.formationProgress = Math.min(100, (person.formationProgress || 0) + growth);
            }
          }
        }
      }

      // Update Need countdown and gradual decay
      if (person.need) {
        person.need.duration -= dt;
        const needProg = 1 - (person.need.duration / person.need.maxDuration);
        
        // Gradual ailments while need is active (e.g. losing stability/trust steadily)
        if (person.need.type === 'WEARY') {
          person.burnout = Math.min(100, person.burnout + dt * 1.2);
          person.stability = Math.max(0, person.stability - dt * 0.4);
        } else if (person.need.type === 'TENSION') {
          person.stability = Math.max(0, person.stability - dt * 0.8);
          person.trust = Math.max(0, person.trust - dt * 0.8);
        } else if (person.need.type === 'NEWCOMER' || person.need.type === 'QUESTION') {
          person.stability = Math.max(0, person.stability - dt * 0.4);
        }

        // Chronic progression: if left untreated (>60% time elapsed), alienation sets in and person drifts toward edge
        if (needProg > 0.6) {
          person.leaveIntent = Math.min(100, (person.leaveIntent || 0) + dt * 2.5);
          if (person.movementState === 'INSIDE') {
            person.movementState = 'EDGE';
          }
        }
        
        if (person.need.duration <= 0) {
          this.handleNeedExpiry(person);
        }
      }

      // Update LEAVING state countdown & pastoral rescue handling (Req 2)
      if (person.movementState === 'LEAVING') {
        if (person.beingHeldById) {
          // Shepherd is holding them! Reassure and pause leaving timer
          if (person.leavingTimer !== undefined) {
            person.leavingTimer = Math.min(50, person.leavingTimer + dt * 2.5);
          }
          if ((person.leaveIntent || 0) < 20) {
            person.movementState = 'INSIDE';
            person.leavingTimer = undefined;
            person.leavingReason = undefined;
            person.beingHeldById = null;
          }
        } else {
          // Member is drifting outward away from church
          if (person.leavingTimer === undefined) person.leavingTimer = 50;
          person.leavingTimer -= dt;

          const comm = this.state.communities.find(c => c.id === person.communityId);
          if (comm) {
            const dToComm = distance(person.x, person.y, comm.centerX, comm.centerY);
            // Only if timer expires AND they have walked far beyond community radius (>1.35x)
            if (person.leavingTimer <= 0 && dToComm > comm.currentRadius * 1.35) {
              const nearbyShepherd = this.state.people.some(
                p => p.calling === 'SHEPHERD' && distance(p.x, p.y, person.x, person.y) < 60
              );
              if (!nearbyShepherd) {
                this.dropOutPerson(person);
              } else {
                person.leavingTimer = 15; // Extra grace if shepherd is on the way
              }
            }
          }
        }
      }

      // Check Sent Leader planting destination
      if (person.isBeingSent && person.sentData) {
        const d = distance(
          person.x,
          person.y,
          person.sentData.targetCommunitySeedX,
          person.sentData.targetCommunitySeedY
        );
        if (d < 35) {
          this.completeSend(person);
        }
      }

      // Ingress check: When contacted external soul walks into community radius
      if (person.isExternal && (person.externalState === 'CONTACTED' || person.externalState === 'FOLLOWING' || person.externalState === 'ENTERING')) {
        for (const comm of this.state.communities) {
          const dToComm = distance(person.x, person.y, comm.centerX, comm.centerY);
          if (dToComm <= comm.currentRadius * 0.88) {
            this.admitNewcomerToCommunity(person, comm);
            break;
          }
        }
      }

      // Autonomous Worshipper pulse
      if (person.calling === 'WORSHIPPER' && person.communityId) {
        person.wobbleOffset += dt * 2;
        if (!person.lastWorshipPulse || performance.now() - person.lastWorshipPulse > 8000) {
          person.lastWorshipPulse = performance.now();
          const comm = this.state.communities.find(c => c.id === person.communityId);
          if (comm) {
            comm.stats.clarity = Math.min(100, comm.stats.clarity + 8);
            comm.stats.unity = Math.min(100, comm.stats.unity + 6);
            person.contribution.worshipGathered++;
            soundEngine.playWorshipHarmonic();
          }
        }
      }

      // 4. Calling Discovery Check: Strict Calling Gate (HK5-010)
      if (!person.calling && person.communityId && CallingSystem.isEligibleForCalling(person)) {
        const comm = this.state.communities.find(c => c.id === person.communityId);
        if (comm) {
          this.triggerCallingDiscovery(person, comm);
        }
      }
      
      if (person.visualEffect && person.visualEffect.timer > 0) {
        person.visualEffect.timer = Math.max(0, person.visualEffect.timer - dt);
      }
      if (person.revealGlowTimer && person.revealGlowTimer > 0) {
        person.revealGlowTimer = Math.max(0, person.revealGlowTimer - dt);
      }
    }

    // HK5-050: Truly despawn expired external seekers and spawn fresh individuals with new names
    if (expiredExternalIds.length > 0) {
      this.state.people = this.state.people.filter(p => !expiredExternalIds.includes(p.id));
      for (let i = 0; i < expiredExternalIds.length; i++) {
        const { name, gender } = this.nameGen.generate();
        const angle = Math.random() * Math.PI * 2;
        const dist = 220 + Math.random() * 110;
        const cx = this.worldWidth / 2;
        const cy = this.worldHeight / 2;
        this.state.people.push({
          id: `ext_fresh_${Date.now()}_${Math.random()}`,
          name,
          gender,
          communityId: null,
          calling: null,
          generation: 0,
          isMatureDisciple: false,
          careStatus: 'NONE',
          careTargets: [],
          x: cx + Math.cos(angle) * dist,
          y: cy + Math.sin(angle) * dist,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.5) * 6,
          radius: 10,
          movementState: 'OUTSIDE',
          targetX: null,
          targetY: null,
          trust: 20 + Math.floor(Math.random() * 25),
          depth: 15 + Math.floor(Math.random() * 20),
          stability: 30 + Math.floor(Math.random() * 30),
          readiness: 10 + Math.floor(Math.random() * 20),
          autonomy: 10,
          burnout: 0,
          need: null,
          isExternal: true,
          externalState: 'UNCONNECTED',
          ageBand: this.getRandomAgeBand(),
          remainingStayTime: currentMapProfile.averageStayTime * (50 + Math.random() * 40),
          wobbleOffset: Math.random() * Math.PI * 2,
          contribution: {
            reachedCount: 0,
            caredCount: 0,
            trainedCount: 0,
            questionsResolved: 0,
            deceptionsExposed: 0,
            crisesStabilized: 0,
            worshipGathered: 0,
          },
        });
      }
    }

    // 5. Update Communities with CareSystem & DriftSystem
    const mapProfile = this.mapSystem.getMapProfile();

    for (const comm of this.state.communities) {
      // Run Care System (capacity, assignments, overload, departures)
      const careResult = CareSystem.updateCommunityCare(comm, this.state.people, dt);
      if (careResult.newlyUncared.length > 0) {
        for (const uncared of careResult.newlyUncared) {
          this.logEvent(`${uncared.name} 성도가 돌봄 수용력 한계로 돌봄 공백에 놓였습니다.`, 'WARNING');
        }
      }

      // Run Drift System (vulnerability accumulation, drift generation, escalation)
      const driftResult = DriftSystem.updateDrifts(
        comm,
        this.state.people,
        mapProfile,
        this.getVulnerabilities(comm.id),
        dt,
        this.state.timeElapsed
      );
      if (driftResult.societalAlert) {
        this.state.societalNews = driftResult.societalAlert;
        this.logEvent(`[시대의 징후] ${driftResult.societalAlert.headline}`, 'WARNING');
        soundEngine.playAlert();
      }
      if (driftResult.spawnedDrift && comm.drift) {
        this.logEvent(`공동체에 '${comm.drift.title}' 위기가 고조되고 있습니다. (${comm.drift.vulnerabilitySource})`, 'DRIFT');
      }
      if (driftResult.resolvedDrift) {
        this.logEvent(`성도들의 헌신과 기도로 공동체의 위기가 완전히 해소되었습니다!`, 'BLESSING');
        this.state.stats.crisesOvercome++;
        if (this.state.isReleaseActive) {
          this.state.stats.autonomousCrisesResolved++;
        }
      }
      if (driftResult.overflowedDrift) {
        this.logEvent(`위기가 극에 달하여 공동체의 연합과 사랑이 상처를 입었습니다.`, 'WARNING');
      }

      // Hull and Area calculations
      const members = this.state.people.filter(p => p.communityId === comm.id && !p.isExternal);
      comm.stats.population = members.length;

      const baseArea = 20000;
      const popFactor = 2200;
      const capacityBonus = comm.stats.safeCapacity * 750;
      const unityBonus = (comm.stats.unity / 100) * 4000;
      const fragPenalty = comm.drift ? 5000 : 0;

      comm.stats.area = Math.max(16000, baseArea + comm.stats.population * popFactor + capacityBonus + unityBonus - fragPenalty);
      const maxAllowedRadius = Math.min(this.worldWidth, this.worldHeight) * 0.38;
      comm.targetRadius = Math.min(maxAllowedRadius, Math.sqrt(comm.stats.area / Math.PI));
      comm.currentRadius += (comm.targetRadius - comm.currentRadius) * 0.08;
      comm.stats.density = comm.stats.population / comm.stats.area;

      comm.hullPoints = calculateCommunityHull(comm, members, performance.now());
    }

    // 6. Timed Directors (Needs & Map-based Population Replenishment: 2-3 min cycle)
    this.needSpawnTimer += dt;
    if (this.needSpawnTimer >= this.needSpawnInterval) {
      this.needSpawnTimer = 0;
      this.needSpawnInterval = 120 + Math.random() * 40; // 2 ~ 2.6 minutes cycle
      this.spawnPeriodicNeed();
    }

    this.externalReplenishTimer += dt;
    const replenishThreshold = 24 / mapProfile.populationSpawnRate;
    if (this.externalReplenishTimer >= replenishThreshold) {
      this.externalReplenishTimer = 0;
      this.replenishExternalPeople();
    }

    // 7. Update Autonomous Planted Communities (Req 4: Self-governing & Autonomous Evangelism)
    this.updateAutonomousPlanting(dt);
  }

  /**
   * Autonomous operation of planted daughter churches (Req 4)
   * The daughter church has no player micromanagement, it evangelizes,
   * balances care, raises leaders, and overcomes crises autonomously.
   */
  private updateAutonomousPlanting(dt: number) {
    const autonomousComms = this.state.communities.filter(c => c.isAutonomous || c.isIndependent);
    if (autonomousComms.length === 0) return;

    for (const comm of autonomousComms) {
      const commTimer = (this.autonomousActionTimers.get(comm.id) || 0) + dt;
      this.autonomousActionTimers.set(comm.id, commTimer);

      const members = this.state.people.filter(p => p.communityId === comm.id && !p.isExternal);
      if (members.length === 0) continue;

      // 1. Autonomous Priority Determination via Comprehensive Utility Scores (HK5-120)
      if (commTimer > 14) {
        this.autonomousActionTimers.set(comm.id, 0);

        let careUtility = 20;
        let goUtility = 20;
        let rootUtility = 20;

        // Care signals
        const wearyCount = members.filter(p => p.burnout > 50 || p.need?.type === 'WEARY').length;
        const leavingCount = members.filter(p => p.movementState === 'LEAVING' || (p.leaveIntent || 0) > 25).length;
        const uncaredCount = members.filter(p => p.careStatus === 'UNCARED').length;
        const tensionCount = members.filter(p => p.need?.type === 'TENSION').length;
        careUtility += wearyCount * 18 + leavingCount * 24 + uncaredCount * 15 + tensionCount * 12;

        // Outreach signals
        if (members.length < 7) {
          goUtility += (7 - members.length) * 12;
        }
        const nearbyExternals = this.state.people.filter(
          p => p.isExternal && p.externalState === 'UNCONNECTED' && Math.hypot(p.x - comm.centerX, p.y - comm.centerY) < comm.currentRadius * 2.2
        ).length;
        goUtility += nearbyExternals * 8;

        // Formation signals
        const questionCount = members.filter(p => p.need?.type === 'QUESTION').length;
        const shallowMembers = members.filter(p => p.depth < 55).length;
        rootUtility += questionCount * 20 + shallowMembers * 9;
        if (comm.stats.formation < 55) {
          rootUtility += (55 - comm.stats.formation) * 1.1;
        }

        // Calling composition weighting
        const shepherds = members.filter(p => p.calling === 'SHEPHERD').length;
        const evangelists = members.filter(p => p.calling === 'EVANGELIST').length;
        const teachers = members.filter(p => p.calling === 'TEACHER').length;
        careUtility += shepherds * 8;
        goUtility += evangelists * 8;
        rootUtility += teachers * 8;

        // Active Drift weighting
        if (comm.drift) {
          if (comm.drift.type === 'BURNOUT' || comm.drift.type === 'DIVISION') careUtility += 35;
          if (comm.drift.type === 'DECEPTION') rootUtility += 40;
          if (comm.drift.type === 'APATHY') goUtility += 40;
        }

        // Determine dominant priority
        if (careUtility >= goUtility && careUtility >= rootUtility) {
          comm.priority = 'CARE';
        } else if (goUtility >= rootUtility) {
          comm.priority = 'GO';
        } else {
          comm.priority = 'ROOT';
        }

        // 2. Autonomous Discipleship / Leader Training (Strict Calling Gate HK5-010)
        const matureLeader = members.find(p => p.isMatureDisciple || p.calling !== null);
        const discipleCandidate = members.find(p => p.calling === null && CallingSystem.isEligibleForCalling(p));
        if (matureLeader && discipleCandidate && Math.random() < 0.5) {
          this.triggerCallingDiscovery(discipleCandidate, comm);
          this.logEvent(
            `[분립교회 자율 양육] ${comm.name}의 ${discipleCandidate.name} 성도가 온전한 양육을 마치고 충성된 일꾼으로 세워졌습니다!`,
            'FRUIT'
          );
          this.state.stats.autonomousFormationCount++;
        }
      }

      // 3. Autonomous Crisis / Drift Mitigation
      if (comm.drift) {
        let mitigationPower = 0.9;
        const leaders = members.filter(p => p.calling !== null);
        for (const leader of leaders) {
          if (comm.drift.type === 'DECEPTION' && leader.calling === 'TEACHER') mitigationPower += 0.8;
          if (comm.drift.type === 'BURNOUT' && leader.calling === 'INTERCESSOR') mitigationPower += 0.8;
          if (comm.drift.type === 'DIVISION' && leader.calling === 'SHEPHERD') mitigationPower += 0.8;
          if (comm.drift.type === 'APATHY' && leader.calling === 'EVANGELIST') mitigationPower += 0.8;
        }

        comm.drift.intensity = Math.max(0, comm.drift.intensity - dt * mitigationPower);
        if (comm.drift.intensity <= 0) {
          this.logEvent(
            `[분립교회 자생력] ${comm.name}이(가) 지도자들의 헌신으로 '${comm.drift.title}' 위기를 스스로 극복했습니다!`,
            'BLESSING'
          );
          comm.drift = null;
          this.state.stats.crisesOvercome++;
          this.state.stats.autonomousCrisesResolved++;
        }
      }

      // 4. Autonomous Evangelism: Evangelist reaching out to seekers
      const evangelist = members.find(p => p.calling === 'EVANGELIST') || members[0];
      if (evangelist && comm.stats.population < 16) {
        const seeker = this.state.people.find(
          p => p.isExternal && distance(p.x, p.y, comm.centerX, comm.centerY) < comm.currentRadius * 1.65
        );
        if (seeker && (!seeker.contactWithId || seeker.contactWithId === evangelist.id)) {
          seeker.contactWithId = evangelist.id;
          // Autonomous evangelism attraction rate reduced by 50% (was dt * 16, now dt * 8)
          seeker.attraction = Math.min(100, (seeker.attraction || 0) + dt * 8);

          if (seeker.attraction >= 100) {
            this.admitNewcomerToCommunity(seeker, comm);
            this.logEvent(
              `[분립교회 자율 전도] ${comm.name}의 자체 전도로 새가족(${seeker.name})이 등록했습니다!`,
              'FRUIT'
            );
            this.state.stats.peopleReached++;
            this.state.stats.autonomousReachCount++;
            soundEngine.playNewcomerChime();
          }
        }
      }

      // 5. Autonomous Pastoral Care: Shepherds holding leaving members
      const shepherd = members.find(p => p.calling === 'SHEPHERD');
      if (shepherd) {
        const leavingMember = members.find(p => p.movementState === 'LEAVING');
        if (leavingMember) {
          const d = distance(shepherd.x, shepherd.y, leavingMember.x, leavingMember.y);
          if (d < 45) {
            leavingMember.beingHeldById = shepherd.id;
            leavingMember.leaveIntent = Math.max(0, (leavingMember.leaveIntent || 0) - dt * 14);
            leavingMember.stability = Math.min(100, leavingMember.stability + dt * 10);
            if (leavingMember.leaveIntent <= 10) {
              leavingMember.movementState = 'INSIDE';
              leavingMember.beingHeldById = null;
              this.logEvent(
                `[분립교회 목양] ${comm.name}의 ${shepherd.name} 목자가 흔들리던 ${leavingMember.name} 성도를 사랑으로 붙잡았습니다.`,
                'BLESSING'
              );
              this.state.stats.autonomousCareCount++;
            }
          }
        }
      }
    }
  }

  public triggerCallingDiscovery(
    person: Person,
    comm: Community,
    forceManual: boolean = false,
    specificCalling?: CallingType
  ): boolean {
    if (person.isExternal || !person.communityId || person.calling !== null) {
      return false;
    }

    // Player cannot manually dictate calling or ministry appointment in independent/autonomous communities
    if (forceManual && (comm.isAutonomous || comm.isIndependent)) {
      this.logEvent(`[독립 자율 공동체] '${comm.name}'은(는) 현지 제자 리더십이 자율적으로 직분을 세웁니다. 사람의 인위적 통제가 제한됩니다.`, 'WARNING');
      return false;
    }

    // HK5-010: Strict Calling Discovery Gate
    // Autonomous check: Requires Word depth, readiness, and discipleship formation
    if (!forceManual && !CallingSystem.isEligibleForCalling(person)) {
      this.logEvent(`${person.name} 성도는 아직 말씀 양육과 제자 훈련(기준: 말씀 68, 헌신 68, 양육 70%)이 더 필요합니다.`, 'WARNING');
      return false;
    }

    // TASK HK4-130: Relational Mentor Selection (caregiver -> direct interaction/holding -> nearest mature leader)
    let mentor: Person | null = null;
    if (person.caregiverId) {
      mentor = this.state.people.find(p => p.id === person.caregiverId && p.calling !== null) || null;
    }
    if (!mentor && person.contactWithId) {
      mentor = this.state.people.find(p => p.id === person.contactWithId && p.calling !== null) || null;
    }
    if (!mentor && person.beingHeldById) {
      mentor = this.state.people.find(p => p.id === person.beingHeldById && p.calling !== null) || null;
    }
    if (!mentor) {
      let minDistance = Infinity;
      for (const other of this.state.people) {
        if (other.communityId === comm.id && other.id !== person.id && (other.calling !== null || other.isMatureDisciple)) {
          const d = Math.hypot(person.x - other.x, person.y - other.y);
          if (d < minDistance) {
            minDistance = d;
            mentor = other;
          }
        }
      }
    }

    const calling: NonNullable<CallingType> = (specificCalling as NonNullable<CallingType>) || CallingSystem.discoverCalling(
      person,
      comm,
      this.state.people
    );

    let generation: Generation = 1;
    if (mentor) {
      const trainRes = GenerationSystem.trainDisciple(mentor, person);
      generation = trainRes.nextGen;
      person.trainedById = mentor.id;
      person.parentLeaderId = mentor.id;
    } else {
      person.generation = 1;
      person.isMatureDisciple = true;
    }
    person.calling = calling;
    person.formationProgress = 100;
    person.isMatureDisciple = true;

    // Apply discovered calling stats, role perks and celebration glow
    CallingSystem.applyDiscoveredCalling(person, calling);
    person.visualEffect = { type: 'WORD', timer: 4.0 };
    person.revealGlowTimer = 4.0;

    // Recalculate community care capacity
    CareSystem.updateCommunityCare(comm, this.state.people, 0);

    const message = `${person.name} 성도가 ${getCallingLabel(calling)}의 은사를 발견하고 충성된 일꾼으로 일어섰습니다.`;

    // Track generation stats
    this.state.stats.leadersTrained++;
    if (generation === 1) this.state.stats.g1Count++;
    if (generation === 2) this.state.stats.g2Count++;
    if (generation >= 3) this.state.stats.g3Count++;

    if (this.state.isReleaseActive) {
      this.state.stats.autonomousFormationCount++;
    }

    // Trigger visual reveal feedback
    this.state.callingFeedback = {
      personId: person.id,
      personName: person.name,
      calling,
      message,
      timestamp: performance.now(),
    };

    soundEngine.playCardUse();
    this.logEvent(
      `${person.name} 성도님이 제자훈련과 양육을 통해 ${getCallingLabel(calling)} 사역자(${getGenerationLabel(generation, false, true)})로 세워졌습니다!`,
      'FRUIT'
    );

    // Call registered UI event callback
    this.onCallingDiscovered?.(person, calling);

    return true;
  }

  /**
   * Executes a player action using the ActionSystem
   */
  public executeAction(actionId: ActionId, targetPersonId?: string): boolean {
    if (this.state.isReleaseActive) {
      this.logEvent('사역을 성령께 온전히 맡겨드린 상태에서는 인위적으로 개입할 수 없습니다.', 'WARNING');
      return false;
    }

    const primaryComm = this.state.communities[0];
    if (!primaryComm) return false;

    const targetPerson = targetPersonId ? this.state.people.find(p => p.id === targetPersonId) || null : null;
    if (targetPerson && targetPerson.communityId) {
      const comm = this.state.communities.find(c => c.id === targetPerson.communityId);
      if (comm && (comm.isIndependent || comm.isAutonomous)) {
        this.logEvent(`[독립 자율 공동체] '${comm.name}'의 성도에게는 직접 개입(심방/정책)할 수 없습니다. 현지 리더십이 자율적으로 돌봅니다.`, 'WARNING');
        return false;
      }
    }

    const result = this.actionSystem.executeAction(
      actionId,
      primaryComm,
      targetPerson,
      this.state.people
    );

    if (result.success) {
      this.state.attention = this.actionSystem.attention;
      this.state.actions = this.actionSystem.actions;
      soundEngine.playCardUse();
      this.logEvent(result.message, 'BLESSING');

      // Trigger Word of Life toast notification
      if (actionId === 'WORD') {
        this.onWordProclaimed?.();
      }

      // Spawn blessing particles for CARE action
      if (actionId === 'CARE') {
        const commMembers = this.state.people.filter(p => p.communityId === primaryComm.id && !p.isExternal);
        // Find any shepherd to originate the blessing (fallback to center if none)
        const shepherd = commMembers.find(p => p.calling === 'SHEPHERD');
        const startX = shepherd ? shepherd.x : primaryComm.centerX;
        const startY = shepherd ? shepherd.y : primaryComm.centerY;

        if (targetPerson) {
          this.spawnParticle(startX, startY, targetPerson.x, targetPerson.y, 'BLESSING', targetPerson.id, 0.3);
        } else {
          // Global care
          const uncaredOrWeary = commMembers.filter(p => p.careStatus === 'UNCARED' || p.burnout > 50);
          uncaredOrWeary.forEach(p => {
            this.spawnParticle(startX, startY, p.x, p.y, 'BLESSING', p.id, 0.3);
          });
        }
      }

      return true;
    } else {
      this.logEvent(result.message, 'WARNING');
      return false;
    }
  }

  public spawnParticle(sourceX: number, sourceY: number, targetX: number, targetY: number, type: 'BLESSING' | 'GENERIC', targetPersonId?: string, speedModifier: number = 1.0) {
    if (!this.state.particles) this.state.particles = [];
    this.state.particles.push({
      id: `particle_${Date.now()}_${Math.random()}`,
      sourceX,
      sourceY,
      targetX,
      targetY,
      progress: 0,
      type,
      targetPersonId,
      speedModifier
    });
  }

  // Process random life events (Req 5)
  private processLifeEvents(dt: number) {
    if (this.state.isReleaseActive || this.state.communities.length === 0) return;

    // Roughly 1 event every 60 seconds on average (1/60 per second)
    if (Math.random() > (1 / 60) * dt) return;

    const comm = this.state.communities[Math.floor(Math.random() * this.state.communities.length)];
    const members = this.state.people.filter(p => p.communityId === comm.id && p.generation > 0 && !p.isBeingSent && p.movementState !== 'LEAVING');
    if (members.length < 2) return;

    const targetPerson = members[Math.floor(Math.random() * members.length)];
    if (!targetPerson) return;
    
    // Choose event type:
    // 0: 결혼으로 배우자 전도 (Marriage -> brings spouse)
    // 1: 결혼/거주지 이전 고민 (Marriage relocation contemplation)
    // 2: 취업/이직 고민 (Job relocation contemplation)
    // 3: 해외파견/유학 준비 (Study abroad contemplation)
    // 4: 관계적 갈등과 상처 (Conflict/Disappointment crisis)
    
    const eventType = Math.floor(Math.random() * 5);
    
    if (eventType === 0) {
      // Marriage -> brings spouse
      const { name, gender } = this.nameGen.generate();
      const spouse: Person = {
        id: `ext_spouse_${Date.now()}_${Math.random()}`,
        name,
        gender,
        communityId: null,
        calling: null,
        generation: 0,
        isMatureDisciple: false,
        careStatus: 'NONE',
        careTargets: [],
        x: comm.centerX + 50,
        y: comm.centerY + 50,
        vx: 0,
        vy: 0,
        radius: 10,
        movementState: 'OUTSIDE',
        targetX: null,
        targetY: null,
        trust: 25,
        depth: 15,
        stability: 30,
        readiness: 10,
        autonomy: 10,
        burnout: 0,
        need: null,
        isExternal: true,
        externalState: 'UNCONNECTED',
        wobbleOffset: Math.random() * Math.PI * 2,
        contribution: {
          reachedCount: 0, caredCount: 0, trainedCount: 0, questionsResolved: 0, deceptionsExposed: 0, crisesStabilized: 0, worshipGathered: 0
        },
      };
      this.state.people.push(spouse);
      this.admitNewcomerToCommunity(spouse, comm);
      this.logEvent(`[라이프 축복] ${targetPerson.name} 성도의 결혼으로 배우자(${spouse.name})가 공동체에 전도되었습니다!`, 'BLESSING');
    } else {
      // Life challenges: Give player & shepherds 55s opportunity to hold onto them!
      let reason = '삶의 전환기 고민';
      if (eventType === 1) reason = '결혼 후 거주지 이전 고민';
      else if (eventType === 2) reason = '취업·이직으로 인한 이주 고민';
      else if (eventType === 3) reason = '해외 유학·파견 준비';
      else if (eventType === 4) reason = '지체 간의 갈등과 마음의 상처';

      targetPerson.movementState = 'LEAVING';
      targetPerson.leavingTimer = 55; // Generous 55s opportunity window to hold on!
      targetPerson.leaveIntent = 75;
      targetPerson.leavingReason = reason;
      targetPerson.careStatus = 'UNCARED';
      soundEngine.playCardUse();
      this.logEvent(
        `[이탈 위기] ${targetPerson.name} 성도가 '${reason}'(으)로 공동체를 떠날지 고민하고 있습니다! 사랑으로 붙잡아 주십시오. (남은 시간: 55초)`,
        'WARNING'
      );
    }
  }

  /**
   * 이탈 위기 또는 영적 침체에 빠진 지체를 심방과 기도로 붙잡기 (Pastoral Rescue & Retention)
   */
  public rescuePerson(personId: string): { success: boolean; message: string } {
    const person = this.state.people.find(p => p.id === personId);
    if (!person || person.isExternal) {
      return { success: false, message: '붙잡을 대상 성도를 찾을 수 없습니다.' };
    }

    const comm = this.state.communities.find(c => c.id === person.communityId);
    if (comm && (comm.isAutonomous || comm.isIndependent)) {
      this.logEvent(`[독립 자율 공동체] '${comm.name}'은(는) 자립한 공동체입니다. 현지 목회진이 자율적으로 지체를 붙잡고 돌봅니다.`, 'WARNING');
      return { success: false, message: '독립된 자율 공동체의 성도는 현지 리더십이 자율적으로 돌봅니다.' };
    }

    const wasLeaving = person.movementState === 'LEAVING';
    const reason = person.leavingReason || (person.need ? person.need.description : '마음의 상처와 방황');

    // Restore person state completely
    person.movementState = 'INSIDE';
    person.leavingTimer = undefined;
    person.leavingReason = undefined;
    person.beingHeldById = null;
    person.leaveIntent = 0;
    person.burnout = Math.max(0, person.burnout - 35);
    person.stability = Math.min(100, Math.max(person.stability + 45, 75));
    person.trust = Math.min(100, Math.max(person.trust + 35, 65));
    person.careStatus = 'CARED';
    if (person.need) {
      person.need = null;
    }
    
    // Visual and sound feedback
    person.visualEffect = { type: 'CARE', timer: 6.0 };
    person.revealGlowTimer = 3.5;

    // Pull them gently back towards community center if drifted outside
    if (comm) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * comm.currentRadius * 0.5;
      person.targetX = comm.centerX + Math.cos(angle) * r;
      person.targetY = comm.centerY + Math.sin(angle) * r;
      comm.stats.unity = Math.min(100, comm.stats.unity + 8);
      comm.stats.resilience = Math.min(100, comm.stats.resilience + 6);
      this.spawnParticle(comm.centerX, comm.centerY, person.x, person.y, 'BLESSING', person.id, 0.4);
    }

    soundEngine.playChime();

    const msg = wasLeaving
      ? `[지체 붙잡음] 진심 어린 심방과 기도로 ${person.name} 성도를 붙잡았습니다! (${reason} 극복하고 공동체에 남기로 결단)`
      : `[사랑의 돌봄] ${person.name} 성도의 손을 꼭 잡고 위로와 기도를 전했습니다. 평안을 되찾았습니다.`;

    this.logEvent(msg, 'BLESSING');
    this.state.stats.crisesOvercome++;

    return { success: true, message: msg };
  }

  private removePerson(personId: string) {
    const idx = this.state.people.findIndex(p => p.id === personId);
    if (idx !== -1) {
      this.state.people.splice(idx, 1);
    }
  }

  // Switch priority for community (GO, ROOT, CARE)
  public setPriority(commId: string, priority: CommunityPriority): boolean {
    if (this.state.isReleaseActive) return false;
    const comm = this.state.communities.find(c => c.id === commId);
    if (!comm || comm.priorityCooldown > 0) return false;

    // Planted daughter churches operate autonomously without human player micromanagement (Req 4)
    if (comm.isAutonomous || comm.isIndependent) {
      this.logEvent(`[자립 분립교회] '${comm.name}'은(는) 사람의 통제권을 벗어나 성령의 인도하심 아래 스스로 운영됩니다.`, 'WARNING');
      return false;
    }

    comm.priority = priority;
    comm.priorityCooldown = 20;

    const msg =
      priority === 'GO'
        ? '잃은 양을 향한 선교와 전도(GO)에 집중합니다. 전도자가 세상의 이웃을 찾아 나섭니다.'
        : priority === 'ROOT'
        ? '말씀과 양육(ROOT)에 집중합니다. 교사의 말씀 나눔으로 복음의 농도가 깊어집니다.'
        : '돌봄과 회복(CARE)에 집중합니다. 목자와 중보자가 상처 입은 심령을 품습니다.';
    this.logEvent(msg, 'BLESSING');
    return true;
  }

  // Evaluate Succession Readiness for sending
  public evaluateSuccession(commId: string): SuccessionStatus {
    const comm = this.state.communities.find(c => c.id === commId);
    if (!comm) return 'LOW';

    const members = this.state.people.filter(p => p.communityId === commId && !p.isExternal);
    const leaders = members.filter(p => p.calling !== null);

    if (leaders.length >= 4 && comm.stats.formation >= 60 && comm.stats.care >= 60) {
      return 'READY';
    }
    if (leaders.length >= 2 && comm.stats.formation >= 45) {
      return 'FAIR';
    }
    return 'LOW';
  }

  // Get Succession State for primary or specified community
  public getSuccessionState(commId?: string): SuccessionStatus {
    const targetCommId = commId || this.state.communities[0]?.id;
    if (!targetCommId) return 'LOW';
    return this.evaluateSuccession(targetCommId);
  }

  // Execute SEND strategic action
  public sendLeader(
    leaderId: string,
    targetDest: 'EAST' | 'SOUTH' | 'WEST' | 'NORTH' | string,
    targetCoords?: { x: number; y: number }
  ): boolean {
    if (this.state.isReleaseActive) return false;
    if (this.state.communities.length >= 3) return false;

    const leader = this.state.people.find(p => p.id === leaderId);
    if (!leader || !leader.calling || !leader.communityId) return false;

    const sourceComm = this.state.communities.find(c => c.id === leader.communityId);
    if (!sourceComm) return false;

    // Check impact on Care Capacity (Section 44)
    const impact = GenerationSystem.calculateSendImpact(sourceComm, leader, this.state.people);
    if (impact.willCreateCareGap) {
      this.logEvent(
        `경고: 파송으로 인해 ${sourceComm.name}의 돌봄 수용력이 ${impact.currentCapacity}명에서 ${impact.projectedCapacity}명으로 감소하여 돌봄 공백이 발생합니다.`,
        'WARNING'
      );
    }

    let targetX = sourceComm.centerX;
    let targetY = sourceComm.centerY;

    if (targetCoords) {
      targetX = targetCoords.x;
      targetY = targetCoords.y;
    } else {
      // Check if targetDest is a Zone ID in current map (TASK HK4-140)
      const profile = this.mapSystem.getMapProfile();
      const zone = profile.zones.find(z => z.id === targetDest);
      if (zone) {
        targetX = zone.relX * this.worldWidth;
        targetY = zone.relY * this.worldHeight;
      } else {
        const offset = 650;
        if (targetDest === 'EAST') targetX += offset;
        if (targetDest === 'WEST') targetX -= offset;
        if (targetDest === 'SOUTH') targetY += offset;
        if (targetDest === 'NORTH') targetY += offset;
      }
    }

    // Use a larger bound margin (e.g. 250) so they aren't squished on the very edge of the map
    targetX = clamp(targetX, 250, this.worldWidth - 250);
    targetY = clamp(targetY, 250, this.worldHeight - 250);

    leader.isBeingSent = true;
    
    // TASK HK4-141: Leader + 1 Companion maximum (protecting mother community's care stability)
    const sourceMembers = this.state.people.filter(p => p.communityId === sourceComm.id && p.id !== leader.id);
    const maxFollowers = sourceMembers.length >= 6 ? 1 : 0;
    
    // Sort by depth to bring 1 faithful mature companion
    sourceMembers.sort((a, b) => b.depth - a.depth);
    const followers = sourceMembers.slice(0, maxFollowers);

    leader.sentData = {
      targetCommunitySeedX: targetX,
      targetCommunitySeedY: targetY,
      progress: 0,
      followers: followers.map(f => f.id)
    };
    leader.movementState = 'SENT';

    followers.forEach(f => {
      f.movementState = 'SENT';
      f.isBeingSent = true;
    });

    this.logEvent(
      `${leader.name} 사역자와 ${followers.length > 0 ? followers[0].name + ' 동역자가' : '사역자가'} 새로운 지경을 향해 믿음으로 파송되었습니다!`,
      'SEND'
    );
    return true;
  }

  private completeSend(leader: Person) {
    leader.isBeingSent = false;
    const newCommIndex = this.state.communities.length + 1;
    const newCommId = `comm_${newCommIndex}`;
    const existingNames = this.state.communities.map(c => c.name);
    const newName = getRandomCommunityName(existingNames);

    const sourceComm = this.state.communities.find(c => c.id === leader.communityId) || this.state.communities[0];
    
    // Ensure minimum distance of at least 180px (~3cm) and outer radius clearance from source community
    let finalX = leader.x;
    let finalY = leader.y;
    const distToSource = Math.sqrt(Math.pow(finalX - sourceComm.centerX, 2) + Math.pow(finalY - sourceComm.centerY, 2));
    const minPlantingDist = Math.max(180, sourceComm.currentRadius + 95);
    if (distToSource < minPlantingDist) {
      const angle = Math.atan2(finalY - sourceComm.centerY, finalX - sourceComm.centerX);
      finalX = sourceComm.centerX + Math.cos(angle) * minPlantingDist;
      finalY = sourceComm.centerY + Math.sin(angle) * minPlantingDist;
      leader.x = finalX;
      leader.y = finalY;
    }

    // Transmission: New Community State = Source Community 60% + Sent Leader 40% (Section 45)
    const transmittedStats = GenerationSystem.computeTransmission(sourceComm, leader);

    // Number of followers joining
    const followerIds = leader.sentData?.followers || [];
    const population = 1 + followerIds.length;

    const newCommunity: Community = {
      id: newCommId,
      name: newName,
      centerX: finalX,
      centerY: finalY,
      colorBase: newCommIndex === 2 ? 'hsl(155, 80%, 50%)' : 'hsl(42, 90%, 55%)',
      isIndependent: true,
      isAutonomous: true,
      stats: {
        population: population,
        area: 16000,
        density: population / 16000,
        clarity: transmittedStats.clarity || 65,
        unity: transmittedStats.unity || 70,
        resilience: transmittedStats.resilience || 60,
        mission: transmittedStats.mission || 75,
        formation: transmittedStats.formation || 65,
        care: transmittedStats.care || 60,
        centralization: 25,
        integrity: transmittedStats.integrity || 85,
        safeCapacity: 10 + (followerIds.length * 2),
        careCapacity: leader.calling === 'SHEPHERD' ? 4 : (1 + Math.floor(followerIds.length / 2)),
        careDemand: 1 + followerIds.length,
        uncaredCount: 0,
        shepherdCount: leader.calling === 'SHEPHERD' ? 1 : 0,
        careGap: 0,
        overloadBurnout: 0,
      },
      priority: 'GO',
      priorityCooldown: 0,
      drift: null,
      pulsePhase: Math.random() * Math.PI,
      generation: leader.generation,
      hullPoints: [],
      targetRadius: 75 + (followerIds.length * 5),
      currentRadius: 75 + (followerIds.length * 5),
    };

    leader.communityId = newCommId;
    leader.movementState = 'INSIDE';
    
    // Move followers to the new community
    followerIds.forEach(fid => {
      const p = this.state.people.find(person => person.id === fid);
      if (p) {
        p.isBeingSent = false;
        p.communityId = newCommId;
        p.movementState = 'INSIDE';
        p.x = leader.x + (Math.random() - 0.5) * 20;
        p.y = leader.y + (Math.random() - 0.5) * 20;
      }
    });

    delete leader.sentData;

    this.state.communities.push(newCommunity);
    this.state.stats.communitiesFormed++;

    soundEngine.playNewcomerChime();
    this.logEvent(
      `새로운 생명의 터전인 '${newName}'가 개척되었습니다! 복음의 생명력이 재생산됩니다.`,
      'FRUIT'
    );
  }

  private admitNewcomerToCommunity(person: Person, comm: Community) {
    person.isExternal = false;
    person.communityId = comm.id;
    person.movementState = 'INSIDE';
    person.externalState = undefined;
    person.contactWithId = null;
    person.generation = 0;
    person.isMatureDisciple = false;
    person.careCapacity = 0;
    person.careStatus = 'UNCARED'; // Will be picked up by Shepherd
    person.need = {
      type: 'NEWCOMER',
      duration: 75,
      maxDuration: 75,
      description: '새로 연결된 지체입니다. 목자의 돌봄이나 교제가 필요합니다.',
    };

    this.state.stats.peopleReached++;
    this.state.stats.newcomerCount++;
    if (this.state.isReleaseActive) {
      this.state.stats.autonomousReachCount++;
    }
    soundEngine.playNewcomerChime();

    this.logEvent(
      `${person.name} 님이 전도자의 인도로 ${comm.name}에 첫 발을 내딛었습니다!`,
      'FRUIT'
    );
  }

  // Trigger THE RELEASE (540s)
  public triggerTheRelease() {
    this.state.isReleaseActive = true;
    this.state.stats.isReleaseActive = true;

    // Capture Pre-release snapshot
    this.state.releaseSnapshot = ReleaseSystem.captureSnapshot(
      this.state.communities,
      this.state.people,
      540
    );

    soundEngine.playReleaseFanfare();
    this.logEvent(
      '09:00 [성령께 온전히 맡겨드림] 사람의 인위적 개입을 멈추고 공동체가 오직 성령 안에서 자율적으로 움직입니다!',
      'RELEASE'
    );
  }

  // Complete Run (570s)
  private finishRun() {
    this.state.isGameOver = true;
    this.state.stats.isGameOver = true;

    const evaluation = ReleaseSystem.evaluateRelease(
      this.state.releaseSnapshot,
      this.state.communities,
      this.state.people,
      this.state.stats
    );

    this.state.stats.autonomyScore = evaluation.autonomyScore;
    this.state.stats.multiplicationScore = evaluation.multiplicationScore;
    this.state.stats.kingdomHealthScore = evaluation.kingdomHealthScore;
    this.state.stats.gospelIntegrityScore = evaluation.gospelIntegrityScore;
    this.state.stats.reachScore = evaluation.reachScore;
    this.state.stats.finalScore = evaluation.finalScore;
    this.state.stats.finalGrade = evaluation.finalGrade;

    // Narrative Run Story
    const story: string[] = [];
    const topEvangelist = this.state.people.find(p => p.calling === 'EVANGELIST');
    if (topEvangelist && topEvangelist.contribution.reachedCount > 0) {
      story.push(`${topEvangelist.name} 전도자가 경계를 넘어 ${topEvangelist.contribution.reachedCount}명의 새 영혼을 맞이했습니다.`);
    }
    const topShepherd = this.state.people.find(p => p.calling === 'SHEPHERD');
    if (topShepherd && topShepherd.contribution.caredCount > 0) {
      story.push(`${topShepherd.name} 목자가 낙심한 지체와 새가족을 품어 이탈을 막아냈습니다.`);
    }
    const topTeacher = this.state.people.find(p => p.calling === 'TEACHER');
    if (topTeacher) {
      story.push(`${topTeacher.name} 교사가 진리의 말씀으로 지체들의 심령에 복음의 농도를 깊고 확고하게 세웠습니다.`);
    }
    if (this.state.stats.communitiesFormed > 1) {
      story.push(`공동체가 단일 거대 조직에 안주하지 않고 ${this.state.stats.communitiesFormed}개의 독립된 몸으로 번식했습니다.`);
    }
    story.push(`사역의 마지막에 주님께 온전히 맡겨드렸을 때, 그리스도의 몸 된 교회는 성령 안에서 스스로 살아서 움직였습니다.`);
    this.state.stats.runStory = story;

    // Simplified Causal Reflections (Section 50)
    this.state.stats.struggles = evaluation.reflections;
  }

  // Periodic Need Spawner: HK5-052 Base Need Weight x Map Profile x Zone Modifier x AgeBand
  private spawnPeriodicNeed() {
    const internalPeople = this.state.people.filter(p => !p.isExternal && !p.need && !p.isMatureDisciple);
    if (internalPeople.length === 0) return;

    const candidate = internalPeople[Math.floor(Math.random() * internalPeople.length)];
    const currentMapProfile = this.mapSystem.getMapProfile();
    const zone = this.mapSystem.getZoneAt(candidate.x, candidate.y, this.worldWidth, this.worldHeight);

    let questionWeight = 35;
    let wearyWeight = 30;
    let tensionWeight = 35;

    // Map profile adjustments
    if (currentMapProfile.id === 'CAMPUS') {
      questionWeight *= 1.6;
    } else if (currentMapProfile.id === 'DOWNTOWN') {
      wearyWeight *= 1.7;
    } else if (currentMapProfile.id === 'COUNTRYSIDE') {
      wearyWeight *= 0.8;
      tensionWeight *= 1.25;
    }

    // Zone influence
    if (zone) {
      questionWeight *= zone.influence.questionNeedMultiplier;
      wearyWeight *= (1.8 - zone.influence.careMultiplier * 0.8);
    }

    // AgeBand influence (HK5-051)
    if (candidate.ageBand === 'YOUNG') {
      questionWeight *= 1.35;
    } else if (candidate.ageBand === 'ADULT') {
      wearyWeight *= 1.3;
    } else if (candidate.ageBand === 'SENIOR') {
      tensionWeight *= 1.25;
      questionWeight *= 0.7;
    }

    if (candidate.trust < 40) {
      tensionWeight *= 1.5;
    }

    const totalWeight = questionWeight + wearyWeight + tensionWeight;
    const roll = Math.random() * totalWeight;

    if (roll < questionWeight) {
      candidate.need = {
        type: 'QUESTION',
        duration: 75,
        maxDuration: 75,
        description: '말씀에 대한 깊은 의문이 생겼습니다. 복음의 깊은 나눔(ROOT)이 필요합니다.',
      };
    } else if (roll < questionWeight + wearyWeight) {
      candidate.need = {
        type: 'WEARY',
        duration: 75,
        maxDuration: 75,
        description: '사역과 일상에 지쳐 탈진 상태입니다. 기도의 손길과 쉼(CARE)이 절실합니다.',
      };
      candidate.burnout = Math.min(100, candidate.burnout + 20);
    } else {
      candidate.need = {
        type: 'TENSION',
        duration: 75,
        maxDuration: 75,
        description: '지체 간의 오해로 마음의 거리감이 생겼습니다. 식탁의 교제(FELLOWSHIP)가 필요합니다.',
      };
    }
  }

  // Need Expiry handling
  private handleNeedExpiry(person: Person) {
    if (!person.need) return;
    const needType = person.need.type;
    person.need = null;

    const targetCommId = person.communityId || 'comm_1';
    const commVuln = this.getVulnerabilities(targetCommId);

    switch (needType) {
      case 'QUESTION':
        commVuln.confusion += 10;
        break;
      case 'NEWCOMER':
        commVuln.division += 10;
        break;
      case 'WEARY':
        commVuln.burnout += 10;
        break;
      case 'TENSION':
        commVuln.division += 12;
        break;
    }

    // If already being held by a shepherd, the person is protected from leaving!
    if (person.beingHeldById) {
      person.leaveIntent = 15;
      person.stability = 60;
      this.logEvent(`${person.name} 성도가 영적 위기를 겪었으나, 곁에 선 목자의 손길로 지켜졌습니다.`, 'FRUIT');
      return;
    }

    // Person enters visible LEAVING state: provides 50s grace window for shepherds to run over and hold them!
    person.movementState = 'LEAVING';
    person.leaveIntent = 80;
    person.leavingTimer = 50;
    person.leavingReason = person.leavingReason || '영적 소진과 오랜 무관심으로 인한 이탈 위기';
    soundEngine.playCardUse();
    this.logEvent(`[이탈 위기] ${person.name} 성도가 오랜 아픔과 무관심으로 공동체를 떠나려 합니다! 목자의 긴급 심방이 필요합니다. (남은 시간: 50초)`, 'WARNING');
  }

  private dropOutPerson(person: Person) {
    const reasonStr = person.leavingReason ? `(${person.leavingReason})` : '';
    this.logEvent(`[이탈] ${person.name} 성도가 끝내 붙잡는 손길을 얻지 못하고 공동체를 떠나갔습니다. ${reasonStr}`, 'WARNING');
    person.isExternal = true;
    person.communityId = null;
    person.calling = null;
    person.generation = 0;
    person.isMatureDisciple = false;
    person.careStatus = 'NONE';
    person.externalState = 'UNCONNECTED';
    person.movementState = 'OUTSIDE';
    person.beingHeldById = null;
    person.leavingTimer = undefined;
    person.leavingReason = undefined;
    person.contactProgress = 0;
    person.contactDuration = 0;
    person.engagedSeekerIds = [];
    
    // Clear relationships
    if (person.careTargets) person.careTargets = [];
    
    // Play sad sound
    soundEngine.playCardUse(); 
  }

  // Replenish external seekers (HK5-050: target pool based on map profile)
  private replenishExternalPeople() {
    const targetCount = this.getExternalTargetCount();
    const currentExt = this.state.people.filter(p => p.isExternal).length;
    if (currentExt < targetCount) {
      const { name, gender } = this.nameGen.generate();
      const cx = this.worldWidth / 2;
      const cy = this.worldHeight / 2;

      const newPerson: Person = {
        id: `ext_replenish_${Date.now()}_${Math.random()}`,
        name,
        gender,
        communityId: null,
        calling: null,
        generation: 0,
        isMatureDisciple: false,
        careStatus: 'NONE',
        careTargets: [],
        x: cx,
        y: cy,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        radius: 10,
        movementState: 'OUTSIDE',
        targetX: null,
        targetY: null,
        trust: 25,
        depth: 15,
        stability: 30,
        readiness: 10,
        autonomy: 10,
        burnout: 0,
        need: null,
        isExternal: true,
        externalState: 'UNCONNECTED',
        ageBand: this.getRandomAgeBand(),
        remainingStayTime: this.mapSystem.getMapProfile().averageStayTime * (50 + Math.random() * 40),
        wobbleOffset: Math.random() * Math.PI * 2,
        contribution: {
          reachedCount: 0,
          caredCount: 0,
          trainedCount: 0,
          questionsResolved: 0,
          deceptionsExposed: 0,
          crisesStabilized: 0,
          worshipGathered: 0,
        },
      };

      // Spawn at a natural entry hub/residence and begin daily routine into town
      initializePersonRoutine(newPerson, this.mapSystem, this.worldWidth, this.worldHeight, true);
      this.state.people.push(newPerson);
    }
  }

  private logEvent(text: string, type: StoryEvent['type']) {
    const ev: StoryEvent = {
      id: `ev_${Date.now()}_${Math.random()}`,
      timestamp: Math.round(this.state.timeElapsed),
      text,
      type,
    };
    this.state.events.unshift(ev);
    if (this.state.events.length > 25) {
      this.state.events.pop();
    }
  }

  /**
   * Export Debug Metrics as CSV (Section 57)
   */
  public exportMetricsCSV(): string {
    const s = this.state.stats;
    const rows = [
      ['Metric', 'Value'],
      ['Time Elapsed', `${Math.round(s.timeElapsed)}s`],
      ['Total People Reached', `${s.peopleReached}`],
      ['Communities Formed', `${s.communitiesFormed}`],
      ['Leaders Trained', `${s.leadersTrained}`],
      ['Crises Overcome', `${s.crisesOvercome}`],
      ['Final Score', `${s.finalScore}`],
      ['Final Grade', `${s.finalGrade}`],
      ['Kingdom Health Score', `${s.kingdomHealthScore}`],
      ['Gospel Integrity Score', `${s.gospelIntegrityScore}`],
      ['Autonomy Score', `${s.autonomyScore}`],
      ['Multiplication Score', `${s.multiplicationScore}`],
      ['Reach Score', `${s.reachScore}`],
    ];
    return rows.map(r => r.join(',')).join('\n');
  }

  /**
   * Export Debug Metrics as JSON (Section 57)
   */
  public exportMetricsJSON(): string {
    return JSON.stringify(
      {
        stats: this.state.stats,
        communities: this.state.communities,
        releaseSnapshot: this.state.releaseSnapshot,
      },
      null,
      2
    );
  }
}
