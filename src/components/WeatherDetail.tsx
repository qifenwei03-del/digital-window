"use client";

import type { ReactNode } from "react";
import {
  Clock,
  Cloud,
  Compass,
  Database,
  Droplet,
  Droplets,
  Eye,
  Gauge,
  MapPin,
  Navigation,
  Smile,
  Sun,
  Sunrise,
  Sunset,
  Thermometer,
  TrendingUp,
  Umbrella,
  Waves,
  Wind,
  type LucideIcon,
} from "lucide-react";
import WeatherArt from "./WeatherArt";
import type { HourPoint, Weather } from "@/lib/weather";

/* ---------- 月相：用 mask 疊出亮面，比用兩段弧線拼路徑好推理 ---------- */

function MoonDisc({
  illumination,
  waxing,
  className,
}: {
  illumination: number;
  waxing: boolean;
  className: string;
}) {
  const c = 50;
  const r = 42;
  const rx = r * Math.abs(1 - 2 * illumination);
  // 亮面在右（漸盈）或左（漸虧）；過半時橢圓補足亮面，未過半時橢圓吃掉亮面
  const litHalfX = waxing ? c : c - r;
  const ellipseAdds = illumination > 0.5;

  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <defs>
        <mask id="moon-lit">
          <rect x="0" y="0" width="100" height="100" fill="black" />
          <rect x={litHalfX} y={c - r} width={r} height={r * 2} fill="white" />
          <ellipse cx={c} cy={c} rx={rx} ry={r} fill={ellipseAdds ? "white" : "black"} />
        </mask>
      </defs>
      <circle cx={c} cy={c} r={r} fill="#31363f" />
      <circle cx={c} cy={c} r={r} fill="#dcdccf" mask="url(#moon-lit)" />
      <g fill="#bdbdae" opacity="0.6" mask="url(#moon-lit)">
        <circle cx="38" cy="36" r="8" />
        <circle cx="62" cy="56" r="10" />
        <circle cx="44" cy="70" r="5" />
        <circle cx="68" cy="30" r="4" />
        <circle cx="30" cy="58" r="4" />
      </g>
    </svg>
  );
}

/* ---------- AQI 分段色帶 ---------- */

const AQI_BANDS = [
  { max: 50, color: "#4ade80" },
  { max: 100, color: "#a3e635" },
  { max: 150, color: "#fbbf24" },
  { max: 200, color: "#fb923c" },
  { max: 300, color: "#ef4444" },
  { max: 500, color: "#a855f7" },
];

function aqiMarkerPercent(aqi: number): number {
  let lower = 0;
  for (let i = 0; i < AQI_BANDS.length; i += 1) {
    const { max } = AQI_BANDS[i];
    if (aqi <= max) {
      return ((i + (aqi - lower) / (max - lower)) / AQI_BANDS.length) * 100;
    }
    lower = max;
  }
  return 100;
}

/* ---------- 版面零件 ---------- */

function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={`glass rounded-[1.6cqw] p-[1.95cqw] backdrop-blur-[0.6cqw] ${className}`}
    >
      {children}
    </div>
  );
}

function Row({
  icon: Icon,
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
    <div className="flex items-center gap-[0.8cqw]">
      <Icon className="size-[1.7cqw] shrink-0 text-white/55" strokeWidth={1.5} aria-hidden />
      <div className="min-w-0">
        <p className="text-[1.05cqw] leading-tight t-caption">{label}</p>
        <p className="text-[1.5cqw] t-value leading-tight">
          {value}
          {unit && <span className="ml-[0.3cqw] text-[1cqw] t-caption">{unit}</span>}
        </p>
      </div>
    </div>
  );
}

function StatRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-dashed border-white/12 pb-[0.5cqw] last:border-0 last:pb-0">
      <span className="flex items-center gap-[0.6cqw] text-[1.15cqw] t-caption">
        <Icon className="size-[1.4cqw]" strokeWidth={1.5} aria-hidden />
        {label}
      </span>
      <span className="text-[1.35cqw] t-value">{value}</span>
    </div>
  );
}

/*
  折線圖。線是用 clip-path 裁出來的帶狀填色，不是 SVG 描邊。原因有兩層：

  1. 原本是 viewBox 非等比拉伸（preserveAspectRatio="none"）搭
     vectorEffect="non-scaling-stroke"。那組合會讓 Chrome 每次繪製都在非等比
     變換下重算描邊幾何，疊在播放中的影片圖層上會閃動 —— S 與 D 曾是唯二用
     這個組合的面板，也正好是唯二會閃的。
  2. 改成「量像素再給等比 viewBox」也不行：ResizeObserver 綁在算繪迴圈上，
     頁面被節流時完全不觸發（實測 0 次），線會整條消失，比閃動更糟。

  clip-path 的百分比是相對元素框，不必量像素也不會被節流影響，而且是填色
  不是描邊，沒有描邊幾何要重算。
*/
const TREND_HALF_WIDTH = 1.8; // 線半寬，單位是容器高度的 %

