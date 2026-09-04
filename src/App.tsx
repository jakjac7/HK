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
import { Person, CallingType } from './types';

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
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
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

  // Handle card selection & auto-play for ANY target cards
  const handleSelectCard = useCallback(
    (cardId: string | null) => {
      if (!cardId) {
        setActiveCardId(null);
        return;
      }
      const card = engine.state.hand.find(c => c.id === cardId);
      if (!card) return;

      if (card.targetType === 'ANY') {
        // Apply immediately (e.g. Pray Together or Reconcile across community)
        engine.playCard(cardId);
        setActiveCardId(null);
      } else {
        setActiveCardId(cardId);
      }
    },
    [engine]
  );

  // Apply card to selected person node
  const handleApplyCardOnPerson = useCallback(
    (targetPersonId: string) => {
      if (!activeCardId) return;
      const success = engine.playCard(activeCardId, targetPersonId);
      if (success) {
        setActiveCardId(null);
      }
    },
    [activeCardId, engine]
  );

  // Handle Person calling anointing
  const handleAssignCalling = useCallback(
    (personId: string, calling: CallingType) => {
      const person = engine.state.people.find(p => p.id === personId);
      if (person) {
        person.calling = calling;
        person.generation = 1;
        person.autonomy = 65;
        person.readiness = 70;
        setSelectedPerson({ ...person });
      }
    },
    [engine]
  );

  // Handle Train person via modal
  const handleTrainPerson = useCallback(
    (personId: string) => {
      const trainCard = engine.state.hand.find(c => c.type === 'TRAIN');
      if (trainCard && engine.state.attention >= trainCard.cost) {
        engine.playCard(trainCard.id, personId);
        const updated = engine.state.people.find(p => p.id === personId);
        if (updated) setSelectedPerson({ ...updated });
      }
    },
    [engine]
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
    setActiveCardId(null);
    setDismissResultScreen(false);
  }, [engine]);

  // Can player afford train card?
  const hasTrainCard = engine.state.hand.some(c => c.type === 'TRAIN');
  const canAffordTrain = hasTrainCard && engine.state.attention >= 2;

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
      <DriftAlert communities={engine.state.communities} />

      {/* Main Interactive Organic Simulation Canvas */}
      <main className="relative flex-1 w-full h-full min-h-0 overflow-hidden">
        <SimulationCanvas
          engine={engine}
          onSelectPerson={setSelectedPerson}
          selectedPersonId={selectedPerson?.id || null}
          activeCardId={activeCardId}
          onApplyCardOnPerson={handleApplyCardOnPerson}
        />

        {/* The Release Cinematic Overlay */}
        <ReleaseOverlay engine={engine} />
      </main>

      {/* Bottom Tactical Bar (Attention, Priority, Cards, SEND) */}
      <BottomControlBar
        engine={engine}
        activeCardId={activeCardId}
        onSelectCard={handleSelectCard}
        onOpenSendModal={() => setIsSendModalOpen(true)}
      />

      {/* Person Detail & Discipleship Modal */}
      {selectedPerson && (
        <PersonDetailModal
          person={selectedPerson}
          onClose={() => setSelectedPerson(null)}
          onAssignCalling={handleAssignCalling}
          canAffordTrain={canAffordTrain}
          onTrainPerson={handleTrainPerson}
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
