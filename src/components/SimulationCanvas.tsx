/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameEngine, Particle } from '../simulation/engine';
import { drawOrganicBlob } from '../simulation/communityBlob';
import { CALLING_DEFINITIONS } from '../data/callings';
import { Person, NeedType, PersonNeed, Community } from '../types';
import { Cross, Plus, Minus, Focus } from 'lucide-react';

interface SimulationCanvasProps {
  engine: GameEngine;
  onSelectPerson: (person: Person | null) => void;
  selectedPersonId: string | null;
  activeActionId?: string | null;
  activeCardId?: string | null;
  onApplyActionOnPerson?: (targetPersonId: string) => void;
  onApplyCardOnPerson?: (targetPersonId: string) => void;
}

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({
  engine,
  onSelectPerson,
  selectedPersonId,
  activeActionId,
  activeCardId,
  onApplyActionOnPerson,
  onApplyCardOnPerson,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 800,
    height: 600,
  });

  // Camera state for fluid auto-centering, panning, and zoom
  const cameraRef = useRef<{
    x: number;
    y: number;
    zoom: number;
    targetX: number;
    targetY: number;
    targetZoom: number;
    isInitialized: boolean;
  }>({
    x: 400,
    y: 300,
    zoom: 1,
    targetX: 400,
    targetY: 300,
    targetZoom: 1,
    isInitialized: false,
  });

  // Track drag and touch gestures
  const gestureRef = useRef<{
    isDragging: boolean;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    totalDist: number;
    pinchDist: number;
  }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    totalDist: 0,
    pinchDist: 0,
  });

  // Off-screen community helper state
  const [isCommunityOffscreen, setIsCommunityOffscreen] = useState(false);

  // ResizeObserver to dynamically match container size and configure world
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Immediately calculate initial dimensions on mount to prevent black/empty frame
    const rect = container.getBoundingClientRect();
    if (rect.width > 50 && rect.height > 50) {
      const initW = Math.floor(rect.width);
      const initH = Math.floor(rect.height);
      setDimensions({ width: initW, height: initH });
      engine.setWorldDimensions(initW, initH);

      const primaryComm = engine.state.communities[0];
      if (primaryComm) {
        const cam = cameraRef.current;
        cam.x = primaryComm.centerX;
        cam.y = primaryComm.centerY;
        cam.targetX = primaryComm.centerX;
        cam.targetY = primaryComm.centerY;
        const defaultZoom = Math.min(1.15, Math.max(0.75, Math.min(initW / 900, initH / 650)));
        cam.zoom = defaultZoom;
        cam.targetZoom = defaultZoom;
        cam.isInitialized = true;
      }
    }

    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 50 && height > 50) {
          const w = Math.floor(width);
          const h = Math.floor(height);
          setDimensions({ width: w, height: h });
          engine.setWorldDimensions(w, h);

          // Center camera directly on the primary community if not yet initialized
          const primaryComm = engine.state.communities[0];
          if (primaryComm) {
            const cam = cameraRef.current;
            if (!cam.isInitialized) {
              cam.x = primaryComm.centerX;
              cam.y = primaryComm.centerY;
              cam.targetX = primaryComm.centerX;
              cam.targetY = primaryComm.centerY;
              cam.zoom = 1.0;
              cam.targetZoom = 1.0;
              cam.isInitialized = true;
            }
          }
        }
      }
    });

    ro.observe(container);
    return () => ro.disconnect();
  }, [engine]);

  // Center camera on specific community
  const centerOnCommunity = useCallback(
    (commId?: string) => {
      const comm = commId
        ? engine.state.communities.find(c => c.id === commId)
        : engine.state.communities[0];
      if (comm) {
        const cam = cameraRef.current;
        cam.targetX = comm.centerX;
        cam.targetY = comm.centerY;
        cam.targetZoom = 1.0;
      }
    },
    [engine]
  );

  // Convert screen coordinates to world coordinates accounting for camera
  const screenToWorld = useCallback(
    (screenX: number, screenY: number) => {
      const cam = cameraRef.current;
      const worldX = (screenX - dimensions.width / 2) / cam.zoom + cam.x;
      const worldY = (screenY - dimensions.height / 2) / cam.zoom + cam.y;
      return { worldX, worldY };
    },
    [dimensions]
  );

  // Main Canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();
    let frameCount = 0;

    const render = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;
      frameCount++;

      // Update engine simulation
      engine.update(dt);

      // Smooth camera interpolation toward target
      const cam = cameraRef.current;
      cam.x += (cam.targetX - cam.x) * 0.14;
      cam.y += (cam.targetY - cam.y) * 0.14;
      cam.zoom += (cam.targetZoom - cam.zoom) * 0.14;

      // Periodically check if primary community is out of view
      if (frameCount % 15 === 0) {
        const primaryComm = engine.state.communities[0];
        if (primaryComm) {
          const screenX = (primaryComm.centerX - cam.x) * cam.zoom + dimensions.width / 2;
          const screenY = (primaryComm.centerY - cam.y) * cam.zoom + dimensions.height / 2;
          const isOff =
            screenX < -20 ||
            screenX > dimensions.width + 20 ||
            screenY < -20 ||
            screenY > dimensions.height + 20;
          setIsCommunityOffscreen(isOff);
        }
      }

      // Retina display scaling
      const dpr = window.devicePixelRatio || 1;
      canvas.width = dimensions.width * dpr;
      canvas.height = dimensions.height * dpr;
      ctx.resetTransform();
      ctx.scale(dpr, dpr);

      // 1. Clear dark background in screen space
      ctx.fillStyle = '#121212';
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      // Screen space subtle ambient vignette
      const screenGrad = ctx.createRadialGradient(
        dimensions.width / 2,
        dimensions.height / 2,
        40,
        dimensions.width / 2,
        dimensions.height / 2,
        Math.max(dimensions.width, dimensions.height) * 0.7
      );
      screenGrad.addColorStop(0, 'rgba(24, 24, 27, 0.3)');
      screenGrad.addColorStop(1, 'rgba(10, 10, 12, 0.9)');
      ctx.fillStyle = screenGrad;
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      // 2. Begin World space rendering with Camera transform
      ctx.save();
      ctx.translate(dimensions.width / 2, dimensions.height / 2);
      ctx.scale(cam.zoom, cam.zoom);
      ctx.translate(-cam.x, -cam.y);

      // Draw subtle background sanctuary grid & geometric balance elements centered at communities
      drawBackgroundAmbience(
        ctx,
        cam.x,
        cam.y,
        dimensions.width,
        dimensions.height,
        time,
        engine.state.communities
      );

      // TASK HK4-130: Draw Map Environmental Zones & Regional Influence
      drawMapZones(ctx, engine.mapSystem, engine.worldWidth, engine.worldHeight, time);

      // Draw Organic Community Blobs
      const isSunday = engine.state.timeElapsed > 10 && (engine.state.timeElapsed % 180) < 15;

      for (const comm of engine.state.communities) {
        drawOrganicBlob(ctx, comm, comm.hullPoints);

        if (isSunday) {
          ctx.save();
          const pulse = (Math.sin(engine.state.timeElapsed * 4) + 1) / 2;
          ctx.beginPath();
          ctx.arc(comm.centerX, comm.centerY, comm.currentRadius * 0.8, 0, Math.PI * 2);
          const gradient = ctx.createRadialGradient(comm.centerX, comm.centerY, 0, comm.centerX, comm.centerY, comm.currentRadius * 0.8);
          gradient.addColorStop(0, `rgba(255, 220, 120, ${0.3 + pulse * 0.2})`);
          gradient.addColorStop(1, 'rgba(255, 220, 120, 0)');
          ctx.fillStyle = gradient;
          ctx.fill();
          ctx.restore();
        }

        // Community Title / Banner in serif
        ctx.save();
        ctx.font = '600 13px "Cinzel", "Playfair Display", Georgia, serif';
        ctx.fillStyle = '#F5F5F5';
        ctx.textAlign = 'center';

        const isDaughter = comm.isAutonomous || comm.isIndependent;
        const commPrefix = isDaughter ? '🌿 ' : '🏛️ ';
        ctx.fillText(`${commPrefix}${comm.name}`, comm.centerX, comm.centerY - comm.currentRadius - 18);

        // Subtitle badge
        ctx.font = '500 10px "JetBrains Mono", monospace';
        if (isDaughter) {
          ctx.fillStyle = 'rgba(52, 211, 153, 0.9)'; // emerald
          ctx.fillText(
            `[자립 분립교회 · 자율 운영: ${comm.priority}] 성도 ${comm.stats.population}명`,
            comm.centerX,
            comm.centerY - comm.currentRadius - 5
          );
        } else {
          ctx.fillStyle = 'rgba(251, 191, 36, 0.85)'; // amber
          ctx.fillText(
            `[뿌리 모교회] 성도 ${comm.stats.population}명 · 품 ${comm.stats.safeCapacity}명`,
            comm.centerX,
            comm.centerY - comm.currentRadius - 5
          );
        }
        ctx.restore();
      }

      // Draw Outreach & Relationship connections (Open Doors / Following paths)
      drawRelationshipTrails(ctx, engine.state.people);

      // Draw Person Nodes
      for (const p of engine.state.people) {
        drawPersonNode(ctx, p, p.id === selectedPersonId, !!activeCardId, time);
      }

      // Draw Blessing Particles
      if (engine.state.particles && engine.state.particles.length > 0) {
        for (const pt of engine.state.particles) {
          drawParticle(ctx, pt, time);
        }
      }

      ctx.restore(); // Restore from World Camera space

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [dimensions, engine, selectedPersonId, activeCardId]);

  // Click & Touch hit-testing helper
  const handleInteractionAtScreenPoint = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const screenX = clientX - rect.left;
      const screenY = clientY - rect.top;

      const { worldX, worldY } = screenToWorld(screenX, screenY);
      const cam = cameraRef.current;

      // Generous hit test radius scaled by camera zoom
      const hitRadius = Math.max(28, 32 / Math.min(1.2, cam.zoom));
      let clickedPerson: Person | null = null;
      let minD = hitRadius;

      for (const p of engine.state.people) {
        const dx = p.x - worldX;
        const dy = p.y - worldY;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < minD) {
          minD = d;
          clickedPerson = p;
        }
      }

      if (activeActionId && clickedPerson && onApplyActionOnPerson) {
        onApplyActionOnPerson(clickedPerson.id);
        return;
      }

      if (activeCardId && clickedPerson && onApplyCardOnPerson) {
        onApplyCardOnPerson(clickedPerson.id);
        return;
      }

      onSelectPerson(clickedPerson);
    },
    [engine, activeActionId, activeCardId, onApplyActionOnPerson, onApplyCardOnPerson, onSelectPerson, screenToWorld]
  );

  // Mouse Gestures (Drag to pan, wheel to zoom, click to select)
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    gestureRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      totalDist: 0,
      pinchDist: 0,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!gestureRef.current.isDragging) return;
    const dx = e.clientX - gestureRef.current.lastX;
    const dy = e.clientY - gestureRef.current.lastY;
    gestureRef.current.totalDist += Math.hypot(dx, dy);
    gestureRef.current.lastX = e.clientX;
    gestureRef.current.lastY = e.clientY;

    const cam = cameraRef.current;
    cam.x -= dx / cam.zoom;
    cam.y -= dy / cam.zoom;
    cam.targetX = cam.x;
    cam.targetY = cam.y;
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gestureRef.current.totalDist < 6) {
      handleInteractionAtScreenPoint(e.clientX, e.clientY);
    }
    gestureRef.current.isDragging = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    const cam = cameraRef.current;
    cam.targetZoom = Math.max(0.6, Math.min(2.0, cam.targetZoom * factor));
  };

  // Touch Gestures (Drag to pan, pinch to zoom, tap to select)
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      gestureRef.current = {
        isDragging: true,
        startX: t.clientX,
        startY: t.clientY,
        lastX: t.clientX,
        lastY: t.clientY,
        totalDist: 0,
        pinchDist: 0,
      };
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      gestureRef.current.pinchDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      gestureRef.current.isDragging = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1 && gestureRef.current.isDragging) {
      const t = e.touches[0];
      const dx = t.clientX - gestureRef.current.lastX;
      const dy = t.clientY - gestureRef.current.lastY;
      gestureRef.current.totalDist += Math.hypot(dx, dy);
      gestureRef.current.lastX = t.clientX;
      gestureRef.current.lastY = t.clientY;

      const cam = cameraRef.current;
      cam.x -= dx / cam.zoom;
      cam.y -= dy / cam.zoom;
      cam.targetX = cam.x;
      cam.targetY = cam.y;
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      if (gestureRef.current.pinchDist > 0) {
        const factor = dist / gestureRef.current.pinchDist;
        const cam = cameraRef.current;
        cam.targetZoom = Math.max(0.6, Math.min(2.0, cam.targetZoom * factor));
        cam.zoom = cam.targetZoom;
      }
      gestureRef.current.pinchDist = dist;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (gestureRef.current.totalDist < 8 && e.changedTouches.length > 0) {
      const t = e.changedTouches[0];
      handleInteractionAtScreenPoint(t.clientX, t.clientY);
    }
    gestureRef.current.isDragging = false;
    gestureRef.current.pinchDist = 0;
  };

  return (
    <div
      ref={containerRef}
      id="simulation-container"
      className="relative w-full h-full overflow-hidden select-none touch-none bg-[#121212] geometric-dots-bg"
    >
      <canvas
        ref={canvasRef}
        id="simulation-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        style={{ width: `${dimensions.width}px`, height: `${dimensions.height}px` }}
        className="block w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Floating Center / Off-screen Recovery Button */}
      {isCommunityOffscreen && (
        <button
          id="recenter-community-alert-btn"
          onClick={() => centerOnCommunity()}
          className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-400 text-black px-4 py-1.5 rounded-full font-serif text-xs font-bold shadow-[0_0_20px_rgba(251,191,36,0.6)] border border-amber-300 flex items-center gap-2 animate-bounce cursor-pointer z-20"
        >
          <Focus className="w-3.5 h-3.5" />
          <span>우리 공동체 찾기 ({engine.state.communities[0]?.name})</span>
        </button>
      )}

      {/* Targeting Prompt */}
      {(activeActionId || activeCardId) && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-amber-400 text-black font-mono font-semibold px-4 py-1 rounded-full border border-amber-300 text-xs shadow-[0_4px_20px_rgba(251,191,36,0.4)] pointer-events-none animate-pulse z-20">
          지체를 탭하여 사역을 행하세요
        </div>
      )}

      {/* Community Quick Navigator Chips (Top-Left) */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
        {engine.state.communities.map(c => (
          <button
            key={c.id}
            id={`comm-nav-${c.id}`}
            onClick={() => centerOnCommunity(c.id)}
            className="bg-black/80 hover:bg-black text-white/90 border border-white/20 hover:border-amber-400/60 px-2.5 py-1 rounded-sm text-[11px] font-serif flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95 backdrop-blur-md"
          >
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ backgroundColor: c.colorBase }}
            />
            <span className="font-medium">{c.name}</span>
            <span className="text-[10px] font-mono text-white/40">({c.stats.population})</span>
          </button>
        ))}
      </div>

      {/* Floating Geometric Balance Controls (Top-Right): Recenter & Zoom */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
        <button
          id="recenter-btn"
          onClick={() => centerOnCommunity()}
          title="공동체 화면 중앙 맞추기"
          className="bg-black/80 hover:bg-black text-amber-300 border border-white/20 hover:border-amber-400/60 px-2.5 py-1.5 rounded-sm flex items-center gap-1 text-xs font-mono shadow-md cursor-pointer transition-all active:scale-95 backdrop-blur-md"
        >
          <Cross className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] font-medium">중심</span>
        </button>

        <div className="flex items-center border border-white/20 rounded-sm overflow-hidden bg-black/80 backdrop-blur-md">
          <button
            id="zoom-in-btn"
            onClick={() => {
              const cam = cameraRef.current;
              cam.targetZoom = Math.min(2.0, cam.targetZoom * 1.25);
            }}
            title="확대"
            className="w-7 h-7 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 active:scale-95 cursor-pointer text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-white/15" />
          <button
            id="zoom-out-btn"
            onClick={() => {
              const cam = cameraRef.current;
              cam.targetZoom = Math.max(0.6, cam.targetZoom * 0.8);
            }}
            title="축소"
            className="w-7 h-7 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 active:scale-95 cursor-pointer text-xs"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper: Background starry ambience with symmetrical geometric balance elements aligned to communities
