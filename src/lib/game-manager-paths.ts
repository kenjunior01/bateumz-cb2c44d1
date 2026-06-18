export type GameManagerKind = "spin-wheel" | "millionaire";

/** Business users manage games under /dashboard; admin/superadmin under /admin. */
export function getGameManagerPath(
  role: string | null | undefined,
  kind: GameManagerKind,
): string {
  const base = role === "business" ? "/dashboard" : "/admin";
  return kind === "spin-wheel" ? `${base}/spin-wheel-manager` : `${base}/millionaire-manager`;
}
