import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  Image, 
  Animated, 
  Easing, 
  StyleSheet, 
  useWindowDimensions, 
  Platform 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  onFinish?: () => void;
  minDuration?: number;
}

const STEPS = [
  { pct: 28, status: 'Verificando credenciales' },
  { pct: 54, status: 'Cargando portafolio' },
  { pct: 79, status: 'Sincronizando activos' },
  { pct: 100, status: 'Bienvenido' }
];

export const CorporatePreloadScreen: React.FC<Props> = ({ onFinish, minDuration = 2400 }) => {
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(1)).current;
  const auraOpacity = useRef(new Animated.Value(0.6)).current;

  const F = {
    extrabold: 'Montserrat_800ExtraBold',
    bold: 'Montserrat_700Bold',
    semibold: 'Montserrat_600SemiBold',
    medium: 'Montserrat_500Medium',
    regular: 'Montserrat_400Regular',
  };

  useEffect(() => {
    // 1. Continuous pulse for the header prestige badge dot
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 2. Breathing glass aura around logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(auraOpacity, {
          toValue: 0.95,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(auraOpacity, {
          toValue: 0.45,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 3. Step progression
    const stepDuration = Math.max(450, Math.floor(minDuration / STEPS.length));
    let step = 0;

    const interval = setInterval(() => {
      step++;
      if (step < STEPS.length) {
        setCurrentStepIndex(step);
        Animated.timing(progressAnim, {
          toValue: STEPS[step].pct,
          duration: stepDuration * 0.8,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
      } else {
        clearInterval(interval);
        // Final pop on logo
        Animated.sequence([
          Animated.timing(logoScale, {
            toValue: 1.06,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(logoScale, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (onFinish) {
            setTimeout(onFinish, 300);
          }
        });
      }
    }, stepDuration);

    // Initial step trigger
    Animated.timing(progressAnim, {
      toValue: STEPS[0].pct,
      duration: stepDuration * 0.7,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    return () => clearInterval(interval);
  }, []);

  const currentStep = STEPS[currentStepIndex] || STEPS[0];
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.root}>
      {/* 1. Ambient Architectural Gradient Background */}
      <LinearGradient
        colors={['#0a2558', '#001136', '#000b21']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* 2. Soft Ambient Light Burst (Blue/Indigo Glow Sphere) */}
      <View 
        style={[
          styles.ambientLightBurst, 
          { 
            left: windowWidth / 2 - 160, 
            top: windowHeight * 0.22 - 160 
          }
        ]} 
        pointerEvents="none" 
      />

      {/* 3. Subtle Architectural Grid Lines Overlay */}
      <View style={styles.gridOverlay} pointerEvents="none">
        <View style={styles.gridHorizontal} />
        <View style={[styles.gridHorizontal, { top: '35%' }]} />
        <View style={[styles.gridHorizontal, { top: '65%' }]} />
        <View style={styles.gridVertical} />
        <View style={[styles.gridVertical, { left: '75%' }]} />
      </View>

      {/* 4. Safe Area Content Container */}
      <View 
        style={[
          styles.contentWrapper, 
          { 
            paddingTop: Math.max(insets.top + 16, 28),
            paddingBottom: Math.max(insets.bottom + 16, 24),
          }
        ]}
      >
        {/* HEADER: Prestige Micro-Badge */}
        <View style={styles.headerRow}>
          <View style={styles.prestigePill}>
            <Animated.View 
              style={[
                styles.pulseDot, 
                { transform: [{ scale: pulseAnim }] }
              ]} 
            />
            <Text style={[styles.prestigeText, { fontFamily: F.bold }]}>
              RED CORPORATIVA
            </Text>
          </View>
        </View>

        {/* MAIN HERO CONTENT */}
        <View style={styles.heroCenter}>
          
          {/* Logo Container with Glass Aura Frame */}
          <View style={styles.logoWrapper}>
            {/* Ambient Aura */}
            <Animated.View 
              style={[
                styles.logoAura, 
                { opacity: auraOpacity }
              ]} 
            />

            {/* Crisp Circular Card Frame */}
            <Animated.View 
              style={[
                styles.logoCard, 
                { transform: [{ scale: logoScale }] }
              ]}
            >
              <Image 
                source={require('../../../assets/images/LOGO-EMPRESASDELVALLE.png')} 
                style={styles.logoImage}
                resizeMode="contain"
                defaultSource={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDsJbRmwR3WCDO1N3Ruw_p2zJYxzdC3NKAf5MMXTEKivTOeVMmITCZMJxSHdwva9WCb-fbDGLlQZS74p50uYyCAGoenUwVYX461p3RkJfqPTgt7wdXIdj7yuKFAgxhPz4nc-GO8LYj8ZvNeIkukwYqjgCgdSMPB3Ro9sItD8a1v9pYYtukul3t66GXeIeCT-bPLgztNlo2RG-61nEgMgeSdf8u1DoMVkVP35qGqsddo' }}
              />
              <View style={styles.haloRing} pointerEvents="none" />
            </Animated.View>
          </View>

          {/* Title & Corporate Typographic Hierarchy */}
          <View style={styles.typographyGroup}>
            <Text style={[styles.mainTitle, { fontFamily: F.extrabold }]}>
              EMPRESAS
            </Text>
            <Text style={[styles.subTitle, { fontFamily: F.bold }]}>
              DEL VALLE
            </Text>
          </View>

          {/* Corporate Slogan Pill */}
          <View style={styles.sloganPill}>
            <Text style={[styles.sloganText, { fontFamily: F.medium }]}>
              Construyendo el futuro hoy
            </Text>
          </View>

          {/* Minimalist Elegant Progress Indicator */}
          <View style={styles.progressContainer}>
            {/* Track & Dynamic Progress Bar */}
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressBarFill, { width: progressWidth }]}>
                <LinearGradient
                  colors={['#bdd2fe', '#ffffff', '#d7e2ff']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
            </View>

            {/* Dynamic Status Micro-text */}
            <View style={styles.statusRow}>
              <Text style={[styles.statusText, { fontFamily: F.semibold }]}>
                {currentStep.status}
              </Text>
              <Text style={[styles.percentageText, { fontFamily: F.bold }]}>
                {currentStep.pct}%
              </Text>
            </View>
          </View>

        </View>

        {/* BOTTOM: Verification & Security Seal */}
        <View style={styles.footerSeal}>
          <View style={styles.securityPill}>
            <MaterialIcons name="verified-user" size={15} color="#d7e2ff" />
            <Text style={[styles.securityLabel, { fontFamily: F.semibold }]}>
              Plataforma Corporativa Segura
            </Text>
            <Text style={styles.dotDivider}>•</Text>
            <Text style={styles.versionTag}>v2.4</Text>
          </View>

          <Text style={[styles.legalDiscretion, { fontFamily: F.medium }]}>
            CONECTIVIDAD CIFRADA TLS 1.3
          </Text>
        </View>

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000b21',
  },
  contentWrapper: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 10,
  },
  ambientLightBurst: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(75, 95, 132, 0.22)',
    ...Platform.select({
      web: {
        filter: 'blur(70px)',
      },
      default: {
        opacity: 0.6,
      },
    }),
  },
  gridOverlay: {
    ...StyleSheet.absoluteFill,
    opacity: 0.04,
  },
  gridHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '20%',
    height: 1,
    backgroundColor: '#ffffff',
  },
  gridVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '25%',
    width: 1,
    backgroundColor: '#ffffff',
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    opacity: 0.9,
  },
  prestigePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#bdd2fe',
  },
  prestigeText: {
    fontSize: 11,
    letterSpacing: 2,
    color: '#dae2ff',
    textTransform: 'uppercase',
  },
  heroCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 320,
  },
  logoWrapper: {
    position: 'relative',
    marginBottom: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoAura: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(189, 210, 254, 0.22)',
    ...Platform.select({
      web: {
        filter: 'blur(24px)',
      },
      default: {},
    }),
  },
  logoCard: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#1F2E54',
    borderWidth: 1.5,
    borderColor: 'rgba(180, 188, 200, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 16,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  haloRing: {
    ...StyleSheet.absoluteFill,
    borderRadius: 70,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
  typographyGroup: {
    alignItems: 'center',
    marginBottom: 8,
  },
  mainTitle: {
    fontSize: 30,
    letterSpacing: 7,
    color: '#ffffff',
    textTransform: 'uppercase',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  subTitle: {
    fontSize: 20,
    letterSpacing: 8,
    color: '#bdd2fe',
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: 4,
  },
  sloganPill: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sloganText: {
    fontSize: 13,
    letterSpacing: 0.5,
    color: '#dfe3e7',
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    maxWidth: 215,
    marginTop: 36,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    borderRadius: 9999,
    backgroundColor: 'rgba(226, 226, 226, 0.20)',
    overflow: 'hidden',
    position: 'relative',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 9999,
    overflow: 'hidden',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  statusText: {
    fontSize: 11,
    letterSpacing: 0.8,
    color: '#c3c7cb',
    textTransform: 'uppercase',
  },
  percentageText: {
    fontSize: 11,
    color: '#d7e2ff',
  },
  footerSeal: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  securityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    opacity: 0.85,
  },
  securityLabel: {
    fontSize: 12,
    letterSpacing: 0.6,
    color: '#e2e2e2',
  },
  dotDivider: {
    color: 'rgba(226, 226, 226, 0.4)',
    fontSize: 12,
  },
  versionTag: {
    fontSize: 11,
    color: '#bdd2fe',
    fontFamily: Platform.select({ ios: 'Courier', default: 'monospace' }),
    fontWeight: '600',
  },
  legalDiscretion: {
    fontSize: 10,
    letterSpacing: 1.8,
    color: 'rgba(226, 226, 226, 0.42)',
    textTransform: 'uppercase',
  },
});
