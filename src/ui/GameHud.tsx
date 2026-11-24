import { useEffect, useState } from 'react';
import { CameraViewMode, HudSnapshot, WeatherType } from '../game/types';
import { Minimap } from './Minimap';

interface GameHudProps {
  hud: HudSnapshot;
  muted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onOpenGarage: () => void;
}

const CAMERA_LABELS: Record<CameraViewMode, string> = {
  [CameraViewMode.Chase]: 'CHASE CAM',
  [CameraViewMode.Close]: 'CLOSE CAM',
  [CameraViewMode.Hood]: 'HOOD CAM',
};

const WEATHER_LABELS: Record<WeatherType, string> = {
  [WeatherType.Clear]: 'CLEAR',
  [WeatherType.Cloudy]: 'CLOUDY',
  [WeatherType.Rain]: 'RAIN',
};

export function GameHud({
  hud,
  muted,
  onToggleMute,
  onPause,
  onOpenGarage,
}: GameHudProps) {
  // Trailing health ghost bar
  const [ghostHealth, setGhostHealth] = useState(hud.health);

  useEffect(() => {
    if (hud.health >= ghostHealth) {
      setGhostHealth(hud.health);
      return;
    }
    const timer = window.setTimeout(() => {
      setGhostHealth(hud.health);
    }, 320);
    return () => clearTimeout(timer);
  }, [hud.health, ghostHealth]);

  const hpPercent = Math.max(0, Math.min(100, (hud.health / hud.maxHealth) * 100));
  const ghostPercent = Math.max(0, Math.min(100, (ghostHealth / hud.maxHealth) * 100));

  return (
    <div className="fixed inset-0 z-10 pointer-events-none select-none">
      {/* Subtle red peripheral vignette at critical HP */}
      {hpPercent <= 30 && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 110px rgba(220, 38, 38, 0.45)',
          }}
        />
      )}

      {/* TOP-LEFT: Active Mission Objective Strip */}
      {hud.missionTitle && hud.missionObjective && (
        <div
          className="fixed top-5 left-5 max-w-sm border-l-[3px] border-amber-400 px-3.5 py-2.5"
          style={{ backgroundColor: 'rgba(9, 12, 22, 0.84)' }}
        >
          <div className="flex items-center justify-between gap-4">
            <span className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-amber-400">
              {hud.missionTitle}
            </span>
            <div className="flex items-center gap-2 text-[11px] font-semibold tabular-nums text-stone-200">
              {hud.missionProgressText && <span>{hud.missionProgressText}</span>}
              {hud.missionTimerSec !== null && (
                <span className={hud.missionTimerSec < 15 ? 'text-rose-400' : 'text-teal-300'}>
                  {Math.ceil(hud.missionTimerSec)}s
                </span>
              )}
            </div>
          </div>
          <p className="mt-1 text-xs text-stone-100 leading-snug">{hud.missionObjective}</p>
        </div>
      )}

      {/* TOP-CENTER: Transient Mission / Discovery Notification */}
      {hud.notification && (
        <div
          key={hud.notification.id}
          className="fixed top-5 left-1/2 -translate-x-1/2 px-5 py-2.5 text-center border-b-2"
          style={{
            backgroundColor: 'rgba(9, 12, 22, 0.88)',
            borderColor:
              hud.notification.accent === 'rose'
                ? '#f43f5e'
                : hud.notification.accent === 'emerald'
                  ? '#10b981'
                  : hud.notification.accent === 'cyan'
                    ? '#2dd4bf'
                    : '#f59e0b',
          }}
        >
          <div className="font-display text-xs font-bold uppercase tracking-[0.2em] text-stone-50">
            {hud.notification.title}
          </div>
          {hud.notification.subtitle && (
            <div className="text-[11px] text-stone-300 mt-0.5">{hud.notification.subtitle}</div>
          )}
        </div>
      )}

      {/* TOP-RIGHT: Cash, Wanted Stars, Vitality Bar, Utility Icon Buttons */}
      <div className="fixed top-5 right-5 flex flex-col items-end gap-2">
        {/* Utility Buttons Row */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Open Garage and Missions"
            title="Garage & Missions"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenGarage();
            }}
            className="h-8 px-2.5 flex items-center gap-1.5 text-[10px] font-display font-bold uppercase tracking-[0.14em] text-stone-200 border border-stone-600/60 hover:border-amber-400 hover:text-amber-300 cursor-pointer"
            style={{ backgroundColor: 'rgba(9, 12, 22, 0.85)' }}
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
              <path d="M5 11l1.5-4.5h11L19 11v6h-2v-2H7v2H5v-6zm2.5 1a1.25 1.25 0 100 2.5 1.25 1.25 0 000-2.5zm9 0a1.25 1.25 0 100 2.5 1.25 1.25 0 000-2.5z" />
            </svg>
            <span>Menu</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label={muted ? 'Unmute Audio [M]' : 'Mute Audio [M]'}
            title={muted ? 'Unmute [M]' : 'Mute [M]'}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            className="w-8 h-8 flex items-center justify-center text-stone-200 border border-stone-600/60 hover:border-teal-400 hover:text-teal-300 cursor-pointer"
            style={{ backgroundColor: 'rgba(9, 12, 22, 0.85)' }}
          >
            {muted ? (
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <path d="M15.54 8.46a5 5 0 010 7.07" />
                <path d="M19.07 4.93a10 10 0 010 14.14" />
              </svg>
            )}
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Pause Game [Esc]"
            title="Pause [Esc]"
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            className="w-8 h-8 flex items-center justify-center text-stone-200 border border-stone-600/60 hover:border-amber-400 hover:text-amber-300 cursor-pointer"
            style={{ backgroundColor: 'rgba(9, 12, 22, 0.85)' }}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
              <rect x="6" y="5" width="4" height="14" />
              <rect x="14" y="5" width="4" height="14" />
            </svg>
          </button>
        </div>

        {/* Money Readout */}
        <div
          className="font-display text-2xl font-black tabular-nums tracking-wider text-emerald-300 vice-stroke"
          aria-label={`Balance $${hud.money}`}
        >
          ${hud.money.toLocaleString()}
        </div>

        {/* Health Bar with Trailing Damage Ghost */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-display font-bold uppercase tracking-[0.16em] text-stone-300 hud-text-shadow">
            HP
          </span>
          <div className="relative w-32 h-2.5 bg-[#090d16]/90 border border-stone-600/70 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-amber-300/70 transition-all duration-300"
              style={{ width: `${ghostPercent}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 transition-all duration-100"
              style={{
                width: `${hpPercent}%`,
                backgroundColor: hpPercent > 35 ? '#2dd4bf' : '#f43f5e',
              }}
            />
          </div>
          <span className="text-[11px] font-bold tabular-nums text-stone-200 hud-text-shadow w-7 text-right">
            {hud.health}
          </span>
        </div>

        {/* 5 Wanted Stars (Custom SVG Police Badges) */}
        <div className="flex flex-col items-end gap-1 mt-0.5" aria-label={`Wanted level ${hud.wantedStars} stars`}>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => {
              const active = star <= hud.wantedStars;
              return (
                <svg
                  key={star}
                  viewBox="0 0 24 24"
                  className="w-5 h-5"
                  style={{
                    filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.9))',
                  }}
                >
                  <path
                    d="M12 2.4l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.25 6.19 20.3l1.11-6.47-4.7-4.58 6.5-.95L12 2.4z"
                    fill={active ? (hud.wantedEscaping ? '#38bdf8' : '#f59e0b') : 'rgba(15,23,42,0.75)'}
                    stroke={active ? '#090b12' : 'rgba(148,163,184,0.35)'}
                    strokeWidth="1.6"
                  />
                </svg>
              );
            })}
          </div>
          {hud.wantedStars > 0 && (
            <div className="w-32">
              <div className="text-[10px] font-display font-bold uppercase tracking-[0.15em] text-right hud-text-shadow text-amber-300">
                {hud.wantedEscaping ? 'EVADING VCPD' : 'POLICE PURSUIT'}
              </div>
              {hud.wantedEscaping && (
                <div className="w-full h-1 bg-stone-900/90 mt-0.5 overflow-hidden">
                  <div
                    className="h-full bg-sky-400"
                    style={{ width: `${Math.round(hud.wantedCooldownRatio * 100)}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM-LEFT: Minimap + District & Time/Weather Readout */}
      <div className="fixed bottom-5 left-5 flex flex-col gap-1.5">
        <Minimap
          playerX={hud.playerX}
          playerZ={hud.playerZ}
          playerHeading={hud.playerHeading}
          blips={hud.blips}
          wantedStars={hud.wantedStars}
        />
        <div
          className="px-2.5 py-1.5 border-l-2 border-teal-400 flex flex-col"
          style={{ backgroundColor: 'rgba(9, 12, 22, 0.86)' }}
        >
          <span className="font-display text-xs font-bold uppercase tracking-[0.14em] text-stone-50">
            {hud.districtName}
          </span>
          <span className="text-[10px] tabular-nums uppercase tracking-[0.12em] text-stone-300">
            {hud.timeLabel} · {WEATHER_LABELS[hud.weather]}
          </span>
        </div>
      </div>

      {/* BOTTOM-CENTER: Contextual Interaction Prompt */}
      {hud.interactionPrompt && (
        <div
          className="fixed bottom-7 left-1/2 -translate-x-1/2 px-4 py-2 border border-amber-400/75 text-xs font-display font-bold uppercase tracking-[0.15em] text-amber-200"
          style={{ backgroundColor: 'rgba(9, 12, 22, 0.88)' }}
        >
          {hud.interactionPrompt}
        </div>
      )}

      {/* BOTTOM-RIGHT: Vehicle Speedometer (Only Visible While Driving) */}
      {hud.inVehicle && (
        <div
          className="fixed bottom-5 right-5 px-4 py-3 border-r-[3px] border-amber-400 min-w-[186px]"
          style={{ backgroundColor: 'rgba(9, 12, 22, 0.86)' }}
        >
          <div className="flex items-baseline justify-between gap-3">
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-4xl font-black tabular-nums text-stone-50 leading-none">
                {hud.speedKmh}
              </span>
              <span className="text-[10px] font-display font-bold uppercase tracking-[0.14em] text-stone-400">
                KM/H
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="px-2 py-0.5 text-xs font-display font-black tabular-nums bg-amber-500 text-stone-950">
                {hud.gear}
              </span>
              {hud.handbrake && (
                <span className="text-[9px] font-bold uppercase tracking-wider text-rose-400 mt-1">
                  DRIFT
                </span>
              )}
            </div>
          </div>

          <div className="mt-2 pt-1.5 border-t border-stone-700/70 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.12em]">
            <span className="text-teal-300 font-semibold">{hud.vehicleName}</span>
            <span className="text-stone-400">[C] {CAMERA_LABELS[hud.cameraMode]}</span>
          </div>
          <div className="mt-1 text-[9px] uppercase tracking-[0.14em] text-stone-400">
            [F] Exit · [Space] Handbrake
          </div>
        </div>
      )}
    </div>
  );
}
