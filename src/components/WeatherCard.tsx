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
    <div className="flex h-full w-full flex-col rounded-[2.2cqw] border border-white/20 bg-black/20 p-[3cqw] text-white backdrop-blur-[1.7cqw] shadow-[inset_0.15cqw_0.15cqw_0_rgba(255,255,255,0.45),1.1cqw_1.1cqw_3.3cqw_rgba(0,0,0,0.35)] [text-shadow:0_0.15cqw_0.3cqw_rgba(0,0,0,0.35)]">
      {weather ? (
        <>
          <p className="text-[1.95cqw] font-medium text-white/85">{weather.city}</p>
          <div className="mt-[0.5cqw] flex items-center justify-between">
            <span className="text-[7cqw] font-extralight leading-none">
              {weather.temperature}°
            </span>
            <span className="text-[2.5cqw] text-white/90">{weather.description}</span>
          </div>
          <p className="mt-[0.8cqw] text-[1.7cqw] text-white/80">體感 {weather.feelsLike}°</p>

          <div className="mt-[2cqw] flex flex-1 flex-col divide-y divide-white/10 border-t border-white/10">
            {detailRows(weather).map((row, i) => (
              <div key={i} className="grid flex-1 grid-cols-3 items-center gap-x-[1.7cqw]">
                {row.map(({ icon: Icon, label, value }) => (
                  <div key={label}>
                    <div className="flex items-center gap-[0.8cqw] text-white/75">
                      <Icon className="size-[1.8cqw]" strokeWidth={1.8} aria-hidden />
                      <span className="text-[1.5cqw]">{label}</span>
                    </div>
                    <p className="mt-[0.4cqw] text-[1.95cqw] font-medium text-white/95">{value}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="m-auto text-[1.95cqw] text-white/80">
          {failed ? "無法取得天氣資料" : "天氣載入中…"}
        </p>
      )}
    </div>
  );
}
