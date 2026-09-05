/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameEngine } from '../simulation/engine';
import { Sparkles, Eye } from 'lucide-react';

interface ReleaseOverlayProps {
  engine: GameEngine;
}

export const ReleaseOverlay: React.FC<ReleaseOverlayProps> = ({ engine }) => {
  const { isReleaseActive, timeElapsed, events } = engine.state;
  if (!isReleaseActive) return null;

  const secondsRemaining = Math.max(0, 600 - Math.floor(timeElapsed));

  // Recent 3 autonomous events
  const recentEvents = events.slice(0, 3);

  return (
    <div
      id="release-overlay"
      className="pointer-events-none absolute inset-0 z-40 flex flex-col justify-between p-4 bg-gradient-to-b from-black/60 via-transparent to-black/80 animate-in fade-in duration-500"
    >
      {/* Top Banner */}
      <div className="max-w-xl mx-auto w-full bg-[#121212]/90 border border-amber-400/40 border-l-4 rounded-sm p-4 text-center shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-widest font-mono">
          <Sparkles className="w-4 h-4 animate-spin text-amber-400" />
          <span>09:00 성령께 온전히 맡겨드림</span>
          <span className="text-white/40 font-mono">({secondsRemaining}초 남음)</span>
        </div>
        <p className="text-xs text-[#F5F5F5] mt-1.5 font-serif font-medium">
          "사람이 인위적으로 조종하지 않아도 주님의 몸 된 교회는 성령 안에서 스스로 살아서 움직입니다."
        </p>
        <p className="text-[11px] text-white/50 mt-1 font-mono">
          인위적 개입 정지 · 성령의 자율적 역사 관찰 중
        </p>
      </div>

      {/* Bottom Live Autonomous Feed */}
      <div className="max-w-xl mx-auto w-full flex flex-col gap-1.5 mb-16">
        <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold text-amber-200 uppercase tracking-wider">
          <Eye className="w-3.5 h-3.5" />
          <span>자율적 사역 관찰 피드</span>
        </div>
        <div className="flex flex-col gap-1">
          {recentEvents.map(ev => (
            <div
              key={ev.id}
              className="text-xs bg-[#121212]/90 border border-white/10 rounded-sm px-3 py-1.5 text-white/80 backdrop-blur-md shadow font-sans"
            >
              <span className="text-amber-400 mr-1.5 font-mono">✦</span>
              {ev.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