function drawBackgroundAmbience(
  ctx: CanvasRenderingContext2D,
  camX: number,
  camY: number,
  w: number,
  h: number,
  time: number,
  communities: Community[]
) {
  ctx.save();

  // For each community, draw sacred concentric orbit rings & symmetrical crosshairs
  for (const comm of communities) {
    const cx = comm.centerX;
    const cy = comm.centerY;
    const r = comm.currentRadius;

    // Ring 1: Inner sacred orbit
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.35, 0, Math.PI * 2);
    ctx.stroke();

    // Ring 2: Outer dashed mission orbit
    ctx.beginPath();
    ctx.setLineDash([4, 8]);
    ctx.arc(cx, cy, r * 1.9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Axis crosshairs radiating out subtly (North, South, East, West)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.beginPath();
    ctx.moveTo(cx - r * 2.5, cy);
    ctx.lineTo(cx + r * 2.5, cy);
    ctx.moveTo(cx, cy - r * 2.5);
    ctx.lineTo(cx, cy + r * 2.5);
    ctx.stroke();

    // Symmetrical subtle gold diamond frame
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.05)';
    ctx.beginPath();
    const dSize = r * 1.25;
    ctx.moveTo(cx, cy - dSize);
    ctx.lineTo(cx + dSize, cy);
    ctx.lineTo(cx, cy + dSize);
    ctx.lineTo(cx - dSize, cy);
    ctx.closePath();
    ctx.stroke();
  }

  // Subtle ambient dust motes
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  for (let i = 0; i < 24; i++) {
    const x = ((i * 127 + time * 0.005) % (w * 1.6)) - w * 0.3 + camX;
    const y = ((i * 157 + Math.sin(time * 0.0004 + i) * 25) % (h * 1.6)) - h * 0.3 + camY;
    ctx.fillRect(x, y, 1.5, 1.5);
  }

  ctx.restore();
}

