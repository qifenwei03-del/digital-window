// 月相沒有現成 API，只能自己算。
// 以 2000-01-06 18:14 UTC 這次新月為基準，除以朔望月長度取餘數。
const KNOWN_NEW_MOON_UTC = Date.UTC(2000, 0, 6, 18, 14);
const SYNODIC_MONTH_DAYS = 29.530588853;

export type Moon = {
  age: number; // 月齡（天）
  illumination: number; // 可見比例 0–1
  waxing: boolean; // true = 上弦（漸盈），亮面在右
};

export function moonPhase(utcMillis: number): Moon {
  const days = (utcMillis - KNOWN_NEW_MOON_UTC) / 86_400_000;
  const age = ((days % SYNODIC_MONTH_DAYS) + SYNODIC_MONTH_DAYS) % SYNODIC_MONTH_DAYS;
  return {
    age,
    illumination: (1 - Math.cos((2 * Math.PI * age) / SYNODIC_MONTH_DAYS)) / 2,
    waxing: age < SYNODIC_MONTH_DAYS / 2,
  };
}
