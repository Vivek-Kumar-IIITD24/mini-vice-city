interface TitleScreenProps {
  hasSave: boolean;
  onPlay: () => void;
  onContinue: () => void;
  onOpenSettings: () => void;
  onOpenControls: () => void;
  onOpenCredits: () => void;
}

export function TitleScreen({
  hasSave,
  onPlay,
  onContinue,
  onOpenSettings,
  onOpenControls,
  onOpenCredits,
}: TitleScreenProps) {
  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between p-8 md:p-14 pointer-events-none">
      {/* Subtle left-edge vignette for crisp typography legibility over live 3D city flyover */}
      <div
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{
          background:
            'linear-gradient(100deg, rgba(8,10,18,0.88) 0%, rgba(8,10,18,0.62) 38%, rgba(8,10,18,0.08) 72%, rgba(8,10,18,0.22) 100%)',
        }}
      />

      {/* Top Spacer */}
      <div />

      {/* Left-Third Art Deco Poster Title Lockup & Menu Actions */}
      <div className="max-w-md pointer-events-auto">
        {/* Bespoke inline SVG MINI VICE CITY Emblem */}
        <svg
          viewBox="0 0 470 152"
          className="w-full max-w-[420px] h-auto mb-3"
          role="img"
          aria-label="MINI VICE CITY"
        >
          <defs>
            <linearGradient id="viceSun" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="55%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#e11d48" />
            </linearGradient>
          </defs>
          {/* Art Deco Rising Coastal Sun with Horizon Slats */}
          <circle cx="52" cy="54" r="34" fill="url(#viceSun)" />
          <rect x="14" y="56" width="76" height="4" fill="#090b12" opacity="0.88" />
          <rect x="14" y="65" width="76" height="5" fill="#090b12" opacity="0.88" />
          <rect x="14" y="75" width="76" height="6" fill="#090b12" opacity="0.88" />
          {/* Skyline Silhouette inside emblem */}
          <path
            d="M20 55 L20 40 L29 40 L29 55 M33 55 L33 28 L44 28 L44 22 L47 22 L47 55 M52 55 L52 34 L63 34 L63 55 M68 55 L68 43 L77 43 L77 55"
            fill="#0b101d"
          />
          {/* Crisp Art Deco Display Typography */}
          <text
            x="104"
            y="45"
            fill="#f59e0b"
            fontSize="17"
            fontWeight="700"
            letterSpacing="7"
            fontFamily="Outfit, Montserrat, system-ui, sans-serif"
          >
            MINI
          </text>
          <text
            x="102"
            y="92"
            fill="#fff7ed"
            fontSize="52"
            fontWeight="900"
            letterSpacing="4"
            fontFamily="Outfit, Montserrat, system-ui, sans-serif"
            stroke="#090b12"
            strokeWidth="3"
            paintOrder="stroke fill"
          >
            VICE CITY
          </text>
          {/* Deco accent underline */}
          <rect x="104" y="106" width="234" height="3" fill="#2dd4bf" />
          <rect x="344" y="106" width="64" height="3" fill="#f59e0b" />
          <text
            x="104"
            y="133"
            fill="#e2e8f0"
            fontSize="12"
            fontWeight="600"
            letterSpacing="2.1"
            fontFamily="Inter, system-ui, sans-serif"
          >
            YOUR CITY. YOUR STORY. YOUR FREEDOM.
          </text>
        </svg>

        <p className="text-xs uppercase tracking-[0.22em] text-amber-200/80 mb-7 pl-1">
          A Cinematic Open World Experience
        </p>

        {/* Primary & Secondary Actions */}
        <div className="flex flex-col gap-2.5 max-w-[270px]">
          {hasSave ? (
            <>
              <button
                type="button"
                data-start="true"
                onClick={onContinue}
                className="group flex items-center justify-between px-5 py-3.5 text-left font-display text-sm font-bold uppercase tracking-[0.18em] bg-amber-500 text-stone-950 hover:bg-amber-400 active:bg-amber-300 transition-colors cursor-pointer"
              >
                <span>Continue Story</span>
                <span className="text-xs font-semibold opacity-75">ENTER</span>
              </button>
              <button
                type="button"
                onClick={onPlay}
                className="flex items-center justify-between px-5 py-3 text-left font-display text-xs font-semibold uppercase tracking-[0.16em] bg-[#101625]/90 text-stone-100 border border-stone-500/40 hover:border-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
              >
                <span>New Game</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              data-start="true"
              onClick={onPlay}
              className="group flex items-center justify-between px-5 py-3.5 text-left font-display text-sm font-bold uppercase tracking-[0.18em] bg-amber-500 text-stone-950 hover:bg-amber-400 active:bg-amber-300 transition-colors cursor-pointer"
            >
              <span>Play</span>
              <span className="text-xs font-semibold opacity-75">ENTER</span>
            </button>
          )}

          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={onOpenSettings}
              className="px-3 py-2.5 font-display text-[11px] font-semibold uppercase tracking-[0.14em] bg-[#0e1320]/90 text-stone-200 border border-stone-600/40 hover:border-teal-400 hover:text-teal-300 transition-colors cursor-pointer"
            >
              Settings
            </button>
            <button
              type="button"
              onClick={onOpenControls}
              className="px-3 py-2.5 font-display text-[11px] font-semibold uppercase tracking-[0.14em] bg-[#0e1320]/90 text-stone-200 border border-stone-600/40 hover:border-teal-400 hover:text-teal-300 transition-colors cursor-pointer"
            >
              Controls
            </button>
            <button
              type="button"
              onClick={onOpenCredits}
              className="px-3 py-2.5 font-display text-[11px] font-semibold uppercase tracking-[0.14em] bg-[#0e1320]/90 text-stone-200 border border-stone-600/40 hover:border-teal-400 hover:text-teal-300 transition-colors cursor-pointer"
            >
              Credits
            </button>
          </div>
        </div>
      </div>

      {/* Single Flat Borderless Control Hint Line at Bottom Safe Margin */}
      <div className="flex items-center justify-between text-[11px] tracking-[0.14em] uppercase text-stone-300/80 hud-text-shadow">
        <span>
          WASD Move / Drive · Shift Sprint · Space Jump / Handbrake · F Enter Vehicle · Drag Mouse Look · Esc Pause
        </span>
      </div>
    </div>
  );
}
