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

  上段玻璃是 1420 × 980（約 1.45:1），而整套面板是為 1:1 設計並逐一驗證過的。
  硬把它壓進 65% 的高度會撐破卡片（實測 S 溢出 129px、D 469px、G 920px）。

  所以改成「把一個正方形塞進上段玻璃」：邊長等於上段玻璃的高度，水平置中。
  版面比例一格未動，所有 cqw 只是同步縮小 —— 資訊一項沒少，也不必為了框
  重新設計四個面板。代價是字會小一些（邊長從框寬的 100% 變成 69%）。

  這一層自己也是 @container，所以 cqw 改以它為基準。
  正方形置中於舞台，中線仍然對齊中梃與兩台電視的接縫，
  S 與 D 的「兩半各自成組」因此依然成立。
*/
const SIDE = (FRAME.upperGlass / FRAME.outerHeight) * 100;

export const SAFE_SQUARE = {
  /** 佔舞台的百分比 */
  size: SIDE,
  top: FRAME_BANDS.upper.top,
  left: (100 - SIDE) / 2,
} as const;
