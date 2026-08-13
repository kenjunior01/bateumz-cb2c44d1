// =============================================================
// ENHANCED SOUND EFFECTS HOOK v2.0
// Wraps sound-engine with React state, event listeners, and auto-init
// =============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  sfx,
  initAudio,
  getSoundConfig,
  updateSoundConfig,
  setMasterVolume,
  setCategoryVolume,
  toggleSound,
  toggleHaptic,
  type SoundConfig,
  type SoundCategory,
} from '../lib/sound-engine';

// Re-export for convenience
export { sfx, type SoundConfig, type SoundCategory };
export {
  getSoundConfig,
  updateSoundConfig,
  setMasterVolume,
  setCategoryVolume,
  toggleSound,
  toggleHaptic,
} from '../lib/sound-engine';

export function useSoundEffects() {
  const [config, setConfig] = useState<SoundConfig>(getSoundConfig());
  const initialized = useRef(false);

  // Init audio context on first user interaction
  const init = useCallback(() => {
    if (!initialized.current) {
      initAudio();
      initialized.current = true;
    }
  }, []);

  // Auto-init on first interaction anywhere on the page
  useEffect(() => {
    const handler = () => init();
    document.addEventListener('click', handler, { once: true, passive: true });
    document.addEventListener('touchstart', handler, { once: true, passive: true });
    document.addEventListener('keydown', handler, { once: true, passive: true });
    return () => {
      document.removeEventListener('click', handler);
      document.removeEventListener('touchstart', handler);
      document.removeEventListener('keydown', handler);
    };
  }, [init]);

  // Sync config with localStorage (listen for storage events from other tabs)
  useEffect(() => {
    const handler = () => setConfig(getSoundConfig());
    window.addEventListener('storage', handler);
    window.addEventListener('focus', handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('focus', handler);
    };
  }, []);

  // Local config mutators that also update React state
  const update = useCallback((partial: Partial<SoundConfig>) => {
    const newConfig = updateSoundConfig(partial);
    setConfig(newConfig);
    return newConfig;
  }, []);

  const setMaster = useCallback((vol: number) => {
    const newConfig = setMasterVolume(vol);
    setConfig(newConfig);
    return newConfig;
  }, []);

  const setCatVol = useCallback((cat: SoundCategory, vol: number) => {
    const newConfig = setCategoryVolume(cat, vol);
    setConfig(newConfig);
    return newConfig;
  }, []);

  const toggle = useCallback(() => {
    const newConfig = toggleSound();
    setConfig(newConfig);
    return newConfig;
  }, []);

  const toggleH = useCallback(() => {
    const newConfig = toggleHaptic();
    setConfig(newConfig);
    return newConfig;
  }, []);

  return {
    sfx,
    init,
    config,
    updateConfig: update,
    setMasterVolume: setMaster,
    setCategoryVolume: setCatVol,
    toggleSound: toggle,
    toggleHaptic: toggleH,
    isEnabled: config.enabled,
    isHapticEnabled: config.hapticEnabled,
  };
}

export default useSoundEffects;
