// 用户/管理员
export interface User {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'editor';
  avatar?: string;
}

// 内容条目
export interface ContentItem {
  id: string;
  title: string;
  category: string;
  status: 'published' | 'draft' | 'archived';
  author: string;
  tags: string[];
  description: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

// 统计数据
export interface StatsData {
  totalItems: number;
  publishedItems: number;
  draftItems: number;
  totalViews: number;
  monthlyGrowth: number;
  weeklyNew: number;
}
