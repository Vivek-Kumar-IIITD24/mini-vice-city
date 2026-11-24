import { useState } from 'react';
import { GameSettings, HudSnapshot } from '../game/types';
import { MISSIONS } from '../game/missions/missionData';
import { VEHICLE_CATALOG } from '../game/world/cityData';
import { SettingsModal } from './SettingsModal';

interface PauseMenuProps {
  hud: HudSnapshot;
  settings: GameSettings;
  initialTab?: 'pause' | 'missions' | 'garage' | 'settings';
  onResume: () => void;
  onRestartMission: () => void;
  onFreeRoam: () => void;
  onStartMission: (id: string) => void;
  onPurchaseOrSummon: (specId: string) => { ok: boolean; message: string };
  onTriggerPoliceChase: () => void;
  onUpdateSettings: (partial: Partial<GameSettings>) => void;
  onMainMenu: () => void;
}

const GARAGE_IDS = ['veloce_gt', 'solstice_royale', 'bayside_titan'] as const;

export function PauseMenu({
  hud,
  settings,
  initialTab = 'pause',
  onResume,
  onRestartMission,
  onFreeRoam,
  onStartMission,
  onPurchaseOrSummon,
  onTriggerPoliceChase,
  onUpdateSettings,
  onMainMenu,
}: PauseMenuProps) {
  const [tab, setTab] = useState<'pause' | 'missions' | 'garage' | 'settings'>(initialTab);
  const [garageFeedback, setGarageFeedback] = useState<string | null>(null);

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(6, 8, 15, 0.82)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Game Paused"
    >
      <div
        className="w-full max-w-3xl border border-amber-500/45 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        style={{ backgroundColor: '#0c101c' }}
      >
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-stone-800 bg-[#090c16]">
          <div>
            <h2 className="font-display text-lg font-black uppercase tracking-[0.2em] text-stone-50">
              MINI VICE CITY
            </h2>
            <p className="text-[11px] uppercase tracking-[0.14em] text-stone-400">
              {hud.districtName} · Balance{' '}
              <span className="text-emerald-300 font-bold tabular-nums">
                ${hud.money.toLocaleString()}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onResume}
            className="px-5 py-2 font-display text-xs font-bold uppercase tracking-[0.18em] bg-amber-500 text-stone-950 hover:bg-amber-400 cursor-pointer"
          >
            Resume [Esc]
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-4 border-b border-stone-800 bg-[#0a0e18]" role="tablist">
          {[
            { id: 'pause', label: 'Paused' },
            { id: 'missions', label: 'Missions' },
            { id: 'garage', label: 'Garage' },
            { id: 'settings', label: 'Settings' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={`py-3 font-display text-xs font-bold uppercase tracking-[0.15em] border-b-2 transition-colors cursor-pointer ${
                tab === t.id
                  ? 'border-amber-400 text-amber-300 bg-[#121828]'
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto">
          {tab === 'pause' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={onResume}
                  className="px-4 py-3 text-left font-display text-xs font-bold uppercase tracking-[0.16em] bg-amber-500 text-stone-950 hover:bg-amber-400 cursor-pointer"
                >
                  Resume Gameplay
                </button>
                <button
                  type="button"
                  onClick={onRestartMission}
                  className="px-4 py-3 text-left font-display text-xs font-semibold uppercase tracking-[0.16em] bg-[#131a2b] text-stone-100 border border-stone-700 hover:border-amber-400 cursor-pointer"
                >
                  Restart Current Mission
                </button>
                <button
                  type="button"
                  onClick={onFreeRoam}
                  className="px-4 py-3 text-left font-display text-xs font-semibold uppercase tracking-[0.16em] bg-[#131a2b] text-stone-100 border border-stone-700 hover:border-teal-400 cursor-pointer"
                >
                  Switch to Free Roam
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onTriggerPoliceChase();
                    onResume();
                  }}
                  className="px-4 py-3 text-left font-display text-xs font-semibold uppercase tracking-[0.16em] bg-[#1d1420] text-rose-200 border border-rose-500/40 hover:border-rose-400 cursor-pointer"
                >
                  Start VCPD Police Chase (2 Stars)
                </button>
                <button
                  type="button"
                  onClick={onMainMenu}
                  className="px-4 py-3 text-left font-display text-xs font-semibold uppercase tracking-[0.16em] bg-[#101420] text-stone-300 border border-stone-800 hover:border-stone-500 cursor-pointer mt-2"
                >
                  Return to Main Menu
                </button>
              </div>

              <div className="border border-stone-800 bg-[#090d16] p-4 flex flex-col justify-between">
                <div>
                  <h3 className="font-display text-xs font-bold uppercase tracking-[0.18em] text-teal-300 mb-3">
                    City Status
                  </h3>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-stone-400">Current District</span>
                      <span className="text-stone-100 font-semibold">{hud.districtName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">Time & Weather</span>
                      <span className="text-stone-100 font-semibold">{hud.timeLabel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">Completed Missions</span>
                      <span className="text-amber-300 font-bold tabular-nums">
                        {hud.completedMissionIds.length} / {MISSIONS.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">Unlocked Vehicles</span>
                      <span className="text-teal-300 font-bold tabular-nums">
                        {hud.unlockedVehicleIds.length} / {GARAGE_IDS.length}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-stone-400 mt-4 pt-3 border-t border-stone-800 leading-relaxed">
                  Tip: Drag the mouse on screen to rotate the camera smoothly, press <strong className="text-stone-200">C</strong> while driving to switch camera views, or summon unlocked rides from the Garage tab.
                </p>
              </div>
            </div>
          )}

          {tab === 'missions' && (
            <div className="space-y-3">
              {MISSIONS.map((m) => {
                const done = hud.completedMissionIds.includes(m.id);
                const active = hud.activeMissionId === m.id;
                return (
                  <div
                    key={m.id}
                    className={`p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      active
                        ? 'border-amber-400 bg-[#151c2e]'
                        : 'border-stone-800 bg-[#0e1320]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-sm font-bold uppercase tracking-[0.14em] text-stone-100">
                          {m.title}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 bg-stone-800 text-stone-300">
                          {m.category}
                        </span>
                        {done && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300">
                            Completed
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-400 mt-1 max-w-lg">{m.brief}</p>
                      <div className="flex items-center gap-4 mt-2 text-[11px] font-semibold">
                        <span className="text-emerald-300 tabular-nums">
                          Reward: ${m.reward.toLocaleString()}
                        </span>
                        {m.timeLimitSec && (
                          <span className="text-amber-300 tabular-nums">
                            Time Limit: {m.timeLimitSec}s
                          </span>
                        )}
                        {m.unlockVehicleId && (
                          <span className="text-teal-300">
                            Unlocks: {VEHICLE_CATALOG[m.unlockVehicleId]?.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onStartMission(m.id)}
                      className="shrink-0 px-4 py-2 font-display text-xs font-bold uppercase tracking-[0.14em] bg-amber-500 text-stone-950 hover:bg-amber-400 cursor-pointer"
                    >
                      {active ? 'Restart' : 'Start'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'garage' && (
            <div className="space-y-4">
              {garageFeedback && (
                <div className="px-3.5 py-2 text-xs font-semibold bg-[#131e2c] border border-teal-400/50 text-teal-200">
                  {garageFeedback}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {GARAGE_IDS.map((specId) => {
                  const spec = VEHICLE_CATALOG[specId];
                  const owned = hud.unlockedVehicleIds.includes(specId);
                  const canAfford = hud.money >= spec.price;
                  const speedPct = Math.round((spec.maxSpeed / 40) * 100);
                  const accelPct = Math.round((spec.acceleration / 22) * 100);
                  return (
                    <div
                      key={specId}
                      className="border border-stone-800 bg-[#0e1320] p-4 flex flex-col justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-display text-sm font-bold uppercase tracking-[0.12em] text-stone-50">
                            {spec.name}
                          </span>
                          <span
                            className="w-3.5 h-3.5 border border-stone-500"
                            style={{ backgroundColor: `#${spec.color.toString(16).padStart(6, '0')}` }}
                          />
                        </div>
                        <p className="text-[11px] text-stone-400 mt-0.5">{spec.subtitle}</p>
                        <div className="mt-3 space-y-2 text-[10px] uppercase tracking-wider text-stone-300">
                          <div>
                            <div className="flex justify-between mb-0.5">
                              <span>Top Speed</span>
                              <span className="tabular-nums">{Math.round(spec.maxSpeed * 3.6)} km/h</span>
                            </div>
                            <div className="h-1.5 bg-stone-800">
                              <div className="h-full bg-amber-400" style={{ width: `${speedPct}%` }} />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between mb-0.5">
                              <span>Acceleration</span>
                              <span className="tabular-nums">{accelPct}%</span>
                            </div>
                            <div className="h-1.5 bg-stone-800">
                              <div className="h-full bg-teal-400" style={{ width: `${accelPct}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={!owned && !canAfford}
                        onClick={() => {
                          const res = onPurchaseOrSummon(specId);
                          setGarageFeedback(res.message);
                        }}
                        className={`w-full py-2.5 font-display text-xs font-bold uppercase tracking-[0.14em] cursor-pointer ${
                          owned
                            ? 'bg-teal-400 text-stone-950 hover:bg-teal-300'
                            : canAfford
                              ? 'bg-amber-500 text-stone-950 hover:bg-amber-400'
                              : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                        }`}
                      >
                        {owned ? 'Deliver Nearby' : `Buy $${spec.price.toLocaleString()}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'settings' && (
            <SettingsModal
              settings={settings}
              onUpdate={onUpdateSettings}
              onClose={() => setTab('pause')}
              embedded
            />
          )}
        </div>
      </div>
    </div>
  );
}
