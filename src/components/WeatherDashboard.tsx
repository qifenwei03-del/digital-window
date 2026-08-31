"use client";

import type { ReactNode } from "react";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  Eye,
  Gauge,
  Leaf,
  Moon,
  Navigation,
  RefreshCw,
  Smile,
  Sun,
  Sunrise,
  Umbrella,
  Wind,
  type LucideIcon,
} from "lucide-react";
import type { HourPoint, Weather } from "@/lib/weather";

// 直接回傳 JSX，不把圖示指派給大寫變數 —— 那會被 react-hooks/static-components 視為
// 在 render 期間建立元件
function WeatherGlyph({
  code,
  isDay,
  className,
  strokeWidth,
}: {
  code: number;
  isDay: boolean;
  className: string;
  strokeWidth: number;
}) {
  const props = { className, strokeWidth, "aria-hidden": true } as const;
  if (code <= 1) return isDay ? <Sun {...props} /> : <Moon {...props} />;
  if (code === 2) return isDay ? <CloudSun {...props} /> : <CloudMoon {...props} />;
  if (code === 3) return <Cloud {...props} />;
  if (code === 45 || code === 48) return <CloudFog {...props} />;
  if (code >= 51 && code <= 57) return <CloudDrizzle {...props} />;
  if (code >= 71 && code <= 77) return <CloudSnow {...props} />;
  if (code >= 85 && code <= 86) return <CloudSnow {...props} />;
  if (code >= 95) return <CloudLightning {...props} />;
  return <CloudRain {...props} />;
}

function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={`glass rounded-[1.7cqw] p-[2.1cqw] backdrop-blur-[0.65cqw] ${className}`}
    >
      {children}
    </div>
  );
}

function CardTitle({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-[0.7cqw] t-label">
      <Icon className="size-[1.7cqw]" strokeWidth={1.6} aria-hidden />
      <span className="text-[1.4cqw]">{label}</span>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  unit,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <Card className="glass-quiet flex flex-col justify-between">
      <CardTitle icon={icon} label={label} />
      <p className="text-[2.6cqw] t-display leading-none">
        {value}
        {unit && <span className="ml-[0.4cqw] text-[1.3cqw] t-caption">{unit}</span>}
      </p>
    </Card>
  );
}

// 折線圖：點位對齊 6 個欄位的中心。圓點另外用絕對定位畫，
// 因為 SVG 在 preserveAspectRatio="none" 下會把 circle 拉扁。
function TrendLine({ hourly }: { hourly: HourPoint[] }) {
  const temps = hourly.map((h) => h.temperature);
  const max = Math.max(...temps);
  const min = Math.min(...temps);
  const span = max - min || 1;
  const x = (i: number) => (i + 0.5) * (100 / hourly.length);
  const y = (t: number) => 20 + (1 - (t - min) / span) * 60;

  return (
    <div className="relative h-[6cqw] w-full">
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <polyline
          points={temps.map((t, i) => `${x(i)},${y(t)}`).join(" ")}
          fill="none"
          stroke="#86efac"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {temps.map((t, i) => (
        <span
          key={hourly[i].time}
          className="absolute size-[0.8cqw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-300"
          style={{ left: `${x(i)}%`, top: `${y(t)}%` }}
        />
      ))}
    </div>
  );
}

// 半橢圓弧線，太陽依日照進度落在弧上：progress 0 在左端、1 在右端
function SunArc({ progress }: { progress: number }) {
  const angle = Math.PI * (1 - progress);
  const cx = 50 + 44 * Math.cos(angle);
  const cy = 32 - 26 * Math.sin(angle);

  return (
    <svg viewBox="0 0 100 40" className="mt-[1cqw] w-full" aria-hidden>
      <path
        d="M6 32 A 44 26 0 0 1 94 32"
        fill="none"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="0.8"
        strokeDasharray="3 3"
      />
      <line x1="4" y1="32" x2="96" y2="32" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" />
      <circle cx={cx} cy={cy} r="3" fill="#a3e635" />
    </svg>
  );
}

