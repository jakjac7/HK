/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GameEngine } from '../simulation/engine';
import { Person, SuccessionStatus } from '../types';
import { CALLING_DEFINITIONS } from '../data/callings';
import { getGenerationLabel } from '../utils/faithTerms';
import { X, Send, AlertTriangle, Compass, ArrowUp, ArrowRight, ArrowDown, ArrowLeft } from 'lucide-react';

interface SendModalProps {
  engine: GameEngine;
  onClose: () => void;
  onSend: (leaderId: string, direction: 'NORTH' | 'EAST' | 'SOUTH' | 'WEST') => void;
}

export const SendModal: React.FC<SendModalProps> = ({ engine, onClose, onSend }) => {
  const { communities, people } = engine.state;
  const primaryComm = communities[0];

  const succession: SuccessionStatus = primaryComm
    ? engine.evaluateSuccession(primaryComm.id)
    : 'LOW';

  // Find mature leaders in community
  const qualifiedLeaders = people.filter(
    p => p.communityId === primaryComm?.id && p.calling !== null && !p.isBeingSent
  );

  const [selectedLeaderId, setSelectedLeaderId] = useState<string>(
    qualifiedLeaders[0]?.id || ''
  );
  const [selectedDirection, setSelectedDirection] = useState<'NORTH' | 'EAST' | 'SOUTH' | 'WEST'>('EAST');

  const selectedLeader = qualifiedLeaders.find(p => p.id === selectedLeaderId);

  const handleConfirmSend = () => {
    if (!selectedLeaderId) return;
    onSend(selectedLeaderId, selectedDirection);
    onClose();
  };

  const successionBadges = {
    READY: { label: '영적 계승 준비 완료', color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40' },
    FAIR: { label: '제자 양육 진행 중', color: 'text-amber-400 bg-amber-500/20 border-amber-500/40' },
    LOW: { label: '영적 미성숙 (조기 분립 위험)', color: 'text-rose-400 bg-rose-500/20 border-rose-500/40' },
  };

  return (
    <div
      id="send-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        id="send-modal"
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-[#121212] border border-white/10 rounded-sm sm:rounded-md p-5 shadow-2xl text-[#F5F5F5] flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-sm bg-white/5 text-amber-300 border border-white/10">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-serif font-bold tracking-tight text-[#F5F5F5]">
                분립 개척과 선교적 파송
              </h3>
              <p className="text-xs text-white/50">새로운 지경에 복음의 생명력 있는 교회를 개척합니다</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-sm hover:bg-white/10 text-white/40 hover:text-white/80 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Succession Readiness Status */}
        <div className={`p-3 rounded-sm border flex items-start gap-2.5 ${successionBadges[succession].color}`}>
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold">{successionBadges[succession].label}</span>
            <p className="text-[11px] mt-0.5 opacity-90 leading-relaxed">
              {succession === 'READY'
                ? '공동체 내에 차세대 제자 리더가 든든히 서 있어, 파송 후에도 모교회의 몸이 흔들리지 않습니다.'
                : succession === 'FAIR'
                ? '파송은 가능하나 남은 모교회의 돌봄과 양육에 일시적인 공백이 생길 수 있습니다.'
                : '리더십 계층이 아직 얇습니다. 지금 파송하면 모교회의 돌봄에 심각한 위기가 올 수 있습니다.'}
            </p>
          </div>
        </div>

        {/* Step 1: Select Leader */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-serif font-semibold text-white/70">1. 개척을 이끌 제자 리더 선택</label>
          {qualifiedLeaders.length === 0 ? (
            <p className="text-xs text-rose-300 bg-rose-500/10 p-2.5 rounded-sm border border-rose-500/30 font-mono">
              현재 파송 가능한 성숙한 은사 리더가 없습니다. 제자 훈련을 통해 먼저 리더를 세우세요.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
              {qualifiedLeaders.map(leader => {
                const info = leader.calling ? CALLING_DEFINITIONS[leader.calling] : null;
                const isSelected = selectedLeaderId === leader.id;
                const genText = getGenerationLabel(leader.generation, leader.isExternal, true);
                return (
                  <button
                    key={leader.id}
                    onClick={() => setSelectedLeaderId(leader.id)}
                    className={`flex items-center gap-2 p-2 rounded-sm border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-400/15 border-amber-400 border-l-2'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <span className="text-base">{info?.symbol}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-xs text-[#F5F5F5] truncate">{leader.name}</div>
                      <div className="text-[10px] text-white/50 font-mono">{genText} · {info?.koreanName}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Step 2: Select Direction */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-serif font-semibold text-white/70">2. 분립 개척 방향</label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { dir: 'NORTH' as const, label: '북쪽', icon: <ArrowUp className="w-3.5 h-3.5" /> },
              { dir: 'EAST' as const, label: '동쪽', icon: <ArrowRight className="w-3.5 h-3.5" /> },
              { dir: 'SOUTH' as const, label: '남쪽', icon: <ArrowDown className="w-3.5 h-3.5" /> },
              { dir: 'WEST' as const, label: '서쪽', icon: <ArrowLeft className="w-3.5 h-3.5" /> },
            ].map(item => (
              <button
                key={item.dir}
                onClick={() => setSelectedDirection(item.dir)}
                className={`flex flex-col items-center justify-center p-2 rounded-sm border transition-all cursor-pointer ${
                  selectedDirection === item.dir
                    ? 'bg-amber-400/20 border-amber-400 text-amber-200 font-bold'
                    : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80'
                }`}
              >
                {item.icon}
                <span className="text-xs font-mono mt-1">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Transmission Principle Reminder */}
        <div className="bg-white/5 p-2.5 rounded-sm border border-white/10 text-[11px] text-white/60 flex items-center gap-2">
          <Compass className="w-4 h-4 text-amber-300 shrink-0" />
          <span>
            영적 전수 원리: <strong className="text-[#F5F5F5] font-serif">"우리는 우리의 어떠함을 낳는다."</strong> 새 개척지는 모교회(60%)와 파송 리더(40%)의 신앙의 깊이를 그대로 물려받습니다.
          </span>
        </div>

        {/* Confirm Action */}
        <button
          onClick={handleConfirmSend}
          disabled={!selectedLeaderId || communities.length >= 3}
          className="w-full py-2.5 rounded-sm font-bold text-xs bg-amber-400 hover:bg-amber-300 text-black shadow-[0_0_20px_rgba(251,191,36,0.25)] transition-all disabled:opacity-30 disabled:cursor-not-allowed font-mono uppercase tracking-wider cursor-pointer"
        >
          {communities.length >= 3
            ? '최대 개척 교회 수(3곳)에 도달했습니다'
            : selectedLeader
            ? `${selectedLeader.name} 리더를 ${selectedDirection} 방향으로 파송하기`
            : '파송할 리더를 선택하세요'}
        </button>
      </div>
    </div>
  );
};
