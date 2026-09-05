/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Person, Community, CommunityPriority } from '../types';

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
  isSunday: boolean = false
): { fx: number; fy: number; maxSpeed: number } {
  let fx = 0;
  let fy = 0;

  // Max speed affected by burnout
  const burnoutPenalty = 1 - (person.burnout / 100) * 0.55;
  let maxSpeed = (person.isExternal ? 28 : 42) * burnoutPenalty;
  
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
  const separationRadius = 32; // Increased to prevent too much overlap
  let sepX = 0;
  let sepY = 0;
  let sepCount = 0;

  for (const other of allPeople) {
    if (other.id === person.id) continue;
    const d = distance(person.x, person.y, other.x, other.y);
    if (d > 0 && d < separationRadius) {
      const push = (separationRadius - d) / separationRadius;
      sepX += ((person.x - other.x) / d) * push * 90; // Increased push force
      sepY += ((person.y - other.y) / d) * push * 90;
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
    if (person.externalState === 'FOLLOWING' && person.contactWithId) {
      const guide = allPeople.find(p => p.id === person.contactWithId);
      if (guide) {
        const d = distance(person.x, person.y, guide.x, guide.y);
        if (d > 35) {
          // Follow guide toward community
          fx += ((guide.x - person.x) / d) * 45;
          fy += ((guide.y - person.y) / d) * 45;
        }
      }
    } else {
      // Gentle curiosity wander outside
      const wanderAngle = (person.wobbleOffset + performance.now() * 0.001) % (Math.PI * 2);
      fx += Math.cos(wanderAngle) * 14;
      fy += Math.sin(wanderAngle) * 14;

      // Gentle decay of contactProgress if not contacted yet and no believers near
      if (person.externalState !== 'CONTACTED' && (person.contactProgress || 0) > 0) {
        const anyBelieverNear = allPeople.some(p => !p.isExternal && distance(p.x, p.y, person.x, person.y) < 35);
        if (!anyBelieverNear) {
          person.contactProgress = Math.max(0, (person.contactProgress || 0) - 3 * dt);
        }
      }
    }

    // Keep within world bounds
    fx += getBoundaryPush(person.x, person.y, world).bx;
    fy += getBoundaryPush(person.x, person.y, world).by;
    return { fx, fy, maxSpeed: maxSpeed * 0.7 };
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

    // SUNDAY SCRUM: Everyone gathers tightly to the center to worship
    if (isSunday && !isDivided) {
      if (distToCenter > 15) {
        fx += ((targetCenterX - person.x) / distToCenter) * 60;
        fy += ((targetCenterY - person.y) / distToCenter) * 60;
      }
      // Add slight rotation for scrum effect
      fx += (- (targetCenterY - person.y) / distToCenter) * 15;
      fy += ((targetCenterX - person.x) / distToCenter) * 15;
      
      // World bounds containment
      const { bx, by } = getBoundaryPush(person.x, person.y, world);
      fx += bx;
      fy += by;
      return { fx, fy, maxSpeed };
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
    const contactRange = isEvangelist ? 42 : 32;

    // Acquire new seeker targets up to the strict limit of 2 concurrent markings
    if (person.engagedSeekerIds.length < 2) {
      for (const other of allPeople) {
        if (person.engagedSeekerIds.length >= 2) break;
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
          
          seeker.contactDuration += dt * synergy;
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
        // Seeks external unconnected people or Open Doors
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

        const goMultiplier = commPriority === 'GO' ? 1.5 : 1.0;

        if (externalTarget && minD < commRadius * 3.5) {
          // Evangelist steps out to meet external target
          fx += ((externalTarget.x - person.x) / minD) * 55 * goMultiplier;
          fy += ((externalTarget.y - person.y) / minD) * 55 * goMultiplier;
        } else {
          // Patrol between edge and outside
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
        // 2. Shepherd Pastoral Hold & Rescue: Holding onto leaving/cooling members (Req 2)
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
            if (other.careStatus === 'UNCARED') score += 70;
            if (other.need?.type === 'WEARY' || other.need?.type === 'TENSION') score += 65;
            if (other.need?.type === 'NEWCOMER') score += 55;
            if (other.stability < 45) score += 45;
            if (dFromCenter > commRadius * 0.8) score += 35; // drifted to edge

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

          // Shepherd rushes with pastoral urgency to rescue leaving sheep
          const rushSpeed = isTargetLeaving ? 75 : (isOverloaded ? 65 : 50);
          if (d > 15) {
            fx += ((vulnerableTarget.x - person.x) / d) * rushSpeed * careMultiplier;
            fy += ((vulnerableTarget.y - person.y) / d) * rushSpeed * careMultiplier;
          }

          // Shepherd reaches the member: PASTORAL HOLD & EMBRACE (붙잡아주기)
          if (d < 36) {
            // Actively hold onto the straying/leaving member!
            person.isHoldingPersonId = vulnerableTarget.id;
            person.holdingTimer = 0.6;
            vulnerableTarget.beingHeldById = person.id;

            // Stop their outward drift and restore heart
            vulnerableTarget.stability = Math.min(100, vulnerableTarget.stability + 24 * dt);
            vulnerableTarget.trust = Math.min(100, vulnerableTarget.trust + 18 * dt);
            vulnerableTarget.leaveIntent = Math.max(0, (vulnerableTarget.leaveIntent || 0) - 28 * dt);
            vulnerableTarget.burnout = Math.max(0, vulnerableTarget.burnout - 15 * dt);

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
              vulnerableTarget.careStatus = 'CARED';
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
          const patrolRadius = commRadius * (0.8 + 0.6 * Math.sin(performance.now() * 0.0008));
          const ox = targetCenterX + Math.cos(angle) * patrolRadius;
          const oy = targetCenterY + Math.sin(angle) * patrolRadius;
          const od = distance(person.x, person.y, ox, oy);
          if (od > 5) {
            fx += ((ox - person.x) / od) * 40 * careMultiplier;
            fy += ((oy - person.y) / od) * 40 * careMultiplier;
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

        // If deception exists in community, Teacher reveals it!
        if (comm.drift?.type === 'DECEPTION' && !comm.drift.discovered) {
          comm.drift.discovered = true;
          comm.drift.title = '거짓 교리 분별됨 (Deception Identified by Teacher)';
          person.contribution.deceptionsExposed++;
        }
        break;
      }

      case 'INTERCESSOR': {
        if (commPriority === 'GO') {
          // In GO priority, Intercessors also seek external targets for mission
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

        // Draw nearby members slightly closer
        for (const other of allPeople) {
          if (other.communityId === comm.id && other.id !== person.id) {
            const od = distance(person.x, person.y, other.x, other.y);
            if (od < commRadius * 0.8 && od > 25) {
              // Gentle gravitational unity pull
              fx += ((other.x - person.x) / od) * 8;
              fy += ((other.y - person.y) / od) * 8;
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
