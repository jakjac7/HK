/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Person, Community, CommunityPriority, MapProfile } from '../types';
import { MapSystem } from '../systems/MapSystem';
import { updatePersonRoutine } from '../systems/RoutineSystem';

export interface WorldBounds {
  width: number;
  height: number;
}

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Utility steering force calculation for autonomous people
 */
export function calculatePersonSteering(
  person: Person,
  allPeople: Person[],
  communities: Community[],
  world: WorldBounds,
  dt: number,
  isReleaseActive: boolean,
  worshipGatheringCommId?: string | null,
  mapProfile?: MapProfile,
  mapSystem?: MapSystem
): { fx: number; fy: number; maxSpeed: number } {
  let fx = 0;
  let fy = 0;

  // Max speed affected by burnout
  const burnoutPenalty = 1 - (person.burnout / 100) * 0.55;
  let maxSpeed = (person.isExternal ? 28 : 42) * burnoutPenalty;

  // HK5-051: AgeBand speed modifiers
  if (person.ageBand === 'YOUNG') {
    maxSpeed *= 1.12;
  } else if (person.ageBand === 'SENIOR') {
    maxSpeed *= 0.88;
  }

  // TASK HK4-010: Map Mobility Integration
  const mobility = mapProfile?.mobility ?? 1.0;
  // External person speed scales directly with map mobility
  // Community members have gentle damping: 1 + (mobility - 1) * 0.25
  const mobilityMult = person.isExternal ? mobility : (1 + (mobility - 1) * 0.25);
  maxSpeed *= mobilityMult;

  // TASK HK4-013: Zone Influence on Speed and Person Zone Tracking
  if (mapSystem && mapProfile) {
    const zone = mapSystem.getZoneAt(person.x, person.y, world.width, world.height);
    if (zone) {
      maxSpeed *= zone.influence.speedMultiplier;
      person.currentZoneName = zone.name;
    } else {
      person.currentZoneName = undefined;
    }
  }
  
  if (person.need) {
    const needProg = 1 - (person.need.duration / person.need.maxDuration);
    // Slow down up to 60% as need becomes chronic
    maxSpeed *= (1 - needProg * 0.6);
  }

  if (isReleaseActive) {
    maxSpeed *= 1.35; // 2x simulation / heightened autonomous activity
  }

  // Find assigned community if any
  const comm = communities.find(c => c.id === person.communityId);
  const commPriority: CommunityPriority = comm ? comm.priority : 'ROOT';

  // 1. Separation force (avoid overlapping with neighbors)
  // For dwelling external people, we use gentle, cozy separation so companions can sit at tables together!
  const isDwelling = person.isExternal && person.routine?.isDwelling;
  const separationRadius = isDwelling ? 24 : (person.isExternal ? 32 : 44);
  let sepX = 0;
  let sepY = 0;
  let sepCount = 0;

  for (const other of allPeople) {
    if (other.id === person.id) continue;
    const d = distance(person.x, person.y, other.x, other.y);
    if (d > 0 && d < separationRadius) {
      const push = (separationRadius - d) / separationRadius;
      const pushMult = isDwelling ? 36 : (person.isExternal ? 75 : 150);
      sepX += ((person.x - other.x) / d) * push * pushMult;
      sepY += ((person.y - other.y) / d) * push * pushMult;
      sepCount++;
    }
  }
  if (sepCount > 0) {
    fx += sepX;
    fy += sepY;
  }

  // 2. Sent leader behavior
  if (person.isBeingSent && person.sentData) {
    const targetX = person.sentData.targetCommunitySeedX;
    const targetY = person.sentData.targetCommunitySeedY;
    const d = distance(person.x, person.y, targetX, targetY);
    if (d > 10) {
      fx += ((targetX - person.x) / d) * 70;
      fy += ((targetY - person.y) / d) * 70;
    }
    return { fx, fy, maxSpeed: maxSpeed * 1.2 };
  }

  // 3. External Person autonomous behavior
  if (person.isExternal) {
    if (person.externalState === 'CONTACTED' || person.externalState === 'FOLLOWING' || person.externalState === 'ENTERING') {
      // The soul has decided to visit the church community on their own!
      // Walks peacefully and directly toward the community center (does NOT trail behind evangelist)
      const targetComm = communities.find(c => c.id === person.communityId) || communities[0];
      if (targetComm) {
        const d = distance(person.x, person.y, targetComm.centerX, targetComm.centerY);
        if (d > 10) {
          const desiredSpeed = 46;
          const nx = (targetComm.centerX - person.x) / d;
          const ny = (targetComm.centerY - person.y) / d;
          fx += (nx * desiredSpeed - person.vx) * 2.8;
          fy += (ny * desiredSpeed - person.vy) * 2.8;
        }
      }
      if (person.routine) {
        person.routine.activityLabel = '복음의 초대를 받아 공동체로 향함';
        person.routine.activityIcon = '✝️';
      }
    } else {
      // Patterned Daily Life Movement: 주거지(기숙사), 대학/연구실, 청년 카페거리, 환승역 등
      if (mapSystem) {
        updatePersonRoutine(person, mapSystem, world.width, world.height, dt, allPeople);
      }

      if (person.routine) {
        if (!person.routine.isDwelling) {
          // PURPOSEFULLY WALKING TOWARD DESTINATION LANDMARK
          const dx = person.routine.targetX - person.x;
          const dy = person.routine.targetY - person.y;
          const d = Math.hypot(dx, dy);

          if (d > 10) {
            const nx = dx / d;
            const ny = dy / d;

            // Natural human walking speed: 54 ~ 66 px/s
            const baseWalkSpeed = 58;

            // Subtle natural walking stride sway
            const walkPhase = person.routine.walkPhase || 0;
            const sway = Math.sin(walkPhase) * 5;

            const desiredVx = nx * baseWalkSpeed - ny * sway;
            const desiredVy = ny * baseWalkSpeed + nx * sway;

            fx += (desiredVx - person.vx) * 3.4;
            fy += (desiredVy - person.vy) * 3.4;

            // Church sanctuary avoidance: Gracefully bypass church perimeter along the street
            for (const c of communities) {
              const dToChurch = distance(person.x, person.y, c.centerX, c.centerY);
              const avoidRadius = c.currentRadius * 0.95;
              if (dToChurch < avoidRadius && dToChurch > 0) {
                const awayX = (person.x - c.centerX) / dToChurch;
                const awayY = (person.y - c.centerY) / dToChurch;
                const tangX = -awayY;
                const tangY = awayX;
                const dot = tangX * nx + tangY * ny;
                const sign = dot >= 0 ? 1 : -1;
                const urgency = (avoidRadius - dToChurch) / avoidRadius;
                fx += (awayX * 65 + tangX * sign * 50) * urgency;
                fy += (awayY * 65 + tangY * sign * 50) * urgency;
              }
            }
          }
        } else {
          // CALMLY DWELLING AT DESTINATION SPOT (Cafe table, campus desk, dorm room, station lounge)
          const dFromSpot = distance(person.x, person.y, person.routine.targetX, person.routine.targetY);
          if (dFromSpot > 4) {
            const pull = Math.min(1, dFromSpot / 18);
            fx += ((person.routine.targetX - person.x) / dFromSpot) * 36 * pull;
            fy += ((person.routine.targetY - person.y) / dFromSpot) * 36 * pull;
          }

          // Damping while resting/dwelling so they look at peace and don't jitter
          person.vx *= 0.84;
          person.vy *= 0.84;

          // Conversational proximity if sharing spot with social partner
          if (person.routine.partnerId) {
            const partner = allPeople.find(p => p.id === person.routine?.partnerId);
            if (partner) {
              const dP = distance(person.x, person.y, partner.x, partner.y);
              if (dP > 22 && dP < 40) {
                fx += ((partner.x - person.x) / dP) * 10;
                fy += ((partner.y - person.y) / dP) * 10;
              }
            }
          }
        }
      }

      // If engaged by a believer / evangelist nearby, pause and converse!
      const anyBelieverNear = allPeople.some(
        p => !p.isExternal && (p.engagedSeekerIds?.includes(person.id) || distance(p.x, p.y, person.x, person.y) < 36)
      );
      if (anyBelieverNear || (person.contactProgress || 0) > 0) {
        fx *= 0.22;
        fy *= 0.22;
        person.vx *= 0.72;
        person.vy *= 0.72;
      }

      // Gentle decay of contactProgress if not contacted yet and no believers actively visiting
      if ((person.contactProgress || 0) > 0 && !anyBelieverNear) {
        person.contactProgress = Math.max(0, (person.contactProgress || 0) - 2.5 * dt);
      }
    }

    // Keep within world bounds
    fx += getBoundaryPush(person.x, person.y, world).bx;
    fy += getBoundaryPush(person.x, person.y, world).by;
    const speedMult = (person.routine && !person.routine.isDwelling) ? 1.15 : 0.45;
    return { fx, fy, maxSpeed: maxSpeed * speedMult };
  }

  // 4. Community Member Steering
  if (comm) {
    const distToCenter = distance(person.x, person.y, comm.centerX, comm.centerY);
    const commRadius = comm.currentRadius;

    // Check if community is experiencing DIVISION drift
    const isDivided = comm.drift?.type === 'DIVISION' && comm.drift.intensity > 30;
    let targetCenterX = comm.centerX;
    let targetCenterY = comm.centerY;

    if (isDivided) {
      // Division splits community into East and West lobes
      const hash = person.id.charCodeAt(person.id.length - 1) % 2;
      targetCenterX = comm.centerX + (hash === 0 ? -commRadius * 0.55 : commRadius * 0.55);
    }

    // HK5-040: Worshipper-driven Gathering Pulse (Replaces artificial Sunday Scrum)
    // When a Worshipper actively pulses, members experience a gentle harmonious pull inward
    if (worshipGatheringCommId === comm.id && !isDivided) {
      if (distToCenter > 18) {
        fx += ((targetCenterX - person.x) / distToCenter) * 32;
        fy += ((targetCenterY - person.y) / distToCenter) * 32;
      }
    }

    // =========================================================================
    // 1. Evangelism System: Milestone Progress & Max 2 Concurrent Markings (Req 1)
    // =========================================================================
    if (!person.engagedSeekerIds) {
      person.engagedSeekerIds = [];
    }

    // Clean up stale or completed markings
    person.engagedSeekerIds = person.engagedSeekerIds.filter(seekerId => {
      const seeker = allPeople.find(p => p.id === seekerId);
      if (!seeker || !seeker.isExternal || seeker.externalState === 'CONTACTED' || seeker.externalState === 'FOLLOWING') {
        return false;
      }
      const dist = distance(person.x, person.y, seeker.x, seeker.y);
      return dist < 65; // keep tracking if not completely separated
    });

    const isEvangelist = person.calling === 'EVANGELIST';
    // HK5-030: Evangelists actively seek outside targets.
    // Generic believers DO NOT actively seek outside; they only engage in close incidental relationships.
    // GO priority widens incidental range for generic believers and supercharges Evangelists.
    const contactRange = isEvangelist ? (commPriority === 'GO' ? 52 : 44) : (commPriority === 'GO' ? 26 : 18);
    const maxSeekers = isEvangelist ? 2 : 1;

    // Acquire new seeker targets up to the strict limit
    if (person.engagedSeekerIds.length < maxSeekers) {
      for (const other of allPeople) {
        if (person.engagedSeekerIds.length >= maxSeekers) break;
        if (
          other.isExternal &&
          other.externalState !== 'CONTACTED' &&
          other.externalState !== 'FOLLOWING' &&
          !person.engagedSeekerIds.includes(other.id)
        ) {
          const d = distance(person.x, person.y, other.x, other.y);
          if (d < contactRange) {
            // Count how many believers are currently engaging this seeker
            const engagingBelievers = allPeople.filter(
              p => !p.isExternal && p.engagedSeekerIds?.includes(other.id)
            );
            if (engagingBelievers.length < 2) {
              person.engagedSeekerIds.push(other.id);
              other.contactWithId = person.id;
            }
          }
        }
      }
    }

    // Advance milestone for engaged seekers maintained in close proximity
    for (const seekerId of person.engagedSeekerIds) {
      const seeker = allPeople.find(p => p.id === seekerId);
      if (seeker && seeker.isExternal) {
        const d = distance(person.x, person.y, seeker.x, seeker.y);
        
        // Milestone time requirement: 6.5s for Evangelists, 8.5s for other believers
        seeker.requiredContactDuration = isEvangelist ? 6.5 : 8.5;
        if (seeker.contactDuration === undefined) {
          seeker.contactDuration = 0;
        }

        if (d < contactRange) {
          // Sustained proximity builds relational progress!
          // Synergy boost (up to 1.35x) if two believers minister together
          const nearbyBelievers = allPeople.filter(p => !p.isExternal && p.engagedSeekerIds?.includes(seeker.id));
          const synergy = nearbyBelievers.length >= 2 ? 1.35 : 1.0;
          
          // TASK HK4-011: Map Openness and Zone Relationship influence
          const openness = mapProfile?.openness ?? 1.0;
          let zoneRel = 1.0;
          if (mapSystem && mapProfile) {
            const zone = mapSystem.getZoneAt(seeker.x, seeker.y, world.width, world.height);
            if (zone) {
              zoneRel = zone.influence.relationshipMultiplier;
            }
          }

          // Evangelism rate reduced by 50% (전도율 50% 하향 조정)
          const evangelismRateMultiplier = 0.5;
          seeker.contactDuration += dt * evangelismRateMultiplier * synergy * openness * zoneRel;
          seeker.contactProgress = Math.min(100, (seeker.contactDuration / seeker.requiredContactDuration) * 100);

          // Update milestone stages (1: Interest/Dialogue, 2: Heart Opened, 3: Trust & Gospel)
          if (seeker.contactProgress < 34) {
            seeker.contactMilestoneStage = 1;
          } else if (seeker.contactProgress < 67) {
            seeker.contactMilestoneStage = 2;
          } else {
            seeker.contactMilestoneStage = 3;
          }

          // MILESTONE COMPLETION -> Fruit of Evangelism!
          if (seeker.contactProgress >= 100) {
            seeker.externalState = 'CONTACTED';
            seeker.contactWithId = person.id;
            
            // Record fruit of evangelism
            if (!person.reachedPersonIds) person.reachedPersonIds = [];
            if (!person.reachedPersonIds.includes(seeker.id)) {
              person.reachedPersonIds.push(seeker.id);
              person.contribution.reachedCount = person.reachedPersonIds.length;
            }

            // Remove from engaged seekers upon victory
            person.engagedSeekerIds = person.engagedSeekerIds.filter(id => id !== seeker.id);
          }
        } else {
          // Proximity broken: progress slowly decays
          seeker.contactDuration = Math.max(0, seeker.contactDuration - dt * 0.4);
          seeker.contactProgress = Math.min(100, (seeker.contactDuration / seeker.requiredContactDuration) * 100);
        }
      }
    }

    // Calling-specific Movement Biases (Core Product Invariants!)
    switch (person.calling) {
      case 'EVANGELIST': {
        // High Outside Movement Frequency & Boundary Crossing
        // Evangelist actively visits individual souls outside, knocking on their doors/hearts ("개별 영혼들을 다니며 두드림")
        // No trailing/following: the evangelist visits the seeker where they are!
        let externalTarget: Person | null = null;
        let highestUtilityScore = -Infinity;

        // Maintain focus on current seeker if still uncontacted
        const activeSeekerId = person.engagedSeekerIds?.[0];
        if (activeSeekerId) {
          const currentSeeker = allPeople.find(
            p => p.id === activeSeekerId && p.isExternal && p.externalState !== 'CONTACTED' && p.externalState !== 'FOLLOWING'
          );
          if (currentSeeker) {
            externalTarget = currentSeeker;
          }
        }

        if (!externalTarget) {
          for (const other of allPeople) {
            if (other.isExternal && other.externalState !== 'FOLLOWING' && other.externalState !== 'CONTACTED') {
              const d = distance(person.x, person.y, other.x, other.y);
              const utility = mapSystem ? mapSystem.evaluateEvangelistTargetUtility(other, other.x, other.y, world.width, world.height, commPriority === 'GO') : 1;
              // Add bonus for seekers already partially contacted so evangelist follows up
              const progressBonus = (other.contactProgress || 0) * 0.8;
              const score = (utility + progressBonus) / Math.max(20, d);
              if (score > highestUtilityScore) {
                highestUtilityScore = score;
                externalTarget = other;
              }
            }
          }
        }

        const goMultiplier = commPriority === 'GO' ? 1.5 : 1.0;

        if (externalTarget) {
          const d = distance(person.x, person.y, externalTarget.x, externalTarget.y);
          if (d > 22) {
            // Evangelist walks over to visit the individual soul at their location
            fx += ((externalTarget.x - person.x) / d) * 58 * goMultiplier;
            fy += ((externalTarget.y - person.y) / d) * 58 * goMultiplier;
          } else {
            // Reached the individual soul: stay right beside them, knocking on their heart with the Gospel
            const knockWobble = (person.wobbleOffset + performance.now() * 0.002) % (Math.PI * 2);
            fx += Math.cos(knockWobble) * 6;
            fy += Math.sin(knockWobble) * 6;
          }
        } else {
          // Patrol outside seeking new souls
          const angle = (person.wobbleOffset + performance.now() * 0.0008) % (Math.PI * 2);
          const orbitR = commRadius * (0.85 + 0.5 * Math.sin(performance.now() * 0.0015));
          const ox = targetCenterX + Math.cos(angle) * orbitR;
          const oy = targetCenterY + Math.sin(angle) * orbitR;
          const od = distance(person.x, person.y, ox, oy);
          if (od > 5) {
            fx += ((ox - person.x) / od) * 45 * goMultiplier;
            fy += ((oy - person.y) / od) * 45 * goMultiplier;
          }
        }
        break;
      }

      case 'SHEPHERD': {
        // =========================================================================
        // 2. Shepherd Pastoral Hold & Rescue + Individual Fellowship/Visitation (개별 심방 & 교제)
        // =========================================================================
        let vulnerableTarget: Person | null = null;
        let highestNeed = 0;

        for (const other of allPeople) {
          if (other.communityId === comm.id && other.id !== person.id) {
            const dFromCenter = distance(other.x, other.y, comm.centerX, comm.centerY);
            let score = 0;

            // TOP PRIORITY: Members who are actively trying to leave (냉담자/이탈 중)
            if (other.movementState === 'LEAVING') {
              score += 260; // Luke 15:4 Lost sheep priority
            }
            if ((other.leaveIntent || 0) > 40) {
              score += 150 + (other.leaveIntent || 0);
            }
            if (other.careStatus === 'UNCARED') score += 75;
            if (other.burnout > 30) score += 60 + other.burnout * 0.5;
            if (other.need?.type === 'WEARY' || other.need?.type === 'TENSION') score += 55;
            if (other.need?.type === 'NEWCOMER') score += 50;
            if (other.stability < 60) score += 40 + (60 - other.stability);
            if (person.careTargets?.includes(other.id)) score += 30; // shepherd's assigned flock member
            if (dFromCenter > commRadius * 0.8) score += 25; // drifted to edge

            if (score > highestNeed) {
              highestNeed = score;
              vulnerableTarget = other;
            }
          }
        }

        const isOverloaded = (person.careLoad || 0) >= 5;
        const careMultiplier = (commPriority === 'CARE' ? 1.4 : 1.0) * (isOverloaded ? 1.35 : 1.0);

        if (vulnerableTarget) {
          const d = distance(person.x, person.y, vulnerableTarget.x, vulnerableTarget.y);
          const isTargetLeaving = vulnerableTarget.movementState === 'LEAVING' || (vulnerableTarget.leaveIntent || 0) > 50;

          // Shepherd rushes with pastoral urgency to rescue leaving sheep, or walks to visit member
          const rushSpeed = isTargetLeaving ? 75 : (isOverloaded ? 60 : 48);
          if (d > 16) {
            fx += ((vulnerableTarget.x - person.x) / d) * rushSpeed * careMultiplier;
            fy += ((vulnerableTarget.y - person.y) / d) * rushSpeed * careMultiplier;
          }

          // Shepherd reaches the member: PASTORAL HOLD & EMBRACE + INDIVIDUAL FELLOWSHIP (개별 심방 & 교제)
          if (d < 36) {
            // Actively hold onto the straying/leaving member!
            person.isHoldingPersonId = vulnerableTarget.id;
            person.holdingTimer = 0.6;
            vulnerableTarget.beingHeldById = person.id;

            // HK5-053: Zone careMultiplier influences pastoral stabilization rate
            let zoneCare = 1.0;
            if (mapSystem && mapProfile) {
              const zone = mapSystem.getZoneAt(person.x, person.y, world.width, world.height);
              if (zone) zoneCare = zone.influence.careMultiplier;
            }

            // Continuous Pastoral Fellowship & Restoration
            vulnerableTarget.stability = Math.min(100, vulnerableTarget.stability + 24 * dt * zoneCare);
            vulnerableTarget.trust = Math.min(100, vulnerableTarget.trust + 18 * dt * zoneCare);
            vulnerableTarget.leaveIntent = Math.max(0, (vulnerableTarget.leaveIntent || 0) - 28 * dt * zoneCare);
            vulnerableTarget.burnout = Math.max(0, vulnerableTarget.burnout - 16 * dt * zoneCare);
            vulnerableTarget.careStatus = 'CARED';

            // If the person had an expiring need, shepherd comforts and extends it
            if (vulnerableTarget.need) {
              vulnerableTarget.need.duration = Math.min(
                vulnerableTarget.need.maxDuration,
                vulnerableTarget.need.duration + 20 * dt
              );
            }

            // When heart is restored (leaveIntent drops below 20), bring them fully back into the flock!
            if ((vulnerableTarget.leaveIntent || 0) < 20) {
              if (vulnerableTarget.movementState === 'LEAVING') {
                vulnerableTarget.movementState = 'INSIDE';
                vulnerableTarget.leavingTimer = undefined;
              }
              vulnerableTarget.beingHeldById = null;
              person.isHoldingPersonId = null;

              if (!person.caredPersonIds) person.caredPersonIds = [];
              if (!person.caredPersonIds.includes(vulnerableTarget.id)) {
                person.caredPersonIds.push(vulnerableTarget.id);
                person.contribution.caredCount = person.caredPersonIds.length;
              }
              person.contribution.crisesStabilized++;
            }
          }
        } else {
          // No urgent crisis: patrol peacefully in and around flock
          person.isHoldingPersonId = null;
          const angle = (person.wobbleOffset + performance.now() * (isOverloaded ? 0.0012 : 0.0006)) % (Math.PI * 2);
          const patrolRadius = commRadius * (0.7 + 0.5 * Math.sin(performance.now() * 0.0008));
          const ox = targetCenterX + Math.cos(angle) * patrolRadius;
          const oy = targetCenterY + Math.sin(angle) * patrolRadius;
          const od = distance(person.x, person.y, ox, oy);
          if (od > 5) {
            fx += ((ox - person.x) / od) * 38 * careMultiplier;
            fy += ((oy - person.y) / od) * 38 * careMultiplier;
          }
        }
        break;
      }

      case 'TEACHER': {
        // Inside Formation & Question response & Deception detection
        let studentTarget: Person | null = null;
        let priorityVal = 0;

        for (const other of allPeople) {
          if (other.communityId === comm.id && other.id !== person.id) {
            let score = 0;
            if (other.need?.type === 'QUESTION') score += 50;
            if (other.depth < 50) score += 30;
            if (comm.drift?.type === 'DECEPTION' && !comm.drift.discovered) score += 60;

            if (score > priorityVal) {
              priorityVal = score;
              studentTarget = other;
            }
          }
        }

        const rootMultiplier = commPriority === 'ROOT' ? 1.4 : 1.0;

        if (studentTarget) {
          const d = distance(person.x, person.y, studentTarget.x, studentTarget.y);
          if (d > 18) {
            fx += ((studentTarget.x - person.x) / d) * 45 * rootMultiplier;
            fy += ((studentTarget.y - person.y) / d) * 45 * rootMultiplier;
          }
          // Teacher Formation: Deepens person's color depth & discernment!
          if (d < 32) {
            studentTarget.depth = Math.min(100, studentTarget.depth + 18 * dt);
            studentTarget.readiness = Math.min(100, studentTarget.readiness + 12 * dt);
            if (studentTarget.need?.type === 'QUESTION') {
              studentTarget.need = null;
              person.contribution.questionsResolved++;
            }
          }
        } else {
          // Stay comfortably within deep inner ring
          const d = distance(person.x, person.y, targetCenterX, targetCenterY);
          if (d > commRadius * 0.45) {
            fx += ((targetCenterX - person.x) / d) * 35 * rootMultiplier;
            fy += ((targetCenterY - person.y) / d) * 35 * rootMultiplier;
          }
        }

        // HK5-130: Teacher progressive Deception Discernment (no instant override!)
        if (comm.drift?.type === 'DECEPTION' && !comm.drift.discovered) {
          const dToCenter = distance(person.x, person.y, targetCenterX, targetCenterY);
          const proxBonus = dToCenter < commRadius ? 1.5 : 1.0;
          const depthBonus = Math.max(0.6, person.depth / 50);
          const rootBonus = commPriority === 'ROOT' ? 1.4 : 1.0;
          const detectionRate = 18 * depthBonus * proxBonus * rootBonus;
          comm.drift.detectionProgress = Math.min(100, (comm.drift.detectionProgress || 0) + detectionRate * dt);
          if (comm.drift.detectionProgress >= 100) {
            comm.drift.discovered = true;
            comm.drift.title = '거짓 가르침 분별됨 (교사의 말씀 분별 완료)';
            person.contribution.deceptionsExposed++;
          }
        }
        break;
      }

      case 'INTERCESSOR': {
        // HK5-030: Intercessors do not hunt outside seekers; they provide spiritual covering and crisis absorption
        // Crisis & Burnout absorption
        let crisisTarget: Person | null = null;
        let maxCrisis = 0;

        for (const other of allPeople) {
          if (other.communityId === comm.id) {
            let score = other.burnout;
            if (other.need?.type === 'WEARY') score += 40;
            if (score > maxCrisis) {
              maxCrisis = score;
              crisisTarget = other;
            }
          }
        }

        if (crisisTarget && maxCrisis > 30) {
          const d = distance(person.x, person.y, crisisTarget.x, crisisTarget.y);
          if (d > 18) {
            fx += ((crisisTarget.x - person.x) / d) * 45;
            fy += ((crisisTarget.y - person.y) / d) * 45;
          }
          // Absorbs burnout, brings healing
          if (d < 35) {
            crisisTarget.burnout = Math.max(0, crisisTarget.burnout - 20 * dt);
            if (crisisTarget.need?.type === 'WEARY') {
              crisisTarget.need = null;
              person.contribution.crisesStabilized++;
            }
          }
        } else {
          // Gently stay in interior mid-ring, holding the space
          const d = distance(person.x, person.y, targetCenterX, targetCenterY);
          if (d > commRadius * 0.55) {
            fx += ((targetCenterX - person.x) / d) * 30;
            fy += ((targetCenterY - person.y) / d) * 30;
          }
        }
        break;
      }

      case 'WORSHIPPER': {
        if (commPriority === 'GO') {
          // In GO priority, Worshippers also seek external targets for mission
          let externalTarget: Person | null = null;
          let minD = Infinity;
          for (const other of allPeople) {
            if (other.isExternal && other.externalState !== 'FOLLOWING' && other.externalState !== 'CONTACTED') {
              const d = distance(person.x, person.y, other.x, other.y);
              if (d < minD) {
                minD = d;
                externalTarget = other;
              }
            }
          }
          if (externalTarget && minD < commRadius * 2.5) {
            fx += ((externalTarget.x - person.x) / minD) * 45;
            fy += ((externalTarget.y - person.y) / minD) * 45;
            break; // Skip normal behavior
          }
        }

        // Gathers scattered members to center / creates worship ripples
        const d = distance(person.x, person.y, targetCenterX, targetCenterY);
        if (d > 18) {
          fx += ((targetCenterX - person.x) / d) * 38;
          fy += ((targetCenterY - person.y) / d) * 38;
        }

        // TASK HK4-110: Worship Gathering Field
        // Radiates an attractive harmony field pulling community members gently towards unity
        for (const other of allPeople) {
          if (other.communityId === comm.id && other.id !== person.id) {
            const od = distance(person.x, person.y, other.x, other.y);
            if (od < commRadius * 0.9 && od > 20) {
              // Gentle harmonic gravitational pull
              const pullFactor = (1 - od / (commRadius * 0.9)) * 14;
              fx += ((other.x - person.x) / od) * 4;
              other.vx += ((person.x - other.x) / od) * pullFactor * dt;
              other.vy += ((person.y - other.y) / od) * pullFactor * dt;
            }
          }
        }
        break;
      }

      default: {
        // Generic member or seeker
        const isUncared = person.careStatus === 'UNCARED';
        const isLeaving = person.movementState === 'LEAVING';

        // 1. LEAVING member behavior (냉담/이탈 위기)
        if (isLeaving) {
          if (person.beingHeldById) {
            // Shepherd is actively holding onto them! Intercept outward motion and draw to shepherd
            const holder = allPeople.find(p => p.id === person.beingHeldById);
            if (holder) {
              const d = distance(person.x, person.y, holder.x, holder.y);
              if (d > 10) {
                fx += ((holder.x - person.x) / d) * 25;
                fy += ((holder.y - person.y) / d) * 25;
              }
            }
          } else {
            // Member is cold/lukewarm and walking slowly outward away from community
            if (distToCenter > 5) {
              fx += ((person.x - targetCenterX) / distToCenter) * 24;
              fy += ((person.y - targetCenterY) / distToCenter) * 24;
            }
          }
        } else if (isUncared) {
          // Uncared persons drift towards community edge and jitter nervously
          const edgeAngle = (person.wobbleOffset + performance.now() * 0.0015) % (Math.PI * 2);
          const edgeDist = commRadius * 0.86;
          const targetEdgeX = targetCenterX + Math.cos(edgeAngle) * edgeDist;
          const targetEdgeY = targetCenterY + Math.sin(edgeAngle) * edgeDist;
          const dToEdge = distance(person.x, person.y, targetEdgeX, targetEdgeY);

          if (dToEdge > 10) {
            fx += ((targetEdgeX - person.x) / dToEdge) * 35;
            fy += ((targetEdgeY - person.y) / dToEdge) * 35;
          }
          // Nervous jitter looking for shepherd
          fx += (Math.random() - 0.5) * 16;
          fy += (Math.random() - 0.5) * 16;
        } else {
          // 2. Shepherd-Flock Satellite Mechanics (Req 1: 뿌리교회와 목자 소그룹 위성 움직임)
          if (person.caregiverId) {
            const shepherd = allPeople.find(p => p.id === person.caregiverId);
            if (shepherd) {
              const dx = person.x - shepherd.x;
              const dy = person.y - shepherd.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              
              // Tight, intimate satellite orbit (28~44px) around their personal shepherd
              const flockList = shepherd.careTargets || [];
              const flockIndex = Math.max(0, flockList.indexOf(person.id));
              const targetOrbitR = 28 + (flockIndex * 5); // 28, 33, 38, 43px
              
              if (dist > 0) {
                // Responsive radial tether to stay clustered around shepherd
                const radialPull = (dist - targetOrbitR) * 2.8;
                fx += -(dx / dist) * radialPull;
                fy += -(dy / dist) * radialPull;

                // Visible satellite rotation around shepherd
                const orbitSpeed = 24;
                const dir = (flockIndex % 2 === 0) ? 1 : -1;
                fx += (-dy / dist) * orbitSpeed * dir;
                fy += (dx / dist) * orbitSpeed * dir;
              }
              
              // Organic living wobble
              const wobble = (person.wobbleOffset + performance.now() * 0.001) % (Math.PI * 2);
              fx += Math.cos(wobble) * 6;
              fy += Math.sin(wobble) * 6;
              break;
            }
          }

          // Fallback: Orbit Primary Leader or Community Center
          let orbitCenterTarget: Person | null = null;
          let bestLeader: Person | null = null;
          let bestScore = -1;
          for (const p of allPeople) {
            if (p.communityId === comm.id && p.id !== person.id && p.calling !== null) {
              const score = (p.generation === 0 ? 1000 : 0) + p.readiness;
              if (score > bestScore) {
                bestScore = score;
                bestLeader = p;
              }
            }
          }
          orbitCenterTarget = bestLeader;

          if (orbitCenterTarget) {
            const dx = person.x - orbitCenterTarget.x;
            const dy = person.y - orbitCenterTarget.y;
            const distToLeader = Math.sqrt(dx * dx + dy * dy);
            const baseOrbitR = 40 + (person.id.charCodeAt(0) % 40);
            
            if (distToLeader > 0) {
              const radialPull = (distToLeader - baseOrbitR) * 1.2;
              fx += -(dx / distToLeader) * radialPull;
              fy += -(dy / distToLeader) * radialPull;

              const direction = (person.id.charCodeAt(1) % 2 === 0) ? 1 : -1;
              const speed = 12;
              fx += (-dy / distToLeader) * speed * direction;
              fy += (dx / distToLeader) * speed * direction;
            }
            
            const wanderAngle = (person.wobbleOffset + performance.now() * 0.0005) % (Math.PI * 2);
            fx += Math.cos(wanderAngle) * 10;
            fy += Math.sin(wanderAngle) * 10;
          } else {
            // Normal member: Stay comfortably inside blob
            const wanderAngle = (person.wobbleOffset + performance.now() * 0.0005) % (Math.PI * 2);
            fx += Math.cos(wanderAngle) * 18;
            fy += Math.sin(wanderAngle) * 18;

            if (distToCenter > commRadius * 1.8) {
              const pull = (distToCenter - commRadius * 1.8) / (commRadius * 0.5);
              fx += ((targetCenterX - person.x) / distToCenter) * 35 * pull;
              fy += ((targetCenterY - person.y) / distToCenter) * 35 * pull;
            }
          }
        }
        break;
      }
    }

    // Community Boundary Containment (prevent member from flying away uncontrollably)
    if (person.calling !== 'EVANGELIST' && person.movementState !== 'LEAVING') {
      if (distToCenter > commRadius * 2.2) {
        const excess = distToCenter - commRadius * 2.2;
        fx += ((targetCenterX - person.x) / distToCenter) * (excess * 2.0);
        fy += ((targetCenterY - person.y) / distToCenter) * (excess * 2.0);
      }
    }
  }

  // World bounds containment
  const { bx, by } = getBoundaryPush(person.x, person.y, world);
  fx += bx;
  fy += by;

  return { fx, fy, maxSpeed };
}

function getBoundaryPush(x: number, y: number, world: WorldBounds): { bx: number; by: number } {
  let bx = 0;
  let by = 0;
  const pad = 35;
  if (x < pad) bx += (pad - x) * 5;
  if (x > world.width - pad) bx -= (x - (world.width - pad)) * 5;
  if (y < pad) by += (pad - y) * 5;
  if (y > world.height - pad) by -= (y - (world.height - pad)) * 5;
  return { bx, by };
}
