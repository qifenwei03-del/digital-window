const LOCATION = {
  city: "台北市 大安區",
  latitude: 25.0262,
  longitude: 121.5435,
} as const;

export type Weather = {
  city: string;
  description: string;
  temperature: number; // °C
  feelsLike: number; // °C
  windSpeed: number; // km/h
  windDirection: string;
  humidity: number; // %
  precipitationProbability: number; // %
  precipitation: number; // mm
  visibility: number; // km
  pressure: number; // hPa
  cloudCover: number; // %
  uvIndex: number;
  uvLabel: string;
  sunrise: string; // HH:mm
  sunset: string; // HH:mm
  aqi: number | null;
  aqiLabel: string | null;
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

const WIND_DIRECTIONS = ["北", "東北", "東", "東南", "南", "西南", "西", "西北"];

function windDirectionLabel(degrees: number): string {
  return WIND_DIRECTIONS[Math.round(degrees / 45) % 8];
}

function uvLabel(uv: number): string {
  if (uv < 3) return "低";
  if (uv < 6) return "中等";
  if (uv < 8) return "高";
  if (uv < 11) return "甚高";
  return "危險";
}

// 台灣 AQI 分級
function aqiLabel(aqi: number): string {
  if (aqi <= 50) return "良好";
  if (aqi <= 100) return "普通";
  if (aqi <= 150) return "敏感不宜";
  if (aqi <= 200) return "不健康";
  if (aqi <= 300) return "非常不健康";
  return "危害";
}

const hhmm = (iso: string) => iso.slice(11, 16);

export async function fetchWeather(): Promise<Weather> {
  const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
  forecastUrl.searchParams.set("latitude", String(LOCATION.latitude));
  forecastUrl.searchParams.set("longitude", String(LOCATION.longitude));
  forecastUrl.searchParams.set("timezone", "Asia/Taipei");
  forecastUrl.searchParams.set(
    "current",
    "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,precipitation,cloud_cover,pressure_msl"
  );
  // forecast_hours=1 讓 hourly 陣列只含當前這一小時
  forecastUrl.searchParams.set("hourly", "precipitation_probability,visibility,uv_index");
  forecastUrl.searchParams.set("forecast_hours", "1");
  forecastUrl.searchParams.set("daily", "sunrise,sunset");
  forecastUrl.searchParams.set("forecast_days", "1");

  const airUrl = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  airUrl.searchParams.set("latitude", String(LOCATION.latitude));
  airUrl.searchParams.set("longitude", String(LOCATION.longitude));
  airUrl.searchParams.set("current", "us_aqi");

  // 空氣品質是另一個服務，失敗時不影響天氣本體
  const [forecastRes, airRes] = await Promise.all([
    fetch(forecastUrl),
    fetch(airUrl).catch(() => null),
  ]);
  if (!forecastRes.ok) throw new Error(`Weather request failed: ${forecastRes.status}`);

  const data = await forecastRes.json();
  const air = airRes?.ok ? await airRes.json() : null;
  const aqi: number | null = air?.current?.us_aqi ?? null;
  const current = data.current;
  const uv = data.hourly.uv_index[0];

  return {
    city: LOCATION.city,
    description: WEATHER_CODES[current.weather_code] ?? "—",
    temperature: Math.round(current.temperature_2m),
    feelsLike: Math.round(current.apparent_temperature),
    windSpeed: Math.round(current.wind_speed_10m),
    windDirection: windDirectionLabel(current.wind_direction_10m),
    humidity: Math.round(current.relative_humidity_2m),
    precipitationProbability: Math.round(data.hourly.precipitation_probability[0]),
    precipitation: Math.round(current.precipitation * 10) / 10,
    visibility: Math.round(data.hourly.visibility[0] / 1000),
    pressure: Math.round(current.pressure_msl),
    cloudCover: Math.round(current.cloud_cover),
    uvIndex: Math.round(uv),
    uvLabel: uvLabel(uv),
    sunrise: hhmm(data.daily.sunrise[0]),
    sunset: hhmm(data.daily.sunset[0]),
    aqi: aqi === null ? null : Math.round(aqi),
    aqiLabel: aqi === null ? null : aqiLabel(aqi),
  };
}
