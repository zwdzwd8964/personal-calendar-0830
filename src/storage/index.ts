import type { StorageAdapter } from './adapter'
import { LocalStorageAdapter } from './local'
import { SupabaseAdapter } from './supabase'
import { isSupabaseConfigured } from './supabaseClient'

export type { StorageAdapter } from './adapter'
export { LocalStorageAdapter, STORAGE_KEY } from './local'

// 切换点（§6）：两个 VITE_SUPABASE_* env 同时存在走云端，否则 localStorage。
// hooks 及以上代码零改动——这是 §2 铁律的试金石。
function createAdapter(): StorageAdapter {
  if (isSupabaseConfigured()) {
    return new SupabaseAdapter()
  }
  const local = new LocalStorageAdapter()
  // 页面关闭/刷新时落盘 300ms 防抖窗口内的挂起写入（localStorage 模式特有）
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', () => local.flush())
  }
  return local
}

export const storage: StorageAdapter = createAdapter()
