/*
  實體窗框與螢幕的幾何關係。

  展場是兩台 65 吋電視直立並排，前方再罩一扇實體窗框。框料會擋住後面的畫面 ——
  影片不必避開（景色從框後面延續過去正是窗景該有的樣子），要避開的是文字與卡片。

  關鍵是「框比螢幕窄、比螢幕高」：

        ┌──────────────┐  ← 窗框 1420 × 1500
      ┌─┼──────────────┼─┐
      │ │              │ │  ← 兩台電視合併 1618.8 × 1438.9
      └─┼──────────────┼─┘
        └──────────────┘

  所以框的左右邊料蓋住電視外緣（每側約 99mm，正好蓋掉 1:1 舞台的黑邊），
  而框的上下橫料落在螢幕之外、根本看不到。

  先前假設「框的開口就是舞台」是錯的 —— 那會把上下框當成擋住畫面的東西，
  白白讓出高度，UI 也因此縮得比需要的小。

  所有數字最後都換算成「佔舞台的百分比」：舞台的實際像素由螢幕決定，
  但框是實體的，只要兩者的對位關係固定，比例就成立。
*/

/** 65 吋 16:9 面板，直立擺放 */
const DIAGONAL_MM = 65 * 25.4;
const RATIO = Math.sqrt(16 ** 2 + 9 ** 2);
const PANEL_LONG = (DIAGONAL_MM * 16) / RATIO; // 1438.9
const PANEL_SHORT = (DIAGONAL_MM * 9) / RATIO; // 809.4

/** 兩台並排後的顯示區 */
export const DISPLAY = {
  width: PANEL_SHORT * 2,
  height: PANEL_LONG,
} as const;

/*
  窗框尺寸，取自施工圖（mm，從框的上緣往下量）：

      0 ─── 60     上框
     60 ─── 1040   上段玻璃（980 高）
   1040 ─── 1120   中橫杆（80）
   1120 ─── 1440   下段玻璃（320）
   1440 ─── 1500   下框

  寬度 690 + 40（中梃）+ 690 = 1420。

  圖上的 1380 讀作「上段玻璃頂到下段玻璃底」，由此推得中橫杆 80、上下框各 60。
  這是唯一靠推論得出的部分 —— 現場用 W 疊圖對位，不同就改這裡。
*/
export const FRAME = {
  width: 1420,
  height: 1500,
  topRail: 60,
  upperGlass: 980,
  midRail: 80,
  lowerGlass: 320,
  bottomRail: 60,
  mullion: 40,
} as const;

/** 窗框相對於顯示區左上角的位置。兩軸皆置中，所以 y 是負的（框比螢幕高） */
const FRAME_X = (DISPLAY.width - FRAME.width) / 2;
const FRAME_Y = (DISPLAY.height - FRAME.height) / 2;

/*
  舞台：1:1，邊長取顯示區的短邊（高），水平置中。
  對應 CSS 的 min(200vw, 100dvh) —— 兩台 4K 直立時 200vw = 4320、100dvh = 3840。
*/
const STAGE_SIDE = Math.min(DISPLAY.width, DISPLAY.height);
const STAGE_X = (DISPLAY.width - STAGE_SIDE) / 2;

/** 顯示區座標 → 佔舞台的百分比 */
const toX = (mm: number) => ((mm - STAGE_X) / STAGE_SIDE) * 100;
const toY = (mm: number) => (mm / STAGE_SIDE) * 100;
/** 框內座標（從框左上角量）→ 佔舞台的百分比 */
const frameX = (mm: number) => toX(FRAME_X + mm);
const frameY = (mm: number) => toY(FRAME_Y + mm);

const upperTop = frameY(FRAME.topRail);
const upperBottom = frameY(FRAME.topRail + FRAME.upperGlass);
const midBottom = frameY(FRAME.topRail + FRAME.upperGlass + FRAME.midRail);
const lowerBottom = frameY(FRAME.height - FRAME.bottomRail);

/**
 * 框料在舞台上的位置（%）。超出 0–100 的部分代表落在螢幕之外、看不到 ——
 * 疊圖時會被裁掉，安全區也不必為它讓路。
 */
export const FRAME_BANDS = {
  /** 上框：大半在螢幕上方 */
  topRail: { top: frameY(0), bottom: upperTop },
  /** 上段玻璃：UI 的主要可用區 */
  upper: { top: upperTop, bottom: upperBottom },
  /** 中橫杆：唯一真的橫過畫面的橫向框料 */
  midRail: { top: upperBottom, bottom: midBottom },
  /** 下段玻璃 */
  lower: { top: midBottom, bottom: lowerBottom },
  /** 下框：大半在螢幕下方 */
  bottomRail: { top: lowerBottom, bottom: frameY(FRAME.height) },
  /** 左右邊料蓋住的部分 —— 電視比框寬，所以外緣被蓋掉 */
  leftStile: { from: 0, to: frameX(0) },
  rightStile: { from: frameX(FRAME.width), to: 100 },
  /** 中梃：落在正中線，也就是兩台電視的接縫 */
  mullion: {
    left: frameX(FRAME.width / 2 - FRAME.mullion / 2),
    right: frameX(FRAME.width / 2 + FRAME.mullion / 2),
  },
} as const;

/*
  UI 的可用區：一個 1:1 的正方形，讓開所有真的會擋到畫面的框料。

  縱向受限於上框下緣與下框上緣，橫向受限於左右邊料；實際上縱向比較緊，
  所以邊長由它決定。因為仍然是 1:1，四個面板的版面比例一格未動；
  裁切時每半的長寬比正好 0.5，就是裁切版面原本設計的比例。
*/
const SAFE_TOP = Math.max(0, upperTop);
const SAFE_BOTTOM = Math.min(100, lowerBottom);
const SIDE = Math.min(
  SAFE_BOTTOM - SAFE_TOP,
  FRAME_BANDS.rightStile.from - FRAME_BANDS.leftStile.to
);

export const SAFE_SQUARE = {
  /** 佔舞台的百分比 */
  size: SIDE,
  top: SAFE_TOP,
  left: (100 - SIDE) / 2,
} as const;

/*
  把中橫杆換算到「面板扣掉 padding 之後的內容區」座標。

  各面板的外層 padding 不同（S 4cqw、D 3.5cqw、F 6cqw、G 4cqw），而 cqw 是
  安全區寬度的 1%、安全區又是正方形 —— 所以 padding 佔內容區高度的比例
  就等於那個 cqw 數字。

  回傳可直接給 grid-template-rows 用的字串：上半段、橫杆（留空）、下半段。
*/
const RAIL_IN_SAFE = {
  top: ((FRAME_BANDS.midRail.top - SAFE_TOP) / SIDE) * 100,
  bottom: ((FRAME_BANDS.midRail.bottom - SAFE_TOP) / SIDE) * 100,
};

export function railRows(padCqw: number): string {
  const inner = 100 - padCqw * 2;
  const top = ((RAIL_IN_SAFE.top - padCqw) / inner) * 100;
  const band = ((RAIL_IN_SAFE.bottom - RAIL_IN_SAFE.top) / inner) * 100;
  return `${top.toFixed(2)}% ${band.toFixed(2)}% 1fr`;
}
