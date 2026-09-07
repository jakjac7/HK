/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameEngine } from '../simulation/engine';
import { soundEngine } from '../simulation/sound';
import { toFaithGrade5 } from '../utils/faithTerms';
import { MapId, SuccessionStatus } from '../types';
import { MAP_PROFILES } from '../config/maps';
import { Tooltip } from './Tooltip';
import {
  Volume2,
  VolumeX,
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
  AlertCircle,
  TrendingDown,
  Minus,
  TrendingUp,
} from 'lucide-react';

interface TopHUDProps {
  engine: GameEngine;
  onOpenGuide: () => void;
  onTriggerRelease: () => void;
  onOpenSendModal?: () => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
}

const GradeStatusIcon: React.FC<{ level: number; className?: string }> = ({ level, className = 'w-3 h-3' }) => {
  switch (level) {
    case 1:
      return <AlertCircle className={`${className} text-rose-400 shrink-0`} title="매우나쁨" />;
    case 2:
      return <TrendingDown className={`${className} text-orange-400 shrink-0`} title="나쁨" />;
    case 3:
      return <Minus className={`${className} text-amber-300 shrink-0`} title="보통" />;
    case 4:
      return <TrendingUp className={`${className} text-emerald-400 shrink-0`} title="좋음" />;
    case 5:
    default:
      return <Sparkles className={`${className} text-cyan-300 shrink-0`} title="아주좋음" />;
  }
};

