import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleFollow, isFollowing } from "@/lib/livePlatform";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  userId: string;
  size?: "sm" | "md" | "lg";
  showCount?: boolean;
  initialCount?: number;
  onCountChange?: (n: number) => void;
}

const FollowButton = ({ userId, size = "md", showCount, initialCount, onCountChange }: Props) => {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [count, setCount] = useState(initialCount || 0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    isFollowing(userId).then(setFollowing).finally(() => setLoading(false));
    if (showCount) {
      import("@/lib/livePlatform").then((m) => m.getFollowersCount(userId).then(setCount));
    }
  }, [userId, user, showCount]);

  const handleToggle = async () => {
    if (!user) return;
    await toggleFollow(userId);
    const next = !following;
    setFollowing(next);
    if (showCount) {
      const newCount = next ? count + 1 : Math.max(0, count - 1);
      setCount(newCount);
      onCountChange?.(newCount);
    }
  };

  const sizeClasses = { sm: "h-7 px-3 text-[10px]", md: "h-8 px-4 text-xs", lg: "h-10 px-5 text-sm" };

  if (!user) return null;
  if (userId === user.id) return null;

  return (
    <Button
      variant={following ? "secondary" : "default"}
      className={`rounded-full gap-1.5 ${sizeClasses[size]} transition-all ${following ? "" : "hover:scale-105"}`}
      onClick={handleToggle}
      disabled={loading}
    >
      <Heart className={`h-3.5 w-3.5 transition-all ${following ? "fill-red-500 text-red-500" : ""}`} />
      {following ? "Seguindo" : "Seguir"}
      {showCount && <span className="text-muted-foreground">{count}</span>}
    </Button>
  );
};

export default FollowButton;
