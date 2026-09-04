/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Person,
  Community,
  PracticeCard,
  RunStats,
  CommunityPriority,
  CallingType,
  SuccessionStatus,
  StoryEvent,
  DriftType,
  Generation,
} from '../types';
import { NameGenerator } from '../data/names';
import { createStarterDeck, PRACTICE_CARDS_CATALOG } from '../data/cards';
import { calculatePersonSteering, distance, clamp } from './steering';
import { calculateCommunityHull } from './communityBlob';
import { soundEngine } from './sound';
import { getGenerationLabel, getCallingLabel } from '../utils/faithTerms';

export interface GameEngineState {
  timeElapsed: number;
  isPaused: boolean;
  gameSpeed: number; // 1, 2
  isReleaseActive: boolean;
  isGameOver: boolean;
  
  attention: number; // 0-3 (float internally, integer for UI display)
  maxAttention: number;
  
  deck: PracticeCard[];
  hand: PracticeCard[];
  discard: PracticeCard[];
  cardDrawTimer: number;
  
  communities: Community[];
  people: Person[];
  
  selectedPersonId: string | null;
  selectedCardId: string | null;
  
  events: StoryEvent[];
  stats: RunStats;
}

export class GameEngine {
  public state: GameEngineState;
  private nameGen: NameGenerator;
  private worldWidth: number = 800;
  private worldHeight: number = 600;
  private needSpawnTimer: number = 0;
  private driftDirectorTimer: number = 0;
  private externalReplenishTimer: number = 0;
  private hasInitialLayout: boolean = false;

  constructor(isKoreanTheme: boolean = true) {
    this.nameGen = new NameGenerator(isKoreanTheme);
    // Use responsive viewport dimensions if running in a browser
    if (typeof window !== 'undefined' && window.innerWidth > 0 && window.innerHeight > 0) {
      this.worldWidth = Math.max(320, window.innerWidth);
      this.worldHeight = Math.max(320, window.innerHeight - 240);
    }
    this.state = this.createInitialState();
  }

