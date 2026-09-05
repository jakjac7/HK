/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MapProfile, MapId, MapZone, Person, Community } from '../types';
import { MAP_PROFILES } from '../config/maps';

export class MapSystem {
  private currentMapId: MapId;

  constructor(mapId: MapId = 'CAMPUS') {
    this.currentMapId = mapId;
  }

  public getMapProfile(): MapProfile {
    return MAP_PROFILES[this.currentMapId];
  }

  public setMap(mapId: MapId): void {
    this.currentMapId = mapId;
  }

  /**
   * Translates relative zone definitions to absolute canvas coordinates
   */
  public getAbsoluteZones(worldWidth: number, worldHeight: number): (MapZone & { x: number; y: number; radius: number })[] {
    const profile = this.getMapProfile();
    const minDim = Math.min(worldWidth, worldHeight);

    return profile.zones.map(z => ({
      ...z,
      x: z.relX * worldWidth,
      y: z.relY * worldHeight,
      radius: z.relRadius * minDim,
    }));
  }

  /**
   * Finds which zone a given coordinate is within (if any)
   */
  public getZoneAt(
    x: number,
    y: number,
    worldWidth: number,
    worldHeight: number
  ): (MapZone & { x: number; y: number; radius: number }) | null {
    const zones = this.getAbsoluteZones(worldWidth, worldHeight);
    for (const z of zones) {
      const dx = x - z.x;
      const dy = y - z.y;
      if (dx * dx + dy * dy <= z.radius * z.radius) {
        return z;
      }
    }
    return null;
  }

  /**
   * Evangelist External Utility based on Map & Zone (Section 34)
   * ExternalTargetUtility = PopulationAvailability * ZoneOpenness * MapMobility * RelationshipOpportunity * GO
   */
  public evaluateEvangelistTargetUtility(
    person: Person,
    targetX: number,
    targetY: number,
    worldWidth: number,
    worldHeight: number,
    isGoPriority: boolean
  ): number {
    const profile = this.getMapProfile();
    const zone = this.getZoneAt(targetX, targetY, worldWidth, worldHeight);

    const baseOpenness = profile.openness;
    const baseMobility = profile.mobility;
    const relOpp = zone ? zone.influence.relationshipMultiplier : 1.0;
    const zoneSpeed = zone ? zone.influence.speedMultiplier : 1.0;
    const goBonus = isGoPriority ? 1.5 : 1.0;

    return baseOpenness * baseMobility * relOpp * zoneSpeed * goBonus;
  }
}
