import * as XLSX from 'xlsx';

// ─── 类型定义 ────────────────────────────────────────────────────────────────

export interface GRRItem {
  fai: string;       // 直接取 A 列，如 FAI201
  nozzle: string;    // 如 N1，无前缀则为空
  contribution: number;  // B 列
  pTV: number;          // C 列
  pTol: number;         // D 列
  ndc: number;          // E 列
  comment?: string;
  // 判定标准：%P/Tolerance < 10%，NDC >= 5
  passPTol: boolean;
  passNDC: boolean;
  passOverall: boolean;
}

// summary 保留但直接等于 items（不聚合）
export interface GRRSummary extends GRRItem {}

export interface CorrelationShiftItem {
  fai: string;
  meanshift: number;
  meanshiftTolPct: number;
  maxOffset: number;
  maxOffsetTolPct: number;
  rsq: number;
  stdevTol?: number;
  passMeanshift: boolean;   // ≤10%
  passMaxOffset: boolean;   // ≤15%
  passRSQ: boolean;         // ≥85%
}

export interface ParsedExcelData {
  fileName: string;
  type: 'GRR' | 'Report' | 'Unknown';
  dbId?: string;        // IndexedDB 存储 id（用于持久化删除）
  grr?: {
    items: GRRItem[];
    summary: GRRSummary[];
    passRate: number;
    worstFAI: string;
  };
  report?: {
    shifts: CorrelationShiftItem[];
    passRate: number;
    faiList: string[];
    worstMeanshift: string;
    worstRSQ: string;
  };
  error?: string;
}

// ─── 解析 GRR Sheet ──────────────────────────────────────────────────────────

function parseGRRSheet(wb: XLSX.WorkBook, _fileName: string): ParsedExcelData['grr'] {
  const sheet = wb.Sheets['GRR'];
  if (!sheet) return undefined;

  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null }) as unknown[][];

  const items: GRRItem[] = [];

  for (let i = 2; i < raw.length; i++) {
    const row = raw[i] as (string | number | null)[];
    const faiRaw = String(row[0] ?? '').trim();
    if (!faiRaw || faiRaw === 'nan') continue;

    // Parse FAI format: NxFAIyyy 或 FAIyyy
    // NxFAI201 -> nozzle='N1', fai='FAI201'
    // FAI40    -> nozzle='',   fai='FAI40'
    const m = faiRaw.match(/^(N\d+)?(FAI.+)$/);
    if (!m) continue;

    const nozzle = m[1] ?? '';
    const fai = m[2];
    const contrib = typeof row[1] === 'number' ? row[1] : null;
    const pTV = typeof row[2] === 'number' ? row[2] : null;
    const pTol = typeof row[3] === 'number' ? row[3] : null;
    const ndc = typeof row[4] === 'number' ? row[4] : null;
    const comment = row[5] ? String(row[5]) : undefined;

    if (contrib === null || pTV === null || pTol === null || ndc === null) continue;

    // 判定标准：%P/Tolerance < 10%，NDC >= 5
    const passPTol = !isNaN(pTol) && pTol < 10;
    const passNDC = !isNaN(ndc) && ndc >= 5;
    const passOverall = passPTol && passNDC;

    items.push({
      fai,
      nozzle,
      contribution: contrib,
      pTV,
      pTol,
      ndc,
      comment,
      passPTol,
      passNDC,
      passOverall,
    });
  }

  // summary 直接等于 items（不聚合）
  const summary: GRRSummary[] = items;
  const passCount = items.filter(s => s.passOverall).length;

  return {
    items,
    summary,
    passRate: items.length > 0 ? passCount / items.length : 0,
    worstFAI: items[0]?.fai ?? '-',
  };
}

// ─── 解析 Report Sheet ───────────────────────────────────────────────────────
//
// 注意：xlsx.js 解析出的列索引与 Python pandas 不同！
// xlsx.js 实测（row[1] = Excel第2行）：
//   col[0]=null, col[1]="FAI"(label), col[2]="FAI201", col[3]="FAI202" ...
//   col[0]="Meanshift/Tol", col[1]="≤10%", col[2]=FAI201_val, col[3]=FAI202_val ...
//
// 所以：FAI 数据从 col[2] 开始，标签在 col[0]，判定标准在 col[1]
// 数值为小数格式（×100 得百分比）