function TrendLine({ hourly }: { hourly: HourPoint[] }) {
  const temps = hourly.map((h) => h.temperature);
  const max = Math.max(...temps);
  const min = Math.min(...temps);
  const span = max - min || 1;
  const fx = (i: number) => ((i + 0.5) / hourly.length) * 100;
  const fy = (t: number) => (0.22 + (1 - (t - min) / span) * 0.56) * 100;

  const upper = temps.map((t, i) => `${fx(i)}% ${fy(t) - TREND_HALF_WIDTH}%`);
  const lower = temps.map((t, i) => `${fx(i)}% ${fy(t) + TREND_HALF_WIDTH}%`).reverse();

  return (
    <div className="relative h-[5cqw] w-full">
      <div
        className="absolute inset-0 bg-white/85"
        style={{ clipPath: `polygon(${[...upper, ...lower].join(", ")})` }}
        aria-hidden
      />
      {temps.map((t, i) => (
        <span
          key={hourly[i].time}
          className="absolute size-[0.7cqw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
          style={{ left: `${fx(i)}%`, top: `${fy(t)}%` }}
        />
      ))}
    </div>
  );
}

function SunArc({ progress }: { progress: number }) {
  const angle = Math.PI * (1 - progress);
  const cx = 50 + 44 * Math.cos(angle);
  const cy = 30 - 24 * Math.sin(angle);
  return (
    <svg viewBox="0 0 100 36" className="w-full" aria-hidden>
      <path
        d="M6 30 A 44 24 0 0 1 94 30"
        fill="none"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="0.8"
        strokeDasharray="2.5 2.5"
      />
      <circle cx={cx} cy={cy} r="3.2" fill="#fcd34d" />
    </svg>
  );
}

/* ---------- 面板 ---------- */

