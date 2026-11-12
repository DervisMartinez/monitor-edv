import 'react-native-url-polyfill/auto';

// Node.js SSR / Build-time WebSocket guard (previene errores en Node < 22 durante expo export)
class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  readonly readyState = 3;
  addEventListener() {}
  removeEventListener() {}
  send() {}
  close() {}
}

if (typeof window === 'undefined') {
  const g = typeof globalThis !== 'undefined' ? (globalThis as any) : {};
  if (!g.WebSocket) {
    g.WebSocket = MockWebSocket;
  }
}

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Platform } from 'react-native';
import { ENV } from '../constants/config';

const SUPABASE_URL = ENV.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = ENV.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Limpiar sesiones obsoletas de otros proyectos en localStorage de web para evitar 401
if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
  try {
    const projectRef = SUPABASE_URL ? SUPABASE_URL.split('//')[1]?.split('.')[0] : '';
    Object.keys(window.localStorage).forEach(key => {
      if (key.startsWith('sb-') && projectRef && !key.includes(projectRef)) {
        window.localStorage.removeItem(key);
      }
    });
  } catch {}
}

if (__DEV__) {
  console.log(`[Supabase] Conectado a: ${SUPABASE_URL} | Key prefijo: ${SUPABASE_ANON_KEY.substring(0, 20)}...`);
}

const safeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      return null;
    }
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      return;
    }
    try {
      await AsyncStorage.setItem(key, value);
    } catch {}
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      return;
    }
    try {
      await AsyncStorage.removeItem(key);
    } catch {}
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: safeStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
  ...(typeof window === 'undefined'
    ? {
        realtime: {
          transport: MockWebSocket as any,
        },
      }
    : {}),
});
