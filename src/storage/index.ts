import type { StorageAdapter } from './adapter'
import { LocalStorageAdapter } from './local'

export type { StorageAdapter } from './adapter'
export { LocalStorageAdapter, STORAGE_KEY } from './local'

// 切换点：P1 换成 SupabaseAdapter 实例，hooks 及以上代码零改动
const adapter = new LocalStorageAdapter()

// 页面关闭/刷新时落盘 300ms 防抖窗口内的挂起写入
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => adapter.flush())
}

export const storage: StorageAdapter = adapter
