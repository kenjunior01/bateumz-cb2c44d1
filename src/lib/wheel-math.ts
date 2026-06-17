/** Shared prize-wheel rotation math — pointer fixed at 12 o'clock, wheel rotates clockwise. */

export function getSegmentAngle(segmentCount: number): number {
  return 360 / Math.max(1, segmentCount);
}

/** Clockwise rotation (degrees) to land segment `winningIndex` under the top pointer. */
export function computeFinalRotation(
  currentRotation: number,
  winningIndex: number,
  segmentCount: number,
  extraFullSpins?: number,
): number {
  const seg = getSegmentAngle(segmentCount);
  const spins = extraFullSpins ?? 5 + Math.floor(Math.random() * 3);
  const segmentCenter = winningIndex * seg + seg / 2;
  return currentRotation + spins * 360 + (360 - segmentCenter);
}

/** Which segment index is under the top pointer at `rotationDeg`. */
export function getSegmentAtPointer(rotationDeg: number, segmentCount: number): number {
  const seg = getSegmentAngle(segmentCount);
  const normalized = ((rotationDeg % 360) + 360) % 360;
  const index = Math.floor(((360 - normalized - seg / 2 + 360) % 360) / seg);
  return index % segmentCount;
}

export function findPrizeIndex<T extends { id?: string; segment_number?: number }>(
  prizes: T[],
  winner: T | { id?: string; segment_number?: number },
): number {
  let idx = prizes.findIndex((p) => p.id && winner.id && p.id === winner.id);
  if (idx >= 0) return idx;
  if (winner.segment_number != null) {
    idx = prizes.findIndex((p) => p.segment_number === winner.segment_number);
    if (idx >= 0) return idx;
    idx = Number(winner.segment_number) - 1;
    if (idx >= 0 && idx < prizes.length) return idx;
  }
  return -1;
}

export function isNoWinLabel(label: string): boolean {
  const l = label.toLowerCase();
  return /tenta|nada|outra|perde|try again|sem pr/.test(l);
}
