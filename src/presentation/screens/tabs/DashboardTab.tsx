import React, { useState, useMemo, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform, 
  Dimensions, 
  Alert,
  useWindowDimensions 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useMyMoto } from '../../context/MotoContext';
import { useTheme } from '../../context/ThemeContext';
import { 
  getServiceStatus, 
  calculateWearPercentage, 
  COMPONENT_NAMES 
} from '../../../constants/telemetry';
import { VehicleStatsAndCalendarModal } from '../../components/VehicleStatsAndCalendarModal';
import { TechnicalSheetModal } from '../../components/TechnicalSheetModal';

interface DashboardTabProps {
  onNavigateTab?: (tab: 'moto' | 'outages' | 'services' | 'history' | 'profile') => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({ onNavigateTab }) => {
  const { 
    activeGenerator, 
    generators, 
    selectGenerator, 
    updateHorometer, 
    startOutage, 
    endOutage, 
    activeOutage,
    addService,
    currentUser 
  } = useMyMoto();
  const { colors, isDark } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isSmallPhone = windowWidth < 360;

  // Modals
  const [statsCalVisible, setStatsCalVisible] = useState(false);
  const [statsCalInitialTab, setStatsCalInitialTab] = useState<'calendar' | 'countdown'>('calendar');
  const [techSheetVisible, setTechSheetVisible] = useState(false);
  const [horoModalVisible, setHoroModalVisible] = useState(false);
  const [serviceModalVisible, setServiceModalVisible] = useState(false);

  // Horometer input
  const [newHoroInput, setNewHoroInput] = useState('');
  const [horoNotes, setHoroNotes] = useState('');

  // Service input (NO COST)
  const [serviceTypeInput, setServiceTypeInput] = useState<'oil' | 'oil_filter' | 'fuel_filter' | 'air_filter' | 'coolant' | 'battery'>('oil');
  const [serviceHoroInput, setServiceHoroInput] = useState('');
  const [serviceNotes, setServiceNotes] = useState('');

  const F = {
    bold: 'Montserrat_700Bold',
    semibold: 'Montserrat_600SemiBold',
    medium: 'Montserrat_500Medium',
    regular: 'Montserrat_400Regular',
    extrabold: 'Montserrat_800ExtraBold',
  };

  // Plantas a cargo del usuario: Superadmin ve toda la flota, operador ve sus plantas asignadas
  const userGenerators = useMemo(() => {
    if (currentUser?.role === 'superadmin' || !currentUser?.assignedGeneratorIds || currentUser.assignedGeneratorIds.length === 0) {
      return generators;
    }
    const filtered = generators.filter(g => currentUser.assignedGeneratorIds?.includes(g.id));
    return filtered.length > 0 ? filtered : generators;
  }, [generators, currentUser]);

  // Calculations for Service Countdown
  const serviceStats = useMemo(() => {
    if (!activeGenerator) {
      return {
        remainingHours: 0,
        nextTargetHours: 200,
        status: { status: 'optimal', label: 'OPERATIVO ÓPTIMO', color: '#10B981' },
        percent: 100,
      };
    }

    const currentHours = activeGenerator.currentHours;
    const intervalHours = activeGenerator.serviceIntervalHours || 200;
    const rawLast = activeGenerator.lastServiceHours || 0;
    const lastServiceHours = (rawLast >= 0 && rawLast <= currentHours) ? rawLast : currentHours;
    const nextTargetHours = lastServiceHours > 0 
      ? lastServiceHours + intervalHours 
      : (currentHours > 0 ? currentHours + intervalHours : intervalHours);
    const remainingHours = Math.max(0, Number((nextTargetHours - currentHours).toFixed(1)));
    const status = getServiceStatus(remainingHours);
    const percent = calculateWearPercentage(currentHours, lastServiceHours, intervalHours);

    return {
      remainingHours,
      nextTargetHours,
      status,
      percent,
    };
  }, [activeGenerator]);

  // Handle Horometer submission
  const handleSaveHorometer = async () => {
    const val = parseFloat(newHoroInput);
    if (isNaN(val) || val < 0) {
      Alert.alert('Valor Inválido', 'Ingresa una cifra válida en horas para el horómetro.');
      return;
    }

    if (activeGenerator && val < activeGenerator.currentHours) {
      if (Platform.OS === 'web') {
        const ok = typeof window !== 'undefined' && window.confirm 
          ? window.confirm(`El valor ingresado (${val} h) es menor al horómetro actual (${activeGenerator.currentHours} h). ¿Deseas actualizarlo de todas formas?`) 
          : true;
        if (!ok) return;
        const res = await updateHorometer(val, horoNotes);
        setHoroModalVisible(false);
        setHoroNotes('');
        return;
      }

      Alert.alert(
        'Confirmar Horómetro Menor',
        `El valor ingresado (${val} h) es menor al horómetro actual (${activeGenerator.currentHours} h). ¿Deseas actualizarlo de todas formas?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Actualizar', 
            onPress: async () => {
              await updateHorometer(val, horoNotes);
              setHoroModalVisible(false);
              setHoroNotes('');
            }
          }
        ]
      );
      return;
    }

    const res = await updateHorometer(val, horoNotes);
    setHoroModalVisible(false);
    setHoroNotes('');
    Alert.alert(
      'Horómetro Actualizado',
      `Se registró la lectura de ${val.toFixed(1)} horas (+${res.delta.toFixed(1)} hrs acumuladas). La data ya está disponible en el panel web.`
    );
  };

  // Handle quick service submission (NO COST)
  const handleSaveService = async () => {
    const h = parseFloat(serviceHoroInput) || activeGenerator?.currentHours || 0;
    await addService({
      generatorId: activeGenerator?.id || 'gen-blue-power-c125',
      userId: currentUser?.id || 'user-001',
      userEmail: currentUser?.email || 'operador@empresa.com',
      serviceType: serviceTypeInput,
      horometer: Number(h.toFixed(1)),
      date: new Date().toISOString().split('T')[0],
      performedBy: currentUser?.fullName || 'Operador',
      notes: serviceNotes,
    });
    setServiceModalVisible(false);
    setServiceNotes('');
    Alert.alert('Servicio Guardado', 'Se registró el servicio preventivo a la planta eléctrica.');
  };

  const cardBg = isDark ? '#191C24' : '#FFFFFF';
  const textPrimary = colors.onSurface;
  const textSecondary = colors.onSurfaceVariant;
  const insets = useSafeAreaInsets();
  const isNarrowScreen = windowWidth < 380;
  const horizontalPadding = isNarrowScreen ? 14 : 18;

  return (
    <ScrollView 
      style={{ flex: 1, backgroundColor: colors.surface }}
      contentContainerStyle={{ 
        paddingHorizontal: horizontalPadding, 
        paddingTop: 16, 
        paddingBottom: Math.max(insets.bottom + 95, 115) 
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* 0. Corporate Mini-Header - Empresas del Valle */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Image 
          source={isDark ? require('../../../../assets/images/LOGO-EMPRESASDELVALLE.png') : require('../../../../assets/images/EMPRESASDELVALLE-AZUL.png')} 
          style={{ width: isSmallPhone ? 120 : 138, height: 40 }} 
          resizeMode="contain" 
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(31, 46, 84, 0.08)', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8 }}>
            <MaterialCommunityIcons name="flash-alert" size={15} color={colors.primary} />
            <Text style={{ fontFamily: F.bold, color: colors.primary, fontSize: 10.5 }}>EDV MONITOR</Text>
          </View>
          {onNavigateTab && (
            <TouchableOpacity 
              style={[styles.headerAvatarBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F4F9' }]}
              onPress={() => onNavigateTab('profile')}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialIcons name="person" size={18} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 1. Header with Generator Selector */}
      <View style={styles.topHeader}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={[styles.statusDot, { backgroundColor: activeOutage ? '#EF4444' : '#10B981' }]} />
            <Text style={{ fontFamily: F.bold, color: textSecondary, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' }}>
              {activeOutage ? 'PLANTA EN MARCHA POR CORTE' : 'PLANTA EN STANDBY'}
            </Text>
          </View>
          <Text style={{ fontFamily: F.extrabold, color: textPrimary, fontSize: 22, marginTop: 2 }}>
            {activeGenerator ? activeGenerator.name : 'Planta Eléctrica'}
          </Text>
          <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 12 }}>
            {activeGenerator ? `${activeGenerator.brand} ${activeGenerator.model} • ${activeGenerator.capacityKva} kVA` : ''}
          </Text>
        </View>

        {/* Switch plant button if more than 1 assigned */}
        {userGenerators.length > 1 && (
          <TouchableOpacity 
            style={[styles.switchGenBtn, { backgroundColor: cardBg }]}
            onPress={() => {
              const currentIdx = userGenerators.findIndex(g => g.id === activeGenerator?.id);
              const nextIdx = (currentIdx + 1) % userGenerators.length;
              selectGenerator(userGenerators[nextIdx].id);
            }}
          >
            <MaterialIcons name="swap-horiz" size={20} color={colors.primary} />
            <Text style={{ fontFamily: F.bold, color: colors.primary, fontSize: 11 }}>Cambiar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Empty State if No Generators in Supabase */}
      {generators.length === 0 && (
        <View style={{ backgroundColor: cardBg, padding: 24, borderRadius: 16, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
          <MaterialCommunityIcons name="engine-off" size={48} color={colors.primary} style={{ opacity: 0.6, marginBottom: 8 }} />
          <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 16, textAlign: 'center' }}>
            No hay plantas eléctricas registradas
          </Text>
          <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 12, textAlign: 'center', marginTop: 4 }}>
            La base de datos de Supabase no contiene generadores en este momento. Anexa una nueva planta desde el panel de administración web (8081).
          </Text>
        </View>
      )}

      {/* 2. Banner de Estado Eléctrico (Blackout Detector & Quick Action) */}
      {activeOutage ? (
        <View style={styles.outageAlertBox}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <MaterialCommunityIcons name="flash-alert" size={28} color="#FFFFFF" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.bold, color: '#FFFFFF', fontSize: 14 }}>
                ⚠️ CORTE ELÉCTRICO ACTIVO
              </Text>
              <Text style={{ fontFamily: F.medium, color: '#FEE2E2', fontSize: 11 }}>
                Inició a las {new Date(activeOutage.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. La planta suministra energía de respaldo.
              </Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.powerBackBtn}
            onPress={() => endOutage()}
          >
            <MaterialIcons name="check" size={16} color="#DC2626" />
            <Text style={{ fontFamily: F.bold, color: '#DC2626', fontSize: 11 }}>
              Regresó la Luz
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.gridHealthyRow, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5' }]}>
          <MaterialCommunityIcons name="shield-check" size={22} color="#10B981" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.bold, color: '#10B981', fontSize: 13 }}>
              Red Eléctrica Comercial Activa
            </Text>
            <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 11 }}>
              Suministro normal. Planta en modo automático (ATS).
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.reportCutBtn}
            onPress={() => startOutage()}
          >
            <MaterialCommunityIcons name="flash-off" size={16} color="#F59E0B" />
            <Text style={{ fontFamily: F.bold, color: '#F59E0B', fontSize: 12 }}>
              Hubo Corte
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 3. Hero Card: Industrial Horometer Display */}
      <View style={[styles.horoHeroCard, { backgroundColor: cardBg }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialIcons name="timer" size={18} color={colors.primary} />
            <Text style={{ fontFamily: F.bold, color: textSecondary, fontSize: 12, letterSpacing: 0.8 }}>
              HORÓMETRO DE CONSUMO
            </Text>
          </View>
          <View style={[styles.fuelPill, { backgroundColor: 'rgba(37, 99, 235, 0.1)' }]}>
            <Text style={{ fontFamily: F.bold, color: colors.primary, fontSize: 11 }}>
              {activeGenerator?.fuelType.toUpperCase() || 'DIÉSEL'}
            </Text>
          </View>
        </View>

        {/* Digital Clock Display */}
        <View style={styles.digitalHorometerContainer}>
          <Text style={[styles.digitalHorometerNumber, { fontFamily: F.extrabold, color: textPrimary }]}>
            {activeGenerator ? activeGenerator.currentHours.toFixed(1) : '0.0'}
          </Text>
          <Text style={[styles.digitalHorometerUnit, { fontFamily: F.extrabold, color: colors.primary }]}>
            HRS
          </Text>
        </View>

        <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 12, textAlign: 'center', marginBottom: 14 }}>
          Horas totales acumuladas de operación de la planta
        </Text>

        {/* Botón para Actualizar Horómetro */}
        <TouchableOpacity 
          style={[styles.updateHoroBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            setNewHoroInput(activeGenerator?.currentHours.toString() || '0');
            setHoroModalVisible(true);
          }}
        >
          <MaterialIcons name="add-alarm" size={18} color="#FFFFFF" />
          <Text style={{ fontFamily: F.bold, color: '#FFFFFF', fontSize: 14 }}>
            Actualizar Horómetro Actual
          </Text>
        </TouchableOpacity>
      </View>

      {/* 4. Generator Image & Quick Info */}
      {activeGenerator && (
        <View style={[styles.imageContainer, { backgroundColor: cardBg }]}>
          <Image 
            source={activeGenerator.customImageUri || activeGenerator.imageUrl ? { uri: activeGenerator.customImageUri || activeGenerator.imageUrl } : activeGenerator.catalogImageRes} 
            style={styles.genImage}
            resizeMode="contain"
          />
          <View style={styles.imageOverlayInfo}>
            <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 14 }}>
              {activeGenerator.brand} {activeGenerator.model}
            </Text>
            <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 11 }}>
              {activeGenerator.location || 'Ubicación General'}
            </Text>
          </View>
        </View>
      )}

      {/* 5. WIDGET: Conteo de cuánto toca hacerle servicio a la planta eléctrica */}
      <View style={[styles.countdownWidgetCard, { backgroundColor: cardBg }]}>
        <View style={styles.countdownHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 150 }}>
            <MaterialCommunityIcons name="timer-sand" size={17} color="#F59E0B" />
            <Text 
              style={{ 
                fontFamily: F.bold, 
                color: textSecondary, 
                fontSize: isNarrowScreen ? 11 : 12,
                letterSpacing: 0.3 
              }}
              numberOfLines={1}
            >
              {isNarrowScreen ? 'PRÓXIMO SERVICIO' : 'PRÓXIMO SERVICIO PROGRAMADO'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${serviceStats.status.color}20` }]}>
            <Text style={{ fontFamily: F.bold, color: serviceStats.status.color, fontSize: 10.5 }}>
              {serviceStats.status.label}
            </Text>
          </View>
        </View>

        <View style={styles.countdownRow}>
          <View style={{ flex: 1, minWidth: 140 }}>
            <Text style={[styles.countdownValue, { fontFamily: F.extrabold, color: serviceStats.status.color }]}>
              {serviceStats.nextTargetHours.toFixed(1)} h
            </Text>
            <Text style={{ fontFamily: F.semibold, color: textSecondary, fontSize: 12 }}>
              {serviceStats.remainingHours > 0 
                ? `Horómetro meta (restan ${serviceStats.remainingHours.toFixed(1)} h)` 
                : '¡Mantenimiento vencido!'}
            </Text>
          </View>

          <TouchableOpacity 
            style={[styles.countdownCalBtn, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}
            onPress={() => {
              setStatsCalInitialTab('countdown');
              setStatsCalVisible(true);
            }}
          >
            <Text style={{ fontFamily: F.bold, color: '#F59E0B', fontSize: 12 }}>Ver Conteo Detallado</Text>
            <MaterialIcons name="chevron-right" size={18} color="#F59E0B" />
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${Math.max(5, serviceStats.percent)}%`,
                backgroundColor: serviceStats.status.color 
              }
            ]} 
          />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 11 }}>
            Último servicio: {activeGenerator?.lastServiceHours || 0} h
          </Text>
          <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 11 }}>
            Meta: {serviceStats.nextTargetHours.toFixed(1)} h
          </Text>
        </View>
      </View>

      {/* 6. Quick Actions Grid (2x2 Responsive Matrix) */}
      <View style={styles.quickGrid}>
        {/* Calendario de Cortes */}
        <TouchableOpacity 
          style={[styles.quickCard, { backgroundColor: cardBg }]}
          onPress={() => {
            setStatsCalInitialTab('calendar');
            setStatsCalVisible(true);
          }}
          activeOpacity={0.8}
        >
          <View style={[styles.quickIconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
            <MaterialIcons name="calendar-month" size={22} color="#F59E0B" />
          </View>
          <Text style={[styles.quickCardTitle, { fontFamily: F.bold, color: textPrimary }]}>
            Calendario Cortes
          </Text>
          <Text style={[styles.quickCardDesc, { fontFamily: F.regular, color: textSecondary }]}>
            Días de apagón y reposición
          </Text>
        </TouchableOpacity>

        {/* Registrar Servicio */}
        <TouchableOpacity 
          style={[styles.quickCard, { backgroundColor: cardBg }]}
          onPress={() => {
            setServiceHoroInput(activeGenerator?.currentHours.toString() || '0');
            setServiceModalVisible(true);
          }}
          activeOpacity={0.8}
        >
          <View style={[styles.quickIconCircle, { backgroundColor: 'rgba(37, 99, 235, 0.15)' }]}>
            <MaterialIcons name="build" size={22} color={colors.primary} />
          </View>
          <Text style={[styles.quickCardTitle, { fontFamily: F.bold, color: textPrimary }]}>
            Registrar Servicio
          </Text>
          <Text style={[styles.quickCardDesc, { fontFamily: F.regular, color: textSecondary }]}>
            Cambio de aceite y filtros
          </Text>
        </TouchableOpacity>

        {/* Ficha Técnica */}
        <TouchableOpacity 
          style={[styles.quickCard, { backgroundColor: cardBg }]}
          onPress={() => setTechSheetVisible(true)}
          activeOpacity={0.8}
        >
          <View style={[styles.quickIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
            <MaterialCommunityIcons name="engine" size={22} color="#10B981" />
          </View>
          <Text style={[styles.quickCardTitle, { fontFamily: F.bold, color: textPrimary }]}>
            Ficha Técnica
          </Text>
          <Text style={[styles.quickCardDesc, { fontFamily: F.regular, color: textSecondary }]}>
            Capacidad, motor y fluidos
          </Text>
        </TouchableOpacity>

        {/* Bitácora Historial */}
        <TouchableOpacity 
          style={[styles.quickCard, { backgroundColor: cardBg }]}
          onPress={() => {
            if (onNavigateTab) {
              onNavigateTab('history');
            } else {
              setStatsCalInitialTab('calendar');
              setStatsCalVisible(true);
            }
          }}
          activeOpacity={0.8}
        >
          <View style={[styles.quickIconCircle, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
            <MaterialIcons name="history" size={22} color="#8B5CF6" />
          </View>
          <Text style={[styles.quickCardTitle, { fontFamily: F.bold, color: textPrimary }]}>
            Historial Bitácora
          </Text>
          <Text style={[styles.quickCardDesc, { fontFamily: F.regular, color: textSecondary }]}>
            Eventos y lecturas pasadas
          </Text>
        </TouchableOpacity>
      </View>

      {/* MODAL: Actualizar Horómetro */}
      <Modal visible={horoModalVisible} transparent animationType="slide" onRequestClose={() => setHoroModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.modalCard, { backgroundColor: cardBg }]}>
              <View style={styles.modalHeader}>
                <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 17 }}>
                  ⏱️ Actualizar Horómetro Actual
                </Text>
                <TouchableOpacity onPress={() => setHoroModalVisible(false)}>
                  <MaterialIcons name="close" size={20} color={textPrimary} />
                </TouchableOpacity>
              </View>

              <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 13, marginBottom: 12 }}>
                Ingresa la lectura actual reflejada en el horómetro digital o analógico de la planta eléctrica.
              </Text>

              <Text style={{ fontFamily: F.bold, color: textSecondary, fontSize: 12 }}>
                Horómetro Actual (Horas):
              </Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: isDark ? '#232733' : '#F1F4F9', color: textPrimary, fontFamily: F.extrabold, fontSize: 24 }]}
                value={newHoroInput}
                onChangeText={setNewHoroInput}
                keyboardType="numeric"
                placeholder="Ej: 1250.5"
                placeholderTextColor={textSecondary}
                autoFocus
              />

              <Text style={{ fontFamily: F.bold, color: textSecondary, fontSize: 12, marginTop: 12 }}>
                Notas de la Lectura (Opcional):
              </Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: isDark ? '#232733' : '#F1F4F9', color: textPrimary, fontFamily: F.regular, fontSize: 13, height: 60 }]}
                value={horoNotes}
                onChangeText={setHoroNotes}
                placeholder="Ej: Lectura tras corte eléctrico de 4 horas..."
                placeholderTextColor={textSecondary}
                multiline
              />

              <View style={styles.modalBtnRow}>
                <TouchableOpacity 
                  style={[styles.modalCancel, { borderColor: textSecondary }]}
                  onPress={() => setHoroModalVisible(false)}
                >
                  <Text style={{ fontFamily: F.semibold, color: textSecondary }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalSubmit, { backgroundColor: colors.primary }]}
                  onPress={handleSaveHorometer}
                >
                  <Text style={{ fontFamily: F.bold, color: '#FFFFFF' }}>Guardar Horómetro</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* MODAL: Registrar Mantenimiento Rápido (SIN COSTO) */}
      <Modal visible={serviceModalVisible} transparent animationType="slide" onRequestClose={() => setServiceModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 17 }}>
                🛠️ Registrar Servicio Técnico
              </Text>
              <TouchableOpacity onPress={() => setServiceModalVisible(false)}>
                <MaterialIcons name="close" size={20} color={textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 12, marginBottom: 10 }}>
              Registra el servicio preventivo realizado. No requiere costos ni montos anexados.
            </Text>

            <Text style={{ fontFamily: F.bold, color: textSecondary, fontSize: 12, marginBottom: 6 }}>
              Tipo de Servicio:
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {(['oil', 'oil_filter', 'fuel_filter', 'air_filter', 'coolant', 'battery'] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeChip,
                    { backgroundColor: isDark ? '#232733' : '#F1F4F9' },
                    serviceTypeInput === t && { backgroundColor: 'rgba(37, 99, 235, 0.2)', borderColor: colors.primary, borderWidth: 1 }
                  ]}
                  onPress={() => setServiceTypeInput(t)}
                >
                  <Text style={{ fontFamily: F.semibold, color: serviceTypeInput === t ? colors.primary : textPrimary, fontSize: 11 }}>
                    {COMPONENT_NAMES[t]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ fontFamily: F.bold, color: textSecondary, fontSize: 12 }}>
              Horómetro al Momento del Servicio:
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: isDark ? '#232733' : '#F1F4F9', color: textPrimary, fontFamily: F.bold }]}
              value={serviceHoroInput}
              onChangeText={setServiceHoroInput}
              keyboardType="numeric"
            />

            <Text style={{ fontFamily: F.bold, color: textSecondary, fontSize: 12, marginTop: 10 }}>
              Notas / Especificación de Repuestos:
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: isDark ? '#232733' : '#F1F4F9', color: textPrimary, fontFamily: F.regular, height: 60 }]}
              value={serviceNotes}
              onChangeText={setServiceNotes}
              placeholder="Ej: Aceite 15W-40 CK-4 y filtro de aceite cambiados..."
              placeholderTextColor={textSecondary}
              multiline
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity 
                style={[styles.modalCancel, { borderColor: textSecondary }]}
                onPress={() => setServiceModalVisible(false)}
              >
                <Text style={{ fontFamily: F.semibold, color: textSecondary }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalSubmit, { backgroundColor: colors.primary }]}
                onPress={handleSaveService}
              >
                <Text style={{ fontFamily: F.bold, color: '#FFFFFF' }}>Guardar Servicio</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Calendario de Cortes y Conteo Modal */}
      <VehicleStatsAndCalendarModal 
        visible={statsCalVisible}
        onClose={() => setStatsCalVisible(false)}
        initialTab={statsCalInitialTab}
      />

      {/* Ficha Técnica Modal */}
      <TechnicalSheetModal
        visible={techSheetVisible}
        onClose={() => setTechSheetVisible(false)}
      />

    </ScrollView>
  );
};

const styles: any = StyleSheet.create({
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  switchGenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  outageAlertBox: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  powerBackBtn: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  gridHealthyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  reportCutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  horoHeroCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  fuelPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  digitalHorometerContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginVertical: 14,
    gap: 8,
  },
  digitalHorometerNumber: {
    fontSize: 42,
    letterSpacing: 1.5,
  },
  digitalHorometerUnit: {
    fontSize: 18,
  },
  headerAvatarBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  updateHoroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  imageContainer: {
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  genImage: {
    width: '100%',
    height: 160,
    maxHeight: 180,
  },
  imageOverlayInfo: {
    alignItems: 'center',
    marginTop: 8,
  },
  countdownWidgetCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  countdownHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'center',
  },
  countdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 12,
  },
  countdownValue: {
    fontSize: 30,
  },
  countdownCalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickCard: {
    flex: 1,
    minWidth: '46%',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 104,
  },
  quickCardTitle: {
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  quickCardDesc: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 15,
  },
  quickIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 18,
    padding: 20,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalInput: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 6,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
  },
  modalCancel: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalSubmit: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
});
