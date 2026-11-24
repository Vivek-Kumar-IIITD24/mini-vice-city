import { GameOverSummary } from '../game/types';

export function ControlsModal({ onClose }: { onClose: () => void }) {
  const sections = [
    {
      title: 'On Foot',
      items: [
        ['W / A / S / D', 'Move character'],
        ['Shift', 'Sprint'],
        ['Space', 'Jump'],
        ['Mouse Drag / Right-Click', 'Orbit 3rd-person camera'],
        ['F', 'Enter nearby vehicle'],
      ],
    },
    {
      title: 'Driving & City',
      items: [
        ['W / S', 'Accelerate / Brake & Reverse'],
        ['A / D', 'Steer left / right'],
        ['Space', 'Handbrake / Drift'],
        ['C', 'Switch Chase / Close / Hood camera'],
        ['F', 'Exit vehicle'],
        ['M / Esc', 'Mute audio / Pause & Garage'],
      ],
    },
  ];

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(6, 8, 15, 0.84)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Controls"
    >
      <div
        className="w-full max-w-xl border border-teal-400/45 p-6 shadow-2xl"
        style={{ backgroundColor: '#0c101c' }}
      >
        <div className="flex items-center justify-between pb-3 mb-5 border-b border-stone-800">
          <h2 className="font-display text-lg font-bold uppercase tracking-[0.2em] text-stone-50">
            Controls
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-display font-bold uppercase tracking-[0.16em] bg-amber-500 text-stone-950 hover:bg-amber-400 cursor-pointer"
          >
            Close
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {sections.map((sec) => (
            <div key={sec.title}>
              <h3 className="font-display text-xs font-bold uppercase tracking-[0.18em] text-amber-400 mb-3">
                {sec.title}
              </h3>
              <ul className="space-y-2.5 text-xs">
                {sec.items.map(([key, desc]) => (
                  <li key={key} className="flex items-center justify-between gap-3">
                    <span className="px-2 py-0.5 bg-[#151c2e] border border-stone-700 font-mono text-[11px] text-teal-300">
                      {key}
                    </span>
                    <span className="text-stone-300 text-right">{desc}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CreditsModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(6, 8, 15, 0.84)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Credits"
    >
      <div
        className="w-full max-w-md border border-amber-500/45 p-6 shadow-2xl text-center"
        style={{ backgroundColor: '#0c101c' }}
      >
        <h2 className="font-display text-xl font-black uppercase tracking-[0.22em] text-amber-400">
          MINI VICE CITY
        </h2>
        <p className="text-xs uppercase tracking-[0.16em] text-stone-400 mt-1">
          Your City. Your Story. Your Freedom.
        </p>

        <div className="my-6 py-4 border-y border-stone-800 space-y-2 text-xs text-stone-300">
          <p>Original Independent Open-World 3D Urban Driving & Exploration Experience</p>
          <p className="text-stone-400">
            100% Procedural WebGL Architecture, PBR Materials, Vehicles, AI Traffic & Web Audio Synthesis
          </p>
          <p className="text-teal-300 font-semibold pt-2">
            5 Connected Coastal Districts · Dynamic Day/Night & Weather · Local Progression
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2.5 text-xs font-display font-bold uppercase tracking-[0.18em] bg-amber-500 text-stone-950 hover:bg-amber-400 cursor-pointer"
        >
          Back
        </button>
      </div>
    </div>
  );
}

interface OutcomeModalProps {
  summary: GameOverSummary;
  onPrimaryAction: () => void;
  onFreeRoam: () => void;
  onMainMenu: () => void;
}

export function OutcomeModal({
  summary,
  onPrimaryAction,
  onFreeRoam,
  onMainMenu,
}: OutcomeModalProps) {
  const isVictory = summary.outcome === 'mission_complete';

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(6, 8, 15, 0.82)' }}
      role="dialog"
      aria-modal="true"
      aria-label={summary.title}
    >
      <div
        className="w-full max-w-md border p-6 shadow-2xl"
        style={{
          backgroundColor: '#0c101c',
          borderColor: isVictory ? 'rgba(245, 158, 11, 0.7)' : 'rgba(244, 63, 94, 0.7)',
        }}
      >
        <div className="text-center">
          <span
            className={`text-[11px] font-display font-bold uppercase tracking-[0.22em] ${
              isVictory ? 'text-amber-400' : 'text-rose-400'
            }`}
          >
            {isVictory ? 'Mission Accomplished' : 'Pursuit Ended'}
          </span>
          <h2 className="font-display text-2xl font-black uppercase tracking-[0.14em] text-stone-50 mt-1">
            {summary.title}
          </h2>
          <p className="text-xs text-stone-300 mt-1.5">{summary.subtitle}</p>
        </div>

        {/* 3 Tabular Stat Tiles */}
        <div className="grid grid-cols-3 gap-2.5 my-6">
          {summary.stats.map((st) => (
            <div
              key={st.label}
              className="border border-stone-800 bg-[#090d16] p-3 text-center"
            >
              <div className="text-[10px] font-display uppercase tracking-[0.14em] text-stone-400">
                {st.label}
              </div>
              <div className="font-display text-base font-black tabular-nums text-stone-50 mt-1">
                {st.value}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            data-start="true"
            onClick={onPrimaryAction}
            className="w-full py-3 font-display text-xs font-bold uppercase tracking-[0.18em] bg-amber-500 text-stone-950 hover:bg-amber-400 cursor-pointer"
          >
            {isVictory ? 'Continue Free Roam' : 'Try Again'}
          </button>
          {!isVictory && (
            <button
              type="button"
              onClick={onFreeRoam}
              className="w-full py-2.5 font-display text-xs font-semibold uppercase tracking-[0.16em] bg-[#131a2b] text-stone-200 border border-stone-700 hover:border-teal-400 cursor-pointer"
            >
              Switch to Free Roam
            </button>
          )}
          <button
            type="button"
            onClick={onMainMenu}
            className="w-full py-2.5 font-display text-xs font-semibold uppercase tracking-[0.16em] text-stone-400 hover:text-stone-200 cursor-pointer"
          >
            Return to Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}
