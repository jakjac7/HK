/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Deterministic Seeded Random Number Generator (Mulberry32)
 * Ensures reproducible simulations, automated test consistency, and fair map generation.
 */
export class SeededRNG {
  private state: number;

  constructor(seed: number = Date.now()) {
    this.state = seed ? (seed >>> 0) : 1337;
  }

  public setSeed(seed: number): void {
    this.state = seed >>> 0;
  }

  /**
   * Generates a pseudo-random float between 0 (inclusive) and 1 (exclusive)
   */
  public next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generates a pseudo-random integer between min (inclusive) and max (inclusive)
   */
  public range(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Weighted random selection from an array of items and corresponding weights
   */
  public weightedChoice<T>(items: T[], weights: number[]): T {
    if (items.length === 0) throw new Error('Items array cannot be empty');
    const totalWeight = weights.reduce((acc, w) => acc + Math.max(0, w), 0);
    if (totalWeight <= 0) return items[0];

    let roll = this.next() * totalWeight;
    for (let i = 0; i < items.length; i++) {
      const w = Math.max(0, weights[i]);
      if (roll < w) return items[i];
      roll -= w;
    }
    return items[items.length - 1];
  }
}

export const globalRNG = new SeededRNG();
