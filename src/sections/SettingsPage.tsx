import { Settings, Bell, Shield, Palette, Globe } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">系统设置</h1>
        <p className="text-gray-500 text-sm mt-1">管理系统配置和偏好设置</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Settings menu */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2">
          {[
            { icon: <Settings className="w-4 h-4" />, label: '基本设置', active: true },
            { icon: <Bell className="w-4 h-4" />, label: '通知设置', active: false },
            { icon: <Shield className="w-4 h-4" />, label: '安全设置', active: false },
            { icon: <Palette className="w-4 h-4" />, label: '外观设置', active: false },
            { icon: <Globe className="w-4 h-4" />, label: '语言与地区', active: false },
          ].map(item => (
            <button
              key={item.label}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                item.active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        {/* Right: Settings content */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-800 mb-5">基本信息</h3>
            <div className="space-y-4">
              {[
                { label: '系统名称', value: 'MSA 数据分析平台', type: 'text' },
                { label: '系统描述', value: 'MSA 测量系统分析与报告平台', type: 'text' },
                { label: '联系邮箱', value: 'admin@example.com', type: 'email' },
              ].map(field => (
                <div key={field.label}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{field.label}</label>
                  <input
                    type={field.type}
                    defaultValue={field.value}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              ))}
              <div className="pt-2">
                <button className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm">
                  保存设置
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-800 mb-5">通知偏好</h3>
            <div className="space-y-4">
              {[
                { label: '新内容通知', desc: '有新内容创建时发送通知', enabled: true },
                { label: '审核提醒', desc: '内容等待审核时发送提醒', enabled: true },
                { label: '系统公告', desc: '接收系统重要公告', enabled: false },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-700">{item.label}</div>
                    <div className="text-xs text-gray-400">{item.desc}</div>
                  </div>
                  <button
                    className={`relative w-11 h-6 rounded-full transition-colors ${item.enabled ? 'bg-blue-600' : 'bg-gray-200'}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${item.enabled ? 'translate-x-5' : 'translate-x-0'}`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
