import React, { useState } from 'react';
import { GameEngine } from '../simulation/engine';
import { AlertCircle, HeartHandshake, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

interface CrisisInterventionBannerProps {
  engine: GameEngine;
  onFocusPerson: (personId: string) => void;
  onRescuePerson: (personId: string) => void;
}

export const CrisisInterventionBanner: React.FC<CrisisInterventionBannerProps> = ({
  engine,
  onFocusPerson,
  onRescuePerson,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const leavingPeople = engine.state.people.filter(
    p => !p.isExternal && p.movementState === 'LEAVING'
  );

  if (leavingPeople.length === 0) return null;

  const safeIndex = currentIndex >= leavingPeople.length ? 0 : currentIndex;
  const person = leavingPeople[safeIndex];
  if (!person) return null;

  const timerSec = Math.max(0, Math.ceil(person.leavingTimer || 0));
  const comm = engine.state.communities.find(c => c.id === person.communityId);
  const commName = comm?.name || '공동체';

  return (
    <div className="w-full max-w-xl animate-in fade-in slide-in-from-top-2 duration-200 pointer-events-auto">
      <div className="bg-gradient-to-r from-red-950/95 via-stone-900/95 to-amber-950/95 border-2 border-rose-500/80 rounded-md p-2.5 sm:p-3 shadow-[0_4px_25px_rgba(225,29,72,0.4)] backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-2.5 text-white">
        
        {/* Left: Info */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto min-w-0">
          <div className="relative flex-shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-rose-600/30 border border-rose-400/60 flex items-center justify-center animate-pulse">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400" />
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
          </div>

          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-serif font-bold text-rose-300 whitespace-nowrap shrink-0">
                🚨 이탈 위기 지체
              </span>
              <span className="text-[11px] font-bold text-amber-200 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-400/40 whitespace-nowrap shrink-0">
                {commName} · {person.name}
              </span>
              <span className="text-[11px] font-mono font-bold text-rose-200 bg-rose-900/80 px-2 py-0.5 rounded border border-rose-500/60 whitespace-nowrap shrink-0">
                ⏳ {timerSec}초 남음
              </span>
            </div>

            <p className="text-[11px] text-white/85 truncate max-w-xs mt-0.5 whitespace-nowrap">
              사유: <span className="text-amber-300 font-medium">{person.leavingReason || '영적 침체와 소진'}</span>
            </p>
          </div>

          {/* Multiple leaving members switcher */}
          {leavingPeople.length > 1 && (
            <div className="flex items-center gap-1 bg-black/40 px-1.5 py-1 rounded border border-white/10 text-[10px] font-mono shrink-0 whitespace-nowrap">
              <button
                onClick={() => setCurrentIndex(prev => (prev > 0 ? prev - 1 : leavingPeople.length - 1))}
                className="hover:text-amber-300 cursor-pointer"
                title="이전 지체"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span>{safeIndex + 1}/{leavingPeople.length}</span>
              <button
                onClick={() => setCurrentIndex(prev => (prev < leavingPeople.length - 1 ? prev + 1 : 0))}
                className="hover:text-amber-300 cursor-pointer"
                title="다음 지체"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
          <button
            id={`btn-banner-focus-${person.id}`}
            onClick={() => onFocusPerson(person.id)}
            className="flex-1 sm:flex-initial px-2.5 py-1.5 rounded bg-white/10 hover:bg-white/20 border border-white/20 text-white/90 text-xs font-serif flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap active:scale-95"
            title="카메라를 지체에게 이동"
          >
            <Eye className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="whitespace-nowrap">위치 찾기</span>
          </button>

          <button
            id={`btn-banner-rescue-${person.id}`}
            onClick={() => onRescuePerson(person.id)}
            className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white text-xs font-bold font-serif flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(244,63,94,0.5)] border border-rose-300 transition-all cursor-pointer whitespace-nowrap active:scale-95"
          >
            <HeartHandshake className="w-4 h-4 text-white shrink-0" />
            <span className="whitespace-nowrap">지체 붙잡기</span>
          </button>
        </div>
      </div>
    </div>
  );
};
