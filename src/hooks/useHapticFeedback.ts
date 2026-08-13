// =============================================================
// HAPTIC FEEDBACK HOOK - Vibration API with patterns
// =============================================================

import { useCallback } from 'react';

export type HapticPattern =
  | 'light'      // 10ms tick
  | 'medium'     // 20ms click
  | 'heavy'      // 40ms thud
  | 'success'    // [20, 30, 20]
  | 'error'      // 50ms buzz
  | 'warning'    // [30, 50, 30]
  | 'select'     // [10, 20]
  | 'navigation' // [15, 30, 15]
  | 'coin'       // [10, 10, 10]
  | 'win'        // [20, 40, 20, 40, 60]
  | 'bigWin'     // [20, 30, 40, 50, 60, 80, 100]
  | 'lose'       // 40ms
  | 'heartbeat'  // [20, 40, 20, 40]
  | 'alert'      // [30, 50, 30, 50, 30]
  | 'secret'     // [10, 40, 10];

const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 40,
  success: [20, 30, 20],
  error: 50,
  warning: [30, 50, 30],
  select: [10, 20],
  navigation: [15, 30, 15],
  coin: [10, 10, 10],
  win: [20, 40, 20, 40, 60],
  bigWin: [20, 30, 40, 50, 60, 80, 100],
  lose: 40,
  heartbeat: [20, 40, 20, 40],
  alert: [30, 50, 30, 50, 30],
  secret: [10, 40, 10],
};

export function useHapticFeedback() {
  const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  const haptic = useCallback(
    (pattern: HapticPattern | number | number[]) => {
      if (!isSupported) return;
      try {
        const p = typeof pattern === 'string' ? PATTERNS[pattern] : pattern;
        navigator.vibrate(p);
      } catch {}
    },
    [isSupported]
  );

  const cancel = useCallback(() => {
    if (!isSupported) return;
    try { navigator.vibrate(0); } catch {}
  }, [isSupported]);

  return { haptic, cancel, isSupported };
}

export default useHapticFeedback;
