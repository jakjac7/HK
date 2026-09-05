/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Person, Community, CareStatus } from '../types';

export class CareSystem {
  /**
   * Recalculates total community care capacity and allocates care targets.
   * Section 16-22:
   * - Shepherd: capacity = 4
   * - Mature Disciple (G1+ or high depth/readiness without calling): capacity = 1
   * - Excess people become UNCARED.
   */
  public static updateCommunityCare(
    community: Community,
    people: Person[],
    dt: number
  ): { newlyUncared: Person[]; overloadedShepherds: Person[] } {
    const communityMembers = people.filter(p => p.communityId === community.id && !p.isExternal);
    const totalPop = communityMembers.length;

    // Identify Shepherds and Mature Disciples
    const shepherds = communityMembers.filter(p => p.calling === 'SHEPHERD');
    const matureDisciples = communityMembers.filter(
      p => p.calling !== 'SHEPHERD' && (p.generation >= 1 || (p.depth >= 70 && p.stability >= 65))
    );

    // Calculate total care capacity
    const shepherdCapacity = shepherds.length * 4;
    const discipleCapacity = matureDisciples.length * 1;
    const totalCareCapacity = shepherdCapacity + discipleCapacity;

    community.stats.careCapacity = totalCareCapacity;
    community.stats.careDemand = totalPop;
    community.stats.shepherdCount = shepherds.length;

    // Reset caregiver targets
    shepherds.forEach(s => {
      s.careCapacity = 4;
      s.careTargets = [];
      s.careLoad = 0;
    });

    matureDisciples.forEach(d => {
      d.careCapacity = 1;
      d.careTargets = [];
      d.careLoad = 0;
    });

    // Sort people by care priority:
    // 1. Weary / Crisis / Needs attention
    // 2. Newcomers (G0 without calling or newly arrived)
    // 3. Lowest stability / highest burnout
    const needCareList = [...communityMembers].sort((a, b) => {
      const aUrgent = a.need?.type === 'WEARY' || a.burnout > 50 || a.stability < 40 ? 10 : 0;
      const bUrgent = b.need?.type === 'WEARY' || b.burnout > 50 || b.stability < 40 ? 10 : 0;
      if (aUrgent !== bUrgent) return bUrgent - aUrgent;
      return a.stability - b.stability;
    });

    // Assign to Shepherds first (up to 4, then soft overload up to 5 if needed)
    let uncaredList: Person[] = [];
    const newlyUncared: Person[] = [];
    const overloadedShepherds: Person[] = [];

    // First pass: assign up to 4 for each Shepherd
    const assignedIds = new Set<string>();

    for (const target of needCareList) {
      if (target.calling === 'SHEPHERD') {
        // Shepherd cares for self/community naturally
        continue;
      }

      let assigned = false;

      // Try finding an available Shepherd with load < 4
      for (const s of shepherds) {
        if ((s.careTargets?.length || 0) < 4) {
          s.careTargets = s.careTargets || [];
          s.careTargets.push(target.id);
          s.careLoad = s.careTargets.length;
          target.caregiverId = s.id;
          target.careStatus = 'CARED';
          assignedIds.add(target.id);
          assigned = true;
          break;
        }
      }

      // If Shepherds are full, try mature disciples (up to 1)
      if (!assigned) {
        for (const d of matureDisciples) {
          if ((d.careTargets?.length || 0) < 1) {
            d.careTargets = d.careTargets || [];
            d.careTargets.push(target.id);
            d.careLoad = d.careTargets.length;
            target.caregiverId = d.id;
            target.careStatus = 'CARED';
            assignedIds.add(target.id);
            assigned = true;
            break;
          }
        }
      }

      // If still not assigned and we have shepherds, soft overload to 5
      if (!assigned) {
        for (const s of shepherds) {
          if ((s.careTargets?.length || 0) < 5) {
            s.careTargets = s.careTargets || [];
            s.careTargets.push(target.id);
            s.careLoad = s.careTargets.length;
            target.caregiverId = s.id;
            target.careStatus = 'CARED';
            assignedIds.add(target.id);
            assigned = true;
            if (!overloadedShepherds.includes(s)) overloadedShepherds.push(s);
            break;
          }
        }
      }

      // If still unassigned, this person is UNCARED
      if (!assigned) {
        const wasUncared = target.careStatus === 'UNCARED';
        target.careStatus = 'UNCARED';
        target.caregiverId = undefined;
        uncaredList.push(target);
        if (!wasUncared) newlyUncared.push(target);
      }
    }

    community.stats.uncaredCount = uncaredList.length;

    // Apply continuous dynamics for UNCARED persons and Shepherds
    for (const target of uncaredList) {
      target.leaveIntent = Math.min(100, (target.leaveIntent || 0) + 4 * dt);
      target.stability = Math.max(10, target.stability - 2 * dt);
      target.burnout = Math.min(100, target.burnout + 1.5 * dt);
      // Outer edge drift
      if (target.movementState !== 'SENT' && target.movementState !== 'CRISIS') {
        target.movementState = 'EDGE';
      }
    }

    // Shepherd overload burnout progression
    for (const s of shepherds) {
      const load = s.careLoad || 0;
      if (load >= 5) {
        // Overload: Burnout gain increases
        s.burnout = Math.min(100, s.burnout + (load >= 6 ? 4 : 2) * dt);
        if (s.burnout >= 55 && !s.need) {
          s.need = {
            type: 'WEARY',
            duration: 25,
            maxDuration: 25,
            description: '과도한 돌봄으로 영적 소진에 직면했습니다.',
          };
        }
      } else if (load <= 3 && s.burnout > 0) {
        // Rest & recovery when load is low
        s.burnout = Math.max(0, s.burnout - 1.5 * dt);
      }
    }

    return { newlyUncared, overloadedShepherds };
  }
}
