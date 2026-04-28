import type { ContentItem } from '@/types';
import {
  FileText, Eye, TrendingUp, Star,
  BarChart2, ArrowUp, ArrowDown, Clock
} from 'lucide-react';

interface DashboardProps {
  data: ContentItem[];
}

// Simple sparkline bar
function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="flex items-end gap-0.5 h-8">
      {[0.4, 0.6, 0.5, 0.8, 0.7, 0.9, 1].map((f, i) => (
        <div
          key={i}
          className={`w-2 rounded-t ${color}`}
          style={{ height: `${Math.round(f * pct)}%`, opacity: 0.5 + i * 0.07 }}
        />
      ))}
    </div>
  );
}

export default function Dashboard({ data }: DashboardProps) {
  const published = data.filter(d => d.status === 'published').length;
  const draft = data.filter(d => d.status === 'draft').length;
  const archived = data.filter(d => d.status === 'archived').length;
  const totalViews = data.reduce((s, d) => s + d.viewCount, 0);

  // Category distribution
  const categoryCount: Record<string, number> = {};
  data.forEach(d => {
    categoryCount[d.category] = (categoryCount[d.category] || 0) + 1;
  });
  const categoryList = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]);
  const maxCat = categoryList[0]?.[1] || 1;

  // Top viewed
  const topViewed = [...data].sort((a, b) => b.viewCount - a.viewCount).slice(0, 5);

  // Recent activity
  const recent = [...data].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 6);

  const stats = [
    {
      label: '内容总数',
      value: data.length,
      icon: <FileText className="w-5 h-5" />,
      color: 'bg-blue-500/10 text-blue-500',
      trend: '+8%',
      up: true,
      barColor: 'bg-blue-500',
    },
    {
      label: '已发布',
      value: published,
      icon: <Star className="w-5 h-5" />,
      color: 'bg-green-500/10 text-green-500',
      trend: '+12%',
      up: true,
      barColor: 'bg-green-500',
    },
    {
      label: '总浏览量',
      value: totalViews.toLocaleString(),
      icon: <Eye className="w-5 h-5" />,
      color: 'bg-purple-500/10 text-purple-500',
      trend: '+23%',
      up: true,
      barColor: 'bg-purple-500',
    },
    {
      label: '草稿数量',
      value: draft,
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'bg-orange-500/10 text-orange-500',
      trend: '-3%',
      up: false,
      barColor: 'bg-orange-500',
    },
  ];

  const statusConfig: Record<string, { label: string; cls: string }> = {
    published: { label: '已发布', cls: 'bg-green-100 text-green-700' },
    draft: { label: '草稿', cls: 'bg-yellow-100 text-yellow-700' },
    archived: { label: '已归档', cls: 'bg-gray-100 text-gray-600' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">数据看板</h1>
        <p className="text-gray-500 text-sm mt-1">欢迎回来，这是您的内容概览</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2.5 rounded-xl ${s.color}`}>{s.icon}</div>
              <span className={`flex items-center gap-1 text-xs font-medium ${s.up ? 'text-green-600' : 'text-red-500'}`}>
                {s.up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                {s.trend}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
            <div className="mt-3">
              <MiniBar value={70} max={100} color={s.barColor} />
            </div>
          </div>
        ))}
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Category distribution */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-5">
            <BarChart2 className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-gray-800">分类分布</h3>
          </div>
          <div className="space-y-3">
            {categoryList.map(([cat, count]) => (
              <div key={cat}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{cat}</span>
                  <span className="font-medium text-gray-800">{count} 篇</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-700"
                    style={{ width: `${(count / maxCat) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status Pie (visual breakdown) */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-5">状态分布</h3>
          <div className="space-y-4">
            {[
              { label: '已发布', value: published, color: 'bg-green-500', pct: Math.round(published / data.length * 100) },
              { label: '草稿', value: draft, color: 'bg-yellow-400', pct: Math.round(draft / data.length * 100) },
              { label: '已归档', value: archived, color: 'bg-gray-400', pct: Math.round(archived / data.length * 100) },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${item.color}`} />
                <div className="flex-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.label}</span>
                    <span className="font-medium">{item.value}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full mt-1">
                    <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
                <span className="text-xs text-gray-400">{item.pct}%</span>
              </div>
            ))}
          </div>

          {/* Total circle */}
          <div className="mt-6 text-center pt-4 border-t border-gray-100">
            <div className="text-3xl font-bold text-gray-900">{data.length}</div>
            <div className="text-sm text-gray-500">内容总量</div>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top viewed */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-5">
            <Eye className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold text-gray-800">热门内容 Top 5</h3>
          </div>
          <div className="space-y-3">
            {topViewed.map((item, i) => (
              <div key={item.id} className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  i === 0 ? 'bg-yellow-400 text-yellow-900' :
                  i === 1 ? 'bg-gray-300 text-gray-700' :
                  i === 2 ? 'bg-orange-400 text-orange-900' : 'bg-gray-100 text-gray-500'
                }`}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{item.title}</div>
                  <div className="text-xs text-gray-400">{item.category}</div>
                </div>
                <div className="text-sm font-semibold text-gray-700">{item.viewCount.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-5">
            <Clock className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-gray-800">最近更新</h3>
          </div>
          <div className="space-y-3">
            {recent.map(item => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                  {item.author[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{item.title}</div>
                  <div className="text-xs text-gray-400">{item.author} · {item.updatedAt}</div>
                </div>
                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${statusConfig[item.status]?.cls}`}>
                  {statusConfig[item.status]?.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
