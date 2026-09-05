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
import { Person, CallingType, ActionId, MapId } from './types';

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
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [dismissResultScreen, setDismissResultScreen] = useState<boolean>(false);

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
    engine.setMap(mapId);
    engine.reset(true);
    setHasStarted(true);
  }, [engine]);

  const handleDiscoverCalling = useCallback((personId: string) => {
    const person = engine.state.people.find(p => p.id === personId);
    if (!person || !person.communityId) return;
    const comm = engine.state.communities.find(c => c.id === person.communityId);
    if (!comm) return;

    engine.triggerCallingDiscovery(person, comm);
    setTick(t => t + 1);
    
    // Also update selectedPerson if it's the currently selected one
    if (selectedPerson && selectedPerson.id === personId) {
      const fresh = engine.state.people.find(p => p.id === personId);
      if (fresh) {
        setSelectedPerson({ ...fresh });
      }
    }
  }, [engine, selectedPerson]);

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
    (leaderId: string, direction: 'NORTH' | 'EAST' | 'SOUTH' | 'WEST') => {
      engine.sendLeader(leaderId, direction);
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
    <div className="relative w-screen h-screen overflow-hidden flex flex-col bg-slate-950 select-none">
      {/* Top HUD */}
      <TopHUD
        engine={engine}
        onOpenGuide={() => setIsGuideOpen(true)}
        onTriggerRelease={handleTriggerRelease}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
      />

      {/* Societal News Ticker (시대의 징후 뉴스 예고 및 경보) */}
      <SocietalNewsTicker
        news={engine.state.societalNews}
        onDismiss={() => {
          engine.state.societalNews = null;
        }}
      />

      {/* Real-time Drift Alerts */}
      <DriftAlert 
        communities={engine.state.communities} 
        onResolveDrift={(commId, type) => {
          engine.resolveDriftManual(commId, type);
        }}
      />

      {/* Main Interactive Organic Simulation Canvas */}
      <main className="relative flex-1 w-full h-full min-h-0 overflow-hidden">
        <SimulationCanvas
          engine={engine}
          onSelectPerson={setSelectedPerson}
          selectedPersonId={selectedPerson?.id || null}
          activeActionId={activeActionId}
          onApplyActionOnPerson={handleApplyActionOnPerson}
        />

        {/* The Release Cinematic Overlay */}
        <ReleaseOverlay engine={engine} />
      </main>

      {/* Bottom Tactical Bar (Attention, 6 Strategic Actions, Priority, SEND) */}
      <BottomControlBar
        engine={engine}
        activeActionId={activeActionId}
        onSelectAction={handleSelectAction}
        onOpenSendModal={() => setIsSendModalOpen(true)}
      />

      {/* Selected Person Floating Quick UI */}
      {selectedPerson && !showPersonDetail && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-40 bg-[#121212] border border-white/20 p-3 rounded-lg shadow-2xl flex flex-col items-center gap-2 pointer-events-auto w-64 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex justify-between w-full items-center mb-1">
            <span className="font-bold text-[#F5F5F5]">{selectedPerson.name}</span>
            <button onClick={() => setSelectedPerson(null)} className="text-white/40 hover:text-white/80"><span className="text-xs">✕</span></button>
          </div>
          
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
              className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 py-1.5 rounded-sm text-xs transition-colors"
            >
              심방하기
            </button>
            <button 
              onClick={() => setShowPersonDetail(true)}
              className="bg-white/10 text-white/80 hover:bg-white/20 border border-white/10 py-1.5 rounded-sm text-xs transition-colors"
            >
              상세보기
            </button>
          </div>
          {(!selectedPerson.calling && !selectedPerson.isExternal) && (
            <button 
              onClick={() => handleDiscoverCalling(selectedPerson.id)}
              className="w-full bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 py-1.5 rounded-sm text-xs transition-colors mt-1"
            >
              은사 발견 (사역 시작)
            </button>
          )}
        </div>
      )}

      {/* Person Detail & Discipleship Modal */}
      {selectedPerson && showPersonDetail && (
        <PersonDetailModal
          person={selectedPerson}
          onClose={() => {
            setShowPersonDetail(false);
          }}
          onDiscoverCalling={handleDiscoverCalling}
        />
      )}

      {/* SEND Strategic Action Modal */}
      {isSendModalOpen && (
        <SendModal
          engine={engine}
          onClose={() => setIsSendModalOpen(false)}
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
