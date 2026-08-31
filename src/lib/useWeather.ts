"use client";

import { useEffect, useState } from "react";
import { fetchWeather, type Weather } from "./weather";

const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

// 兩種面板共用同一份資料，A 鍵切換時不會重新請求
export function useWeather() {
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

  return { weather, failed };
}
