/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameEngine } from '../simulation/engine';
import { drawOrganicBlob } from '../simulation/communityBlob';
import { CALLING_DEFINITIONS } from '../data/callings';
import { Person, NeedType, Community } from '../types';
import { Cross, Plus, Minus, Focus } from 'lucide-react';

interface SimulationCanvasProps {
  engine: GameEngine;
  onSelectPerson: (person: Person | null) => void;
  selectedPersonId: string | null;
  activeCardId: string | null;
  onApplyCardOnPerson?: (targetPersonId: string) => void;
}

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({
  engine,
  onSelectPerson,
  selectedPersonId,
  activeCardId,
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

    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 50 && height > 50) {
          const w = Math.floor(width);
          const h = Math.floor(height);
          setDimensions({ width: w, height: h });
          engine.setWorldDimensions(w, h);

          // Center camera directly on the primary community
          const primaryComm = engine.state.communities[0];
          if (primaryComm) {
            const cam = cameraRef.current;
            cam.targetX = primaryComm.centerX;
            cam.targetY = primaryComm.centerY;
            if (!cam.isInitialized) {
              cam.x = primaryComm.centerX;
              cam.y = primaryComm.centerY;
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

      // Draw Organic Community Blobs
      for (const comm of engine.state.communities) {
        drawOrganicBlob(ctx, comm, comm.hullPoints);

        // Community Title / Banner in serif
        ctx.save();
        ctx.font = '600 13px "Cinzel", "Playfair Display", Georgia, serif';
        ctx.fillStyle = '#F5F5F5';
        ctx.textAlign = 'center';
        ctx.fillText(comm.name, comm.centerX, comm.centerY - comm.currentRadius - 16);

        // Safe Capacity indicator badge in mono
        ctx.font = '500 10px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillText(
          `성도 ${comm.stats.population}명 · 은혜의 품 ${comm.stats.safeCapacity}명`,
          comm.centerX,
          comm.centerY - comm.currentRadius - 3
        );
        ctx.restore();
      }

      // Draw Outreach & Relationship connections (Open Doors / Following paths)
      drawRelationshipTrails(ctx, engine.state.people);

      // Draw Person Nodes
      for (const p of engine.state.people) {
        drawPersonNode(ctx, p, p.id === selectedPersonId, !!activeCardId, time);
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

      if (activeCardId && clickedPerson && onApplyCardOnPerson) {
        onApplyCardOnPerson(clickedPerson.id);
        return;
      }

      onSelectPerson(clickedPerson);
    },
    [engine, activeCardId, onApplyCardOnPerson, onSelectPerson, screenToWorld]
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
      {activeCardId && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-black font-mono font-bold px-5 py-1.5 rounded-sm border border-amber-300 text-xs shadow-[0_0_20px_rgba(251,191,36,0.35)] pointer-events-none animate-pulse z-20">
          지체를 탭하여 카드를 적용하세요
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

      {/* Floating Geometric Balance Status Pill */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-5 py-1.5 rounded-full border border-white/20 flex gap-3 sm:gap-5 items-center pointer-events-none shadow-lg text-xs z-10">
        <span className="text-[10px] text-white/40 uppercase tracking-widest font-mono">
          살아있는 성소
        </span>
        <div className="h-3 w-px bg-white/10" />
        <span className="text-[11px] font-mono text-amber-200">
          목회적 시선 회복: {Math.max(0, 8 - (engine.state.attentionTimer % 8)).toFixed(1)}초
        </span>
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

// Helper: Relationship & Open Door connection paths
function drawRelationshipTrails(ctx: CanvasRenderingContext2D, people: Person[]) {
  ctx.save();
  for (const p of people) {
    if (p.isExternal && p.externalState === 'FOLLOWING' && p.contactWithId) {
      const guide = people.find(g => g.id === p.contactWithId);
      if (guide) {
        ctx.beginPath();
        ctx.setLineDash([3, 5]);
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(guide.x, guide.y);
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)'; // Cyan outreach thread
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.setLineDash([]);
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

  // Node Color
  const fillColor = `hsl(${baseHue}, ${baseSat}%, ${baseLight}%)`;
  const strokeColor = isSelected
    ? '#38bdf8'
    : isCardTargeting
    ? '#f59e0b'
    : `hsl(${baseHue}, ${baseSat + 10}%, ${baseLight + 25}%)`;

  // Draw Generation Rings (G1, G2, G3)
  if (p.generation > 0 && !p.isExternal) {
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

  // Selected or Targeting pulsing glow
  if (isSelected) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius + 8, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
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
    drawNeedSignal(ctx, p.x, p.y - radius - 10, p.need.type, time);
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
  type: NeedType,
  time: number
) {
  ctx.save();
  const bob = Math.sin(time * 0.005) * 2;

  switch (type) {
    case 'QUESTION':
      ctx.fillStyle = '#6366f1';
      ctx.beginPath();
      ctx.arc(x, y + bob, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', x, y + bob);
      break;

    case 'NEWCOMER':
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y + bob, 8 + Math.sin(time * 0.008) * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#f59e0b';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★', x, y + bob);
      break;

    case 'WEARY':
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(x, y + bob, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('z', x, y + bob);
      break;

    case 'TENSION':
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(x, y + bob, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', x, y + bob);
      break;

    case 'READY':
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(x, y + bob, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#34d399';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('▲', x, y + bob);
      break;
  }
  ctx.restore();
}