export const TopHUD: React.FC<TopHUDProps> = ({
  engine,
  onOpenGuide,
  onTriggerRelease,
  onOpenSendModal,
  isMuted,
  setIsMuted,
}) => {
  const { timeElapsed, isPaused, gameSpeed, isReleaseActive, communities, people, mapId } =
    engine.state;

  const remainingTime = Math.max(0, 600 - timeElapsed);
  const minutes = Math.floor(remainingTime / 60);
  const seconds = Math.floor(remainingTime % 60);
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
    phaseShort = '맡겨드림';
    phaseFull = '성령께 온전히 맡겨드림';
    phaseDesc = '인위적 개입을 멈추고 교회가 자생하는 성령충만을 지켜봅니다.';
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
  const healthGrade = toFaithGrade5(kingdomHealthRaw);
  const wordGrade = toFaithGrade5(wordAvg);
  const careGrade = toFaithGrade5(careAvg);
  const worshipGrade = toFaithGrade5(worshipAvg);
  const prayerGrade = toFaithGrade5(prayerAvg);
  const missionGrade = toFaithGrade5(missionAvg);

  const toggleSound = () => {
    const nextMute = soundEngine.toggleMute();
    setIsMuted(nextMute);
  };

  const currentMap = MAP_PROFILES[mapId] || MAP_PROFILES.CAMPUS;

  const succession: SuccessionStatus = primaryComm
    ? engine.evaluateSuccession(primaryComm.id)
    : 'LOW';

  return (
    <header
      id="top-hud"
      className="absolute top-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-5xl px-4 pointer-events-none flex flex-col gap-2"
    >
      {/* ── ROW 1: Brand, Phase, Send, Mission Field Map, Countdown Timer & Controls ── */}
      <div className="w-full flex flex-wrap items-center justify-center sm:justify-between gap-y-2 pointer-events-auto bg-[#121212]/80 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-full px-3 py-1.5 shadow-lg shadow-black/50">
        {/* Row 1 Left: Brand & Ministry Stage & Mission Field & Send Button */}
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
              <h1 className="text-xs sm:text-sm font-serif font-bold tracking-tight text-[#F5F5F5] whitespace-nowrap">
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
            <span className="cursor-help px-2 py-0.5 rounded-full text-[10px] font-serif font-semibold bg-amber-400/15 text-amber-300 border border-amber-400/30 tracking-tight whitespace-nowrap">
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
                  새가족 유입 배율: {currentMap.populationSpawnRate}x
                </p>
              </div>
            }
          >
            <div className="flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 px-2 py-0.5 rounded-sm text-[11px] cursor-help transition-colors whitespace-nowrap">
              <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="text-[11px] text-white/90 font-sans">
                {currentMap.name}
              </span>
            </div>
          </Tooltip>
        </div>

        {/* Row 1 Center: Prominent Countdown Timer */}
        <div className="flex items-center justify-center shrink-0">
          <Tooltip
            content={
              <div>
                <p className="font-bold text-amber-300">남은 사역 시간: {timeStr}</p>
                <p className="text-white/70 mt-0.5">
                  남은 시간이 1:00가 되면 성령께 온전히 맡겨드리는 자율 시험이 진행됩니다.
                </p>
              </div>
            }
          >
            <div
              id="top-hud-timer-badge"
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono cursor-help border transition-all whitespace-nowrap shadow-sm ${
                isReleaseActive
                  ? 'bg-rose-950/90 border-rose-500/80 text-rose-300 font-bold animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.5)]'
                  : 'bg-white/10 border-white/20 text-white hover:border-amber-400/50 hover:bg-white/15'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-[10px] text-white/70 font-sans hidden sm:inline">남은시간</span>
              <span className="tracking-wider font-bold text-amber-200">{timeStr}</span>
            </div>
          </Tooltip>
        </div>

        {/* Row 1 Right: System Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {!isReleaseActive && timeElapsed < 540 && (
            <Tooltip
              content={
                <div>
                  <p className="font-bold text-rose-300">성령께 온전히 맡겨드림 (자율 운행)</p>
                  <p className="text-white/70 mt-0.5">
                    인위적인 개입을 멈추고 교회가 스스로 일어서는 생명력을 확인합니다.
                  </p>
                </div>
              }
            >
              <button
                id="btn-trigger-release"
                onClick={onTriggerRelease}
                className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                맡겨드림
              </button>
            </Tooltip>
          )}

          {/* Sound Mute */}
          <Tooltip content={isMuted ? '음향 켜기' : '음향 끄기'}>
            <button
              id="btn-sound-toggle"
              onClick={toggleSound}
              className="p-1.5 rounded-sm bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 transition-colors cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-white/70" />}
            </button>
          </Tooltip>

          {/* Guide */}
          <Tooltip content="시뮬레이션 원리 및 성경적 가이드">
            <button
              id="btn-guide"
              onClick={onOpenGuide}
              className="p-1.5 rounded-sm bg-white/5 hover:bg-white/10 text-amber-300 border border-white/10 hover:border-amber-400/40 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* ── ROW 2: Core Spiritual Vitals (Health & Flock) + 5 Kingdom Pillars ── */}
      <div className="w-full flex flex-wrap items-center justify-center sm:justify-between gap-y-2 gap-x-2 text-xs pointer-events-auto bg-[#121212]/80 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-full px-3 py-1.5 shadow-lg shadow-black/50">
        {/* Row 2 Left: Health & Flock Status */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Health Step */}
          <Tooltip
            content={
              <div>
                <p className="font-bold text-emerald-400">몸의 건강도: {healthGrade.grade} ({healthGrade.level}/5단계)</p>
                <p className="text-white/70 mt-0.5">
                  말씀, 돌봄, 예배, 기도, 선교 5대 기둥의 총체적 영적 조화입니다.
                </p>
                <p className="text-[10px] text-emerald-200/80 mt-0.5">
                  상태: {healthGrade.description}
                </p>
              </div>
            }
          >
            <div className={`flex items-center gap-1 border px-2 sm:px-2.5 py-0.5 rounded-sm cursor-help whitespace-nowrap ${healthGrade.badge}`}>
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[10px] sm:text-[11px] text-white/80 hidden sm:inline font-sans">건강도</span>
              <GradeStatusIcon level={healthGrade.level} />
            </div>
          </Tooltip>

          {/* People & Care Capacity */}
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
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-sm border cursor-help whitespace-nowrap ${
                careGapTotal > 0
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 animate-pulse'
                  : 'bg-white/5 border-white/10 text-white/90'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-[10px] sm:text-[11px] text-white/70 hidden sm:inline font-sans">성도/돌봄</span>
              <span className="text-[10px] sm:text-[11px] font-mono font-bold">
                {activeMembers}/{careCapacityTotal}
              </span>
              {careGapTotal > 0 && (
                <span className="text-[9px] sm:text-[10px] bg-rose-500 text-white px-1 sm:px-1.5 py-0.2 rounded-xs font-mono font-bold animate-bounce">
                  돌봄공백 {careGapTotal}명
                </span>
              )}
            </div>
          </Tooltip>
        </div>

        {/* Row 2 Right: 5 Pillars (Iconized status to prevent text spillover) */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <span className="text-[10px] font-serif text-white/40 uppercase tracking-wider hidden lg:inline mr-0.5">
            5대 기둥
          </span>

          {/* WORD: 말씀 */}
          <Tooltip
            content={
              <div>
                <p className="font-bold text-indigo-300">
                  말씀 (복음의 농도): {wordGrade.grade} ({wordGrade.level}/5단계)
                </p>
                <p className="text-white/70 mt-0.5">
                  십자가 복음이 심령에 뿌리내려 미혹과 이단을 분별하는 말씀의 깊이입니다.
                </p>
                <p className="text-[10px] text-indigo-200/80 mt-0.5">
                  상태: {wordGrade.description}
                </p>
              </div>
            }
          >
            <div className="flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 px-1.5 sm:px-2 py-0.5 rounded-sm cursor-help transition-colors whitespace-nowrap">
              <BookOpen className="w-3 h-3 text-indigo-400 shrink-0" />
              <span className="text-[10px] text-white/70 font-sans hidden md:inline">말씀</span>
              <GradeStatusIcon level={wordGrade.level} />
            </div>
          </Tooltip>

          {/* CARE: 돌봄 */}
          <Tooltip
            content={
              <div>
                <p className="font-bold text-emerald-300">
                  돌봄 (사랑의 정착): {careGrade.grade} ({careGrade.level}/5단계)
                </p>
                <p className="text-white/70 mt-0.5">
                  목자의 온유한 심방과 섬김으로 외곽의 영혼이 공동체에 안착한 정도입니다.
                </p>
                <p className="text-[10px] text-emerald-200/80 mt-0.5">
                  상태: {careGrade.description}
                </p>
              </div>
            }
          >
            <div className="flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 px-1.5 sm:px-2 py-0.5 rounded-sm cursor-help transition-colors whitespace-nowrap">
              <Heart className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="text-[10px] text-white/70 font-sans hidden md:inline">돌봄</span>
              <GradeStatusIcon level={careGrade.level} />
            </div>
          </Tooltip>

          {/* WORSHIP: 예배 */}
          <Tooltip
            content={
              <div>
                <p className="font-bold text-pink-300">
                  예배 (거룩한 임재): {worshipGrade.grade} ({worshipGrade.level}/5단계)
                </p>
                <p className="text-white/70 mt-0.5">
                  온전한 예배 가운데 부어지는 하나님의 임재와 영적 질서, 일치입니다.
                </p>
                <p className="text-[10px] text-pink-200/80 mt-0.5">
                  상태: {worshipGrade.description}
                </p>
              </div>
            }
          >
            <div className="flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 px-1.5 sm:px-2 py-0.5 rounded-sm cursor-help transition-colors whitespace-nowrap">
              <Sparkles className="w-3 h-3 text-pink-400 shrink-0" />
              <span className="text-[10px] text-white/70 font-sans hidden md:inline">예배</span>
              <GradeStatusIcon level={worshipGrade.level} />
            </div>
          </Tooltip>

          {/* PRAYER: 기도 */}
          <Tooltip
            content={
              <div>
                <p className="font-bold text-amber-300">
                  기도 (은혜의 품): {prayerGrade.grade} ({prayerGrade.level}/5단계)
                </p>
                <p className="text-white/70 mt-0.5">
                  합심 기도와 중보를 통해 영적 지침(Burnout)을 치유하고 시험을 방어합니다.
                </p>
                <p className="text-[10px] text-amber-200/80 mt-0.5">
                  상태: {prayerGrade.description}
                </p>
              </div>
            }
          >
            <div className="flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 px-1.5 sm:px-2 py-0.5 rounded-sm cursor-help transition-colors whitespace-nowrap">
              <Flame className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="text-[10px] text-white/70 font-sans hidden md:inline">기도</span>
              <GradeStatusIcon level={prayerGrade.level} />
            </div>
          </Tooltip>

          {/* MISSION: 선교 */}
          <Tooltip
            content={
              <div>
                <p className="font-bold text-cyan-300">
                  선교 (잃은 양 품음): {missionGrade.grade} ({missionGrade.level}/5단계)
                </p>
                <p className="text-white/70 mt-0.5">
                  세상 밖으로 담장을 넘어 잃어버린 영혼들을 품는 복음 증거의 열정입니다.
                </p>
                <p className="text-[10px] text-cyan-200/80 mt-0.5">
                  상태: {missionGrade.description}
                </p>
              </div>
            }
          >
            <div className="flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 px-1.5 sm:px-2 py-0.5 rounded-sm cursor-help transition-colors whitespace-nowrap">
              <Compass className="w-3 h-3 text-cyan-400 shrink-0" />
              <span className="text-[10px] text-white/70 font-sans hidden md:inline">선교</span>
              <GradeStatusIcon level={missionGrade.level} />
            </div>
          </Tooltip>
        </div>
      </div>
    </header>
  );
};
