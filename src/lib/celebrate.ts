import confetti from "canvas-confetti";

export const fireConfetti = (opts?: { intensity?: "low" | "medium" | "high" }) => {
  const intensity = opts?.intensity ?? "medium";
  const count = intensity === "high" ? 200 : intensity === "low" ? 60 : 120;
  const colors = ["#16a34a", "#22c55e", "#eab308", "#f59e0b", "#ffffff"];
  confetti({
    particleCount: count,
    spread: 80,
    origin: { y: 0.6 },
    colors,
    scalar: 1.1,
  });
};

export const fireSideCannons = () => {
  const colors = ["#16a34a", "#eab308", "#22c55e"];
  const end = Date.now() + 800;
  (function frame() {
    confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 }, colors });
    confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
};
