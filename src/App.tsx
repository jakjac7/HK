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
import { Person, CallingType, ActionId } from './types';

export default function App() {
  // Central Game Engine instance
  const engineRef = useRef<GameEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new GameEngine(true);
  }
  const engine = engineRef.current;

  // React UI state synchronized periodically
  const [, setTick] = useState<number>(0);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [activeActionId, setActiveActionId] = useState<ActionId | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [dismissResultScreen, setDismissResultScreen] = useState<boolean>(false);

  // Sync state for UI counters (5 times a second is smooth and CPU-friendly)
  useEffect(() => {
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
  }, [engine, selectedPerson]);

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

      // Community-wide actions: PRAYER, WORSHIP execute immediately
      if (actionId === 'PRAYER' || actionId === 'WORSHIP') {
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
  }, [engine]);

  // Show result screen when game over and not dismissed
  const showResultModal = engine.state.isGameOver && !dismissResultScreen;

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

      {/* Person Detail & Discipleship Modal */}
      {selectedPerson && (
        <PersonDetailModal
          person={selectedPerson}
          onClose={() => setSelectedPerson(null)}
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
