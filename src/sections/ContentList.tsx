import { useState, useMemo } from 'react';
import type { ContentItem } from '@/types';
import { categories } from '@/lib/data';
import {
  Search, Plus, Pencil, Trash2, Eye, Filter,
  ChevronLeft, ChevronRight, ChevronDown, X,
  ArrowUpDown, CheckCircle2, FileText, Archive
} from 'lucide-react';

interface ContentListProps {
  data: ContentItem[];
  onEdit: (item: ContentItem | null) => void;
  onDelete: (id: string) => void;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  published: { label: '已发布', icon: <CheckCircle2 className="w-3.5 h-3.5" />, cls: 'bg-green-100 text-green-700 border-green-200' },
  draft: { label: '草稿', icon: <FileText className="w-3.5 h-3.5" />, cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  archived: { label: '已归档', icon: <Archive className="w-3.5 h-3.5" />, cls: 'bg-gray-100 text-gray-600 border-gray-200' },
};

export default function ContentList({ data, onEdit, onDelete }: ContentListProps) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortField, setSortField] = useState<keyof ContentItem>('updatedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);

  const filtered = useMemo(() => {
    let list = [...data];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(d =>
        d.title.toLowerCase().includes(q) ||
        d.author.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        d.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    if (filterStatus !== 'all') list = list.filter(d => d.status === filterStatus);
    if (filterCategory !== 'all') list = list.filter(d => d.category === filterCategory);
    list.sort((a, b) => {
      const av = a[sortField] as string | number;
      const bv = b[sortField] as string | number;
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return list;
  }, [data, search, filterStatus, filterCategory, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (field: keyof ContentItem) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
    setPage(1);
  };

  const toggleSelect = (id: string) => {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const toggleAll = () => {
    if (selected.size === paged.length) setSelected(new Set());
    else setSelected(new Set(paged.map(d => d.id)));
  };

  const hasFilters = filterStatus !== 'all' || filterCategory !== 'all';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">内容管理</h1>
          <p className="text-gray-500 text-sm mt-1">共 {filtered.length} 条内容</p>
        </div>
        <button
          onClick={() => onEdit(null)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-sm shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" />
          新建内容
        </button>
      </div>

      {/* Search & Filter bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex gap-3 flex-wrap">
          {/* Search */}
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="搜索标题、作者、分类、标签..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition-colors ${
              hasFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            筛选
            {hasFilters && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilter ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Expanded filters */}
        {showFilter && (
          <div className="flex gap-3 flex-wrap pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">状态：</label>
              <select
                value={filterStatus}
                onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">全部</option>
                <option value="published">已发布</option>
                <option value="draft">草稿</option>
                <option value="archived">已归档</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">分类：</label>
              <select
                value={filterCategory}
                onChange={e => { setFilterCategory(e.target.value); setPage(1); }}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">全部</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {hasFilters && (
              <button
                onClick={() => { setFilterStatus('all'); setFilterCategory('all'); setPage(1); }}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" /> 清除筛选
              </button>
            )}
          </div>
        )}
      </div>

      {/* Batch actions */}
      {selected.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 flex items-center gap-3">
          <span className="text-sm text-blue-700 font-medium">已选 {selected.size} 项</span>
          <button
            onClick={() => { selected.forEach(id => onDelete(id)); setSelected(new Set()); }}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            批量删除
          </button>
          <button onClick={() => setSelected(new Set())} className="text-sm text-gray-500 hover:text-gray-700 ml-auto">取消</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={paged.length > 0 && selected.size === paged.length}
                    onChange={toggleAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th
                  className="px-4 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:text-gray-900 select-none"
                  onClick={() => toggleSort('title')}
                >
                  <span className="flex items-center gap-1">标题 <ArrowUpDown className="w-3.5 h-3.5" /></span>
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">分类</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">状态</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">标签</th>
                <th
                  className="px-4 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:text-gray-900 select-none"
                  onClick={() => toggleSort('viewCount')}
                >
                  <span className="flex items-center gap-1">浏览量 <ArrowUpDown className="w-3.5 h-3.5" /></span>
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">作者</th>
                <th
                  className="px-4 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:text-gray-900 select-none"
                  onClick={() => toggleSort('updatedAt')}
                >
                  <span className="flex items-center gap-1">更新时间 <ArrowUpDown className="w-3.5 h-3.5" /></span>
                </th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-gray-400">
                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>暂无内容</p>
                    {(search || hasFilters) && (
                      <button
                        onClick={() => { setSearch(''); setFilterStatus('all'); setFilterCategory('all'); }}
                        className="mt-2 text-blue-500 hover:underline text-sm"
                      >
                        清除搜索条件
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paged.map(item => {
                  const sc = STATUS_CONFIG[item.status];
                  return (
                    <tr key={item.id} className={`hover:bg-gray-50/80 transition-colors ${selected.has(item.id) ? 'bg-blue-50/50' : ''}`}>
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={selected.has(item.id)}
                          onChange={() => toggleSelect(item.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-gray-900 max-w-[220px] truncate" title={item.title}>{item.title}</div>
                        <div className="text-xs text-gray-400 mt-0.5 max-w-[220px] truncate">{item.description}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">{item.category}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border ${sc.cls}`}>
                          {sc.icon}{sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex gap-1 flex-wrap max-w-[120px]">
                          {item.tags.slice(0, 2).map(t => (
                            <span key={t} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{t}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 text-gray-700">
                          <Eye className="w-3.5 h-3.5 text-gray-400" />
                          {item.viewCount.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600">{item.author}</td>
                      <td className="px-4 py-3.5 text-gray-500 text-xs">{item.updatedAt}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => onEdit(item)}
                            className="p-1.5 hover:bg-blue-50 hover:text-blue-600 text-gray-400 rounded-lg transition-colors"
                            title="编辑"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {deleteConfirm === item.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => { onDelete(item.id); setDeleteConfirm(null); }}
                                className="px-2 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600"
                              >确认</button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200"
                              >取消</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(item.id)}
                              className="p-1.5 hover:bg-red-50 hover:text-red-500 text-gray-400 rounded-lg transition-colors"
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
            <span className="text-sm text-gray-500">
              第 {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} 条，共 {filtered.length} 条
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed text-gray-600 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let p: number;
                if (totalPages <= 7) p = i + 1;
                else if (page <= 4) p = i + 1;
                else if (page >= totalPages - 3) p = totalPages - 6 + i;
                else p = page - 3 + i;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      p === page ? 'bg-blue-600 text-white' : 'hover:bg-white text-gray-600'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed text-gray-600 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
