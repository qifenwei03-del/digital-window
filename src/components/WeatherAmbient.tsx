"use client";

import {
  CloudRain,
  Cloud,
  Droplet,
  Droplets,
  Eye,
  Gauge,
  Smile,
  Sun,
  Waves,
  Wind,
  type LucideIcon,
} from "lucide-react";
import WeatherArt from "./WeatherArt";
import type { HourPoint, Weather } from "@/lib/weather";
import { aqiColor, comfortColor, evaporationColor } from "@/lib/weatherStyle";

/* 帶圖示的量測值：圖示在左，標籤在上、數值在下 */
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
    <div className="flex items-center justify-center gap-[1.1cqw] whitespace-nowrap">
      <Icon className="size-[2.3cqw] shrink-0 text-white/70" strokeWidth={1.3} aria-hidden />
      <div>
        <p className="text-[1.3cqw] leading-tight text-white/80">{label}</p>
        <p className="text-[1.9cqw] leading-tight" style={valueColor ? { color: valueColor } : undefined}>
          {value}
          {unit && <span className="ml-[0.4cqw] text-[1.3cqw] text-white/70">{unit}</span>}
        </p>
      </div>
    </div>
  );
}

type MetricItem = {
  icon: LucideIcon;
  label: string;
  value: string;
  unit?: string;
  valueColor?: string;
};

/*
  指標橫條。一般模式五格一條；裁切模式每半各自成條，格數不同所以欄數要換 ——
  Tailwind 不吃動態組出來的 class，用查表。
*/
const STRIP_COLS: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  5: "grid-cols-5",
};

function Strip({ items }: { items: MetricItem[] }) {
  return (
    <div className={`grid ${STRIP_COLS[items.length]} divide-x divide-white/25`}>
      {items.map((item) => (
        <Metric key={item.label} {...item} />
      ))}
    </div>
  );
}

/* 純文字欄位：標籤在上、數值在下，用於被分隔線切開的橫列 */
function Field({
  label,
  value,
  unit,
  valueColor,
}: {
  label: string;
  value: string;
  unit?: string;
  valueColor?: string;
}) {
  return (
    <div className="whitespace-nowrap px-[1cqw] text-center">
      <p className="text-[1.3cqw] leading-tight text-white/80">{label}</p>
      <p
        className="mt-[0.3cqw] text-[1.9cqw] leading-tight"
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
        {unit && <span className="ml-[0.35cqw] text-[1.3cqw] text-white/70">{unit}</span>}
      </p>
    </div>
  );
}

/* 底部趨勢：圖示之間用虛線接起來，中點放一個小圓點 */
function TrendStrip({ hourly }: { hourly: HourPoint[] }) {
  return (
    <>
      <div className="grid grid-cols-6 text-center text-[1.5cqw] text-white/80">
        {hourly.map((h) => (
          <span key={h.time}>{h.time}</span>
        ))}
      </div>

      <div className="relative mt-[1.4cqw] grid grid-cols-6 place-items-center">
        {hourly.map((h) => (
          <WeatherArt key={h.time} code={h.weatherCode} isDay={h.isDay} className="w-[6.5cqw]" />
        ))}
        {hourly.slice(0, -1).map((h, i) => (
          <span
            key={`link-${h.time}`}
            className="pointer-events-none absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center"
            style={{ left: `${((i + 1) / hourly.length) * 100}%`, width: "7cqw" }}
            aria-hidden
          >
            <span className="flex-1 border-t border-dashed border-white/45" />
            <span className="mx-[0.5cqw] size-[0.55cqw] shrink-0 rounded-full bg-white/75" />
            <span className="flex-1 border-t border-dashed border-white/45" />
          </span>
        ))}
      </div>

      <div className="mt-[1.4cqw] grid grid-cols-6 text-center text-[3cqw] font-light">
        {hourly.map((h) => (
          <span key={h.time}>{h.temperature}°</span>
        ))}
      </div>

      <div className="mt-[1cqw] grid grid-cols-6 place-items-center">
        {hourly.map((h) => (
          <span
            key={h.time}
            className="flex items-center gap-[0.5cqw] text-[1.45cqw] text-white/80"
          >
            <Droplet className="size-[1.45cqw] text-sky-200" strokeWidth={1.5} aria-hidden />
            {h.precipitationProbability}%
          </span>
        ))}
      </div>
    </>
  );
}

