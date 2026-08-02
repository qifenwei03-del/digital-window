const LOCATION = {
  city: "台北市 大安區",
  latitude: 25.0262,
  longitude: 121.5435,
} as const;

export type Weather = {
  city: string;
  description: string;
  temperature: number; // °C
  windSpeed: number; // km/h
};

// WMO weather code → 中文描述
const WEATHER_CODES: Record<number, string> = {
  0: "晴朗",
  1: "大致晴朗",
  2: "局部多雲",
  3: "陰天",
  45: "有霧",
  48: "霧凇",
  51: "毛毛雨",
  53: "毛毛雨",
  55: "毛毛雨",
  61: "小雨",
  63: "中雨",
  65: "大雨",
  66: "凍雨",
  67: "凍雨",
  71: "小雪",
  73: "中雪",
  75: "大雪",
  77: "霰",
  80: "陣雨",
  81: "陣雨",
  82: "強陣雨",
  85: "陣雪",
  86: "陣雪",
  95: "雷雨",
  96: "雷雨夾冰雹",
  99: "雷雨夾冰雹",
};

export async function fetchWeather(): Promise<Weather> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(LOCATION.latitude));
  url.searchParams.set("longitude", String(LOCATION.longitude));
  url.searchParams.set("current", "temperature_2m,weather_code,wind_speed_10m");

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather request failed: ${res.status}`);

  const data = await res.json();
  return {
    city: LOCATION.city,
    description: WEATHER_CODES[data.current.weather_code] ?? "—",
    temperature: Math.round(data.current.temperature_2m),
    windSpeed: Math.round(data.current.wind_speed_10m),
  };
}
