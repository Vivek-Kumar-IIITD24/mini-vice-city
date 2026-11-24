import {
  CameraViewMode,
  GameSettings,
  GraphicsQuality,
  TimePreset,
  WeatherType,
} from '../game/types';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdate: (partial: Partial<GameSettings>) => void;
  onClose: () => void;
  embedded?: boolean;
}

export function SettingsModal({
  settings,
  onUpdate,
  onClose,
  embedded = false,
}: SettingsModalProps) {
  const content = (
    <div className="flex flex-col gap-5 text-sm">
      {/* Visual & Performance Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-display font-bold uppercase tracking-[0.16em] text-amber-300 mb-2">
            Graphics Quality
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {([GraphicsQuality.Low, GraphicsQuality.Medium, GraphicsQuality.High] as const).map(
              (q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => onUpdate({ graphics: q })}
                  className={`py-2 text-xs font-display font-bold uppercase tracking-[0.12em] border cursor-pointer ${
                    settings.graphics === q
                      ? 'bg-amber-500 text-stone-950 border-amber-400'
                      : 'bg-[#121828] text-stone-300 border-stone-700 hover:border-stone-500'
                  }`}
                >
                  {q}
                </button>
              ),
            )}
          </div>
        </div>

        <div>
          <label
            htmlFor="res-scale-slider"
            className="flex justify-between text-[11px] font-display font-bold uppercase tracking-[0.16em] text-amber-300 mb-2"
          >
            <span>Resolution Scale</span>
            <span className="tabular-nums text-stone-200">
              {Math.round(settings.resolutionScale * 100)}%
            </span>
          </label>
          <input
            id="res-scale-slider"
            type="range"
            min={0.75}
            max={1}
            step={0.05}
            value={settings.resolutionScale}
            onChange={(e) => onUpdate({ resolutionScale: Number(e.target.value) })}
            className="w-full vice-slider"
          />
        </div>
      </div>

      {/* Camera & Controls Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-stone-800">
        <div>
          <label
            htmlFor="sens-slider"
            className="flex justify-between text-[11px] font-display font-bold uppercase tracking-[0.16em] text-teal-300 mb-2"
          >
            <span>Mouse Sensitivity</span>
            <span className="tabular-nums text-stone-200">
              {settings.mouseSensitivity.toFixed(1)}x
            </span>
          </label>
          <input
            id="sens-slider"
            type="range"
            min={0.4}
            max={2.0}
            step={0.1}
            value={settings.mouseSensitivity}
            onChange={(e) => onUpdate({ mouseSensitivity: Number(e.target.value) })}
            className="w-full vice-slider"
          />
        </div>

        <div>
          <label className="block text-[11px] font-display font-bold uppercase tracking-[0.16em] text-teal-300 mb-2">
            Driving Camera Mode
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: CameraViewMode.Chase, label: 'Chase' },
              { id: CameraViewMode.Close, label: 'Close' },
              { id: CameraViewMode.Hood, label: 'Hood' },
            ].map((cam) => (
              <button
                key={cam.id}
                type="button"
                onClick={() => onUpdate({ cameraMode: cam.id })}
                className={`py-2 text-xs font-display font-bold uppercase tracking-[0.1em] border cursor-pointer ${
                  settings.cameraMode === cam.id
                    ? 'bg-teal-400 text-stone-950 border-teal-300'
                    : 'bg-[#121828] text-stone-300 border-stone-700 hover:border-stone-500'
                }`}
              >
                {cam.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* World Atmosphere: Time of Day & Weather */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-stone-800">
        <div>
          <label
            htmlFor="time-select"
            className="block text-[11px] font-display font-bold uppercase tracking-[0.16em] text-amber-300 mb-2"
          >
            Time of Day
          </label>
          <select
            id="time-select"
            value={settings.timePreset}
            onChange={(e) => onUpdate({ timePreset: e.target.value as TimePreset })}
            className="w-full px-3 py-2 text-xs font-semibold uppercase tracking-wider bg-[#121828] text-stone-100 border border-stone-700 focus:border-amber-400 outline-none"
          >
            <option value={TimePreset.GoldenHour}>Golden Hour (Signature)</option>
            <option value={TimePreset.Morning}>Morning Sunlight</option>
            <option value={TimePreset.Afternoon}>Bright Afternoon</option>
            <option value={TimePreset.Sunset}>Miami Sunset Dusk</option>
            <option value={TimePreset.Night}>Neon Nightlife</option>
            <option value={TimePreset.Dynamic}>Dynamic 24h Cycle</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-display font-bold uppercase tracking-[0.16em] text-amber-300 mb-2">
            Weather
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {([WeatherType.Clear, WeatherType.Cloudy, WeatherType.Rain] as const).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => onUpdate({ weather: w, dynamicWeather: false })}
                className={`py-2 text-xs font-display font-bold uppercase tracking-[0.1em] border cursor-pointer ${
                  settings.weather === w && !settings.dynamicWeather
                    ? 'bg-amber-500 text-stone-950 border-amber-400'
                    : 'bg-[#121828] text-stone-300 border-stone-700 hover:border-stone-500'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Audio Mixers */}
      <div className="pt-3 border-t border-stone-800">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-display font-bold uppercase tracking-[0.16em] text-teal-300">
            Audio Mix
          </span>
          <button
            type="button"
            onClick={() => onUpdate({ muted: !settings.muted })}
            className={`px-3 py-1 text-[10px] font-display font-bold uppercase tracking-[0.14em] border cursor-pointer ${
              settings.muted
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/60'
                : 'bg-[#121828] text-stone-200 border-stone-700 hover:border-teal-400'
            }`}
          >
            {settings.muted ? 'Audio Muted' : 'Audio Active'}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {[
            { key: 'masterVolume', label: 'Master Volume' },
            { key: 'musicVolume', label: 'Radio & Synth Music' },
            { key: 'effectsVolume', label: 'Engine & Effects' },
            { key: 'ambienceVolume', label: 'City & Rain Ambience' },
          ].map((item) => {
            const val = settings[item.key as keyof GameSettings] as number;
            return (
              <div key={item.key}>
                <label
                  htmlFor={`vol-${item.key}`}
                  className="flex justify-between text-[11px] uppercase tracking-wider text-stone-300 mb-1.5"
                >
                  <span>{item.label}</span>
                  <span className="tabular-nums text-stone-400">{Math.round(val * 100)}%</span>
                </label>
                <input
                  id={`vol-${item.key}`}
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={val}
                  onChange={(e) => onUpdate({ [item.key]: Number(e.target.value) })}
                  className="w-full vice-slider"
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (embedded) return content;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(6, 8, 15, 0.82)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      <div
        className="w-full max-w-2xl border border-amber-500/40 p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: '#0c101c' }}
      >
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-stone-800">
          <div>
            <h2 className="font-display text-lg font-bold uppercase tracking-[0.2em] text-stone-50">
              Settings
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Changes apply live and save automatically
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-display font-bold uppercase tracking-[0.16em] bg-amber-500 text-stone-950 hover:bg-amber-400 cursor-pointer"
          >
            Done
          </button>
        </div>
        {content}
      </div>
    </div>
  );
}
