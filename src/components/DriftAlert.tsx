/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Community } from '../types';
import { AlertCircle, Eye, ShieldAlert, Sparkles } from 'lucide-react';

interface DriftAlertProps {
  communities: Community[];
  onResolveDrift?: (commId: string, type: 'DECEPTION' | 'DIVISION' | 'BURNOUT') => void;
}

export const DriftAlert: React.FC<DriftAlertProps> = ({ communities, onResolveDrift }) => {
  const activeDrifts = communities.filter(c => c.drift !== null);

  if (activeDrifts.length === 0) return null;

  return (
    <div id="drift-alerts-container" className="absolute top-28 left-3 right-3 z-40 flex flex-col gap-2 pointer-events-none">
      {activeDrifts.map(comm => {
        const drift = comm.drift!;
        const isDeception = drift.type === 'DECEPTION';
        const isDivision = drift.type === 'DIVISION';
        const isBurnout = drift.type === 'BURNOUT';

        let borderClass = 'border-l-4 border-amber-400 text-amber-200';
        let Icon = AlertCircle;

        if (isDeception) {
          borderClass = drift.discovered
            ? 'border-l-4 border-indigo-400 text-indigo-200'
            : 'border-l-4 border-purple-400 text-purple-200';
          Icon = Eye;
        } else if (isDivision) {
          borderClass = 'border-l-4 border-rose-500 text-rose-200';
          Icon = ShieldAlert;
        }

        return (
          <div
            key={comm.id}
            className={`pointer-events-auto max-w-xl mx-auto w-full p-2.5 rounded-sm border border-white/10 bg-[#121212]/95 backdrop-blur-md shadow-xl flex items-center justify-between gap-3 text-xs ${borderClass} animate-in slide-in-from-top duration-300`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Icon className="w-4 h-4 shrink-0" />
              <div className="min-w-0">
                <div className="font-serif font-bold flex items-center gap-1.5 truncate text-[#F5F5F5]">
                  <span>[{comm.name}] {drift.title}</span>
                  {isDeception && drift.discovered && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-sm bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 font-mono font-semibold">
                      교사 분별 완료
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-white/60 truncate mt-0.5 font-sans">{drift.description}</p>
              </div>
            </div>

            <button
              onClick={() => onResolveDrift && onResolveDrift(comm.id, drift.type)}
              className="shrink-0 text-[10px] font-mono font-semibold px-2 py-1 rounded-sm bg-white/10 hover:bg-white/20 border border-white/20 text-white/90 transition-colors cursor-pointer active:scale-95"
            >
              {isDeception ? '복음 진리 선포 (시선 -1)' : isDivision ? '십자가 화해 필요 (시선 -1)' : '중보기도/안식 (시선 -1)'}
            </button>
          </div>
        );
      })}
    </div>
  );
};
