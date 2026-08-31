import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

function readEnv(name: string): string | undefined {
  const env = import.meta.env as Record<string, unknown>
  const value = env[name]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export function supabaseConfig(): { url: string; anonKey: string } | null {
  const url = readEnv('VITE_SUPABASE_URL')
  const anonKey = readEnv('VITE_SUPABASE_ANON_KEY')
  return url !== undefined && anonKey !== undefined ? { url, anonKey } : null
}

// 两个 env 同时存在才启用云端模式（§6）
export function isSupabaseConfigured(): boolean {
  return supabaseConfig() !== null
}

let client: SupabaseClient | null = null

// 单例：storage adapter 与 hooks/useAuth 共用同一客户端（会话自动持久化与刷新）
export function getSupabaseClient(): SupabaseClient {
  const config = supabaseConfig()
  if (config === null) {
    throw new Error('supabase is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)')
  }
  client ??= createClient(config.url, config.anonKey)
  return client
}
