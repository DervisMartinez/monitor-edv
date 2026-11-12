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
  ImageBackground, 
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
import { LegalConsentCheckboxes } from '../components/LegalConsentCheckboxes';
import { LegalDocModal, LegalDocType } from '../components/LegalDocModal';
import { ForgotPasswordModal, ForgotPasswordStep } from '../components/ForgotPasswordModal';
import { recordLegalConsent } from '../../services/legalConsentService';
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
  const { colors, mode, isDark } = useTheme();
  const { loginDirectly, appUsers } = useMyMoto();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 960;
  
  // Auth state
  const [isLogin, setIsLogin] = useState(true);
  const [registerStep, setRegisterStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);

  // Form Fields - Step 1: Acceso
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Form Fields - Step 2: Piloto
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // Form Fields - Step 3: Región
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');

  // Legal Consent State (Separate checkboxes & audit)
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [showLegalErrors, setShowLegalErrors] = useState(false);
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

  // Validaciones de navegación de pasos en Registro
  const handleNextStep = () => {
    if (registerStep === 1) {
      if (!email || !password) {
        alert('Ingresa correo y contraseña para continuar');
        return;
      }
      if (password.length < 6) {
        alert('La contraseña debe tener al menos 6 caracteres');
        return;
      }
      if (confirmPassword && password !== confirmPassword) {
        alert('Las contraseñas no coinciden');
        return;
      }
      setRegisterStep(2);
    } else if (registerStep === 2) {
      if (!firstName || !lastName) {
        alert('Ingresa tu nombre y apellido para tu cuenta');
        return;
      }
      setRegisterStep(3);
    }
  };

  const handlePrevStep = () => {
    if (registerStep > 1) {
      setRegisterStep((prev) => (prev - 1) as 1 | 2 | 3);
    }
  };

  const handleAuth = async () => {
    if (!email || !password) {
      alert('Correo y contraseña son requeridos');
      return;
    }

    if (!isLogin && (!firstName || !lastName || !country || !state)) {
      alert('Por favor completa los datos de tu perfil');
      return;
    }

    // Validación estricta de casillas separadas (RGPD / Accountability)
    if (!isLogin) {
      if (!termsAccepted || !privacyAccepted) {
        setShowLegalErrors(true);
        if (!termsAccepted && !privacyAccepted) {
          alert('Debes marcar por separado tanto la casilla de Términos y Condiciones como la de Política de Privacidad.');
        } else if (!termsAccepted) {
          alert('Debes aceptar los Términos y Condiciones para registrar tu cuenta.');
        } else {
          alert('Debes aceptar la Política de Privacidad para el tratamiento de tus datos.');
        }
        return;
      }
    }

    setLoading(true);
    try {
      if (isLogin) {
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
      } else {
        // 1. Registrar auditoría legal con timestamp, IP y dispositivo
        const consentRecord = await recordLegalConsent({
          email,
          termsAccepted: true,
          privacyAccepted: true,
          cookiesAcknowledged: true,
          acceptanceContext: 'auth_registration_step_3',
        });

        // 2. Crear cuenta en Supabase vinculando los datos de auditoría
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              country: country.trim(),
              state: state.trim(),
              // Metadatos de auditoría legal
              legal_terms_accepted: true,
              legal_terms_accepted_at: consentRecord.termsAcceptedAt,
              legal_terms_version: consentRecord.termsVersion,
              legal_privacy_accepted: true,
              legal_privacy_accepted_at: consentRecord.privacyAcceptedAt,
              legal_privacy_version: consentRecord.privacyVersion,
              legal_cookies_acknowledged: true,
              legal_consent_method: consentRecord.consentMethod,
              legal_consent_ip: consentRecord.ipAddress,
              legal_device_info: consentRecord.deviceInfo,
            }
          }
        });
        if (error) throw error;
        
        // Si ya tenemos el ID de usuario devuelto por Supabase, actualizar el registro
        if (data?.user?.id) {
          recordLegalConsent({
            email,
            userId: data.user.id,
            termsAccepted: true,
            privacyAccepted: true,
            cookiesAcknowledged: true,
            acceptanceContext: 'auth_registration_step_3',
          }).catch(() => {});
        }
        
        if (!data.session) {
          alert('¡Registro exitoso! Revisa tu bandeja de correo para confirmar tu cuenta.');
          setIsLogin(true);
          setRegisterStep(1);
        } else {
          alert('¡Bienvenido a tu Garaje!');
        }
      }
    } catch (error: any) {
      let msg = error.message;
      if (msg.includes('Invalid login credentials')) msg = 'Correo o contraseña incorrectos.';
      if (msg.includes('User already registered')) msg = 'Este correo ya se encuentra registrado.';
      if (msg.includes('Password should be at least')) msg = 'La contraseña debe tener al menos 6 caracteres.';
      alert(msg);
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
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#bdd2fe' }} />
                    <Text style={styles.brandHeroBadgeText}>RED CORPORATIVA</Text>
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
                    <View style={styles.heroFeatureRow}>
                      <MaterialIcons name="speed" size={22} color={tokens.secondary} />
                      <Text style={[styles.heroFeatureText, { color: colors.onSurface }]}>
                        Telemetría y control de horómetros de plantas eléctricas
                      </Text>
                    </View>
                    <View style={styles.heroFeatureRow}>
                      <MaterialCommunityIcons name="flash-alert" size={22} color="#F59E0B" />
                      <Text style={[styles.heroFeatureText, { color: colors.onSurface }]}>
                        Bitácora y alerta automatizada de cortes y reposición de red
                      </Text>
                    </View>
                    <View style={styles.heroFeatureRow}>
                      <MaterialIcons name="verified-user" size={22} color={tokens.secondary} />
                      <Text style={[styles.heroFeatureText, { color: colors.onSurface }]}>
                        Conectividad cifrada TLS 1.3 con control de operadores
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              <View style={[styles.cardContainer, isDesktop && styles.desktopCardContainer]}>
              
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
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                {/* Prestige Micro-Badge */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, opacity: 0.9 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tokens.primary }} />
                  <Text style={{ fontSize: 10, letterSpacing: 1.5, color: tokens.primary, fontFamily: F.bold, textTransform: 'uppercase' }}>
                    Red Corporativa
                  </Text>
                </View>

                {/* Logo Empresas del Valle adaptativo al tema */}
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
                  {isLogin ? 'Monitoreo de Plantas Eléctricas en la Nube' : 'Registro de Técnicos y Operadores'}
                </Text>
              </View>

              {/* SEGMENTED SWITCHER: INICIAR SESIÓN / REGISTRARSE */}
              <View style={[styles.segmentedBar, { backgroundColor: tokens.surfaceContainer, borderColor: tokens.outline }]}>
                <TouchableOpacity
                  onPress={() => {
                    setIsLogin(true);
                    setRegisterStep(1);
                  }}
                  activeOpacity={0.8}
                  style={[
                    styles.segmentButton,
                    isLogin && [styles.segmentActive, { backgroundColor: tokens.primary }]
                  ]}
                >
                  <Text style={[
                    styles.segmentText,
                    { fontFamily: F.bold, color: isLogin ? (isDark ? '#092332' : '#FFFFFF') : colors.onSurfaceVariant }
                  ]}>
                    INICIAR SESIÓN
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setIsLogin(false)}
                  activeOpacity={0.8}
                  style={[
                    styles.segmentButton,
                    !isLogin && [styles.segmentActive, { backgroundColor: tokens.primary }]
                  ]}
                >
                  <Text style={[
                    styles.segmentText,
                    { fontFamily: F.bold, color: !isLogin ? (isDark ? '#092332' : '#FFFFFF') : colors.onSurfaceVariant }
                  ]}>
                    REGISTRARSE
                  </Text>
                </TouchableOpacity>
              </View>

              {/* VISTA 1: INICIAR SESIÓN */}
              {isLogin ? (
                <View style={{ gap: 12, width: '100%' }}>
                  <View>
                    <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant, fontFamily: F.semibold }]}>
                      CORREO ELECTRÓNICO
                    </Text>
                    <TextInput 
                      style={[styles.input, { backgroundColor: tokens.surfaceContainer, borderColor: tokens.outline, color: colors.onSurface, fontFamily: F.medium }]} 
                      placeholder="operador@empresa.com" 
                      placeholderTextColor={colors.onSurfaceVariant} 
                      value={email} 
                      onChangeText={setEmail} 
                      autoCapitalize="none"
                      keyboardType="email-address"
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
                        onChangeText={setPassword} 
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
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

                  {/* Enlaces Legales en Acceso */}
                  <View style={{ marginTop: 14, alignItems: 'center', gap: 4 }}>
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
              ) : (
                
                /* VISTA 2: REGISTRO PROGRESIVO POR PESTAÑAS (Awsmd Fluid Design) */
                <View style={{ width: '100%' }}>
                  
                  {/* BARRA DE PESTAÑAS / PASOS (Step Indicator) */}
                  <View style={styles.stepTabsRow}>
                    
                    {/* Paso 1: Acceso */}
                    <TouchableOpacity 
                      onPress={() => setRegisterStep(1)}
                      style={[
                        styles.stepTabItem, 
                        registerStep === 1 && [styles.stepTabActive, { borderColor: tokens.primary }]
                      ]}
                    >
                      <View style={[
                        styles.stepCircle, 
                        { backgroundColor: registerStep >= 1 ? tokens.primary : tokens.surfaceContainer }
                      ]}>
                        <Text style={{ fontFamily: F.extrabold, fontSize: 11, color: registerStep >= 1 ? '#FFFFFF' : colors.onSurfaceVariant }}>
                          1
                        </Text>
                      </View>
                      <Text style={[
                        styles.stepTabText, 
                        { fontFamily: F.bold, color: registerStep === 1 ? colors.onSurface : colors.onSurfaceVariant }
                      ]}>
                        Acceso
                      </Text>
                    </TouchableOpacity>

                    <View style={[styles.stepConnector, { backgroundColor: registerStep > 1 ? tokens.primary : tokens.outline }]} />

                    {/* Paso 2: Operador */}
                    <TouchableOpacity 
                      onPress={() => {
                        if (email && password.length >= 6) setRegisterStep(2);
                      }}
                      style={[
                        styles.stepTabItem, 
                        registerStep === 2 && [styles.stepTabActive, { borderColor: tokens.primary }]
                      ]}
                    >
                      <View style={[
                        styles.stepCircle, 
                        { backgroundColor: registerStep >= 2 ? tokens.primary : tokens.surfaceContainer }
                      ]}>
                        <Text style={{ fontFamily: F.extrabold, fontSize: 11, color: registerStep >= 2 ? '#FFFFFF' : colors.onSurfaceVariant }}>
                          2
                        </Text>
                      </View>
                      <Text style={[
                        styles.stepTabText, 
                        { fontFamily: F.bold, color: registerStep === 2 ? colors.onSurface : colors.onSurfaceVariant }
                      ]}>
                        Operador
                      </Text>
                    </TouchableOpacity>

                    <View style={[styles.stepConnector, { backgroundColor: registerStep > 2 ? tokens.primary : tokens.outline }]} />

                    {/* Paso 3: Región */}
                    <TouchableOpacity 
                      onPress={() => {
                        if (email && password.length >= 6 && firstName && lastName) setRegisterStep(3);
                      }}
                      style={[
                        styles.stepTabItem, 
                        registerStep === 3 && [styles.stepTabActive, { borderColor: tokens.primary }]
                      ]}
                    >
                      <View style={[
                        styles.stepCircle, 
                        { backgroundColor: registerStep >= 3 ? tokens.primary : tokens.surfaceContainer }
                      ]}>
                        <Text style={{ fontFamily: F.extrabold, fontSize: 11, color: registerStep >= 3 ? '#FFFFFF' : colors.onSurfaceVariant }}>
                          3
                        </Text>
                      </View>
                      <Text style={[
                        styles.stepTabText, 
                        { fontFamily: F.bold, color: registerStep === 3 ? colors.onSurface : colors.onSurfaceVariant }
                      ]}>
                        Región
                      </Text>
                    </TouchableOpacity>

                  </View>

                  {/* CONTENEDOR FLUIDO DEL PASO ACTUAL */}
                  <View style={[styles.fluidCardStep, { backgroundColor: tokens.surfaceCard, borderColor: tokens.outline }]}>
                    
                    {/* PASO 1: ACCESO & CREDENCIALES */}
                    {registerStep === 1 && (
                      <View style={{ gap: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <MaterialIcons name="security" size={18} color={tokens.secondary} />
                          <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 13, textTransform: 'uppercase' }}>
                            Paso 1: Seguridad & Credenciales
                          </Text>
                        </View>

                        <View>
                          <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant, fontFamily: F.semibold }]}>
                            CORREO ELECTRÓNICO
                          </Text>
                          <TextInput 
                            style={[styles.input, { backgroundColor: tokens.surfaceContainer, borderColor: tokens.outline, color: colors.onSurface, fontFamily: F.medium }]} 
                            placeholder="operador@empresa.com" 
                            placeholderTextColor={colors.onSurfaceVariant} 
                            value={email} 
                            onChangeText={setEmail} 
                            autoCapitalize="none"
                            keyboardType="email-address"
                          />
                        </View>

                        <View>
                          <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant, fontFamily: F.semibold }]}>
                            CONTRASEÑA (MÍN. 6 CARACTERES)
                          </Text>
                          <TextInput 
                            style={[styles.input, { backgroundColor: tokens.surfaceContainer, borderColor: tokens.outline, color: colors.onSurface, fontFamily: F.medium }]} 
                            placeholder="••••••••" 
                            placeholderTextColor={colors.onSurfaceVariant} 
                            value={password} 
                            onChangeText={setPassword} 
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                          />
                        </View>

                        <View>
                          <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant, fontFamily: F.semibold }]}>
                            CONFIRMAR CONTRASEÑA
                          </Text>
                          <TextInput 
                            style={[styles.input, { backgroundColor: tokens.surfaceContainer, borderColor: tokens.outline, color: colors.onSurface, fontFamily: F.medium }]} 
                            placeholder="••••••••" 
                            placeholderTextColor={colors.onSurfaceVariant} 
                            value={confirmPassword} 
                            onChangeText={setConfirmPassword} 
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                          />
                        </View>

                        <TouchableOpacity 
                          style={[styles.actionBtn, { backgroundColor: tokens.primary, marginTop: 8 }]} 
                          onPress={handleNextStep}
                          activeOpacity={0.85}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={[styles.btnText, { color: isDark ? '#001136' : '#FFFFFF', fontFamily: F.extrabold }]}>
                              CONTINUAR A DATOS DEL OPERADOR
                            </Text>
                            <MaterialIcons name="chevron-right" size={20} color={isDark ? '#001136' : '#FFFFFF'} />
                          </View>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* PASO 2: DATOS DEL OPERADOR */}
                    {registerStep === 2 && (
                      <View style={{ gap: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <MaterialIcons name="person" size={18} color={tokens.secondary} />
                          <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 13, textTransform: 'uppercase' }}>
                            Paso 2: Carnet & Datos del Operador
                          </Text>
                        </View>

                        <View>
                          <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant, fontFamily: F.semibold }]}>
                            NOMBRE(S)
                          </Text>
                          <TextInput 
                            style={[styles.input, { backgroundColor: tokens.surfaceContainer, borderColor: tokens.outline, color: colors.onSurface, fontFamily: F.medium }]} 
                            placeholder="Ej. Dervis" 
                            placeholderTextColor={colors.onSurfaceVariant} 
                            value={firstName} 
                            onChangeText={setFirstName} 
                          />
                        </View>

                        <View>
                          <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant, fontFamily: F.semibold }]}>
                            APELLIDO(S)
                          </Text>
                          <TextInput 
                            style={[styles.input, { backgroundColor: tokens.surfaceContainer, borderColor: tokens.outline, color: colors.onSurface, fontFamily: F.medium }]} 
                            placeholder="Ej. Martinez" 
                            placeholderTextColor={colors.onSurfaceVariant} 
                            value={lastName} 
                            onChangeText={setLastName} 
                          />
                        </View>

                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                          <TouchableOpacity 
                            style={[styles.secondaryActionBtn, { borderColor: tokens.outline, backgroundColor: tokens.surfaceContainer }]} 
                            onPress={handlePrevStep}
                            activeOpacity={0.8}
                          >
                            <MaterialIcons name="chevron-left" size={20} color={colors.onSurface} />
                            <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 13 }}>
                              ATRÁS
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity 
                            style={[styles.actionBtn, { flex: 1, backgroundColor: tokens.primary }]} 
                            onPress={handleNextStep}
                            activeOpacity={0.85}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={[styles.btnText, { color: '#FFFFFF', fontFamily: F.extrabold }]}>
                                SIGUIENTE
                              </Text>
                              <MaterialIcons name="chevron-right" size={20} color="#FFFFFF" />
                            </View>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {/* PASO 3: REGIÓN & UBICACIÓN */}
                    {registerStep === 3 && (
                      <View style={{ gap: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <MaterialIcons name="place" size={18} color={tokens.secondary} />
                          <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 13, textTransform: 'uppercase' }}>
                            Paso 3: Región & Ubicación
                          </Text>
                        </View>

                        <View>
                          <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant, fontFamily: F.semibold }]}>
                            PAÍS
                          </Text>
                          <TextInput 
                            style={[styles.input, { backgroundColor: tokens.surfaceContainer, borderColor: tokens.outline, color: colors.onSurface, fontFamily: F.medium }]} 
                            placeholder="Ej. Venezuela / Colombia / España" 
                            placeholderTextColor={colors.onSurfaceVariant} 
                            value={country} 
                            onChangeText={setCountry} 
                          />
                        </View>

                        <View>
                          <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant, fontFamily: F.semibold }]}>
                            ESTADO / PROVINCIA / CIUDAD
                          </Text>
                          <TextInput 
                            style={[styles.input, { backgroundColor: tokens.surfaceContainer, borderColor: tokens.outline, color: colors.onSurface, fontFamily: F.medium }]} 
                            placeholder="Ej. Carabobo, Valencia" 
                            placeholderTextColor={colors.onSurfaceVariant} 
                            value={state} 
                            onChangeText={setState} 
                          />
                        </View>

                        {/* CASILLAS SEPARADAS OBLIGATORIAS: TÉRMINOS Y POLÍTICA DE PRIVACIDAD */}
                        <LegalConsentCheckboxes
                          termsAccepted={termsAccepted}
                          onToggleTerms={() => {
                            setTermsAccepted((prev) => !prev);
                            if (!termsAccepted) setShowLegalErrors(false);
                          }}
                          privacyAccepted={privacyAccepted}
                          onTogglePrivacy={() => {
                            setPrivacyAccepted((prev) => !prev);
                            if (!privacyAccepted) setShowLegalErrors(false);
                          }}
                          onOpenDoc={(doc) => {
                            setSelectedLegalDoc(doc);
                            setShowLegalModal(true);
                          }}
                          showValidationErrors={showLegalErrors}
                          disabled={loading}
                        />

                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                          <TouchableOpacity 
                            style={[styles.secondaryActionBtn, { borderColor: tokens.outline, backgroundColor: tokens.surfaceContainer }]} 
                            onPress={handlePrevStep}
                            activeOpacity={0.8}
                          >
                            <MaterialIcons name="chevron-left" size={20} color={colors.onSurface} />
                            <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 13 }}>
                              ATRÁS
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity 
                            style={[styles.actionBtn, { flex: 1, backgroundColor: tokens.tertiary }]} 
                            onPress={handleAuth}
                            disabled={loading}
                            activeOpacity={0.85}
                          >
                            {loading ? (
                              <ActivityIndicator color="#FFFFFF" />
                            ) : (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <MaterialIcons name="check-circle" size={18} color="#FFFFFF" />
                                <Text style={[styles.btnText, { color: '#FFFFFF', fontFamily: F.extrabold }]}>
                                  CREAR CUENTA
                                </Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                  </View>
                </View>
              )}

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
        onAccept={(docType) => {
          if (docType === 'terms') {
            setTermsAccepted(true);
          } else if (docType === 'privacy') {
            setPrivacyAccepted(true);
          }
        }}
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
          setIsLogin(true);
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
  logoBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  segmentedBar: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    borderWidth: 0.8,
    marginBottom: 20,
  },
  segmentButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentText: {
    fontSize: 12,
    letterSpacing: 0.5,
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
  secondaryActionBtn: {
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  btnText: {
    fontSize: 13.5,
    letterSpacing: 0.8,
  },
  stepTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  stepTabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  stepTabActive: {
    backgroundColor: 'rgba(65, 105, 225, 0.12)',
  },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepTabText: {
    fontSize: 12,
  },
  stepConnector: {
    flex: 1,
    height: 2,
    marginHorizontal: 4,
    borderRadius: 1,
  },
  fluidCardStep: {
    borderRadius: 20,
    borderWidth: 0.8,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  forgotPasswordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 227, 253, 0.08)',
    borderWidth: 0.8,
    borderColor: 'rgba(0, 227, 253, 0.35)',
    cursor: Platform.OS === 'web' ? ('pointer' as any) : undefined,
  },
  forgotPasswordText: {
    fontSize: 12,
    letterSpacing: 0.3,
  },
});
