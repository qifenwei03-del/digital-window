import { moonPhase, type Moon } from "./moon";

const LOCATION = {
  city: "台北市 大安區",
  latitude: 25.0262,
  longitude: 121.5435,
} as const;

export type HourPoint = {
  time: string; // HH:mm
  temperature: number; // °C
  precipitationProbability: number; // %
  weatherCode: number;
  isDay: boolean;
};

export type Weather = {
  city: string;
  description: string;
  weatherCode: number;
  isDay: boolean;
  temperature: number; // °C
  feelsLike: number; // °C
  tempMax: number; // °C
  tempMin: number; // °C
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
  sunProgress: number; // 0–1
  aqi: number | null;
  aqiLabel: string | null;
  pm25: number | null; // μg/m³
  dominantPollutant: string | null;
  comfort: string;
  windGusts: number; // km/h
  windDirectionDegrees: number;
  dewPoint: number; // °C
  precipitationLastHour: number; // mm
  precipitationToday: number; // mm
  daylightMinutes: number;
  pm10: number | null; // μg/m³
  ozone: number | null; // μg/m³
  nitrogenDioxide: number | null; // μg/m³
  feelsTrend: string;
  evaporation: string;
  airState: string;
  moon: Moon;
  updatedAt: string; // YYYY/MM/DD HH:mm
  hourly: HourPoint[]; // 每 2 小時一點，共 6 點
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

// 舒適度：以體感溫度為主，濕度高時往「悶」修正
function comfortLabel(feelsLike: number, humidity: number): string {
  if (feelsLike >= 35) return "悶熱";
  if (feelsLike >= 30) return humidity >= 70 ? "偏悶熱" : "偏熱";
  if (feelsLike >= 26) return humidity >= 80 ? "微悶" : "溫暖";
  if (feelsLike >= 20) return "舒適";
  if (feelsLike >= 15) return "微涼";
  if (feelsLike >= 10) return "偏涼";
  return "寒冷";
}

// 體感趨勢：拿現在的體感溫度跟 3 小時後比
function feelsTrendLabel(now: number, later: number): string {
  const diff = later - now;
  if (diff >= 1.5) return "上升";
  if (diff <= -1.5) return "下降";
  return "穩定";
}

// 蒸發感：空氣越乾、風越大、溫度越高越明顯。API 沒有這個欄位，這是自訂指標。
function evaporationLabel(temperature: number, humidity: number, windSpeed: number): string {
  const index = ((100 - humidity) / 100) * (1 + windSpeed / 25) * (temperature / 28);
  if (index >= 0.75) return "強";
  if (index >= 0.35) return "中等";
  return "弱";
}

// 空氣狀態：比 AQI 分級再粗一階的說法
function airStateLabel(aqi: number | null): string {
  if (aqi === null) return "—";
  if (aqi <= 50) return "清新";
  if (aqi <= 100) return "普通";
  if (aqi <= 150) return "稍差";
  return "混濁";
}

// 用 API 的當地時間字串加上時區偏移還原成 UTC，月相才不會受展示機時鐘影響
function apiUtcMillis(localIso: string, utcOffsetSeconds: number): number {
  return Date.parse(`${localIso}:00Z`) - utcOffsetSeconds * 1000;
}

// Open-Meteo 直接提供各污染物的 AQI 分項，取最高者即為主要污染物
const POLLUTANT_LABELS: Record<string, string> = {
  us_aqi_pm2_5: "PM2.5",
  us_aqi_pm10: "PM10",
  us_aqi_ozone: "臭氧",
  us_aqi_nitrogen_dioxide: "二氧化氮",
  us_aqi_sulphur_dioxide: "二氧化硫",
  us_aqi_carbon_monoxide: "一氧化碳",
};

function dominantPollutant(current: Record<string, unknown>): string | null {
  let label: string | null = null;
  let highest = -1;
  for (const [key, name] of Object.entries(POLLUTANT_LABELS)) {
    const value = current[key];
    if (typeof value === "number" && value > highest) {
      highest = value;
      label = name;
    }
  }
  return label;
}

const hhmm = (iso: string) => iso.slice(11, 16);

const numberOrNull = (value: unknown): number | null =>
  typeof value === "number" ? Math.round(value * 10) / 10 : null;

// 全部用 API 回傳的當地時間字串計算，展示機的系統時鐘或時區設錯也不受影響
function minutesOfDay(iso: string) {
  return Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16));
}

