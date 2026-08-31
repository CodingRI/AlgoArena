import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw } from 'lucide-react';
import { useSettingsStore, usePanelStore } from '@/store/panelStore';

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <motion.button
    onClick={onChange}
    className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0
      ${checked ? 'bg-violet-500' : 'bg-zinc-700'}`}
  >
    <motion.div
      animate={{ x: checked ? 16 : 2 }}
      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"
    />
  </motion.button>
);

const IntensityPicker = ({ value, onChange }: { value: string; onChange: (v: 'low' | 'medium' | 'high') => void }) => (
  <div className="flex gap-1">
    {(['low', 'medium', 'high'] as const).map((v) => (
      <button key={v} onClick={() => onChange(v)}
        className={`flex-1 py-1 text-[10px] rounded-md font-mono transition-colors capitalize
          ${value === v ? 'bg-violet-500/30 text-violet-300 border border-violet-500/30' : 'bg-white/5 text-zinc-500 hover:text-zinc-300'}`}>
        {v}
      </button>
    ))}
  </div>
);

const SettingsModal = () => {
  const { showSettings, toggleSettings } = usePanelStore();
  const { settings, updateSettings, resetPosition } = useSettingsStore();

  return (
    <AnimatePresence>
      {showSettings && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 flex items-end"
          style={{ borderRadius: 'inherit' }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-galaxy-900/90 backdrop-blur-sm" style={{ borderRadius: 'inherit' }}
            onClick={toggleSettings} />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="relative w-full bg-galaxy-800 border-t border-white/10 rounded-b-2xl p-4 z-10 space-y-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-zinc-200 font-display">Settings</span>
              <button onClick={toggleSettings} className="w-6 h-6 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-white/10">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {[
                { key: 'muteNotifications' as const, label: 'Focus Mode', desc: 'No chat alerts while you work (join & hand-raise still notify)' },
                { key: 'muteChatSounds' as const, label: 'Mute Chat Sounds', desc: 'Silent message arrival' },
                { key: 'showGalaxyParticles' as const, label: 'Galaxy Particles', desc: 'Animated star background' },
                { key: 'compactMode' as const, label: 'Compact Mode', desc: 'Reduced padding & sizes' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-zinc-300">{label}</p>
                    <p className="text-[10px] text-zinc-600">{desc}</p>
                  </div>
                  <Toggle
                    checked={!!settings[key]}
                    onChange={() => updateSettings({ [key]: !settings[key] })}
                  />
                </div>
              ))}

              <div>
                <p className="text-xs font-medium text-zinc-300 mb-1.5">Theme Intensity</p>
                <IntensityPicker
                  value={settings.themeIntensity}
                  onChange={(v) => updateSettings({ themeIntensity: v })}
                />
              </div>

              <button
                onClick={resetPosition}
                className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Panel Position
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SettingsModal;
