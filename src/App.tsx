/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/core/gameEngine';
import { createDefaultSettings } from './game/core/saveSystem';
import {
  CameraViewMode,
  DistrictId,
  GameSettings,
  GameState,
  HudSnapshot,
  WeatherType,
} from './game/types';
import { TitleScreen } from './ui/TitleScreen';
import { GameHud } from './ui/GameHud';
import { PauseMenu } from './ui/PauseMenu';
import { SettingsModal } from './ui/SettingsModal';
import { ControlsModal, CreditsModal, OutcomeModal } from './ui/Overlays';

const INITIAL_HUD: HudSnapshot = {
  gameState: GameState.Title,
  district: DistrictId.OceanDrive,
  districtName: 'Ocean Drive',
  money: 500,
  health: 100,
  maxHealth: 100,
  wantedStars: 0,
  wantedEscaping: false,
  wantedCooldownRatio: 0,
  inVehicle: false,
  vehicleName: '',
  speedKmh: 0,
  gear: 'N',
  handbrake: false,
  cameraMode: CameraViewMode.Chase,
  interactionPrompt: null,
  playerX: 87.2,
  playerZ: 54,
  playerHeading: -0.22,
  timeHours: 17.4,
  timeLabel: '17:24 · Golden Hour',
  weather: WeatherType.Clear,
  missionTitle: null,
  missionObjective: null,
  missionProgressText: null,
  missionTimerSec: null,
  missionTargetPos: null,
  blips: [],
  notification: null,
  completedMissionIds: [],
  unlockedVehicleIds: ['veloce_gt'],
  activeMissionId: 'the_first_ride',
  gameOverSummary: null,
  pointerLocked: false,
  fps: 60,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [settings, setSettings] = useState<GameSettings>(() => createDefaultSettings());
  const [hasSave, setHasSave] = useState(false);

  const [titleModal, setTitleModal] = useState<'none' | 'settings' | 'controls' | 'credits'>('none');
  const [pauseInitialTab, setPauseInitialTab] = useState<'pause' | 'missions' | 'garage' | 'settings'>('pause');

  // Mount Three.js GameEngine ONCE inside isolated ref container
  useEffect(() => {
    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    const engine = new GameEngine(mountEl, (snapshot) => {
      setHud(snapshot);
    });
    engineRef.current = engine;
    setSettings(engine.getSettings());
    setHasSave(engine.getHasExistingSave());

    // Support ?autostart=1 to boot directly into gameplay
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      if (engine.getHasExistingSave()) {
        engine.continueGame();
      } else {
        engine.startNewGame();
      }
      setHasSave(true);
    }

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleStartNew = useCallback(() => {
    setTitleModal('none');
    engineRef.current?.startNewGame();
    setHasSave(true);
  }, []);

  const handleContinue = useCallback(() => {
    setTitleModal('none');
    engineRef.current?.continueGame();
  }, []);

  const handleUpdateSettings = useCallback((partial: Partial<GameSettings>) => {
    engineRef.current?.updateSettings(partial);
    const updated = engineRef.current?.getSettings();
    if (updated) setSettings(updated);
  }, []);

  const handleToggleMute = useCallback(() => {
    engineRef.current?.toggleMute();
    const updated = engineRef.current?.getSettings();
    if (updated) setSettings(updated);
  }, []);

  // Keyboard shortcuts for Title Screen (Enter/Space to start) & Pause modal Esc resume
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      if (hud.gameState === GameState.Title) {
        if (titleModal !== 'none') {
          if (e.code === 'Escape') {
            e.preventDefault();
            setTitleModal('none');
          }
          return;
        }
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          if (hasSave) {
            handleContinue();
          } else {
            handleStartNew();
          }
        }
      } else if (hud.gameState === GameState.Paused) {
        if (e.code === 'Escape' || e.code === 'KeyP') {
          e.preventDefault();
          engineRef.current?.resumeGame();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hud.gameState, titleModal, hasSave, handleContinue, handleStartNew]);

  return (
    <main className="relative w-full h-full overflow-hidden bg-[#090b12]">
      {/* Isolated WebGL Canvas Container — never re-rendered by HUD updates */}
      <div
        ref={canvasMountRef}
        className="fixed inset-0 w-full h-full"
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Title Screen */}
      {hud.gameState === GameState.Title && (
        <TitleScreen
          hasSave={hasSave}
          onPlay={handleStartNew}
          onContinue={handleContinue}
          onOpenSettings={() => setTitleModal('settings')}
          onOpenControls={() => setTitleModal('controls')}
          onOpenCredits={() => setTitleModal('credits')}
        />
      )}

      {/* Title Sub-Modals */}
      {hud.gameState === GameState.Title && titleModal === 'settings' && (
        <SettingsModal
          settings={settings}
          onUpdate={handleUpdateSettings}
          onClose={() => setTitleModal('none')}
        />
      )}
      {hud.gameState === GameState.Title && titleModal === 'controls' && (
        <ControlsModal onClose={() => setTitleModal('none')} />
      )}
      {hud.gameState === GameState.Title && titleModal === 'credits' && (
        <CreditsModal onClose={() => setTitleModal('none')} />
      )}

      {/* Live Playing HUD */}
      {hud.gameState === GameState.Playing && (
        <GameHud
          hud={hud}
          muted={settings.muted}
          onToggleMute={handleToggleMute}
          onPause={() => {
            setPauseInitialTab('pause');
            engineRef.current?.pauseGame();
          }}
          onOpenGarage={() => {
            setPauseInitialTab('garage');
            engineRef.current?.pauseGame();
          }}
        />
      )}

      {/* Pause / Missions / Garage / Settings Hub */}
      {hud.gameState === GameState.Paused && (
        <PauseMenu
          hud={hud}
          settings={settings}
          initialTab={pauseInitialTab}
          onResume={() => engineRef.current?.resumeGame()}
          onRestartMission={() => engineRef.current?.restartCurrentMission()}
          onFreeRoam={() => engineRef.current?.clearActiveMissionToFreeRoam()}
          onStartMission={(id) => engineRef.current?.startMission(id)}
          onPurchaseOrSummon={(specId) =>
            engineRef.current?.purchaseOrSummonVehicle(specId) ?? {
              ok: false,
              message: 'Unavailable',
            }
          }
          onTriggerPoliceChase={() => engineRef.current?.triggerTestPolicePursuit()}
          onUpdateSettings={handleUpdateSettings}
          onMainMenu={() => {
            setHasSave(engineRef.current?.getHasExistingSave() ?? true);
            engineRef.current?.returnToTitle();
          }}
        />
      )}

      {/* Mission Complete / Busted / Wrecked Outcome Modal */}
      {hud.gameState === GameState.GameOver && hud.gameOverSummary && (
        <OutcomeModal
          summary={hud.gameOverSummary}
          onPrimaryAction={() => {
            if (hud.gameOverSummary?.outcome === 'mission_complete') {
              engineRef.current?.clearActiveMissionToFreeRoam();
            } else {
              engineRef.current?.restartCurrentMission();
            }
          }}
          onFreeRoam={() => engineRef.current?.clearActiveMissionToFreeRoam()}
          onMainMenu={() => engineRef.current?.returnToTitle()}
        />
      )}
    </main>
  );
}
