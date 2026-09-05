/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameEngine } from '../simulation/engine';
import { toStep10 } from '../utils/faithTerms';
import { Trophy, RefreshCw, Eye, CheckCircle2, AlertTriangle, Users, GitBranch, HeartPulse } from 'lucide-react';

interface ResultScreenProps {
  engine: GameEngine;
  onRestart: () => void;
  onContinueWatching: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({ engine, onRestart, onContinueWatching }) => {
  const { stats } = engine.state;

  const gradeColors = {
    S: 'from-amber-300 via-yellow-400 to-amber-500 text-slate-950 border-amber-300',
    A: 'from-emerald-400 to-teal-500 text-slate-950 border-emerald-300',
    B: 'from-cyan-400 to-blue-500 text-slate-950 border-cyan-300',
    C: 'from-slate-400 to-slate-500 text-slate-950 border-slate-300',
    D: 'from-rose-400 to-red-500 text-slate-950 border-rose-300',
  };

  return (
    <div
      id="result-screen-backdrop"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-hidden"
    >
      <div
        id="result-screen"
        className="w-full max-w-lg max-h-[min(92vh,660px)] sm:max-h-[88vh] bg-[#121212] border border-white/15 rounded-md shadow-2xl text-[#F5F5F5] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300"
      >
        {/* Sticky Header with Grade Badge */}
        <div className="shrink-0 flex items-center justify-between border-b border-white/10 px-5 py-3.5 bg-[#161616]">
          <div>
            <span className="text-[10px] font-bold font-mono text-amber-400 tracking-widest uppercase">
              HIS KINGDOM · 사역 성찰 보고서
            </span>
            <h2 className="text-lg sm:text-xl font-serif font-extrabold mt-0.5 tracking-tight text-[#F5F5F5]">
              공동체 사역 평가 보고서
            </h2>
          </div>

          <div
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-sm bg-gradient-to-br ${gradeColors[stats.finalGrade]} border-2 shadow-lg flex items-center justify-center font-mono font-black text-xl sm:text-2xl tracking-tighter shrink-0`}
          >
            {stats.finalGrade}
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0 text-left">
          {/* Total Score & 5 Criteria Breakdown in 1~10 Scale */}
          <div className="bg-white/5 border border-white/10 rounded-sm p-4 flex flex-col gap-3">
          <div className="flex items-baseline justify-between border-b border-white/10 pb-2">
            <span className="text-xs font-serif font-semibold text-white/60">종합 사역 성숙도</span>
            <div className="flex items-baseline gap-2 font-mono">
              <span className="text-2xl font-black text-amber-300">
                {toStep10(stats.finalScore)}단계
              </span>
              <span className="text-xs text-white/40">
                ({stats.finalScore} / 100점)
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 text-xs">
            {/* Autonomy */}
            <div>
              <div className="flex justify-between text-white/70 mb-1 font-mono text-[11px]">
                <span className="font-serif">자율 사역과 성령충만 (성령의 운행)</span>
                <span className="font-bold text-violet-300">{toStep10(stats.autonomyScore)}단계 ({stats.autonomyScore}점)</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-violet-400" style={{ width: `${stats.autonomyScore}%` }} />
              </div>
            </div>

            {/* Multiplication */}
            <div>
              <div className="flex justify-between text-white/70 mb-1 font-mono text-[11px]">
                <span className="font-serif">공동체 분립 개척 (제자 재생산)</span>
                <span className="font-bold text-cyan-300">{toStep10(stats.multiplicationScore)}단계 ({stats.multiplicationScore}점)</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400" style={{ width: `${stats.multiplicationScore}%` }} />
              </div>
            </div>

            {/* Kingdom Health */}
            <div>
              <div className="flex justify-between text-white/70 mb-1 font-mono text-[11px]">
                <span className="font-serif">몸의 건강도 (하나됨과 돌봄)</span>
                <span className="font-bold text-emerald-300">{toStep10(stats.kingdomHealthScore)}단계 ({stats.kingdomHealthScore}점)</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400" style={{ width: `${stats.kingdomHealthScore}%` }} />
              </div>
            </div>

            {/* Gospel Integrity */}
            <div>
              <div className="flex justify-between text-white/70 mb-1 font-mono text-[11px]">
                <span className="font-serif">복음의 순전함 (말씀과 진리 분별)</span>
                <span className="font-bold text-indigo-300">{toStep10(stats.gospelIntegrityScore)}단계 ({stats.gospelIntegrityScore}점)</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-400" style={{ width: `${stats.gospelIntegrityScore}%` }} />
              </div>
            </div>

            {/* Reach */}
            <div>
              <div className="flex justify-between text-white/70 mb-1 font-mono text-[11px]">
                <span className="font-serif">선교적 접촉 (잃은 양을 향한 열정)</span>
                <span className="font-bold text-amber-300">{toStep10(stats.reachScore)}단계 ({stats.reachScore}점)</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400" style={{ width: `${stats.reachScore}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Milestone Numbers Grid */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-white/5 p-2.5 rounded-sm border border-white/10">
            <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono">연결된 영혼</span>
            <div className="text-lg font-bold font-mono text-cyan-300 mt-0.5">{stats.peopleReached}명</div>
          </div>
          <div className="bg-white/5 p-2.5 rounded-sm border border-white/10">
            <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono">분립 개척</span>
            <div className="text-lg font-bold font-mono text-emerald-300 mt-0.5">{stats.communitiesFormed}곳</div>
          </div>
          <div className="bg-white/5 p-2.5 rounded-sm border border-white/10">
            <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono">제자 리더</span>
            <div className="text-lg font-bold font-mono text-amber-300 mt-0.5">{stats.leadersTrained}명</div>
          </div>
          <div className="bg-white/5 p-2.5 rounded-sm border border-white/10">
            <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono">위기 극복</span>
            <div className="text-lg font-bold font-mono text-indigo-300 mt-0.5">{stats.crisesOvercome}건</div>
          </div>
        </div>

        {/* Run Story Narrative */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-serif font-bold text-white/80 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            공동체의 사역 여정
          </span>
          <div className="bg-white/5 p-3 rounded-sm border border-white/10 text-xs text-white/70 flex flex-col gap-1.5 leading-relaxed font-sans">
            {stats.runStory.map((item, idx) => (
              <p key={idx}>· {item}</p>
            ))}
          </div>
        </div>

        {/* Struggles / Spiritual Reflection (Max 3 causal sentences) */}
        {stats.struggles.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-serif font-bold text-rose-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              핵심 사역 인과 성찰 (원인과 열매)
            </span>
            <div className="bg-rose-500/10 p-3 rounded-sm border border-rose-500/30 text-xs text-rose-200/90 flex flex-col gap-1.5 leading-relaxed font-sans">
              {stats.struggles.slice(0, 3).map((item, idx) => (
                <p key={idx}>· {item}</p>
              ))}
            </div>
          </div>
        )}
        </div>

        {/* Sticky Export & Actions Footer */}
        <div className="shrink-0 p-3.5 sm:p-4 border-t border-white/10 bg-[#161616] flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <button
              id="btn-restart-simulation"
              onClick={onRestart}
              className="flex-1 py-2.5 px-4 rounded-sm font-bold text-xs sm:text-sm bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 shadow-[0_0_20px_rgba(251,191,36,0.3)] flex items-center justify-center gap-2 transition-all font-mono uppercase tracking-wider cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-slate-950" />
              <span>새로운 사역 시작하기</span>
            </button>
            <button
              onClick={onContinueWatching}
              className="py-2.5 px-4 rounded-sm font-semibold text-xs bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 flex items-center justify-center gap-1.5 transition-all font-mono cursor-pointer"
            >
              <Eye className="w-4 h-4 text-white/70" />
              <span>관찰 계속하기</span>
            </button>
          </div>

          {/* Research Data Export (CSV / JSON) */}
          <div className="flex items-center justify-end gap-2 text-[10px] font-mono text-white/50">
            <span>사역 데이터 내보내기:</span>
            <button
              onClick={() => {
                const data = {
                  finalGrade: stats.finalGrade,
                  finalScore: stats.finalScore,
                  stepScale: {
                    total: toStep10(stats.finalScore),
                    autonomy: toStep10(stats.autonomyScore),
                    multiplication: toStep10(stats.multiplicationScore),
                    health: toStep10(stats.kingdomHealthScore),
                    word: toStep10(stats.gospelIntegrityScore),
                    reach: toStep10(stats.reachScore),
                  },
                  scores: {
                    autonomy: stats.autonomyScore,
                    multiplication: stats.multiplicationScore,
                    kingdomHealth: stats.kingdomHealthScore,
                    gospelIntegrity: stats.gospelIntegrityScore,
                    reach: stats.reachScore,
                  },
                  counts: {
                    peopleReached: stats.peopleReached,
                    communitiesFormed: stats.communitiesFormed,
                    leadersTrained: stats.leadersTrained,
                    crisesOvercome: stats.crisesOvercome,
                  },
                  runStory: stats.runStory,
                  struggles: stats.struggles,
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `his-kingdom-report-${Date.now()}.json`;
                a.click();
              }}
              className="px-2 py-0.5 rounded-xs bg-white/5 hover:bg-white/15 border border-white/10 text-white/80 cursor-pointer"
            >
              JSON 다운로드
            </button>
            <button
              onClick={() => {
                const headers = 'Metric,RawScore,StepScale_1_to_10\n';
                const rows = [
                  `FinalScore,${stats.finalScore},${toStep10(stats.finalScore)}`,
                  `AutonomyScore,${stats.autonomyScore},${toStep10(stats.autonomyScore)}`,
                  `MultiplicationScore,${stats.multiplicationScore},${toStep10(stats.multiplicationScore)}`,
                  `KingdomHealthScore,${stats.kingdomHealthScore},${toStep10(stats.kingdomHealthScore)}`,
                  `GospelIntegrityScore,${stats.gospelIntegrityScore},${toStep10(stats.gospelIntegrityScore)}`,
                  `ReachScore,${stats.reachScore},${toStep10(stats.reachScore)}`,
                  `PeopleReached,${stats.peopleReached},${stats.peopleReached}`,
                  `CommunitiesFormed,${stats.communitiesFormed},${stats.communitiesFormed}`,
                  `LeadersTrained,${stats.leadersTrained},${stats.leadersTrained}`,
                ].join('\n');
                const blob = new Blob([headers + rows], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `his-kingdom-report-${Date.now()}.csv`;
                a.click();
              }}
              className="px-2 py-0.5 rounded-xs bg-white/5 hover:bg-white/15 border border-white/10 text-white/80 cursor-pointer"
            >
              CSV 다운로드
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
