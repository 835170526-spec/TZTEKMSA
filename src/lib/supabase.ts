// 读取 .env.local 中的两个环境变量
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 如果没配置就报错提示
if (!supabaseUrl || !supabaseKey) { throw new Error(...) }

// 导出全局唯一的 supabase 实例
export const supabase = createClient(supabaseUrl, supabaseKey)