// Helper: Draw Environmental Zones & Regional Influence
function drawMapZones(
  ctx: CanvasRenderingContext2D,
  mapSystem: any,
  worldWidth: number,
  worldHeight: number,
  time: number
) {
  if (!mapSystem) return;
  const zones = mapSystem.getAbsoluteZones(worldWidth, worldHeight);
  if (!zones || zones.length === 0) return;

  ctx.save();
  for (const zone of zones) {
    const pulse = 0.5 + 0.5 * Math.sin(time * 0.001 + zone.x * 0.01);
    
    // Zone radial ambient fill
    const grad = ctx.createRadialGradient(zone.x, zone.y, 0, zone.x, zone.y, zone.radius);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.04)');
    grad.addColorStop(0.75, 'rgba(56, 189, 248, 0.02)');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
    ctx.fill();

    // Zone delicate dashed perimeter
    ctx.beginPath();
    ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
    ctx.setLineDash([6, 8]);
    ctx.strokeStyle = `rgba(148, 163, 184, ${0.12 + pulse * 0.06})`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);

    // Zone Title and Influence badge (subtle display at top of zone)
    ctx.font = '600 11px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(203, 213, 225, 0.6)';
    ctx.textAlign = 'center';
    ctx.fillText(`📍 ${zone.name}`, zone.x, zone.y - zone.radius + 16);

    ctx.font = '400 9px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
    ctx.fillText(
      `이동 ${zone.influence.speedMultiplier}x · 관계 ${zone.influence.relationshipMultiplier}x`,
      zone.x,
      zone.y - zone.radius + 28
    );
  }
  ctx.restore();
}

