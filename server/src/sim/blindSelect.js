// Weighted random blind-player (korebe) selection; previous blind player gets a significantly lower chance.
import { NORMAL_BLIND_WEIGHT, PREV_BLIND_WEIGHT } from "../config.js";

// Pure function. Picks one id from aliveIds using weighted random.
export function selectBlind(aliveIds, prevBlindId) {
  if (aliveIds.length === 0) return null;
  if (aliveIds.length === 1) return aliveIds[0];

  const weights = aliveIds.map((id) =>
    id === prevBlindId ? PREV_BLIND_WEIGHT : NORMAL_BLIND_WEIGHT
  );
  const total = weights.reduce((a, b) => a + b, 0);

  let r = Math.random() * total;
  for (let i = 0; i < aliveIds.length; i++) {
    r -= weights[i];
    if (r <= 0) return aliveIds[i];
  }
  return aliveIds[aliveIds.length - 1];
}
