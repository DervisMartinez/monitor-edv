import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, StyleSheet, Platform } from 'react-native';
import { useMyMoto } from '@/presentation/context/MotoContext';
import { SetupScreen } from '@/presentation/screens/SetupScreen';
import { MainApp } from '@/presentation/screens/MainApp';
import { AuthScreen } from '@/presentation/screens/AuthScreen';
import { LandingScreen } from '@/presentation/screens/LandingScreen';
import { AdminDashboard } from '@/presentation/components/web/AdminDashboard';
import { supabase } from '@/data/supabaseClient';
import { Session } from '@supabase/supabase-js';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { handleRecoveryDeepLink, cleanUrlHash } from '@/services/authRecoveryService';
import { ForgotPasswordStep } from '@/presentation/components/ForgotPasswordModal';

import { CorporatePreloadScreen } from '@/presentation/components/CorporatePreloadScreen';
import { isWebPlatform } from '@/presentation/utils/platformMode';

const checkIsRecoveryInitial = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    const href = window.location.href || '';
    if (
      hash.includes('type=recovery') ||
      hash.includes('access_token') ||
      hash.includes('error=') ||
      search.includes('type=recovery') ||
      search.includes('code=') ||
      href.includes('reset-password')
    ) {
      return true;
    }
  }
  return false;
};

export default function HomeScreen() {
  const { myMoto, isLoaded, isAddingMoto, isAuthenticated } = useMyMoto();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const isLoggedIn = Boolean(session || isAuthenticated);

  // Detección síncrona inicial de modo recuperación para evitar parpadeos o redirección prematura al dashboard
  const initialRecovery = checkIsRecoveryInitial();
  const isRecoveryModeRef = useRef(initialRecovery);
  const [isRecoveryMode, setIsRecoveryMode] = useState(initialRecovery);
  const [recoveryStep, setRecoveryStep] = useState<ForgotPasswordStep>('reset');
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  // Mantenemos un mínimo de tiempo para que se aprecie la animación (opcional, 1.5s)
  const [minWaitDone, setMinWaitDone] = useState(false);

  // Estado de navegación inicial para la versión WEB: 'auth' | 'app'
  const [viewState, setViewState] = useState<'auth' | 'app'>('auth');

  const isWeb = isWebPlatform();

  useEffect(() => {
    if (isAuthenticated && !isRecoveryModeRef.current) {
      setViewState('app');
    } else if (!isAuthenticated && !isRecoveryModeRef.current) {
      setSession(null);
      setViewState('auth');
    }
  }, [isAuthenticated, isWeb]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
      if (session && !isRecoveryModeRef.current) {
        setViewState('app');
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'PASSWORD_RECOVERY') {
        isRecoveryModeRef.current = true;
        setIsRecoveryMode(true);
        setRecoveryStep('reset');
        setRecoveryError(null);
        setViewState('auth');
        return;
      }

      if (event === 'SIGNED_OUT' || !session) {
        setSession(null);
        if (!isRecoveryModeRef.current) {
          setViewState('auth');
        }
        return;
      }

      if (session) {
        if (!isRecoveryModeRef.current) {
          setViewState('app');
        }
      } else {
        if (!isRecoveryModeRef.current) {
          setViewState('auth');
        }
      }
    });

    const processIncomingUrl = (url: string) => {
      if (!url) return;
      handleRecoveryDeepLink(url).then((res) => {
        if (res.isRecovery) {
          isRecoveryModeRef.current = true;
          setIsRecoveryMode(true);
          setRecoveryStep('reset');
          setRecoveryError(null);
          setViewState('auth');
        } else if (res.error) {
          isRecoveryModeRef.current = true;
          setIsRecoveryMode(true);
          setRecoveryStep('request');
          setRecoveryError(res.error);
          setViewState('auth');
        }
      });
    };

    // En navegador web, procesar la URL activa (por si contiene tokens o error de enlace expirado)
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.location.hash || window.location.search) {
        processIncomingUrl(window.location.href);
      }
    }

    // Escucha de enlaces profundos (Deep Links) en Native / Web
    Linking.getInitialURL().then((url) => {
      if (url) {
        processIncomingUrl(url);
      }
    });

    const urlListener = Linking.addEventListener('url', ({ url }) => {
      processIncomingUrl(url);
    });

    setTimeout(() => {
      setMinWaitDone(true);
    }, 1500);

    return () => {
      authListener?.subscription.unsubscribe();
      urlListener.remove();
    };
  }, []);

  if (authLoading || !isLoaded || !minWaitDone) {
    return (
      <CorporatePreloadScreen 
        onFinish={() => setMinWaitDone(true)} 
        minDuration={2200}
      />
    );
  }

  // ==========================================
  // MOBILE APP FLOW (Port 8082 / Native iOS / Android):
  // 100% PURA APP MÓVIL SIN ADULTERACIONES NI LANDING WEB
  // ==========================================
  if (!isWeb) {
    if (isRecoveryMode) {
      return (
        <AuthScreen
          initialRecoveryMode={true}
          initialRecoveryStep={recoveryStep}
          initialRecoveryError={recoveryError}
          onRecoveryComplete={() => {
            isRecoveryModeRef.current = false;
            setIsRecoveryMode(false);
            setRecoveryError(null);
          }}
          onCloseRecovery={() => {
            isRecoveryModeRef.current = false;
            setIsRecoveryMode(false);
            setRecoveryError(null);
          }}
          onBack={() => {
            isRecoveryModeRef.current = false;
            setIsRecoveryMode(false);
            setRecoveryError(null);
          }}
        />
      );
    }
    if (!isLoggedIn) {
      return <AuthScreen />;
    }
    if (!myMoto || isAddingMoto) {
      return <SetupScreen />;
    }
    return <MainApp />;
  }

  // ==========================================
  // WEB PLATFORM FLOW (Port 8081 / Web domain):
  // Portada de entrada (Landing) -> Acceder -> App Web
  // ==========================================
  if (isRecoveryMode) {
    return (
      <AuthScreen
        initialRecoveryMode={true}
        initialRecoveryStep={recoveryStep}
        initialRecoveryError={recoveryError}
        onRecoveryComplete={() => {
          isRecoveryModeRef.current = false;
          setIsRecoveryMode(false);
          setRecoveryError(null);
          setViewState('app');
        }}
        onCloseRecovery={() => {
          isRecoveryModeRef.current = false;
          setIsRecoveryMode(false);
          setRecoveryError(null);
          setViewState('auth');
        }}
        onBack={() => {
          isRecoveryModeRef.current = false;
          setIsRecoveryMode(false);
          setRecoveryError(null);
          setViewState('auth');
        }}
      />
    );
  }

  // Si no ha iniciado sesión, mostrar directamente la pantalla de acceso corporativo
  if (!isLoggedIn || viewState === 'auth') {
    return <AuthScreen />;
  }

  // Panel Web Administrativo para Superusuario (Port 8081 / Dominio VPS en producción)
  return <AdminDashboard />;
}
