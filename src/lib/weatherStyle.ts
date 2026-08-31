// 面板共用的語意配色

// AQI 分級配色
export function aqiColor(aqi: number | null): string {
  if (aqi === null) return "#e5e7eb";
  if (aqi <= 50) return "#4ade80";
  if (aqi <= 100) return "#c8d94f";
  if (aqi <= 150) return "#fbbf24";
  if (aqi <= 200) return "#fb923c";
  if (aqi <= 300) return "#ef4444";
  return "#c084fc";
}

// 舒適度用暖色點出來，但真的舒適時不該亮橙色
export function comfortColor(label: string): string {
  if (label === "舒適" || label === "微涼") return "#86efac";
  if (label === "悶熱" || label === "寒冷") return "#fb923c";
  return "#fcd34d";
}

export function evaporationColor(label: string): string {
  if (label === "強") return "#fb923c";
  if (label === "弱") return "#e2e8f0";
  return "#fcd34d";
}
