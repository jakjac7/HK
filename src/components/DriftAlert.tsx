/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Community } from '../types';
import { AlertCircle, Eye, ShieldAlert, Sparkles } from 'lucide-react';

interface DriftAlertProps {
  communities: Community[];
}

export const DriftAlert: React.FC<DriftAlertProps> = ({ communities }) => {
  const activeDrifts = communities.filter(c => c.drift !== null);

  if (activeDrifts.length === 0) return null;

  return (
    <div id="drift-alerts-container" className="w-full max-w-xl flex flex-col gap-1.5 pointer-events-none items-center">
      {activeDrifts.map(comm => {
        const drift = comm.drift!;
        const isDeception = drift.type === 'DECEPTION';
        const isDivision = drift.type === 'DIVISION';
        const isBurnout = drift.type === 'BURNOUT';

        let borderClass = 'border-l-4 border-amber-400 text-amber-200';
        let Icon = AlertCircle;
        let remedyAction = '말씀(WORD) 또는 사역';

        if (isDeception) {
          borderClass = drift.discovered
            ? 'border-l-4 border-indigo-400 text-indigo-200'
            : 'border-l-4 border-purple-400 text-purple-200';
          Icon = Eye;
          remedyAction = drift.discovered ? '말씀(WORD) 선포 필요' : '교사의 분별 진행 중';
        } else if (isDivision) {
          borderClass = 'border-l-4 border-rose-500 text-rose-200';
          Icon = ShieldAlert;
          remedyAction = '식탁 교제(FELLOWSHIP) 필요';
        } else if (isBurnout) {
          borderClass = 'border-l-4 border-amber-500 text-amber-200';
          Icon = AlertCircle;
          remedyAction = '심방(CARE) 및 기도(PRAYER) 필요';
        } else {
          remedyAction = '예배(WORSHIP) 및 선교(GO) 필요';
        }

        return (
          <div
            key={comm.id}
            className={`pointer-events-auto max-w-xl mx-auto w-full p-2.5 rounded-sm border border-white/10 bg-[#121212]/95 backdrop-blur-md shadow-xl flex items-center justify-between gap-3 text-xs ${borderClass} animate-in slide-from-top duration-300`}
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
                  {isDeception && !drift.discovered && drift.detectionProgress !== undefined && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-sm bg-purple-500/20 text-purple-300 border border-purple-400/30 font-mono font-semibold">
                      교사 분별 {Math.round(drift.detectionProgress)}%
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-white/60 truncate mt-0.5 font-sans">{drift.description}</p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-sm bg-white/5 border border-white/10 text-white/80 font-mono text-[11px]">
              <span className="text-amber-300 font-semibold">{remedyAction}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
