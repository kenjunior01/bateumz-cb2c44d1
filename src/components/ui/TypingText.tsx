// =============================================================
// TYPING TEXT - Character-by-character typing animation with cursor
// Signature BATEU component for hero sections and announcements
// =============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TypingTextProps {
  texts: string[];
  className?: string;
  typingSpeed?: number; // ms per character
  deleteSpeed?: number; // ms per character when deleting
  pauseDuration?: number; // ms pause between texts
  cursorColor?: string;
  cursorBlinkSpeed?: number; // ms
  loop?: boolean;
  onComplete?: () => void;
  soundEnabled?: boolean;
}

export default function TypingText({
  texts,
  className = '',
  typingSpeed = 60,
  deleteSpeed = 30,
  pauseDuration = 2000,
  cursorColor = '#00d4ff',
  cursorBlinkSpeed = 530,
  loop = true,
  onComplete,
  soundEnabled = true,
}: TypingTextProps) {
  const [displayText, setDisplayText] = useState('');
  const [textIndex, setTextIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const [showCursor, setShowCursor] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const charIndexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Cursor blink
  useEffect(() => {
    const interval = setInterval(() => setShowCursor((v) => !v), cursorBlinkSpeed);
    return () => clearInterval(interval);
  }, [cursorBlinkSpeed]);

  const type = useCallback(() => {
    const currentText = texts[textIndex];
    if (!currentText) return;

    if (isTyping) {
      charIndexRef.current++;
      setDisplayText(currentText.slice(0, charIndexRef.current));

      if (charIndexRef.current >= currentText.length) {
        // Done typing this text
        if (textIndex >= texts.length - 1 && !loop) {
          setIsComplete(true);
          onComplete?.();
          return;
        }
        setIsTyping(false);
        timerRef.current = setTimeout(() => {
          charIndexRef.current--;
          setDisplayText(currentText.slice(0, charIndexRef.current));
          // Start delete loop
          const deleteLoop = () => {
            charIndexRef.current--;
            if (charIndexRef.current <= 0) {
              setTextIndex((prev) => (prev + 1) % texts.length);
              setIsTyping(true);
              timerRef.current = setTimeout(type, typingSpeed);
              return;
            }
            setDisplayText(currentText.slice(0, charIndexRef.current));
            timerRef.current = setTimeout(deleteLoop, deleteSpeed);
          };
          deleteLoop();
        }, pauseDuration);
        return;
      }

      // Vary speed slightly for natural feel
      const variance = Math.random() * 20 - 10;
      timerRef.current = setTimeout(type, typingSpeed + variance);
    }
  }, [isTyping, textIndex, texts, typingSpeed, deleteSpeed, pauseDuration, loop, onComplete]);

  // Start typing on mount
  useEffect(() => {
    timerRef.current = setTimeout(type, 500);
    return () => clearTimeout(timerRef.current);
  }, [type, textIndex]);

  return (
    <span className={`inline-flex ${className}`}>
      <span>{displayText}</span>
      <AnimatePresence>
        {!isComplete && (
          <motion.span
            className="inline-block"
            style={{
              color: cursorColor,
              borderRight: `2px solid ${cursorColor}`,
              width: 2,
              marginLeft: 1,
            }}
            animate={{ opacity: showCursor ? 1 : 0 }}
            transition={{ duration: 0.05 }}
          />
        )}
      </AnimatePresence>
    </span>
  );
}
