// =============================================================
// SOUND SETTINGS PANEL - Inline volume & haptic controls
// Integrates with sound-engine.ts config system
// =============================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSoundEffects, type SoundCategory } from '../hooks/useSoundEffects';

const CATEGORIES: { key: SoundCategory; label: string; icon: string }[] = [
  { key: 'ui', label: 'Interface', icon: '👆' },
  { key: 'feedback', label: 'Feedback', icon: '✅' },
  { key: 'game', label: 'Jogos', icon: '🎮' },
  { key: 'coins', label: 'Moedas', icon: '💰' },
  { key: 'social', label: 'Social', icon: '💬' },
  { key: 'ambient', label: 'Ambiente', icon: '🌊' },
];

interface SoundSettingsProps {
  compact?: boolean; // show just master toggle + slider
  className?: string;
}

export default function SoundSettings({ compact = false, className = '' }: SoundSettingsProps) {
  const { config, setMasterVolume, setCategoryVolume, toggleSound, toggleHaptic, sfx } = useSoundEffects();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`${className}`}>
      {/* Header row - always visible */}
      <div className="flex items-center gap-2">
        {/* Master toggle */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            toggleSound();
            if (config.enabled) sfx.modalClose();
            else sfx.modalOpen();
          }}
          className={`relative w-9 h-9 rounded-lg flex items-center justify-center text-sm transition-colors ${
            config.enabled
              ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
              : 'bg-white/5 text-white/30 hover:bg-white/10'
          }`}
          title={config.enabled ? 'Som ligado' : 'Som desligado'}
        >
          {config.enabled ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.08" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          )}
        </motion.button>

        {/* Master volume slider */}
        {config.enabled && (
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(config.masterVolume * 100)}
            onChange={(e) => setMasterVolume(Number(e.target.value) / 100)}
            className="w-20 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
                       [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg
                       [&::-webkit-slider-thumb]:shadow-cyan-400/30"
          />
        )}

        {/* Expand button */}
        {!compact && config.enabled && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              setExpanded(!expanded);
              sfx.click();
            }}
            className="w-7 h-7 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
          >
            <motion.svg
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <polyline points="6 9 12 15 18 9" />
            </motion.svg>
          </motion.button>
        )}
      </div>

      {/* Expanded panel */}
      <AnimatePresence>
        {expanded && !compact && config.enabled && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-3">
              {/* Category sliders */}
              {CATEGORIES.map((cat) => (
                <div key={cat.key} className="flex items-center gap-2">
                  <span className="text-xs w-5 text-center">{cat.icon}</span>
                  <span className="text-xs text-white/50 w-16">{cat.label}</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(config.categories[cat.key] * 100)}
                    onChange={(e) => {
                      setCategoryVolume(cat.key, Number(e.target.value) / 100);
                    }}
                    onMouseDown={() => sfx.click()}
                    className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer
                               [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                               [&::-webkit-slider-thumb]:bg-white/60 [&::-webkit-slider-thumb]:rounded-full
                               [&::-webkit-slider-thumb]:hover:bg-white/90 transition-colors"
                  />
                  <span className="text-[10px] text-white/30 w-8 text-right tabular-nums">
                    {Math.round(config.categories[cat.key] * 100)}%
                  </span>
                </div>
              ))}

              {/* Haptic toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                <span className="text-xs text-white/50">Vibracao (haptico)</span>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    toggleHaptic();
                    sfx.toggleOn();
                  }}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    config.hapticEnabled ? 'bg-cyan-500/40' : 'bg-white/10'
                  }`}
                >
                  <motion.div
                    className="absolute top-0.5 w-4 h-4 rounded-full shadow-md"
                    animate={{
                      left: config.hapticEnabled ? 22 : 2,
                      backgroundColor: config.hapticEnabled ? '#00d4ff' : 'rgba(255,255,255,0.3)',
                    }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
