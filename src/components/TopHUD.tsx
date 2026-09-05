/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameEngine } from '../simulation/engine';
import { soundEngine } from '../simulation/sound';
import { toStep10 } from '../utils/faithTerms';
import { MapId } from '../types';
import { MAP_PROFILES } from '../config/maps';
import { Tooltip } from './Tooltip';
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
  MapPin,
  Users,
  ShieldCheck,
  AlertTriangle,
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
  const { timeElapsed, isPaused, gameSpeed, isReleaseActive, communities, people, mapId } =
    engine.state;

  const minutes = Math.floor(timeElapsed / 60);
  const seconds = Math.floor(timeElapsed % 60);
  const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  let phaseShort = '개척';
  let phaseFull = '생명의 씨앗 (개척)';
  let phaseDesc = '성도들과의 인격적 만남과 복음의 기초를 세우는 시기입니다.';
  if (timeElapsed >= 90 && timeElapsed < 210) {
    phaseShort = '교제';
    phaseFull = '지체의 모임 (교제)';
    phaseDesc = '식탁을 나누고 서로를 알아가며 유기적 사랑의 결속을 다집니다.';
  } else if (timeElapsed >= 210 && timeElapsed < 360) {
    phaseShort = '제자도';
    phaseFull = '말씀 양육 (제자도)';
    phaseDesc = '말씀으로 사역자를 양육하고 은사와 부르심을 발견하게 합니다.';
  } else if (timeElapsed >= 360 && timeElapsed < 540) {
    phaseShort = '파송';
    phaseFull = '지경의 확장 (파송)';
    phaseDesc = '성숙한 제자를 세워 또 다른 선교지로 분립 개척을 준비합니다.';
  } else if (timeElapsed >= 540) {
    phaseShort = '손놓음';
    phaseFull = '성령께 온전히 맡겨드림 (손 놓음)';
    phaseDesc = '인위적 개입을 멈추고 교회가 자생하는 자율 생명력을 지켜봅니다.';
  }

  const primaryComm = communities[0] || null;

  // Aggregate stats across communities
  const activeMembers = people.filter(p => !p.isExternal).length;
  const wordAvg = primaryComm ? primaryComm.stats.formation : 60;
  const careAvg = primaryComm ? primaryComm.stats.care : 60;
  const worshipAvg = primaryComm ? primaryComm.stats.clarity : 60;
  const prayerAvg = primaryComm ? primaryComm.stats.resilience : 60;
  const missionAvg = primaryComm ? primaryComm.stats.mission : 60;

  const careCapacityTotal = communities.reduce((acc, c) => acc + (c.stats.careCapacity || 8), 0);
  const careGapTotal = Math.max(0, activeMembers - careCapacityTotal);

  const kingdomHealthRaw = Math.round(
    (wordAvg + careAvg + worshipAvg + prayerAvg + missionAvg) / 5
  );
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

  const currentMap = MAP_PROFILES[mapId] || MAP_PROFILES.CAMPUS;

  return (
    <header
      id="top-hud"
      className="relative z-30 w-full bg-[#121212]/95 backdrop-blur-md border-b border-white/10 px-3 py-1.5 text-[#F5F5F5] select-none"
    >
      <div className="w-full flex flex-wrap items-center justify-between gap-y-2 gap-x-1">
        {/* Left Section: Brand, Phase Badge, Map, Time */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Tooltip
            content={
              <div>
                <p className="font-serif font-bold text-amber-300">HIS KINGDOM</p>
                <p className="text-white/70">생명의 공동체 시뮬레이션 (자생적 교회 개척)</p>
              </div>
            }
          >
            <div className="flex items-center gap-1.5 cursor-help">
              <h1 className="text-sm font-serif font-bold tracking-tight text-[#F5F5F5]">
                HIS KINGDOM
              </h1>
            </div>
          </Tooltip>

          {/* Ministry Phase Badge */}
          <Tooltip
            content={
              <div>
                <p className="font-bold text-amber-300">사역 단계: {phaseFull}</p>
                <p className="text-white/70 mt-0.5">{phaseDesc}</p>
              </div>
            }
          >
            <span className="cursor-help px-2 py-0.5 rounded-full text-[10px] font-serif font-semibold bg-amber-400/15 text-amber-300 border border-amber-400/30 tracking-tight">
              {phaseShort}
            </span>
          </Tooltip>

          {/* Map Selector */}
          <Tooltip
            content={
              <div>
                <p className="font-bold text-amber-300">선교 환경: {currentMap.name}</p>
                <p className="text-white/70 mt-0.5">{currentMap.description}</p>
                <p className="text-amber-200/80 text-[10px] mt-0.5">
                  새가족 유입 배율: {currentMap.newcomerRate}x
                </p>
              </div>
            }
          >
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 px-2 py-0.5 rounded-sm text-[11px] cursor-help transition-colors">
              <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="text-[11px] text-white/90 font-sans pr-1">
                {currentMap.name}
              </span>
            </div>
          </Tooltip>

          {/* Countdown Timer */}
          <Tooltip
            content={
              <div>
                <p className="font-bold text-amber-300">사역 경과 시간: {timeStr}</p>
                <p className="text-white/70 mt-0.5">
                  09:30에 성령께 온전히 맡겨드리는 자율 시험이 진행됩니다.
                </p>
              </div>
            }
          >
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full text-[11px] font-mono cursor-help">
              <Clock className="w-3 h-3 text-amber-400 shrink-0" />
              <span
                className={
                  isReleaseActive ? 'text-rose-400 font-bold animate-pulse' : 'text-[#F5F5F5]'
                }
              >
                {timeStr}
              </span>
            </div>
          </Tooltip>
        </div>

        {/* Center Section: Core Indicators (Health, People, 5 Pillars) with Tooltips */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5">
          {/* Health Indicator Chip */}
          <Tooltip
            content={
              <div>
                <p className="font-bold text-emerald-400">몸의 건강도: {healthStep} / 10단계</p>
                <p className="text-white/70 mt-0.5">
                  말씀, 돌봄, 예배, 기도, 선교 5대 기둥의 총체적 영적 조화입니다.
                </p>
              </div>
            }
          >
            <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-sm cursor-help">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-[10px] text-emerald-300 font-mono font-bold">
                {healthStep}단계
              </span>
            </div>
          </Tooltip>

          {/* People & Care Capacity Chip */}
          <Tooltip
            content={
              <div>
                <p className="font-bold text-amber-300">
                  성도 현황: {activeMembers}명 / 돌봄 수용력: {careCapacityTotal}명
                </p>
                <p className="text-white/70 mt-0.5">
                  {careGapTotal > 0
                    ? `⚠️ 돌봄 공백 ${careGapTotal}명 발생! 목자의 심방이나 일꾼 육성이 시급합니다.`
                    : '✅ 모든 지체가 안전하게 사랑의 돌봄을 받고 있습니다.'}
                </p>
              </div>
            }
          >
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-sm border cursor-help ${
                careGapTotal > 0
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 animate-pulse'
                  : 'bg-white/5 border-white/10 text-white/90'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-[10px] font-mono font-bold">
                {activeMembers}/{careCapacityTotal}
              </span>
              {careGapTotal > 0 && (
                <span className="text-[9px] bg-rose-500 text-white px-1 rounded-xs font-mono font-bold">
                  !{careGapTotal}
                </span>
              )}
            </div>
          </Tooltip>

          <div className="h-4 w-px bg-white/15 hidden md:block" />

          {/* 5 Pillars (Icon + Number Chip) */}
          {/* WORD: 말씀 / 복음의 농도 */}
          <Tooltip
            content={
              <div>
                <p className="font-bold text-indigo-300">
                  복음의 농도: {toStep10(wordAvg)} / 10단계
                </p>
                <p className="text-white/70 mt-0.5">
                  십자가 복음이 심령에 뿌리내려 미혹과 이단을 분별하는 말씀의 깊이입니다.
                </p>
              </div>
            }
          >
            <div className="flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 px-1.5 py-0.5 rounded-sm cursor-help transition-colors">
              <BookOpen className="w-3 h-3 text-indigo-400 shrink-0" />
              <span className="text-[10px] font-mono font-bold text-indigo-300">
                {toStep10(wordAvg)}
              </span>
            </div>
          </Tooltip>

          {/* CARE: 사랑의 정착 / 돌봄 */}
          <Tooltip
            content={
              <div>
                <p className="font-bold text-emerald-300">
                  사랑의 정착: {toStep10(careAvg)} / 10단계
                </p>
                <p className="text-white/70 mt-0.5">
                  목자의 온유한 심방과 섬김으로 외곽의 영혼이 공동체에 안착한 정도입니다.
                </p>
              </div>
            }
          >
            <div className="flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 px-1.5 py-0.5 rounded-sm cursor-help transition-colors">
              <Heart className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="text-[10px] font-mono font-bold text-emerald-300">
                {toStep10(careAvg)}
              </span>
            </div>
          </Tooltip>

          {/* WORSHIP: 거룩한 임재 / 예배 */}
          <Tooltip
            content={
              <div>
                <p className="font-bold text-pink-300">
                  거룩한 임재: {toStep10(worshipAvg)} / 10단계
                </p>
                <p className="text-white/70 mt-0.5">
                  온전한 예배 가운데 부어지는 하나님의 임재와 영적 질서, 일치입니다.
                </p>
              </div>
            }
          >
            <div className="flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 px-1.5 py-0.5 rounded-sm cursor-help transition-colors">
              <Sparkles className="w-3 h-3 text-pink-400 shrink-0" />
              <span className="text-[10px] font-mono font-bold text-pink-300">
                {toStep10(worshipAvg)}
              </span>
            </div>
          </Tooltip>

          {/* PRAYER: 은혜의 품 / 기도 회복 */}
          <Tooltip
            content={
              <div>
                <p className="font-bold text-amber-300">
                  은혜의 품: {toStep10(prayerAvg)} / 10단계
                </p>
                <p className="text-white/70 mt-0.5">
                  합심 기도와 중보를 통해 영적 지침(Burnout)을 치유하고 시험을 방어합니다.
                </p>
              </div>
            }
          >
            <div className="flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 px-1.5 py-0.5 rounded-sm cursor-help transition-colors">
              <Flame className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="text-[10px] font-mono font-bold text-amber-300">
                {toStep10(prayerAvg)}
              </span>
            </div>
          </Tooltip>

          {/* MISSION: 잃은 양 / 선교 */}
          <Tooltip
            content={
              <div>
                <p className="font-bold text-cyan-300">
                  잃은 양 품음: {toStep10(missionAvg)} / 10단계
                </p>
                <p className="text-white/70 mt-0.5">
                  세상 밖으로 담장을 넘어 잃어버린 영혼들을 품는 복음 증거의 열정입니다.
                </p>
              </div>
            }
          >
            <div className="flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 px-1.5 py-0.5 rounded-sm cursor-help transition-colors">
              <Compass className="w-3 h-3 text-cyan-400 shrink-0" />
              <span className="text-[10px] font-mono font-bold text-cyan-300">
                {toStep10(missionAvg)}
              </span>
            </div>
          </Tooltip>
        </div>

        {/* Right Section: Compact Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {!isReleaseActive && timeElapsed < 540 && (
            <Tooltip
              content={
                <div>
                  <p className="font-bold text-rose-300">손을 놓음 (자율 생명력 시험)</p>
                  <p className="text-white/70 mt-0.5">
                    인위적인 개입을 멈추고 교회가 스스로 일어서는 생명력을 확인합니다.
                  </p>
                </div>
              }
            >
              <button
                id="btn-trigger-release"
                onClick={onTriggerRelease}
                className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-sm transition-colors cursor-pointer"
              >
                손놓음
              </button>
            </Tooltip>
          )}

          {/* Speed Toggle */}
          <Tooltip
            content={
              <div>
                <p className="font-bold text-amber-300">시뮬레이션 속도: {gameSpeed}x</p>
                <p className="text-white/70 mt-0.5">클릭 시 1배속/2배속으로 전환됩니다.</p>
              </div>
            }
          >
            <button
              id="btn-speed-toggle"
              onClick={toggleSpeed}
              className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-sm border transition-colors cursor-pointer ${
                gameSpeed === 2
                  ? 'bg-amber-400/20 text-amber-200 border-amber-400/40'
                  : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
              }`}
            >
              {gameSpeed}x
            </button>
          </Tooltip>

          {/* Play/Pause */}
          <Tooltip content={isPaused ? '시뮬레이션 재개' : '시뮬레이션 일시정지'}>
            <button
              id="btn-pause-toggle"
              onClick={togglePause}
              className="p-1 rounded-sm bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 transition-colors cursor-pointer"
            >
              {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            </button>
          </Tooltip>

          {/* Sound Mute */}
          <Tooltip content={isMuted ? '음향 켜기' : '음향 끄기'}>
            <button
              id="btn-sound-toggle"
              onClick={toggleSound}
              className="p-1 rounded-sm bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 transition-colors cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
            </button>
          </Tooltip>

          {/* Guide */}
          <Tooltip content="시뮬레이션 원리 및 성경적 가이드">
            <button
              id="btn-guide"
              onClick={onOpenGuide}
              className="p-1 rounded-sm bg-white/5 hover:bg-white/10 text-amber-200 border border-white/10 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3 h-3" />
            </button>
          </Tooltip>
        </div>
      </div>
    </header>
  );
};
