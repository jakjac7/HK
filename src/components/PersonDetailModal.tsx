/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Person, CallingType } from '../types';
import { CALLING_DEFINITIONS } from '../data/callings';
import {
  toStep10,
  getGenerationLabel,
  getGenerationBadgeStyle,
  getNeedDetails,
  FAITH_STATS,
} from '../utils/faithTerms';
import { X, Sparkles, BookOpen, Heart, Flame, Shield, User, Award, Edit2 } from 'lucide-react';

interface PersonDetailModalProps {
  person: Person | null;
  onClose: () => void;
  onDiscoverCalling?: (personId: string) => void;
}

export const PersonDetailModal: React.FC<PersonDetailModalProps> = ({
  person,
  onClose,
  onDiscoverCalling,
}) => {
  if (!person) return null;

  const callingInfo = person.calling ? CALLING_DEFINITIONS[person.calling] : null;
  const needDetail = person.need ? getNeedDetails(person.need.type) : null;
  const genLabel = getGenerationLabel(person.generation, person.isExternal, person.calling !== null);
  const genBadgeStyle = getGenerationBadgeStyle(person.generation, person.isExternal);

  // 1~10 step calculations
  const depthStep = toStep10(person.depth);
  const stabilityStep = toStep10(person.stability);
  const trustStep = toStep10(person.trust);
  const readinessStep = toStep10(person.readiness);
  const autonomyStep = toStep10(person.autonomy);
  const burnoutStep = toStep10(person.burnout);

  return (
    <div
      id="person-detail-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div
        id="person-detail-modal"
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-[#121212] border border-white/15 rounded-t-lg sm:rounded-md p-5 shadow-2xl text-[#F5F5F5] flex flex-col gap-4 animate-in slide-in-from-bottom duration-200"
      >
        {/* Header: Name, Gender, Generation (G0 = 개척멤버), Close */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center text-xl font-bold border border-white/20 bg-white/5 shadow-inner`}
            >
              {callingInfo ? callingInfo.symbol : '○'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-serif font-bold tracking-tight text-[#F5F5F5]">
                  {person.name}
                </h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-white/10 text-white/70 font-mono">
                  {person.gender === 'M' ? '형제' : '자매'}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-sm border font-mono font-semibold ${genBadgeStyle}`}
                >
                  {genLabel}
                </span>
              </div>
              <p className="text-xs text-white/60 mt-0.5 font-sans">
                {callingInfo
                  ? `${callingInfo.koreanName} (${callingInfo.name}) · ${callingInfo.strategicRole}`
                  : person.isExternal
                  ? '외부 구도자 (새가족 인도 대상)'
                  : '공동체 지체 (말씀 양육 진행 중)'}
              </p>
              {!person.isExternal && (
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-xs font-mono font-semibold ${
                    person.careStatus === 'CARED'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : person.careStatus === 'UNCARED'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                      : 'bg-white/10 text-white/50'
                  }`}>
                    {person.careStatus === 'CARED' ? '✓ 돌봄 받는 중' : person.careStatus === 'UNCARED' ? '! 돌봄 절실 (미돌봄)' : '돌봄 대기'}
                  </span>
                  {person.calling === 'SHEPHERD' && (
                    <span className="text-[10px] text-amber-300 font-mono">
                      담당 돌봄: {person.careLoad || 0} / 4명
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-sm hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Spiritual Need notice */}
        {person.need && needDetail && (
          <div className="bg-amber-400/10 border-l-3 border-amber-400 border-white/10 rounded-sm p-3 flex items-start gap-2.5 text-xs text-amber-200">
            <span className="text-base leading-none">⚠️</span>
            <div className="flex-1">
              <span className="font-bold text-amber-300 font-serif">
                [{needDetail.title}]
              </span>
              <p className="text-[11px] text-amber-200/90 mt-0.5 font-sans leading-relaxed">
                {needDetail.prescription}
              </p>
            </div>
          </div>
        )}

        {/* 1~10 Scale Spiritual Attributes */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-serif text-white/50 border-b border-white/5 pb-1">
            <span>영적 상태 및 능력치</span>
            <span className="font-mono text-[10px] text-amber-300/80">1~10단계 척도</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* DEPTH (Word) - User requirement specifically emphasized */}
            <div className="bg-white/5 p-2.5 rounded-sm border border-white/10 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center text-white/70 text-[11px] font-serif mb-1">
                  <span className="font-bold text-indigo-300">복음의 농도</span>
                  <span className="font-mono font-bold text-indigo-300">{depthStep} / 10단계</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-400" style={{ width: `${depthStep * 10}%` }} />
                </div>
              </div>
              <p className="text-[10px] text-indigo-200/60 mt-1.5 leading-tight font-sans">
                말씀: 성도색 농도가 아니라 복음의 농도가 깊어짐을 의미합니다
              </p>
            </div>

            {/* STABILITY (Care) */}
            <div className="bg-white/5 p-2.5 rounded-sm border border-white/10 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center text-white/70 text-[11px] font-serif mb-1">
                  <span className="font-bold text-emerald-300">사랑의 정착</span>
                  <span className="font-mono font-bold text-emerald-300">{stabilityStep} / 10단계</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400" style={{ width: `${stabilityStep * 10}%` }} />
                </div>
              </div>
              <p className="text-[10px] text-white/40 mt-1.5 leading-tight font-sans">
                돌봄: 공동체 안에서 누리는 평안과 정서적 안착
              </p>
            </div>

            {/* TRUST */}
            <div className="bg-white/5 p-2.5 rounded-sm border border-white/10 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center text-white/70 text-[11px] font-serif mb-1">
                  <span className="font-bold text-sky-300">지체 간 신뢰</span>
                  <span className="font-mono font-bold text-sky-300">{trustStep} / 10단계</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-sky-400" style={{ width: `${trustStep * 10}%` }} />
                </div>
              </div>
              <p className="text-[10px] text-white/40 mt-1.5 leading-tight font-sans">
                서로를 내 몸처럼 믿고 사랑하는 친밀한 교제
              </p>
            </div>

            {/* READINESS */}
            <div className="bg-white/5 p-2.5 rounded-sm border border-white/10 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center text-white/70 text-[11px] font-serif mb-1">
                  <span className="font-bold text-amber-300">사역 헌신도</span>
                  <span className="font-mono font-bold text-amber-300">{readinessStep} / 10단계</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400" style={{ width: `${readinessStep * 10}%` }} />
                </div>
              </div>
              <p className="text-[10px] text-white/40 mt-1.5 leading-tight font-sans">
                다른 지체를 섬기고 제자로 훈련받을 준비됨
              </p>
            </div>

            {/* AUTONOMY */}
            <div className="bg-white/5 p-2.5 rounded-sm border border-white/10 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center text-white/70 text-[11px] font-serif mb-1">
                  <span className="font-bold text-violet-300">성령충만</span>
                  <span className="font-mono font-bold text-violet-300">{autonomyStep} / 10단계</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-violet-400" style={{ width: `${autonomyStep * 10}%` }} />
                </div>
              </div>
              <p className="text-[10px] text-white/40 mt-1.5 leading-tight font-sans">
                사람의 지시 없이 성령 안에서 스스로 섬기는 힘
              </p>
            </div>

            {/* BURNOUT */}
            <div className="bg-white/5 p-2.5 rounded-sm border border-white/10 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center text-white/70 text-[11px] font-serif mb-1">
                  <span className={`font-bold ${burnoutStep >= 6 ? 'text-rose-400' : 'text-white/70'}`}>
                    영적 지침 (피로)
                  </span>
                  <span
                    className={`font-mono font-bold ${
                      burnoutStep >= 6 ? 'text-rose-400' : 'text-white/70'
                    }`}
                  >
                    {burnoutStep} / 10단계
                  </span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${burnoutStep >= 6 ? 'bg-rose-500' : 'bg-white/30'}`}
                    style={{ width: `${burnoutStep * 10}%` }}
                  />
                </div>
              </div>
              <p className="text-[10px] text-white/40 mt-1.5 leading-tight font-sans">
                소진된 심령 (기도와 안식의 쉼이 필요합니다)
              </p>
            </div>
          </div>
        </div>

        {/* Fruit & Ministry Contribution */}
        {person.contribution && (person.contribution.reachedCount > 0 || person.contribution.caredCount > 0 || person.contribution.trainedCount > 0) && (
          <div className="bg-white/5 border border-white/10 rounded-sm p-2.5 flex items-center justify-between text-[11px] font-mono">
            <span className="text-white/50 font-serif flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              사역의 열매:
            </span>
            <div className="flex gap-2.5 text-amber-200">
              {person.contribution.reachedCount > 0 && <span>전도 {person.contribution.reachedCount}명</span>}
              {person.contribution.caredCount > 0 && <span>돌봄 {person.contribution.caredCount}명</span>}
              {person.contribution.trainedCount > 0 && <span>양육 {person.contribution.trainedCount}명</span>}
            </div>
          </div>
        )}

        {/* Calling & Discipleship Status */}
        {!person.isExternal && (
          <div className="bg-white/5 border border-white/10 rounded-sm p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-serif font-bold text-[#F5F5F5] tracking-wide">
                은사 및 사역 현황
              </span>
              {(!person.calling) && onDiscoverCalling && (
                <button
                  onClick={() => onDiscoverCalling(person.id)}
                  className="flex items-center gap-1 text-[10px] bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 px-2 py-1 rounded-sm transition-colors border border-amber-500/30"
                >
                  <Sparkles className="w-3 h-3" />
                  은사 발견 및 사역 배치
                </button>
              )}
            </div>

            {!person.calling ? (
              <p className="text-[11px] text-white/50 font-sans">
                아직 직분이 없습니다. 말씀과 양육(행동카드)을 통해 훈련을 받으면 5가지 직분 중 하나로 세워질 수 있습니다.
              </p>
            ) : (
              <p className="text-[11px] text-white/50 font-sans">
                {callingInfo?.koreanName}의 부르심을 받아 충성되이 그리스도의 몸을 세워가고 있습니다.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
