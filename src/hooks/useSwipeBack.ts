// =============================================================
// SWIPE-BACK HOOK - iOS-style left-edge swipe to navigate back
// =============================================================
// Detects left-edge swipe gestures (within 20px of screen edge)
// and navigates back with a native-app-like page translation.

import { useEffect, useRef, useCallback, type RefObject } from 'react';
import { useNavigate } from 'react-router-dom';

/** Configuration constants for swipe-back gesture detection. */
const EDGE_ZONE = 20;        // Max distance from left edge to initiate swipe
const MIN_DISTANCE = 80;     // Minimum horizontal swipe distance to trigger
const MAX_DURATION = 300;    // Maximum swipe duration in ms (fast swipe)
const MAX_TRANSLATE = 0.4;   // Max page translation as fraction of screen width

export function useSwipeBack(ref?: RefObject<HTMLElement | null>) {
  const navigate = useNavigate();

  // Refs for tracking gesture state (avoids re-renders during touch move)
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);
  const isSwiping = useRef(false);
  const pageEl = useRef<HTMLElement | null>(null);
  const rafId = useRef(0);
  const prefersReducedMotion = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    touchStartTime.current = Date.now();
    isSwiping.current = false;

    // Only activate if touch starts within the left-edge zone
    if (touch.clientX > EDGE_ZONE) return;

    isSwiping.current = true;

    // Resolve the page element: use provided ref, or document.documentElement
    pageEl.current = ref?.current ?? document.documentElement;

    // Cancel any pending animation frame
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = 0;
    }
  }, [ref]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isSwiping.current || !pageEl.current) return;
    if (prefersReducedMotion.current) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = Math.abs(touch.clientY - touchStartY.current);

    // Cancel if user moves vertically more than horizontally (scrolling, not swiping)
    if (deltaY > Math.abs(deltaX)) {
      isSwiping.current = false;
      return;
    }

    // Only allow rightward swipe (positive deltaX)
    if (deltaX <= 0) return;

    const screenW = window.innerWidth;
    const maxPx = screenW * MAX_TRANSLATE;

    // Dampen the translation so it never exceeds maxPx
    // Using a simple ease curve: translate = maxPx * (1 - e^(-3 * progress))
    const progress = Math.min(deltaX / (MIN_DISTANCE * 2), 1);
    const translate = maxPx * (1 - Math.exp(-3 * progress));

    // Apply CSS transform directly (bypasses React render cycle → 60fps)
    pageEl.current.style.transform = `translateX(${translate}px)`;
    pageEl.current.style.transition = 'none';
    pageEl.current.style.willChange = 'transform';

    // Apply shadow on the left edge to mimic iOS peek effect
    const shadowOpacity = Math.min(progress * 1.2, 0.3);
    pageEl.current.style.boxShadow = `-${Math.round(translate * 0.3)}px 0 ${Math.round(translate * 0.6)}px rgba(0,0,0,${shadowOpacity})`;
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!isSwiping.current || !pageEl.current) {
      isSwiping.current = false;
      return;
    }
    isSwiping.current = false;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const duration = Date.now() - touchStartTime.current;
    const el = pageEl.current;

    const shouldNavigate =
      (deltaX >= MIN_DISTANCE && duration <= MAX_DURATION) ||
      deltaX >= MIN_DISTANCE;

    if (shouldNavigate) {
      // Animate page off-screen, then navigate
      el.style.transition = 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s ease';
      el.style.transform = `translateX(${window.innerWidth}px)`;
      el.style.boxShadow = 'none';

      const onAnimEnd = () => {
        el.removeEventListener('transitionend', onAnimEnd);
        // Reset styles
        el.style.transform = '';
        el.style.transition = '';
        el.style.willChange = '';
        el.style.boxShadow = '';
        navigate(-1);
      };
      el.addEventListener('transitionend', onAnimEnd);

      // Fallback in case transitionend doesn't fire (e.g. element removed)
      setTimeout(onAnimEnd, 300);
    } else {
      // Spring back to original position
      el.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.9, 0.3, 1.2), box-shadow 0.3s ease';
      el.style.transform = 'translateX(0)';
      el.style.boxShadow = 'none';

      const onReset = () => {
        el.removeEventListener('transitionend', onReset);
        el.style.transform = '';
        el.style.transition = '';
        el.style.willChange = '';
        el.style.boxShadow = '';
      };
      el.addEventListener('transitionend', onReset);

      // Fallback
      setTimeout(onReset, 350);
    }
  }, [navigate]);

  useEffect(() => {
    // Respect prefers-reduced-motion: disable the swipe gesture entirely
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotion.current = mql.matches;
    const onMotionChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion.current = e.matches;
    };
    mql.addEventListener('change', onMotionChange);

    // Determine the target element for event listeners
    const target = ref?.current ?? document;

    target.addEventListener('touchstart', handleTouchStart, { passive: true });
    target.addEventListener('touchmove', handleTouchMove, { passive: true });
    target.addEventListener('touchend', handleTouchEnd, { passive: true });
    target.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      mql.removeEventListener('change', onMotionChange);

      target.removeEventListener('touchstart', handleTouchStart);
      target.removeEventListener('touchmove', handleTouchMove);
      target.removeEventListener('touchend', handleTouchEnd);
      target.removeEventListener('touchcancel', handleTouchEnd);

      // Cleanup: reset any lingering transform on unmount
      if (pageEl.current) {
        pageEl.current.style.transform = '';
        pageEl.current.style.transition = '';
        pageEl.current.style.willChange = '';
        pageEl.current.style.boxShadow = '';
      }
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [ref, handleTouchStart, handleTouchMove, handleTouchEnd]);
}

export default useSwipeBack;
