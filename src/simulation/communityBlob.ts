/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Community, Person } from '../types';

/**
 * Calculates organic boundary polygon points for a community
 * based on its member positions, breathing pulse, safe capacity, and drift state.
 */
export function calculateCommunityHull(
  comm: Community,
  members: Person[],
  time: number
): { x: number; y: number }[] {
  const pointsCount = 24; // smooth contour
  const hull: { x: number; y: number }[] = [];

  // Breathing pulse (influenced by Resilience / Intercessor Prayer)
  const breathingFreq = 0.0018 + (comm.stats.resilience / 100) * 0.001;
  const breathingAmp = 6 + (comm.stats.resilience / 100) * 8;
  const breath = Math.sin(time * breathingFreq + comm.pulsePhase) * breathingAmp;

  const baseRadius = comm.currentRadius + breath;
  const isDivided = comm.drift?.type === 'DIVISION' && comm.drift.intensity > 25;
  const divisionSeverity = isDivided ? (comm.drift!.intensity / 100) : 0;

  for (let i = 0; i < pointsCount; i++) {
    const angle = (i / pointsCount) * Math.PI * 2;

    // Organic noise deformation
    const noise1 = Math.sin(angle * 3 + time * 0.0012 + comm.pulsePhase) * 7;
    const noise2 = Math.cos(angle * 5 - time * 0.0016) * 4;

    // Division distortion: pinches in at North & South (angles PI/2 and 3PI/2) to form two lobes (East/West)
    let divisionFactor = 1.0;
    if (isDivided) {
      const pinch = Math.abs(Math.sin(angle)); // 1 at top/bottom, 0 at left/right
      divisionFactor = 1.0 - pinch * 0.45 * divisionSeverity;
    }

    // Directional pull towards member clusters
    let memberInfluence = 0;
    for (const m of members) {
      const dx = m.x - comm.centerX;
      const dy = m.y - comm.centerY;
      const mAngle = Math.atan2(dy, dx);
      let angleDiff = Math.abs(angle - mAngle);
      if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
      if (angleDiff < Math.PI / 4) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        memberInfluence += Math.max(0, (dist - baseRadius * 0.6) * 0.15);
      }
    }

    const r = (baseRadius + noise1 + noise2 + Math.min(memberInfluence, 25)) * divisionFactor;
    hull.push({
      x: comm.centerX + Math.cos(angle) * r,
      y: comm.centerY + Math.sin(angle) * r,
    });
  }

  return hull;
}

/**
 * Draws the organic community blob on the canvas
 */
export function drawOrganicBlob(
  ctx: CanvasRenderingContext2D,
  comm: Community,
  hull: { x: number; y: number }[]
) {
  if (hull.length < 3) return;

  ctx.save();

  // Visual mapping: WORSHIP -> Color Saturation & Clarity
  // When clarity is high, colors are vibrant and radiant; when low, paler & hazier.
  const clarity = comm.stats.clarity / 100;
  const unity = comm.stats.unity / 100;
  
  // Base HSL components: Hues around 205-225 (Heavenly Deep Blue/Teal) or community seed hue
  // Community 1: 210 (Cyan-Blue), Community 2: 155 (Emerald), Community 3: 45 (Gold)
  let hue = 210;
  if (comm.id.includes('2')) hue = 155;
  if (comm.id.includes('3')) hue = 42;

  const saturation = 45 + clarity * 45; // 45% -> 90%
  const lightness = 48 + unity * 12;

  ctx.beginPath();
  const first = hull[0];
  ctx.moveTo(first.x, first.y);

  // Smooth Catmull-Rom / Bezier curve interpolation through hull points
  for (let i = 0; i < hull.length; i++) {
    const p0 = hull[(i - 1 + hull.length) % hull.length];
    const p1 = hull[i];
    const p2 = hull[(i + 1) % hull.length];
    const p3 = hull[(i + 2) % hull.length];

    // Spline control points
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }
  ctx.closePath();

  // Radial gradient for internal glow & organic depth
  const grad = ctx.createRadialGradient(
    comm.centerX,
    comm.centerY,
    comm.currentRadius * 0.15,
    comm.centerX,
    comm.centerY,
    comm.currentRadius * 1.15
  );

  const innerAlpha = 0.12 + clarity * 0.12;
  const outerAlpha = 0.04 + clarity * 0.06;

  grad.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness}%, ${innerAlpha})`);
  grad.addColorStop(0.7, `hsla(${hue}, ${saturation - 10}%, ${lightness}%, ${outerAlpha})`);
  grad.addColorStop(1, `hsla(${hue}, ${saturation}%, ${lightness}%, 0)`);

  ctx.fillStyle = grad;
  ctx.fill();

  // Translucent glowing boundary stroke
  ctx.lineWidth = 1.8 + unity * 1.5;
  ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness + 10}%, ${0.35 + clarity * 0.45})`;
  ctx.stroke();

  // Subtle interior breathing halo ring
  ctx.beginPath();
  ctx.arc(
    comm.centerX,
    comm.centerY,
    comm.currentRadius * 0.45,
    0,
    Math.PI * 2
  );
  ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${0.08 + unity * 0.12})`;
  ctx.lineWidth = 1;
  ctx.stroke();

  // If Division drift is active, render a subtle tension hairline across the pinch
  if (comm.drift?.type === 'DIVISION' && comm.drift.intensity > 30) {
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(comm.centerX, comm.centerY - comm.currentRadius * 0.7);
    ctx.lineTo(comm.centerX, comm.centerY + comm.currentRadius * 0.7);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore();
}
