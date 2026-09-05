/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MapId } from '../types';
import {
  Compass,
  Users,
  Radio,
  BookOpen,
  Sprout,
  HeartHandshake,
  Sparkles,
  Volume2,
  VolumeX,
  Play,
  HelpCircle,
  Building2,
  GraduationCap,
  Trees,
} from 'lucide-react';
import { soundEngine } from '../simulation/sound';

interface TitleScreenProps {
  onStartGame: (mapId: MapId) => void;
  onOpenGuide: () => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  onOpenGuide,
  isMuted,
  setIsMuted,
}) => {
  const [selectedMap, setSelectedMap] = useState<MapId>('CAMPUS');

  const mapOptions = [
    {
      id: 'CAMPUS' as MapId,
      name: '캠퍼스 & 청년 대학가',
      sub: '대학로 / 도서관 / 학생회관',
      desc: '청년 세대의 갈망과 높은 유동성. 신천지 등 이단의 침투와 교리적 혼란에 대한 진리의 말씀 무장이 핵심입니다.',
      icon: GraduationCap,
      accent: 'border-violet-500/50 bg-violet-950/20 text-violet-300',
      tag: '이단 분별 · 말씀 양육 (ROOT)',
    },
    {
      id: 'DOWNTOWN' as MapId,
      name: '도심 상업 & 오피스 지구',
      sub: '오피스타워 / 지하철역 / 카페거리',
      desc: '고물가와 실업난, 직장인들의 만성 피로와 번아웃. 상처 입은 지체들을 향한 쉼과 심방(CARE)이 생명선입니다.',
      icon: Building2,
      accent: 'border-rose-500/50 bg-rose-950/20 text-rose-300',
      tag: '탈진 회복 · 치유 심방 (CARE)',
    },
    {
      id: 'COUNTRYSIDE' as MapId,
      name: '농어촌 마을 & 전통 공동체',
      sub: '마을회관 / 시장 / 주거지역',
      desc: '끈끈한 관계망과 고령화, 변화에 대한 두려움. 식탁의 깊은 교제와 외부를 향한 선교적 야성(GO)이 필요합니다.',
      icon: Trees,
      accent: 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300',
      tag: '안일 극복 · 선교적 열정 (GO)',
    },
  ];

  const principles = [
    {
      title: '1. 뿌리교회와 목자 소그룹',
      desc: '목자를 중심으로 위성처럼 회전하며 결속되는 따뜻한 양육 공동체. 낙심한 양을 목자가 사랑으로 지켜냅니다.',
      icon: Users,
      color: 'text-amber-300',
    },
    {
      title: '2. 시대의 징후와 사회 뉴스',
      desc: '이단 발흥, 청년 실업 한파, 정치 분열 등 사회의 파도가 교회를 흔들 때 영적 징후를 분별하여 선제 대응합니다.',
      icon: Radio,
      color: 'text-rose-300',
    },
    {
      title: '3. 광역 말씀 선포 & 1:1 심방',
      desc: '3분마다 선포되는 강단 말씀의 영적 생명력과, 교리적 의심과 낙심에 빠진 한 영혼을 찾아가는 1:1 심방 사역.',
      icon: BookOpen,
      color: 'text-indigo-300',
    },
    {
      title: '4. 자립 분립 개척 (자율 번식)',
      desc: '모교회의 인위적 통제와 간섭을 내려놓고, 분립된 개척교회가 성령 안에서 스스로 전도하고 양육하며 번식합니다.',
      icon: Sprout,
      color: 'text-emerald-300',
    },
    {
      title: '5. 성령께 온전히 맡겨드림',
      desc: '사역자의 조종을 멈추고 교회의 참 주인이신 그리스도께 모든 것을 온전히 내어맡기는 참된 사역의 완성.',
      icon: Sparkles,
      color: 'text-violet-300',
    },
  ];

  const handleStart = () => {
    soundEngine.playChime();
    onStartGame(selectedMap);
  };

  const handleToggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundEngine.toggleMute(next);
  };

  return (
    <div
      id="title-screen-container"
      className="relative w-screen h-screen overflow-y-auto bg-[#0A0D14] text-[#F5F5F5] select-none flex flex-col items-center justify-between p-4 sm:p-8"
    >
      {/* Background Ambience / Subtle Grid Pattern */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-slate-950/80 to-[#0A0D14] z-0" />
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:32px_32px] z-0" />

      {/* Top Header Navigation */}
      <header className="relative z-10 w-full max-w-6xl flex justify-between items-center pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-sm bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-bold text-sm shadow-md">
            ✝
          </div>
          <span className="font-mono text-xs text-amber-400 tracking-widest uppercase font-bold">
            HIS KINGDOM · ORGANIC DMM SIMULATION
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleSound}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-sm transition-colors cursor-pointer"
          >
            {isMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                <span>음소거 됨</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>음향 켜짐</span>
              </>
            )}
          </button>

          <button
            onClick={onOpenGuide}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-sm transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>원리 매뉴얼</span>
          </button>
        </div>
      </header>

      {/* Main Core Showcase */}
      <main className="relative z-10 w-full max-w-5xl my-auto py-6 flex flex-col items-center gap-8 text-center">
        {/* Title Hero */}
        <div className="flex flex-col items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-mono font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>생명력 있는 유기체적 교회 개척 & 제자 삼는 운동</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-serif font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-[#FFF7ED] via-[#FED7AA] to-[#F59E0B] drop-shadow-sm">
            그의 나라 (HIS KINGDOM)
          </h1>

          <p className="text-sm sm:text-base text-amber-200/90 font-serif italic max-w-2xl leading-relaxed">
            "내가 이 반석 위에 내 교회를 세우리니 음부의 권세가 이기지 못하리라"
            <span className="block text-xs font-sans text-white/50 not-italic mt-0.5">
              — 마태복음 16장 18절
            </span>
          </p>
        </div>

        {/* 5 Core Biblical Principles Grid */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-5 gap-2.5 text-left text-xs">
          {principles.map((p, idx) => {
            const Icon = p.icon;
            return (
              <div
                key={idx}
                className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-sm p-3 flex flex-col gap-1.5 transition-all"
              >
                <div className="flex items-center gap-1.5 font-bold font-serif">
                  <Icon className={`w-4 h-4 shrink-0 ${p.color}`} />
                  <span className={`text-xs ${p.color}`}>{p.title}</span>
                </div>
                <p className="text-[11px] text-white/70 font-sans leading-relaxed">
                  {p.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Mission Field Selection (Map) */}
        <div className="w-full flex flex-col items-center gap-3 mt-2">
          <div className="flex items-center gap-2 text-xs font-mono text-white/60 uppercase tracking-wider">
            <Compass className="w-4 h-4 text-amber-400" />
            <span>첫 선교지 선택 (Starting Mission Field)</span>
          </div>

          <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            {mapOptions.map(opt => {
              const Icon = opt.icon;
              const isSelected = selectedMap === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => setSelectedMap(opt.id)}
                  className={`p-4 rounded-sm border cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                    isSelected
                      ? `${opt.accent} border-2 shadow-[0_0_20px_rgba(251,191,36,0.15)] ring-1 ring-amber-400/50`
                      : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="w-5 h-5 text-amber-400" />
                        <h3 className="font-bold text-sm text-[#F5F5F5]">
                          {opt.name}
                        </h3>
                      </div>
                      {isSelected && (
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-white/50">{opt.sub}</span>
                    <p className="text-xs text-white/80 mt-1 leading-relaxed">
                      {opt.desc}
                    </p>
                  </div>

                  <span className="inline-block px-2 py-0.5 rounded-xs bg-white/5 border border-white/10 text-[10px] font-mono text-amber-300">
                    {opt.tag}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Start Button Hero */}
        <div className="flex flex-col items-center gap-3 pt-3">
          <button
            id="btn-start-game"
            onClick={handleStart}
            className="group relative px-8 py-3.5 rounded-sm bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 text-slate-950 font-bold text-sm sm:text-base font-mono uppercase tracking-wider shadow-[0_0_30px_rgba(251,191,36,0.35)] hover:shadow-[0_0_45px_rgba(251,191,36,0.55)] hover:scale-105 active:scale-95 transition-all flex items-center gap-3 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-slate-950 text-slate-950 transition-transform group-hover:translate-x-0.5" />
            <span>사역 시작하기 (Begin Ministry)</span>
          </button>
          <span className="text-[11px] text-white/40 font-mono">
            10분간의 유기체적 개척 여정 · 사역 종료 시 성령께 온전히 맡겨드림
          </span>
        </div>
      </main>

      {/* Footer copyright */}
      <footer className="relative z-10 w-full max-w-6xl text-center py-2 border-t border-white/10 text-[11px] text-white/40 font-mono">
        HIS KINGDOM · Organic Church Planting Movement Simulation · Matthew 16:18
      </footer>
    </div>
  );
};
