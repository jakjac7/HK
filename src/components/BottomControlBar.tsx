/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameEngine } from '../simulation/engine';
import { ActionId, CommunityPriority, SuccessionStatus } from '../types';
import { Tooltip } from './Tooltip';
import {
  Utensils,
  BookOpen,
  Flame,
  Heart,
  Sparkles,
  Compass,
  Sprout,
  Send,
  Play,
  Pause,
  FastForward,
} from 'lucide-react';

interface BottomControlBarProps {
  engine: GameEngine;
  activeActionId: ActionId | null;
  onSelectAction: (actionId: ActionId | null) => void;
  onOpenSendModal: () => void;
}

export const BottomControlBar: React.FC<BottomControlBarProps> = ({
  engine,
  activeActionId,
  onSelectAction,
  onOpenSendModal,
}) => {
  const { attention, actions, communities, isReleaseActive, selectedPersonId, isPaused, gameSpeed } = engine.state;
  const primaryComm = communities[0] || null;

  const togglePause = () => {
    engine.state.isPaused = !engine.state.isPaused;
  };

  const cycleGameSpeed = () => {
    let nextSpeed = 1;
    if (gameSpeed === 1) nextSpeed = 2;
    else if (gameSpeed === 2) nextSpeed = 3;
    else nextSpeed = 1;

    engine.state.gameSpeed = nextSpeed;
    engine.state.isPaused = false;
  };

  if (isReleaseActive) {
    return (
      <footer
        id="bottom-control-bar"
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-4 pointer-events-none flex flex-col gap-1.5 select-none"
      >
        <div className="w-full flex justify-between items-center pointer-events-auto bg-[#121212]/80 backdrop-blur-xl border border-rose-500/40 rounded-full px-4 py-2 shadow-[0_0_20px_rgba(244,63,94,0.15)] shadow-black/50 text-rose-300 font-medium text-xs tracking-wide font-serif">
          <div className="flex items-center gap-2">
            <span className="animate-pulse">🕊️</span>
            <span>성령께 온전히 맡겨드림 — 교회의 성령충만을 지켜보는 시간입니다</span>
          </div>
          {/* Playback Controls during release */}
          <div className="flex items-center bg-white/5 border border-white/10 rounded-full p-1 gap-1 font-sans">
            <Tooltip position="top" content={isPaused ? '시뮬레이션 재개 (Play)' : '시뮬레이션 일시정지 (Pause)'}>
              <button
                id="btn-pause-toggle"
                onClick={togglePause}
                className={`flex items-center justify-center w-7 h-7 rounded-full transition-colors cursor-pointer ${
                  isPaused
                    ? 'bg-amber-500/25 text-amber-200 border border-amber-400/50 shadow-xs'
                    : 'text-white/70 hover:text-white hover:bg-white/10 border border-transparent'
                }`}
              >
                {isPaused ? <Play className="w-4 h-4 text-amber-400 fill-amber-400/30 ml-0.5" /> : <Pause className="w-4 h-4" />}
              </button>
            </Tooltip>
            <div className="w-[1px] h-4 bg-white/10 mx-0.5" />
            <button
              id="btn-speed-toggle"
              onClick={cycleGameSpeed}
              title={`배속 전환 (현재: ${gameSpeed}x ➔ 클릭 시 ${gameSpeed === 3 ? '1x' : `${gameSpeed + 1}x`})`}
              className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-mono font-bold rounded-full transition-colors cursor-pointer whitespace-nowrap ${
                isPaused
                  ? 'text-white/40 border border-white/5'
                  : gameSpeed === 3
                  ? 'bg-amber-400/25 text-amber-200 border border-amber-400/50 shadow-xs'
                  : gameSpeed === 2
                  ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/50 shadow-xs'
                  : 'bg-white/10 text-white/90 border border-white/15 hover:bg-white/15'
              }`}
            >
              <FastForward className="w-3.5 h-3.5 text-cyan-400 opacity-90" />
              <span>{gameSpeed}x</span>
            </button>
          </div>
        </div>
      </footer>
    );
  }

  // Priority management
  const currentPriority: CommunityPriority = primaryComm ? primaryComm.priority : 'ROOT';
  const priorityCooldown = primaryComm ? Math.ceil(primaryComm.priorityCooldown) : 0;

  const handlePriorityClick = (p: CommunityPriority) => {
    if (!primaryComm || priorityCooldown > 0) return;
    engine.setPriority(primaryComm.id, p);
  };

  // Succession Readiness
  const succession: SuccessionStatus = primaryComm
    ? engine.evaluateSuccession(primaryComm.id)
    : 'LOW';

  const successionColors = {
    READY: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50 hover:bg-emerald-500/30',
    FAIR: 'bg-amber-400/15 text-amber-200 border-amber-400/40 hover:bg-amber-400/25',
    LOW: 'bg-rose-500/15 text-rose-300 border-rose-500/40 hover:bg-rose-500/25',
  };

  const successionText = {
    READY: '파송 준비',
    FAIR: '양육 중',
    LOW: '성숙 필요',
  };

  const handleActionClick = (actionId: ActionId) => {
    if (actionId === 'SEND') {
      onOpenSendModal();
      return;
    }

    const action = actions.find(a => a.id === actionId);
    if (!action) return;

    if (action.currentCooldown > 0.05 || attention < action.attentionCost) {
      return;
    }

    // Community-wide actions: WORD, PRAYER, WORSHIP, FELLOWSHIP can execute immediately!
    if (actionId === 'WORD' || actionId === 'PRAYER' || actionId === 'WORSHIP' || actionId === 'FELLOWSHIP') {
      engine.executeAction(actionId);
      onSelectAction(null);
      return;
    }

    // Targeted actions: CARE (심방)
    if (selectedPersonId) {
      engine.executeAction(actionId, selectedPersonId);
      onSelectAction(null);
    } else {
      onSelectAction(activeActionId === actionId ? null : actionId);
    }
  };

  return (
    <footer
      id="bottom-control-bar"
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-5xl px-4 pointer-events-none flex flex-col gap-1.5 select-none"
    >
      <div className="w-full flex flex-col gap-1.5">
        {/* Row 1: Attention (Left) and Priority (Right) */}
        <div className="w-full flex justify-between items-center pointer-events-auto bg-[#121212]/80 backdrop-blur-xl border border-white/10 rounded-full px-3 py-1.5 shadow-lg shadow-black/50">
          {/* Left Wing: Attention Orbs (행동력) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Tooltip
              position="top"
              content={
                <div>
                  <p className="font-bold text-amber-300">
                    집중 (행동력): {Math.floor(attention)} / 3개
                  </p>
                  <p className="text-white/70 mt-0.5">
                    사역을 집중할 수 있는 영적 에너지입니다. 8초마다 1개씩 회복됩니다.
                  </p>
                </div>
              }
            >
              <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full cursor-help">
                <span className="text-[10px] font-serif font-bold text-amber-300/80">
                  집중
                </span>
                <div className="flex items-center gap-1">
                  {[0, 1, 2].map(idx => {
                    const filled = attention >= idx + 1;
                    const fractional = !filled && attention > idx ? attention - idx : 0;
                    return (
                      <div
                        key={idx}
                        className="relative w-3.5 h-3.5 rounded-full border border-amber-400/50 bg-black/60 overflow-hidden flex items-center justify-center shadow-inner"
                      >
                        {filled ? (
                          <div className="w-full h-full bg-amber-400 shadow-[0_0_8px_#fbbf24] animate-pulse-glow" />
                        ) : fractional > 0 ? (
                          <div
                            className="absolute bottom-0 left-0 right-0 bg-amber-400/80 transition-all"
                            style={{ height: `${fractional * 100}%` }}
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </Tooltip>
          </div>

          {/* Center: Playback & Speed Controls (일시정지, 1배속, 2배속, 최대 3배속) */}
          <div className="flex items-center bg-white/5 border border-white/10 rounded-full p-1 gap-1 shadow-sm shrink-0">
            {/* Pause / Resume toggle button */}
            <Tooltip position="top" content={isPaused ? '시뮬레이션 재개 (Play)' : '시뮬레이션 일시정지 (Pause)'}>
              <button
                id="btn-pause-toggle"
                onClick={togglePause}
                className={`flex items-center justify-center w-7 h-7 rounded-full transition-colors cursor-pointer ${
                  isPaused
                    ? 'bg-amber-500/25 text-amber-200 border border-amber-400/50 shadow-xs'
                    : 'text-white/70 hover:text-white hover:bg-white/10 border border-transparent'
                }`}
              >
                {isPaused ? <Play className="w-4 h-4 text-amber-400 fill-amber-400/30 ml-0.5" /> : <Pause className="w-4 h-4 text-white/80" />}
              </button>
            </Tooltip>

            <div className="w-[1px] h-4 bg-white/10 mx-0.5" />

            {/* Speed Toggle Button (1x -> 2x -> 3x -> 1x) */}
            <Tooltip
              position="top"
              content={
                <div>
                  <span className="font-bold text-cyan-300">배속 전환 (클릭)</span>
                  <p className="text-[10px] text-white/70 mt-0.5">
                    현재: <span className="font-mono text-amber-300 font-bold">{gameSpeed}배속</span> ➔ 클릭 시{' '}
                    <span className="font-mono text-cyan-300 font-bold">{gameSpeed === 3 ? '1배속' : `${gameSpeed + 1}배속`}</span>
                  </p>
                </div>
              }
            >
              <button
                id="btn-speed-toggle"
                onClick={cycleGameSpeed}
                className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-mono font-bold rounded-full transition-colors cursor-pointer whitespace-nowrap ${
                  isPaused
                    ? 'text-white/40 hover:text-white/70 border border-white/5'
                    : gameSpeed === 3
                    ? 'bg-amber-400/25 text-amber-200 border border-amber-400/50 shadow-xs'
                    : gameSpeed === 2
                    ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/50 shadow-xs'
                    : 'bg-white/10 text-white/90 border border-white/15 hover:bg-white/15'
                }`}
              >
                <FastForward className="w-3.5 h-3.5 text-cyan-400 opacity-90" />
                <span>{gameSpeed}x</span>
              </button>
            </Tooltip>
          </div>

          {/* Right Wing: Community Priority Selector (GO | ROOT | CARE) */}
          <div className="flex items-center gap-1 shrink-0">
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-1 rounded-full text-[11px]">
              {/* GO */}
              <Tooltip
                position="top"
                content={
                  <div>
                    <p className="font-bold text-cyan-300">선교 우선 (GO)</p>
                    <p className="text-white/70 mt-0.5">
                      전도자가 활발히 움직여 외부 이웃과의 관계 맺음과 새가족 유입을 촉진합니다.
                    </p>
                  </div>
                }
              >
                <button
                  id="priority-go"
                  onClick={() => handlePriorityClick('GO')}
                  disabled={priorityCooldown > 0 && currentPriority !== 'GO'}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-mono font-semibold transition-all cursor-pointer ${
                    currentPriority === 'GO'
                      ? 'bg-cyan-400 text-black font-bold shadow-[0_0_10px_rgba(34,211,238,0.4)]'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  } ${priorityCooldown > 0 && currentPriority !== 'GO' ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>GO</span>
                </button>
              </Tooltip>

              {/* ROOT */}
              <Tooltip
                position="top"
                content={
                  <div>
                    <p className="font-bold text-indigo-300">말씀 우선 (ROOT)</p>
                    <p className="text-white/70 mt-0.5">
                      교사의 말씀 나눔으로 복음의 깊이를 더하고 거짓 가르침을 분별합니다.
                    </p>
                  </div>
                }
              >
                <button
                  id="priority-root"
                  onClick={() => handlePriorityClick('ROOT')}
                  disabled={priorityCooldown > 0 && currentPriority !== 'ROOT'}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-mono font-semibold transition-all cursor-pointer ${
                    currentPriority === 'ROOT'
                      ? 'bg-indigo-400 text-black font-bold shadow-[0_0_10px_rgba(129,140,248,0.4)]'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  } ${priorityCooldown > 0 && currentPriority !== 'ROOT' ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                  <Sprout className="w-3.5 h-3.5" />
                  <span>ROOT</span>
                </button>
              </Tooltip>

              {/* CARE */}
              <Tooltip
                position="top"
                content={
                  <div>
                    <p className="font-bold text-emerald-300">돌봄 우선 (CARE)</p>
                    <p className="text-white/70 mt-0.5">
                      목자의 심방과 사랑으로 지친 사람을 품고 이탈을 방지합니다.
                    </p>
                  </div>
                }
              >
                <button
                  id="priority-care"
                  onClick={() => handlePriorityClick('CARE')}
                  disabled={priorityCooldown > 0 && currentPriority !== 'CARE'}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-mono font-semibold transition-all cursor-pointer ${
                    currentPriority === 'CARE'
                      ? 'bg-emerald-400 text-black font-bold shadow-[0_0_10px_rgba(52,211,153,0.4)]'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  } ${priorityCooldown > 0 && currentPriority !== 'CARE' ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                  <Heart className="w-3.5 h-3.5" />
                  <span>CARE</span>
                </button>
              </Tooltip>

              {priorityCooldown > 0 && (
                <span className="text-[9px] text-white/40 font-mono px-1">
                  {priorityCooldown}s
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: All 6 Strategic Actions in a unified, non-wrapping row */}
        <div className="grid grid-cols-6 gap-1 sm:gap-1.5 w-full max-w-4xl mx-auto pointer-events-auto bg-[#121212]/80 backdrop-blur-xl border border-white/10 rounded-2xl px-2 py-1.5 shadow-lg shadow-black/50 items-stretch">
          {(['WORD', 'PRAYER', 'WORSHIP', 'FELLOWSHIP', 'CARE', 'SEND'] as ActionId[]).map(actId => {
            const act = actions.find(a => a.id === actId);
            if (!act) return null;

            if (act.id === 'SEND') {
              return (
                <Tooltip
                  key="SEND"
                  position="top"
                  content={
                    <div>
                      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1 mb-1">
                        <span className="font-bold text-amber-300">리더 파송 (교회 개척)</span>
                        <span className="text-[10px] font-mono text-cyan-300">
                          {successionText[succession]}
                        </span>
                      </div>
                      <p className="text-white/80 leading-tight">
                        장성한 제자 리더를 세워 새로운 선교지로 분립 개척을 파송합니다.
                      </p>
                      <p className="text-[10px] text-amber-200 mt-1 font-mono">
                        * 상태: {successionText[succession]} (클릭하여 개척지 선택)
                      </p>
                    </div>
                  }
                >
                  <button
                    id="btn-open-send-modal"
                    onClick={onOpenSendModal}
                    className={`relative flex items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-2 py-1.5 rounded-xl border text-xs font-serif font-bold transition-all cursor-pointer select-none truncate ${
                      succession === 'READY'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.3)] animate-pulse'
                        : succession === 'FAIR'
                        ? 'bg-amber-400/15 text-amber-200 border-amber-400/60 hover:bg-amber-400/25'
                        : 'bg-white/5 text-white/80 border-white/20 hover:bg-white/10'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span className="tracking-tight whitespace-nowrap">파송</span>
                    <span
                      className={`hidden sm:inline-block text-[9px] px-1 rounded-xs font-mono shrink-0 ${
                        succession === 'READY'
                          ? 'bg-emerald-400/30 text-emerald-200'
                          : 'bg-black/40 text-white/60'
                      }`}
                    >
                      {successionText[succession]}
                    </span>
                  </button>
                </Tooltip>
              );
            }

            const isSelected = activeActionId === act.id;
            const isOnCooldown = act.currentCooldown > 0.05;
            const canAfford = attention >= act.attentionCost;
            const isAvailable = !isOnCooldown && canAfford;

            return (
              <Tooltip
                key={act.id}
                position="top"
                content={
                  <div>
                    <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1 mb-1">
                      <span className="font-bold text-amber-300">{act.koreanName}</span>
                      <span className="text-[10px] font-mono text-amber-400">
                        비용: {act.attentionCost}●
                      </span>
                    </div>
                    <p className="text-white/80 leading-tight">{act.description}</p>
                    {act.targetType === 'PERSON' && (
                      <p className="text-[10px] text-amber-200/70 mt-1 italic">
                        * 지체 선택 후 클릭 또는 클릭 후 지체 탭
                      </p>
                    )}
                    {isOnCooldown && (
                      <p className="text-[10px] text-rose-400 mt-1 font-mono">
                        재사용 대기시간: {Math.ceil(act.currentCooldown)}초
                      </p>
                    )}
                  </div>
                }
              >
                <button
                  id={`action-btn-${act.id.toLowerCase()}`}
                  onClick={() => handleActionClick(act.id)}
                  disabled={!isAvailable && !isSelected}
                  className={`relative flex items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-2 py-1.5 rounded-xl border text-xs font-serif transition-all cursor-pointer select-none truncate ${
                    isSelected
                      ? 'bg-amber-400 text-black font-bold border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.4)] scale-105'
                      : isAvailable
                      ? 'bg-white/5 hover:bg-white/10 border-white/15 hover:border-amber-400/50 text-[#F5F5F5]'
                      : 'bg-white/2 border-white/5 opacity-40 cursor-not-allowed text-white/50'
                  }`}
                >
                  {/* Cooldown Overlay */}
                  {isOnCooldown && (
                    <div className="absolute inset-0 bg-black/80 rounded-xl flex items-center justify-center font-mono font-bold text-amber-300 text-[10px] z-10">
                      {Math.ceil(act.currentCooldown)}s
                    </div>
                  )}

                  {/* Icon */}
                  <span className={`shrink-0 ${isSelected ? 'text-black' : 'text-amber-300'}`}>
                    {renderActionIcon(act.id)}
                  </span>

                  {/* Short Name */}
                  <span className="font-medium tracking-tight whitespace-nowrap">
                    {getActionShortName(act.id)}
                  </span>

                  {/* Cost Pill */}
                  <span
                    className={`hidden sm:inline-block text-[9px] font-mono px-1 rounded-xs font-semibold shrink-0 ${
                      isSelected ? 'bg-black/20 text-black' : 'text-amber-400/90'
                    }`}
                  >
                    {act.attentionCost}●
                  </span>
                </button>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </footer>
  );
};

function getActionShortName(id: ActionId): string {
  switch (id) {
    case 'FELLOWSHIP':
      return '교제';
    case 'WORD':
      return '말씀';
    case 'PRAYER':
      return '기도';
    case 'WORSHIP':
      return '예배';
    case 'CARE':
      return '심방';
    case 'SEND':
      return '파송';
  }
}

function renderActionIcon(id: ActionId) {
  switch (id) {
    case 'FELLOWSHIP':
      return <Utensils className="w-3 h-3" />;
    case 'WORD':
      return <BookOpen className="w-3 h-3" />;
    case 'PRAYER':
      return <Flame className="w-3 h-3" />;
    case 'WORSHIP':
      return <Sparkles className="w-3 h-3" />;
    case 'CARE':
      return <Heart className="w-3 h-3" />;
    case 'SEND':
      return <Send className="w-3 h-3" />;
  }
}
