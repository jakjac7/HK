/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Person, CallingType, Community } from '../types';
import { CALLING_DEFINITIONS } from '../data/callings';
import {
  toFaithGrade5,
  getGenerationLabel,
  getGenerationBadgeStyle,
  getNeedDetails,
  FAITH_STATS,
} from '../utils/faithTerms';
import { CallingSystem } from '../systems/CallingSystem';
import { X, Sparkles, BookOpen, Heart, Flame, Shield, User, Award, Edit2, Send, HeartHandshake, MapPin } from 'lucide-react';

interface PersonDetailModalProps {
  person: Person | null;
  community?: Community | null;
  onClose: () => void;
  onDiscoverCalling?: (personId: string, specificCalling?: CallingType) => void;
  onSendLeader?: (personId: string) => void;
  onRescuePerson?: (personId: string) => void;
}

export const PersonDetailModal: React.FC<PersonDetailModalProps> = ({
  person,
  community,
  onClose,
  onDiscoverCalling,
  onSendLeader,
  onRescuePerson,
}) => {
  if (!person) return null;

  const isAutonomous = community ? (community.isAutonomous || community.isIndependent) : false;
  const callingInfo = person.calling ? CALLING_DEFINITIONS[person.calling] : null;
  const needDetail = person.need ? getNeedDetails(person.need.type) : null;
  const genLabel = getGenerationLabel(person.generation, person.isExternal, person.calling !== null);
  const genBadgeStyle = getGenerationBadgeStyle(person.generation, person.isExternal);

  // 5-stage abstract qualitative grades (매우나쁨 · 나쁨 · 보통 · 좋음 · 아주좋음)
  const depthGrade = toFaithGrade5(person.depth);
  const stabilityGrade = toFaithGrade5(person.stability);
  const trustGrade = toFaithGrade5(person.trust);
  const readinessGrade = toFaithGrade5(person.readiness);
  const autonomyGrade = toFaithGrade5(person.autonomy);
  const burnoutGrade = toFaithGrade5(person.burnout, true); // true = inverted (낮을수록 평안/안식)

  return (
    <div
      id="person-detail-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden"
    >
      <div
        id="person-detail-modal"
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md max-h-[min(90vh,620px)] sm:max-h-[85vh] bg-[#121212]/95 backdrop-blur-xl border border-white/15 rounded-t-2xl sm:rounded-2xl shadow-2xl text-[#F5F5F5] flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
      >
        {/* Sticky Header: Name, Gender, Generation, Close */}
        <div className="shrink-0 flex items-center justify-between border-b border-white/10 px-4 py-3 bg-[#161616]">
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
                {person.routine?.personaTitle && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 font-mono">
                    {person.routine.personaTitle}
                  </span>
                )}
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-sm border font-mono font-semibold ${genBadgeStyle}`}
                >
                  {genLabel}
                </span>
              </div>

              {/* Community Affiliation (소속 공동체) */}
              <div className="flex items-center gap-1.5 mt-1">
                {community ? (
                  <>
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-white/30"
                      style={{ backgroundColor: community.colorBase }}
                    />
                    <span className="text-xs font-serif font-bold text-white/95 truncate">
                      {community.name}
                    </span>
                    {isAutonomous ? (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-xs bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 font-mono shrink-0">
                        독립 자율 공동체
                      </span>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-xs bg-indigo-500/25 text-indigo-300 border border-indigo-500/40 font-mono shrink-0">
                        모교회 직속
                      </span>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-white/60">
                    <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                    <span>외부 구도자 (새가족 인도 대상)</span>
                  </div>
                )}
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

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-3.5 min-h-0 text-left">

        {/* Urgent LEAVING Crisis alert and immediate Rescue button */}
        {person.movementState === 'LEAVING' && (
          <div className="bg-rose-950/70 border border-rose-500 rounded-sm p-3 flex flex-col gap-2.5 text-xs text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.35)]">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="font-bold text-rose-300 font-serif flex items-center gap-1.5 text-sm">
                  🚨 공동체 이탈 위기 (이유: {person.leavingReason || '심적 갈등과 외로움'})
                </span>
                <p className="text-[11px] text-rose-200/90 mt-1 font-sans">
                  지체가 마음의 상처나 환경적 전환으로 공동체를 떠나려 하고 있습니다. 남은 시간: <span className="font-mono font-bold text-amber-300">{Math.max(0, Math.ceil(person.leavingTimer || 0))}초</span>
                </p>
              </div>
            </div>
            {isAutonomous ? (
              <div className="w-full py-2 px-3 rounded-sm text-[11px] bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-center font-sans">
                🛡️ 독립 자율 공동체: 현지 목회진과 사역자가 자율적으로 지체를 심방하고 품고 있습니다.
              </div>
            ) : (
              onRescuePerson && (
                <button
                  id={`btn-modal-rescue-${person.id}`}
                  onClick={() => {
                    onRescuePerson(person.id);
                    onClose();
                  }}
                  className="w-full py-2 px-3 rounded-sm font-bold text-xs bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white border border-rose-400 flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-95"
                >
                  <HeartHandshake className="w-4 h-4 text-white" />
                  <span>지금 따뜻하게 붙잡기 (긴급 심방 & 중보)</span>
                </button>
              )
            )}
          </div>
        )}

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

        {/* 5-Stage Abstract Spiritual Attributes */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-serif text-white/50 border-b border-white/5 pb-1">
            <span>영적 상태 및 능력치</span>
            <span className="text-[10px] text-amber-300/80 font-sans">5단계 질적 척도</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* DEPTH (Word) */}
            <div className="bg-white/5 p-2.5 rounded-sm border border-white/10 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center text-[11px] font-serif mb-1.5">
                  <span className="font-bold text-indigo-300">깊이</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-xs font-bold border ${depthGrade.badge}`}>
                    {depthGrade.grade}
                  </span>
                </div>
                <div className="w-full h-1.5 flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(lvl => (
                    <div
                      key={lvl}
                      className={`flex-1 h-full rounded-xs transition-all ${
                        lvl <= depthGrade.level ? 'bg-indigo-400' : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-indigo-200/60 mt-1.5 leading-tight font-sans">
                말씀: 복음의 진리를 분별하고 뿌리내림
              </p>
            </div>

            {/* FORMATION (Discipleship) */}
            <div className="bg-white/5 p-2.5 rounded-sm border border-white/10 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center text-[11px] font-serif mb-1.5">
                  <span className="font-bold text-orange-300">양육 (형성도)</span>
                  <span className={`text-[10px] font-mono font-bold text-orange-200`}>
                    {Math.floor(person.formationProgress ?? 0)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-xs flex overflow-hidden">
                  <div
                    className="h-full bg-orange-400 transition-all duration-700 ease-out"
                    style={{ width: `${Math.min(100, person.formationProgress ?? 0)}%` }}
                  />
                </div>
              </div>
              <p className="text-[10px] text-white/40 mt-1.5 leading-tight font-sans">
                멘토: 근거리 관계를 통한 인격적 성숙
              </p>
            </div>

            {/* STABILITY (Care) */}
            <div className="bg-white/5 p-2.5 rounded-sm border border-white/10 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center text-[11px] font-serif mb-1.5">
                  <span className="font-bold text-emerald-300">사랑의 정착</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-xs font-bold border ${stabilityGrade.badge}`}>
                    {stabilityGrade.grade}
                  </span>
                </div>
                <div className="w-full h-1.5 flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(lvl => (
                    <div
                      key={lvl}
                      className={`flex-1 h-full rounded-xs transition-all ${
                        lvl <= stabilityGrade.level ? 'bg-emerald-400' : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-white/40 mt-1.5 leading-tight font-sans">
                돌봄: 공동체 안에서 누리는 평안과 정서적 안착
              </p>
            </div>

            {/* TRUST */}
            <div className="bg-white/5 p-2.5 rounded-sm border border-white/10 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center text-[11px] font-serif mb-1.5">
                  <span className="font-bold text-sky-300">지체 간 신뢰</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-xs font-bold border ${trustGrade.badge}`}>
                    {trustGrade.grade}
                  </span>
                </div>
                <div className="w-full h-1.5 flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(lvl => (
                    <div
                      key={lvl}
                      className={`flex-1 h-full rounded-xs transition-all ${
                        lvl <= trustGrade.level ? 'bg-sky-400' : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-white/40 mt-1.5 leading-tight font-sans">
                교제: 서로를 내 몸처럼 믿고 사랑하는 친밀한 교제
              </p>
            </div>

            {/* READINESS */}
            <div className="bg-white/5 p-2.5 rounded-sm border border-white/10 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center text-[11px] font-serif mb-1.5">
                  <span className="font-bold text-amber-300">준비도</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-xs font-bold border ${readinessGrade.badge}`}>
                    {readinessGrade.grade}
                  </span>
                </div>
                <div className="w-full h-1.5 flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(lvl => (
                    <div
                      key={lvl}
                      className={`flex-1 h-full rounded-xs transition-all ${
                        lvl <= readinessGrade.level ? 'bg-amber-400' : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-white/40 mt-1.5 leading-tight font-sans">
                준비: 다른 지체를 품고 훈련받을 준비됨
              </p>
            </div>

            {/* AUTONOMY */}
            <div className="bg-white/5 p-2.5 rounded-sm border border-white/10 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center text-[11px] font-serif mb-1.5">
                  <span className="font-bold text-violet-300">성령충만</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-xs font-bold border ${autonomyGrade.badge}`}>
                    {autonomyGrade.grade}
                  </span>
                </div>
                <div className="w-full h-1.5 flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(lvl => (
                    <div
                      key={lvl}
                      className={`flex-1 h-full rounded-xs transition-all ${
                        lvl <= autonomyGrade.level ? 'bg-violet-400' : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-white/40 mt-1.5 leading-tight font-sans">
                자율: 사람의 지시 없이 성령 안에서 스스로 섬김
              </p>
            </div>

            {/* BURNOUT */}
            <div className="bg-white/5 p-2.5 rounded-sm border border-white/10 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center text-[11px] font-serif mb-1.5">
                  <span className="font-bold text-rose-300">심령의 안식</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-xs font-bold border ${burnoutGrade.badge}`}>
                    {burnoutGrade.grade}
                  </span>
                </div>
                <div className="w-full h-1.5 flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(lvl => (
                    <div
                      key={lvl}
                      className={`flex-1 h-full rounded-xs transition-all ${
                        lvl <= burnoutGrade.level ? burnoutGrade.barColor : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-white/40 mt-1.5 leading-tight font-sans">
                {burnoutGrade.description}
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
          <div className="bg-white/5 border border-white/10 rounded-sm p-3 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-serif font-bold text-[#F5F5F5] tracking-wide">
                은사 및 사역 현황
              </span>
              {isAutonomous ? (
                <span className="text-[10px] px-2 py-0.5 rounded-xs font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  현지 자율 리더십 운영
                </span>
              ) : (
                (!person.calling) && onDiscoverCalling && (
                  <button
                    id="btn-discover-calling-auto"
                    onClick={() => {
                      onDiscoverCalling(person.id);
                    }}
                    className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-sm transition-colors border shadow-sm ${
                      CallingSystem.isEligibleForCalling(person)
                        ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border-amber-500/40 cursor-pointer'
                        : 'bg-white/5 text-white/50 border-white/20 hover:bg-white/10 cursor-pointer'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{CallingSystem.isEligibleForCalling(person) ? '역할 발견' : '역할 발견 (조건 미달)'}</span>
                  </button>
                )
              )}
            </div>

            {isAutonomous ? (
              <div className="flex flex-col gap-2">
                <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xs p-2.5 text-[11px] text-emerald-200/90 leading-relaxed font-sans">
                  <strong>'{community?.name}'</strong>은(는) 파송된 독립 자율 공동체입니다. 사역 임명, 파송 등 모든 사역 정책은 다음 리더와 성령의 역사로 자율 운영되며, 모교회 플레이어의 인위적 통제권이 일절 없습니다.
                </div>
                {callingInfo ? (
                  <p className="text-[11px] text-amber-200/90 font-sans">
                    현재 역할: <strong>{callingInfo.koreanName} ({callingInfo.symbol})</strong> · {callingInfo.strategicRole}
                  </p>
                ) : (
                  <p className="text-[11px] text-white/50 font-sans">
                    현지 공동체 내에서 깊이와 양육 과정을 거쳐 자율적으로 역할이 발견됩니다.
                  </p>
                )}
              </div>
            ) : !person.calling ? (
              <div className="flex flex-col gap-2">
                <p className="text-[11px] text-white/60 font-sans leading-relaxed">
                  아직 역할이 발견되지 않았습니다. 깊이(68), 준비(68), 양육(70%)이 충족되면 역할을 발견할 수 있습니다.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-[11px] text-white/70 font-sans">
                  {callingInfo?.koreanName}의 부르심을 받아 충성되이 그리스도의 몸을 세워가고 있습니다.
                </p>
                {onSendLeader && !person.isBeingSent && (
                  <button
                    id="btn-modal-send-leader"
                    onClick={() => {
                      onClose();
                      onSendLeader(person.id);
                    }}
                    className="w-full py-2 px-3 rounded-sm font-bold text-xs bg-gradient-to-r from-amber-400/20 via-yellow-500/20 to-amber-400/20 hover:from-amber-400/30 hover:to-yellow-500/30 text-amber-300 border border-amber-400/50 flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm mt-1"
                  >
                    <Send className="w-3.5 h-3.5 text-amber-300" />
                    <span>이 리더를 선교지로 파송하기 (교회 개척)</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Daily Life Routine & Evangelism Connection for External Seekers */}
        {person.isExternal && (
          <div className="bg-white/5 border border-white/10 rounded-sm p-3 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-serif font-bold text-[#F5F5F5] tracking-wide flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                일상 동선 및 생활 패턴
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-xs font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                {person.routine?.isDwelling ? '장소 체류 중' : '도보 이동 중'}
              </span>
            </div>

            <div className="bg-black/30 border border-white/10 rounded-sm p-2.5 flex items-start gap-2.5">
              <span className="text-xl shrink-0 mt-0.5">{person.routine?.activityIcon || '👤'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-white/90 truncate">
                    {person.routine?.activityLabel || '지역 일상을 보내는 중'}
                  </span>
                  <span className="text-[10px] font-mono text-cyan-300 shrink-0 ml-1">
                    {person.routine?.spotName || person.routine?.targetZoneName || '지역'}
                  </span>
                </div>
                <p className="text-[10px] text-white/50 mt-1 leading-relaxed">
                  {person.routine?.isDwelling
                    ? `현재 ${person.routine.spotName || person.routine.targetZoneName}에 머물며 시간을 보내고 있습니다.${
                        person.routine.partnerId ? ' 지인과 마주앉아 담소를 나누고 있습니다.' : ' 일과를 마친 후 다음 목적지로 이동합니다.'
                      }`
                    : `${person.routine?.targetZoneName || '목적지'}(으)로 걸어가고 있습니다.`}
                </p>
                {person.routine?.partnerId && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-amber-300/80 font-mono">
                    <span>💬 동행과 함께 교제 중</span>
                  </div>
                )}
              </div>
            </div>

            {/* Evangelism Connection Status */}
            <div className="border-t border-white/5 pt-2 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/60">복음 접촉 진도</span>
                <span className="font-mono font-bold text-cyan-300">
                  {Math.round(person.contactProgress || 0)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-xs overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, person.contactProgress || 0))}%` }}
                />
              </div>
              <p className="text-[10px] text-white/40 leading-relaxed mt-0.5">
                {person.externalState === 'CONTACTED' || person.externalState === 'FOLLOWING'
                  ? '복음의 초대를 받아 공동체 모임에 함께하고 있습니다.'
                  : (person.contactProgress || 0) > 60
                  ? '마음이 많이 열려 결신과 공동체 초대를 앞두고 있습니다.'
                  : (person.contactProgress || 0) > 30
                  ? '전도자의 따뜻한 관심에 호의를 보이며 대화를 나누고 있습니다.'
                  : '전도자가 다가가 대화를 나누며 사랑의 다리를 놓을 수 있습니다.'}
              </p>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
