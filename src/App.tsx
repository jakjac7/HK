/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameEngine } from './simulation/engine';
import { SimulationCanvas } from './components/SimulationCanvas';
import { TopHUD } from './components/TopHUD';
import { BottomControlBar } from './components/BottomControlBar';
import { PersonDetailModal } from './components/PersonDetailModal';
import { SendModal } from './components/SendModal';
import { DriftAlert } from './components/DriftAlert';
import { ReleaseOverlay } from './components/ReleaseOverlay';
import { ResultScreen } from './components/ResultScreen';
import { TutorialGuideModal } from './components/TutorialGuideModal';
import { TitleScreen } from './components/TitleScreen';
import { SocietalNewsTicker } from './components/SocietalNewsTicker';
import { WordSeedToast } from './components/WordSeedToast';
import { CrisisInterventionBanner } from './components/CrisisInterventionBanner';
import { Person, CallingType, ActionId, MapId } from './types';
import { getCallingLabel } from './utils/faithTerms';
import { Send, Sparkles, HeartHandshake } from 'lucide-react';

export default function App() {
  // Central Game Engine instance
  const engineRef = useRef<GameEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new GameEngine(true);
  }
  const engine = engineRef.current;

  // React UI state synchronized periodically
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [, setTick] = useState<number>(0);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [showPersonDetail, setShowPersonDetail] = useState<boolean>(false);
  const [activeActionId, setActiveActionId] = useState<ActionId | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState<boolean>(false);
  const [preSelectedLeaderId, setPreSelectedLeaderId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [dismissResultScreen, setDismissResultScreen] = useState<boolean>(false);
  const [isWordToastVisible, setIsWordToastVisible] = useState<boolean>(false);
  const wordToastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [callingToast, setCallingToast] = useState<{
    personName: string;
    calling: CallingType;
  } | null>(null);
  const callingToastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [focusedPersonId, setFocusedPersonId] = useState<string | null>(null);

  // Pastoral rescue for leaving/troubled believer
  const handleRescuePerson = useCallback((personId: string) => {
    const result = engine.rescuePerson(personId);
    if (result.success) {
      setTick(t => t + 1);
      const fresh = engine.state.people.find(p => p.id === personId);
      if (fresh) setSelectedPerson({ ...fresh });
    }
  }, [engine]);

  // Center camera and select person
  const handleFocusPerson = useCallback((personId: string) => {
    setFocusedPersonId(personId);
    const person = engine.state.people.find(p => p.id === personId);
    if (person) setSelectedPerson({ ...person });
    setTimeout(() => setFocusedPersonId(null), 1000);
  }, [engine]);

  // Trigger graceful toast notification when Word is proclaimed
  const triggerWordToast = useCallback(() => {
    if (wordToastTimerRef.current) {
      clearTimeout(wordToastTimerRef.current);
    }
    setIsWordToastVisible(true);
    wordToastTimerRef.current = setTimeout(() => {
      setIsWordToastVisible(false);
    }, 2800);
  }, []);

  const triggerCallingToast = useCallback((person: Person, calling: CallingType) => {
    if (callingToastTimerRef.current) {
      clearTimeout(callingToastTimerRef.current);
    }
    setCallingToast({ personName: person.name, calling });
    callingToastTimerRef.current = setTimeout(() => {
      setCallingToast(null);
    }, 4500);
  }, []);

  useEffect(() => {
    engine.onWordProclaimed = triggerWordToast;
    engine.onCallingDiscovered = triggerCallingToast;
    return () => {
      engine.onWordProclaimed = undefined;
      engine.onCallingDiscovered = undefined;
      if (wordToastTimerRef.current) {
        clearTimeout(wordToastTimerRef.current);
      }
      if (callingToastTimerRef.current) {
        clearTimeout(callingToastTimerRef.current);
      }
    };
  }, [engine, triggerWordToast, triggerCallingToast]);

  // Sync state for UI counters (5 times a second is smooth and CPU-friendly)
  useEffect(() => {
    if (!hasStarted) return;
    const interval = setInterval(() => {
      setTick(t => t + 1);

      // Keep selectedPerson reference updated with latest stats
      if (selectedPerson) {
        const fresh = engine.state.people.find(p => p.id === selectedPerson.id);
        if (fresh) {
          setSelectedPerson({ ...fresh });
        }
      }
    }, 200);

    return () => clearInterval(interval);
  }, [engine, selectedPerson, hasStarted]);

  const handleStartGame = useCallback((mapId: MapId) => {
    engine.reset(true, mapId);
    setHasStarted(true);
  }, [engine]);

  const handleDiscoverCalling = useCallback((personId: string, specificCalling?: CallingType) => {
    const person = engine.state.people.find(p => p.id === personId);
    if (!person || !person.communityId) return;
    const comm = engine.state.communities.find(c => c.id === person.communityId);
    if (!comm) return;

    const success = engine.triggerCallingDiscovery(person, comm, true, specificCalling);
    if (success) {
      setTick(t => t + 1);
      
      // Also update selectedPerson if it's the currently selected one
      const fresh = engine.state.people.find(p => p.id === personId);
      if (fresh) {
        setSelectedPerson({ ...fresh });
      }
    }
  }, [engine]);

  // Handle action selection & auto-play for community-wide actions (Section 5)
  const handleSelectAction = useCallback(
    (actionId: ActionId | null) => {
      if (!actionId) {
        setActiveActionId(null);
        return;
      }
      if (actionId === 'SEND') {
        setIsSendModalOpen(true);
        setActiveActionId(null);
        return;
      }

      // Community-wide actions: WORD, PRAYER, WORSHIP, FELLOWSHIP execute immediately
      if (actionId === 'WORD' || actionId === 'PRAYER' || actionId === 'WORSHIP' || actionId === 'FELLOWSHIP') {
        engine.executeAction(actionId);
        setActiveActionId(null);
      } else {
        // If a person is currently selected, apply to them immediately
        if (selectedPerson) {
          engine.executeAction(actionId, selectedPerson.id);
          setActiveActionId(null);
          const fresh = engine.state.people.find(p => p.id === selectedPerson.id);
          if (fresh) setSelectedPerson({ ...fresh });
        } else {
          // Otherwise enter targeting mode to tap a person on the canvas
          setActiveActionId(prev => (prev === actionId ? null : actionId));
        }
      }
    },
    [engine, selectedPerson]
  );

  // Apply action to targeted person node
  const handleApplyActionOnPerson = useCallback(
    (targetPersonId: string) => {
      if (!activeActionId) return;
      const success = engine.executeAction(activeActionId, targetPersonId);
      if (success) {
        setActiveActionId(null);
        const fresh = engine.state.people.find(p => p.id === targetPersonId);
        if (fresh) setSelectedPerson({ ...fresh });
      }
    },
    [activeActionId, engine]
  );

  // Handle SEND confirmation
  const handleSendLeader = useCallback(
    (leaderId: string, directionOrZone: string, coords?: { x: number; y: number }) => {
      engine.sendLeader(leaderId, directionOrZone, coords);
    },
    [engine]
  );

  // Handle Trigger Release manually
  const handleTriggerRelease = useCallback(() => {
    engine.triggerTheRelease();
  }, [engine]);

  // Restart run
  const handleRestart = useCallback(() => {
    engine.reset(true);
    setSelectedPerson(null);
    setActiveActionId(null);
    setDismissResultScreen(false);
    setHasStarted(false);
  }, [engine]);

  // Show result screen when game over and not dismissed
  const showResultModal = engine.state.isGameOver && !dismissResultScreen;

  if (!hasStarted) {
    return (
      <>
        <TitleScreen
          onStartGame={handleStartGame}
          onOpenGuide={() => setIsGuideOpen(true)}
          isMuted={isMuted}
          setIsMuted={setIsMuted}
        />
        {isGuideOpen && <TutorialGuideModal onClose={() => setIsGuideOpen(false)} />}
      </>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-full max-h-screen overflow-hidden flex flex-col bg-slate-950 select-none overscroll-none">
      {/* Top HUD */}
      <TopHUD
        engine={engine}
        onOpenGuide={() => setIsGuideOpen(true)}
        onTriggerRelease={handleTriggerRelease}
        onOpenSendModal={() => {
          setPreSelectedLeaderId(null);
          setIsSendModalOpen(true);
        }}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
      />

      {/* Word of Life Seed Toast Notification */}
      <WordSeedToast visible={isWordToastVisible} />

      {/* Main Interactive Organic Simulation Canvas */}
      <main className="relative flex-1 w-full h-full min-h-0 overflow-hidden">
        {/* Top Alert Center (상단 알람 중앙 수직 배치 - 2줄 HUD 바로 아래에 안정적으로 위치) */}
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-35 w-[94%] max-w-2xl flex flex-col gap-2 pointer-events-none items-center">
          {/* Calling Discovery Toast Notification */}
          {callingToast && (
            <div className="w-full max-w-lg pointer-events-auto transition-all duration-300">
              <div className="bg-[#18181B]/95 border border-amber-400/70 px-4 py-2.5 rounded shadow-2xl backdrop-blur flex items-center gap-3 ring-1 ring-amber-400/40 animate-bounce">
                <span className="text-xl">✨</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-300 text-xs font-bold font-serif whitespace-nowrap">은사 발견 및 사역자 세움</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400/25 text-amber-200 border border-amber-400/40 font-bold whitespace-nowrap">
                      {getCallingLabel(callingToast.calling)}
                    </span>
                  </div>
                  <p className="text-white/90 text-xs mt-0.5">
                    <strong className="text-white font-bold">{callingToast.personName}</strong> 성도님이{' '}
                    <strong className="text-amber-300">{getCallingLabel(callingToast.calling)}</strong> 직분으로 기름부으심을 받았습니다!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Real-time Crisis Intervention Banner (이탈 위기 지체 긴급 붙잡기) */}
          <CrisisInterventionBanner
            engine={engine}
            onFocusPerson={handleFocusPerson}
            onRescuePerson={handleRescuePerson}
          />

          {/* Societal News Ticker (시대의 징후 뉴스 예고 및 경보) */}
          <SocietalNewsTicker
            news={engine.state.societalNews}
            onDismiss={() => {
              engine.state.societalNews = null;
            }}
          />

          {/* Real-time Drift Alerts */}
          <DriftAlert communities={engine.state.communities} />
        </div>

        <SimulationCanvas
          engine={engine}
          onSelectPerson={setSelectedPerson}
          selectedPersonId={selectedPerson?.id || null}
          activeActionId={activeActionId}
          onApplyActionOnPerson={handleApplyActionOnPerson}
          focusedPersonId={focusedPersonId}
        />

        {/* Selected Person Floating Quick UI (anchored to canvas area above bottom bar) */}
        {selectedPerson && !showPersonDetail && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-40 bg-[#121212]/95 backdrop-blur-md border border-white/20 p-3 rounded-lg shadow-2xl flex flex-col items-center gap-2 pointer-events-auto w-64 max-w-[92vw] animate-in fade-in slide-in-from-bottom-2">
            <div className="flex justify-between w-full items-center mb-1">
              <span className="font-bold text-[#F5F5F5]">{selectedPerson.name}</span>
              <button onClick={() => setSelectedPerson(null)} className="text-white/40 hover:text-white/80 cursor-pointer"><span className="text-xs">✕</span></button>
            </div>
            
            {/* Urgent LEAVING quick rescue button */}
            {selectedPerson.movementState === 'LEAVING' && (
              <button 
                id="btn-quick-rescue-person"
                onClick={() => handleRescuePerson(selectedPerson.id)}
                className="w-full bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold py-1.5 rounded-sm text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(244,63,94,0.4)] animate-pulse mb-1 border border-rose-400"
              >
                <HeartHandshake className="w-4 h-4 text-white" />
                <span>지체 붙잡기 ({selectedPerson.leavingReason || '이탈 위기'})</span>
              </button>
            )}

            <div className="w-full flex flex-col gap-1.5 text-[10px] font-sans">
              <div className="flex justify-between items-center text-violet-300">
                <span>성령충만</span>
                <div className="flex-1 ml-2 bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-violet-400 h-full" style={{ width: `${Math.min(100, Math.max(0, selectedPerson.autonomy))}%` }} />
                </div>
              </div>
              <div className="flex justify-between items-center text-rose-300">
                <span>피로도</span>
                <div className="flex-1 ml-2 bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-rose-400 h-full" style={{ width: `${Math.min(100, Math.max(0, selectedPerson.burnout))}%` }} />
                </div>
              </div>
            </div>
            
            <div className="w-full grid grid-cols-2 gap-2 mt-1">
              <button 
                onClick={() => handleSelectAction('CARE')} 
                className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 py-1.5 rounded-sm text-xs transition-colors cursor-pointer"
              >
                심방하기
              </button>
              <button 
                onClick={() => setShowPersonDetail(true)}
                className="bg-white/10 text-white/80 hover:bg-white/20 border border-white/10 py-1.5 rounded-sm text-xs transition-colors cursor-pointer"
              >
                상세보기
              </button>
            </div>
            {(!selectedPerson.calling && !selectedPerson.isExternal) && (
              <button 
                id="btn-quick-discover-calling"
                onClick={() => handleDiscoverCalling(selectedPerson.id)}
                className="w-full bg-gradient-to-r from-amber-500/25 to-yellow-500/25 text-amber-300 hover:from-amber-500/35 hover:to-yellow-500/35 border border-amber-500/40 py-1.5 rounded-sm text-xs font-semibold transition-all mt-1 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>은사 발견 (사역 시작)</span>
              </button>
            )}
            {selectedPerson.calling && !selectedPerson.isExternal && !selectedPerson.isBeingSent && (
              <button 
                id="btn-quick-send-leader"
                onClick={() => {
                  setPreSelectedLeaderId(selectedPerson.id);
                  setIsSendModalOpen(true);
                }}
                className="w-full bg-gradient-to-r from-amber-400/25 via-yellow-500/25 to-amber-500/25 text-amber-300 hover:from-amber-400/40 hover:to-yellow-500/40 border border-amber-400/50 py-1.5 rounded-sm text-xs font-bold transition-all mt-1 cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(251,191,36,0.25)]"
              >
                <Send className="w-3.5 h-3.5 text-amber-300" />
                <span>선교지 파송 (교회 개척)</span>
              </button>
            )}
          </div>
        )}

        {/* The Release Cinematic Overlay */}
        <ReleaseOverlay engine={engine} />
      </main>

      {/* Bottom Tactical Bar (Attention, 6 Strategic Actions, Priority, SEND) */}
      <BottomControlBar
        engine={engine}
        activeActionId={activeActionId}
        onSelectAction={handleSelectAction}
        onOpenSendModal={() => {
          setPreSelectedLeaderId(null);
          setIsSendModalOpen(true);
        }}
      />

      {/* Person Detail & Discipleship Modal */}
      {selectedPerson && showPersonDetail && (
        <PersonDetailModal
          person={selectedPerson}
          onClose={() => {
            setShowPersonDetail(false);
          }}
          onDiscoverCalling={handleDiscoverCalling}
          onSendLeader={leaderId => {
            setPreSelectedLeaderId(leaderId);
            setIsSendModalOpen(true);
          }}
          onRescuePerson={handleRescuePerson}
        />
      )}

      {/* SEND Strategic Action Modal */}
      {isSendModalOpen && (
        <SendModal
          engine={engine}
          initialLeaderId={preSelectedLeaderId}
          onClose={() => {
            setIsSendModalOpen(false);
            setPreSelectedLeaderId(null);
          }}
          onSend={handleSendLeader}
        />
      )}

      {/* Tutorial & Principle Guide Modal */}
      {isGuideOpen && (
        <TutorialGuideModal onClose={() => setIsGuideOpen(false)} />
      )}

      {/* Final Victory / Evaluation Screen */}
      {showResultModal && (
        <ResultScreen
          engine={engine}
          onRestart={handleRestart}
          onContinueWatching={() => setDismissResultScreen(true)}
        />
      )}
    </div>
  );
}
