import type { User, ContentItem } from '@/types';

// 模拟用户数据
export const mockUsers: User[] = [
  { id: '1', username: 'admin', password: 'admin123', role: 'admin' },
  { id: '2', username: 'editor', password: 'editor123', role: 'editor' },
];

// 分类列表
export const categories = ['技术文章', '产品动态', '运营活动', '公司新闻', '行业资讯', '用户故事'];

// 标签列表
export const tagOptions = ['前端', '后端', '设计', '产品', '运营', '营销', '数据', 'AI', '开源', '教程'];

// 模拟内容数据
export const generateMockData = (): ContentItem[] => {
  const statuses: ContentItem['status'][] = ['published', 'draft', 'archived'];
  const authors = ['张伟', '李娜', '王磊', '刘洋', '陈静', '赵明'];
  const titles = [
    '深入理解 React Hooks 最佳实践',
    '2026 前端技术趋势展望',
    '产品迭代新版本上线公告',
    '双十一大促活动方案',
    '公司荣获年度最佳雇主奖',
    'AI 驱动的智能客服解决方案',
    'TypeScript 5.0 新特性解析',
    '用户增长策略与案例分析',
    '微服务架构实战经验分享',
    '年度用户调研报告发布',
    'Node.js 性能优化实践',
    '敏捷开发团队管理指南',
    '大数据分析平台建设经验',
    '移动端适配最佳实践',
    '品牌重塑项目回顾',
    'GraphQL 与 REST API 对比',
    '新媒体运营方法论',
    'K8s 容器化部署实践',
    '设计系统建设之路',
    '客户成功案例：效率提升 300%',
    '前端工程化体系搭建',
    '产品冷启动经验总结',
    '云原生应用开发指南',
    '社区运营数据复盘',
    '全栈开发者成长路径',
    'Tailwind CSS 实战技巧',
    '季度产品路线图规划',
    '开源项目贡献指南',
    '数据可视化最佳实践',
    '敏捷转型三年回顾',
  ];

  return titles.map((title, i) => ({
    id: `${i + 1}`,
    title,
    category: categories[i % categories.length],
    status: statuses[i % 3],
    author: authors[i % authors.length],
    tags: [tagOptions[i % tagOptions.length], tagOptions[(i + 2) % tagOptions.length]],
    description: `这是关于"${title}"的详细描述内容，包含核心要点、背景信息和关键结论。`,
    viewCount: Math.floor(Math.random() * 10000) + 100,
    createdAt: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    updatedAt: new Date(Date.now() - i * 12 * 60 * 60 * 1000).toISOString().split('T')[0],
  }));
};
