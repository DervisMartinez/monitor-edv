import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { GENERATOR_CATALOG } from '../../data/catalog';

interface Props {
  onEnter: () => void;
  isLoggedIn?: boolean;
}

export const LandingScreen: React.FC<Props> = ({ onEnter, isLoggedIn = false }) => {
  const { colors, isDark } = useTheme();
  const { width: windowWidth } = useWindowDimensions();

  const F = {
    bold: 'Montserrat_700Bold',
    semibold: 'Montserrat_600SemiBold',
    medium: 'Montserrat_500Medium',
    regular: 'Montserrat_400Regular',
    extrabold: 'Montserrat_800ExtraBold',
  };

  const isWide = windowWidth >= 960;

  return (
    <View style={[styles.root, { backgroundColor: colors.surface }]}>
      {/* Top Navbar */}
      <View style={[styles.navbar, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={[styles.navLogoCard, { backgroundColor: isDark ? '#1F2E54' : '#FBFBF5', borderWidth: 1, borderColor: isDark ? '#40606E' : '#B4BCC8' }]}>
            <Image 
              source={isDark ? require('../../../assets/images/LOGO-EMPRESASDELVALLE.png') : require('../../../assets/images/EMPRESASDELVALLE-AZUL.png')} 
              style={{ width: '85%', height: '85%' }}
              resizeMode="contain"
            />
          </View>
          <View>
            <Text style={{ fontFamily: F.extrabold, color: colors.onSurface, fontSize: 16, letterSpacing: 1.5, textTransform: 'uppercase' }}>
              EMPRESAS DEL VALLE
            </Text>
            <Text style={{ fontFamily: F.bold, color: isDark ? '#bdd2fe' : '#4b5f84', fontSize: 11, letterSpacing: 1 }}>
              EDV MONITOR • RED ENERGÉTICA
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.loginBtn, { backgroundColor: colors.primary }]}
          onPress={onEnter}
        >
          <Text style={{ fontFamily: F.bold, color: isDark ? '#001136' : '#FFFFFF', fontSize: 13 }}>
            {isLoggedIn ? 'Ir al Panel Administrativo →' : 'Acceder a la Plataforma →'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={[styles.hero, { flexDirection: isWide ? 'row' : 'column', alignItems: 'center' }]}>
          <View style={{ flex: 1, paddingRight: isWide ? 40 : 0 }}>
            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(189, 210, 254, 0.15)' : 'rgba(0, 17, 54, 0.08)' }]}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#bdd2fe' }} />
                <Text style={{ fontFamily: F.bold, color: isDark ? '#dae2ff' : '#001136', fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' }}>
                  Red Corporativa • Plataforma Segura
                </Text>
              </View>
            </View>

            <Text style={[styles.heroTitle, { fontFamily: F.extrabold, color: colors.onSurface }]}>
              Monitoreo y Mantenimiento Inteligente de Plantas Eléctricas
            </Text>

            <View style={styles.sloganInline}>
              <Text style={{ fontFamily: F.semibold, color: isDark ? '#bdd2fe' : '#4b5f84', fontSize: 14 }}>
                Construyendo el futuro hoy
              </Text>
            </View>

            <Text style={[styles.heroSubtitle, { fontFamily: F.regular, color: colors.onSurfaceVariant }]}>
              Supervisión de consumo de combustible y horas de marcha (horómetro), registro en tiempo real de cortes y reposición de la red eléctrica comercial, y programación predictiva de servicios técnicos.
            </Text>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
              <TouchableOpacity 
                style={[styles.ctaButton, { backgroundColor: colors.primary }]}
                onPress={onEnter}
              >
                <MaterialIcons name="dashboard" size={18} color={isDark ? '#001136' : '#FFFFFF'} />
                <Text style={{ fontFamily: F.bold, color: isDark ? '#001136' : '#FFFFFF', fontSize: 14 }}>
                  {isLoggedIn ? 'Abrir Panel de Superusuario' : 'Acceder al Sistema'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Plant Hero Image */}
          <View style={{ flex: 1, alignItems: 'center', marginTop: isWide ? 0 : 30 }}>
            <View style={[styles.heroImgCard, { backgroundColor: isDark ? '#191C24' : '#F1F4F9' }]}>
              <Image 
                source={GENERATOR_CATALOG[0].imageRes} 
                style={{ width: '100%', height: 260 }} 
                resizeMode="contain" 
              />
              <View style={styles.heroImgFooter}>
                <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 14 }}>
                  {GENERATOR_CATALOG[0].brand} {GENERATOR_CATALOG[0].model} • {GENERATOR_CATALOG[0].capacityKva} kVA
                </Text>
                <Text style={{ fontFamily: F.medium, color: '#10B981', fontSize: 12 }}>
                  ● Estado: En espera de red comercial (Standby)
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Feature Cards Grid */}
        <View style={styles.featuresSection}>
          <Text style={[styles.sectionTitle, { fontFamily: F.extrabold, color: colors.onSurface }]}>
            Capacidades del Sistema
          </Text>

          <View style={[styles.featureGrid, { flexDirection: isWide ? 'row' : 'column' }]}>
            <View style={[styles.featureCard, { backgroundColor: isDark ? '#191C24' : '#F8FAFC' }]}>
              <View style={[styles.featureIconCircle, { backgroundColor: 'rgba(37, 99, 235, 0.15)' }]}>
                <MaterialIcons name="speed" size={24} color={colors.primary} />
              </View>
              <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 16, marginTop: 12 }}>
                Control de Horómetros
              </Text>
              <Text style={{ fontFamily: F.regular, color: colors.onSurfaceVariant, fontSize: 13, marginTop: 6 }}>
                Los operadores registran las horas actuales del generador desde la app móvil y el superusuario visualiza la telemetría en tiempo real.
              </Text>
            </View>

            <View style={[styles.featureCard, { backgroundColor: isDark ? '#191C24' : '#F8FAFC' }]}>
              <View style={[styles.featureIconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <MaterialCommunityIcons name="flash-alert" size={24} color="#F59E0B" />
              </View>
              <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 16, marginTop: 12 }}>
                Cortes Eléctricos & Regresos
              </Text>
              <Text style={{ fontFamily: F.regular, color: colors.onSurfaceVariant, fontSize: 13, marginTop: 6 }}>
                Anexado preciso de cuándo ocurrió el apagón y cuándo se restableció la energía comercial, calculando minutos exactos de respaldo.
              </Text>
            </View>

            <View style={[styles.featureCard, { backgroundColor: isDark ? '#191C24' : '#F8FAFC' }]}>
              <View style={[styles.featureIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <MaterialCommunityIcons name="timer-sand" size={24} color="#10B981" />
              </View>
              <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 16, marginTop: 12 }}>
                Conteo de Servicios
              </Text>
              <Text style={{ fontFamily: F.regular, color: colors.onSurfaceVariant, fontSize: 13, marginTop: 6 }}>
                Cuenta regresiva automática para el próximo cambio de aceite, filtros y chequeos técnicos sin montos ni costes anexados.
              </Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  navbar: {
    height: 64,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  navLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navLogoCard: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  sloganInline: {
    marginTop: 6,
    marginBottom: 8,
  },
  loginBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  hero: {
    paddingHorizontal: 32,
    paddingTop: 48,
    paddingBottom: 24,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  badge: {
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  heroTitle: {
    fontSize: 34,
    lineHeight: 42,
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 14,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 10,
  },
  heroImgCard: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  heroImgFooter: {
    marginTop: 12,
    alignItems: 'center',
  },
  featuresSection: {
    paddingHorizontal: 32,
    paddingTop: 30,
  },
  sectionTitle: {
    fontSize: 22,
    marginBottom: 20,
  },
  featureGrid: {
    gap: 16,
  },
  featureCard: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
  },
  featureIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
