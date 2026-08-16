// Detects user's prefers-reduced-motion setting and low-end devices
// Used to disable heavy animations on mobile/low-end devices

import { useEffect, useState } from 'react';

let _isLowEnd: boolean | undefined;

function detectLowEnd(): boolean {
  if (typeof window === 'undefined') return false;
  // Cache the result
  if (_isLowEnd !== undefined) return _isLowEnd;
  
  const nav = navigator as any;
  const cores = nav.hardwareConcurrency || 2;
  const mem = nav.deviceMemory || 4; // GB
  const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(nav.userAgent);
  
  // Low-end: <= 4 cores, <= 4GB RAM, or mobile
  _isLowEnd = (cores <= 4 && mem <= 4) || (isMobile && cores <= 6);
  return _isLowEnd;
}

export function useReducedMotion(): { reduced: boolean; lowEnd: boolean; disableHeavyFx: boolean } {
  const [reduced, setReduced] = useState(false);
  const [lowEnd, setLowEnd] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mql.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener('change', handler);
    setLowEnd(detectLowEnd());
    return () => mql.removeEventListener('change', handler);
  }, []);

  return { 
    reduced, 
    lowEnd, 
    // Master flag: disable heavy effects if either reduced motion or low-end device
    disableHeavyFx: reduced || lowEnd 
  };
}

export { detectLowEnd };
