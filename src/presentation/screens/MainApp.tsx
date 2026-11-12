import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Animated, 
  Modal,
  TextInput,
  Alert,
  ScrollView,
  useWindowDimensions,
  Platform
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useMyMoto } from '../context/MotoContext';
import { DashboardTab } from './tabs/DashboardTab';
import { ProfileTab } from './tabs/ProfileTab';
import { HistoryTab } from './tabs/HistoryTab';
import { ServicesTab } from './tabs/ServicesTab';
import { OutagesTab } from './tabs/OutagesTab';
import { SpecsTab } from './tabs/SpecsTab';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { isWebPlatform } from '../utils/platformMode';
import { AdminDashboard } from '../components/web/AdminDashboard';
import { TechnicalSheetModal } from '../components/TechnicalSheetModal';
import { VehicleStatsAndCalendarModal } from '../components/VehicleStatsAndCalendarModal';

export const MainApp = () => {
  const { colors, mode, isDark } = useTheme();
  const { 
    activeGenerator, 
    updateHorometer, 
    startOutage, 
    endOutage, 
    activeOutage,
    addService,
    currentUser 
  } = useMyMoto();

  const [activeTab, setActiveTab] = useState<'moto' | 'outages' | 'services' | 'history' | 'profile'>('moto');
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(new Set(['moto']));
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();

  // If on Web platform, render the Superuser Admin Dashboard directly!
  const isWeb = isWebPlatform();
  if (isWeb) {
    return <AdminDashboard />;
  }

  // Quick Action Sheet state for Mobile Central [+]
  const [quickActionVisible, setQuickActionVisible] = useState(false);
  const [quickHoroVisible, setQuickHoroVisible] = useState(false);
  const [quickServiceVisible, setQuickServiceVisible] = useState(false);

  // Quick Horometer Inputs
  const [newHoroInput, setNewHoroInput] = useState('');
  const [horoNotesInput, setHoroNotesInput] = useState('');

  // Quick Service Inputs (NO COST)
  const [serviceTypeInput, setServiceTypeInput] = useState<'oil' | 'oil_filter' | 'fuel_filter' | 'air_filter' | 'coolant' | 'battery'>('oil');
  const [serviceHoroInput, setServiceHoroInput] = useState('');
  const [serviceNotesInput, setServiceNotesInput] = useState('');

  // Modals
  const [specsModalVisible, setSpecsModalVisible] = useState(false);
  const [calModalVisible, setCalModalVisible] = useState(false);

  const handleSelectTab = (tab: 'moto' | 'outages' | 'services' | 'history' | 'profile') => {
    setVisitedTabs((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
    setActiveTab(tab);
  };

  const F = {
    bold: 'Montserrat_700Bold',
    semibold: 'Montserrat_600SemiBold',
    medium: 'Montserrat_500Medium',
    regular: 'Montserrat_400Regular',
    extrabold: 'Montserrat_800ExtraBold',
  };

  const tabs = [
    { id: 'moto' as const, icon: 'engine', iconFamily: 'community' as const, label: 'Planta' },
    { id: 'outages' as const, icon: 'calendar-month', iconFamily: 'material' as const, label: 'Cortes' },
    { id: 'services' as const, icon: 'build', iconFamily: 'material' as const, label: 'Servicio' },
    { id: 'history' as const, icon: 'history', iconFamily: 'material' as const, label: 'Historial' },
    { id: 'profile' as const, icon: 'person', iconFamily: 'material' as const, label: 'Perfil' },
  ];

  const handleSaveQuickHoro = async () => {
    const val = parseFloat(newHoroInput);
    if (isNaN(val) || val < 0) {
      Alert.alert('Horómetro Inválido', 'Ingresa una cifra válida en horas.');
      return;
    }
    await updateHorometer(val, horoNotesInput);
    setQuickHoroVisible(false);
    setHoroNotesInput('');
    Alert.alert('Horómetro Actualizado', `Se guardó la lectura de ${val.toFixed(1)} hrs.`);
  };

  const handleSaveQuickService = async () => {
    const h = parseFloat(serviceHoroInput) || activeGenerator?.currentHours || 0;
    await addService({
      generatorId: activeGenerator?.id || 'gen-blue-power-c125',
      userId: currentUser?.id || 'user-001',
      userEmail: currentUser?.email || 'operador@empresa.com',
      serviceType: serviceTypeInput,
      horometer: Number(h.toFixed(1)),
      date: new Date().toISOString().split('T')[0],
      performedBy: currentUser?.fullName || 'Operador',
      notes: serviceNotesInput,
    });
    setQuickServiceVisible(false);
    setServiceNotesInput('');
    Alert.alert('Servicio Registrado', 'Mantenimiento preventivo guardado sin montos ni costos.');
  };

  const barBg = isDark ? 'rgba(18,20,28,0.96)' : 'rgba(255,255,255,0.96)';
  const borderHairline = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const isLargeViewport = windowWidth > 540;

  return (
    <View style={[styles.rootWrapper, { backgroundColor: isDark ? '#0b0d14' : '#E2E8F0' }]}>
      <View style={[
        styles.appContainer,
        {
          backgroundColor: colors.surface,
          maxWidth: isLargeViewport ? 480 : '100%',
          borderLeftWidth: isLargeViewport ? 1 : 0,
          borderRightWidth: isLargeViewport ? 1 : 0,
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
          shadowOpacity: isLargeViewport ? 0.2 : 0,
        }
      ]}>

        {/* MOBILE MAIN VIEW - TABS PERSIST IN MEMORY FOR INSTANT NAVIGATION */}
        <View style={{ flex: 1 }}>
          <View style={{ flex: 1, display: activeTab === 'moto' ? 'flex' : 'none' }}>
            <DashboardTab onNavigateTab={handleSelectTab} />
          </View>

          {visitedTabs.has('outages') && (
            <View style={{ flex: 1, display: activeTab === 'outages' ? 'flex' : 'none' }}>
              <OutagesTab />
            </View>
          )}

          {visitedTabs.has('services') && (
            <View style={{ flex: 1, display: activeTab === 'services' ? 'flex' : 'none' }}>
              <ServicesTab />
            </View>
          )}

          {visitedTabs.has('history') && (
            <View style={{ flex: 1, display: activeTab === 'history' ? 'flex' : 'none' }}>
              <HistoryTab />
            </View>
          )}

          {visitedTabs.has('profile') && (
            <View style={{ flex: 1, display: activeTab === 'profile' ? 'flex' : 'none' }}>
              <ProfileTab />
            </View>
          )}
        </View>

        {/* MOBILE BOTTOM NAVIGATION BAR */}
        <View style={[
          styles.bottomNavContainer,
          {
            backgroundColor: barBg,
            borderTopColor: borderHairline,
            paddingBottom: Math.max(insets.bottom + 8, Platform.OS === 'ios' ? 24 : 14),
          }
        ]}>
          {/* Left 2 Tabs: Planta, Cortes */}
          <View style={styles.navGroup}>
            <TouchableOpacity 
              style={styles.navButton}
              onPress={() => handleSelectTab('moto')}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons 
                name="engine" 
                size={22} 
                color={activeTab === 'moto' ? colors.primary : colors.onSurfaceVariant} 
              />
              <Text style={[
                styles.navLabel,
                { 
                  fontFamily: activeTab === 'moto' ? F.bold : F.medium,
                  color: activeTab === 'moto' ? colors.primary : colors.onSurfaceVariant 
                }
              ]}>
                Planta
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.navButton}
              onPress={() => handleSelectTab('outages')}
              activeOpacity={0.7}
            >
              <MaterialIcons 
                name="calendar-month" 
                size={22} 
                color={activeTab === 'outages' ? colors.primary : colors.onSurfaceVariant} 
              />
              <Text style={[
                styles.navLabel,
                { 
                  fontFamily: activeTab === 'outages' ? F.bold : F.medium,
                  color: activeTab === 'outages' ? colors.primary : colors.onSurfaceVariant 
                }
              ]}>
                Cortes
              </Text>
            </TouchableOpacity>
          </View>

          {/* Central Raised [+] Button */}
          <View style={styles.centerButtonWrapper}>
            <TouchableOpacity
              style={[styles.centerFab, { shadowColor: colors.primary }]}
              onPress={() => setQuickActionVisible(true)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={isDark ? ['#bdd2fe', '#4b5f84'] : ['#0a2558', '#001136']}
                style={styles.centerFabGradient}
              >
                <MaterialIcons name="add" size={28} color={isDark ? '#001136' : '#FFFFFF'} />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Right 2 Tabs: Servicios, Perfil */}
          <View style={styles.navGroup}>
            <TouchableOpacity 
              style={styles.navButton}
              onPress={() => handleSelectTab('services')}
              activeOpacity={0.7}
            >
              <MaterialIcons 
                name="build" 
                size={20} 
                color={activeTab === 'services' ? colors.primary : colors.onSurfaceVariant} 
              />
              <Text style={[
                styles.navLabel,
                { 
                  fontFamily: activeTab === 'services' ? F.bold : F.medium,
                  color: activeTab === 'services' ? colors.primary : colors.onSurfaceVariant 
                }
              ]}>
                Servicios
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.navButton}
              onPress={() => handleSelectTab('profile')}
              activeOpacity={0.7}
            >
              <MaterialIcons 
                name="person" 
                size={22} 
                color={activeTab === 'profile' ? colors.primary : colors.onSurfaceVariant} 
              />
              <Text style={[
                styles.navLabel,
                { 
                  fontFamily: activeTab === 'profile' ? F.bold : F.medium,
                  color: activeTab === 'profile' ? colors.primary : colors.onSurfaceVariant 
                }
              ]}>
                Perfil
              </Text>
            </TouchableOpacity>
          </View>
        </View>

      </View>

      {/* MODAL: ACCIONES RÁPIDAS (Quick Action Sheet) */}
      <Modal visible={quickActionVisible} transparent animationType="fade" onRequestClose={() => setQuickActionVisible(false)}>
        <TouchableOpacity 
          style={styles.actionSheetBackdrop} 
          activeOpacity={1} 
          onPress={() => setQuickActionVisible(false)}
        >
          <View style={[styles.actionSheetCard, { backgroundColor: isDark ? '#191C24' : '#FFFFFF' }]}>
            <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 16, marginBottom: 14 }}>
              Acción Rápida de Planta Eléctrica
            </Text>

            {/* Opción 1: Actualizar Horómetro */}
            <TouchableOpacity
              style={styles.actionOptionRow}
              onPress={() => {
                setQuickActionVisible(false);
                setNewHoroInput(activeGenerator?.currentHours.toString() || '0');
                setQuickHoroVisible(true);
              }}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(37, 99, 235, 0.15)' }]}>
                <MaterialIcons name="speed" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 14 }}>
                  ⏱️ Actualizar Horómetro Actual
                </Text>
                <Text style={{ fontFamily: F.regular, color: colors.onSurfaceVariant, fontSize: 11 }}>
                  Registrar las horas actuales de operación del generador
                </Text>
              </View>
            </TouchableOpacity>

            {/* Opción 2: Corte Eléctrico */}
            <TouchableOpacity
              style={styles.actionOptionRow}
              onPress={async () => {
                setQuickActionVisible(false);
                if (activeOutage) {
                  await endOutage();
                  Alert.alert('Energía Restablecida', 'Se registró el regreso de la red eléctrica.');
                } else {
                  await startOutage();
                  Alert.alert('Corte Eléctrico', 'Se registró el corte eléctrico. Planta en marcha.');
                }
              }}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: activeOutage ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)' }]}>
                <MaterialCommunityIcons 
                  name={activeOutage ? "power" : "flash-alert"} 
                  size={22} 
                  color={activeOutage ? "#10B981" : "#F59E0B"} 
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 14 }}>
                  {activeOutage ? '🟢 Registrar Regreso de Electricidad' : '⚡ Registrar Corte Eléctrico'}
                </Text>
                <Text style={{ fontFamily: F.regular, color: colors.onSurfaceVariant, fontSize: 11 }}>
                  {activeOutage ? 'Marcar que la luz comercial ha vuelto' : 'Registrar inicio de apagón en la zona'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Opción 3: Registrar Servicio */}
            <TouchableOpacity
              style={styles.actionOptionRow}
              onPress={() => {
                setQuickActionVisible(false);
                setServiceHoroInput(activeGenerator?.currentHours.toString() || '0');
                setQuickServiceVisible(true);
              }}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                <MaterialIcons name="build" size={22} color="#8B5CF6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 14 }}>
                  🛠️ Registrar Mantenimiento Realizado
                </Text>
                <Text style={{ fontFamily: F.regular, color: colors.onSurfaceVariant, fontSize: 11 }}>
                  Cambio de aceite, filtros o revisión técnica sin costos
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* QUICK MODAL: ACTUALIZAR HORÓMETRO */}
      <Modal visible={quickHoroVisible} transparent animationType="slide" onRequestClose={() => setQuickHoroVisible(false)}>
        <View style={styles.dialogOverlay}>
          <View style={[styles.dialogBox, { backgroundColor: isDark ? '#191C24' : '#FFFFFF' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 16 }}>
                ⏱️ Actualizar Horómetro
              </Text>
              <TouchableOpacity onPress={() => setQuickHoroVisible(false)}>
                <MaterialIcons name="close" size={20} color={colors.onSurface} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontFamily: F.medium, color: colors.onSurfaceVariant, fontSize: 12 }}>
              Horómetro actual: {activeGenerator?.currentHours || 0} hrs
            </Text>

            <TextInput 
              value={newHoroInput}
              onChangeText={setNewHoroInput}
              placeholder="Ej: 1255.0"
              placeholderTextColor={colors.onSurfaceVariant}
              keyboardType="numeric"
              style={[styles.dialogInput, { backgroundColor: isDark ? '#232733' : '#F1F4F9', color: colors.onSurface, fontFamily: F.extrabold, fontSize: 22 }]}
              autoFocus
            />

            <TextInput 
              value={horoNotesInput}
              onChangeText={setHoroNotesInput}
              placeholder="Notas u observaciones (opcional)"
              placeholderTextColor={colors.onSurfaceVariant}
              style={[styles.dialogInput, { backgroundColor: isDark ? '#232733' : '#F1F4F9', color: colors.onSurface, fontFamily: F.regular, fontSize: 13, height: 60, marginTop: 10 }]}
              multiline
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity onPress={() => setQuickHoroVisible(false)} style={[styles.dialogBtn, { borderColor: colors.onSurfaceVariant, borderWidth: 1 }]}>
                <Text style={{ fontFamily: F.bold, color: colors.onSurface }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveQuickHoro} style={[styles.dialogBtn, { backgroundColor: colors.primary }]}>
                <Text style={{ fontFamily: F.bold, color: '#FFFFFF' }}>Guardar Horómetro</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* QUICK MODAL: REGISTRAR SERVICIO */}
      <Modal visible={quickServiceVisible} transparent animationType="slide" onRequestClose={() => setQuickServiceVisible(false)}>
        <View style={styles.dialogOverlay}>
          <View style={[styles.dialogBox, { backgroundColor: isDark ? '#191C24' : '#FFFFFF' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 16 }}>
                🛠️ Registrar Mantenimiento
              </Text>
              <TouchableOpacity onPress={() => setQuickServiceVisible(false)}>
                <MaterialIcons name="close" size={20} color={colors.onSurface} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontFamily: F.regular, color: colors.onSurfaceVariant, fontSize: 12, marginBottom: 8 }}>
              Registra el servicio preventivo realizado a la planta (sin montos).
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {(['oil', 'oil_filter', 'fuel_filter', 'air_filter', 'coolant', 'battery'] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeChipSmall,
                    { backgroundColor: isDark ? '#232733' : '#F1F4F9' },
                    serviceTypeInput === t && { backgroundColor: 'rgba(37, 99, 235, 0.2)', borderColor: colors.primary, borderWidth: 1 }
                  ]}
                  onPress={() => setServiceTypeInput(t)}
                >
                  <Text style={{ fontFamily: F.semibold, color: serviceTypeInput === t ? colors.primary : colors.onSurface, fontSize: 11 }}>
                    {t === 'oil' ? 'Aceite 15W-40' : t === 'oil_filter' ? 'Filtro Aceite' : t === 'fuel_filter' ? 'Filtro Combustible' : t === 'air_filter' ? 'Filtro Aire' : t === 'coolant' ? 'Refrigerante' : 'Batería'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput 
              value={serviceHoroInput}
              onChangeText={setServiceHoroInput}
              placeholder="Horómetro (hrs)"
              placeholderTextColor={colors.onSurfaceVariant}
              keyboardType="numeric"
              style={[styles.dialogInput, { backgroundColor: isDark ? '#232733' : '#F1F4F9', color: colors.onSurface, fontFamily: F.bold, fontSize: 15 }]}
            />

            <TextInput 
              value={serviceNotesInput}
              onChangeText={setServiceNotesInput}
              placeholder="Detalle técnico de la intervención"
              placeholderTextColor={colors.onSurfaceVariant}
              style={[styles.dialogInput, { backgroundColor: isDark ? '#232733' : '#F1F4F9', color: colors.onSurface, fontFamily: F.regular, fontSize: 13, height: 60, marginTop: 10 }]}
              multiline
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity onPress={() => setQuickServiceVisible(false)} style={[styles.dialogBtn, { borderColor: colors.onSurfaceVariant, borderWidth: 1 }]}>
                <Text style={{ fontFamily: F.bold, color: colors.onSurface }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveQuickService} style={[styles.dialogBtn, { backgroundColor: colors.primary }]}>
                <Text style={{ fontFamily: F.bold, color: '#FFFFFF' }}>Guardar Servicio</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Ficha Técnica Modal */}
      <TechnicalSheetModal 
        visible={specsModalVisible}
        onClose={() => setSpecsModalVisible(false)}
      />

      {/* Calendario & Conteo Modal */}
      <VehicleStatsAndCalendarModal
        visible={calModalVisible}
        onClose={() => setCalModalVisible(false)}
      />

    </View>
  );
};

const styles = StyleSheet.create({
  rootWrapper: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  appContainer: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowRadius: 24,
    elevation: 10,
    overflow: 'hidden',
  },
  bottomNavContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  navGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    minHeight: 44,
  },
  navLabel: {
    fontSize: 10.5,
    marginTop: 2,
    textAlign: 'center',
  },
  centerButtonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  centerFab: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginTop: -20,
    shadowColor: '#2563EB',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  centerFabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionSheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  actionSheetCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 12,
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
  },
  actionOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  dialogBox: {
    borderRadius: 18,
    padding: 20,
    maxWidth: 440,
    alignSelf: 'center',
    width: '100%',
  },
  dialogInput: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 8,
  },
  dialogBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  typeChipSmall: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
});