function parseReportSheet(wb: XLSX.WorkBook): ParsedExcelData['report'] {
  const sheet = wb.Sheets['Report'];
  if (!sheet) return undefined;

  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null }) as unknown[][];

  // ── 1. 动态找 FAI 名称起始列（找第一个以 'FAI' 开头但不等于 'FAI' 的单元格）
  const faiRowData = raw[1] as (string | number | null)[];
  let startCol = -1;
  for (let c = 0; c < (faiRowData?.length ?? 0); c++) {
    const v = String(faiRowData[c] ?? '').trim();
    if (v.startsWith('FAI') && v !== 'FAI') { startCol = c; break; }
  }
  if (startCol < 0) return undefined;

  const faiNames: string[] = [];
  for (let c = startCol; c < faiRowData.length; c++) {
    const v = faiRowData[c];
    const s = String(v ?? '').trim();
    if (s !== '' && s !== 'null') faiNames.push(s);
  }
  if (faiNames.length === 0) return undefined;

  // ── 2. 按固定行号取值（Excel 行号从 1 开始，数组索引从 0 开始）
  // Excel 第 10 行 = 数组索引 9   Meanshift
  // Excel 第 11 行 = 数组索引 10  Meanshift/Tol
  // Excel 第 12 行 = 数组索引 11  Maxoffset
  // Excel 第 13 行 = 数组索引 12  Maxoffset/Tol
  // Excel 第 16 行 = 数组索引 15  RSQ
  const meanshiftRow    = 9;
  const meanshiftTolRow = 10;
  const maxOffsetRow    = 11;
  const maxOffsetTolRow = 12;
  const rsqRow          = 15;

  // ── 3. 从指定行提取数值（从 startCol 开始，与 FAI 列对齐）
  const extractValues = (rowIdx: number): number[] => {
    if (rowIdx < 0) return Array(faiNames.length).fill(NaN);
    const row = raw[rowIdx] as (string | number | null)[];
    const result: number[] = [];
    for (let c = startCol; c < startCol + faiNames.length; c++) {
      const v = row[c];
      result.push(typeof v === 'number' ? v : parseFloat(String(v ?? 'NaN')));
    }
    return result;
  };

  const meanshiftVals    = extractValues(meanshiftRow);
  const meanshiftTolVals = extractValues(meanshiftTolRow);
  const maxOffsetVals    = extractValues(maxOffsetRow);
  const maxOffsetTolVals = extractValues(maxOffsetTolRow);
  const rsqVals          = extractValues(rsqRow);

  // ── 4. 构建结果（直接使用 Excel 中的数值，已是百分比形式）
  const shifts: CorrelationShiftItem[] = faiNames.map((fai, i) => {
    const msRaw   = meanshiftVals[i];    // Excel 第10行，已是百分比
    const msTolRaw = meanshiftTolVals[i]; // Excel 第11行，已是百分比
    const moRaw   = maxOffsetVals[i];    // Excel 第12行，已是百分比
    const moTolRaw = maxOffsetTolVals[i]; // Excel 第13行，已是百分比
    const rsqRaw  = rsqVals[i];           // Excel 第16行原始值

    return {
      fai,
      meanshift:       isNaN(msRaw)   ? 0 : msRaw,
      meanshiftTolPct: isNaN(msTolRaw) ? 0 : msTolRaw * 100,
      maxOffset:       isNaN(moRaw)   ? 0 : moRaw,
      maxOffsetTolPct: isNaN(moTolRaw) ? 0 : moTolRaw * 100,
      rsq:             isNaN(rsqRaw)  ? 0 : rsqRaw * 100,
      passMeanshift:   !isNaN(msTolRaw) && msTolRaw * 100 <= 10,
      passMaxOffset:   !isNaN(moTolRaw) && moTolRaw * 100 <= 15,
      passRSQ:         !isNaN(rsqRaw)  && rsqRaw * 100 >= 85,
    };
  });

  const passAll = shifts.filter(s => s.passMeanshift && s.passMaxOffset && s.passRSQ).length;
  const worstMeanshift = [...shifts].sort((a, b) => b.meanshiftTolPct - a.meanshiftTolPct)[0]?.fai ?? '-';
  const worstRSQ       = [...shifts].sort((a, b) => a.rsq - b.rsq)[0]?.fai ?? '-';

  return {
    shifts,
    passRate: shifts.length > 0 ? passAll / shifts.length : 0,
    faiList: faiNames,
    worstMeanshift,
    worstRSQ,
  };
}

// ─── 主入口 ──────────────────────────────────────────────────────────────────

/** 从 ArrayBuffer 解析（用于从 IndexedDB 恢复） */
export function parseExcelBuffer(buffer: ArrayBuffer, fileName: string): ParsedExcelData {
  try {
    const wb = XLSX.read(buffer, { type: 'array' });
    const hasGRR = wb.SheetNames.includes('GRR');
    const hasReport = wb.SheetNames.includes('Report');

    if (hasGRR) {
      return { fileName, type: 'GRR', grr: parseGRRSheet(wb, fileName) };
    } else if (hasReport) {
      return { fileName, type: 'Report', report: parseReportSheet(wb) };
    } else {
      return { fileName, type: 'Unknown', error: '未找到 GRR 或 Report Sheet' };
    }
  } catch (e) {
    return { fileName, type: 'Unknown', error: String(e) };
  }
}

/** 从 File 对象解析 */
export async function parseExcelFile(file: File): Promise<ParsedExcelData> {
  const buffer = await file.arrayBuffer();
  return parseExcelBuffer(buffer, file.name);
}
