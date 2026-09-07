/*
  實體窗框的幾何。

  展場在螢幕前方裝一扇實體窗框，框料會擋住後面的畫面。影片不必避開 ——
  景色從框後面延續過去正是窗景該有的樣子；要避開的是文字與卡片，
  被框料切掉就是資訊消失。

  數值取自施工圖（單位 mm，從框的上緣往下量）：

      0 ─── 60     上框
     60 ─── 1040   上段玻璃（980 高，中梃分成左右各 690 寬）
   1040 ─── 1120   中橫杆（80）
   1120 ─── 1440   下段玻璃（320 高）
   1440 ─── 1500   下框

  寬度：690 + 40（中梃）+ 690 = 1420，中梃正好落在中線，
  也就是兩台電視的接縫 —— UI 不跨接縫的處理同時也避開了它。

  圖上的 1380 讀作「上段玻璃頂到下段玻璃底」，由此推得中橫杆 80、上下框各 60。
  若實際丈量不同，改這裡的數字即可，版面會自己跟著走。
*/

export const FRAME = {
  outerWidth: 1420,
  outerHeight: 1500,
  topRail: 60,
  upperGlass: 980,
  midRail: 80,
  lowerGlass: 320,
  bottomRail: 60,
  mullion: 40,
} as const;

/*
  框的縱向位置換算成「佔框高的比例」。

  之所以用比例而不是 mm：舞台的實際尺寸由螢幕決定（兩台 65 吋直立 4K 並排時
  是 3840×3840 px），而框是實體的。只要框的開口與舞台對齊，比例就成立，
  不必知道每台螢幕有多少像素。
*/
const H = FRAME.outerHeight;

export const FRAME_BANDS = {
  /** 上段玻璃：UI 的主要可用區 */
  upper: {
    top: (FRAME.topRail / H) * 100,
    bottom: ((FRAME.topRail + FRAME.upperGlass) / H) * 100,
  },
  /** 中橫杆：會擋住畫面 */
  midRail: {
    top: ((FRAME.topRail + FRAME.upperGlass) / H) * 100,
    bottom: ((FRAME.topRail + FRAME.upperGlass + FRAME.midRail) / H) * 100,
  },
  /** 下段玻璃：看得到，但和上段被中橫杆隔開 */
  lower: {
    top: ((FRAME.topRail + FRAME.upperGlass + FRAME.midRail) / H) * 100,
    bottom: ((H - FRAME.bottomRail) / H) * 100,
  },
} as const;

/*
  UI 的可用區。

  第一版把正方形塞進「上段玻璃」（邊長只有框高的 65.3%），結果 UI 縮成一小塊
  擠在畫面中央 —— 上下框以外的整片玻璃都空著，不像窗景，像貼了張卡片。

  改成只讓開上下框：邊長 = (1500 − 60 − 60) / 1500 = 92%。這樣 UI 幾乎填滿
  整扇窗，而且仍然是 1:1 —— 版面比例一格未動，四個面板不必重排。
  裁切時每半是 46% × 92%，長寬比 0.5，正好就是裁切版面原本設計的比例。

  中橫杆改用「橫向接縫」處理：它橫過正方形的 71.0% ~ 76.8%，內容在那一段
  留空即可 —— 跟垂直接縫（中梃／兩台電視之間）完全同一套手法。
*/
const SIDE = ((FRAME.outerHeight - FRAME.topRail - FRAME.bottomRail) / FRAME.outerHeight) * 100;

export const SAFE_SQUARE = {
  /** 佔舞台的百分比 */
  size: SIDE,
  top: FRAME_BANDS.upper.top,
  left: (100 - SIDE) / 2,
} as const;

/**
 * 中橫杆在「安全區正方形」裡的位置（佔正方形高的百分比）。
 * 面板用它讓內容在這一段留空，框料才不會切到字。
 */
export const MID_RAIL_IN_SAFE = {
  top: ((FRAME_BANDS.midRail.top - FRAME_BANDS.upper.top) / SIDE) * 100,
  bottom: ((FRAME_BANDS.midRail.bottom - FRAME_BANDS.upper.top) / SIDE) * 100,
} as const;

/*
  把中橫杆換算到「面板扣掉 padding 之後的內容區」座標。

  各面板的外層 padding 不同（S 4cqw、D 3.5cqw、F 6cqw、G 4cqw），而 cqw 是
  安全區寬度的 1%，安全區又是正方形 —— 所以 padding 佔內容區高度的比例
  就等於那個 cqw 數字。

  回傳可直接給 grid-template-rows 用的字串：上半段、橫杆（留空）、下半段。
*/
export function railRows(padCqw: number): string {
  const inner = 100 - padCqw * 2;
  const top = ((MID_RAIL_IN_SAFE.top - padCqw) / inner) * 100;
  const band = ((MID_RAIL_IN_SAFE.bottom - MID_RAIL_IN_SAFE.top) / inner) * 100;
  return `${top.toFixed(2)}% ${band.toFixed(2)}% 1fr`;
}
