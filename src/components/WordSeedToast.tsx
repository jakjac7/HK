/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sprout, Sparkles } from 'lucide-react';

interface WordSeedToastProps {
  visible: boolean;
}

export const WordSeedToast: React.FC<WordSeedToastProps> = ({ visible }) => {
  return (
    <div
      id="word-seed-toast"
      aria-live="polite"
      className={`fixed top-14 sm:top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-700 ease-out flex items-center justify-center ${
        visible
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 -translate-y-3 scale-95'
      }`}
    >
      <div className="flex items-center gap-2.5 px-4 sm:px-5 py-2 rounded-full bg-slate-950/90 border border-amber-400/40 shadow-[0_8px_30px_rgba(251,191,36,0.28)] backdrop-blur-md text-amber-100 select-none">
        <div className="w-5 h-5 rounded-full bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-300">
          <Sprout className="w-3.5 h-3.5 animate-pulse text-amber-400" />
        </div>
        
        <span className="font-serif font-bold text-xs sm:text-sm tracking-tight text-[#FFF7ED]">
          말씀의 씨앗이 심겨졌습니다
        </span>

        <span className="hidden md:inline text-[11px] text-amber-300/60 font-sans pl-1 border-l border-amber-400/20">
          심령에 진리의 복음이 뿌리내립니다
        </span>

        <Sparkles className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
      </div>
    </div>
  );
};
