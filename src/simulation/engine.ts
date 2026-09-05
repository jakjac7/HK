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
} from '../types';
import { NameGenerator } from '../data/names';
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
  private vulnerabilities: VulnerabilityAccumulator = {
    confusion: 0,
    division: 0,
    burnout: 0,
    apathy: 0,
  };

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
  }

  public reset(isKoreanTheme?: boolean) {
    if (isKoreanTheme !== undefined) {
      this.nameGen.setTheme(isKoreanTheme);
    }
    this.nameGen.reset();
    this.hasInitialLayout = false;
    this.actionSystem = new ActionSystem();
    this.vulnerabilities = { confusion: 0, division: 0, burnout: 0, apathy: 0 };
    this.state = this.createInitialState();
  }

  private createInitialState(): GameEngineState {
    const cx = this.worldWidth / 2;
    const cy = this.worldHeight / 2;

    const initialCommunity: Community = {
      id: 'comm_1',
      name: '안디옥 공동체',
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
        careCapacity: 8,
        careDemand: 6,
        uncaredCount: 0,
        shepherdCount: 1,
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

    // Req 3: Initial community members should only be Intercessors, Worshippers, or null (disciples).
    // The player will need to train them to get Shepherd/Teacher/Evangelist.
    // (Note: This makes early game challenging as there's no Shepherd initially, they must use action to upgrade).
    const callingsList: { calling: CallingType; nameGenGender: 'M' | 'F' }[] = [
      { calling: 'INTERCESSOR', nameGenGender: 'M' },
      { calling: 'WORSHIPPER', nameGenGender: 'F' },
      { calling: 'INTERCESSOR', nameGenGender: 'M' },
      { calling: 'WORSHIPPER', nameGenGender: 'F' },
      { calling: null, nameGenGender: 'F' },
      { calling: null, nameGenGender: 'M' },
    ];

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

    // 8 External seekers
    for (let i = 0; i < 8; i++) {
      const { name, gender } = this.nameGen.generate();
      const extAngle = (i / 8) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const extDist = 180 + Math.random() * 120;

      people.push({
        id: `external_${i + 1}`,
        name,
        gender,
        communityId: null,
        calling: null,
        generation: 0,
        isMatureDisciple: false,
        careStatus: 'NONE',
        careTargets: [],
        x: cx + Math.cos(extAngle) * extDist,
        y: cy + Math.sin(extAngle) * extDist,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
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

    const initialEvent: StoryEvent = {
      id: 'event_init',
      timestamp: 0,
      text: '안디옥 공동체가 기도로 첫 걸음을 내딛습니다. 개척멤버(G0)들이 사랑과 복음으로 섬깁니다.',
      type: 'BLESSING',
    };

    const possibleMaps: MapId[] = ['CAMPUS', 'COUNTRYSIDE', 'DOWNTOWN'];
    const randomMapId = possibleMaps[Math.floor(Math.random() * possibleMaps.length)];
    this.mapSystem.setMap(randomMapId);

    return {
      timeElapsed: 0,
      isPaused: false,
      gameSpeed: 1,
      isReleaseActive: false,
      isGameOver: false,
      attention: 3.0,
      maxAttention: 3,
      particles: [],
      mapId: randomMapId,
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
        mapId: randomMapId,
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
    const isSunday = this.state.timeElapsed > 10 && (this.state.timeElapsed % 180) < 15;
    
    for (const person of this.state.people) {
      const { fx, fy, maxSpeed } = calculatePersonSteering(
        person,
        this.state.people,
        this.state.communities,
        world,
        dt,
        this.state.isReleaseActive,
        isSunday
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
            person.leavingTimer = Math.min(25, person.leavingTimer + dt * 2);
          }
          if ((person.leaveIntent || 0) < 20) {
            person.movementState = 'INSIDE';
            person.leavingTimer = undefined;
            person.beingHeldById = null;
          }
        } else {
          // Member is drifting outward away from church
          if (person.leavingTimer === undefined) person.leavingTimer = 25;
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
                person.leavingTimer = 8; // Extra grace if shepherd is on the way
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

      // Ingress check: When following external person reaches community radius
      if (person.isExternal && person.externalState === 'CONTACTED') {
        person.externalState = 'FOLLOWING';
      }
      if (person.isExternal && person.externalState === 'FOLLOWING') {
        for (const comm of this.state.communities) {
          const dToComm = distance(person.x, person.y, comm.centerX, comm.centerY);
          if (dToComm <= comm.currentRadius * 0.85) {
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

      // 4. Calling Discovery Check: When readiness & depth >= 70, triggers calling reveal!
      if (!person.calling && person.communityId && person.depth >= 68 && person.readiness >= 68) {
        const comm = this.state.communities.find(c => c.id === person.communityId);
        if (comm) {
          this.triggerCallingDiscovery(person, comm);
        }
      }
      
      if (person.visualEffect && person.visualEffect.timer > 0) {
        person.visualEffect.timer = Math.max(0, person.visualEffect.timer - dt);
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
        this.vulnerabilities,
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

      // 1. Autonomous Priority Balancing (every 14 seconds)
      if (commTimer > 14) {
        this.autonomousActionTimers.set(comm.id, 0);

        const wearyCount = members.filter(p => p.burnout > 50 || p.need?.type === 'WEARY').length;
        const leavingCount = members.filter(p => p.movementState === 'LEAVING').length;
        const questionCount = members.filter(p => p.need?.type === 'QUESTION').length;

        if (wearyCount > 0 || leavingCount > 0 || questionCount > 0) {
          comm.priority = 'CARE';
        } else if (members.length < 8) {
          comm.priority = 'GO';
        } else {
          comm.priority = 'ROOT';
        }

        // 2. Autonomous Discipleship / Leader Training
        const matureLeader = members.find(p => p.isMatureDisciple || p.calling !== null);
        const discipleCandidate = members.find(p => p.calling === null && (p.readiness > 45 || p.depth > 45));
        if (matureLeader && discipleCandidate && Math.random() < 0.4) {
          this.triggerCallingDiscovery(discipleCandidate, comm);
          this.logEvent(
            `[분립교회 자율 양육] ${comm.name}의 ${discipleCandidate.name} 성도가 자체적인 양육을 통해 사역자로 세워졌습니다!`,
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
          seeker.attraction = Math.min(100, (seeker.attraction || 0) + dt * 16);

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

  public triggerCallingDiscovery(person: Person, comm: Community) {
    const mentor = this.state.people.find(p => p.communityId === comm.id && p.id !== person.id && p.calling !== null);
    const calling = CallingSystem.discoverCalling(
      person,
      comm,
      this.state.people
    );

    let generation: Generation = 1;
    if (mentor) {
      const trainRes = GenerationSystem.trainDisciple(mentor, person);
      generation = trainRes.nextGen;
    } else {
      person.generation = 1;
      person.isMatureDisciple = true;
    }
    person.calling = calling;

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
      if (comm && comm.isIndependent) {
        this.logEvent('독립된 개척 공동체의 성도에게는 개입할 수 없습니다.', 'WARNING');
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

  public resolveDriftManual(commId: string, type: string) {
    const cost = 1; // Fixed attention cost to manually resolve drift
    if (this.state.attention < cost) {
      this.logEvent('시선(행동력)이 부족하여 위기 문제를 직접 해결할 수 없습니다.', 'WARNING');
      return;
    }

    const comm = this.state.communities.find(c => c.id === commId);
    if (!comm || !comm.drift || comm.drift.type !== type) return;

    this.actionSystem.attention -= cost;
    this.state.attention = this.actionSystem.attention;
    comm.drift = null; // Instantly resolve it
    
    soundEngine.playCardUse(); // Play sound effect
    this.logEvent(`[${comm.name}]의 위기 상황을 행동력을 소모하여 직접 개입해 해결했습니다.`, 'BLESSING');
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
    const members = this.state.people.filter(p => p.communityId === comm.id && p.generation > 0);
    if (members.length < 2) return;

    const targetPerson = members[Math.floor(Math.random() * members.length)];
    
    // Choose event type:
    // 0: 결혼으로 배우자 전도 (Marriage -> brings spouse)
    // 1: 결혼으로 타 공동체 전출 (Marriage -> transfers out)
    // 2: 취업/이직으로 전출 (Job relocation -> transfers out)
    // 3: 해외파견/유학으로 전출 (Study abroad -> transfers out)
    // 4: 결별/갈등으로 이탈 (Breakup/Conflict -> 1-2 people leave)
    
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
      this.logEvent(`[라이프 이벤트] ${targetPerson.name} 성도의 결혼으로 배우자(${spouse.name})가 공동체에 전도되었습니다!`, 'BLESSING');
    } else if (eventType === 1) {
      // Marriage -> transfers out
      this.logEvent(`[라이프 이벤트] ${targetPerson.name} 성도가 결혼으로 인해 타 공동체로 파송(전출)되었습니다. 축복합니다!`, 'WARNING');
      this.removePerson(targetPerson.id);
    } else if (eventType === 2) {
      // Job relocation
      this.logEvent(`[라이프 이벤트] ${targetPerson.name} 성도가 취업/이직으로 타 지역으로 이주하게 되었습니다.`, 'WARNING');
      this.removePerson(targetPerson.id);
    } else if (eventType === 3) {
      // Study abroad
      this.logEvent(`[라이프 이벤트] ${targetPerson.name} 성도가 해외 유학/파견으로 출국하게 되었습니다.`, 'WARNING');
      this.removePerson(targetPerson.id);
    } else if (eventType === 4) {
      // Breakup/Conflict -> leaves
      this.logEvent(`[라이프 이벤트] 인간관계의 갈등/결별로 인해 ${targetPerson.name} 성도가 공동체를 이탈했습니다. 기도가 필요합니다.`, 'WARNING');
      this.removePerson(targetPerson.id);
      
      // 30% chance another person leaves too
      if (Math.random() < 0.3) {
        const remaining = this.state.people.filter(p => p.communityId === comm.id && p.generation > 0);
        if (remaining.length > 0) {
          const secondTarget = remaining[Math.floor(Math.random() * remaining.length)];
          this.logEvent(`[라이프 이벤트] 갈등의 여파로 ${secondTarget.name} 성도 또한 이탈했습니다.`, 'WARNING');
          this.removePerson(secondTarget.id);
        }
      }
    }
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

  // Execute SEND strategic action
  public sendLeader(leaderId: string, targetDirection: 'EAST' | 'SOUTH' | 'WEST' | 'NORTH'): boolean {
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

    // Set a much larger offset to ensure the new community is planted sufficiently far away without overlap.
    const offset = 650;
    let targetX = sourceComm.centerX;
    let targetY = sourceComm.centerY;

    if (targetDirection === 'EAST') targetX += offset;
    if (targetDirection === 'WEST') targetX -= offset;
    if (targetDirection === 'SOUTH') targetY += offset;
    if (targetDirection === 'NORTH') targetY -= offset;

    // Use a larger bound margin (e.g. 250) so they aren't squished on the very edge of the map
    targetX = clamp(targetX, 250, this.worldWidth - 250);
    targetY = clamp(targetY, 250, this.worldHeight - 250);

    leader.isBeingSent = true;
    
    // Select up to 20% of source community members to follow the leader
    const sourceMembers = this.state.people.filter(p => p.communityId === sourceComm.id && p.id !== leader.id);
    const maxFollowers = Math.floor(sourceMembers.length * 0.2);
    
    // Sort by depth to bring mature members or random. Let's just shuffle or sort by depth.
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
      `${leader.name} 사역자와 ${followers.length}명의 동역자가 새로운 지경을 향해 믿음으로 파송되었습니다!`,
      'SEND'
    );
    return true;
  }

  private completeSend(leader: Person) {
    leader.isBeingSent = false;
    const newCommIndex = this.state.communities.length + 1;
    const newCommId = `comm_${newCommIndex}`;
    const newName = newCommIndex === 2 ? '빌립보 공동체' : '에베소 공동체';

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

  // Periodic Need Spawner
  private spawnPeriodicNeed() {
    const internalPeople = this.state.people.filter(p => !p.isExternal && !p.need && !p.isMatureDisciple);
    if (internalPeople.length === 0) return;

    const candidate = internalPeople[Math.floor(Math.random() * internalPeople.length)];
    const roll = Math.random();

    if (roll < 0.35) {
      candidate.need = {
        type: 'QUESTION',
        duration: 75,
        maxDuration: 75,
        description: '말씀에 대한 깊은 의문이 생겼습니다. 복음의 깊은 나눔이 필요합니다.',
      };
    } else if (roll < 0.65) {
      candidate.need = {
        type: 'WEARY',
        duration: 75,
        maxDuration: 75,
        description: '사역과 일상에 지쳐 탈진 상태입니다. 기도의 손길이 절실합니다.',
      };
      candidate.burnout = Math.min(100, candidate.burnout + 20);
    } else {
      candidate.need = {
        type: 'TENSION',
        duration: 75,
        maxDuration: 75,
        description: '지체 간의 오해로 마음의 거리감이 생겼습니다. 식탁의 교제(함께하기)가 필요합니다.',
      };
    }
  }

  // Need Expiry handling
  private handleNeedExpiry(person: Person) {
    if (!person.need) return;
    const needType = person.need.type;
    person.need = null;

    switch (needType) {
      case 'QUESTION':
        this.vulnerabilities.confusion += 10;
        break;
      case 'NEWCOMER':
        this.vulnerabilities.division += 10;
        break;
      case 'WEARY':
        this.vulnerabilities.burnout += 10;
        break;
      case 'TENSION':
        this.vulnerabilities.division += 12;
        break;
    }

    // If already being held by a shepherd, the person is protected from leaving!
    if (person.beingHeldById) {
      person.leaveIntent = 15;
      person.stability = 60;
      this.logEvent(`${person.name} 성도가 영적 위기를 겪었으나, 곁에 선 목자의 손길로 지켜졌습니다.`, 'FRUIT');
      return;
    }

    // Person enters visible LEAVING state: provides 25s grace window for shepherds to run over and hold them!
    person.movementState = 'LEAVING';
    person.leaveIntent = 80;
    person.leavingTimer = 25;
    soundEngine.playCardUse();
    this.logEvent(`[이탈 위기] ${person.name} 성도가 오랜 아픔과 무관심으로 공동체를 떠나려 합니다! 목자의 긴급 심방이 필요합니다.`, 'WARNING');
  }

  private dropOutPerson(person: Person) {
    this.logEvent(`${person.name} 성도가 끝내 돌봄을 받지 못하고 쓸쓸히 공동체를 떠나갔습니다.`, 'WARNING');
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
    person.contactProgress = 0;
    person.contactDuration = 0;
    person.engagedSeekerIds = [];
    
    // Clear relationships
    if (person.careTargets) person.careTargets = [];
    
    // Play sad sound
    soundEngine.playCardUse(); 
  }

  // Replenish external seekers
  private replenishExternalPeople() {
    const currentExt = this.state.people.filter(p => p.isExternal).length;
    if (currentExt < 8) {
      const { name, gender } = this.nameGen.generate();
      const angle = Math.random() * Math.PI * 2;
      const dist = 240 + Math.random() * 100;
      const cx = this.worldWidth / 2;
      const cy = this.worldHeight / 2;

      this.state.people.push({
        id: `ext_replenish_${Date.now()}_${Math.random()}`,
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