  public setWorldDimensions(w: number, h: number) {
    const oldW = this.worldWidth;
    const oldH = this.worldHeight;
    this.worldWidth = Math.max(320, w);
    this.worldHeight = Math.max(320, h);

    // On initial layout or when screen first resolves container dimensions:
    if (!this.hasInitialLayout && w > 50 && h > 50) {
      this.hasInitialLayout = true;
      const targetCx = this.worldWidth / 2;
      const targetCy = this.worldHeight / 2;

      // Center the primary initial community
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

    // Safety bounds enforcement: Ensure no community is stuck off screen
    for (const comm of this.state.communities) {
      const padX = Math.min(comm.currentRadius + 20, this.worldWidth * 0.4);
      const padY = Math.min(comm.currentRadius + 20, this.worldHeight * 0.4);
      comm.centerX = clamp(comm.centerX, padX, this.worldWidth - padX);
      comm.centerY = clamp(comm.centerY, padY, this.worldHeight - padY);
    }

    // Keep external people within world boundary
    for (const person of this.state.people) {
      person.x = clamp(person.x, 20, this.worldWidth - 20);
      person.y = clamp(person.y, 20, this.worldHeight - 20);
    }
  }

  public reset(isKoreanTheme?: boolean) {
    if (isKoreanTheme !== undefined) {
      this.nameGen.setTheme(isKoreanTheme);
    }
    this.nameGen.reset();
    this.hasInitialLayout = false;
    this.state = this.createInitialState();
  }

  private createInitialState(): GameEngineState {
    const cx = this.worldWidth / 2;
    const cy = this.worldHeight / 2;

    // Community 1: Antioch (안디옥 공동체)
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

    // 5 Initial Calling Leaders + 1 Disciple member (Total 6)
    const callingsList: { calling: CallingType; nameGenGender: 'M' | 'F' }[] = [
      { calling: 'EVANGELIST', nameGenGender: 'M' },
      { calling: 'SHEPHERD', nameGenGender: 'F' },
      { calling: 'TEACHER', nameGenGender: 'M' },
      { calling: 'INTERCESSOR', nameGenGender: 'F' },
      { calling: 'WORSHIPPER', nameGenGender: 'F' },
      { calling: null, nameGenGender: 'M' }, // seeker/ready disciple
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
        generation: 0 as Generation, // 개척멤버
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        radius: 12,
        movementState: 'INSIDE',
        targetX: null,
        targetY: null,
        trust: 70 + Math.floor(Math.random() * 20),
        depth: item.calling === 'TEACHER' ? 85 : 55 + Math.floor(Math.random() * 25),
        stability: 65 + Math.floor(Math.random() * 25),
        readiness: item.calling ? 75 : 50,
        autonomy: item.calling ? 65 : 40,
        burnout: 5 + Math.floor(Math.random() * 10),
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

    // Surrounding External People (8 nodes wandering in outer wilderness)
    for (let i = 0; i < 9; i++) {
      const { name, gender } = this.nameGen.generate();
      const extAngle = (i / 9) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const extDist = 180 + Math.random() * 120;

      people.push({
        id: `external_${i + 1}`,
        name,
        gender,
        communityId: null,
        calling: null,
        generation: 0,
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

    // Starter Practice Deck & Initial Hand (3 cards)
    const starterDeck = createStarterDeck();
    const hand = starterDeck.slice(0, 3);
    const deck = starterDeck.slice(3);

    const initialEvent: StoryEvent = {
      id: 'event_init',
      timestamp: 0,
      text: '안디옥 공동체가 기도로 첫 걸음을 내딛습니다. 5대 은사가 자율적으로 섬깁니다.',
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
      deck,
      hand,
      discard: [],
      cardDrawTimer: 0,
      communities: [initialCommunity],
      people,
      selectedPersonId: null,
      selectedCardId: null,
      events: [initialEvent],
      stats: {
        timeElapsed: 0,
        isReleaseActive: false,
        isGameOver: false,
        peopleReached: 0,
        newcomerCount: 0,
        leadersTrained: 0,
        g1Count: 5,
        g2Count: 0,
        g3Count: 0,
        deceptionsExposed: 0,
        crisesOvercome: 0,
        communitiesFormed: 1,
        autonomyScore: 0,
        multiplicationScore: 0,
        kingdomHealthScore: 0,
        gospelIntegrityScore: 0,
        reachScore: 0,
        finalScore: 0,
        finalGrade: 'B',
        runStory: [],
        struggles: [],
      },
    };
  }

  /**
   * Main game tick (called from requestAnimationFrame or timer)
   * dt in seconds
   */
  public update(realDt: number) {
    if (this.state.isPaused || this.state.isGameOver) return;

    const simSpeed = (this.state.isReleaseActive ? 2.0 : 1.0) * this.state.gameSpeed;
    const dt = Math.min(realDt, 0.1) * simSpeed;

    this.state.timeElapsed += dt;
    this.state.stats.timeElapsed = this.state.timeElapsed;

    // Check Phase transitions:
    // At 09:00 (540s), trigger THE RELEASE (Player Control OFF!)
    if (this.state.timeElapsed >= 540 && !this.state.isReleaseActive && !this.state.isGameOver) {
      this.triggerTheRelease();
    }

    // At 09:30 (570s), complete run and evaluate victory score
    if (this.state.timeElapsed >= 570 && !this.state.isGameOver) {
      this.finishRun();
      return;
    }

    // 1. Attention recharge (1 per 8 seconds, max 3)
    if (this.state.attention < this.state.maxAttention) {
      this.state.attention = Math.min(
        this.state.maxAttention,
        this.state.attention + (1 / 8) * dt
      );
    }

    // 2. Card Draw (1 every 12 seconds when hand < 3)
    if (this.state.hand.length < 3) {
      this.state.cardDrawTimer += dt;
      if (this.state.cardDrawTimer >= 12) {
        this.state.cardDrawTimer = 0;
        this.drawCard();
      }
    }

    // 3. Priority Cooldown
    for (const comm of this.state.communities) {
      if (comm.priorityCooldown > 0) {
        comm.priorityCooldown = Math.max(0, comm.priorityCooldown - dt);
      }
    }

    // 4. Update People Movement & Steering
    const world = { width: this.worldWidth, height: this.worldHeight };
    for (const person of this.state.people) {
      const { fx, fy, maxSpeed } = calculatePersonSteering(
        person,
        this.state.people,
        this.state.communities,
        world,
        dt,
        this.state.isReleaseActive
      );

      // Integrate velocity with acceleration & drag
      person.vx = (person.vx + fx * dt) * 0.92;
      person.vy = (person.vy + fy * dt) * 0.92;

      // Clamp speed
      const speed = Math.sqrt(person.vx * person.vx + person.vy * person.vy);
      if (speed > maxSpeed) {
        person.vx = (person.vx / speed) * maxSpeed;
        person.vy = (person.vy / speed) * maxSpeed;
      }

      person.x += person.vx * dt;
      person.y += person.vy * dt;

      // Update Need countdown
      if (person.need) {
        person.need.duration -= dt;
        if (person.need.duration <= 0) {
          this.handleNeedExpiry(person);
        }
      }

      // Check Sent Leader planting milestone
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

      // Ingress check: When following external person crosses community radius, they enter!
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

      // Autonomous Worshipper gathering pulse
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

      // Natural spiritual growth for disciples around Teacher
      if (!person.calling && person.depth >= 65 && person.readiness >= 65 && !person.need) {
        person.need = {
          type: 'READY',
          duration: 30,
          maxDuration: 30,
          description: '제자 훈련(Train)으로 은사별 리더가 될 준비가 되었습니다.',
        };
      }
    }

    // 5. Update Communities (Dynamic area, radius, hull, stats)
    for (const comm of this.state.communities) {
      const members = this.state.people.filter(p => p.communityId === comm.id);
      comm.stats.population = members.length;

      // Safe Capacity: Base 8 + Intercessors * 4 + Resilience * 0.15 - BurnoutLoad
      const intercessorsCount = members.filter(m => m.calling === 'INTERCESSOR').length;
      const teachersCount = members.filter(m => m.calling === 'TEACHER').length;
      const shepherdsCount = members.filter(m => m.calling === 'SHEPHERD').length;
      const evangelistsCount = members.filter(m => m.calling === 'EVANGELIST').length;
      const worshippersCount = members.filter(m => m.calling === 'WORSHIPPER').length;

      const avgBurnout = members.length > 0 ? members.reduce((acc, m) => acc + m.burnout, 0) / members.length : 0;
      const avgDepth = members.length > 0 ? members.reduce((acc, m) => acc + m.depth, 0) / members.length : 0;
      const avgStability = members.length > 0 ? members.reduce((acc, m) => acc + m.stability, 0) / members.length : 0;

      comm.stats.formation = Math.round(avgDepth);
      comm.stats.care = Math.round(clamp(avgStability + shepherdsCount * 6, 0, 100));
      comm.stats.resilience = Math.round(clamp(60 + intercessorsCount * 14 - avgBurnout * 0.4, 10, 100));
      comm.stats.safeCapacity = Math.round(8 + intercessorsCount * 4 + (comm.stats.resilience / 100) * 8);

      // Target Area & Radius formula (PRD Section 20 & GDD Section 14)
      const baseArea = 20000;
      const popFactor = 2200;
      const capacityBonus = comm.stats.safeCapacity * 750;
      const unityBonus = (comm.stats.unity / 100) * 4000;
      const fragPenalty = comm.drift ? 5000 : 0;
      
      comm.stats.area = Math.max(16000, baseArea + comm.stats.population * popFactor + capacityBonus + unityBonus - fragPenalty);
      const maxAllowedRadius = Math.min(this.worldWidth, this.worldHeight) * 0.38;
      comm.targetRadius = Math.min(maxAllowedRadius, Math.sqrt(comm.stats.area / Math.PI));
      
      // Smooth lerping to target radius
      comm.currentRadius += (comm.targetRadius - comm.currentRadius) * 0.08;
      comm.stats.density = comm.stats.population / comm.stats.area;

      // Update Community organic hull
      comm.hullPoints = calculateCommunityHull(comm, members, performance.now());

      // Update Drift duration
      if (comm.drift) {
        comm.drift.duration -= dt;
        if (comm.drift.duration <= 0) {
          // Resolved or naturally subsided
          this.logEvent(`공동체의 ${comm.drift.title} 위기가 성도들의 헌신으로 해소되었습니다.`, 'BLESSING');
          this.state.stats.crisesOvercome++;
          comm.drift = null;
        }
      }
    }

    // 6. Timed Directors (Needs, Drift, External replenishment)
    this.needSpawnTimer += dt;
    if (this.needSpawnTimer >= 14) {
      this.needSpawnTimer = 0;
      this.spawnPeriodicNeed();
    }

    this.driftDirectorTimer += dt;
    if (this.driftDirectorTimer >= 45) {
      this.driftDirectorTimer = 0;
      this.evaluateDriftDirector();
    }

    this.externalReplenishTimer += dt;
    if (this.externalReplenishTimer >= 22) {
      this.externalReplenishTimer = 0;
      this.replenishExternalPeople();
    }
  }

  // Draw card helper
  public drawCard() {
    if (this.state.hand.length >= 3) return;
    if (this.state.deck.length === 0) {
      if (this.state.discard.length > 0) {
        this.state.deck = [...this.state.discard].sort(() => Math.random() - 0.5);
        this.state.discard = [];
      } else {
        this.state.deck = createStarterDeck();
      }
    }
    const card = this.state.deck.shift();
    if (card) {
      this.state.hand.push(card);
    }
  }

  // Play card from hand on target
  public playCard(cardId: string, targetPersonId?: string): boolean {
    if (this.state.isReleaseActive) return false; // Controls off during release!

    const cardIndex = this.state.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return false;

    const card = this.state.hand[cardIndex];
    if (this.state.attention < card.cost) return false;

    const targetPerson = targetPersonId ? this.state.people.find(p => p.id === targetPersonId) : null;
    let success = false;

    switch (card.type) {
      case 'MEAL': {
        if (!targetPerson) return false;
        targetPerson.trust = Math.min(100, targetPerson.trust + 25);
        targetPerson.stability = Math.min(100, targetPerson.stability + 25);
        if (targetPerson.need?.type === 'NEWCOMER') {
          targetPerson.need = null;
        }
        // Gather nearby friends
        for (const p of this.state.people) {
          if (p.communityId === targetPerson.communityId && distance(p.x, p.y, targetPerson.x, targetPerson.y) < 60) {
            p.trust = Math.min(100, p.trust + 10);
            p.stability = Math.min(100, p.stability + 10);
          }
        }
        this.logEvent(`${targetPerson.name} 님과 함께 애찬을 나누며 신뢰와 정서적 안정이 깊어졌습니다.`, 'BLESSING');
        success = true;
        break;
      }

      case 'WORD': {
        if (!targetPerson) return false;
        const comm = this.state.communities.find(c => c.id === targetPerson.communityId);
        const hasTeacherNear = this.state.people.some(
          p => p.calling === 'TEACHER' && p.communityId === targetPerson.communityId && distance(p.x, p.y, targetPerson.x, targetPerson.y) < 70
        );
        const bonus = hasTeacherNear ? 1.5 : 1.0;
        targetPerson.depth = Math.min(100, targetPerson.depth + 30 * bonus);
        targetPerson.readiness = Math.min(100, targetPerson.readiness + 20 * bonus);
        if (targetPerson.need?.type === 'QUESTION') {
          targetPerson.need = null;
        }
        // If community has deception, Word cleanses it if identified
        if (comm?.drift?.type === 'DECEPTION' && comm.drift.discovered) {
          comm.drift = null;
          this.logEvent(`말씀의 검으로 공동체 내의 거짓 교리를 정결케 하였습니다.`, 'BLESSING');
          this.state.stats.crisesOvercome++;
        }
        this.logEvent(`${targetPerson.name} 님의 심령에 말씀이 뿌리내려 복음의 농도가 깊어졌습니다.`, 'BLESSING');
        success = true;
        break;
      }

      case 'PRAYER': {
        for (const comm of this.state.communities) {
          comm.stats.resilience = Math.min(100, comm.stats.resilience + 20);
        }
        for (const p of this.state.people) {
          p.burnout = Math.max(0, p.burnout - 25);
          if (p.need?.type === 'WEARY') p.need = null;
        }
        soundEngine.playPrayerPulse();
        this.logEvent(`온 지체가 합심하여 무릎 꿇어 공동체의 은혜의 품과 영적 회복력이 넓어졌습니다.`, 'BLESSING');
        success = true;
        break;
      }

      case 'ENCOURAGE': {
        if (!targetPerson) return false;
        targetPerson.stability = Math.min(100, targetPerson.stability + 30);
        targetPerson.readiness = Math.min(100, targetPerson.readiness + 25);
        this.logEvent(`${targetPerson.name} 님을 주 안에서 위로하고 용기를 북돋웠습니다.`, 'BLESSING');
        success = true;
        break;
      }

      case 'RECONCILE': {
        // Resolve tension in community
        let resolved = false;
        for (const comm of this.state.communities) {
          if (comm.drift?.type === 'DIVISION') {
            comm.drift = null;
            resolved = true;
            this.state.stats.crisesOvercome++;
          }
        }
        for (const p of this.state.people) {
          if (p.need?.type === 'TENSION') {
            p.need = null;
            p.stability = Math.min(100, p.stability + 20);
            resolved = true;
          }
        }
        this.logEvent(`그리스도의 보혈로 찢어진 매듭을 풀고 지체 간에 온전한 화해를 이루었습니다.`, 'BLESSING');
        success = true;
        break;
      }

      case 'TRAIN': {
        if (!targetPerson) return false;
        // Elevate person into a calling or higher generation!
        if (!targetPerson.calling) {
          // Anoint calling based on highest inclination
          const callings: CallingType[] = ['EVANGELIST', 'SHEPHERD', 'TEACHER', 'INTERCESSOR', 'WORSHIPPER'];
          // Pick calling that is least represented
          const counts: Record<string, number> = {};
          callings.forEach(c => (counts[c!] = 0));
          this.state.people.forEach(p => {
            if (p.calling) counts[p.calling] = (counts[p.calling] || 0) + 1;
          });
          const needed = callings.sort((a, b) => counts[a!] - counts[b!])[0];
          targetPerson.calling = needed;
          targetPerson.generation = Math.min(3, targetPerson.generation + 1) as Generation;
          targetPerson.autonomy = 75;
          targetPerson.readiness = 80;
          this.state.stats.leadersTrained++;
          if (targetPerson.generation === 1) this.state.stats.g1Count++;
          if (targetPerson.generation === 2) this.state.stats.g2Count++;
          if (targetPerson.generation === 3) this.state.stats.g3Count++;

          this.logEvent(
            `${targetPerson.name} 성도님이 제자훈련을 수료하여 ${getCallingLabel(needed)} 사역자(${getGenerationLabel(targetPerson.generation, false, true)})로 세워졌습니다!`,
            'FRUIT'
          );
        } else {
          // Promote existing calling leader's generation & autonomy
          targetPerson.generation = Math.min(3, targetPerson.generation + 1) as Generation;
          targetPerson.autonomy = Math.min(100, targetPerson.autonomy + 20);
          targetPerson.depth = Math.min(100, targetPerson.depth + 20);
          if (targetPerson.generation === 1) this.state.stats.g1Count++;
          if (targetPerson.generation === 2) this.state.stats.g2Count++;
          if (targetPerson.generation === 3) this.state.stats.g3Count++;

          this.logEvent(
            `${targetPerson.name} 사역자가 다음 세대를 양육할 ${getGenerationLabel(targetPerson.generation, false, true)}로 성숙했습니다.`,
            'FRUIT'
          );
        }
        targetPerson.need = null;
        success = true;
        break;
      }
    }

    if (success) {
      this.state.attention -= card.cost;
      soundEngine.playCardUse();
      this.state.hand.splice(cardIndex, 1);
      this.state.discard.push(card);
      return true;
    }
    return false;
  }

  // Switch priority for community (GO, ROOT, CARE)
  public setPriority(commId: string, priority: CommunityPriority): boolean {
    if (this.state.isReleaseActive) return false;
    const comm = this.state.communities.find(c => c.id === commId);
    if (!comm || comm.priorityCooldown > 0) return false;

    comm.priority = priority;
    comm.priorityCooldown = 20; // 20 sec cooldown as per GDD

    const msg =
      priority === 'GO'
        ? '잃은 양을 향한 선교와 전도(GO)에 집중합니다. 전도자가 세상의 이웃을 찾아 나섭니다.'
        : priority === 'ROOT'
        ? '말씀과 양육(ROOT)에 집중합니다. 교사의 말씀 나눔으로 복음의 농도가 깊어집니다.'
        : '돌봄과 회복(CARE)에 집중합니다. 목자와 중보자가 상처 입은 심령을 품습니다.';
    this.logEvent(msg, 'BLESSING');
    return true;
  }

  // Evaluate Succession Readiness for sending (LOW / FAIR / READY)
  public evaluateSuccession(commId: string): SuccessionStatus {
    const comm = this.state.communities.find(c => c.id === commId);
    if (!comm) return 'LOW';

    const members = this.state.people.filter(p => p.communityId === commId);
    const leaders = members.filter(p => p.calling !== null);

    // GDD Section 78: Need secondary leaders, high depth & stability
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
    if (this.state.communities.length >= 3) return false; // MVP max 3 communities

    const leader = this.state.people.find(p => p.id === leaderId);
    if (!leader || !leader.calling || !leader.communityId) return false;

    const sourceComm = this.state.communities.find(c => c.id === leader.communityId);
    if (!sourceComm) return false;

    const succession = this.evaluateSuccession(sourceComm.id);
    if (succession === 'LOW') {
      this.logEvent(
        `경고: 충분히 성숙하지 않은 조기 분립 개척으로 ${sourceComm.name}의 돌봄에 공백이 생길 수 있습니다.`,
        'WARNING'
      );
      sourceComm.stats.care = Math.max(20, sourceComm.stats.care - 20);
    }

    // Determine target seed coordinates based on chosen direction
    const offset = 220;
    let targetX = sourceComm.centerX;
    let targetY = sourceComm.centerY;

    if (targetDirection === 'EAST') targetX += offset;
    if (targetDirection === 'WEST') targetX -= offset;
    if (targetDirection === 'SOUTH') targetY += offset;
    if (targetDirection === 'NORTH') targetY -= offset;

    // Constrain to world bounds
    targetX = clamp(targetX, 100, this.worldWidth - 100);
    targetY = clamp(targetY, 100, this.worldHeight - 100);

    leader.isBeingSent = true;
    leader.sentData = {
      targetCommunitySeedX: targetX,
      targetCommunitySeedY: targetY,
      progress: 0,
    };
    leader.movementState = 'SENT';

    this.logEvent(
      `${leader.name} 사역자가 새로운 지경을 향해 믿음으로 분립 개척(파송)되었습니다!`,
      'SEND'
    );
    return true;
  }

  // Complete SEND when leader reaches destination
  private completeSend(leader: Person) {
    leader.isBeingSent = false;
    const newCommIndex = this.state.communities.length + 1;
    const newCommId = `comm_${newCommIndex}`;
    const newName = newCommIndex === 2 ? '빌립보 공동체' : '에베소 공동체';

    const newCommunity: Community = {
      id: newCommId,
      name: newName,
      centerX: leader.x,
      centerY: leader.y,
      colorBase: newCommIndex === 2 ? 'hsl(155, 80%, 50%)' : 'hsl(42, 90%, 55%)',
      stats: {
        population: 1,
        area: 16000,
        density: 0.00006,
        clarity: 65,
        unity: 70,
        resilience: 60,
        mission: 75,
        formation: Math.round(leader.depth * 0.8),
        care: 60,
        centralization: 25,
        integrity: 85,
        safeCapacity: 10,
      },
      priority: 'GO',
      priorityCooldown: 0,
      drift: null,
      pulsePhase: Math.random() * Math.PI,
      generation: leader.generation,
      hullPoints: [],
      targetRadius: 75,
      currentRadius: 75,
    };

    leader.communityId = newCommId;
    leader.movementState = 'INSIDE';
    delete leader.sentData;

    this.state.communities.push(newCommunity);
    this.state.stats.communitiesFormed++;

    soundEngine.playNewcomerChime();
    this.logEvent(
      `새로운 생명의 터전인 '${newName}'가 분립 개척되었습니다! 복음의 생명력이 재생산됩니다.`,
      'FRUIT'
    );
  }

  // Admit newcomer to community
  private admitNewcomerToCommunity(person: Person, comm: Community) {
    person.isExternal = false;
    person.communityId = comm.id;
    person.movementState = 'INSIDE';
    person.externalState = undefined;
    person.contactWithId = null;
    person.generation = 1;
    person.need = {
      type: 'NEWCOMER',
      duration: 25,
      maxDuration: 25,
      description: '새로 연결된 지체입니다. 목자의 돌봄이나 애찬이 필요합니다.',
    };

    this.state.stats.peopleReached++;
    this.state.stats.newcomerCount++;
    soundEngine.playNewcomerChime();

    this.logEvent(
      `${person.name} 님이 전도자의 인도로 ${comm.name}에 첫 발을 내딛었습니다!`,
      'FRUIT'
    );
  }

  // Trigger THE RELEASE (PRD Section 48 & GDD Section 86)
  public triggerTheRelease() {
    this.state.isReleaseActive = true;
    this.state.stats.isReleaseActive = true;
    soundEngine.playReleaseFanfare();

    this.logEvent(
      '09:00 [성령께 온전히 맡겨드림] 사람의 인위적 개입을 멈추고 공동체가 오직 성령 안에서 자율적으로 움직입니다!',
      'RELEASE'
    );
  }

  // Complete Run and calculate final score
  private finishRun() {
    this.state.isGameOver = true;
    this.state.stats.isGameOver = true;

    // Scoring formula (PRD Section 51, GDD Section 91):
    // Autonomy & Release: 25%
    // Multiplication: 20%
    // Kingdom Health: 20%
    // Gospel Integrity: 20%
    // Reach: 15%

    const totalPop = this.state.people.filter(p => !p.isExternal).length;
    const trainedLeaders = this.state.people.filter(p => p.calling !== null).length;
    const overallAvgBurnout =
      totalPop > 0
        ? this.state.people.filter(p => !p.isExternal).reduce((acc, p) => acc + p.burnout, 0) / totalPop
        : 0;
    const avgIntegrity =
      this.state.communities.reduce((acc, c) => acc + c.stats.integrity, 0) / this.state.communities.length;
    const avgHealth =
      this.state.communities.reduce(
        (acc, c) => acc + (c.stats.formation + c.stats.care + c.stats.unity + c.stats.resilience) / 4,
        0
      ) / this.state.communities.length;

    const g3LeaderExists = this.state.people.some(p => p.generation >= 3);

    const autonomyScore = Math.min(100, Math.round((trainedLeaders / 5) * 60 + 40));
    const multiplicationScore = Math.min(100, Math.round(this.state.communities.length * 35));
    const kingdomHealthScore = Math.min(100, Math.round(avgHealth));
    const gospelIntegrityScore = Math.min(100, Math.round(avgIntegrity));
    const reachScore = Math.min(100, Math.round((this.state.stats.peopleReached / 8) * 100));

    const finalScore = Math.round(
      autonomyScore * 0.25 +
        multiplicationScore * 0.2 +
        kingdomHealthScore * 0.2 +
        gospelIntegrityScore * 0.2 +
        reachScore * 0.15
    );

    let finalGrade: 'S' | 'A' | 'B' | 'C' | 'D' = 'C';
    // S Grade Gate: G3 >= 1, Integrity >= 70, Release Survival >= 80, finalScore >= 85
    if (finalScore >= 85 && (g3LeaderExists || this.state.stats.communitiesFormed >= 2)) {
      finalGrade = 'S';
    } else if (finalScore >= 75) {
      finalGrade = 'A';
    } else if (finalScore >= 60) {
      finalGrade = 'B';
    }

    this.state.stats.autonomyScore = autonomyScore;
    this.state.stats.multiplicationScore = multiplicationScore;
    this.state.stats.kingdomHealthScore = kingdomHealthScore;
    this.state.stats.gospelIntegrityScore = gospelIntegrityScore;
    this.state.stats.reachScore = reachScore;
    this.state.stats.finalScore = finalScore;
    this.state.stats.finalGrade = finalGrade;

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
    story.push(`사역의 마지막에 손을 놓았을 때(성령께 온전히 맡겨드림), 그리스도의 몸 된 교회는 성령 안에서 스스로 살아서 움직였습니다.`);

    this.state.stats.runStory = story;

    // Struggles analysis
    const struggles: string[] = [];
    if (multiplicationScore < 50) {
      struggles.push('영적 재생산이 늦어져 다음 세대 제자를 새로운 지경으로 분립 개척하지 못했습니다.');
    }
    if (reachScore < 50) {
      struggles.push('잃은 양을 향한 선교적 발걸음(GO)보다 내부의 안락함에 머무는 시간이 길었습니다.');
    }
    if (overallAvgBurnout > 25) {
      struggles.push('성장 속도에 비해 중보기도(Prayer)와 돌봄의 품이 부족하여 지체들이 영적 소진을 겪었습니다.');
    }
    this.state.stats.struggles = struggles;
  }

  // Periodic Need Spawner
  private spawnPeriodicNeed() {
    const internalPeople = this.state.people.filter(p => !p.isExternal && !p.need);
    if (internalPeople.length === 0) return;

    const candidate = internalPeople[Math.floor(Math.random() * internalPeople.length)];
    const roll = Math.random();

    if (roll < 0.35) {
      candidate.need = {
        type: 'QUESTION',
        duration: 20,
        maxDuration: 20,
        description: '말씀에 대한 깊은 의문이 생겼습니다. 교사의 가르침이 필요합니다.',
      };
    } else if (roll < 0.65) {
      candidate.need = {
        type: 'WEARY',
        duration: 22,
        maxDuration: 22,
        description: '사역과 일상에 지쳐 탈진 상태입니다. 기도의 손길이 절실합니다.',
      };
      candidate.burnout = Math.min(100, candidate.burnout + 20);
    } else {
      candidate.need = {
        type: 'TENSION',
        duration: 22,
        maxDuration: 22,
        description: '지체 간의 오해로 마음의 거리감이 생겼습니다. 화해(Reconcile)가 필요합니다.',
      };
    }
  }

  // Need Expiry handling
  private handleNeedExpiry(person: Person) {
    if (!person.need) return;
    const needType = person.need.type;
    person.need = null;

    // GDD Section 18: Unaddressed needs lead to specific spiritual drift
    switch (needType) {
      case 'QUESTION':
        person.depth = Math.max(10, person.depth - 15);
        this.logEvent(`${person.name} 님의 의문이 해소되지 못해 믿음의 확신이 흐려졌습니다.`, 'WARNING');
        break;
      case 'NEWCOMER':
        person.stability = Math.max(10, person.stability - 25);
        this.logEvent(`${person.name} 새가족이 정착하지 못하고 마음이 멀어지고 있습니다.`, 'WARNING');
        break;
      case 'WEARY':
        person.burnout = Math.min(100, person.burnout + 30);
        this.logEvent(`${person.name} 님이 돌봄 받지 못해 소진(Burnout)에 빠졌습니다.`, 'WARNING');
        break;
      case 'TENSION': {
        const comm = this.state.communities.find(c => c.id === person.communityId);
        if (comm && !comm.drift) {
          comm.drift = {
            type: 'DIVISION',
            intensity: 45,
            discovered: true,
            duration: 35,
            title: '관계적 분열 위기',
            description: '풀리지 않은 갈등으로 공동체 영역이 양쪽으로 찢어지고 있습니다.',
          };
          this.logEvent(`지체 간의 갈등이 번져 ${comm.name}에 분열(Division)의 조짐이 생겼습니다!`, 'DRIFT');
        }
        break;
      }
    }
  }

  // Drift Director
  private evaluateDriftDirector() {
    for (const comm of this.state.communities) {
      if (comm.drift) continue;

      const roll = Math.random();
      if (roll < 0.45) {
        // Deception drift
        const hasTeacher = this.state.people.some(p => p.communityId === comm.id && p.calling === 'TEACHER');
        comm.drift = {
          type: 'DECEPTION',
          intensity: 50,
          discovered: hasTeacher,
          duration: 40,
          title: hasTeacher ? '거짓 교리 분별됨 (Deception Identified)' : '출처 불명의 왜곡 현상 발생',
          description: hasTeacher
            ? '교사가 이질적인 왜곡을 포착했습니다. 말씀(Word)으로 정결케 하십시오.'
            : '성도들의 색이 흐려지고 모호한 불안이 돕니다. 교사의 분별이 필요합니다.',
        };
        this.logEvent(
          `${comm.name}에 왜곡(Deception)의 안개가 스며듭니다. ${hasTeacher ? '교사가 정체를 식별했습니다!' : '교사가 없어 정체를 알기 어렵습니다.'}`,
          'DRIFT'
        );
      } else if (roll < 0.75) {
        // Burnout drift
        comm.drift = {
          type: 'BURNOUT',
          intensity: 55,
          discovered: true,
          duration: 35,
          title: '사역적 소진과 피로',
          description: '성도들의 호흡이 얕아졌습니다. 중보기도자의 임재와 합심 기도가 절실합니다.',
        };
        this.logEvent(`${comm.name}에 영적 소진(Burnout)이 찾아왔습니다. 중보기도자가 품을 넓혀야 합니다.`, 'DRIFT');
      }
    }
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

  // Log story events
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
}
