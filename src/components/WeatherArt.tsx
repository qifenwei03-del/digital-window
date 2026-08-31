// 設計稿用的是彩色填色插圖，lucide 的線條圖對不上，所以自己畫。
// C（詳細版）與 D（無框版）共用。

function SunShape({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (Math.PI / 4) * i;
    return (
      <line
        key={i}
        x1={cx + r * 1.35 * Math.cos(a)}
        y1={cy + r * 1.35 * Math.sin(a)}
        x2={cx + r * 1.85 * Math.cos(a)}
        y2={cy + r * 1.85 * Math.sin(a)}
        stroke="#fbbf24"
        strokeWidth={r * 0.28}
        strokeLinecap="round"
      />
    );
  });
  return (
    <g>
      {rays}
      <circle cx={cx} cy={cy} r={r} fill="#fcd34d" />
    </g>
  );
}

function CloudShape({ x, y, s, fill }: { x: number; y: number; s: number; fill: string }) {
  return (
    <g fill={fill} transform={`translate(${x} ${y}) scale(${s})`}>
      <circle cx="16" cy="20" r="10" />
      <circle cx="30" cy="14" r="14" />
      <circle cx="44" cy="20" r="10" />
      <rect x="16" y="20" width="28" height="10" rx="5" />
    </g>
  );
}

function Drops({ x, y, s, color }: { x: number; y: number; s: number; color: string }) {
  return (
    <g fill={color} transform={`translate(${x} ${y}) scale(${s})`}>
      {[0, 12, 24].map((dx, i) => (
        <path key={dx} d={`M${dx} ${i === 1 ? 2 : 0} q4 6 0 9 q-4 -3 0 -9 Z`} />
      ))}
    </g>
  );
}

export default function WeatherArt({
  code,
  isDay,
  className,
}: {
  code: number;
  isDay: boolean;
  className: string;
}) {
  const clear = code <= 1;
  const partly = code === 2;
  const overcast = code === 3;
  const fog = code === 45 || code === 48;
  const drizzle = code >= 51 && code <= 57;
  const snow = (code >= 71 && code <= 77) || code === 85 || code === 86;
  const storm = code >= 95;
  const rain = !clear && !partly && !overcast && !fog && !drizzle && !snow && !storm;

  return (
    <svg viewBox="0 0 100 76" className={className} aria-hidden>
      {clear &&
        (isDay ? (
          <SunShape cx={50} cy={38} r={17} />
        ) : (
          <path fill="#fcd34d" d="M62 38a20 20 0 1 1-20-20 16 16 0 0 0 20 20Z" />
        ))}

      {partly && (
        <>
          {isDay ? (
            <SunShape cx={35} cy={26} r={13} />
          ) : (
            <path fill="#fcd34d" d="M46 26a14 14 0 1 1-14-14 11 11 0 0 0 14 14Z" />
          )}
          <CloudShape x={30} y={26} s={0.95} fill="#e8edf3" />
        </>
      )}

      {(overcast || fog) && (
        <>
          <CloudShape x={16} y={14} s={1.05} fill="#cbd5e1" />
          <CloudShape x={26} y={26} s={0.95} fill="#f1f5f9" />
        </>
      )}

      {(drizzle || rain || storm) && (
        <>
          <CloudShape x={20} y={10} s={1.05} fill="#dbe3ec" />
          {storm ? (
            <path d="M52 52l-10 16h8l-4 12 14-18h-8l6-10Z" fill="#fbbf24" />
          ) : (
            <Drops x={34} y={52} s={rain ? 1.2 : 0.95} color="#60a5fa" />
          )}
        </>
      )}

      {snow && (
        <>
          <CloudShape x={20} y={10} s={1.05} fill="#dbe3ec" />
          <Drops x={34} y={52} s={1} color="#bae6fd" />
        </>
      )}
    </svg>
  );
}
