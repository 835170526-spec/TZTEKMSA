import { Bell, Search } from 'lucide-react';

interface TopbarProps {
  title: string;
  username: string;
}

export default function Topbar({ title, username }: TopbarProps) {
  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center px-6 gap-4 sticky top-0 z-10">
      <div className="flex-1">
        <h2 className="text-base font-semibold text-gray-800">{title}</h2>
      </div>

      {/* Global search hint */}
      <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-400 cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors">
        <Search className="w-3.5 h-3.5" />
        <span>快速搜索...</span>
        <kbd className="ml-2 px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-xs">⌘K</kbd>
      </div>

      {/* Notifications */}
      <button className="relative p-2 hover:bg-gray-50 rounded-lg text-gray-500 transition-colors">
        <Bell className="w-5 h-5" />
        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
      </button>

      {/* Avatar */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
          {username[0]?.toUpperCase()}
        </div>
      </div>
    </header>
  );
}
