/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CALLING_DEFINITIONS } from '../data/callings';
import { X, BookOpen, Compass, Heart, Flame, Sparkles, Send, Eye, ShieldCheck } from 'lucide-react';

interface TutorialGuideModalProps {
  onClose: () => void;
}

export const TutorialGuideModal: React.FC<TutorialGuideModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'CALLINGS' | 'PRINCIPLES' | 'FLOW'>('CALLINGS');

  return (
    <div
      id="tutorial-guide-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-hidden"
    >
      <div
        id="tutorial-guide-modal"
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg max-h-[min(90vh,620px)] sm:max-h-[85vh] bg-[#121212] border border-white/15 rounded-md shadow-2xl text-[#F5F5F5] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Sticky Header */}
        <div className="shrink-0 flex flex-col gap-3 border-b border-white/10 px-4 py-3 bg-[#161616]">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold font-mono text-amber-400 tracking-widest uppercase">
                HIS KINGDOM · PRINCIPLE GUIDE
              </span>
              <h2 className="text-base sm:text-lg font-serif font-extrabold mt-0.5 tracking-tight text-[#F5F5F5]">
                그리스도의 몸과 공동체 원리
              </h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-sm hover:bg-white/10 text-white/40 hover:text-white/80 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Selector in Geometric Balance style */}
          <div className="flex rounded-sm bg-white/5 p-1 border border-white/10 text-xs font-mono">
            <button
              onClick={() => setActiveTab('CALLINGS')}
              className={`flex-1 py-1.5 rounded-sm font-semibold transition-all ${
                activeTab === 'CALLINGS'
                  ? 'bg-amber-400 text-black font-bold shadow-[0_0_15px_rgba(251,191,36,0.3)]'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              5대 은사 (Callings)
            </button>
            <button
              onClick={() => setActiveTab('FLOW')}
              className={`flex-1 py-1.5 rounded-sm font-semibold transition-all ${
                activeTab === 'FLOW'
                  ? 'bg-amber-400 text-black font-bold shadow-[0_0_15px_rgba(251,191,36,0.3)]'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              시각적 흐름 (Visual)
            </button>
            <button
              onClick={() => setActiveTab('PRINCIPLES')}
              className={`flex-1 py-1.5 rounded-sm font-semibold transition-all ${
                activeTab === 'PRINCIPLES'
                  ? 'bg-amber-400 text-black font-bold shadow-[0_0_15px_rgba(251,191,36,0.3)]'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              핵심 원리 & 파송
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-3.5 min-h-0 text-left">

        {/* Tab 1: 5 Callings */}
        {activeTab === 'CALLINGS' && (
          <div className="flex flex-col gap-2.5 max-h-96 overflow-y-auto pr-1 text-xs">
            {Object.values(CALLING_DEFINITIONS).map(calling => (
              <div
                key={calling.type}
                className="bg-white/5 p-3 rounded-sm border border-white/10 flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{calling.symbol}</span>
                    <div>
                      <span className="font-serif font-bold text-[#F5F5F5]">{calling.koreanName}</span>
                      <span className="text-white/50 text-[11px] font-mono ml-1.5">({calling.name})</span>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-sm font-mono border border-white/10 ${calling.bgLight} ${calling.textColor} font-semibold`}>
                    {calling.strategicRole}
                  </span>
                </div>

                <p className="text-white/70 leading-relaxed text-[11px] font-sans">{calling.description}</p>

                <div className="grid grid-cols-2 gap-1.5 bg-black/40 p-2 rounded-sm border border-white/5 text-[10px] text-white/50 font-mono">
                  <div>
                    <strong className="text-white/80">움직임: </strong>
                    {calling.movementProfile}
                  </div>
                  <div>
                    <strong className="text-white/80">시각 효과: </strong>
                    {calling.visualEffect}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Visual Mappings */}
        {activeTab === 'FLOW' && (
          <div className="flex flex-col gap-3 text-xs">
            <p className="text-white/70 leading-relaxed text-[11px] font-serif">
              HIS KINGDOM은 단순한 수치 조작 게임이 아닙니다. 화면의 유기적 파동과 색채는 그리스도의 몸 된 공동체 안에서 역사하는 성령의 생명력을 시각적으로 표현합니다. (모든 능력치는 1~10단계로 성장합니다)
            </p>

            <div className="grid grid-cols-1 gap-2">
              <div className="bg-white/5 p-2.5 rounded-sm border border-white/10 border-l-2 border-l-indigo-400 flex items-start gap-2.5">
                <BookOpen className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-serif font-bold text-indigo-300 text-xs">
                    말씀 (WORD) → 복음의 농도가 깊어짐 (1~10단계)
                  </div>
                  <p className="text-[11px] text-white/70 mt-0.5 font-sans leading-relaxed">
                    말씀: 성도색 농도가 아니라 복음의 농도가 깊어짐을 의미합니다. 교사의 말씀 양육을 통해 지체의 영혼 속에 십자가 복음의 진리가 깊이 뿌리내려 거짓 가르침을 분별하는 장성한 제자로 자라납니다.
                  </p>
                </div>
              </div>

              <div className="bg-white/5 p-2.5 rounded-sm border border-white/10 border-l-2 border-l-emerald-400 flex items-start gap-2.5">
                <Heart className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-serif font-bold text-emerald-300 text-xs">
                    돌봄 (CARE) → 사랑의 섬김과 정착 (1~10단계)
                  </div>
                  <p className="text-[11px] text-white/70 mt-0.5 font-sans leading-relaxed">
                    목자가 경계 외곽의 낙심한 영혼을 찾아 심방하고 사랑으로 품어, 시험에 든 지체가 다시 공동체의 따스한 품으로 안착하도록 돕습니다.
                  </p>
                </div>
              </div>

              <div className="bg-white/5 p-2.5 rounded-sm border border-white/10 border-l-2 border-l-pink-400 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-serif font-bold text-pink-300 text-xs">
                    예배 (WORSHIP) → 거룩한 임재와 감격 (1~10단계)
                  </div>
                  <p className="text-[11px] text-white/70 mt-0.5 font-sans leading-relaxed">
                    예배자가 온 맘 다해 찬양할 때 흩어진 지체들의 시선이 주님께 모이며, 하나님 나라의 거룩한 임재와 영적 감격이 뚜렷해집니다.
                  </p>
                </div>
              </div>

              <div className="bg-white/5 p-2.5 rounded-sm border border-white/10 border-l-2 border-l-amber-400 flex items-start gap-2.5">
                <Flame className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-serif font-bold text-amber-300 text-xs">
                    기도 (PRAYER) → 은혜의 품과 시험 이김 (1~10단계)
                  </div>
                  <p className="text-[11px] text-white/70 mt-0.5 font-sans leading-relaxed">
                    중보기도자가 영적 시험과 탈진의 자리에서 무릎 꿇어 부르짖음으로써, 공동체가 찢어지지 않고 더 많은 영혼을 품는 은혜의 수용력을 넓힙니다.
                  </p>
                </div>
              </div>

              <div className="bg-white/5 p-2.5 rounded-sm border border-white/10 border-l-2 border-l-cyan-400 flex items-start gap-2.5">
                <Compass className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-serif font-bold text-cyan-300 text-xs">
                    선교 (MISSION) → 잃은 양을 향한 발걸음 (1~10단계)
                  </div>
                  <p className="text-[11px] text-white/70 mt-0.5 font-sans leading-relaxed">
                    전도자가 복음의 울타리를 넘어 세상 속 잃은 양에게 나아가 주님의 사랑을 전하고 새가족으로 품어 들입니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Core Principles & Release */}
        {activeTab === 'PRINCIPLES' && (
          <div className="flex flex-col gap-3 text-xs leading-relaxed">
            <div className="bg-white/5 p-3 rounded-sm border border-white/10 flex flex-col gap-1.5">
              <span className="font-serif font-bold text-cyan-300 text-xs flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                성도는 도구가 아닌 자율적 생명체입니다
              </span>
              <p className="text-white/70 text-[11px] font-sans">
                목회자는 성도를 인위적으로 조종할 수 없습니다. 은사를 세우고, 공동체의 목회적 우선순위(선교/말씀/돌봄)를 인도하며, 말씀과 기도 카드로 영적 토양을 가꿀 뿐입니다.
              </p>
            </div>

            <div className="bg-white/5 p-3 rounded-sm border border-white/10 flex flex-col gap-1.5">
              <span className="font-serif font-bold text-amber-300 text-xs flex items-center gap-1.5">
                <Send className="w-4 h-4 text-amber-400" />
                개척멤버(G0)로부터 이어지는 제자 재생산과 분립 개척
              </span>
              <p className="text-white/70 text-[11px] font-sans">
                하나의 교회에 안주하지 않고 개척멤버를 이어 세워진 1대·2대 제자 리더를 파송하여 새로운 분립 개척 교회를 세웁니다. 우리는 우리의 어떠함을 낳기에 영적 계승 준비가 되었을 때 파송해야 합니다.
              </p>
            </div>

            <div className="bg-white/5 p-3 rounded-sm border border-white/10 flex flex-col gap-1.5">
              <span className="font-serif font-bold text-rose-300 text-xs flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-rose-400" />
                09:00 성령께 온전히 맡겨드림
              </span>
              <p className="text-white/70 text-[11px] font-sans">
                사역의 마지막 30초 동안 인간의 모든 인위적 개입이 멈춥니다. 사역자가 주님께 온전히 맡겨드려도, 참된 주님의 교회는 성령 안에서 스스로 전도하고 사랑하고 가르치며 살아 숨 쉽니다.
              </p>
            </div>
          </div>
        )}
        </div>

        {/* Sticky Footer */}
        <div className="shrink-0 p-3 sm:p-4 border-t border-white/10 bg-[#161616]">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-sm font-bold text-xs bg-amber-400 hover:bg-amber-300 text-black shadow-[0_0_20px_rgba(251,191,36,0.25)] transition-all font-mono uppercase tracking-wider cursor-pointer"
          >
            확인하고 사역으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
};