export default function WeatherAmbient({
  weather,
  failed,
  crop = false,
}: {
  weather: Weather | null;
  failed: boolean;
  /** 雙螢幕裁切：內容分成左右兩組，中間留出接縫間隙 */
  crop?: boolean;
}) {
  if (!weather) {
    return (
      <div className="flex h-full w-full items-center justify-center text-[2cqw] text-white/85 [text-shadow:0_0.15cqw_0.4cqw_rgba(0,0,0,0.55)]">
        {failed ? "無法取得天氣資料" : "天氣載入中…"}
      </div>
    );
  }

  const w = weather;
  const daylightHours = Math.floor(w.daylightMinutes / 60);
  const daylightRest = w.daylightMinutes % 60;

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

  const tempBlock = (
    <div className="flex flex-1 flex-col">
          <p className="text-[2.6cqw] font-light">{w.city}</p>
          <div className="mt-[1.5cqw] flex items-center gap-[1cqw]">
            <span className="text-[11cqw] font-extralight leading-none">{w.temperature}°</span>
            <WeatherArt code={w.weatherCode} isDay={w.isDay} className="w-[11cqw]" />
          </div>
          <p className="mt-[3cqw] text-[3cqw] font-light">{w.description}</p>
          <p className="mt-[1.6cqw] text-[2.2cqw] text-white/90">體感 {w.feelsLike}°</p>
          <p className="mt-auto text-[1.8cqw] text-white/85">
            最高 {w.tempMax}° <span className="mx-[0.8cqw] text-white/40">/</span> 最低 {w.tempMin}°
          </p>
    </div>
  );

  const aqiSection = (
    <div className="pb-[2.2cqw]">
            <p className="text-[1.6cqw] text-white/80">空氣品質</p>
            <p className="mt-[0.6cqw] flex items-baseline gap-[1.2cqw]">
              <span className="text-[2.2cqw] text-white/85">AQI</span>
              <span className="text-[4.5cqw] font-light leading-none">{w.aqi ?? "—"}</span>
              <span className="text-[2.2cqw]" style={{ color: aqiColor(w.aqi) }}>
                {w.aqiLabel ?? ""}
              </span>
            </p>
            <div className="mt-[1.6cqw] grid grid-cols-4 divide-x divide-white/20">
              <Field label="PM2.5" value={w.pm25 === null ? "—" : String(Math.round(w.pm25))} />
              <Field label="PM10" value={w.pm10 === null ? "—" : String(Math.round(w.pm10))} />
              <Field label="O₃" value={w.ozone === null ? "—" : String(Math.round(w.ozone))} />
              <Field
                label="NO₂"
                value={w.nitrogenDioxide === null ? "—" : String(Math.round(w.nitrogenDioxide))}
              />
            </div>
            <p className="mt-[1.6cqw] text-[1.5cqw] text-white/80">
              主要污染物
              <span className="ml-[1.2cqw] text-white/95">{w.dominantPollutant ?? "—"}</span>
            </p>
    </div>
  );

  const sunSection = (
    <div className="flex items-center gap-[1.8cqw] py-[2.2cqw]">
            <Sun className="size-[3cqw] shrink-0 text-white/70" strokeWidth={1.2} aria-hidden />
            <div className="grid flex-1 grid-cols-4 divide-x divide-white/20">
              <Field label="日出" value={w.sunrise} />
              <Field label="日落" value={w.sunset} />
              <Field label="白晝長度" value={`${daylightHours} 小時 ${daylightRest} 分`} />
              <Field label="日照進度" value={`${Math.round(w.sunProgress * 100)}%`} />
            </div>
    </div>
  );

  const windFields = (
    <div className="grid grid-cols-2 divide-x divide-white/20">
      <Field label="風向" value={`${w.windDirection} ${w.windDirectionDegrees}°`} />
      <Field label="陣風" value={String(w.windGusts)} unit="km/h" />
    </div>
  );

  const rainFields = (
    <div className="grid flex-1 grid-cols-3 divide-x divide-white/20">
      <Field label="降雨量" value={String(w.precipitation)} unit="mm" />
      <Field label="過去 1 小時" value={String(w.precipitationLastHour)} unit="mm" />
      <Field label="今日累積" value={String(w.precipitationToday)} unit="mm" />
    </div>
  );

  const windIcon = (
    <Wind className="size-[3cqw] shrink-0 text-white/70" strokeWidth={1.2} aria-hidden />
  );
  const rainIcon = (
    <CloudRain className="size-[3cqw] shrink-0 text-white/70" strokeWidth={1.2} aria-hidden />
  );

  // 一般模式：風與雨併成一排
  const windRainSection = (
    <div className="flex items-center gap-[1.5cqw] pt-[2.2cqw]">
      {windIcon}
      {windFields}
      <span className="w-[1.5cqw] shrink-0" />
      {rainIcon}
      {rainFields}
    </div>
  );

  // 裁切模式：半個螢幕塞不下五個欄位加兩個圖示（實測「今日累積」會越過接縫），
  // 拆成上下兩排。半邊是直的，往下長比往旁邊擠合理。
  const windSection = (
    <div className="flex items-center gap-[1.5cqw] py-[2.2cqw]">
      {windIcon}
      {windFields}
    </div>
  );
  const rainSection = (
    <div className="flex items-center gap-[1.5cqw] pt-[2.2cqw]">
      {rainIcon}
      {rainFields}
    </div>
  );

  // 沒有卡片，字直接壓在影片上，所以陰影要比其他面板重一點
  const shell =
    "flex h-full w-full flex-col bg-black/30 px-[6cqw] py-[6cqw] text-white [text-shadow:0_0.15cqw_0.45cqw_rgba(0,0,0,0.65)]";

  const trend = (
    <div className="mt-[2.5cqw] border-t border-white/20 pt-[2.8cqw]">
      <TrendStrip hourly={w.hourly} />
    </div>
  );

  /*
    裁切模式。F 沒有卡片，靠分隔線分區，所以「不跨接縫」要處理的是文字本身。

    會被接縫切開的有三處：五格橫條（分界在 20/40/60/80%，50% 正好落在第三格
    正中央）、主區的 1fr/1.55fr 兩欄（分界在 39%）、以及置中的更新時間。
    這裡改成每半各自成組，中間留 5cqw 間隙；外層 padding 左右對稱，
    間隙必然落在接縫上。

    六格的天氣趨勢不必動：50% 正好是第三、四格的分界，內容置中不會越界，
    只有虛線連接線跨過去 —— 那是折線，跨頁反而讀得出整體走勢。
    橫向分隔線同理，跨過邊框會自然接上。

    左半放現況與風雨（風雨那排欄位多，需要整個半邊的寬度），
    右半放空氣品質與日照。
  */
  if (crop) {
    return (
      <div className={shell}>
        <div className="grid grid-cols-2 gap-[5cqw]">
          <Strip items={topMetrics.slice(0, 3)} />
          <Strip items={topMetrics.slice(3)} />
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-2 gap-[5cqw] pt-[5cqw]">
          <div className="flex min-h-0 flex-col divide-y divide-white/20">
            {tempBlock}
            {windSection}
            {rainSection}
          </div>
          <div className="flex min-h-0 flex-col divide-y divide-white/20">
            {aqiSection}
            {sunSection}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-[5cqw] border-t border-white/20 pt-[2.5cqw]">
          <Strip items={bottomMetrics.slice(0, 2)} />
          <Strip items={bottomMetrics.slice(2)} />
        </div>

        {trend}

        {/* 置中會壓在接縫上，所以只放在左半、置中於左半 */}
        <div className="grid grid-cols-2 gap-[5cqw]">
          <p className="mt-[2.5cqw] text-center text-[1.4cqw] text-white/80">
            資料更新 {w.updatedAt}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={shell}>
      {/* 頂部五項 */}
      <Strip items={topMetrics} />

      {/* 主區：左現況、右細節 */}
      <div className="grid flex-1 grid-cols-[1fr_1.55fr] gap-[5cqw] pt-[5cqw]">
        {tempBlock}
        <div className="flex flex-col divide-y divide-white/20">
          {aqiSection}
          {sunSection}
          {windRainSection}
        </div>
      </div>

      {/* 全寬五項 */}
      <div className="border-t border-white/20 pt-[2.5cqw]">
        <Strip items={bottomMetrics} />
      </div>

      {/* 未來 6 小時 */}
      {trend}

      <p className="mt-[2.5cqw] text-center text-[1.4cqw] text-white/80">資料更新 {w.updatedAt}</p>
    </div>
  );
}
