import { useEffect, useRef, useState, useCallback } from 'react';

interface ScrollRevealOptions {
  /** IntersectionObserver threshold (0-1). @default 0.15 */
  threshold?: number;
  /** IntersectionObserver rootMargin. @default '0px 0px -50px 0px' */
  rootMargin?: string;
  /** Stop observing after first reveal. @default true */
  triggerOnce?: boolean;
  /** Milliseconds to wait before setting isVisible to true. @default 0 */
  delay?: number;
}

interface ScrollRevealResult {
  /** Callback ref to attach to any HTMLElement */
  ref: React.RefCallback<HTMLElement>;
  /** Whether the element is currently intersecting the viewport */
  isVisible: boolean;
  /** Whether the element has been in the viewport at least once */
  hasBeenVisible: boolean;
}

/**
 * Hook that uses IntersectionObserver to detect when an element enters the
 * viewport and triggers reveal animations.
 *
 * @example
 * ```tsx
 * const { ref, isVisible } = useScrollReveal({ threshold: 0.2, delay: 200 });
 * return <div ref={ref} style={{ opacity: isVisible ? 1 : 0 }}>Hello</div>;
 * ```
 */
export function useScrollReveal(options: ScrollRevealOptions = {}): ScrollRevealResult {
  const {
    threshold = 0.15,
    rootMargin = '0px 0px -50px 0px',
    triggerOnce = true,
    delay = 0,
  } = options;

  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);
  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasTriggeredRef = useRef(false);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (!entry) return;

      const isIntersecting = entry.isIntersecting;

      if (isIntersecting) {
        if (triggerOnce && hasTriggeredRef.current) return;
        hasTriggeredRef.current = true;

        if (delay > 0) {
          delayTimerRef.current = setTimeout(() => {
            setIsVisible(true);
            setHasBeenVisible(true);
          }, delay);
        } else {
          setIsVisible(true);
          setHasBeenVisible(true);
        }

        // Stop observing immediately when triggerOnce
        if (triggerOnce && observerRef.current && elementRef.current) {
          observerRef.current.unobserve(elementRef.current);
        }
      } else {
        // Clear pending delay if element leaves before delay fires
        if (delayTimerRef.current) {
          clearTimeout(delayTimerRef.current);
          delayTimerRef.current = null;
        }

        // Only revert visibility if not triggerOnce
        if (!triggerOnce) {
          setIsVisible(false);
        }
      }
    },
    [triggerOnce, delay],
  );

  // Callback ref — attaches the observer whenever the DOM node appears
  const ref = useCallback(
    (node: HTMLElement | null) => {
      // Cleanup previous observer + element
      if (observerRef.current && elementRef.current) {
        observerRef.current.unobserve(elementRef.current);
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      elementRef.current = node;

      if (!node) return;

      // SSR / non-browser guard
      if (typeof IntersectionObserver === 'undefined') {
        setIsVisible(true);
        setHasBeenVisible(true);
        return;
      }

      observerRef.current = new IntersectionObserver(handleIntersection, {
        threshold,
        rootMargin,
      });

      observerRef.current.observe(node);
    },
    [handleIntersection, threshold, rootMargin],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current);
      }
      if (observerRef.current && elementRef.current) {
        observerRef.current.unobserve(elementRef.current);
        observerRef.current.disconnect();
      }
    };
  }, []);

  return { ref, isVisible, hasBeenVisible };
}

// ---------------------------------------------------------------------------
// useMultiScrollReveal — variant that returns an array of callback refs
// ---------------------------------------------------------------------------

interface MultiScrollRevealOptions extends ScrollRevealOptions {
  /** Number of elements to observe. @default 1 */
  count?: number;
}

interface MultiScrollRevealResult {
  /** Array of callback refs, one per element */
  refs: React.RefCallback<HTMLElement>[];
  /** Array of booleans — each element's current visibility */
  isVisible: boolean[];
  /** Array of booleans — each element's "ever been visible" state */
  hasBeenVisible: boolean[];
}

/**
 * Variant of `useScrollReveal` that tracks multiple elements.
 *
 * @example
 * ```tsx
 * const { refs, isVisible } = useMultiScrollReveal({ count: 3, stagger: 100 });
 * return items.map((item, i) => (
 *   <div key={i} ref={refs[i]} style={{ opacity: isVisible[i] ? 1 : 0 }}>
 *     {item}
 *   </div>
 * ));
 * ```
 */
export function useMultiScrollReveal(options: MultiScrollRevealOptions = {}): MultiScrollRevealResult {
  const { count = 1, ...scrollOptions } = options;

  // Build a per-index delay: base delay + index * stagger (stored in custom field)
  // We reuse the base useScrollReveal for each slot by creating thin wrappers.
  const results: ScrollRevealResult[] = Array.from({ length: count }, (_, index) => {
    const perElementDelay = (scrollOptions.delay ?? 0) + index * (options._stagger ?? 0);

    // We intentionally pass delay as a computed value via the closure.
    // eslint-disable-next-line react-hooks/rules-of-hooks -- count is stable across renders
    return useScrollReveal({
      ...scrollOptions,
      delay: perElementDelay,
    });
  });

  return {
    refs: results.map((r) => r.ref),
    isVisible: results.map((r) => r.isVisible),
    hasBeenVisible: results.map((r) => r.hasBeenVisible),
  };
}

/**
 * Convenience wrapper around `useMultiScrollReveal` with a built-in `stagger`
 * delay between each element.
 *
 * @param count - Number of elements to observe
 * @param stagger - Delay in ms between each successive element
 * @param options - Additional `ScrollRevealOptions`
 */
export function useStaggeredScrollReveal(
  count: number,
  stagger: number = 100,
  options: ScrollRevealOptions = {},
): MultiScrollRevealResult {
  return useMultiScrollReveal({ ...options, count, _stagger: stagger } as MultiScrollRevealOptions);
}
