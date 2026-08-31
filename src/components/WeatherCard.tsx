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
import type { Weather } from "@/lib/weather";

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

export default function WeatherCard({
  weather,
  failed,
}: {
  weather: Weather | null;
  failed: boolean;
}) {
  return (
    <div className="flex h-full w-full flex-col glass glass-hero rounded-[2.2cqw] p-[3.6cqw] text-white backdrop-blur-[0.75cqw] [text-shadow:0_0.15cqw_0.3cqw_rgba(0,0,0,0.35)]">
      {weather ? (
        <>
          <p className="t-value text-[1.7cqw]">{weather.city}</p>
          <div className="mt-[0.5cqw] flex items-center justify-between">
            <span className="t-display text-[7.4cqw] leading-none">
              {weather.temperature}°
            </span>
            <span className="t-value text-[2.2cqw]">{weather.description}</span>
          </div>
          <p className="t-label mt-[1cqw] text-[1.55cqw]">體感 {weather.feelsLike}°</p>

          <div className="mt-[2cqw] flex flex-1 flex-col divide-y divide-white/10 border-t border-white/10">
            {detailRows(weather).map((row, i) => (
              <div key={i} className="grid flex-1 grid-cols-3 items-center gap-x-[1.7cqw]">
                {row.map(({ icon: Icon, label, value }) => (
                  <div key={label}>
                    <div className="flex items-center gap-[0.8cqw] text-white/75">
                      <Icon className="size-[1.8cqw]" strokeWidth={1.8} aria-hidden />
                      <span className="t-label text-[1.35cqw]">{label}</span>
                    </div>
                    <p className="t-value mt-[0.55cqw] text-[1.8cqw]">{value}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="t-caption m-auto text-[1.8cqw]">
          {failed ? "無法取得天氣資料" : "天氣載入中…"}
        </p>
      )}
    </div>
  );
}
