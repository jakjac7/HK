/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameEngine } from '../simulation/engine';
import { PracticeCard, CommunityPriority, SuccessionStatus } from '../types';
import {
  Utensils,
  BookOpen,
  Flame,
  Heart,
  ShieldCheck,
  Sparkles,
  Compass,
  Sprout,
  Send,
} from 'lucide-react';

interface BottomControlBarProps {
  engine: GameEngine;
  activeCardId: string | null;
  onSelectCard: (cardId: string | null) => void;
  onOpenSendModal: () => void;
}

export const BottomControlBar: React.FC<BottomControlBarProps> = ({
  engine,
  activeCardId,
  onSelectCard,
  onOpenSendModal,
}) => {
  const { attention, maxAttention, hand, communities, isReleaseActive } = engine.state;
  const primaryComm = communities[0] || null;

  // Don't render interaction buttons during THE RELEASE
  if (isReleaseActive) {
    return (
      <footer
        id="bottom-control-bar"
        className="w-full bg-[#121212] border-t border-rose-500/50 py-3.5 px-4 text-center text-rose-300 font-semibold text-xs tracking-wider font-serif animate-pulse"
      >
        🕊️ 성령께 맡겨드림 진행 중 — 인위적인 조작을 멈추고 성령 안에서 스스로 일어서는 공동체의 생명력을 지켜봅니다
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
    READY: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/40 hover:bg-emerald-400/25',
    FAIR: 'bg-amber-400/15 text-amber-200 border-amber-400/40 hover:bg-amber-400/25',
    LOW: 'bg-rose-500/15 text-rose-300 border-rose-500/40 hover:bg-rose-500/25',
  };

  const successionText = {
    READY: '파송 준비완료',
    FAIR: '양육 진행 중',
    LOW: '제자 성숙 필요',
  };

  return (
    <footer
      id="bottom-control-bar"
      className="relative z-30 w-full bg-[#121212]/95 backdrop-blur-md border-t border-white/10 px-4 py-2.5 text-[#F5F5F5] flex flex-col gap-2.5"
    >
      {/* Top Row: Attention Orbs & Priority Selector (전도 / 말씀 / 돌봄) & SEND Button */}
      <div className="max-w-5xl mx-auto w-full flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
        {/* Attention Charges: ●●● in Geometric Balance style */}
        <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 px-3.5 py-1 rounded-full">
          <span className="text-[10px] uppercase tracking-wider text-amber-300/80 font-bold">
            목회적 시선
          </span>
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map(idx => {
              const filled = attention >= idx + 1;
              const fractional = !filled && attention > idx ? attention - idx : 0;
              return (
                <div
                  key={idx}
                  className="relative w-4 h-4 rounded-full border border-amber-400/50 bg-black/50 overflow-hidden flex items-center justify-center shadow-inner"
                >
                  {filled ? (
                    <div className="w-full h-full bg-amber-400 shadow-[0_0_10px_#fbbf24] animate-pulse-glow" />
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

        {/* Community Priority: 선교 / 말씀 / 돌봄 */}
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-1 rounded-sm">
          <button
            id="priority-go"
            onClick={() => handlePriorityClick('GO')}
            disabled={priorityCooldown > 0 && currentPriority !== 'GO'}
            className={`flex items-center gap-1 px-3 py-1 text-xs font-mono font-semibold rounded-sm transition-all cursor-pointer ${
              currentPriority === 'GO'
                ? 'bg-cyan-400 text-black font-bold shadow-[0_0_15px_rgba(34,211,238,0.4)]'
                : 'text-white/50 hover:text-[#F5F5F5] hover:bg-white/5'
            } ${priorityCooldown > 0 && currentPriority !== 'GO' ? 'opacity-30 cursor-not-allowed' : ''}`}
            title="선교와 전도(GO) - 전도자의 외부 영혼 찾음과 새가족 유입 촉진"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>선교 (GO)</span>
          </button>

          <button
            id="priority-root"
            onClick={() => handlePriorityClick('ROOT')}
            disabled={priorityCooldown > 0 && currentPriority !== 'ROOT'}
            className={`flex items-center gap-1 px-3 py-1 text-xs font-mono font-semibold rounded-sm transition-all cursor-pointer ${
              currentPriority === 'ROOT'
                ? 'bg-indigo-400 text-black font-bold shadow-[0_0_15px_rgba(129,140,248,0.4)]'
                : 'text-white/50 hover:text-[#F5F5F5] hover:bg-white/5'
            } ${priorityCooldown > 0 && currentPriority !== 'ROOT' ? 'opacity-30 cursor-not-allowed' : ''}`}
            title="말씀과 뿌리(ROOT) - 교사의 말씀 양육으로 복음의 농도 심화"
          >
            <Sprout className="w-3.5 h-3.5" />
            <span>말씀 (ROOT)</span>
          </button>

          <button
            id="priority-care"
            onClick={() => handlePriorityClick('CARE')}
            disabled={priorityCooldown > 0 && currentPriority !== 'CARE'}
            className={`flex items-center gap-1 px-3 py-1 text-xs font-mono font-semibold rounded-sm transition-all cursor-pointer ${
              currentPriority === 'CARE'
                ? 'bg-emerald-400 text-black font-bold shadow-[0_0_15px_rgba(52,211,153,0.4)]'
                : 'text-white/50 hover:text-[#F5F5F5] hover:bg-white/5'
            } ${priorityCooldown > 0 && currentPriority !== 'CARE' ? 'opacity-30 cursor-not-allowed' : ''}`}
            title="돌봄과 회복(CARE) - 목자의 심방과 중보기도로 시험 완화"
          >
            <Heart className="w-3.5 h-3.5" />
            <span>돌봄 (CARE)</span>
          </button>

          {priorityCooldown > 0 && (
            <span className="text-[10px] text-white/40 font-mono px-1">
              {priorityCooldown}s
            </span>
          )}
        </div>

        {/* Strategic Action: SEND (분립 개척 파송) */}
        <button
          id="btn-open-send-modal"
          onClick={onOpenSendModal}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-sm border transition-all cursor-pointer ${successionColors[succession]} shadow-sm`}
        >
          <Send className="w-3.5 h-3.5" />
          <span className="tracking-wide">분립 개척 파송</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-black/40 font-mono">
            {successionText[succession]}
          </span>
        </button>
      </div>

      {/* Bottom Row: 3 Practice Hand Cards in Geometric Card Rail style */}
      <div className="max-w-5xl mx-auto w-full grid grid-cols-3 gap-2.5">
        {hand.map((card, idx) => {
          const isSelected = activeCardId === card.id;
          const canAfford = attention >= card.cost;

          return (
            <div
              key={card.id}
              id={`card-slot-${idx}`}
              onClick={() => {
                if (isSelected) {
                  onSelectCard(null);
                } else if (canAfford) {
                  onSelectCard(card.id);
                }
              }}
              className={`relative flex flex-col justify-between p-2.5 rounded-sm border transition-all cursor-pointer select-none ${
                isSelected
                  ? 'bg-amber-400/15 border-amber-400 border-l-4 shadow-[0_0_20px_rgba(251,191,36,0.15)] scale-[1.01]'
                  : canAfford
                  ? 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20 border-l-2 border-l-amber-400/60'
                  : 'bg-white/2 border-white/5 opacity-40 cursor-not-allowed'
              }`}
            >
              {/* Card Header: Icon, Name, Cost */}
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-amber-300 shrink-0">
                    {renderCardIcon(card.icon)}
                  </span>
                  <span className="font-semibold text-xs text-[#F5F5F5] truncate tracking-tight">
                    {card.koreanName.split(' ')[0]}
                  </span>
                </div>
                {/* Cost badge */}
                <div className="flex items-center gap-0.5 shrink-0 bg-black/60 border border-white/10 px-1.5 py-0.5 rounded-sm text-[10px] font-mono font-bold text-amber-300">
                  {card.cost} ●
                </div>
              </div>

              {/* Description */}
              <p className="text-[10px] text-white/50 line-clamp-2 mt-1.5 leading-tight font-sans">
                {card.description}
              </p>

              {/* Active prompt badge */}
              {isSelected && (
                <div className="text-[9px] font-bold text-amber-200 mt-1.5 bg-amber-400/20 border border-amber-400/40 py-0.5 rounded-sm text-center font-mono">
                  지체를 탭하세요
                </div>
              )}
            </div>
          );
        })}

        {/* Empty slots placeholders if hand < 3 */}
        {Array.from({ length: Math.max(0, 3 - hand.length) }).map((_, i) => (
          <div
            key={`empty_${i}`}
            className="flex items-center justify-center p-2.5 rounded-sm border border-dashed border-white/10 bg-white/2 text-white/30 text-xs font-mono"
          >
            카드를 기다리는 중...
          </div>
        ))}
      </div>
    </footer>
  );
};

function renderCardIcon(iconName: string) {
  switch (iconName) {
    case 'Utensils':
      return <Utensils className="w-3.5 h-3.5 text-amber-400" />;
    case 'BookOpen':
      return <BookOpen className="w-3.5 h-3.5 text-indigo-400" />;
    case 'Flame':
      return <Flame className="w-3.5 h-3.5 text-amber-500" />;
    case 'Heart':
      return <Heart className="w-3.5 h-3.5 text-emerald-400" />;
    case 'ShieldCheck':
      return <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />;
    case 'Sparkles':
      return <Sparkles className="w-3.5 h-3.5 text-pink-400" />;
    default:
      return <Sparkles className="w-3.5 h-3.5" />;
  }
}
