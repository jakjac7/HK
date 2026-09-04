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
  isReleaseActive: boolean
): { fx: number; fy: number; maxSpeed: number } {
  let fx = 0;
  let fy = 0;

  // Max speed affected by burnout
  const burnoutPenalty = 1 - (person.burnout / 100) * 0.55;
  let maxSpeed = (person.isExternal ? 28 : 42) * burnoutPenalty;
  if (isReleaseActive) {
    maxSpeed *= 1.35; // 2x simulation / heightened autonomous activity
  }

  // Find assigned community if any
  const comm = communities.find(c => c.id === person.communityId);
  const commPriority: CommunityPriority = comm ? comm.priority : 'ROOT';

  // 1. Separation force (avoid overlapping with neighbors)
  const separationRadius = 22;
  let sepX = 0;
  let sepY = 0;
  let sepCount = 0;

  for (const other of allPeople) {
    if (other.id === person.id) continue;
    const d = distance(person.x, person.y, other.x, other.y);
    if (d > 0 && d < separationRadius) {
      const push = (separationRadius - d) / separationRadius;
      sepX += ((person.x - other.x) / d) * push * 65;
      sepY += ((person.y - other.y) / d) * push * 65;
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

    // Calling-specific Movement Biases (Core Product Invariants!)
    switch (person.calling) {
      case 'EVANGELIST': {
        // High Outside Movement Frequency & Boundary Crossing
        // Seeks external unconnected people or Open Doors
        let externalTarget: Person | null = null;
        let minD = Infinity;

        for (const other of allPeople) {
          if (other.isExternal && other.externalState !== 'FOLLOWING') {
            const d = distance(person.x, person.y, other.x, other.y);
            if (d < minD) {
              minD = d;
              externalTarget = other;
            }
          }
        }

        const goMultiplier = commPriority === 'GO' ? 1.5 : 1.0;

        if (externalTarget && minD < commRadius * 2.8) {
          // Evangelist steps out to meet external target
          fx += ((externalTarget.x - person.x) / minD) * 55 * goMultiplier;
          fy += ((externalTarget.y - person.y) / minD) * 55 * goMultiplier;

          // If close enough, initiate contact
          if (minD < 32 && externalTarget.externalState !== 'CONTACTED') {
            externalTarget.externalState = 'CONTACTED';
            externalTarget.contactWithId = person.id;
            person.contribution.reachedCount++;
          }
        } else {
          // Patrol between edge and outside
          const angle = (person.wobbleOffset + performance.now() * 0.0008) % (Math.PI * 2);
          const orbitR = commRadius * (0.85 + 0.35 * Math.sin(performance.now() * 0.0015));
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
        // Edge Patrol & Returning leaving/weak nodes
        let vulnerableTarget: Person | null = null;
        let highestNeed = 0;

        for (const other of allPeople) {
          if (other.communityId === comm.id && other.id !== person.id) {
            const dFromCenter = distance(other.x, other.y, comm.centerX, comm.centerY);
            let score = 0;
            if (other.need?.type === 'NEWCOMER') score += 50;
            if (other.stability < 45) score += 40;
            if (other.need?.type === 'TENSION') score += 35;
            if (dFromCenter > commRadius * 0.8) score += 30; // on the edge

            if (score > highestNeed) {
              highestNeed = score;
              vulnerableTarget = other;
            }
          }
        }

        const careMultiplier = commPriority === 'CARE' ? 1.4 : 1.0;

        if (vulnerableTarget) {
          const d = distance(person.x, person.y, vulnerableTarget.x, vulnerableTarget.y);
          if (d > 15) {
            fx += ((vulnerableTarget.x - person.x) / d) * 50 * careMultiplier;
            fy += ((vulnerableTarget.y - person.y) / d) * 50 * careMultiplier;
          }
          // Shepherd brings retention & stability
          if (d < 30) {
            vulnerableTarget.stability = Math.min(100, vulnerableTarget.stability + 15 * dt);
            vulnerableTarget.trust = Math.min(100, vulnerableTarget.trust + 10 * dt);
            person.contribution.caredCount++;
          }
        } else {
          // Patrol the edge perimeter
          const angle = (person.wobbleOffset + performance.now() * 0.0006) % (Math.PI * 2);
          const ox = targetCenterX + Math.cos(angle) * (commRadius * 0.78);
          const oy = targetCenterY + Math.sin(angle) * (commRadius * 0.78);
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
        // Generic member: Stay comfortably inside blob, wander organically
        const wanderAngle = (person.wobbleOffset + performance.now() * 0.0005) % (Math.PI * 2);
        fx += Math.cos(wanderAngle) * 16;
        fy += Math.sin(wanderAngle) * 16;

        // Attract toward community center if wandering too far out
        if (distToCenter > commRadius * 0.65) {
          const pull = (distToCenter - commRadius * 0.65) / (commRadius * 0.35);
          fx += ((targetCenterX - person.x) / distToCenter) * 45 * pull;
          fy += ((targetCenterY - person.y) / distToCenter) * 45 * pull;
        }
        break;
      }
    }

    // Community Boundary Containment (prevent member from flying away uncontrollably)
    if (person.calling !== 'EVANGELIST') {
      if (distToCenter > commRadius * 0.95) {
        const excess = distToCenter - commRadius * 0.95;
        fx += ((targetCenterX - person.x) / distToCenter) * (excess * 2.5);
        fy += ((targetCenterY - person.y) / distToCenter) * (excess * 2.5);
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
