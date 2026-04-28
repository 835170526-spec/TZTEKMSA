import { useState, useCallback, useEffect, useRef } from 'react';
import type { ParsedExcelData, CorrelationShiftItem } from '@/lib/excelParser';
import { parseExcelFile, parseExcelBuffer } from '@/lib/excelParser';
import {
  saveFileToDB, loadAllFilesFromDB, deleteFileFromDB,
  saveGroupToDB, loadAllGroupsFromDB, deleteGroupFromDB, moveFileToDB,
} from '@/lib/fileStorage';
import type { StoredGroup } from '@/lib/fileStorage';
import {
  Upload, FileSpreadsheet, X, CheckCircle2, XCircle,
  AlertTriangle, TrendingDown, Activity,
  ChevronDown, ChevronRight, Loader2, Info, Database,
  FolderPlus, Folder, FolderOpen, Pencil, Trash2, Check, Plus,
  Search,
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────

// 直接显示 Excel 中的原始值，不做任何转换
function raw(v: number, d = 4) {
  return isNaN(v) ? '-' : v.toFixed(d);
}
function rawPct(v: number, d = 2) {
  return isNaN(v) ? '-' : `${v.toFixed(d)}%`;
}

function PassBadge({ pass }: { pass: boolean }) {
  return pass
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium"><CheckCircle2 className="w-3 h-3" />PASS</span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-xs font-medium"><XCircle className="w-3 h-3" />FAIL</span>;
}

// ─── Upload Zone ─────────────────────────────────────────────────────────────

interface UploadZoneProps {
  onFiles: (files: File[]) => void;
  loading: boolean;
}

function UploadZone({ onFiles, loading }: UploadZoneProps) {
  const [drag, setDrag] = useState(false);

  const handle = useCallback((files: FileList | null) => {
    if (!files) return;
    const xlsxFiles = Array.from(files).filter(f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls'));
    if (xlsxFiles.length > 0) onFiles(xlsxFiles);
  }, [onFiles]);

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files); }}
      className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
        drag ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
      }`}
      onClick={() => {
        const inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = '.xlsx,.xls';
        inp.multiple = true;
        inp.onchange = e => handle((e.target as HTMLInputElement).files);
        inp.click();
      }}
    >
      {loading ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
          <p className="text-blue-600 font-medium">解析中...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center">
            <Upload className="w-7 h-7 text-blue-500" />
          </div>
          <div>
            <p className="font-semibold text-gray-700">点击或拖拽上传 Excel 文件</p>
            <p className="text-sm text-gray-400 mt-1">支持含 GRR Sheet 或 Report Sheet 的 .xlsx 文件</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── GRR Panel ───────────────────────────────────────────────────────────────

function GRRPanel({ data }: { data: NonNullable<ParsedExcelData['grr']> }) {
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState('');

  // Filter items by search term (FAI number or nozzle+FAI)
  const filtered = search.trim()
    ? data.items.filter(item => {
        const label = item.nozzle ? `${item.nozzle}${item.fai}` : item.fai;
        return label.toLowerCase().includes(search.trim().toLowerCase());
      })
    : data.items;

  const displayed = showAll ? filtered : filtered.slice(0, 50);

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-2 gap-3">
        {[
          { label: 'Pass Rate', value: rawPct(data.passRate * 100), icon: <Activity className="w-4 h-4" />, color: data.passRate >= 0.9 ? 'text-green-600 bg-green-50' : 'text-orange-600 bg-orange-50' },
          { label: 'Fail', value: data.items.filter(s => !s.passOverall).length, icon: <XCircle className="w-4 h-4" />, color: data.items.filter(s => !s.passOverall).length > 0 ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50' },
        ].map(card => (
          <div key={card.label} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className={`inline-flex p-2 rounded-lg ${card.color} mb-2`}>{card.icon}</div>
            <div className="text-lg font-bold text-gray-900">{card.value}</div>
            <div className="text-xs text-gray-500">{card.label}</div>
          </div>
        ))}
      </div>

      {/* GRR table - direct extraction */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
          <h4 className="font-semibold text-gray-700 text-sm">GRR</h4>
          {/* Search input */}
          <div className="relative">
            <input
              type="text"
              placeholder="搜索 FAI 编号..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-7 pr-8 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 w-44"
            />
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-100 rounded"
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">FAIs</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600">%Contribution</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600">%P/TV</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600">%P/Tolerance</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600">NDC</th>
                <th className="px-3 py-2.5 text-center font-semibold text-gray-600">%P/Tolerance</th>
                <th className="px-3 py-2.5 text-center font-semibold text-gray-600">NDC</th>
                <th className="px-3 py-2.5 text-center font-semibold text-gray-600">Overall result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-gray-400">
                    {search ? `未找到匹配 "${search}" 的结果` : '暂无数据'}
                  </td>
                </tr>
              ) : (
                displayed.map((row, idx) => (
                  <tr key={idx} className={`hover:bg-gray-50 ${!row.passOverall ? 'bg-red-50/30' : ''}`}>
                    <td className="px-3 py-2.5 font-medium text-gray-800">{row.nozzle ? `${row.nozzle}${row.fai}` : row.fai}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">{raw(row.contribution)}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">{raw(row.pTV)}</td>
                    <td className={`px-3 py-2.5 text-right font-medium ${row.pTol >= 10 ? 'text-red-600' : 'text-gray-700'}`}>
                      {raw(row.pTol)}
                    </td>
                    <td className={`px-3 py-2.5 text-right font-medium ${row.ndc < 5 ? 'text-red-600' : 'text-gray-700'}`}>
                      {row.ndc}
                    </td>
                    <td className="px-3 py-2.5 text-center"><PassBadge pass={row.passPTol} /></td>
                    <td className="px-3 py-2.5 text-center"><PassBadge pass={row.passNDC} /></td>
                    <td className="px-3 py-2.5 text-center"><PassBadge pass={row.passOverall} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 50 && (
          <div className="px-4 py-2 border-t border-gray-100 text-center flex items-center justify-center gap-4">
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {showAll ? '收起' : `展开全部 ${filtered.length} 行`}
            </button>
            {search && (
              <span className="text-xs text-gray-400">
                共 {filtered.length} 条匹配结果
              </span>
            )}
          </div>
        )}
        {search && filtered.length > 0 && filtered.length <= 50 && (
          <div className="px-4 py-2 border-t border-gray-100 text-center">
            <span className="text-xs text-gray-400">
              共 {filtered.length} 条匹配结果
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Report Shift Panel ──────────────────────────────────────────────────────

function ReportPanel({ data }: { data: NonNullable<ParsedExcelData['report']> }) {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? data.shifts : data.shifts.slice(0, 20);

  const meanshiftFail = data.shifts.filter(s => !s.passMeanshift).length;
  const rsqFail = data.shifts.filter(s => !s.passRSQ).length;

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-2 gap-3">
        {[
          { label: 'Meanshift Fail', value: meanshiftFail, icon: <AlertTriangle className="w-4 h-4" />, color: meanshiftFail === 0 ? 'text-green-600 bg-green-50' : 'text-orange-600 bg-orange-50' },
          { label: 'RSQ Fail', value: rsqFail, icon: <TrendingDown className="w-4 h-4" />, color: rsqFail === 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50' },
        ].map(card => (
          <div key={card.label} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className={`inline-flex p-2 rounded-lg ${card.color} mb-2`}>{card.icon}</div>
            <div className="text-lg font-bold text-gray-900">{card.value}</div>
            <div className="text-xs text-gray-500">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Shift table */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h4 className="font-semibold text-gray-700 text-sm">Correlation Report Shift 汇总</h4>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Info className="w-3.5 h-3.5" />
            Meanshift/Tol ≤10%，Max Offset/Tol ≤15%，RSQ ≥85%
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">FAI</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Meanshift</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Meanshift/Tol</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Maxoffset</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Maxoffset/Tol</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600">RSQ</th>
                <th className="px-3 py-2.5 text-center font-semibold text-gray-600">Meanshift/Tol</th>
                <th className="px-3 py-2.5 text-center font-semibold text-gray-600">Maxoffset/Tol</th>
                <th className="px-3 py-2.5 text-center font-semibold text-gray-600">RSQ</th>
                <th className="px-3 py-2.5 text-center font-semibold text-gray-600">Overall result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayed.map((row: CorrelationShiftItem) => {
                const allPass = row.passMeanshift && row.passMaxOffset && row.passRSQ;
                return (
                  <tr key={row.fai} className={`hover:bg-gray-50 ${!allPass ? 'bg-red-50/20' : ''}`}>
                    <td className="px-3 py-2.5 font-medium text-gray-800">{row.fai}</td>
                    <td className="px-3 py-2.5 text-right text-gray-700">{isNaN(row.meanshift) ? '-' : row.meanshift.toFixed(3)}</td>
                    <td className={`px-3 py-2.5 text-right font-medium ${!row.passMeanshift ? 'text-red-600' : 'text-gray-700'}`}>
                      {row.meanshiftTolPct.toFixed(3)}%
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-700">{isNaN(row.maxOffset) ? '-' : row.maxOffset.toFixed(3)}</td>
                    <td className={`px-3 py-2.5 text-right font-medium ${!row.passMaxOffset ? 'text-red-600' : 'text-gray-700'}`}>
                      {row.maxOffsetTolPct.toFixed(3)}%
                    </td>
                    <td className={`px-3 py-2.5 text-right font-medium ${!row.passRSQ ? 'text-red-600' : 'text-gray-700'}`}>
                      {row.rsq.toFixed(2)}%
                    </td>
                    <td className="px-3 py-2.5 text-center"><PassBadge pass={row.passMeanshift} /></td>
                    <td className="px-3 py-2.5 text-center"><PassBadge pass={row.passMaxOffset} /></td>
                    <td className="px-3 py-2.5 text-center"><PassBadge pass={row.passRSQ} /></td>
                    <td className="px-3 py-2.5 text-center"><PassBadge pass={allPass} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {data.shifts.length > 20 && (
          <div className="px-4 py-2 border-t border-gray-100 text-center">
            <button onClick={() => setShowAll(!showAll)} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              {showAll ? '收起' : `展开全部 ${data.shifts.length} 个 FAI`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── File Card ───────────────────────────────────────────────────────────────

function FileCard({ result, onRemove }: { result: ParsedExcelData; onRemove: () => void }) {
  const [open, setOpen] = useState(true);

  const typeLabel = result.type === 'GRR' ? 'GRR 分析' : result.type === 'Report' ? 'Correlation Report' : '未知类型';
  const typeColor = result.type === 'GRR' ? 'bg-purple-100 text-purple-700' : result.type === 'Report' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600';

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      {/* Card header */}
      <div
        className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
          <FileSpreadsheet className="w-5 h-5 text-green-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-800 truncate text-sm">{result.fileName}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${typeColor}`}>{typeLabel}</span>
            {result.error && <span className="text-xs text-red-500">{result.error}</span>}
            {result.grr && <span className="text-xs text-gray-400">{result.grr.items.length} rows · Pass {rawPct(result.grr.passRate * 100)}</span>}
            {result.report && <span className="text-xs text-gray-400">{result.report.shifts.length} FAIs · All Pass {result.report.shifts.filter(s => s.passMeanshift && s.passMaxOffset && s.passRSQ).length}</span>}
            {/* 已持久化标记 */}
            {result.dbId && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded text-xs">
                <Database className="w-2.5 h-2.5" />已保存
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={e => { e.stopPropagation(); onRemove(); }}
            className="p-1.5 hover:bg-red-50 hover:text-red-500 text-gray-400 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {/* Content */}
      {open && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4">
          {result.grr && <GRRPanel data={result.grr} />}
          {result.report && <ReportPanel data={result.report} />}
          {result.error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
              ⚠️ 解析失败：{result.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Group Panel ─────────────────────────────────────────────────────────────

interface GroupPanelProps {
  group: StoredGroup;
  files: (ParsedExcelData & { groupId?: string })[];
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onRemoveFile: (dbId: string) => void;
  onUpload: (groupId: string) => void;
  loading: boolean;
}

function GroupPanel({ group, files, onRename, onDelete, onRemoveFile, onUpload, loading }: GroupPanelProps) {
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState(group.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const commitRename = () => {
    const trimmed = nameVal.trim();
    if (trimmed && trimmed !== group.name) onRename(group.id, trimmed);
    setEditing(false);
  };

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      {/* Group header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-100">
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
          {open
            ? <FolderOpen className="w-4 h-4 text-amber-500 flex-shrink-0" />
            : <Folder     className="w-4 h-4 text-amber-400 flex-shrink-0" />}
          {editing ? (
            <input
              ref={inputRef}
              value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setNameVal(group.name); setEditing(false); } }}
              onClick={e => e.stopPropagation()}
              className="flex-1 min-w-0 text-sm font-semibold text-gray-800 bg-white border border-blue-300 rounded px-2 py-0.5 outline-none"
            />
          ) : (
            <span className="flex-1 min-w-0 text-sm font-semibold text-gray-800 truncate">{group.name}</span>
          )}
          <span className="text-xs text-gray-400 flex-shrink-0">{files.length} 个文件</span>
        </button>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Upload to this group */}
          <button
            onClick={() => onUpload(group.id)}
            disabled={loading}
            title="上传文件到此分组"
            className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
          {/* Rename */}
          <button
            onClick={() => { setEditing(true); setOpen(true); }}
            title="重命名"
            className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {/* Delete group */}
          <button
            onClick={() => onDelete(group.id)}
            title="删除分组（文件不会被删除）"
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {/* Collapse toggle */}
          <button onClick={() => setOpen(o => !o)} className="p-1.5 text-gray-300 hover:text-gray-500 rounded-lg transition-colors">
            {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Files */}
      {open && (
        <div className="p-3 space-y-3">
          {files.length === 0 ? (
            <div
              className="border-2 border-dashed border-gray-200 rounded-xl py-6 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
              onClick={() => onUpload(group.id)}
            >
              <Plus className="w-5 h-5 text-gray-300 mx-auto mb-1" />
              <p className="text-xs text-gray-400">点击上传文件到此分组</p>
            </div>
          ) : (
            files.map((r, i) => (
              <FileCard
                key={`${r.fileName}-${i}`}
                result={r}
                onRemove={() => r.dbId && onRemoveFile(r.dbId)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function MSADashboard() {
  const [results, setResults]       = useState<(ParsedExcelData & { groupId?: string })[]>([]);
  const [groups, setGroups]         = useState<StoredGroup[]>([]);
  const [loading, setLoading]       = useState(false);
  const [initializing, setInitializing] = useState(true);

  // 上传目标分组（由分组"上传"按钮触发）
  const [uploadTargetGroup, setUploadTargetGroup] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 新建分组输入
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName]   = useState('');
  const newGroupInputRef = useRef<HTMLInputElement>(null);

  // ── 初始化：从 IndexedDB 恢复 ──
  useEffect(() => {
    (async () => {
      try {
        const [storedFiles, storedGroups] = await Promise.all([
          loadAllFilesFromDB(),
          loadAllGroupsFromDB(),
        ]);

        // 若无分组，自动生成默认分组
        let groups = storedGroups;
        if (groups.length === 0) {
          const defaultGroup: StoredGroup = {
            id: 'default',
            name: '默认分组',
            createdAt: Date.now(),
            order: 0,
          };
          await saveGroupToDB(defaultGroup);
          groups = [defaultGroup];
        }
        setGroups(groups);

        const parsed = storedFiles.map(sf => {
          const result = parseExcelBuffer(sf.buffer, sf.fileName);
          return { ...result, dbId: sf.id, groupId: sf.groupId ?? 'default' };
        });
        setResults(parsed);
      } catch (e) {
        console.error('Failed to load from IndexedDB:', e);
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  // ── 上传文件 ──
  const handleFiles = async (files: File[], groupId: string) => {
    setLoading(true);
    const newResults: (ParsedExcelData & { groupId?: string })[] = [];
    for (const file of files) {
      try {
        const stored = await saveFileToDB(file, groupId);
        const result = await parseExcelFile(file);
        newResults.push({ ...result, dbId: stored.id, groupId });
      } catch {
        const result = await parseExcelFile(file);
        newResults.push({ ...result, groupId });
      }
    }
    setResults(prev => [...prev, ...newResults]);
    setLoading(false);
  };

  // 顶部上传区（上传到当前 activeGroup 或默认分组）
  const handleTopUpload = useCallback((files: File[]) => {
    const targetId = groups[0]?.id ?? 'default';
    handleFiles(files, targetId);
  }, [groups]);

  // 分组上传按钮触发
  const triggerGroupUpload = (groupId: string) => {
    setUploadTargetGroup(groupId);
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter(f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls'));
    if (files.length > 0 && uploadTargetGroup) {
      handleFiles(files, uploadTargetGroup);
    }
    e.target.value = '';
    setUploadTargetGroup(null);
  };

  // ── 删除文件 ──
  const removeFile = async (dbId: string) => {
    try { await deleteFileFromDB(dbId); } catch {}
    setResults(prev => prev.filter(r => r.dbId !== dbId));
  };

  // ── 创建分组 ──
  const commitCreateGroup = async () => {
    const name = newGroupName.trim();
    if (!name) { setCreatingGroup(false); return; }
    const group: StoredGroup = {
      id: `g-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name,
      createdAt: Date.now(),
      order: groups.length,
    };
    await saveGroupToDB(group);
    setGroups(prev => [...prev, group]);
    setNewGroupName('');
    setCreatingGroup(false);
  };

  useEffect(() => {
    if (creatingGroup) newGroupInputRef.current?.focus();
  }, [creatingGroup]);

  // ── 重命名分组 ──
  const renameGroup = async (id: string, name: string) => {
    const group = groups.find(g => g.id === id);
    if (!group) return;
    const updated = { ...group, name };
    await saveGroupToDB(updated);
    setGroups(prev => prev.map(g => g.id === id ? updated : g));
  };

  // ── 删除分组 ──
  const deleteGroup = async (id: string) => {
    if (groups.length <= 1) { alert('至少保留一个分组'); return; }
    await deleteGroupFromDB(id);
    // 把该分组的文件移到第一个分组
    const fallback = groups.find(g => g.id !== id)?.id ?? 'default';
    const toMove = results.filter(r => r.groupId === id && r.dbId);
    await Promise.all(toMove.map(r => moveFileToDB(r.dbId!, fallback)));
    setResults(prev => prev.map(r => r.groupId === id ? { ...r, groupId: fallback } : r));
    setGroups(prev => prev.filter(g => g.id !== id));
  };

  if (initializing) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-gray-400 text-sm">正在加载已保存的文件...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">MSA 数据看板</h1>
          <p className="text-gray-500 text-sm mt-1">上传 Excel 报告，自动提取 GRR 及 Report Shift 数据，刷新后自动恢复</p>
        </div>
        <div className="flex items-center gap-2">
          {results.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-medium">
              <Database className="w-3.5 h-3.5" />
              {results.filter(r => r.dbId).length} 个文件已持久化
            </div>
          )}
        </div>
      </div>

      {/* 隐藏的 file input（分组上传用） */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        multiple
        className="hidden"
        onChange={handleInputChange}
      />

      {/* Upload zone（上传到第一个分组） */}
      <UploadZone onFiles={handleTopUpload} loading={loading} />

      {/* Support hint */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-400">
        <div className="flex items-center gap-1.5 bg-purple-50 text-purple-600 px-3 py-1.5 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-purple-500" />
          GRR Sheet：提取 %Contribution / %P/TV / %P/Tolerance / NDC
        </div>
        <div className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          Report Sheet：提取 Meanshift / Max Offset / RSQ
        </div>
        <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg">
          <Database className="w-3.5 h-3.5" />
          文件自动保存至浏览器，刷新后仍可查看
        </div>
      </div>

      {/* 分组管理 */}
      <div className="space-y-3">
        {/* 分组列表 */}
        {groups.map(group => (
          <GroupPanel
            key={group.id}
            group={group}
            files={results.filter(r => r.groupId === group.id)}
            onRename={renameGroup}
            onDelete={deleteGroup}
            onRemoveFile={removeFile}
            onUpload={triggerGroupUpload}
            loading={loading}
          />
        ))}

        {/* 新建分组 */}
        {creatingGroup ? (
          <div className="flex items-center gap-2 px-4 py-3 bg-white border-2 border-blue-300 rounded-2xl shadow-sm">
            <FolderPlus className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <input
              ref={newGroupInputRef}
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commitCreateGroup(); if (e.key === 'Escape') { setCreatingGroup(false); setNewGroupName(''); } }}
              placeholder="输入分组名称…"
              className="flex-1 text-sm text-gray-800 outline-none bg-transparent"
            />
            <button onClick={commitCreateGroup} className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg transition-colors">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={() => { setCreatingGroup(false); setNewGroupName(''); }} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCreatingGroup(true)}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-2xl text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/30 transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
            新建分组
          </button>
        )}
      </div>
    </div>
  );
}
