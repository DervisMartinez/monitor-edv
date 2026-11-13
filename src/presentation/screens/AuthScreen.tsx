import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  ActivityIndicator, 
  Image,
  ScrollView,
  useWindowDimensions 
} from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../data/supabaseClient';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useMyMoto } from '../context/MotoContext';
import { EDVPalette } from '../../constants/colors';
import { LegalDocModal, LegalDocType } from '../components/LegalDocModal';
import { ForgotPasswordModal, ForgotPasswordStep } from '../components/ForgotPasswordModal';
import { AppUser } from '../../domain/entities/Generator';

interface Props {
  onBack?: () => void;
  initialRecoveryMode?: boolean;
  initialRecoveryStep?: ForgotPasswordStep;
  initialRecoveryError?: string | null;
  onRecoveryComplete?: () => void;
  onCloseRecovery?: () => void;
}

export const AuthScreen: React.FC<Props> = ({
  onBack,
  initialRecoveryMode = false,
  initialRecoveryStep = 'request',
  initialRecoveryError = null,
  onRecoveryComplete,
  onCloseRecovery,
}) => {
  // Theme and responsive state
  const { colors, isDark } = useTheme();
  const { loginDirectly, appUsers } = useMyMoto();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 960;
  
  // Auth state (Inicio de sesión exclusivo para usuarios autorizados)
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Form Fields: Acceso corporativo
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Legal modal state
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [selectedLegalDoc, setSelectedLegalDoc] = useState<LegalDocType>('terms');

  // Supabase Auth Recovery State
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(initialRecoveryMode);
  const [forgotPasswordStep, setForgotPasswordStep] = useState<ForgotPasswordStep>(initialRecoveryStep);
  const [forgotPasswordError, setForgotPasswordError] = useState<string | null>(initialRecoveryError);

  React.useEffect(() => {
    if (initialRecoveryMode) {
      setForgotPasswordStep(initialRecoveryStep);
      setForgotPasswordError(initialRecoveryError);
      setShowForgotPasswordModal(true);
    }
  }, [initialRecoveryMode, initialRecoveryStep, initialRecoveryError]);

  const F = {
    bold: 'Montserrat_700Bold',
    semibold: 'Montserrat_600SemiBold',
    medium: 'Montserrat_500Medium',
    regular: 'Montserrat_400Regular',
    extrabold: 'Montserrat_800ExtraBold',
  };

  // Tokens oficiales según Empresas Del Valle Design System (PALETAEDV.jpg)
  const tokens = {
    primary: isDark ? '#38BDF8' : EDVPalette.corporateNavy,
    secondary: '#10B981',
    tertiary: '#059669',
    alert: '#EF4444',
    surface: isDark ? EDVPalette.darkNavy : EDVPalette.warmWhite,
    surfaceCard: isDark ? EDVPalette.deepPetrol : '#FFFFFF',
    surfaceContainer: isDark ? '#254454' : '#F0EFE6',
    surfaceHigh: isDark ? '#33576A' : '#CFCDBC',
    outline: isDark ? EDVPalette.steelTeal : EDVPalette.softSlate,
  };

  const handleAuth = async () => {
    setAuthError(null);
    if (!email.trim() || !password) {
      const msg = 'Correo y contraseña son requeridos.';
      setAuthError(msg);
      return;
    }

    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPass = password.trim();

      // 1. Intentar inicio de sesión nativo en Supabase GoTrue
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password: cleanPass });
        if (!error && data?.session) {
          return;
        }
      } catch {}

      // 2. Consulta directa a app_users en Supabase (operadores, técnicos y administradores)
      let matched: AppUser | null = null;
      try {
        const { data: dbUser } = await supabase
          .from('app_users')
          .select('*')
          .ilike('email', cleanEmail)
          .maybeSingle();

        if (dbUser) {
          matched = {
            id: dbUser.id,
            email: dbUser.email,
            fullName: dbUser.full_name,
            role: dbUser.role as any,
            assignedGeneratorId: dbUser.assigned_generator_id,
            assignedGeneratorName: dbUser.assigned_generator_name,
            companyId: dbUser.company_id,
            companyName: dbUser.company_name,
            departmentId: dbUser.department_id,
            departmentName: dbUser.department_name,
          };
        }
      } catch (dbErr) {
        console.warn('[AuthScreen] Consulta app_users:', dbErr);
      }

      if (!matched) {
        matched = appUsers.find(u => u.email.toLowerCase() === cleanEmail) || null;
      }

      // Si el usuario existe en el directorio corporativo de app_users, autenticar en sesión local
      if (matched) {
        await loginDirectly(
          matched.email,
          matched.fullName,
          matched.role,
          matched.assignedGeneratorId || undefined,
          matched.assignedGeneratorName || undefined
        );
        return;
      }

      throw new Error('Correo o contraseña incorrectos.');
    } catch (error: any) {
      let msg = error?.message || 'Error al iniciar sesión.';
      if (msg.includes('Invalid login credentials')) msg = 'Correo o contraseña incorrectos.';
      setAuthError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Fondo con degradado arquitectónico corporativo Empresas Del Valle
  const bgColors = isDark 
    ? (['#0a2558', '#001136', '#000b21'] as const)
    : (['#f9f9f9', '#f3f3f4', '#eeeeee'] as const);

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ flex: 1, backgroundColor: tokens.surface }}>
        <LinearGradient
          colors={bgColors}
          style={{ flex: 1 }}
        >
          <ScrollView 
            style={{ flex: 1, width: '100%' }}
            contentContainerStyle={isDesktop ? styles.desktopScrollContent : styles.scrollContent} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={isDesktop ? styles.desktopSplitLayout : { width: '100%', alignItems: 'center' }}>
              {isDesktop && (
                <View style={styles.desktopHeroColumn}>
                  <View style={styles.brandHeroBadge}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isDark ? '#bdd2fe' : tokens.primary }} />
                    <Text style={[styles.brandHeroBadgeText, { color: isDark ? '#bdd2fe' : tokens.primary }]}>RED CORPORATIVA</Text>
                  </View>
                  <Text style={[styles.desktopMainHeading, { color: isDark ? '#ffffff' : '#001136' }]}>
                    EMPRESAS DEL VALLE
                  </Text>
                  <Text style={[styles.desktopSubHeading, { color: isDark ? '#bdd2fe' : '#4b5f84' }]}>
                    EDV MONITOR • MONITOREO DE PLANTAS ELÉCTRICAS
                  </Text>
                  <Text style={[styles.desktopDesc, { color: colors.onSurfaceVariant }]}>
                    Construyendo el futuro hoy. Plataforma técnica corporativa para la supervisión y control de horómetros en tiempo real, registro automatizado de cortes eléctricos y programación predictiva de servicios técnicos.
                  </Text>

                  <View style={styles.heroFeatureList}>
                    <View
                      style={[
                        styles.heroFeatureRow,
                        {
                          backgroundColor: isDark ? 'rgba(26, 52, 65, 0.72)' : 'rgba(255, 255, 255, 0.88)',
                          borderColor: isDark ? 'rgba(64, 96, 110, 0.45)' : 'rgba(31, 46, 84, 0.12)',
                        },
                      ]}
                    >
                      <MaterialIcons name="speed" size={22} color={tokens.secondary} />
                      <Text style={[styles.heroFeatureText, { color: colors.onSurface }]}>
                        Telemetría y control de horómetros de plantas eléctricas
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.heroFeatureRow,
                        {
                          backgroundColor: isDark ? 'rgba(26, 52, 65, 0.72)' : 'rgba(255, 255, 255, 0.88)',
                          borderColor: isDark ? 'rgba(64, 96, 110, 0.45)' : 'rgba(31, 46, 84, 0.12)',
                        },
                      ]}
                    >
                      <MaterialCommunityIcons name="flash-alert" size={22} color="#F59E0B" />
                      <Text style={[styles.heroFeatureText, { color: colors.onSurface }]}>
                        Bitácora y alerta automatizada de cortes y reposición de red
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.heroFeatureRow,
                        {
                          backgroundColor: isDark ? 'rgba(26, 52, 65, 0.72)' : 'rgba(255, 255, 255, 0.88)',
                          borderColor: isDark ? 'rgba(64, 96, 110, 0.45)' : 'rgba(31, 46, 84, 0.12)',
                        },
                      ]}
                    >
                      <MaterialIcons name="verified-user" size={22} color={tokens.secondary} />
                      <Text style={[styles.heroFeatureText, { color: colors.onSurface }]}>
                        Conectividad cifrada TLS 1.3 con control de operadores
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              <View
                style={[
                  styles.cardContainer,
                  isDesktop && [
                    styles.desktopCardContainer,
                    {
                      backgroundColor: isDark ? 'rgba(14, 41, 56, 0.94)' : '#FFFFFF',
                      borderColor: isDark ? 'rgba(64, 96, 110, 0.45)' : 'rgba(31, 46, 84, 0.12)',
                    },
                  ],
                ]}
              >
              
              {/* BACK TO LANDING BUTTON */}
              {onBack && (
                <TouchableOpacity
                  onPress={onBack}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    alignSelf: 'flex-start',
                    marginBottom: 16,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                    backgroundColor: isDark ? 'rgba(189, 210, 254, 0.12)' : 'rgba(0, 17, 54, 0.08)',
                    borderWidth: 0.8,
                    borderColor: isDark ? 'rgba(189, 210, 254, 0.3)' : 'rgba(0, 17, 54, 0.2)',
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="arrow-back" size={16} color={isDark ? '#bdd2fe' : '#001136'} />
                  <Text style={{ fontFamily: F.bold, color: isDark ? '#bdd2fe' : '#001136', fontSize: 12 }}>
                    Volver a Portada
                  </Text>
                </TouchableOpacity>
              )}

              {/* BRAND HEADER & LOGO - EMPRESAS DEL VALLE */}
              <View style={{ alignItems: 'center', marginBottom: 22 }}>
                <View style={{ height: 85, justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
                  <Image 
                    source={isDark ? require('../../../assets/images/LOGO-EMPRESASDELVALLE.png') : require('../../../assets/images/EMPRESASDELVALLE-AZUL.png')}
                    style={{ width: 180, height: 75 }}
                    resizeMode="contain"
                  />
                </View>

                <Text style={{ fontSize: 13, fontFamily: F.bold, color: tokens.primary, letterSpacing: 1.8, textTransform: 'uppercase', marginTop: 2 }}>
                  EDV MONITOR
                </Text>
                <Text style={{ fontSize: 12, fontFamily: F.medium, color: colors.onSurfaceVariant, marginTop: 4, textAlign: 'center' }}>
                  Monitoreo de Plantas Eléctricas en la Nube
                </Text>
              </View>

              {/* ACCESO CORPORATIVO (SOLO INICIO DE SESIÓN) */}
              <View style={{ gap: 12, width: '100%' }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingBottom: 10,
                    marginBottom: 4,
                    borderBottomWidth: 1,
                    borderBottomColor: isDark ? 'rgba(180, 188, 200, 0.16)' : 'rgba(31, 46, 84, 0.1)',
                  }}
                >
                  <MaterialIcons name="lock-outline" size={16} color={tokens.primary} />
                  <Text style={{ fontFamily: F.bold, fontSize: 12, letterSpacing: 0.8, color: colors.onSurface, textTransform: 'uppercase' }}>
                    Iniciar Sesión Corporativa
                  </Text>
                </View>

                {authError && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderRadius: 10,
                      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.16)' : '#FEE2E2',
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(239, 68, 68, 0.4)' : '#FCA5A5',
                    }}
                  >
                    <MaterialIcons name="error-outline" size={18} color="#EF4444" />
                    <Text style={{ flex: 1, fontFamily: F.semibold, fontSize: 12, color: isDark ? '#FCA5A5' : '#991B1B' }}>
                      {authError}
                    </Text>
                  </View>
                )}

                <View>
                  <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant, fontFamily: F.semibold }]}>
                    CORREO ELECTRÓNICO
                  </Text>
                  <TextInput 
                    style={[styles.input, { backgroundColor: tokens.surfaceContainer, borderColor: tokens.outline, color: colors.onSurface, fontFamily: F.medium }]} 
                    placeholder="operador@empresa.com" 
                    placeholderTextColor={colors.onSurfaceVariant} 
                    value={email} 
                    onChangeText={(txt) => {
                      setEmail(txt);
                      if (authError) setAuthError(null);
                    }} 
                    autoCapitalize="none"
                    keyboardType="email-address"
                    returnKeyType="next"
                  />
                </View>

                <View>
                  <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant, fontFamily: F.semibold }]}>
                    CONTRASEÑA
                  </Text>

                  <View style={[styles.input, { flexDirection: 'row', alignItems: 'center', backgroundColor: tokens.surfaceContainer, borderColor: tokens.outline, paddingHorizontal: 14 }]}>
                    <TextInput 
                      style={{ flex: 1, height: 48, color: colors.onSurface, fontFamily: F.medium, fontSize: 14 }} 
                      placeholder="••••••••" 
                      placeholderTextColor={colors.onSurfaceVariant} 
                      value={password} 
                      onChangeText={(txt) => {
                        setPassword(txt);
                        if (authError) setAuthError(null);
                      }} 
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="go"
                      onSubmitEditing={handleAuth}
                    />
                    <TouchableOpacity 
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeTouch}
                    >
                      <MaterialIcons 
                        name={showPassword ? 'visibility-off' : 'visibility'} 
                        size={22} 
                        color={showPassword ? tokens.secondary : colors.onSurfaceVariant} 
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Botón Ingresar */}
                <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: tokens.primary, marginTop: 8 }]} 
                  onPress={handleAuth} 
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color={isDark ? '#001136' : '#FFFFFF'} />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.btnText, { color: isDark ? '#001136' : '#FFFFFF', fontFamily: F.extrabold }]}>
                        ACCEDER A LA PLATAFORMA
                      </Text>
                      <MaterialIcons name="arrow-forward" size={18} color={isDark ? '#001136' : '#FFFFFF'} />
                    </View>
                  )}
                </TouchableOpacity>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    marginTop: 6,
                    paddingVertical: 8,
                    paddingHorizontal: 10,
                    borderRadius: 10,
                    backgroundColor: isDark ? 'rgba(56, 189, 248, 0.08)' : 'rgba(31, 46, 84, 0.04)',
                  }}
                >
                  <MaterialIcons name="admin-panel-settings" size={14} color={colors.onSurfaceVariant} />
                  <Text style={{ fontSize: 11, fontFamily: F.medium, color: colors.onSurfaceVariant, textAlign: 'center' }}>
                    Acceso gestionado por Superadministrador
                  </Text>
                </View>

                {/* Enlaces Legales en Acceso */}
                <View style={{ marginTop: 8, alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 11, fontFamily: F.medium, color: colors.onSurfaceVariant, textAlign: 'center' }}>
                    Al acceder a la plataforma de Empresas Del Valle, aceptas el marco legal aplicable:
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity onPress={() => { setSelectedLegalDoc('terms'); setShowLegalModal(true); }}>
                      <Text style={{ fontSize: 11, fontFamily: F.bold, color: tokens.primary, textDecorationLine: 'underline' }}>
                        Términos
                      </Text>
                    </TouchableOpacity>
                    <Text style={{ fontSize: 11, color: colors.onSurfaceVariant }}>•</Text>
                    <TouchableOpacity onPress={() => { setSelectedLegalDoc('privacy'); setShowLegalModal(true); }}>
                      <Text style={{ fontSize: 11, fontFamily: F.bold, color: tokens.primary, textDecorationLine: 'underline' }}>
                        Privacidad
                      </Text>
                    </TouchableOpacity>
                    <Text style={{ fontSize: 11, color: colors.onSurfaceVariant }}>•</Text>
                    <TouchableOpacity onPress={() => { setSelectedLegalDoc('cookies'); setShowLegalModal(true); }}>
                      <Text style={{ fontSize: 11, fontFamily: F.bold, color: tokens.primary, textDecorationLine: 'underline' }}>
                        Cookies
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

            </View>
            </View>
          </ScrollView>
        </LinearGradient>
      </View>

      {/* MODAL VISOR DE DOCUMENTOS LEGALES (TÉRMINOS, PRIVACIDAD, COOKIES) */}
      <LegalDocModal
        visible={showLegalModal}
        initialDoc={selectedLegalDoc}
        onClose={() => setShowLegalModal(false)}
      />

      {/* MODAL DE RECUPERACIÓN DE CONTRASEÑA SUPABASE */}
      <ForgotPasswordModal
        visible={showForgotPasswordModal}
        initialEmail={email}
        initialStep={forgotPasswordStep}
        initialErrorMessage={forgotPasswordError}
        onClose={() => {
          setShowForgotPasswordModal(false);
          setForgotPasswordError(null);
          onCloseRecovery?.();
        }}
        onSuccess={() => {
          onRecoveryComplete?.();
        }}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  desktopScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
    paddingVertical: 48,
  },
  desktopSplitLayout: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 1100,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 48,
  },
  desktopHeroColumn: {
    flex: 1.2,
    maxWidth: 540,
    paddingRight: 20,
  },
  brandHeroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  brandHeroBadgeText: {
    color: '#bdd2fe',
    fontSize: 11,
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 2,
  },
  desktopMainHeading: {
    fontSize: 48,
    fontFamily: 'Montserrat_800ExtraBold',
    letterSpacing: -1,
    lineHeight: 52,
    marginBottom: 4,
  },
  desktopSubHeading: {
    fontSize: 12.5,
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  desktopDesc: {
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
    lineHeight: 22,
    marginBottom: 28,
  },
  heroFeatureList: {
    gap: 14,
  },
  heroFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(29, 32, 37, 0.55)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 0.8,
    borderColor: 'rgba(64, 72, 92, 0.35)',
  },
  heroFeatureText: {
    fontSize: 12.5,
    fontFamily: 'Montserrat_500Medium',
    flex: 1,
  },
  desktopCardContainer: {
    maxWidth: 440,
    backgroundColor: 'rgba(25, 28, 33, 0.85)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(64, 72, 92, 0.45)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 36,
    paddingBottom: 40,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 410,
    alignSelf: 'center',
  },
  fieldLabel: {
    fontSize: 10.5,
    letterSpacing: 0.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 14,
    width: '100%',
    justifyContent: 'center',
  },
  eyeTouch: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtn: {
    height: 52, // Mínimo 48px hit area
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  btnText: {
    fontSize: 13.5,
    letterSpacing: 0.8,
  },
});
