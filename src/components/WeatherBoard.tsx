"use client";

import type { ReactNode } from "react";
import {
  Cloud,
  CloudRain,
  Droplet,
  Droplets,
  Eye,
  Gauge,
  Navigation,
  Smile,
  Sun,
  Waves,
  Wind,
  type LucideIcon,
} from "lucide-react";
import WeatherArt from "./WeatherArt";
import type { HourPoint, Weather } from "@/lib/weather";
import { aqiColor, comfortColor, evaporationColor } from "@/lib/weatherStyle";

function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={`glass rounded-[1.7cqw] backdrop-blur-[0.6cqw] ${className}`}
    >
      {children}
    </div>
  );
}

/* 環形 AQI 儀表：底部留缺口的圓弧，用 stroke-dasharray 畫出填充比例 */
function AqiRing({ aqi }: { aqi: number | null }) {
  const c = 50;
  const r = 39;
  const circumference = 2 * Math.PI * r;
  const sweep = 0.78; // 顯示 78% 圓周，缺口落在正下方
  const track = circumference * sweep;
  // 0–200 對應整段弧：超過 200 的空品在台北極少見，換取常見區間的解析度
  const filled = aqi === null ? 0 : Math.min(1, Math.max(0, aqi / 200));
  const rotate = 90 + (1 - sweep) * 180;

  return (
    <svg viewBox="0 0 100 100" className="size-full" aria-hidden>
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.16)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${track} ${circumference}`}
        transform={`rotate(${rotate} ${c} ${c})`}
      />
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke={aqiColor(aqi)}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${track * filled} ${circumference}`}
        transform={`rotate(${rotate} ${c} ${c})`}
      />
    </svg>
  );
}

/* 日照弧線：虛線半橢圓，太陽依進度落在弧上，兩端是地平線標記 */
function DaylightArc({ progress }: { progress: number }) {
  const angle = Math.PI * (1 - progress);
  const sunX = 50 + 40 * Math.cos(angle);
  const sunY = 34 - 26 * Math.sin(angle);

  return (
    <svg viewBox="0 0 100 44" className="w-full" aria-hidden>
      <path
        d="M10 34 A 40 26 0 0 1 90 34"
        fill="none"
        stroke="rgba(252,211,77,0.55)"
        strokeWidth="0.8"
        strokeDasharray="2.5 2.5"
      />
      {[10, 90].map((x) => (
        <g key={x} stroke="#fcd34d" strokeWidth="0.9" strokeLinecap="round" fill="none">
          <line x1={x - 6} y1="38" x2={x + 6} y2="38" />
          <path d={`M${x - 3.5} 38 a 3.5 3.5 0 0 1 7 0`} />
        </g>
      ))}
      <circle cx={sunX} cy={sunY} r="4" fill="#fcd34d" />
    </svg>
  );
}

/* 頂部橫條與底部小卡共用的量測欄位 */
function Metric({
  icon: Icon,
  label,
  value,
  unit,
  valueColor,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  unit?: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center justify-center gap-[1cqw] whitespace-nowrap">
      <Icon className="size-[2.1cqw] shrink-0 t-caption" strokeWidth={1.4} aria-hidden />
      <div>
        <p className="t-label text-[1.1cqw] leading-tight">{label}</p>
        <p
          className="text-[1.7cqw] leading-tight"
          style={valueColor ? { color: valueColor } : undefined}
        >
          {value}
          {unit && <span className="ml-[0.35cqw] text-[1.15cqw] t-caption">{unit}</span>}
        </p>
      </div>
    </div>
  );
}