export default function WeatherDashboard({
  weather,
  failed,
}: {
  weather: Weather | null;
  failed: boolean;
}) {
  if (!weather) {
    return (
      <div className="flex h-full w-full items-center justify-center text-[2cqw] t-label [text-shadow:0_0.15cqw_0.3cqw_rgba(0,0,0,0.4)]">
        {failed ? "無法取得天氣資料" : "天氣載入中…"}
      </div>
    );
  }

  const w = weather;
  // AQI 0–300 對應色帶 0–100%
  const aqiPercent = w.aqi === null ? 0 : Math.min(100, Math.max(0, (w.aqi / 300) * 100));

  const environment: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: Sun, label: "紫外線指數", value: `${w.uvIndex} ${w.uvLabel}` },
    { icon: Cloud, label: "雲量", value: `${w.cloudCover}%` },
    { icon: Navigation, label: "風向", value: w.windDirection },
    { icon: Smile, label: "舒適度", value: w.comfort },
  ];

  return (
    <div className="flex h-full w-full flex-col gap-[1.6cqw] p-[4cqw] text-white [text-shadow:0_0.1cqw_0.25cqw_rgba(0,0,0,0.35)]">
      {/* 現況 + 六項即時數值 */}
      <div className="grid flex-1 grid-cols-5 grid-rows-2 gap-[1.6cqw]">
        <Card className="glass-hero col-span-2 row-span-2 flex flex-col">
          <p className="text-[1.6cqw] t-label">{w.city}</p>
          <div className="mt-[0.8cqw] flex items-start justify-between">
            <span className="text-[7.5cqw] t-display leading-none">{w.temperature}°</span>
            <WeatherGlyph
              code={w.weatherCode}
              isDay={w.isDay}
              className="size-[4.5cqw] t-value"
              strokeWidth={1.2}
            />
          </div>
          <p className="mt-[1.4cqw] text-[1.8cqw]">
            {w.description}
            <span className="ml-[1.2cqw] t-label">體感 {w.feelsLike}°</span>
          </p>
          <p className="mt-auto text-[1.5cqw] t-caption">
            最高 {w.tempMax}° <span className="mx-[0.8cqw] text-white/40">/</span> 最低 {w.tempMin}°
          </p>
        </Card>

        <Metric icon={Wind} label="風速" value={String(w.windSpeed)} unit="km/h" />
        <Metric icon={Droplets} label="濕度" value={`${w.humidity}%`} />
        <Metric icon={Umbrella} label="降雨機率" value={`${w.precipitationProbability}%`} />
        <Metric icon={CloudRain} label="降雨量" value={String(w.precipitation)} unit="mm" />
        <Metric icon={Eye} label="能見度" value={String(w.visibility)} unit="km" />
        <Metric icon={Gauge} label="氣壓" value={String(w.pressure)} unit="hPa" />
      </div>

      {/* 空氣品質 / 日出日落 / 環境狀態 */}
      <div className="grid flex-1 grid-cols-3 gap-[1.6cqw]">
        <Card className="flex flex-col">
          <CardTitle icon={Leaf} label="空氣品質" />
          <div className="mt-[0.8cqw] flex items-baseline gap-[0.8cqw]">
            <span className="text-[5cqw] t-display leading-none">{w.aqi ?? "—"}</span>
            <span className="text-[1.6cqw] t-label">{w.aqiLabel ?? ""}</span>
          </div>
          <p className="mt-[1.4cqw] text-[1.2cqw] t-caption">
            PM2.5
            {w.pm25 !== null && <span className="ml-[0.6cqw]">{w.pm25} μg/m³</span>}
          </p>
          <div
            className="relative mt-[0.7cqw] h-[0.7cqw] rounded-full"
            style={{ background: "linear-gradient(to right,#34d399,#fbbf24,#fb923c,#ef4444)" }}
          >
            <span
              className="absolute top-1/2 size-[1.3cqw] -translate-x-1/2 -translate-y-1/2 rounded-full border-[0.18cqw] border-white bg-white/90"
              style={{ left: `${aqiPercent}%` }}
            />
          </div>
          <p className="mt-auto text-[1.2cqw] t-caption">
            主要污染物 <span className="t-value">{w.dominantPollutant ?? "—"}</span>
          </p>
        </Card>

        <Card className="flex flex-col">
          <CardTitle icon={Sunrise} label="日出日落" />
          <div className="mt-[0.8cqw] grid grid-cols-2 divide-x divide-white/15 text-center">
            <div>
              <p className="text-[1.2cqw] t-caption">日出</p>
              <p className="mt-[0.3cqw] text-[2.2cqw] t-display">{w.sunrise}</p>
            </div>
            <div>
              <p className="text-[1.2cqw] t-caption">日落</p>
              <p className="mt-[0.3cqw] text-[2.2cqw] t-display">{w.sunset}</p>
            </div>
          </div>
          <SunArc progress={w.sunProgress} />
          <p className="mt-auto text-center text-[1.2cqw] t-caption">
            日照進度 <span className="text-lime-300">{Math.round(w.sunProgress * 100)}%</span>
          </p>
        </Card>

        <Card className="flex flex-col">
          <CardTitle icon={Leaf} label="環境狀態" />
          <div className="mt-[0.6cqw] flex flex-1 flex-col justify-around">
            {environment.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="flex items-center gap-[0.7cqw] text-[1.3cqw] t-caption">
                  <Icon className="size-[1.5cqw]" strokeWidth={1.6} aria-hidden />
                  {label}
                </span>
                <span className="text-[1.6cqw] t-value">{value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 未來 6 小時趨勢 */}
      <Card className="flex flex-1 flex-col">
        <p className="text-[1.5cqw] t-label">未來 6 小時天氣趨勢</p>
        <div className="mt-[1cqw] grid grid-cols-6 text-center text-[1.2cqw] t-caption">
          {w.hourly.map((h) => (
            <span key={h.time}>{h.time}</span>
          ))}
        </div>
        <div className="mt-[0.8cqw] grid grid-cols-6 place-items-center">
          {w.hourly.map((h) => (
            <WeatherGlyph
              key={h.time}
              code={h.weatherCode}
              isDay={h.isDay}
              className="size-[2.2cqw] t-label"
              strokeWidth={1.4}
            />
          ))}
        </div>
        <TrendLine hourly={w.hourly} />
        <div className="grid grid-cols-6 text-center text-[2cqw] t-display">
          {w.hourly.map((h) => (
            <span key={h.time}>{h.temperature}°</span>
          ))}
        </div>
        <div className="mt-[0.5cqw] grid grid-cols-6 place-items-center">
          {w.hourly.map((h) => (
            <span
              key={h.time}
              className="flex items-center gap-[0.3cqw] text-[1.1cqw] t-caption"
            >
              <Droplets className="size-[1.1cqw]" strokeWidth={1.6} aria-hidden />
              {h.precipitationProbability}%
            </span>
          ))}
        </div>
      </Card>

      <div className="flex items-center justify-center gap-[0.6cqw] text-[1.2cqw] t-caption">
        <span>資料更新時間 {w.updatedAt}</span>
        <RefreshCw className="size-[1.2cqw]" strokeWidth={1.6} aria-hidden />
      </div>
    </div>
  );
}
