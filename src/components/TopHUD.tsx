/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameEngine } from '../simulation/engine';
import { soundEngine } from '../simulation/sound';
import { toStep10 } from '../utils/faithTerms';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Clock,
  BookOpen,
  Heart,
  Sparkles,
  Flame,
  Compass,
  HelpCircle,
} from 'lucide-react';

interface TopHUDProps {
  engine: GameEngine;
  onOpenGuide: () => void;
  onTriggerRelease: () => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
}

export const TopHUD: React.FC<TopHUDProps> = ({
  engine,
  onOpenGuide,
  onTriggerRelease,
  isMuted,
  setIsMuted,
}) => {
  const { timeElapsed, isPaused, gameSpeed, isReleaseActive, communities, people } = engine.state;

  // Format time MM:SS
  const minutes = Math.floor(timeElapsed / 60);
  const seconds = Math.floor(timeElapsed % 60);
  const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // Current Ministry Phase in Faith Terms
  let phaseName = '생명의 씨앗 (개척)';
  if (timeElapsed >= 90 && timeElapsed < 210) phaseName = '지체의 모임 (교제)';
  else if (timeElapsed >= 210 && timeElapsed < 360) phaseName = '말씀 양육 (제자도)';
  else if (timeElapsed >= 360 && timeElapsed < 540) phaseName = '지경의 확장 (파송)';
  else if (timeElapsed >= 540) phaseName = '성령께 맡겨드림 (손 놓음)';

  // Primary Community
  const primaryComm = communities[0] || null;

  // Global aggregate stats
  const activeMembers = people.filter(p => !p.isExternal).length;
  const wordAvg = primaryComm ? primaryComm.stats.formation : 60;
  const careAvg = primaryComm ? primaryComm.stats.care : 60;
  const worshipAvg = primaryComm ? primaryComm.stats.clarity : 60;
  const prayerAvg = primaryComm ? primaryComm.stats.resilience : 60;
  const missionAvg = primaryComm ? primaryComm.stats.mission : 60;

  const kingdomHealthRaw = Math.round((wordAvg + careAvg + worshipAvg + prayerAvg + missionAvg) / 5);
  const healthStep = toStep10(kingdomHealthRaw);

  const toggleSound = () => {
    const nextMute = soundEngine.toggleMute();
    setIsMuted(nextMute);
  };

  const togglePause = () => {
    engine.state.isPaused = !engine.state.isPaused;
  };

  const toggleSpeed = () => {
    engine.state.gameSpeed = engine.state.gameSpeed === 1 ? 2 : 1;
  };

  return (
    <header
      id="top-hud"
      className="relative z-30 w-full bg-[#121212] border-b border-white/10 px-4 py-2.5 text-[#F5F5F5]"
    >
      <div className="max-w-7xl mx-auto flex flex-col gap-2">
        {/* Row 1: Brand & Covenant Status & Playback Controls */}
        <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
          {/* Brand & Covenant Info */}
          <div className="flex items-center gap-4 sm:gap-6">
            <div>
              <h1 className="text-lg sm:text-xl font-serif tracking-tighter text-[#F5F5F5] leading-none">
                HIS KINGDOM
              </h1>
              <p className="text-[9px] uppercase tracking-[0.25em] text-amber-300/80 font-medium mt-0.5">
                생명의 공동체 시뮬레이션
              </p>
            </div>

            <div className="h-8 w-px bg-white/10 hidden xs:block" />

            <div className="hidden xs:flex flex-col">
              <span className="text-[9px] uppercase tracking-widest text-white/40 font-bold">
                사역의 흐름
              </span>
              <span className="text-xs sm:text-sm font-serif italic text-amber-200 leading-tight">
                {phaseName}
              </span>
            </div>
          </div>

          {/* Center: Time Countdown */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1 rounded-full text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className={isReleaseActive ? 'text-rose-400 font-bold animate-pulse' : 'text-[#F5F5F5]'}>
              {timeStr} <span className="text-white/30 text-[10px]">/ 09:30</span>
            </span>
          </div>

          {/* Right Controls: Release Test, Speed, Pause, Sound, Guide */}
          <div className="flex items-center gap-1.5">
            {!isReleaseActive && timeElapsed < 540 && (
              <button
                id="btn-trigger-release"
                onClick={onTriggerRelease}
                className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-sm transition-colors cursor-pointer"
                title="지금 손을 놓아 성령 안에서 교회가 스스로 움직이는 생명력을 지켜봅니다"
              >
                손을 놓음 (시험)
              </button>
            )}

            <button
              id="btn-speed-toggle"
              onClick={toggleSpeed}
              className={`px-2 py-1 text-xs font-mono font-semibold rounded-sm border transition-colors cursor-pointer ${
                gameSpeed === 2
                  ? 'bg-amber-400/20 text-amber-200 border-amber-400/40'
                  : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
              }`}
            >
              {gameSpeed}x 배속
            </button>

            <button
              id="btn-pause-toggle"
              onClick={togglePause}
              className="p-1.5 rounded-sm bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 transition-colors cursor-pointer"
              title={isPaused ? '재개' : '일시정지'}
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>

            <button
              id="btn-sound-toggle"
              onClick={toggleSound}
              className="p-1.5 rounded-sm bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 transition-colors cursor-pointer"
              title={isMuted ? '음소거 해제' : '음향 켜기'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>

            <button
              id="btn-guide"
              onClick={onOpenGuide}
              className="p-1.5 rounded-sm bg-white/5 hover:bg-white/10 text-amber-200 border border-white/10 transition-colors cursor-pointer"
              title="원리 가이드 보기"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Row 2: Harmony (Health 1~10) & 5 Core Spiritual Pillars in 1~10 Step Scale */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/10 text-xs">
          {/* Harmony / Health Gauge (1~10 Scale) */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-widest text-white/40 font-bold">
                몸의 건강도
              </span>
              <div className="flex items-center gap-2">
                <div className="w-20 sm:w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-300"
                    style={{ width: `${healthStep * 10}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-emerald-400 font-bold">
                  {healthStep}단계
                </span>
              </div>
            </div>

            <div className="h-6 w-px bg-white/10 hidden sm:block" />

            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-widest text-white/40 font-bold">
                함께하는 지체
              </span>
              <span className="text-xs font-mono text-[#F5F5F5]">
                {activeMembers} <span className="text-white/40 text-[10px]">명</span>
              </span>
            </div>
          </div>

          {/* 5 Pillars (WORD, CARE, WORSHIP, PRAYER, MISSION) in 1~10 Scale */}
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar">
            {/* WORD */}
            <div
              className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2 py-0.5 rounded-sm"
              title="말씀: 성도색 농도가 아니라 복음의 농도가 깊어짐을 의미합니다 (1~10단계)"
            >
              <BookOpen className="w-3 h-3 text-indigo-400 shrink-0" />
              <span className="text-[11px] text-white/70">말씀</span>
              <span className="font-mono text-xs text-indigo-300 font-bold">{toStep10(wordAvg)}단계</span>
            </div>

            {/* CARE */}
            <div
              className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2 py-0.5 rounded-sm"
              title="돌봄: 사랑의 교제로 연약한 자를 품고 안정시킵니다 (1~10단계)"
            >
              <Heart className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="text-[11px] text-white/70">돌봄</span>
              <span className="font-mono text-xs text-emerald-300 font-bold">{toStep10(careAvg)}단계</span>
            </div>

            {/* WORSHIP */}
            <div
              className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2 py-0.5 rounded-sm"
              title="예배: 주를 향한 경배로 임재의 감격이 뚜렷해집니다 (1~10단계)"
            >
              <Sparkles className="w-3 h-3 text-pink-400 shrink-0" />
              <span className="text-[11px] text-white/70">예배</span>
              <span className="font-mono text-xs text-pink-300 font-bold">{toStep10(worshipAvg)}단계</span>
            </div>

            {/* PRAYER */}
            <div
              className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2 py-0.5 rounded-sm"
              title="기도: 시험을 이기며 영혼을 품는 은혜의 품과 회복력입니다 (1~10단계)"
            >
              <Flame className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="text-[11px] text-white/70">기도</span>
              <span className="font-mono text-xs text-amber-300 font-bold">{toStep10(prayerAvg)}단계</span>
            </div>

            {/* MISSION */}
            <div
              className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2 py-0.5 rounded-sm"
              title="전도: 잃은 양을 찾아 세상으로 나아가는 선교적 열정입니다 (1~10단계)"
            >
              <Compass className="w-3 h-3 text-cyan-400 shrink-0" />
              <span className="text-[11px] text-white/70">전도</span>
              <span className="font-mono text-xs text-cyan-300 font-bold">{toStep10(missionAvg)}단계</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
