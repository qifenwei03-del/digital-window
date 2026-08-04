"use client";

import { useEffect, useState } from "react";
import {
  Cloud,
  CloudRain,
  Droplets,
  Eye,
  Gauge,
  Leaf,
  Navigation,
  Sunrise,
  Sunset,
  Thermometer,
  Umbrella,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { fetchWeather, type Weather } from "@/lib/weather";

const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

type Detail = { icon: LucideIcon; label: string; value: string };

function detailRows(w: Weather): Detail[][] {
  return [
    [
      { icon: Wind, label: "風速", value: `${w.windSpeed} km/h` },
      { icon: Droplets, label: "濕度", value: `${w.humidity}%` },
      { icon: Umbrella, label: "降雨機率", value: `${w.precipitationProbability}%` },
    ],
    [
      { icon: CloudRain, label: "降雨量", value: `${w.precipitation} mm` },
      { icon: Eye, label: "能見度", value: `${w.visibility} km` },
      { icon: Gauge, label: "氣壓", value: `${w.pressure} hPa` },
    ],
    [
      { icon: Navigation, label: "風向", value: w.windDirection },
      { icon: Cloud, label: "雲量", value: `${w.cloudCover}%` },
      { icon: Thermometer, label: "紫外線指數", value: `${w.uvIndex} ${w.uvLabel}` },
    ],
    [
      { icon: Sunrise, label: "日出", value: w.sunrise },
      { icon: Sunset, label: "日落", value: w.sunset },
      { icon: Leaf, label: "空氣品質", value: w.aqi === null ? "—" : `${w.aqiLabel} ${w.aqi}` },
    ],
  ];
}

export default function WeatherCard() {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await fetchWeather();
        if (!cancelled) {
          setWeather(data);
          setFailed(false);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    };

    load();
    const timer = setInterval(load, REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="w-80 rounded-2xl border border-white/20 bg-white/5 p-6 text-white backdrop-blur-md shadow-[inset_1px_1px_0_rgba(255,255,255,0.45),8px_8px_24px_rgba(0,0,0,0.35)] [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">
      {weather ? (
        <>
          <p className="text-sm font-medium text-white/85">{weather.city}</p>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-6xl font-extralight leading-tight">
              {weather.temperature}°
            </span>
            <span className="text-xl text-white/90">{weather.description}</span>
          </div>
          <p className="mt-1 text-xs text-white/70">體感 {weather.feelsLike}°</p>

          <div className="mt-5 divide-y divide-white/10 border-t border-white/10">
            {detailRows(weather).map((row, i) => (
              <div key={i} className="grid grid-cols-3 gap-x-3 py-4">
                {row.map(({ icon: Icon, label, value }) => (
                  <div key={label}>
                    <div className="flex items-center gap-1.5 text-white/60">
                      <Icon size={14} strokeWidth={1.8} aria-hidden />
                      <span className="text-[11px]">{label}</span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-white/95">{value}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-sm text-white/70">
          {failed ? "無法取得天氣資料" : "天氣載入中…"}
        </p>
      )}
    </div>
  );
}
