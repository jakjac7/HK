/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MapId } from '../types';
import {
  Compass,
  Volume2,
  VolumeX,
  Play,
  HelpCircle,
  Building2,
  GraduationCap,
  Trees,
} from 'lucide-react';
import { soundEngine } from '../simulation/sound';

interface TitleScreenProps {
  onStartGame: (mapId: MapId) => void;
  onOpenGuide: () => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  onOpenGuide,
  isMuted,
  setIsMuted,
}) => {
  const [selectedMap, setSelectedMap] = useState<MapId>('CAMPUS');

  const mapOptions = [
    {
      id: 'CAMPUS' as MapId,
      name: '캠퍼스',
      sub: '청년 대학가',
      tag: '말씀 양육 (ROOT)',
      icon: GraduationCap,
      accent: 'border-violet-400 bg-violet-950/30 text-violet-200',
    },
    {
      id: 'DOWNTOWN' as MapId,
      name: '도심지',
      sub: '오피스 & 상업',
      tag: '치유 심방 (CARE)',
      icon: Building2,
      accent: 'border-rose-400 bg-rose-950/30 text-rose-200',
    },
    {
      id: 'COUNTRYSIDE' as MapId,
      name: '농어촌',
      sub: '전통 마을',
      tag: '선교적 야성 (GO)',
      icon: Trees,
      accent: 'border-emerald-400 bg-emerald-950/30 text-emerald-200',
    },
  ];

  const handleStart = () => {
    soundEngine.playChime();
    onStartGame(selectedMap);
  };

  const handleToggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundEngine.toggleMute(next);
  };

  return (
    <div
      id="title-screen-container"
      className="fixed inset-0 w-full h-[100dvh] overflow-hidden bg-[#0A0D14] text-[#F5F5F5] select-none flex flex-col justify-between p-3 sm:p-6"
    >
      {/* Background Ambience / Subtle Grid Pattern */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-slate-950/80 to-[#0A0D14] z-0" />
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:32px_32px] z-0" />

      {/* Top Header Navigation */}
      <header className="relative z-10 w-full max-w-4xl mx-auto flex justify-between items-center pb-2.5 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-sm bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-bold text-xs shadow-sm">
            ✝
          </div>
          <span className="font-mono text-xs text-amber-400 tracking-wider uppercase font-bold">
            HIS KINGDOM
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handleToggleSound}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-sm transition-colors cursor-pointer"
          >
            {isMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                <span>음소거</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>음향</span>
              </>
            )}
          </button>

          <button
            onClick={onOpenGuide}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-sm transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>원리 안내</span>
          </button>
        </div>
      </header>

      {/* Main Center Stage (Simple, Clean, Focused) */}
      <main className="relative z-10 w-full max-w-2xl mx-auto my-auto py-3 sm:py-6 flex flex-col items-center gap-4 sm:gap-6 text-center">
        {/* Title Hero */}
        <div className="flex flex-col items-center gap-1.5">
          <h1 className="text-3xl sm:text-5xl font-serif font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-[#FFF7ED] via-[#FED7AA] to-[#F59E0B] drop-shadow-sm">
            그의 나라
          </h1>
          <p className="font-mono text-[11px] sm:text-xs text-amber-400/80 tracking-widest uppercase">
            ORGANIC CHURCH PLANTING MOVEMENT
          </p>

          <p className="text-xs sm:text-sm text-amber-100/75 font-serif italic mt-1.5 leading-relaxed">
            “내가 이 반석 위에 내 교회를 세우리니 음부의 권세가 이기지 못하리라”
            <span className="block text-[11px] font-sans text-white/40 not-italic mt-0.5">
              — 마태복음 16장 18절
            </span>
          </p>
        </div>

        {/* Mission Field Selection (Map) - Simple 3 options */}
        <div className="w-full flex flex-col items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-mono text-white/50 uppercase tracking-wider">
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            <span>선교지 선택</span>
          </div>

          <div className="w-full grid grid-cols-3 gap-2.5 sm:gap-3 text-left">
            {mapOptions.map(opt => {
              const Icon = opt.icon;
              const isSelected = selectedMap === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => setSelectedMap(opt.id)}
                  className={`p-3 sm:p-3.5 rounded-sm border cursor-pointer transition-all flex flex-col justify-between gap-2.5 ${
                    isSelected
                      ? `${opt.accent} border-2 shadow-[0_0_15px_rgba(251,191,36,0.15)] ring-1 ring-amber-400/50`
                      : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon className="w-4 h-4 text-amber-400" />
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24]" />
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-xs sm:text-sm text-[#F5F5F5]">
                      {opt.name}
                    </h3>
                    <span className="text-[11px] text-white/50 font-sans">
                      {opt.sub}
                    </span>
                  </div>

                  <span className="inline-block text-[10px] font-mono text-amber-300/90 truncate">
                    {opt.tag}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Start Button */}
        <div className="flex flex-col items-center gap-2 pt-1">
          <button
            id="btn-start-game"
            onClick={handleStart}
            className="group relative px-8 py-3 rounded-sm bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 text-slate-950 font-bold text-sm sm:text-base font-mono uppercase tracking-wider shadow-[0_0_25px_rgba(251,191,36,0.3)] hover:shadow-[0_0_35px_rgba(251,191,36,0.5)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2.5 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-slate-950 text-slate-950 transition-transform group-hover:translate-x-0.5" />
            <span>사역 시작</span>
          </button>
        </div>
      </main>

      {/* Footer copyright */}
      <footer className="relative z-10 w-full max-w-4xl mx-auto text-center py-2 border-t border-white/10 text-[11px] text-white/40 font-mono shrink-0">
        HIS KINGDOM · Organic Church Planting Simulation
      </footer>
    </div>
  );
};
