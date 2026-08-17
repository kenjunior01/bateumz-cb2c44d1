// =============================================================
// PULL-TO-REFRESH HOOK - Native-app-like pull-down to refresh
// =============================================================
// Detects downward pull gesture at scroll top and triggers a
// refresh callback with a smooth spinning indicator animation.

import { useEffect, useRef, useState, useCallback, type RefObject } from 'react';

/** Configuration constants for pull-to-refresh gesture detection. */
const THRESHOLD = 60;       // Minimum pull distance to trigger refresh
const INDICATOR_SIZE = 48;   // Height of the pull indicator area
const SPINNER_SIZE = 24;     // Diameter of the spinner icon
const DAMPING = 0.4;         // Resistance factor: user pulls 100px → indicator moves 40px

export interface PullToRefreshReturn {
  pullDistance: number;
  isPulling: boolean;
  isRefreshing: boolean;
}

/**
 * Hook that enables pull-to-refresh on a scrollable container.
 *
 * @param containerRef - Ref to the scrollable container element (must have overflow scroll/auto)
 * @param onRefresh   - Callback invoked when pull threshold is reached (can be async)
 * @returns Object with current pull state for external rendering
 */
export function usePullToRefresh(
  containerRef: RefObject<HTMLElement | null>,
  onRefresh: () => void | Promise<void>
): PullToRefreshReturn {
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refs for all touch tracking (avoids re-renders during gesture)
  const touchStartY = useRef(0);
  const currentPull = useRef(0);
  const isGestureActive = useRef(false);
  const indicatorEl = useRef<HTMLDivElement | null>(null);
  const spinnerEl = useRef<SVGSVGElement | null>(null);
  let rotation = 0; // Tracks spinner rotation angle

  /**
   * Creates the pull indicator DOM element and prepends it to the container.
   * Uses inline styles exclusively — no external CSS required.
   */
  const createIndicator = useCallback(() => {
    const container = containerRef.current;
    if (!container || indicatorEl.current) return;

    const indicator = document.createElement('div');
    indicator.setAttribute('data-pull-indicator', 'true');

    // Base styles: hidden above the container, centered horizontally
    Object.assign(indicator.style, {
      position: 'absolute',
      top: `${-INDICATOR_SIZE}px`,
      left: '50%',
      transform: 'translateX(-50%)',
      width: `${INDICATOR_SIZE}px`,
      height: `${INDICATOR_SIZE}px`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none',
      zIndex: '50',
      overflow: 'hidden',
      willChange: 'transform',
      transition: 'none',
    });

    // Create the spinner SVG
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', String(SPINNER_SIZE));
    svg.setAttribute('height', String(SPINNER_SIZE));
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    Object.assign(svg.style, {
      color: 'var(--primary, hsl(222, 47%, 51%))',
      opacity: '0.8',
    });

    const circle = document.createElementNS(NS, 'circle');
    circle.setAttribute('cx', '12');
    circle.setAttribute('cy', '12');
    circle.setAttribute('r', '10');
    circle.setAttribute('stroke', 'currentColor');
    circle.setAttribute('stroke-width', '3');
    circle.setAttribute('stroke-linecap', 'round');
    circle.setAttribute('stroke-dasharray', '31.4 31.4');

    svg.appendChild(circle);
    indicator.appendChild(svg);

    // Ensure container is positioned relatively so absolute works
    const containerPos = getComputedStyle(container).position;
    if (containerPos === 'static' || !containerPos) {
      container.style.position = 'relative';
    }

    container.insertBefore(indicator, container.firstChild);
    indicatorEl.current = indicator;
    spinnerEl.current = svg;
  }, [containerRef]);

  /**
   * Removes the indicator from the DOM and cleans up container styles.
   */
  const removeIndicator = useCallback(() => {
    const container = containerRef.current;
    if (container && indicatorEl.current) {
      container.removeChild(indicatorEl.current);
      indicatorEl.current = null;
      spinnerEl.current = null;
    }
  }, [containerRef]);

  /**
   * Checks whether the scrollable target is at the top (scrollTop === 0).
   * Accounts for both the container itself and the window/document.
   */
  const isAtTop = useCallback((): boolean => {
    const container = containerRef.current;
    if (!container) return true;

    // If container is the document/body, check window scroll
    if (
      container === document.documentElement ||
      container === document.body
    ) {
      return window.scrollY === 0;
    }

    return container.scrollTop <= 0;
  }, [containerRef]);

  /**
   * Visually translates the indicator using CSS transform (60fps, no layout).
   * Progress is 0..1+ normalized pull distance.
   */
  const updateIndicatorPosition = useCallback((pullPx: number, progress: number) => {
    const indicator = indicatorEl.current;
    if (!indicator) return;

    // Position indicator: starts at -INDICATOR_SIZE, moves to 0 and beyond
    const translateY = -INDICATOR_SIZE + pullPx;
    indicator.style.transform = `translateX(-50%) translateY(${translateY}px)`;

    // Rotate the spinner proportionally to progress
    if (spinnerEl.current) {
      const angle = Math.min(progress * 360, 360);
      spinnerEl.current.style.transform = `rotate(${angle}deg)`;
      spinnerEl.current.style.opacity = String(Math.min(progress * 2, 0.8));
    }
  }, []);

  /**
   * Springs the indicator back to its hidden position above the container.
   */
  const springBack = useCallback(() => {
    const indicator = indicatorEl.current;
    if (!indicator) return;

    indicator.style.transition = 'transform 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.1)';
    indicator.style.transform = `translateX(-50%) translateY(${-INDICATOR_SIZE}px)`;

    if (spinnerEl.current) {
      spinnerEl.current.style.opacity = '0';
    }

    // Clear transition after animation completes
    const onEnd = () => {
      indicator.removeEventListener('transitionend', onEnd);
      indicator.style.transition = 'none';
    };
    indicator.addEventListener('transitionend', onEnd);
    setTimeout(onEnd, 400); // Fallback
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (isRefreshing) return;

    const touch = e.touches[0];
    touchStartY.current = touch.clientY;
    currentPull.current = 0;
    isGestureActive.current = false;
  }, [isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (isRefreshing || !isAtTop()) {
      isGestureActive.current = false;
      return;
    }

    const touch = e.touches[0];
    const deltaY = touch.clientY - touchStartY.current;

    // Only activate on downward pull (positive deltaY)
    if (deltaY <= 5) {
      isGestureActive.current = false;
      return;
    }

    isGestureActive.current = true;

    // Apply damping to make the pull feel resistant
    const dampened = deltaY * DAMPING;
    currentPull.current = dampened;

    // Calculate progress (0 = start, 1 = at threshold)
    const progress = Math.min(dampened / THRESHOLD, 1.5); // Allow overshoot

    updateIndicatorPosition(dampened, progress);

    // Update state minimally: only toggle isPulling
    setIsPulling(true);
    setPullDistance(Math.round(dampened));
  }, [isRefreshing, isAtTop, updateIndicatorPosition]);

  const handleTouchEnd = useCallback(async () => {
    if (!isGestureActive.current) {
      setIsPulling(false);
      setPullDistance(0);
      return;
    }
    isGestureActive.current = false;
    setIsPulling(false);

    if (currentPull.current >= THRESHOLD) {
      // Threshold reached → trigger refresh
      setIsRefreshing(true);
      setPullDistance(THRESHOLD);

      // Keep indicator visible at threshold position
      const indicator = indicatorEl.current;
      if (indicator) {
        indicator.style.transition = 'transform 0.15s ease';
        indicator.style.transform = `translateX(-50%) translateY(0px)`;
      }

      // Start spinning animation
      if (spinnerEl.current) {
        spinnerEl.current.style.opacity = '0.8';
        // Continuous rotation via CSS animation
        spinnerEl.current.style.animation = 'pull-to-refresh-spin 0.8s linear infinite';
      }

      try {
        await onRefresh();
      } catch {
        // Silently handle refresh errors
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);

        // Stop spinning and spring back
        if (spinnerEl.current) {
          spinnerEl.current.style.animation = '';
        }
        springBack();
      }
    } else {
      // Below threshold → spring back immediately
      setPullDistance(0);
      springBack();
    }
  }, [onRefresh, springBack]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Create the indicator element
    createIndicator();

    // Prevent browser's native pull-to-refresh on iOS/Android
    container.style.overscrollBehavior = 'none';
    container.style.overflowY = container.style.overflowY || 'auto';

    // Inject the spinner keyframe animation into the document (once)
    if (!document.getElementById('pull-to-refresh-style')) {
      const style = document.createElement('style');
      style.id = 'pull-to-refresh-style';
      style.textContent = `
        @keyframes pull-to-refresh-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }

    // Attach touch event listeners
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    // touchmove needs to NOT be passive so we can preventDefault if needed
    // But since we only activate at scrollTop=0, we conditionally prevent:
    const handleTouchMovePrevent = (e: TouchEvent) => {
      if (isGestureActive.current && isAtTop()) {
        e.preventDefault(); // Prevent scroll while pulling
      }
    };
    container.addEventListener('touchmove', handleTouchMovePrevent, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchmove', handleTouchMovePrevent);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);

      removeIndicator();

      // Clean up overscroll behavior
      container.style.overscrollBehavior = '';
    };
  }, [
    containerRef,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    createIndicator,
    removeIndicator,
    isAtTop,
  ]);

  return { pullDistance, isPulling, isRefreshing };
}

export default usePullToRefresh;
