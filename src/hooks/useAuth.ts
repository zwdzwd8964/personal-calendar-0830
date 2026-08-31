import { create } from 'zustand'
import { getSupabaseClient, isSupabaseConfigured } from '@/storage/supabaseClient'

// disabled = 无 env（本地 localStorage 模式，登录门直接透传）
export type AuthStatus = 'disabled' | 'loading' | 'signedOut' | 'signedIn'

export interface AuthState {
  status: AuthStatus
  init(): void
  signIn(email: string, password: string): Promise<boolean>
  signOut(): Promise<void>
}

let initialized = false

export const useAuth = create<AuthState>()((set, get) => ({
  status: isSupabaseConfigured() ? 'loading' : 'disabled',

  init() {
    if (initialized || get().status === 'disabled') return
    initialized = true
    const client = getSupabaseClient()
    void client.auth.getSession().then(({ data }) => {
      set({ status: data.session ? 'signedIn' : 'signedOut' })
    })
    client.auth.onAuthStateChange((_event, session) => {
      set({ status: session ? 'signedIn' : 'signedOut' })
    })
  },

  async signIn(email, password) {
    const { error } = await getSupabaseClient().auth.signInWithPassword({ email, password })
    return error === null
  },

  async signOut() {
    await getSupabaseClient().auth.signOut()
  },
}))