export default function WeatherDetail({
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
      <div className="flex h-full w-full items-center justify-center text-[2cqw] t-label [text-shadow:0_0.15cqw_0.3cqw_rgba(0,0,0,0.4)]">
        {failed ? "無法取得天氣資料" : "天氣載入中…"}
      </div>
    );
  }

  const w = weather;
  const daylightHours = Math.floor(w.daylightMinutes / 60);
  const daylightRest = w.daylightMinutes % 60;

  const heroCard = (
    <Card className={`${crop ? "glass-hero flex-[1.55]" : "glass-hero col-span-4 row-span-2"} flex min-h-0 flex-col`}>
      <p className="flex items-center gap-[0.6cqw] text-[1.8cqw]">
        <MapPin className="size-[1.8cqw] t-caption" strokeWidth={1.5} aria-hidden />
        {w.city}
      </p>
      <p className="mt-[0.8cqw] text-[1.2cqw] t-caption">目前天氣</p>
      <div className="mt-[2cqw] flex items-center justify-between">
        <span className="text-[8cqw] t-display leading-none">{w.temperature}°</span>
        <WeatherArt code={w.weatherCode} isDay={w.isDay} className="w-[13cqw]" />
      </div>
      <p className="mt-[2.5cqw] text-[3cqw] t-display">{w.description}</p>
      <p className="mt-[1.2cqw] flex items-center gap-[0.6cqw] text-[1.7cqw] t-label">
        <Thermometer className="size-[1.7cqw] t-caption" strokeWidth={1.5} aria-hidden />
        體感 {w.feelsLike}°
      </p>
      <div className="mt-auto border-t border-white/15 pt-[1.2cqw] text-[1.5cqw] t-label">
        最高 {w.tempMax}° <span className="mx-[1cqw] text-white/35">/</span> 最低 {w.tempMin}°
      </div>
    </Card>
  );

  const liveCard = (
    <Card className={`${crop ? "flex-[1.55]" : "col-span-5"} flex min-h-0 flex-col`}>
      <p className="text-[1.3cqw] t-label">即時氣象</p>
      <div className="mt-[1cqw] grid flex-1 grid-cols-2 gap-x-[1.4cqw] divide-x divide-white/12">
        <div className="flex flex-col justify-between pr-[1cqw]">
          <Row icon={Wind} label="風速" value={String(w.windSpeed)} unit="km/h" />
          <Row icon={Wind} label="陣風" value={String(w.windGusts)} unit="km/h" />
          <Row icon={Navigation} label="風向" value={w.windDirection} />
          <Row icon={Compass} label="風向角度" value={`${w.windDirectionDegrees}°`} />
          <Row icon={Droplets} label="濕度" value={`${w.humidity}%`} />
          <Row icon={Droplet} label="露點" value={`${w.dewPoint}°`} />
        </div>
        <div className="flex flex-col justify-between pl-[1.4cqw]">
          <Row icon={Umbrella} label="降雨機率" value={`${w.precipitationProbability}%`} />
          <Row icon={Cloud} label="即時降雨量" value={String(w.precipitation)} unit="mm" />
          <Row icon={Clock} label="過去 1 小時" value={String(w.precipitationLastHour)} unit="mm" />
          <Row icon={Database} label="今日累積" value={String(w.precipitationToday)} unit="mm" />
          <Row icon={Eye} label="能見度" value={String(w.visibility)} unit="km" />
          <Row icon={Gauge} label="氣壓" value={String(w.pressure)} unit="hPa" />
          <Row icon={Cloud} label="雲量" value={`${w.cloudCover}%`} />
          <Row icon={Sun} label="紫外線" value={`${w.uvIndex} ${w.uvLabel}`} />
        </div>
      </div>
    </Card>
  );

  const aqiCard = (
    <Card className={`${crop ? "flex-1" : "col-span-3"} flex min-h-0 flex-col`}>
      <p className="text-[1.3cqw] t-label">空氣品質</p>
      <p className="mt-[0.8cqw] text-[1.1cqw] t-caption">AQI</p>
      <div className="flex items-baseline gap-[0.8cqw]">
        <span className="text-[4.5cqw] t-display leading-none">{w.aqi ?? "—"}</span>
        <span className="text-[1.4cqw] t-label">{w.aqiLabel ?? ""}</span>
      </div>
      <div className="relative mt-[1.2cqw]">
        <div className="flex h-[0.6cqw] gap-[0.15cqw] overflow-hidden rounded-full">
          {AQI_BANDS.map((band) => (
            <span key={band.max} className="flex-1" style={{ background: band.color }} />
          ))}
        </div>
        {w.aqi !== null && (
          <span
            className="absolute top-[0.75cqw] -translate-x-1/2 border-x-[0.45cqw] border-b-[0.5cqw] border-x-transparent border-b-white"
            style={{ left: `${aqiMarkerPercent(w.aqi)}%` }}
          />
        )}
      </div>
      <div className="mt-[1.8cqw] flex flex-col gap-[0.7cqw]">
        {[
          { label: "PM2.5", value: w.pm25 },
          { label: "PM10", value: w.pm10 },
          { label: "O₃", value: w.ozone },
          { label: "NO₂", value: w.nitrogenDioxide },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-baseline justify-between text-[1.3cqw]">
            <span className="t-caption">{label}</span>
            <span className="t-value">{value === null ? "—" : Math.round(value)}</span>
          </div>
        ))}
      </div>
      <p className="mt-auto text-[1.1cqw] t-caption">主要污染物</p>
      <p className="text-[1.5cqw] t-value">{w.dominantPollutant ?? "—"}</p>
    </Card>
  );

  const sunCard = (
    <Card className={`${crop ? "glass-quiet flex-1" : "glass-quiet col-span-3"} flex min-h-0 flex-col`}>
      <p className="text-[1.3cqw] t-label">日照資訊</p>
      <div className="mt-[0.8cqw] flex flex-col gap-[0.5cqw]">
        <StatRow icon={Sunrise} label="日出" value={w.sunrise} />
        <StatRow icon={Sunset} label="日落" value={w.sunset} />
        <StatRow
          icon={Clock}
          label="白晝長度"
          value={`${daylightHours} 小時 ${daylightRest} 分`}
        />
        <StatRow icon={Sun} label="日照進度" value={`${Math.round(w.sunProgress * 100)}%`} />
      </div>
      <div className="mt-auto">
        <SunArc progress={w.sunProgress} />
      </div>
    </Card>
  );

  const envCard = (
    <Card className={`${crop ? "glass-quiet flex-1" : "glass-quiet col-span-3"} flex min-h-0 flex-col`}>
      <p className="text-[1.3cqw] t-label">體感環境</p>
      <div className="mt-[0.8cqw] flex flex-1 flex-col justify-around">
        <StatRow icon={Smile} label="舒適度" value={w.comfort} />
        <StatRow icon={TrendingUp} label="體感趨勢" value={w.feelsTrend} />
        <StatRow icon={Waves} label="蒸發感" value={w.evaporation} />
        <StatRow icon={Wind} label="空氣狀態" value={w.airState} />
      </div>
    </Card>
  );

  const moonCard = (
    <Card className={`${crop ? "glass-quiet flex-1" : "glass-quiet col-span-2"} flex min-h-0 flex-col`}>
      <p className="text-[1.3cqw] t-label">月相</p>
      <div className="flex flex-1 items-center justify-center">
        <MoonDisc
          illumination={w.moon.illumination}
          waxing={w.moon.waxing}
          className="w-[7.5cqw]"
        />
      </div>
      <div className="flex items-baseline justify-between text-[1.15cqw]">
        <span className="t-caption">可見比例</span>
        <span className="text-[1.35cqw] t-value">
          {Math.round(w.moon.illumination * 100)}%
        </span>
      </div>
      <div className="mt-[0.5cqw] flex items-baseline justify-between text-[1.15cqw]">
        <span className="t-caption">月齡</span>
        <span className="text-[1.35cqw] t-value">
          {Math.round(w.moon.age)} <span className="text-[1cqw] t-caption">天</span>
        </span>
      </div>
    </Card>
  );

  const trendCard = (
  <Card className="flex min-h-0 flex-1 flex-col">
    <p className="text-[1.4cqw] t-label">未來 6 小時天氣趨勢</p>
    <div className="mt-[0.8cqw] grid grid-cols-6 text-center text-[1.15cqw] t-caption">
      {w.hourly.map((h) => (
        <span key={h.time}>{h.time}</span>
      ))}
    </div>
    <div className="mt-[0.6cqw] grid grid-cols-6 place-items-center">
      {w.hourly.map((h) => (
        <WeatherArt key={h.time} code={h.weatherCode} isDay={h.isDay} className="w-[5cqw]" />
      ))}
    </div>
    <TrendLine hourly={w.hourly} />
    <div className="grid grid-cols-6 text-center text-[1.7cqw] t-display">
      {w.hourly.map((h) => (
        <span key={h.time}>{h.temperature}°</span>
      ))}
    </div>
    <div className="mt-auto grid grid-cols-6 place-items-center border-t border-white/12 pt-[0.7cqw]">
      {w.hourly.map((h) => (
        <span
          key={h.time}
          className="flex items-center gap-[0.35cqw] text-[1.15cqw] t-caption"
        >
          <Droplet className="size-[1.15cqw] text-sky-300" strokeWidth={1.6} aria-hidden />
          {h.precipitationProbability}%
        </span>
      ))}
    </div>
  </Card>
  );

  const shell = "flex h-full w-full flex-col gap-[1.4cqw] p-[3.5cqw] text-white";
  const shadow = "[text-shadow:0_0.1cqw_0.25cqw_rgba(0,0,0,0.4)]";

  /*
    雙螢幕：卡片分成左右兩組，沒有一張跨過接縫。
    外層 padding 左右對稱，所以 grid-cols-2 的間隙自然落在接縫正中央。
    每一半是窄高區域，所以主卡在上、兩張小卡並排在下。趨勢卡照設計允許跨接縫。
  */
  if (crop) {
    return (
      <div className={`${shell} ${shadow}`}>
        <div className="grid min-h-0 flex-[3] grid-cols-2 gap-[5cqw]">
          <div className="flex min-h-0 flex-col gap-[1.4cqw]">
            {heroCard}
            <div className="grid min-h-0 flex-1 grid-cols-2 gap-[1.4cqw]">
              {aqiCard}
              {moonCard}
            </div>
          </div>
          <div className="flex min-h-0 flex-col gap-[1.4cqw]">
            {liveCard}
            <div className="grid min-h-0 flex-1 grid-cols-2 gap-[1.4cqw]">
              {sunCard}
              {envCard}
            </div>
          </div>
        </div>
        {trendCard}
        {/* 裁切時靠左，置中的話文字正好被接縫切開 */}
        <p className="text-left text-[1.15cqw] t-label">資料更新 {w.updatedAt}</p>
      </div>
    );
  }

  return (
    <div className={`${shell} ${shadow}`}>
      <div className="grid min-h-0 flex-[3] grid-cols-12 grid-rows-[2fr_1fr] gap-[1.4cqw]">
        {heroCard}
        {liveCard}
        {aqiCard}
        {sunCard}
        {envCard}
        {moonCard}
      </div>
      {trendCard}
      <p className="text-center text-[1.15cqw] t-label">資料更新 {w.updatedAt}</p>
    </div>
  );
}