function sunProgress(nowIso: string, sunriseIso: string, sunsetIso: string): number {
  const rise = minutesOfDay(sunriseIso);
  const set = minutesOfDay(sunsetIso);
  if (set <= rise) return 0;
  const ratio = (minutesOfDay(nowIso) - rise) / (set - rise);
  return Math.min(1, Math.max(0, ratio));
}

const formatUpdatedAt = (iso: string) =>
  `${iso.slice(0, 4)}/${iso.slice(5, 7)}/${iso.slice(8, 10)} ${iso.slice(11, 16)}`;

export async function fetchWeather(): Promise<Weather> {
  const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
  forecastUrl.searchParams.set("latitude", String(LOCATION.latitude));
  forecastUrl.searchParams.set("longitude", String(LOCATION.longitude));
  forecastUrl.searchParams.set("timezone", "Asia/Taipei");
  forecastUrl.searchParams.set(
    "current",
    "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,dew_point_2m,precipitation,cloud_cover,pressure_msl,is_day"
  );
  // 前 12 小時：index 0 是當前這一小時，趨勢圖每隔 2 小時取一點
  forecastUrl.searchParams.set(
    "hourly",
    "precipitation_probability,visibility,uv_index,temperature_2m,apparent_temperature,precipitation,weather_code,is_day"
  );
  forecastUrl.searchParams.set("forecast_hours", "12");
  forecastUrl.searchParams.set(
    "daily",
    "sunrise,sunset,temperature_2m_max,temperature_2m_min,precipitation_sum,daylight_duration"
  );
  forecastUrl.searchParams.set("forecast_days", "1");

  const airUrl = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  airUrl.searchParams.set("latitude", String(LOCATION.latitude));
  airUrl.searchParams.set("longitude", String(LOCATION.longitude));
  airUrl.searchParams.set("timezone", "Asia/Taipei");
  airUrl.searchParams.set(
    "current",
    `us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide,${Object.keys(POLLUTANT_LABELS).join(",")}`
  );

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

  const hourly: HourPoint[] = [0, 2, 4, 6, 8, 10].map((i) => ({
    time: hhmm(data.hourly.time[i]),
    temperature: Math.round(data.hourly.temperature_2m[i]),
    precipitationProbability: Math.round(data.hourly.precipitation_probability[i]),
    weatherCode: data.hourly.weather_code[i],
    isDay: data.hourly.is_day[i] === 1,
  }));

  return {
    city: LOCATION.city,
    description: WEATHER_CODES[current.weather_code] ?? "—",
    weatherCode: current.weather_code,
    isDay: current.is_day === 1,
    temperature: Math.round(current.temperature_2m),
    feelsLike: Math.round(current.apparent_temperature),
    tempMax: Math.round(data.daily.temperature_2m_max[0]),
    tempMin: Math.round(data.daily.temperature_2m_min[0]),
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
    sunProgress: sunProgress(current.time, data.daily.sunrise[0], data.daily.sunset[0]),
    aqi: aqi === null ? null : Math.round(aqi),
    aqiLabel: aqi === null ? null : aqiLabel(aqi),
    pm25: typeof air?.current?.pm2_5 === "number" ? Math.round(air.current.pm2_5 * 10) / 10 : null,
    dominantPollutant: air?.current ? dominantPollutant(air.current) : null,
    comfort: comfortLabel(
      Math.round(current.apparent_temperature),
      Math.round(current.relative_humidity_2m)
    ),
    windGusts: Math.round(current.wind_gusts_10m),
    windDirectionDegrees: Math.round(current.wind_direction_10m),
    dewPoint: Math.round(current.dew_point_2m),
    precipitationLastHour: Math.round(data.hourly.precipitation[0] * 10) / 10,
    precipitationToday: Math.round(data.daily.precipitation_sum[0] * 10) / 10,
    daylightMinutes: Math.round(data.daily.daylight_duration[0] / 60),
    pm10: numberOrNull(air?.current?.pm10),
    ozone: numberOrNull(air?.current?.ozone),
    nitrogenDioxide: numberOrNull(air?.current?.nitrogen_dioxide),
    feelsTrend: feelsTrendLabel(
      data.hourly.apparent_temperature[0],
      data.hourly.apparent_temperature[3]
    ),
    evaporation: evaporationLabel(
      current.temperature_2m,
      current.relative_humidity_2m,
      current.wind_speed_10m
    ),
    airState: airStateLabel(aqi),
    moon: moonPhase(apiUtcMillis(current.time, data.utc_offset_seconds)),
    updatedAt: formatUpdatedAt(current.time),
    hourly,
  };
}
