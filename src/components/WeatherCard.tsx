"use client";

import { useEffect, useState } from "react";
import { fetchWeather, type Weather } from "@/lib/weather";

const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

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
    <div className="w-60 rounded-2xl border border-white/20 bg-white/5 p-5 text-white backdrop-blur-md shadow-[inset_1px_1px_0_rgba(255,255,255,0.45),8px_8px_24px_rgba(0,0,0,0.35)] [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">
      {weather ? (
        <>
          <p className="text-sm font-medium text-white/80">{weather.city}</p>
          <div className="mt-2 flex items-end justify-between">
            <span className="text-5xl font-light leading-none">
              {weather.temperature}°
            </span>
            <span className="text-lg text-white/90">{weather.description}</span>
          </div>
          <p className="mt-4 border-t border-white/15 pt-3 text-sm text-white/80">
            風速 {weather.windSpeed} km/h
          </p>
        </>
      ) : (
        <p className="text-sm text-white/70">
          {failed ? "無法取得天氣資料" : "天氣載入中…"}
        </p>
      )}
    </div>
  );
}