// Helper: Relationship, Orbit, & Open Door connection paths
function drawRelationshipTrails(ctx: CanvasRenderingContext2D, people: Person[]) {
  ctx.save();
  for (const p of people) {
    // 1. Pastoral Hold / Shepherd rescue thread (Req 2)
    if (p.beingHeldById) {
      const shepherd = people.find(g => g.id === p.beingHeldById);
      if (shepherd) {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(shepherd.x, shepherd.y);
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.85)'; // Emerald-gold rescue lifeline
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Cross icon at midpoint
        const midX = (p.x + shepherd.x) / 2;
        const midY = (p.y + shepherd.y) / 2;
        ctx.fillStyle = '#34d399';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✚', midX, midY);
      }
    }

    // 2. Evangelist Outreach trail & Active Seeker engagement (Req 1)
    if (p.engagedSeekerIds && p.engagedSeekerIds.length > 0) {
      for (const seekerId of p.engagedSeekerIds) {
        const seeker = people.find(s => s.id === seekerId);
        if (seeker && seeker.isExternal) {
          ctx.beginPath();
          ctx.setLineDash([4, 4]);
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(seeker.x, seeker.y);
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)'; // Cyan evangelism tether
          ctx.lineWidth = 1.8;
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }

    if (p.isExternal && p.externalState === 'FOLLOWING' && p.contactWithId) {
      const guide = people.find(g => g.id === p.contactWithId);
      if (guide) {
        ctx.beginPath();
        ctx.setLineDash([3, 5]);
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(guide.x, guide.y);
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)'; // Cyan outreach thread
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    
    // 3. Shepherd / Leader Orbit trail
    if (!p.isExternal && !p.calling && p.movementState !== 'LEAVING') {
      let leader = null;
      if (p.caregiverId) {
        leader = people.find(g => g.id === p.caregiverId);
      } else {
        let bestLeader: Person | null = null;
        let bestScore = -1;
        for (const other of people) {
          if (other.communityId === p.communityId && other.id !== p.id && other.calling !== null) {
            const score = (other.generation === 0 ? 1000 : 0) + other.readiness;
            if (score > bestScore) {
              bestScore = score;
              bestLeader = other;
            }
          }
        }
        leader = bestLeader;
      }
      
      if (leader) {
        const d = Math.hypot(p.x - leader.x, p.y - leader.y);
        if (d < 150) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(leader.x, leader.y);
          // Very subtle gradient or solid line
          ctx.strokeStyle = p.caregiverId ? 'rgba(52, 211, 153, 0.15)' : 'rgba(255, 255, 255, 0.05)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    // TASK HK4-140: Shepherd Care Target Lines
    if (p.calling === 'SHEPHERD' && p.careTargets && p.careTargets.length > 0) {
      for (const targetId of p.careTargets) {
        const target = people.find(m => m.id === targetId);
        if (target) {
          ctx.beginPath();
          ctx.setLineDash([2, 4]);
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(target.x, target.y);
          ctx.strokeStyle = 'rgba(52, 211, 153, 0.28)'; // Soft emerald flock tether
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }
  }
  ctx.restore();
}

// Helper: Draw individual person circle node
function drawPersonNode(
  ctx: CanvasRenderingContext2D,
  p: Person,
  isSelected: boolean,
  isCardTargeting: boolean,
  time: number
) {
  ctx.save();

  const radius = p.isExternal ? 9 : 13;

  // VISUAL INVARIANT: WORD -> Person color depth
  // Low Depth = Pale translucent pastel
  // High Depth = Deep vibrant saturated color
  const depthFactor = p.depth / 100; // 0.0 to 1.0

  let baseHue = 215; // default calm slate/blue
  let baseSat = 30 + depthFactor * 65; // 30% -> 95%
  let baseLight = 70 - depthFactor * 25; // 70% (pale) -> 45% (deep/rich)

  if (p.calling) {
    if (p.calling === 'EVANGELIST') baseHue = 190;
    if (p.calling === 'SHEPHERD') baseHue = 150;
    if (p.calling === 'TEACHER') baseHue = 245;
    if (p.calling === 'INTERCESSOR') baseHue = 35;
    if (p.calling === 'WORSHIPPER') baseHue = 320;
    baseSat = 40 + depthFactor * 60;
  }

  if (p.isExternal) {
    baseHue = 210;
    baseSat = 15;
    baseLight = 35;
  }

  // If person has a need, gray them out and darken them based on how chronic it is
  if (p.need) {
    const needProg = 1 - (p.need.duration / p.need.maxDuration);
    baseSat = baseSat * (1 - needProg * 0.8); // Lose saturation
    baseLight = baseLight * (1 - needProg * 0.4); // Darken
  }

  // Node Color
  const fillColor = `hsl(${baseHue}, ${baseSat}%, ${baseLight}%)`;
  const strokeColor = isSelected
    ? '#38bdf8'
    : isCardTargeting
    ? '#f59e0b'
    : `hsl(${baseHue}, ${baseSat + 10}%, ${baseLight + 25}%)`;

  // Draw Generation Rings (G0 개척멤버, G1, G2, G3)
  if (!p.isExternal) {
    if (p.generation === 0) {
      // G0 Pioneer (개척멤버): Warm foundation amber halo
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius + 4, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius + 4, 0, Math.PI * 2);
      ctx.strokeStyle =
        p.generation === 3
          ? 'rgba(251, 191, 36, 0.95)' // G3 radiant gold
          : p.generation === 2
          ? 'rgba(167, 139, 250, 0.85)' // G2 purple disciple
          : 'rgba(255, 255, 255, 0.35)'; // G1 white ring
      ctx.lineWidth = p.generation === 3 ? 2.2 : 1.2;
      ctx.stroke();

      if (p.generation === 3) {
        // Shimmering aura for 3rd generation
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius + 7, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  // Visual cue for LEAVING / COOLING persons (Req 2)
  if (!p.isExternal && p.movementState === 'LEAVING') {
    ctx.save();
    if (p.beingHeldById) {
      // Shepherd is holding onto them: Warm Emerald/Gold embrace aura
      const pulse = 1 + Math.sin(time * 0.01) * 0.1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, (radius + 8) * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.95)';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Holding badge above head
      ctx.fillStyle = 'rgba(16, 185, 129, 0.95)';
      ctx.font = 'bold 9px "Plus Jakarta Sans", "Noto Sans KR", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('💚 목자의 돌봄 (회복 중)', p.x, p.y - radius - 14);
    } else {
      // Unheld cold member drifting out: Urgent Frost/Red warning ring
      const pulse = 1 + Math.sin(time * 0.015) * 0.18;
      ctx.beginPath();
      ctx.setLineDash([4, 3]);
      ctx.arc(p.x, p.y, (radius + 9) * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.95)';
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.setLineDash([]);

      // Urgent Leaving Countdown badge
      const timerSec = Math.max(0, Math.ceil(p.leavingTimer || 25));
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 9px "Plus Jakarta Sans", "Noto Sans KR", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`❄️ 이탈 위기 (${timerSec}s)`, p.x, p.y - radius - 14);

      // Mini timer bar
      const barW = 28;
      const barH = 3;
      const pct = (p.leavingTimer || 25) / 25;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(p.x - barW / 2, p.y - radius - 8, barW, barH);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(p.x - barW / 2, p.y - radius - 8, barW * Math.max(0, Math.min(1, pct)), barH);
    }
    ctx.restore();
  } else if (!p.isExternal && p.careStatus === 'UNCARED') {
    // Urgent dashed warning ring for uncared members
    const pulse = 1 + Math.sin(time * 0.008) * 0.15;
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([3, 3]);
    ctx.arc(p.x, p.y, (radius + 6) * pulse, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.85)'; // Rose-red warning
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.restore();
  }

  // Visual cue for External Seeker Evangelism Milestone Progress (Req 1)
  if (p.isExternal && p.contactProgress && p.contactProgress > 0 && p.externalState !== 'FOLLOWING') {
    const prog = p.contactProgress / 100;
    const stage = p.contactMilestoneStage || (prog > 0.66 ? 3 : prog > 0.33 ? 2 : 1);
    ctx.save();

    // Background track ring
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius + 4, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Progress arc
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * prog);
    ctx.strokeStyle = stage === 3 ? '#38bdf8' : stage === 2 ? '#67e8f9' : '#93c5fd';
    ctx.lineWidth = 3.0;
    ctx.stroke();

    // Milestone notches at 33% and 66%
    for (const tickProg of [0.33, 0.66]) {
      const angle = -Math.PI / 2 + Math.PI * 2 * tickProg;
      const tx1 = p.x + Math.cos(angle) * (radius + 2);
      const ty1 = p.y + Math.sin(angle) * (radius + 2);
      const tx2 = p.x + Math.cos(angle) * (radius + 6);
      const ty2 = p.y + Math.sin(angle) * (radius + 6);
      ctx.beginPath();
      ctx.moveTo(tx1, ty1);
      ctx.lineTo(tx2, ty2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    
    // Stage text indicator
    const stageLabel = stage === 1 ? '1단계 교제' : stage === 2 ? '2단계 마음열림' : '3단계 결신직전';
    ctx.fillStyle = stage === 3 ? '#38bdf8' : '#7dd3fc';
    ctx.font = 'bold 9px "Plus Jakarta Sans", "Noto Sans KR", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${stageLabel} (${Math.round(p.contactProgress)}%)`, p.x, p.y - radius - 10);
    ctx.restore();
  }

  // Visual cue for SHEPHERD: Pastoral care aura
  if (p.calling === 'SHEPHERD' && !p.isExternal) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius + 5, 0, Math.PI * 2);
    ctx.strokeStyle = p.isHoldingPersonId ? 'rgba(52, 211, 153, 0.95)' : 'rgba(52, 211, 153, 0.5)'; // Emerald care aura
    ctx.lineWidth = p.isHoldingPersonId ? 2.2 : 1.2;
    ctx.stroke();
    ctx.restore();
  }

  // Visual Feedback for Skills (Action Effects)
  if (p.visualEffect && p.visualEffect.timer > 0) {
    const vTimer = p.visualEffect.timer;
    const maxTimer = p.visualEffect.type === 'CARE' ? 6.0 : 3.0;
    const progress = 1 - (vTimer / maxTimer);
    const effectRadius = radius + 4 + progress * 25;
    const alpha = Math.max(0, (1 - progress) * 0.8);
    
    let effectColor = 'rgba(255, 255, 255, '; // Default
    if (p.visualEffect.type === 'CARE') effectColor = 'rgba(52, 211, 153, '; // Emerald
    if (p.visualEffect.type === 'WORD') effectColor = 'rgba(96, 165, 250, '; // Blue
    if (p.visualEffect.type === 'FELLOWSHIP') effectColor = 'rgba(251, 191, 36, '; // Amber
    if (p.visualEffect.type === 'PRAYER') effectColor = 'rgba(167, 139, 250, '; // Purple

    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, effectRadius, 0, Math.PI * 2);
    ctx.strokeStyle = effectColor + alpha + ')';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Inner filled glow
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius + 2 + progress * 10, 0, Math.PI * 2);
    ctx.fillStyle = effectColor + (alpha * 0.4) + ')';
    ctx.fill();

    // Draw Cross icon for CARE
    if (p.visualEffect.type === 'CARE') {
      const iconY = p.y - radius - 15 - (progress * 15);
      const iconAlpha = Math.max(0, Math.sin(progress * Math.PI)); // Fade in and out
      ctx.fillStyle = `rgba(255, 255, 255, ${iconAlpha})`;
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✚', p.x, iconY);
    }
    
    ctx.restore();
  }

  // Selected or Targeting pulsing glow
  if (isSelected) {
    const pulse = 1 + 0.1 * Math.sin(time * 0.005);
    const pulseRadius = (radius + 12) * pulse;

    // Glowing ring
    ctx.beginPath();
    ctx.arc(p.x, p.y, pulseRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.9)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Target crosshairs
    const cSize = pulseRadius + 4;
    const len = 6;
    ctx.beginPath();
    // Top Left
    ctx.moveTo(p.x - cSize, p.y - cSize + len);
    ctx.lineTo(p.x - cSize, p.y - cSize);
    ctx.lineTo(p.x - cSize + len, p.y - cSize);
    // Top Right
    ctx.moveTo(p.x + cSize - len, p.y - cSize);
    ctx.lineTo(p.x + cSize, p.y - cSize);
    ctx.lineTo(p.x + cSize, p.y - cSize + len);
    // Bottom Left
    ctx.moveTo(p.x - cSize, p.y + cSize - len);
    ctx.lineTo(p.x - cSize, p.y + cSize);
    ctx.lineTo(p.x - cSize + len, p.y + cSize);
    // Bottom Right
    ctx.moveTo(p.x + cSize - len, p.y + cSize);
    ctx.lineTo(p.x + cSize, p.y + cSize);
    ctx.lineTo(p.x + cSize, p.y + cSize - len);
    ctx.strokeStyle = 'rgba(56, 189, 248, 1)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Draw Main Circle Node
  ctx.beginPath();
  ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.lineWidth = isSelected ? 2.5 : 1.5;
  ctx.strokeStyle = strokeColor;
  ctx.stroke();

  // Draw Calling Icon inside / on node
  if (p.calling && !p.isExternal) {
    const symbol = CALLING_DEFINITIONS[p.calling].symbol;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol, p.x, p.y);
  }

  // Draw Need Signal Overlay
  if (p.need) {
    drawNeedSignal(ctx, p.x, p.y - radius - 10, p.need, time);
  }

  // Draw Name Text beneath node (Clean display typography)
  ctx.font = '500 11px "Plus Jakarta Sans", "Noto Sans KR", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = p.isExternal
    ? 'rgba(148, 163, 184, 0.7)'
    : isSelected
    ? '#ffffff'
    : 'rgba(226, 232, 240, 0.9)';
  ctx.fillText(p.name, p.x, p.y + radius + 12);

  ctx.restore();
}

// Helper: Need signal graphics
function drawNeedSignal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  need: PersonNeed,
  time: number
) {
  ctx.save();
  const type = need.type;
  const progress = 1 - (need.duration / need.maxDuration);
  
  // Shake effect when chronic (> 70%)
  const isChronic = progress > 0.7;
  const shakeX = isChronic ? (Math.random() * 2 - 1) * 2 : 0;
  const shakeY = isChronic ? (Math.random() * 2 - 1) * 2 : 0;
  const bob = Math.sin(time * 0.005) * 2;

  const nx = x + shakeX;
  const ny = y + bob + shakeY;

  switch (type) {
    case 'QUESTION':
      ctx.fillStyle = isChronic ? '#818cf8' : '#6366f1';
      ctx.beginPath();
      ctx.arc(nx, ny, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', nx, ny);
      break;

    case 'NEWCOMER':
      ctx.strokeStyle = isChronic ? '#fcd34d' : '#fbbf24';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(nx, ny, 8 + Math.sin(time * 0.008) * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = isChronic ? '#fbbf24' : '#f59e0b';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★', nx, ny);
      break;

    case 'WEARY':
      ctx.fillStyle = isChronic ? '#fb923c' : '#f97316';
      ctx.beginPath();
      ctx.arc(nx, ny, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('z', nx, ny);
      break;

    case 'TENSION':
      ctx.fillStyle = isChronic ? '#f87171' : '#ef4444';
      ctx.beginPath();
      ctx.arc(nx, ny, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', nx, ny);
      break;

    case 'READY':
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(nx, ny, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#34d399';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('▲', nx, ny);
      break;
  }
  ctx.restore();
}

// Helper: Draw visual blessing particle
function drawParticle(ctx: CanvasRenderingContext2D, pt: Particle, time: number) {
  ctx.save();
  
  // Easing function for smooth curve
  const easeProgress = 1 - Math.pow(1 - pt.progress, 3);
  
  // Path math: Bezier curve for organic arc
  const dx = pt.targetX - pt.sourceX;
  const dy = pt.targetY - pt.sourceY;
  
  // Arch height based on distance
  const dist = Math.sqrt(dx * dx + dy * dy);
  const archHeight = Math.min(60, dist * 0.4);
  
  // Normal vector for arch
  const nx = -dy / dist;
  const ny = dx / dist;
  
  // Control point
  const cx = pt.sourceX + dx * 0.5 + nx * archHeight;
  const cy = pt.sourceY + dy * 0.5 + ny * archHeight;
  
  // Current position via Quadratic Bezier
  const t = easeProgress;
  const mt = 1 - t;
  const x = mt * mt * pt.sourceX + 2 * mt * t * cx + t * t * pt.targetX;
  const y = mt * mt * pt.sourceY + 2 * mt * t * cy + t * t * pt.targetY;
  
  // Pulse & fading
  const alpha = 1 - Math.pow(t, 4); // Fades out at the very end
  const radius = 3 + Math.sin(time * 0.01 + pt.id.charCodeAt(0)) * 1.5;
  
  // Glow effect
  ctx.shadowBlur = 12;
  ctx.shadowColor = '#fbbf24'; // amber-400
  
  ctx.fillStyle = `rgba(253, 230, 138, ${alpha})`; // amber-200
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  
  // Secondary core
  ctx.shadowBlur = 0;
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.5, 0, Math.PI * 2);
  ctx.fill();

  // Trail
  ctx.beginPath();
  ctx.moveTo(x, y);
  const trailT = Math.max(0, t - 0.15);
  const trailMt = 1 - trailT;
  const tx = trailMt * trailMt * pt.sourceX + 2 * trailMt * trailT * cx + trailT * trailT * pt.targetX;
  const ty = trailMt * trailMt * pt.sourceY + 2 * trailMt * trailT * cy + trailT * trailT * pt.targetY;
  ctx.lineTo(tx, ty);
  ctx.strokeStyle = `rgba(253, 230, 138, ${alpha * 0.5})`;
  ctx.lineWidth = 2;
  ctx.stroke();
  
  ctx.restore();
}
