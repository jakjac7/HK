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
  const { attention, actions, communities, isReleaseActive, selectedPersonId } = engine.state;
  const primaryComm = communities[0] || null;

  if (isReleaseActive) {
    return (
      <footer
        id="bottom-control-bar"
        className="relative z-30 w-full bg-[#121212]/95 backdrop-blur-md border-t border-rose-500/40 py-2 px-4 text-center text-rose-300 font-medium text-xs tracking-wide font-serif animate-pulse select-none"
      >
        🕊️ 성령께 온전히 맡겨드림 — 교회의 성령충만을 지켜보는 시간입니다
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
      className="relative z-30 w-full bg-[#121212]/95 backdrop-blur-md border-t border-white/10 px-2 sm:px-4 py-2 text-[#F5F5F5] select-none shrink-0"
    >
      <div className="w-full flex flex-col gap-1.5 max-w-5xl mx-auto">
        {/* Row 1: Attention (Left) and Priority (Right) */}
        <div className="w-full flex justify-between items-center px-1">
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

          {/* Right Wing: Community Priority Selector (GO | ROOT | CARE) */}
          <div className="flex items-center gap-1 shrink-0">
            <div className="flex items-center gap-0.5 bg-white/5 border border-white/10 p-0.5 rounded-sm text-[11px]">
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
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-xs font-mono font-semibold transition-all cursor-pointer ${
                    currentPriority === 'GO'
                      ? 'bg-cyan-400 text-black font-bold shadow-[0_0_10px_rgba(34,211,238,0.4)]'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  } ${priorityCooldown > 0 && currentPriority !== 'GO' ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                  <Compass className="w-3 h-3" />
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
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-xs font-mono font-semibold transition-all cursor-pointer ${
                    currentPriority === 'ROOT'
                      ? 'bg-indigo-400 text-black font-bold shadow-[0_0_10px_rgba(129,140,248,0.4)]'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  } ${priorityCooldown > 0 && currentPriority !== 'ROOT' ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                  <Sprout className="w-3 h-3" />
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
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-xs font-mono font-semibold transition-all cursor-pointer ${
                    currentPriority === 'CARE'
                      ? 'bg-emerald-400 text-black font-bold shadow-[0_0_10px_rgba(52,211,153,0.4)]'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  } ${priorityCooldown > 0 && currentPriority !== 'CARE' ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                  <Heart className="w-3 h-3" />
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

        {/* Row 2: Strategic Action Buttons + SEND */}
        <div className="flex flex-wrap sm:flex-nowrap justify-center sm:justify-between items-center gap-2 w-full max-w-2xl mx-auto pb-0.5 px-1">
          <div className="flex items-center justify-center gap-1 sm:gap-1.5 flex-wrap">
            {actions.filter(act => act.id !== 'SEND').map(act => {
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
                    className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border text-xs font-serif transition-all cursor-pointer select-none shrink-0 ${
                      isSelected
                        ? 'bg-amber-400 text-black font-bold border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.4)] scale-105'
                        : isAvailable
                        ? 'bg-white/5 hover:bg-white/10 border-white/15 hover:border-amber-400/50 text-[#F5F5F5]'
                        : 'bg-white/2 border-white/5 opacity-40 cursor-not-allowed text-white/50'
                    }`}
                  >
                    {/* Cooldown Overlay */}
                    {isOnCooldown && (
                      <div className="absolute inset-0 bg-black/75 rounded-sm flex items-center justify-center font-mono font-bold text-amber-300 text-[10px] z-10">
                        {Math.ceil(act.currentCooldown)}s
                      </div>
                    )}

                    {/* Icon */}
                    <span className={isSelected ? 'text-black' : 'text-amber-300'}>
                      {renderActionIcon(act.id)}
                    </span>

                    {/* Short Name */}
                    <span className="font-medium tracking-tight whitespace-nowrap">
                      {getActionShortName(act.id)}
                    </span>

                    {/* Cost Pill */}
                    <span
                      className={`text-[9px] font-mono px-1 rounded-xs font-semibold ${
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

          {/* SEND Button */}
          <Tooltip
            position="top"
            content={
              <div>
                <p className="font-bold text-cyan-300">리더 파송</p>
                <p className="text-white/70 mt-0.5">
                  장성한 일꾼을 세워 새로운 선교지로 파송합니다.
                </p>
                <p className="text-[10px] text-amber-200 mt-1">
                  현재 상태: {successionText[succession]}
                </p>
              </div>
            }
          >
            <button
              id="btn-open-send-modal"
              onClick={onOpenSendModal}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-serif font-bold rounded-sm border transition-all cursor-pointer ${successionColors[succession]} shadow-sm shrink-0 whitespace-nowrap`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>파송</span>
              <span className="text-[9px] px-1 rounded-xs bg-black/40 font-mono">
                {successionText[succession]}
              </span>
            </button>
          </Tooltip>
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