/*
  右欄垂直趨勢。

  compact 是給裁切模式用的：六列本來就是右欄最高的東西，
  而裁切後每半只有一半的寬與同樣的高，六列照原尺寸會超出欄位（實測差 167px）。
  縮的是圖示與溫度字級，列數與資訊一項沒少。
*/
function TrendColumn({ hourly, compact = false }: { hourly: HourPoint[]; compact?: boolean }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col divide-y divide-white/12">
      {hourly.map((h) => (
        <div
          key={h.time}
          className={`flex flex-1 flex-col justify-center ${compact ? "py-[0.15cqw]" : "py-[0.4cqw]"}`}
        >
          <p className="t-caption text-[1.05cqw]">{h.time}</p>
          <div className="mt-[0.2cqw] flex items-center justify-between gap-[0.5cqw]">
            <WeatherArt
              code={h.weatherCode}
              isDay={h.isDay}
              className={`shrink-0 ${compact ? "w-[2.7cqw]" : "w-[3.8cqw]"}`}
            />
            <div className="text-right">
              <p className={`t-display leading-none ${compact ? "text-[1.8cqw]" : "text-[2.4cqw]"}`}>
                {h.temperature}°
              </p>
              <p className="mt-[0.35cqw] flex items-center justify-end gap-[0.3cqw] text-[1.05cqw] t-caption">
                <Droplet className="size-[1.05cqw] text-sky-200" strokeWidth={1.6} aria-hidden />
                {h.precipitationProbability}%
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/*
  小指標條。一般模式是五格一條，裁切模式改成每半各自成條，
  格數不同所以欄數要跟著換 —— Tailwind 不吃動態組出來的 class，用查表。
*/
const STRIP_COLS: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  5: "grid-cols-5",
};

type MetricItem = {
  icon: LucideIcon;
  label: string;
  value: string;
  unit?: string;
  valueColor?: string;
};

function MetricStrip({ items }: { items: MetricItem[] }) {
  return (
    <Card
      className={`glass-quiet grid ${STRIP_COLS[items.length]} divide-x divide-white/10 py-[1.7cqw]`}
    >
      {items.map((item) => (
        <Metric key={item.label} {...item} />
      ))}
    </Card>
  );
}

export default function WeatherBoard({
  weather,
  failed,
  crop = false,
}: {
  weather: Weather | null;
  failed: boolean;
  /** 雙螢幕裁切：卡片分成左右兩組，中間留出接縫間隙 */
  crop?: boolean;
}) {
  if (!weather) {
    return (
      <div className="flex h-full w-full items-center justify-center text-[2cqw] t-label [text-shadow:0_0.15cqw_0.4cqw_rgba(0,0,0,0.5)]">
        {failed ? "無法取得天氣資料" : "天氣載入中…"}
      </div>
    );
  }

  const w = weather;
  const daylightHours = Math.floor(w.daylightMinutes / 60);
  const daylightRest = w.daylightMinutes % 60;
  const pollutants: [string, number | null][] = [
    ["PM2.5", w.pm25],
    ["PM10", w.pm10],
    ["O₃", w.ozone],
    ["NO₂", w.nitrogenDioxide],
  ];

  const topMetrics: MetricItem[] = [
    { icon: Wind, label: "風速", value: String(w.windSpeed), unit: "km/h" },
    { icon: Droplets, label: "濕度", value: `${w.humidity}%` },
    { icon: CloudRain, label: "降雨機率", value: `${w.precipitationProbability}%` },
    { icon: Gauge, label: "氣壓", value: String(w.pressure), unit: "hPa" },
    { icon: Eye, label: "能見度", value: String(w.visibility), unit: "km" },
  ];

  const bottomMetrics: MetricItem[] = [
    { icon: Cloud, label: "雲量", value: `${w.cloudCover}%` },
    { icon: Sun, label: "紫外線", value: `${w.uvIndex} ${w.uvLabel}` },
    { icon: Droplet, label: "露點", value: `${w.dewPoint}°` },
    { icon: Smile, label: "舒適度", value: w.comfort, valueColor: comfortColor(w.comfort) },
    {
      icon: Waves,
      label: "蒸發感",
      value: w.evaporation,
      valueColor: evaporationColor(w.evaporation),
    },
  ];

  const heroCard = (
    <Card className={`glass-hero flex flex-col p-[2.5cqw] ${crop ? "flex-[1.15]" : "flex-[1.55]"}`}>
            <p className="text-[2.1cqw] t-display">{w.city}</p>
            <div className="mt-[0.8cqw] flex items-center gap-[0.5cqw]">
              <span className="t-display text-[8.5cqw] leading-none">{w.temperature}°</span>
              <WeatherArt code={w.weatherCode} isDay={w.isDay} className="w-[8cqw]" />
            </div>
            <p className="mt-[2cqw] text-[2.6cqw] t-display">{w.description}</p>
            <p className="mt-[1.2cqw] text-[1.9cqw] t-value">體感 {w.feelsLike}°</p>
            <p className="mt-auto text-[1.6cqw] t-label">
              最高 {w.tempMax}° <span className="mx-[0.6cqw] text-white/40">/</span> 最低{" "}
              {w.tempMin}°
            </p>
    </Card>
  );

  const sunCard = (
    <Card className="flex flex-1 flex-col p-[2cqw]">
            <p className="t-label text-[1.25cqw]">日照資訊</p>
            <div className={`mt-[0.4cqw] ${crop ? "mx-auto w-[68%]" : ""}`}>
              <DaylightArc progress={w.sunProgress} />
            </div>
            <div className="grid grid-cols-3 text-center">
              {[
                ["日出", w.sunrise],
                ["白晝長度", `${daylightHours} 小時 ${daylightRest} 分`],
                ["日落", w.sunset],
              ].map(([label, value]) => (
                <div key={label} className="whitespace-nowrap">
                  <p className="t-caption text-[1.05cqw]">{label}</p>
                  <p className="t-value mt-[0.35cqw] text-[1.45cqw]">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-auto flex items-center gap-[1cqw] border-t border-white/12 pt-[1cqw]">
              <span className="whitespace-nowrap text-[1.1cqw] t-caption">日照進度</span>
              <span className="h-[0.7cqw] flex-1 overflow-hidden rounded-full bg-white/15">
                <span
                  className="block h-full rounded-full bg-lime-300"
                  style={{ width: `${Math.round(w.sunProgress * 100)}%` }}
                />
              </span>
              <span className="text-[1.4cqw]">{Math.round(w.sunProgress * 100)}%</span>
            </div>
    </Card>
  );

  const aqiCard = (
    <Card className={`flex flex-col p-[2cqw] ${crop ? "flex-[1.5]" : "flex-[1.55]"}`}>
            <p className="t-label text-[1.25cqw]">空氣品質</p>
            <div
              className={`relative mx-auto mt-[0.6cqw] aspect-square min-h-0 flex-1 ${
                crop ? "w-[44%]" : "w-[72%]"
              }`}
            >
              <AqiRing aqi={w.aqi} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-[1.3cqw] t-caption">AQI</p>
                <p className="t-display text-[4.6cqw] leading-none">{w.aqi ?? "—"}</p>
                <p className="mt-[0.6cqw] text-[1.3cqw] t-caption">
                  狀態{" "}
                  <span style={{ color: aqiColor(w.aqi) }}>{w.aqiLabel ?? "—"}</span>
                </p>
              </div>
            </div>
            <div className="mt-[1cqw] grid grid-cols-4 divide-x divide-white/15 border-t border-white/12 pt-[1cqw] text-center">
              {pollutants.map(([label, value]) => (
                <div key={label}>
                  <p className="t-caption text-[1.05cqw]">{label}</p>
                  <p className="t-value mt-[0.35cqw] text-[1.6cqw]">
                    {value === null ? "—" : Math.round(value)}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-[1cqw] text-center text-[1.25cqw] t-label">
              主要污染物
              <span className="ml-[1cqw] t-value">{w.dominantPollutant ?? "—"}</span>
            </p>
    </Card>
  );

  const windCard = (
    <Card className="glass-quiet flex flex-col p-[1.8cqw]">
              <p className="t-label text-[1.25cqw]">風向</p>
              <div className="flex flex-1 items-center justify-center gap-[0.9cqw]">
                {/* 箭頭指向風「吹往」的方向，所以是氣象風向再加 180° */}
                <Navigation
                  className="size-[2.6cqw] t-label"
                  strokeWidth={1.5}
                  style={{ transform: `rotate(${w.windDirectionDegrees + 180}deg)` }}
                  aria-hidden
                />
                <div className="text-right">
                  <p className="text-[2cqw] leading-none">{w.windDirection}</p>
                  <p className="mt-[0.3cqw] text-[1.2cqw] t-caption">
                    {w.windDirectionDegrees}°
                  </p>
                </div>
              </div>
    </Card>
  );

  const gustCard = (
    <Card className="glass-quiet flex flex-col p-[1.8cqw]">
              <p className="t-label text-[1.25cqw]">陣風</p>
              <div className="flex flex-1 items-center justify-center gap-[0.9cqw]">
                <Wind className="size-[2.6cqw] t-caption" strokeWidth={1.4} aria-hidden />
                <p className="text-[2cqw] leading-none">
                  {w.windGusts}
                  <span className="ml-[0.3cqw] text-[1.2cqw] t-caption">km/h</span>
                </p>
              </div>
    </Card>
  );

  const rainCard = (
    <Card className="glass-quiet flex flex-[0.62] flex-col p-[1.8cqw]">
            <p className="t-label text-[1.25cqw]">降雨量</p>
            <div className="flex flex-1 items-center gap-[1.2cqw]">
              <div className="flex flex-1 items-center gap-[0.8cqw]">
                <CloudRain className="size-[2.4cqw] t-caption" strokeWidth={1.4} aria-hidden />
                <p className="text-[2.6cqw] t-display leading-none">
                  {w.precipitation}
                  <span className="ml-[0.3cqw] text-[1.2cqw] t-caption">mm</span>
                </p>
              </div>
              <div className="flex flex-1 flex-col gap-[0.5cqw] border-l border-white/15 pl-[1.2cqw] text-[1.15cqw] whitespace-nowrap">
                <span className="flex items-baseline justify-between t-caption">
                  過去 1 小時
                  <span className="ml-[0.8cqw] text-[1.4cqw] text-white">
                    {w.precipitationLastHour}
                    <span className="ml-[0.25cqw] text-[1.05cqw] t-caption">mm</span>
                  </span>
                </span>
                <span className="flex items-baseline justify-between t-caption">
                  今日累積
                  <span className="ml-[0.8cqw] text-[1.4cqw] text-white">
                    {w.precipitationToday}
                    <span className="ml-[0.25cqw] text-[1.05cqw] t-caption">mm</span>
                  </span>
                </span>
              </div>
            </div>
    </Card>
  );

  // 裁切模式：六小時直排是右欄最不能壓的東西，給它明確的 flex 佔比
  const trendCard = (
    <Card className={`flex min-h-0 flex-col p-[1.8cqw] ${crop ? "flex-[1.9]" : ""}`}>
      <p className="t-label text-[1.25cqw]">未來 6 小時天氣趨勢</p>
      <TrendColumn hourly={w.hourly} compact={crop} />
    </Card>
  );

  const shell =
    "flex h-full w-full flex-col gap-[1.5cqw] p-[4cqw] text-white [text-shadow:0_0.1cqw_0.25cqw_rgba(0,0,0,0.4)]";

  /*
    裁切模式：兩台電視中間有實體邊框，所以卡片必須完整落在自己那半。

    一般模式的三欄版面（1.95fr / 1.75fr / 1fr）分界在 41% 與 79%，接縫落在 50%
    正好把中欄剖成兩半；上下兩條五格橫條也一樣會被切。這裡改成左右各一組、
    中間留 5cqw 間隙 —— 外層 padding 左右對稱，間隙必然落在接縫上，不必量像素。

    十個小指標平均分給兩邊（各 5 個），大卡也刻意分散，兩半的份量才對得起來。
  */
  if (crop) {
    return (
      <div className={shell}>
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-[5cqw]">
          <div className="flex min-h-0 flex-col gap-[1.5cqw]">
            {heroCard}
            {sunCard}
            <div className="grid flex-[0.5] grid-cols-2 gap-[1.5cqw]">
              {windCard}
              {gustCard}
            </div>
            {rainCard}
            <MetricStrip items={[...topMetrics.slice(0, 3), ...bottomMetrics.slice(0, 2)]} />
          </div>

          {/* 右欄只放三樣：AQI 環與六小時直排都不能再壓，降雨量因此挪到左欄 */}
          <div className="flex min-h-0 flex-col gap-[1.5cqw]">
            {aqiCard}
            {trendCard}
            <MetricStrip items={[...topMetrics.slice(3), ...bottomMetrics.slice(2)]} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={shell}>
      {/* 頂部橫條 */}
      <MetricStrip items={topMetrics} />

      <div className="grid min-h-0 flex-1 grid-cols-[1.95fr_1.75fr_1fr] gap-[1.5cqw]">
        {/* 左欄 */}
        <div className="flex min-h-0 flex-col gap-[1.5cqw]">
          {heroCard}
          {sunCard}
        </div>

        {/* 中欄 */}
        <div className="flex min-h-0 flex-col gap-[1.5cqw]">
          {aqiCard}
          <div className="grid flex-[0.5] grid-cols-2 gap-[1.5cqw]">
            {windCard}
            {gustCard}
          </div>
          {rainCard}
        </div>

        {/* 右欄：垂直趨勢 */}
        {trendCard}
      </div>

      {/* 底部五格 */}
      <div className="grid grid-cols-5 gap-[1.5cqw]">
        {bottomMetrics.map((item) => (
          <Card key={item.label} className="glass-quiet py-[1.6cqw]">
            <Metric {...item} />
          </Card>
        ))}
      </div>
    </div>
  );
}
