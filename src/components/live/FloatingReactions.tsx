import { useEffect, useState, useCallback } from "react";
import { subscribeReactions, sendReaction, type LiveReaction } from "@/lib/livePlatform";

interface Props {
  scheduledLiveId?: string;
  liveCode?: string;
}

interface FloatingEmoji {
  id: number;
  emoji: string;
  x: number;
  startY: number;
  createdAt: number;
}

let emojiIdCounter = 0;

const DEFAULT_EMOJIS = ["❤️", "😂", "🔥", "👏", "🎉", "😍", "💀", "🤔", "💯", "🚀"];

const FloatingReactions = ({ scheduledLiveId, liveCode }: Props) => {
  const [floating, setFloating] = useState<FloatingEmoji[]>([]);
  const liveId = scheduledLiveId || liveCode || "unknown";

  const addFloatingEmoji = useCallback((emoji: string, x?: number) => {
    const id = ++emojiIdCounter;
    const newEmoji: FloatingEmoji = {
      id,
      emoji,
      x: x ?? Math.random() * 80 + 10,
      startY: 85,
      createdAt: Date.now(),
    };
    setFloating((prev) => [...prev, newEmoji]);
    setTimeout(() => {
      setFloating((prev) => prev.filter((e) => e.id !== id));
    }, 3500);
  }, []);

  useEffect(() => {
    const unsub = subscribeReactions(liveId, { scheduled_live_id: scheduledLiveId, live_code: liveCode }, (r: LiveReaction) => {
      addFloatingEmoji(r.emoji);
    });
    return unsub;
  }, [liveId, scheduledLiveId, liveCode, addFloatingEmoji]);

  const handleClick = async (emoji: string) => {
    await sendReaction({ scheduled_live_id: scheduledLiveId, live_code: liveCode, emoji });
    addFloatingEmoji(emoji);
  };

  return (
    <>
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {floating.map((fe) => {
          const age = (Date.now() - fe.createdAt) / 3500;
          const yOffset = -80 * age;
          const opacity = age > 0.6 ? 1 - (age - 0.6) / 0.4 : 1;
          const scale = 1 + age * 0.3;
          const sway = Math.sin(age * Math.PI * 4) * 15;
          return (
            <div
              key={fe.id}
              className="absolute text-3xl select-none"
              style={{
                left: `${fe.x + sway}%`,
                bottom: `${-yOffset}%`,
                opacity: Math.max(0, opacity),
                transform: `scale(${scale})`,
                transition: "bottom 3.5s linear, opacity 0.3s ease, transform 3.5s ease",
              }}
            >
              {fe.emoji}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-1 py-2">
        {DEFAULT_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleClick(emoji)}
            className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-secondary active:scale-150 transition-all text-lg"
            aria-label={`Reagir com ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </>
  );
};

export default FloatingReactions;
